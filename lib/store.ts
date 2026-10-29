import { Redis } from "@upstash/redis";

export type Option = { id: number; text: string };

export type Poll = {
  id: string;
  title: string;
  options: Option[];
  createdAt: string;
};

export type Results = {
  poll_id: string;
  title: string;
  total_votes: number;
  results: { option_id: number; text: string; votes: number }[];
};

type PollRecord = Poll & { creatorToken: string };

// Reads UPSTASH_REDIS_REST_URL/TOKEN, or KV_REST_API_URL/TOKEN as set by the
// Vercel Marketplace integration.
const redis = Redis.fromEnv();

// Keys:
//   poll:{code}         -> PollRecord (JSON)
//   poll:{code}:votes   -> hash of voter_id -> option_id
// Channel:
//   poll:{code}:results -> Results, published after every vote
const pollKey = (id: string) => `poll:${id}`;
const votesKey = (id: string) => `poll:${id}:votes`;
const resultsChannel = (id: string) => `poll:${id}:results`;

// Polls are cleaned up automatically after 30 days.
const POLL_TTL_SECONDS = 60 * 60 * 24 * 30;

// No 0/O/1/I so codes are easy to read aloud and type.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;

function generateCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(CODE_LENGTH));
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
}

const normalizeCode = (id: string) => id.trim().toUpperCase();

async function findPoll(id: string) {
  return redis.get<PollRecord>(pollKey(normalizeCode(id)));
}

export async function createPoll(title: string, optionTexts: string[]) {
  const base = {
    title,
    options: optionTexts.map((text, i) => ({ id: i + 1, text })),
    createdAt: new Date().toISOString(),
    creatorToken: crypto.randomUUID(),
  };

  // NX makes the write fail on a code collision, so retry with a new code.
  for (let attempt = 0; attempt < 5; attempt++) {
    const record: PollRecord = { id: generateCode(), ...base };
    const created = await redis.set(pollKey(record.id), record, {
      nx: true,
      ex: POLL_TTL_SECONDS,
    });
    if (created) return { ...toPoll(record), creator_token: record.creatorToken };
  }
  throw new Error("Could not allocate a unique poll code");
}

export async function getPoll(id: string): Promise<Poll | undefined> {
  const record = await findPoll(id);
  return record ? toPoll(record) : undefined;
}

type Failure = { ok: false; status: number; error: string };

export async function castVote(
  pollId: string,
  optionId: number,
  voterId: string,
): Promise<{ ok: true } | Failure> {
  const record = await findPoll(pollId);
  if (!record) return { ok: false, status: 404, error: "Poll not found" };
  if (!record.options.some((o) => o.id === optionId)) {
    return { ok: false, status: 400, error: "Invalid option_id" };
  }

  // HSETNX is atomic, so concurrent requests from one voter can't both count.
  const added = await redis.hsetnx(votesKey(record.id), voterId, optionId);
  if (!added) {
    return { ok: false, status: 409, error: "This voter has already voted" };
  }

  await redis.expire(votesKey(record.id), POLL_TTL_SECONDS);
  await redis.publish(resultsChannel(record.id), await tally(record));
  return { ok: true };
}

export async function getResults(
  pollId: string,
  creatorToken: string | null,
): Promise<{ ok: true; data: Results } | Failure> {
  const record = await findPoll(pollId);
  if (!record) return { ok: false, status: 404, error: "Poll not found" };
  if (creatorToken !== record.creatorToken) {
    return { ok: false, status: 403, error: "Only the poll creator can view results" };
  }
  return { ok: true, data: await tally(record) };
}

// Calls onResults with fresh tallies after every vote, plus once as soon as the
// subscription is live so votes cast while it was connecting aren't missed.
// Returns an unsubscribe function.
export function subscribeToResults(pollId: string, onResults: (results: Results) => void) {
  const code = normalizeCode(pollId);
  const subscriber = redis.subscribe<Results>(resultsChannel(code));
  subscriber.on("message", ({ message }) => onResults(message));
  subscriber.on("subscribe", async () => {
    const record = await findPoll(code);
    if (record) onResults(await tally(record));
  });
  return () => subscriber.unsubscribe();
}

async function tally(record: PollRecord): Promise<Results> {
  const votes = (await redis.hvals(votesKey(record.id))) as (number | string)[];

  const counts = new Map<number, number>();
  for (const optionId of votes.map(Number)) {
    counts.set(optionId, (counts.get(optionId) ?? 0) + 1);
  }

  return {
    poll_id: record.id,
    title: record.title,
    total_votes: votes.length,
    results: record.options.map((o) => ({
      option_id: o.id,
      text: o.text,
      votes: counts.get(o.id) ?? 0,
    })),
  };
}

function toPoll({ id, title, options, createdAt }: PollRecord): Poll {
  return { id, title, options, createdAt };
}

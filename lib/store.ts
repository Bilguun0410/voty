export type Option = { id: number; text: string };

export type Poll = {
  id: string;
  title: string;
  options: Option[];
  createdAt: string;
};

type PollRecord = Poll & {
  creatorToken: string;
  // voter_id -> option_id
  votes: Map<string, number>;
};

// In-memory store. Kept on globalThis so it survives dev hot reloads.
// Data is lost on server restart; swap for a database in production.
const globalStore = globalThis as unknown as { polls?: Map<string, PollRecord> };
const polls = (globalStore.polls ??= new Map<string, PollRecord>());

// No 0/O/1/I so codes are easy to read aloud and type.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;

function generateCode() {
  let code: string;
  do {
    const bytes = crypto.getRandomValues(new Uint8Array(CODE_LENGTH));
    code = Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
  } while (polls.has(code));
  return code;
}

function findPoll(id: string) {
  return polls.get(id.trim().toUpperCase());
}

export function createPoll(title: string, optionTexts: string[]) {
  const record: PollRecord = {
    id: generateCode(),
    title,
    options: optionTexts.map((text, i) => ({ id: i + 1, text })),
    createdAt: new Date().toISOString(),
    creatorToken: crypto.randomUUID(),
    votes: new Map(),
  };
  polls.set(record.id, record);
  return { ...toPoll(record), creator_token: record.creatorToken };
}

export function getPoll(id: string): Poll | undefined {
  const record = findPoll(id);
  return record && toPoll(record);
}

type Failure = { ok: false; status: number; error: string };

export function castVote(
  pollId: string,
  optionId: number,
  voterId: string,
): { ok: true } | Failure {
  const record = findPoll(pollId);
  if (!record) return { ok: false, status: 404, error: "Poll not found" };
  if (!record.options.some((o) => o.id === optionId)) {
    return { ok: false, status: 400, error: "Invalid option_id" };
  }
  if (record.votes.has(voterId)) {
    return { ok: false, status: 409, error: "This voter has already voted" };
  }
  record.votes.set(voterId, optionId);
  return { ok: true };
}

export function getResults(pollId: string, creatorToken: string | null) {
  const record = findPoll(pollId);
  if (!record) return { ok: false, status: 404, error: "Poll not found" } satisfies Failure;
  if (creatorToken !== record.creatorToken) {
    return {
      ok: false,
      status: 403,
      error: "Only the poll creator can view results",
    } satisfies Failure;
  }

  const counts = new Map<number, number>();
  for (const optionId of record.votes.values()) {
    counts.set(optionId, (counts.get(optionId) ?? 0) + 1);
  }

  return {
    ok: true as const,
    data: {
      poll_id: record.id,
      title: record.title,
      total_votes: record.votes.size,
      results: record.options.map((o) => ({
        option_id: o.id,
        text: o.text,
        votes: counts.get(o.id) ?? 0,
      })),
    },
  };
}

function toPoll({ id, title, options, createdAt }: PollRecord): Poll {
  return { id, title, options, createdAt };
}

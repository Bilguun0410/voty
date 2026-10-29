"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type Poll = { id: string; title: string; options: { id: number; text: string }[] };

// Anonymous per-browser voter id, so each browser gets one vote per poll.
function getVoterId() {
  let voterId = localStorage.getItem("voter_id");
  if (!voterId) {
    voterId = `user_${crypto.randomUUID().slice(0, 8)}`;
    localStorage.setItem("voter_id", voterId);
  }
  return voterId;
}

export default function PollView() {
  const { id } = useParams<{ id: string }>();
  const [poll, setPoll] = useState<Poll | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [voted, setVoted] = useState(false);
  const [creatorToken, setCreatorToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/polls/${id}`).then(async (res) => {
      const data = await res.json();
      if (res.ok) {
        setVoted(localStorage.getItem(`voted_${data.id}`) === "1");
        setCreatorToken(localStorage.getItem(`creator_token_${data.id}`));
        setPoll(data);
      } else {
        setError(data.error);
      }
    });
  }, [id]);

  async function vote() {
    if (!poll || selected === null) return;
    setError(null);
    const res = await fetch(`/api/polls/${poll.id}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ option_id: selected, voter_id: getVoterId() }),
    });
    const data = await res.json();
    if (res.ok || res.status === 409) {
      localStorage.setItem(`voted_${poll.id}`, "1");
      setVoted(true);
    }
    if (!res.ok) setError(data.error);
  }

  if (error && !poll) {
    return (
      <main className="mx-auto w-full max-w-lg px-4 py-16">
        <p className="text-red-500">No poll found with code “{decodeURIComponent(id)}”.</p>
        <Link href="/" className="mt-4 inline-block underline">
          Try another code
        </Link>
      </main>
    );
  }

  if (!poll) {
    return <main className="mx-auto w-full max-w-lg px-4 py-16 text-zinc-500">Loading…</main>;
  }

  return (
    <main className="mx-auto w-full max-w-lg px-4 py-16">
      <p className="font-mono text-sm tracking-widest text-zinc-500">{poll.id}</p>
      <h1 className="mb-8 mt-2 text-3xl font-semibold tracking-tight">{poll.title}</h1>

      {voted ? (
        <p className="rounded-lg border border-zinc-300 px-4 py-3 dark:border-zinc-700">
          ✓ Your vote has been recorded.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {poll.options.map((option) => (
            <label
              key={option.id}
              className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 ${
                selected === option.id
                  ? "border-foreground"
                  : "border-zinc-300 dark:border-zinc-700"
              }`}
            >
              <input
                type="radio"
                name="option"
                checked={selected === option.id}
                onChange={() => setSelected(option.id)}
              />
              {option.text}
            </label>
          ))}
          <button
            onClick={vote}
            disabled={selected === null}
            className="mt-2 rounded-lg bg-foreground px-4 py-3 font-medium text-background disabled:opacity-50"
          >
            Vote
          </button>
        </div>
      )}

      {error && <p className="mt-4 text-sm text-red-500">{error}</p>}

      {creatorToken && (
        <Link
          href={`/polls/${poll.id}/results?token=${creatorToken}`}
          className="mt-8 inline-block text-sm text-zinc-500 underline hover:text-foreground"
        >
          View results (creator)
        </Link>
      )}
    </main>
  );
}

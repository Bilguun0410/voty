"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

type Results = {
  poll_id: string;
  title: string;
  total_votes: number;
  results: { option_id: number; text: string; votes: number }[];
};

export default function ResultsView() {
  const { id } = useParams<{ id: string }>();
  const token = useSearchParams().get("token");
  const [results, setResults] = useState<Results | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const load = () =>
      fetch(`/api/polls/${id}/results`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }).then(async (res) => {
        const data = await res.json();
        if (res.ok) {
          setResults(data);
          setError(null);
        } else {
          setError(data.error);
        }
      });

    load();
    // Poll for live tallies.
    const interval = setInterval(load, 3000);
    return () => clearInterval(interval);
  }, [id, token]);

  if (error && !results) {
    return (
      <main className="mx-auto w-full max-w-lg px-4 py-16">
        <p className="text-red-500">{error}</p>
        <Link href="/" className="mt-4 inline-block underline">
          Home
        </Link>
      </main>
    );
  }

  if (!results) {
    return <main className="mx-auto w-full max-w-lg px-4 py-16 text-zinc-500">Loading…</main>;
  }

  const voteUrl = `${location.origin}/polls/${results.poll_id}`;

  return (
    <main className="mx-auto w-full max-w-lg px-4 py-16">
      <section className="mb-10 rounded-xl border border-zinc-300 p-5 dark:border-zinc-700">
        <p className="text-sm text-zinc-500">Share this code with voters</p>
        <p className="mt-1 font-mono text-4xl font-semibold tracking-[0.3em]">{results.poll_id}</p>
        <button
          className="mt-3 text-sm text-zinc-500 underline hover:text-foreground"
          onClick={() => {
            navigator.clipboard.writeText(voteUrl);
            setCopied(true);
          }}
        >
          {copied ? "Link copied" : "Copy voting link"}
        </button>
        <p className="mt-3 text-xs text-zinc-500">
          Bookmark this page — its URL is your private key to the results.
        </p>
      </section>

      <h1 className="text-3xl font-semibold tracking-tight">{results.title}</h1>
      <p className="mb-6 mt-1 text-zinc-500">{results.total_votes} votes · updates live</p>

      <ul className="flex flex-col gap-4">
        {results.results.map((r) => {
          const pct = results.total_votes ? Math.round((r.votes / results.total_votes) * 100) : 0;
          return (
            <li key={r.option_id}>
              <div className="mb-1 flex justify-between text-sm">
                <span>{r.text}</span>
                <span className="tabular-nums text-zinc-500">
                  {r.votes} ({pct}%)
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                <div
                  className="h-full rounded-full bg-foreground transition-[width] duration-300"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}

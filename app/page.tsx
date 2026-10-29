"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Home() {
  const router = useRouter();
  const [code, setCode] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (trimmed) router.push(`/polls/${encodeURIComponent(trimmed)}`);
  }

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-16">
      <h1 className="mb-6 text-center text-3xl font-semibold tracking-tight">Enter vote code</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          className="rounded-lg border border-zinc-300 bg-transparent px-4 py-3 text-center font-mono text-2xl uppercase tracking-[0.3em] dark:border-zinc-700"
          placeholder="ABC123"
          maxLength={6}
          autoFocus
          autoComplete="off"
          aria-label="Vote code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        <button
          type="submit"
          disabled={!code.trim()}
          className="rounded-lg bg-foreground px-4 py-3 font-medium text-background disabled:opacity-50"
        >
          Join
        </button>
      </form>
    </main>
  );
}

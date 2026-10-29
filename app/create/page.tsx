"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Home() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function updateOption(index: number, value: string) {
    setOptions((prev) => prev.map((o, i) => (i === index ? value : o)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const res = await fetch("/api/polls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, options }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(data.error);
      return;
    }
    localStorage.setItem(`creator_token_${data.id}`, data.creator_token);
    router.push(`/polls/${data.id}/results?token=${data.creator_token}`);
  }

  return (
    <main className="mx-auto w-full max-w-lg px-4 py-16">
      <h1 className="mb-8 text-3xl font-semibold tracking-tight">Create a poll</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          className="rounded-lg border border-zinc-300 bg-transparent px-4 py-3 dark:border-zinc-700"
          placeholder="Question, e.g. Best language?"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        {options.map((option, i) => (
          <div key={i} className="flex gap-2">
            <input
              className="flex-1 rounded-lg border border-zinc-300 bg-transparent px-4 py-2 dark:border-zinc-700"
              placeholder={`Option ${i + 1}`}
              value={option}
              onChange={(e) => updateOption(i, e.target.value)}
            />
            {options.length > 2 && (
              <button
                type="button"
                className="px-3 text-zinc-500 hover:text-red-500"
                onClick={() => setOptions((prev) => prev.filter((_, j) => j !== i))}
                aria-label={`Remove option ${i + 1}`}
              >
                ✕
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          className="self-start text-sm text-zinc-500 hover:text-foreground"
          onClick={() => setOptions((prev) => [...prev, ""])}
        >
          + Add option
        </button>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-foreground px-4 py-3 font-medium text-background disabled:opacity-50"
        >
          {submitting ? "Creating…" : "Create poll"}
        </button>
      </form>
    </main>
  );
}

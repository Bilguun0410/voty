import { Suspense } from "react";
import PollView from "./poll-view";

// PollView reads the poll code via useParams, so it renders inside Suspense
// to keep the rest of the route prerenderable (cacheComponents).
export default function PollPage() {
  return (
    <Suspense fallback={<main className="mx-auto w-full max-w-lg px-4 py-16 text-zinc-500">Loading…</main>}>
      <PollView />
    </Suspense>
  );
}

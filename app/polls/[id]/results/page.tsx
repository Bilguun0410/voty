import { Suspense } from "react";
import ResultsView from "./results-view";

// ResultsView reads the code and creator token from the URL, so it renders
// inside Suspense to keep the rest of the route prerenderable (cacheComponents).
export default function ResultsPage() {
  return (
    <Suspense fallback={<main className="mx-auto w-full max-w-lg px-4 py-16 text-zinc-500">Loading…</main>}>
      <ResultsView />
    </Suspense>
  );
}

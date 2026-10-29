import type { NextRequest } from "next/server";
import { getResults, subscribeToResults } from "@/lib/store";

// Vercel ends the function at maxDuration, so the stream closes itself a bit
// earlier and the browser's EventSource reconnects automatically.
export const maxDuration = 300;
const STREAM_LIFETIME_MS = 280_000;
const HEARTBEAT_MS = 25_000;

// Server-Sent Events stream of live results for the poll creator.
// EventSource can't send headers, so the creator token comes as `?token=`.
export async function GET(request: NextRequest, ctx: RouteContext<"/api/polls/[id]/results/stream">) {
  const { id } = await ctx.params;
  const token = request.nextUrl.searchParams.get("token");

  const initial = await getResults(id, token);
  if (!initial.ok) {
    return Response.json({ error: initial.error }, { status: initial.status });
  }

  const encoder = new TextEncoder();
  let cleanup = () => {};

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;
      const send = (chunk: string) => {
        if (!closed) controller.enqueue(encoder.encode(chunk));
      };

      // Every vote publishes the full tally, so each message replaces the last.
      const unsubscribe = subscribeToResults(initial.data.poll_id, (results) =>
        send(`data: ${JSON.stringify(results)}\n\n`),
      );
      send(`retry: 1000\ndata: ${JSON.stringify(initial.data)}\n\n`);

      // Comment lines keep proxies from closing an idle connection.
      const heartbeat = setInterval(() => send(": ping\n\n"), HEARTBEAT_MS);
      const lifetime = setTimeout(() => cleanup(), STREAM_LIFETIME_MS);

      cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        clearTimeout(lifetime);
        unsubscribe();
        controller.close();
      };
      request.signal.addEventListener("abort", () => cleanup());
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

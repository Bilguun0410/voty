import { getPoll } from "@/lib/store";

export async function GET(_request: Request, ctx: RouteContext<"/api/polls/[id]">) {
  const { id } = await ctx.params;
  const poll = getPoll(id);
  if (!poll) {
    return Response.json({ error: "Poll not found" }, { status: 404 });
  }
  return Response.json(poll);
}

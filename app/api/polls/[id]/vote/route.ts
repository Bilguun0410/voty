import { castVote } from "@/lib/store";

export async function POST(request: Request, ctx: RouteContext<"/api/polls/[id]/vote">) {
  const { id } = await ctx.params;
  const body = await request.json().catch(() => null);
  const optionId = body?.option_id;
  const voterId = body?.voter_id;

  if (!Number.isInteger(optionId)) {
    return Response.json({ error: "option_id must be an integer" }, { status: 400 });
  }
  if (typeof voterId !== "string" || !voterId.trim()) {
    return Response.json({ error: "voter_id is required" }, { status: 400 });
  }

  const result = await castVote(id, optionId, voterId.trim());
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: result.status });
  }
  return Response.json({ success: true }, { status: 201 });
}

import type { NextRequest } from "next/server";
import { getResults } from "@/lib/store";

// Requires the creator token returned by POST /api/polls,
// sent as `Authorization: Bearer <token>` or `?token=<token>`.
export async function GET(request: NextRequest, ctx: RouteContext<"/api/polls/[id]/results">) {
  const { id } = await ctx.params;
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const token = bearer || request.nextUrl.searchParams.get("token");

  const result = getResults(id, token);
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: result.status });
  }
  return Response.json(result.data);
}

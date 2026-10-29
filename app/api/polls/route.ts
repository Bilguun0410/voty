import { createPoll } from "@/lib/store";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const options: string[] = Array.isArray(body?.options)
    ? body.options
        .filter((o: unknown): o is string => typeof o === "string")
        .map((o: string) => o.trim())
        .filter(Boolean)
    : [];

  if (!title) {
    return Response.json({ error: "title is required" }, { status: 400 });
  }
  if (options.length < 2) {
    return Response.json({ error: "At least 2 options are required" }, { status: 400 });
  }

  const poll = await createPoll(title, options);
  return Response.json(poll, { status: 201 });
}

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import { nanoid } from "nanoid";
import { getDb } from "@/lib/db";
import { VOTER_COOKIE, voterCookieOptions } from "@/lib/voter-cookie";

export async function POST(
  request: Request,
  ctx: { params: Promise<{ slug: string }> }
) {
  const { slug } = await ctx.params;
  const cookieStore = await cookies();
  let voterToken = cookieStore.get(VOTER_COOKIE)?.value;
  const isNewVoter = !voterToken;
  if (!voterToken) voterToken = randomUUID();

  let body: { optionId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const optionId = body.optionId?.trim();
  if (!optionId) {
    return NextResponse.json({ error: "optionId is required" }, { status: 400 });
  }

  const database = getDb();
  const poll = database
    .prepare(`SELECT id, status FROM polls WHERE slug = ?`)
    .get(slug) as { id: string; status: string } | undefined;

  if (!poll) {
    return NextResponse.json({ error: "Poll not found" }, { status: 404 });
  }

  if (poll.status !== "open") {
    return NextResponse.json({ error: "Voting is not open" }, { status: 409 });
  }

  const option = database
    .prepare(
      `SELECT id FROM poll_options WHERE id = ? AND poll_id = ? LIMIT 1`
    )
    .get(optionId, poll.id) as { id: string } | undefined;

  if (!option) {
    return NextResponse.json({ error: "Invalid option" }, { status: 400 });
  }

  const voteId = nanoid();
  const now = Date.now();

  try {
    database
      .prepare(
        `INSERT INTO votes (id, poll_id, option_id, voter_token, created_at)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(voteId, poll.id, option.id, voterToken, now);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("UNIQUE")) {
      return NextResponse.json(
        { error: "You have already voted in this poll" },
        { status: 409 }
      );
    }
    throw e;
  }

  const res = NextResponse.json({ ok: true });
  if (isNewVoter) {
    res.cookies.set(voterCookieOptions(voterToken));
  }

  return res;
}

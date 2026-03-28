import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import { getDb } from "@/lib/db";
import { VOTER_COOKIE, voterCookieOptions } from "@/lib/voter-cookie";

type OptionRow = { id: string; label: string; position: number };

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ slug: string }> }
) {
  const { slug } = await ctx.params;
  const database = getDb();

  const poll = database
    .prepare(`SELECT * FROM polls WHERE slug = ?`)
    .get(slug) as
    | {
        id: string;
        slug: string;
        title: string;
        description: string;
        status: string;
        created_at: number;
        updated_at: number;
      }
    | undefined;

  if (!poll) {
    return NextResponse.json({ error: "Poll not found" }, { status: 404 });
  }

  const options = database
    .prepare(
      `SELECT id, label, position FROM poll_options WHERE poll_id = ? ORDER BY position ASC`
    )
    .all(poll.id) as OptionRow[];

  const cookieStore = await cookies();
  let voterToken = cookieStore.get(VOTER_COOKIE)?.value;
  const isNewVoter = !voterToken;
  if (!voterToken) voterToken = randomUUID();

  const existing = database
    .prepare(
      `SELECT option_id FROM votes WHERE poll_id = ? AND voter_token = ? LIMIT 1`
    )
    .get(poll.id, voterToken) as { option_id: string } | undefined;

  const hasVoted = Boolean(existing);
  const showResults = poll.status === "closed" || hasVoted;

  let results: { optionId: string; label: string; count: number }[] | undefined;
  let totalVotes: number | undefined;
  const selectedOptionId: string | undefined = existing?.option_id;

  if (showResults) {
    const counts = database
      .prepare(
        `SELECT option_id, COUNT(*) AS c FROM votes WHERE poll_id = ? GROUP BY option_id`
      )
      .all(poll.id) as { option_id: string; c: number }[];

    const map = new Map(counts.map((r) => [r.option_id, r.c]));
    results = options.map((o) => ({
      optionId: o.id,
      label: o.label,
      count: map.get(o.id) ?? 0,
    }));
    totalVotes = results.reduce((s, r) => s + r.count, 0);
  }

  const res = NextResponse.json({
    poll: {
      title: poll.title,
      description: poll.description,
      status: poll.status,
      slug: poll.slug,
    },
    options: options.map((o) => ({ id: o.id, label: o.label })),
    hasVoted,
    selectedOptionId,
    results,
    totalVotes,
  });

  if (isNewVoter) {
    res.cookies.set(voterCookieOptions(voterToken));
  }

  return res;
}

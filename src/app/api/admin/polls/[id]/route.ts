import { NextResponse } from "next/server";
import { assertAdmin, AdminError } from "@/lib/admin-auth";
import { getDb } from "@/lib/db";

type Row = { id: string; label: string; position: number };

function resultsForPoll(
  database: ReturnType<typeof getDb>,
  pollId: string
): { optionId: string; label: string; count: number }[] {
  const options = database
    .prepare(
      `SELECT id, label, position FROM poll_options WHERE poll_id = ? ORDER BY position ASC`
    )
    .all(pollId) as Row[];

  const counts = database
    .prepare(
      `SELECT option_id, COUNT(*) AS c FROM votes WHERE poll_id = ? GROUP BY option_id`
    )
    .all(pollId) as { option_id: string; c: number }[];

  const map = new Map(counts.map((r) => [r.option_id, r.c]));
  return options.map((o) => ({
    optionId: o.id,
    label: o.label,
    count: map.get(o.id) ?? 0,
  }));
}

export async function GET(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    assertAdmin(request);
  } catch (e) {
    if (e instanceof AdminError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }

  const { id } = await ctx.params;
  const database = getDb();
  const poll = database
    .prepare(`SELECT * FROM polls WHERE id = ?`)
    .get(id) as
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
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const options = database
    .prepare(
      `SELECT id, label, position FROM poll_options WHERE poll_id = ? ORDER BY position ASC`
    )
    .all(id) as Row[];

  const totalVotes = (
    database
      .prepare(`SELECT COUNT(*) AS c FROM votes WHERE poll_id = ?`)
      .get(id) as { c: number }
  ).c;

  const results = resultsForPoll(database, id);

  return NextResponse.json({
    poll,
    options: options.map((o) => ({
      id: o.id,
      label: o.label,
      position: o.position,
    })),
    results,
    totalVotes,
  });
}

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    assertAdmin(request);
  } catch (e) {
    if (e instanceof AdminError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }

  const { id } = await ctx.params;
  let body: { status?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.status !== "draft" && body.status !== "open" && body.status !== "closed") {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const database = getDb();
  const res = database
    .prepare(`UPDATE polls SET status = ?, updated_at = ? WHERE id = ?`)
    .run(body.status, Date.now(), id);

  if (res.changes === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, status: body.status });
}

export async function DELETE(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    assertAdmin(request);
  } catch (e) {
    if (e instanceof AdminError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }

  const { id } = await ctx.params;
  const database = getDb();
  const res = database.prepare(`DELETE FROM polls WHERE id = ?`).run(id);
  if (res.changes === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

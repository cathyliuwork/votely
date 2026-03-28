import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { assertAdmin, AdminError } from "@/lib/admin-auth";
import { getDb } from "@/lib/db";

export async function GET(request: Request) {
  try {
    assertAdmin(request);
  } catch (e) {
    if (e instanceof AdminError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }

  const database = getDb();
  const polls = database
    .prepare(
      `SELECT id, slug, title, description, status, created_at, updated_at
       FROM polls ORDER BY updated_at DESC`
    )
    .all() as {
    id: string;
    slug: string;
    title: string;
    description: string;
    status: string;
    created_at: number;
    updated_at: number;
  }[];

  return NextResponse.json({ polls });
}

export async function POST(request: Request) {
  try {
    assertAdmin(request);
  } catch (e) {
    if (e instanceof AdminError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }

  let body: { title?: string; description?: string; options?: string[]; status?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const title = (body.title ?? "").trim();
  const description = (body.description ?? "").trim();
  const rawOptions = Array.isArray(body.options) ? body.options : [];
  const options = rawOptions
    .map((o) => String(o).trim())
    .filter((o) => o.length > 0);

  if (!title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }
  if (options.length < 2) {
    return NextResponse.json(
      { error: "At least two options are required" },
      { status: 400 }
    );
  }

  const status =
    body.status === "open" || body.status === "closed" || body.status === "draft"
      ? body.status
      : "draft";

  const pollId = nanoid();
  const slug = nanoid(10);
  const now = Date.now();
  const database = getDb();

  const tx = database.transaction(() => {
    database
      .prepare(
        `INSERT INTO polls (id, slug, title, description, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(pollId, slug, title, description, status, now, now);

    const insertOpt = database.prepare(
      `INSERT INTO poll_options (id, poll_id, label, position) VALUES (?, ?, ?, ?)`
    );
    options.forEach((label, i) => {
      insertOpt.run(nanoid(), pollId, label, i);
    });
  });

  tx();

  return NextResponse.json({ id: pollId, slug, status }, { status: 201 });
}

"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { type PollDetail, statusClass, STORAGE_KEY } from "../../../shared";

const REFRESH_MS = 5000;

export default function AdminPollPresentPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();

  const [secret, setSecret] = useState<string | null>(null);
  const [detail, setDetail] = useState<PollDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  useEffect(() => {
    const s = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    setSecret(s);
    if (!s) router.replace("/admin");
  }, [router]);

  const load = useCallback(async () => {
    if (!secret || !id) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/polls/${id}`, {
        headers: { "x-admin-secret": secret },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "加载失败");
      setDetail(data as PollDetail);
      setLastUpdated(Date.now());
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [secret, id]);

  useEffect(() => {
    if (secret && id) void load();
  }, [secret, id, load]);

  const liveStatus = detail?.poll.status;
  useEffect(() => {
    if (!secret || liveStatus !== "open") return;
    const t = setInterval(() => void load(), REFRESH_MS);
    return () => clearInterval(t);
  }, [secret, liveStatus, load]);

  if (!secret) {
    return (
      <main className="min-h-screen flex items-center justify-center text-muted text-sm">
        正在跳转…
      </main>
    );
  }

  if (loading && !detail) {
    return (
      <main className="min-h-screen flex items-center justify-center text-xl text-muted">
        加载中…
      </main>
    );
  }

  if (error && !detail) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-xl text-danger" role="alert">
          {error}
        </p>
        <Link href="/admin" className="text-accent underline">
          返回管理
        </Link>
      </main>
    );
  }

  if (!detail) return null;

  const { poll, results, totalVotes } = detail;
  const t = totalVotes > 0 ? totalVotes : 1;

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="shrink-0 border-b border-stone-200 dark:border-stone-800 px-4 sm:px-8 py-2 sm:py-2.5 flex flex-wrap items-center gap-3 justify-between text-sm">
        <Link
          href={`/admin/polls/${id}`}
          className="text-accent hover:underline shrink-0"
        >
          ← 返回管理
        </Link>
        {poll.status === "open" ? (
          <span
            className={`rounded-md px-3 py-1 text-xs sm:text-sm font-medium ${statusClass("open")}`}
          >
            投票进行中 · 每 {REFRESH_MS / 1000}s 自动刷新
          </span>
        ) : (
          <span
            className={`rounded-md px-3 py-1 text-xs sm:text-sm font-medium ${statusClass(poll.status)}`}
          >
            {poll.status === "closed"
              ? "已结束 · 手动刷新页面即可更新"
              : "草稿 · 投屏仅供预览，开始投票后将自动刷新"}
          </span>
        )}
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-lg border border-stone-300 dark:border-stone-600 px-3 py-1.5 hover:bg-stone-100 dark:hover:bg-stone-900"
        >
          立即刷新
        </button>
      </header>

      <div className="flex-1 flex flex-col items-center justify-start px-6 sm:px-10 pt-3 sm:pt-5 pb-8 max-w-4xl mx-auto w-full">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center text-balance mb-2 sm:mb-3">
          {poll.title}
        </h1>
        {poll.description ? (
          <p className="text-base sm:text-lg md:text-xl text-muted text-center text-balance max-w-3xl mb-4 sm:mb-6 leading-relaxed whitespace-pre-wrap">
            {poll.description}
          </p>
        ) : null}

        <p className="text-lg sm:text-xl md:text-2xl font-semibold text-muted mb-4 sm:mb-6">
          总票数 · {totalVotes}
        </p>

        <ul className="w-full space-y-5 sm:space-y-7 max-w-3xl">
          {results.map((r) => {
            const pct = Math.round((r.count / t) * 100);
            return (
              <li key={r.optionId}>
                <div className="flex flex-wrap items-baseline justify-between gap-2 sm:gap-3 mb-2 sm:mb-3">
                  <span className="text-lg sm:text-2xl md:text-3xl font-semibold text-balance leading-snug">
                    {r.label}
                  </span>
                  <span className="text-base sm:text-xl md:text-2xl tabular-nums text-muted shrink-0">
                    {r.count}{" "}
                    <span className="text-sm sm:text-lg text-muted/80">票</span>{" "}
                    <span className="text-accent font-bold">{pct}%</span>
                  </span>
                </div>
                <div className="h-3 sm:h-4 md:h-5 rounded-full bg-stone-200 dark:bg-stone-800 overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>

        {lastUpdated ? (
          <p className="mt-8 sm:mt-10 text-xs sm:text-sm text-muted/80 tabular-nums">
            更新于 {new Date(lastUpdated).toLocaleTimeString()}
          </p>
        ) : null}
      </div>
    </main>
  );
}

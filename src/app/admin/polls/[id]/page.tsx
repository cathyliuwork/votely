"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  type PollDetail,
  publicPollUrl,
  statusClass,
  statusLabel,
  STORAGE_KEY,
} from "../../shared";

export default function AdminPollDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();

  const [secret, setSecret] = useState<string | null>(null);
  const [detail, setDetail] = useState<PollDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(message);
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, 2800);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

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

  const headers = useCallback(() => {
    return {
      "x-admin-secret": secret ?? "",
      "Content-Type": "application/json",
    } as Record<string, string>;
  }, [secret]);

  const patchStatus = async (status: string) => {
    if (!secret) return;
    setError(null);
    const res = await fetch(`/api/admin/polls/${id}`, {
      method: "PATCH",
      headers: headers(),
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "更新失败");
      return;
    }
    await load();
  };

  const removePoll = async () => {
    if (!secret) return;
    if (!confirm("确定删除该投票？票数据也会一并删除。")) return;
    setError(null);
    const res = await fetch(`/api/admin/polls/${id}`, {
      method: "DELETE",
      headers: { "x-admin-secret": secret },
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "删除失败");
      return;
    }
    router.replace("/admin");
  };

  const copyLink = async () => {
    if (!detail) return;
    try {
      await navigator.clipboard.writeText(publicPollUrl(detail.poll.slug));
      showToast("链接已复制到剪贴板");
    } catch {
      setError("无法复制链接");
    }
  };

  if (!secret) {
    return (
      <main className="flex-1 px-4 py-16 text-center text-muted text-sm">正在跳转…</main>
    );
  }

  if (loading && !detail) {
    return (
      <main className="flex-1 px-4 py-16">
        <p className="text-muted">加载中…</p>
      </main>
    );
  }

  if (error && !detail) {
    return (
      <main className="flex-1 max-w-2xl mx-auto px-4 py-10">
        <Link href="/admin" className="text-sm text-accent hover:underline">
          ← 返回列表
        </Link>
        <p className="text-danger mt-6" role="alert">
          {error}
        </p>
      </main>
    );
  }

  if (!detail) return null;

  const { poll, results, totalVotes } = detail;
  const url = publicPollUrl(poll.slug);

  return (
    <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8 sm:py-10">
      <div className="mb-6">
        <Link href="/admin" className="text-sm text-accent hover:underline">
          ← 全部投票
        </Link>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-danger mb-4">
          {error}
        </div>
      )}

      <header className="mb-6">
        <div className="flex flex-wrap items-start gap-3 justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-balance">{poll.title}</h1>
            {poll.description ? (
              <p className="text-muted mt-2 text-sm leading-relaxed whitespace-pre-wrap">
                {poll.description}
              </p>
            ) : null}
            <span
              className={`inline-block mt-3 text-xs font-medium px-2.5 py-1 rounded-md ${statusClass(poll.status)}`}
            >
              {statusLabel(poll.status)}
            </span>
          </div>
        </div>
      </header>

      <div className="flex flex-wrap gap-2 mb-8">
        <button
          type="button"
          onClick={() => void copyLink()}
          className="rounded-xl border border-stone-300 dark:border-stone-600 bg-card px-4 py-2 text-sm font-medium hover:bg-stone-50 dark:hover:bg-stone-800"
        >
          复制参与者链接
        </button>
        <Link
          href={`/admin/polls/${id}/present`}
          className="rounded-xl bg-accent text-white px-4 py-2 text-sm font-medium inline-flex items-center"
        >
          打开投影结果页
        </Link>
        {poll.status === "draft" && (
          <button
            type="button"
            onClick={() => void patchStatus("open")}
            className="rounded-xl bg-emerald-600 text-white px-4 py-2 text-sm font-medium"
          >
            开始投票
          </button>
        )}
        {poll.status === "open" && (
          <button
            type="button"
            onClick={() => void patchStatus("closed")}
            className="rounded-xl bg-stone-800 text-white dark:bg-stone-200 dark:text-stone-900 px-4 py-2 text-sm font-medium"
          >
            结束投票
          </button>
        )}
        {poll.status === "closed" && (
          <button
            type="button"
            onClick={() => void patchStatus("open")}
            className="rounded-xl border border-stone-300 dark:border-stone-600 px-4 py-2 text-sm font-medium"
          >
            重新开放
          </button>
        )}
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-xl border border-stone-300 dark:border-stone-600 px-4 py-2 text-sm font-medium text-muted"
        >
          刷新数据
        </button>
        <button
          type="button"
          onClick={() => void removePoll()}
          className="rounded-xl border border-red-200 dark:border-red-900 text-danger px-4 py-2 text-sm font-medium ml-auto"
        >
          删除投票
        </button>
      </div>

      <section className="rounded-2xl border border-stone-200 dark:border-stone-700 bg-card p-5 shadow-sm mb-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted mb-2">
          参与者链接
        </h2>
        <p className="font-mono text-sm break-all text-foreground">{url}</p>
      </section>

      <section className="rounded-2xl border border-stone-200 dark:border-stone-700 bg-card p-5 shadow-sm">
        <div className="flex items-baseline justify-between gap-4 mb-4">
          <h2 className="text-lg font-semibold">当前结果</h2>
          <p className="text-sm text-muted">共 {totalVotes} 票</p>
        </div>
        <ul className="space-y-4">
          {results.map((r) => {
            const t = totalVotes > 0 ? totalVotes : 1;
            const pct = Math.round((r.count / t) * 100);
            return (
              <li key={r.optionId}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">{r.label}</span>
                  <span className="text-muted">
                    {r.count} 票（{pct}%）
                  </span>
                </div>
                <div className="h-3 rounded-full bg-stone-200 dark:bg-stone-800 overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
        <p className="text-xs text-muted mt-4">
          需要投屏给全场时，请使用上方「打开投影结果页」，字号与条形图更大，并支持投票进行中自动刷新。
        </p>
      </section>

      {toast ? (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed bottom-6 left-1/2 z-[100] max-w-[min(90vw,20rem)] -translate-x-1/2 rounded-xl border border-indigo-400/50 bg-indigo-600 px-4 py-3 text-center text-sm font-medium text-white shadow-lg shadow-indigo-900/30 dark:border-indigo-300/40 dark:bg-indigo-500 dark:shadow-indigo-950/50"
        >
          {toast}
        </div>
      ) : null}
    </main>
  );
}

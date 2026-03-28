"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  type PollRow,
  statusClass,
  statusLabel,
  STORAGE_KEY,
} from "./shared";

export default function AdminPage() {
  const router = useRouter();
  const [secretInput, setSecretInput] = useState("");
  const [secret, setSecret] = useState<string | null>(null);
  const [polls, setPolls] = useState<PollRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [optionDraft, setOptionDraft] = useState(["", ""]);
  const [createStatus, setCreateStatus] = useState<"draft" | "open">("draft");

  useEffect(() => {
    const s = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (s) {
      setSecret(s);
      setSecretInput(s);
    }
  }, []);

  const headers = useCallback(() => {
    const s = secret ?? "";
    return { "x-admin-secret": s, "Content-Type": "application/json" } as Record<
      string,
      string
    >;
  }, [secret]);

  const loadPolls = useCallback(async () => {
    if (!secret) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/polls", { headers: { "x-admin-secret": secret } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "加载失败");
      setPolls(data.polls);
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [secret]);

  useEffect(() => {
    if (secret) void loadPolls();
  }, [secret, loadPolls]);

  const unlock = () => {
    const s = secretInput.trim();
    if (!s) {
      setError("请输入管理员密钥");
      return;
    }
    localStorage.setItem(STORAGE_KEY, s);
    setSecret(s);
    setError(null);
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setSecret(null);
    setPolls([]);
  };

  const createPoll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!secret) return;
    const options = optionDraft.map((x) => x.trim()).filter(Boolean);
    setError(null);
    try {
      const res = await fetch("/api/admin/polls", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          title,
          description,
          options,
          status: createStatus,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "创建失败");
      setTitle("");
      setDescription("");
      setOptionDraft(["", ""]);
      setCreateStatus("draft");
      if (data.id) {
        router.push(`/admin/polls/${data.id}`);
      } else {
        await loadPolls();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "创建失败");
    }
  };

  if (!secret) {
    return (
      <main className="flex-1 max-w-md mx-auto w-full px-4 py-16">
        <Link href="/" className="text-sm text-accent hover:underline mb-8 inline-block">
          ← 返回首页
        </Link>
        <h1 className="text-2xl font-semibold mb-2">管理员登录</h1>
        <p className="text-muted text-sm mb-6 leading-relaxed">
          输入与服务端环境变量 <code className="font-mono text-xs">ADMIN_SECRET</code>{" "}
          相同的密钥。
        </p>
        <label className="block text-sm font-medium mb-1.5">密钥</label>
        <input
          type="password"
          value={secretInput}
          onChange={(e) => setSecretInput(e.target.value)}
          className="w-full rounded-xl border border-stone-300 dark:border-stone-600 bg-card px-3 py-2 text-sm mb-4 outline-none focus:ring-2 focus:ring-ring"
          placeholder="在此粘贴 ADMIN_SECRET"
          autoComplete="off"
        />
        {error && <p className="text-sm text-danger mb-3">{error}</p>}
        <button
          type="button"
          onClick={unlock}
          className="rounded-xl bg-accent text-white px-4 py-2 text-sm font-medium w-full"
        >
          继续
        </button>
      </main>
    );
  }

  return (
    <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-10">
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <Link href="/" className="text-sm text-accent hover:underline mb-2 inline-block">
            ← 返回首页
          </Link>
          <h1 className="text-2xl font-semibold">投票管理</h1>
          <p className="text-muted text-sm mt-1">创建投票后进入单独页面管理、投屏结果</p>
        </div>
        <button
          type="button"
          onClick={logout}
          className="text-sm text-muted underline shrink-0"
        >
          退出
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-danger mb-4">
          {error}
        </div>
      )}

      <section className="rounded-2xl border border-stone-200 dark:border-stone-700 bg-card p-5 shadow-sm mb-10">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted mb-4">
          新建投票
        </h2>
        <form onSubmit={createPoll} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">标题</label>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-stone-300 dark:border-stone-600 bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">说明（可选）</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full rounded-xl border border-stone-300 dark:border-stone-600 bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring resize-y min-h-[72px]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">选项（至少两项）</label>
            <div className="space-y-2">
              {optionDraft.map((opt, i) => (
                <input
                  key={i}
                  value={opt}
                  onChange={(e) => {
                    const next = [...optionDraft];
                    next[i] = e.target.value;
                    setOptionDraft(next);
                  }}
                  placeholder={`选项 ${i + 1}`}
                  className="w-full rounded-xl border border-stone-300 dark:border-stone-600 bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => setOptionDraft((d) => [...d, ""])}
              className="mt-2 text-sm text-accent hover:underline"
            >
              + 添加选项
            </button>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">初始状态</label>
            <select
              value={createStatus}
              onChange={(e) => setCreateStatus(e.target.value as "draft" | "open")}
              className="rounded-xl border border-stone-300 dark:border-stone-600 bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="draft">草稿（不对外开票）</option>
              <option value="open">立即开始</option>
            </select>
          </div>
          <button
            type="submit"
            className="rounded-xl bg-accent text-white px-4 py-2 text-sm font-medium"
          >
            创建并进入管理页
          </button>
        </form>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted mb-3">
          全部投票 {loading ? "…" : `(${polls.length})`}
        </h2>
        <ul className="space-y-3">
          {polls.map((p) => (
            <li
              key={p.id}
              className="rounded-2xl border border-stone-200 dark:border-stone-700 bg-card p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-center gap-3 justify-between">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/admin/polls/${p.id}`}
                    className="font-medium text-foreground hover:text-accent text-balance"
                  >
                    {p.title}
                  </Link>
                  <span
                    className={`inline-block mt-2 text-xs font-medium px-2 py-0.5 rounded-md ${statusClass(p.status)}`}
                  >
                    {statusLabel(p.status)}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  <Link
                    href={`/admin/polls/${p.id}`}
                    className="text-xs rounded-lg bg-accent text-white px-3 py-1.5 font-medium"
                  >
                    管理
                  </Link>
                  <Link
                    href={`/admin/polls/${p.id}/present`}
                    className="text-xs rounded-lg border border-stone-300 dark:border-stone-600 px-3 py-1.5 font-medium hover:bg-stone-50 dark:hover:bg-stone-800"
                  >
                    投影
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
        {!loading && polls.length === 0 && (
          <p className="text-sm text-muted">暂无投票，先在上方创建一个。</p>
        )}
      </section>
    </main>
  );
}

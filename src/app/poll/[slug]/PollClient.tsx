"use client";

import { useCallback, useEffect, useState } from "react";

type PollPayload = {
  poll: {
    title: string;
    description: string;
    status: string;
    slug: string;
  };
  options: { id: string; label: string }[];
  hasVoted: boolean;
  selectedOptionId?: string;
  results?: { optionId: string; label: string; count: number }[];
  totalVotes?: number;
};

export function PollClient({ slug }: { slug: string }) {
  const [data, setData] = useState<PollPayload | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [choice, setChoice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/polls/${slug}`, { credentials: "include" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "加载失败");
      setData(json);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!choice || !data) return;
    setSubmitting(true);
    setErr(null);
    try {
      const res = await fetch(`/api/polls/${slug}/vote`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optionId: choice }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "提交失败");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "提交失败");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <p className="text-muted text-center py-16" role="status">
        加载中…
      </p>
    );
  }

  if (err && !data) {
    return (
      <p className="text-danger text-center py-16" role="alert">
        {err}
      </p>
    );
  }

  if (!data) return null;

  const { poll, options, hasVoted, results, totalVotes, selectedOptionId } = data;
  const canVote = poll.status === "open" && !hasVoted;
  const showResults = Boolean(results?.length);

  return (
    <article className="rounded-2xl border border-stone-200 dark:border-stone-700 bg-card p-6 sm:p-8 shadow-sm max-w-lg w-full mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-balance">{poll.title}</h1>
        {poll.description ? (
          <p className="text-muted mt-2 text-sm leading-relaxed whitespace-pre-wrap">
            {poll.description}
          </p>
        ) : null}
        <p className="text-xs text-muted mt-3">
          {poll.status === "draft" && "该投票尚未开始。"}
          {poll.status === "open" && !hasVoted && "进行中 — 请选择一项提交。"}
          {poll.status === "open" && hasVoted && "您已投票，以下为当前统计。"}
          {poll.status === "closed" && "投票已结束。"}
        </p>
      </header>

      {err && (
        <div
          className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-danger mb-4"
          role="alert"
        >
          {err}
        </div>
      )}

      {canVote && (
        <form onSubmit={submit} className="space-y-4">
          <fieldset>
            <legend className="sr-only">投票选项</legend>
            <ul className="space-y-2">
              {options.map((o) => (
                <li key={o.id}>
                  <label className="flex items-start gap-3 cursor-pointer rounded-xl border border-stone-200 dark:border-stone-600 px-3 py-3 has-[:checked]:border-accent has-[:checked]:bg-accent/5">
                    <input
                      type="radio"
                      name="vote"
                      value={o.id}
                      checked={choice === o.id}
                      onChange={() => setChoice(o.id)}
                      className="mt-1 accent-accent"
                    />
                    <span className="text-sm leading-snug">{o.label}</span>
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
          <button
            type="submit"
            disabled={!choice || submitting}
            className="w-full rounded-xl bg-accent text-white py-2.5 text-sm font-medium disabled:opacity-50"
          >
            {submitting ? "提交中…" : "提交投票"}
          </button>
        </form>
      )}

      {!canVote && poll.status === "draft" && (
        <p className="text-sm text-muted">请稍后再来，管理员还未开放投票。</p>
      )}

      {showResults && (
        <div className={canVote ? "" : "mt-0"}>
          {!canVote && (
            <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">
              结果{typeof totalVotes === "number" ? `（共 ${totalVotes} 票）` : ""}
            </h2>
          )}
          <ul className="space-y-3">
            {results!.map((r) => {
              const t = totalVotes && totalVotes > 0 ? totalVotes : 1;
              const pct = Math.round((r.count / t) * 100);
              const mine = selectedOptionId === r.optionId;
              return (
                <li key={r.optionId} className="text-sm">
                  <div className="flex justify-between gap-2 mb-0.5">
                    <span className={mine ? "font-medium" : ""}>
                      {r.label}
                      {mine ? " · 您的选择" : ""}
                    </span>
                    <span className="text-muted shrink-0">
                      {r.count}（{pct}%）
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-stone-200 dark:bg-stone-800 overflow-hidden">
                    <div
                      className="h-full bg-accent rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </article>
  );
}

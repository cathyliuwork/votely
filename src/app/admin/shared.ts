export const STORAGE_KEY = "votely_admin_secret";

export type PollRow = {
  id: string;
  slug: string;
  title: string;
  description: string;
  status: string;
  created_at: number;
  updated_at: number;
};

export type PollDetail = {
  poll: PollRow;
  options: { id: string; label: string; position: number }[];
  results: { optionId: string; label: string; count: number }[];
  totalVotes: number;
};

export function statusLabel(s: string) {
  if (s === "open") return "进行中";
  if (s === "closed") return "已结束";
  return "草稿";
}

export function statusClass(s: string) {
  if (s === "open") return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200";
  if (s === "closed") return "bg-stone-200 text-stone-800 dark:bg-stone-800 dark:text-stone-100";
  return "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100";
}

export function publicPollUrl(slug: string) {
  if (typeof window === "undefined") return `/poll/${slug}`;
  return `${window.location.origin}/poll/${slug}`;
}

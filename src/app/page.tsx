import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center px-4 py-16">
      <p className="text-sm font-medium text-accent tracking-wide uppercase mb-3">
        Votely
      </p>
      <h1 className="text-3xl sm:text-4xl font-semibold text-center text-balance max-w-lg mb-4">
        用链接收集投票，无需注册
      </h1>
      <p className="text-muted text-center max-w-md text-balance mb-10 leading-relaxed">
        管理员创建投票、控制开始与结束，并查看实时统计。参与者打开链接即可单选投票；
        系统通过浏览器 Cookie 尽量防止同一人重复投票。
      </p>
      <div className="flex flex-wrap gap-3 justify-center">
        <Link
          href="/admin"
          className="rounded-xl bg-accent text-white px-5 py-2.5 text-sm font-medium shadow-sm hover:opacity-90 transition-opacity"
        >
          管理后台
        </Link>
        <p className="self-center text-sm text-muted">
          测试时请在 .env.local 设置{" "}
          <code className="rounded bg-card px-1.5 py-0.5 text-foreground font-mono text-xs border border-stone-200 dark:border-stone-700">
            ADMIN_SECRET
          </code>
        </p>
      </div>
    </main>
  );
}

import Link from "next/link";
import { PollClient } from "./PollClient";

export default async function PollPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <main className="flex-1 flex flex-col px-4 py-10">
      <div className="max-w-lg w-full mx-auto mb-6">
        <Link href="/" className="text-sm text-accent hover:underline">
          ← Votely 首页
        </Link>
      </div>
      <PollClient slug={slug} />
    </main>
  );
}

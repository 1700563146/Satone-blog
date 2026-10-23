import Link from "next/link";

import { postHref, type PostSummary } from "@/lib/content/schema";

type PostNavigationProps = {
  older: PostSummary | null;
  newer: PostSummary | null;
};

/** 文章详情页底部的上一篇/下一篇；方向与列表页的日期倒序一致。 */
export function PostNavigation({ older, newer }: PostNavigationProps) {
  if (older === null && newer === null) return null;

  return (
    <nav
      aria-label="上一篇与下一篇"
      className="mt-12 grid gap-3 sm:grid-cols-2"
    >
      {older === null ? (
        <div className="hidden sm:block" />
      ) : (
        <Link
          href={postHref(older.slug)}
          className="flex flex-col gap-1 glass-card px-4 py-3 transition-colors hover:border-accent/40"
        >
          <span className="text-xs text-muted">← 上一篇</span>
          <span className="text-sm font-medium">{older.title}</span>
        </Link>
      )}
      {newer === null ? null : (
        <Link
          href={postHref(newer.slug)}
          className="flex flex-col gap-1 glass-card px-4 py-3 text-right transition-colors hover:border-accent/40 sm:col-start-2"
        >
          <span className="text-xs text-muted">下一篇 →</span>
          <span className="text-sm font-medium">{newer.title}</span>
        </Link>
      )}
    </nav>
  );
}

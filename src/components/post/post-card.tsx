import Link from "next/link";

import {
  formatPostDate,
  postHref,
  type PostSummary,
} from "@/lib/content/schema";
import { TaxonomyLinks } from "@/components/navigation/taxonomy-links";

/** 文章卡片：列表页与首页共用，整卡可读、只有标题是链接（避免嵌套可点击区域）。 */
export function PostCard({ post }: { post: PostSummary }) {
  return (
    <article className="glass-card px-5 py-5 transition-colors hover:border-accent/40">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
        <time dateTime={post.date}>{formatPostDate(post.date)}</time>
        {post.updatedAt === undefined ? null : (
          <span>更新于 {formatPostDate(post.updatedAt)}</span>
        )}
        {post.featured ? (
          <span className="rounded-full border border-accent/40 px-2 py-0.5 text-accent">
            精选
          </span>
        ) : null}
      </div>

      <h2 className="mt-2 text-xl font-semibold tracking-tight text-balance sm:text-2xl">
        <Link
          href={postHref(post.slug)}
          className="transition-colors hover:text-accent"
        >
          {post.title}
        </Link>
      </h2>

      <p className="mt-2 text-sm leading-relaxed text-muted">
        {post.description}
      </p>

      {post.categories.length === 0 && post.tags.length === 0 ? null : (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <TaxonomyLinks
            kind="categories"
            names={post.categories}
            variant="category"
          />
          <TaxonomyLinks kind="tags" names={post.tags} />
        </div>
      )}
    </article>
  );
}

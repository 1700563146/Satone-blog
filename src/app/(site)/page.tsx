import Link from "next/link";

import { TaxonomyOverview } from "@/components/navigation/taxonomy-overview";
import { PostList } from "@/components/post/post-list";
import { RSS_PATH, siteConfig } from "@/lib/config";
import { getCategories, getPosts } from "@/lib/content";
import { buildPageMetadata } from "@/lib/seo/metadata";

/** 首页：站点介绍 + 精选 + 最新文章 + 分类入口。 */
export const metadata = buildPageMetadata({
  path: "/",
  description: siteConfig.description,
});

const FEATURED_COUNT = 2;
const LATEST_COUNT = 5;

export default async function HomePage() {
  const [posts, categories] = await Promise.all([getPosts(), getCategories()]);

  const featured = posts
    .filter((post) => post.featured)
    .slice(0, FEATURED_COUNT);
  // 精选已经展示过的文章不再重复出现在"最新文章"里；没有非精选文章时隐藏该区块
  const latest = posts
    .filter((post) => !featured.includes(post))
    .slice(0, LATEST_COUNT);
  const showLatest = latest.length > 0 || posts.length === 0;

  return (
    <div className="pb-8">
      <header className="pt-12 pb-10">
        <p className="text-sm text-muted">个人博客</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          {siteConfig.name}
        </h1>
        <p className="mt-4 max-w-prose leading-relaxed text-muted">
          {siteConfig.description}
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3 text-sm">
          <Link
            href="/posts"
            className="rounded-control bg-accent-strong px-4 py-2 font-medium text-white transition-colors hover:bg-accent"
          >
            浏览文章
          </Link>
          <Link
            href="/about"
            className="glass-card rounded-control px-4 py-2 text-muted transition-colors hover:text-accent"
          >
            关于我
          </Link>
          <Link
            href={RSS_PATH}
            className="rounded-control px-2 py-2 text-muted transition-colors hover:text-accent"
          >
            RSS 订阅
          </Link>
        </div>
      </header>

      {featured.length === 0 ? null : (
        <section aria-label="精选文章">
          <h2 className="text-lg font-semibold tracking-tight">精选</h2>
          <div className="mt-4">
            <PostList posts={featured} />
          </div>
        </section>
      )}

      {showLatest ? (
        <section
          aria-label="最新文章"
          className={featured.length === 0 ? undefined : "mt-12"}
        >
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-lg font-semibold tracking-tight">最新文章</h2>
            <Link
              href="/posts"
              className="text-sm text-muted transition-colors hover:text-accent"
            >
              全部文章 →
            </Link>
          </div>
          <div className="mt-4">
            <PostList posts={latest} />
          </div>
        </section>
      ) : null}

      <TaxonomyOverview title="分类" terms={categories} />
    </div>
  );
}

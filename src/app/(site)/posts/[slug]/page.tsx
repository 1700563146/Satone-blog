import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { TaxonomyLinks } from "@/components/navigation/taxonomy-links";
import { PostNavigation } from "@/components/post/post-navigation";
import { TableOfContents } from "@/components/post/table-of-contents";
import { getPostBySlug, getPostNeighbors, getPosts } from "@/lib/content";
import { formatPostDate } from "@/lib/content/schema";
import { toStaticSlugParams } from "@/lib/routing";
import { buildPostMetadata } from "@/lib/seo/metadata";

/** 构建时按已发布文章的 slug 预渲染；未列出的路径走运行时渲染并返回 404。 */
export async function generateStaticParams() {
  const posts = await getPosts();
  return toStaticSlugParams(posts.map((post) => post.slug));
}

export async function generateMetadata({
  params,
}: PageProps<"/posts/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (post === null) return { title: "文章不存在" };
  return buildPostMetadata(post);
}

export default async function PostPage({ params }: PageProps<"/posts/[slug]">) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (post === null) notFound();

  const { older, newer } = await getPostNeighbors(post.slug);

  return (
    <article className="pt-2 pb-8">
      <PageHeader
        title={post.title}
        description={post.description}
        meta={
          <>
            <time dateTime={post.date}>{formatPostDate(post.date)}</time>
            {post.updatedAt === undefined ? null : (
              <span>更新于 {formatPostDate(post.updatedAt)}</span>
            )}
            {post.categories.length === 0 && post.tags.length === 0 ? null : (
              <span className="flex flex-wrap items-center gap-2">
                <TaxonomyLinks
                  kind="categories"
                  names={post.categories}
                  variant="category"
                />
                <TaxonomyLinks kind="tags" names={post.tags} />
              </span>
            )}
          </>
        }
      />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_220px]">
        <div className="order-2 min-w-0 lg:order-1">
          {/* 正文 HTML 在内容层已做安全处理：不渲染原始 HTML、拒绝危险链接 */}
          <div
            className="prose"
            dangerouslySetInnerHTML={{ __html: post.html }}
          />

          <PostNavigation older={older} newer={newer} />

          <div className="mt-10 text-sm">
            <Link
              href="/posts"
              className="text-muted transition-colors hover:text-accent"
            >
              ← 返回文章列表
            </Link>
          </div>
        </div>

        <aside className="order-1 lg:order-2">
          <div className="lg:sticky lg:top-24">
            <TableOfContents toc={post.toc} />
          </div>
        </aside>
      </div>
    </article>
  );
}

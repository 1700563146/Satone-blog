import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { PostList } from "@/components/post/post-list";
import { getPostsByTag, getTags } from "@/lib/content";
import { toStaticSlugParams } from "@/lib/routing";
import { buildTaxonomyMetadata } from "@/lib/seo/metadata";

/** 预渲染每个标签的归档页；返回未编码的原始名称（ADR-009）。 */
export async function generateStaticParams() {
  const tags = await getTags();
  return toStaticSlugParams(tags.map((tag) => tag.name));
}

export async function generateMetadata({
  params,
}: PageProps<"/tags/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPostsByTag(slug);
  if (page === null) return { title: "标签不存在" };
  return buildTaxonomyMetadata(page);
}

export default async function TagPage({ params }: PageProps<"/tags/[slug]">) {
  const { slug } = await params;
  const page = await getPostsByTag(slug);
  if (page === null) notFound();

  return (
    <div className="pb-8">
      <PageHeader
        title={`标签：${page.name}`}
        description={`该标签下有 ${page.count} 篇文章。`}
        meta={
          <Link href="/posts" className="transition-colors hover:text-accent">
            全部文章
          </Link>
        }
      />
      <PostList posts={page.posts} emptyTitle="该标签下还没有已发布的文章" />
    </div>
  );
}

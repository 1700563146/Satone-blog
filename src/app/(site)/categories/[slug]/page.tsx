import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { PostList } from "@/components/post/post-list";
import { getCategories, getPostsByCategory } from "@/lib/content";
import { toStaticSlugParams } from "@/lib/routing";
import { buildTaxonomyMetadata } from "@/lib/seo/metadata";

/**
 * 预渲染每个分类的归档页。
 * 按 ADR-009 返回**未编码**的原始名称，编码由 Next 在生成 URL 时完成。
 */
export async function generateStaticParams() {
  const categories = await getCategories();
  return toStaticSlugParams(categories.map((category) => category.name));
}

export async function generateMetadata({
  params,
}: PageProps<"/categories/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPostsByCategory(slug);
  if (page === null) return { title: "分类不存在" };
  return buildTaxonomyMetadata(page);
}

export default async function CategoryPage({
  params,
}: PageProps<"/categories/[slug]">) {
  const { slug } = await params;
  const page = await getPostsByCategory(slug);
  if (page === null) notFound();

  return (
    <div className="pb-8">
      <PageHeader
        title={`分类：${page.name}`}
        description={`该分类下有 ${page.count} 篇文章。`}
        meta={
          <Link href="/posts" className="transition-colors hover:text-accent">
            全部文章
          </Link>
        }
      />
      <PostList posts={page.posts} emptyTitle="该分类下还没有已发布的文章" />
    </div>
  );
}

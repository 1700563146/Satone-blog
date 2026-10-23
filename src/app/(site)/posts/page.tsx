import { PageHeader } from "@/components/layout/page-header";
import { TaxonomyOverview } from "@/components/navigation/taxonomy-overview";
import { PostList } from "@/components/post/post-list";
import { siteConfig } from "@/lib/config";
import { getCategories, getPosts, getTags } from "@/lib/content";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "文章",
  description: `${siteConfig.name} 的全部文章，按发布时间倒序排列。`,
  path: "/posts",
});

export default async function PostsPage() {
  const [posts, categories, tags] = await Promise.all([
    getPosts(),
    getCategories(),
    getTags(),
  ]);

  return (
    <div className="pb-8">
      <PageHeader
        title="文章"
        description={
          posts.length === 0
            ? "还没有已发布的文章。"
            : `共 ${posts.length} 篇已发布文章，按发布时间倒序排列。`
        }
      />
      <PostList posts={posts} />
      <TaxonomyOverview title="分类" terms={categories} />
      <TaxonomyOverview title="标签" terms={tags} />
    </div>
  );
}

import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { SearchPanel } from "@/components/search/search-panel";
import { siteConfig } from "@/lib/config";
import { getPosts } from "@/lib/content";
import { buildSearchIndex } from "@/lib/search";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = {
  ...buildPageMetadata({
    title: "搜索",
    description: `在 ${siteConfig.name} 中搜索文章标题、摘要、分类与标签。`,
    path: "/search",
  }),
  // 搜索结果页是薄内容，不参与索引（但保留 follow，链接权重仍会传递）
  robots: { index: false, follow: true },
};

/**
 * 站内搜索页。
 *
 * 索引在构建期生成并作为 props 传给客户端组件，页面本身是纯静态的：
 * 没有 `searchParams`、没有请求期数据，因此可以静态导出（ADR-027 / ADR-028）。
 */
export default async function SearchPage() {
  const posts = await getPosts();
  const index = buildSearchIndex(posts);

  return (
    <div className="pb-8">
      <PageHeader
        title="搜索"
        description={
          index.length === 0
            ? "还没有可搜索的文章。"
            : `共 ${index.length} 篇已发布文章，支持标题、摘要、分类与标签。`
        }
      />
      <SearchPanel index={index} />
    </div>
  );
}

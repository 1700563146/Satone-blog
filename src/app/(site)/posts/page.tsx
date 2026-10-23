import type { Metadata } from "next";

import { PagePlaceholder } from "@/components/layout/page-placeholder";

export const metadata: Metadata = {
  title: "文章",
};

export default function PostsPage() {
  return (
    <PagePlaceholder
      title="文章"
      description="文章列表将在阶段 3 实现，数据来自 content/posts/ 的 Markdown 文件。"
    />
  );
}

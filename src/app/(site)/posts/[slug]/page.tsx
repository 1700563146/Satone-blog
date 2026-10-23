import type { Metadata } from "next";
import { Suspense } from "react";

import { PagePlaceholder } from "@/components/layout/page-placeholder";

export const metadata: Metadata = {
  title: "文章详情",
};

export default function PostPage({ params }: PageProps<"/posts/[slug]">) {
  return (
    <Suspense
      fallback={<PagePlaceholder title="文章详情" description="加载中…" />}
    >
      <PostDetail params={params} />
    </Suspense>
  );
}

async function PostDetail({
  params,
}: Pick<PageProps<"/posts/[slug]">, "params">) {
  const { slug } = await params;

  return (
    <PagePlaceholder
      title="文章详情"
      description={`文章 ${slug} 的正文将在阶段 2–3 由 Markdown 渲染。`}
    />
  );
}

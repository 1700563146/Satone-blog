import type { Metadata } from "next";
import { Suspense } from "react";

import { PagePlaceholder } from "@/components/layout/page-placeholder";

export const metadata: Metadata = {
  title: "分类",
};

export default function CategoryPage({
  params,
}: PageProps<"/categories/[slug]">) {
  return (
    <Suspense fallback={<PagePlaceholder title="分类" description="加载中…" />}>
      <CategoryArchive params={params} />
    </Suspense>
  );
}

async function CategoryArchive({
  params,
}: Pick<PageProps<"/categories/[slug]">, "params">) {
  const { slug } = await params;

  return (
    <PagePlaceholder
      title="分类"
      description={`分类「${slug}」的归档将在阶段 3 实现。`}
    />
  );
}

import type { Metadata } from "next";
import { Suspense } from "react";

import { PagePlaceholder } from "@/components/layout/page-placeholder";

export const metadata: Metadata = {
  title: "标签",
};

export default function TagPage({ params }: PageProps<"/tags/[slug]">) {
  return (
    <Suspense fallback={<PagePlaceholder title="标签" description="加载中…" />}>
      <TagArchive params={params} />
    </Suspense>
  );
}

async function TagArchive({
  params,
}: Pick<PageProps<"/tags/[slug]">, "params">) {
  const { slug } = await params;

  return (
    <PagePlaceholder
      title="标签"
      description={`标签「${slug}」的归档将在阶段 3 实现。`}
    />
  );
}

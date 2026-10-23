import type { Metadata } from "next";

import { PagePlaceholder } from "@/components/layout/page-placeholder";

export const metadata: Metadata = {
  title: "首页",
};

export default function HomePage() {
  return (
    <PagePlaceholder
      title="Sato Blog"
      description="首页建设中：个人简介、精选文章与最新文章将在阶段 3 呈现。"
    />
  );
}

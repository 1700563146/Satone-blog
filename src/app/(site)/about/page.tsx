import type { Metadata } from "next";

import { PagePlaceholder } from "@/components/layout/page-placeholder";

export const metadata: Metadata = {
  title: "关于",
};

export default function AboutPage() {
  return (
    <PagePlaceholder
      title="关于"
      description="个人介绍、技能、项目与联系方式将在阶段 3 呈现，内容来自 content/pages/about.md。"
    />
  );
}

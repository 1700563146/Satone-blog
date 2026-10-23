import type { Metadata } from "next";

import { PagePlaceholder } from "@/components/layout/page-placeholder";

export const metadata: Metadata = {
  title: "友链",
};

export default function FriendsPage() {
  return (
    <PagePlaceholder
      title="友链"
      description="友链列表（P1 阶段）将在首版稳定后加入。"
    />
  );
}

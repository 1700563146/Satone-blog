import type { ReactNode } from "react";

import { Navbar } from "@/components/navigation/navbar";

/**
 * 前台布局。
 *
 * 站点采用纯静态导出（`output: "export"`，见 ADR-027）：所有页面在构建期渲染成
 * HTML，因此不需要 `ensureStatic` 之类的静态约束，也没有请求期渲染。
 */
export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-(--page-width) flex-1 flex-col px-4 sm:px-6">
      <header className="sticky top-0 z-10 py-4">
        <Navbar />
      </header>
      <main className="flex flex-1 flex-col pb-16">{children}</main>
    </div>
  );
}

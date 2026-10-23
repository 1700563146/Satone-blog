import type { ReactNode } from "react";

import { Navbar } from "@/components/navigation/navbar";

/**
 * 前台整体要求"完整路由在构建期静态产出"：
 * - 未在 `generateStaticParams` 中列出的动态参数，第一次请求会**等待**静态结果生成，
 *   因此页面里的 `notFound()` 能返回真正的 404 状态码，而不是先返回 200 的软 404。
 * - 一旦有页面引入未缓存的读取或请求期 API，构建直接失败，避免悄悄退化。
 *
 * 这条约束要求 `use cache` 作用域不要使用 revalidate: 0（见 lib/content/index.ts）。
 */
export const ensureStatic = "navigation";

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

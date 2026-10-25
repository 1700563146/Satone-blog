import type { Metadata } from "next";

import { PublishForm } from "@/components/publish/publish-form";

export const metadata: Metadata = {
  title: "发布文章",
  // 工具页：不索引、不进 sitemap、也不会出现在导航里
  robots: { index: false, follow: false, nocache: true },
};

/**
 * 上传发布页（ADR-030）。
 *
 * 纯客户端：拖入 .md → 浏览器内校验/补全 → 用 GitHub Contents API 提交到仓库
 * → GitHub 触发 Cloudflare / Vercel 重新构建。没有服务端，也没有数据库。
 */
export default function PublishPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-(--content-width) flex-col gap-8 px-4 py-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">发布文章</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          把 Markdown 文件拖进来，检查自动补全的元信息，然后提交到仓库。 GitHub
          会自动构建并部署，通常 1~3 分钟后上线。
        </p>
      </header>

      <PublishForm />
    </main>
  );
}

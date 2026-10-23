import Link from "next/link";

/**
 * 前台路由组内的 404：`notFound()`（文章/分类/标签/关于页）会渲染到这里，
 * 因此 404 页面保留主导航，访客可以直接跳到其他页面。
 */
export default function SiteNotFound() {
  return (
    <section className="mx-auto flex w-full max-w-(--content-width) flex-1 flex-col items-center justify-center gap-4 py-24 text-center">
      <p className="text-5xl font-semibold tracking-tight">404</p>
      <h1 className="text-xl font-medium">页面不存在</h1>
      <p className="text-muted">
        你访问的内容可能已被移动、删除，或者从未存在。
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-3 text-sm">
        <Link
          href="/posts"
          className="rounded-control bg-accent-strong px-4 py-2 font-medium text-white transition-colors hover:bg-accent"
        >
          浏览文章
        </Link>
        <Link
          href="/"
          className="glass-card rounded-control px-4 py-2 text-muted transition-colors hover:text-accent"
        >
          返回首页
        </Link>
      </div>
    </section>
  );
}

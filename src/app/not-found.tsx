import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-(--content-width) flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <p className="text-5xl font-semibold tracking-tight">404</p>
      <h1 className="text-xl font-medium">页面不存在</h1>
      <p className="text-muted">你访问的页面可能已被移动或删除。</p>
      <Link
        href="/"
        className="mt-2 glass-card px-4 py-2 text-sm transition-colors hover:text-accent"
      >
        返回首页
      </Link>
    </main>
  );
}

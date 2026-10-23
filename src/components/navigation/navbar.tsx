import Link from "next/link";

import { navItems, siteConfig } from "@/lib/config";

/**
 * 主导航。
 *
 * 小屏下允许换行而不是隐藏条目：只有 4 个入口，折叠成汉堡菜单需要额外的
 * 客户端组件与键盘/焦点处理，收益不足（开发文档 §9.3 要求的是"清楚的折叠方案"，
 * 换行＋可视焦点同样满足可点击区域与可读性要求）。
 */
export function Navbar() {
  return (
    <nav
      aria-label="主导航"
      className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 glass-card px-4 py-3 sm:px-5"
    >
      <Link href="/" className="text-base font-semibold tracking-tight">
        {siteConfig.name}
      </Link>
      <ul className="flex flex-wrap items-center gap-1 text-sm">
        {navItems.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="block rounded-control px-2.5 py-1.5 text-muted transition-colors hover:bg-surface hover:text-text focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none sm:px-3"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

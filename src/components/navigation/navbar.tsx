import Link from "next/link";

import { NavMenu } from "@/components/navigation/nav-menu";
import { navItems, siteConfig } from "@/lib/config";

/**
 * 主导航：站点名 + 导航条目。
 *
 * 服务端组件负责读配置，交互部分（折叠菜单、当前页高亮、键盘处理）交给
 * 客户端组件 `NavMenu`，避免把站点配置里的环境变量打进客户端包。
 */
export function Navbar() {
  return (
    <nav
      aria-label="主导航"
      className="relative flex items-center justify-between gap-4 glass-card px-4 py-3 sm:px-5"
    >
      <Link href="/" className="text-base font-semibold tracking-tight">
        {siteConfig.name}
      </Link>
      <NavMenu items={navItems} />
    </nav>
  );
}

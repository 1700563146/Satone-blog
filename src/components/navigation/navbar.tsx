import Link from "next/link";

import { navItems, siteConfig } from "@/lib/config";

export function Navbar() {
  return (
    <nav
      aria-label="主导航"
      className="flex items-center justify-between gap-4 glass-card px-5 py-3"
    >
      <Link href="/" className="text-base font-semibold tracking-tight">
        {siteConfig.name}
      </Link>
      <ul className="flex items-center gap-1 text-sm">
        {navItems.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="rounded-control px-3 py-1.5 text-muted transition-colors hover:bg-surface hover:text-text"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

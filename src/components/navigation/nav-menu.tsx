"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

export type NavMenuItem = {
  label: string;
  href: string;
};

type NavMenuProps = {
  items: readonly NavMenuItem[];
};

/** 当前路径是否属于该导航条目（`/posts/hello-world` 也算"文章"）。 */
function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function MenuIcon() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    >
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

const ITEM_CLASS =
  "block rounded-control px-3 py-1.5 text-muted transition-colors hover:bg-surface hover:text-text focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none";

const ACTIVE_CLASS = "text-text font-medium";

/**
 * 导航条目。
 *
 * - 桌面端：横排显示，当前条目用 `aria-current` 标记；
 * - 移动端：默认收起，按钮提供 `aria-expanded` / `aria-controls`，
 *   支持 Escape 关闭并把焦点还给按钮，点击面板外或路由变化后自动收起。
 *
 * 之所以是客户端组件：折叠状态、当前路径高亮与键盘处理都需要浏览器端状态。
 * 站点配置由父级（服务端组件）以 props 传入，避免把 env 派生的值打进客户端包。
 */
export function NavMenu({ items }: NavMenuProps) {
  const pathname = usePathname() ?? "/";
  const panelId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // 折叠状态与"它属于哪个路径"一起保存：路由变化时在渲染阶段直接复位，
  // 既避免 effect 里的级联渲染，也保证导航后菜单不会残留展开。
  const [menu, setMenu] = useState({ open: false, pathname });
  if (menu.pathname !== pathname) {
    setMenu({ open: false, pathname });
  }
  const open = menu.open;

  const closeMenu = () => setMenu((current) => ({ ...current, open: false }));

  // Escape 关闭菜单，并把焦点交还触发按钮
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setMenu((current) => ({ ...current, open: false }));
      buttonRef.current?.focus();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  // 点击面板与按钮之外的区域时收起（用 pointerdown，触摸设备同样生效）
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (panelRef.current?.contains(target) === true) return;
      if (buttonRef.current?.contains(target) === true) return;
      setMenu((current) => ({ ...current, open: false }));
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  return (
    <>
      <ul
        aria-label="导航条目"
        className="hidden items-center gap-1 text-sm sm:flex"
      >
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`${ITEM_CLASS} ${active ? ACTIVE_CLASS : ""}`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>

      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? "关闭导航菜单" : "打开导航菜单"}
        onClick={() =>
          setMenu((current) => ({ ...current, open: !current.open }))
        }
        className="rounded-control p-2 text-muted transition-colors hover:bg-surface hover:text-text focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none sm:hidden"
      >
        {open ? <CloseIcon /> : <MenuIcon />}
      </button>

      {/* 折叠面板：靠 hidden 属性移出无障碍树，不额外写 display 工具类 */}
      <div
        id={panelId}
        ref={panelRef}
        hidden={!open}
        className="absolute inset-x-0 top-full z-20 mt-2 sm:hidden"
      >
        <ul
          aria-label="折叠导航条目"
          className="flex flex-col gap-1 glass-card p-2 text-sm"
        >
          {items.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`${ITEM_CLASS} ${active ? ACTIVE_CLASS : ""}`}
                  onClick={closeMenu}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}

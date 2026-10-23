import "@testing-library/jest-dom/vitest";
import type { ReactNode } from "react";
import { vi } from "vitest";

/** next/link 支持但普通 <a> 不认识的属性，测试里直接丢弃。 */
const NEXT_ONLY_PROPS = new Set([
  "prefetch",
  "replace",
  "scroll",
  "shallow",
  "passHref",
  "legacyBehavior",
  "locale",
  "onNavigate",
]);

/**
 * 组件测试在 jsdom 中运行，没有 Next 的 App Router 上下文。
 *
 * `next/link` 在真实浏览器里会做预取与路由跳转，测试里只需要一个语义正确的
 * `<a href>`；把 href 原样透出，断言链接目标即可。
 */
vi.mock("next/link", () => ({
  __esModule: true,
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string | { pathname?: string };
    children?: ReactNode;
    [key: string]: unknown;
  }) => {
    const props: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(rest)) {
      if (!NEXT_ONLY_PROPS.has(key)) props[key] = value;
    }

    return (
      <a
        href={typeof href === "string" ? href : (href?.pathname ?? "")}
        {...props}
      >
        {children}
      </a>
    );
  },
}));

/**
 * jsdom 不实现页面跳转，点击 `<a>` 会打印 "Not implemented: navigation"。
 * 这里只阻止默认跳转行为；组件自己的 onClick（例如收起菜单）照常执行。
 */
if (typeof document !== "undefined") {
  document.addEventListener("click", (event) => {
    const target = event.target;
    if (target instanceof Element && target.closest("a") !== null) {
      event.preventDefault();
    }
  });
}

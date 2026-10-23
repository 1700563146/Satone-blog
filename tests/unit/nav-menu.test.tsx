// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

const navigationState = vi.hoisted(() => ({ pathname: "/" }));

vi.mock("next/navigation", () => ({
  usePathname: () => navigationState.pathname,
}));

import { NavMenu } from "@/components/navigation/nav-menu";

afterEach(cleanup);

const items = [
  { label: "首页", href: "/" },
  { label: "文章", href: "/posts" },
  { label: "关于", href: "/about" },
];

function getPanel(toggle: HTMLElement): HTMLElement {
  const panelId = toggle.getAttribute("aria-controls");
  if (panelId === null) throw new Error("按钮缺少 aria-controls");

  const panel = document.getElementById(panelId);
  if (panel === null) throw new Error("找不到折叠面板");
  return panel;
}

describe("NavMenu", () => {
  it("默认收起：按钮 aria-expanded=false，面板 hidden", () => {
    render(<NavMenu items={items} />);

    const toggle = screen.getByRole("button", { name: "打开导航菜单" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(getPanel(toggle)).toHaveAttribute("hidden");
  });

  it("点击按钮展开，再点一次收起", async () => {
    const user = userEvent.setup();
    render(<NavMenu items={items} />);

    const toggle = screen.getByRole("button", { name: "打开导航菜单" });
    const panel = getPanel(toggle);

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(panel).not.toHaveAttribute("hidden");
    expect(screen.getByRole("button", { name: "关闭导航菜单" })).toBe(toggle);

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(panel).toHaveAttribute("hidden");
  });

  it("Escape 收起菜单并把焦点还给按钮", async () => {
    const user = userEvent.setup();
    render(<NavMenu items={items} />);

    const toggle = screen.getByRole("button", { name: "打开导航菜单" });
    const panel = getPanel(toggle);

    await user.click(toggle);
    expect(panel).not.toHaveAttribute("hidden");

    await user.keyboard("{Escape}");
    expect(panel).toHaveAttribute("hidden");
    expect(toggle).toHaveFocus();
  });

  it("点击折叠菜单里的条目后收起", async () => {
    const user = userEvent.setup();
    render(<NavMenu items={items} />);

    const toggle = screen.getByRole("button", { name: "打开导航菜单" });
    const panel = getPanel(toggle);

    await user.click(toggle);
    const panelList = within(panel).getByRole("list", { name: "折叠导航条目" });
    await user.click(within(panelList).getByRole("link", { name: "关于" }));

    expect(panel).toHaveAttribute("hidden");
  });

  it("桌面与折叠菜单都包含全部条目", async () => {
    const user = userEvent.setup();
    render(<NavMenu items={items} />);

    const toggle = screen.getByRole("button", { name: "打开导航菜单" });
    const desktop = screen.getByRole("list", { name: "导航条目" });
    expect(within(desktop).getAllByRole("link")).toHaveLength(3);

    // 折叠面板在收起时不在无障碍树里，先展开再断言
    await user.click(toggle);
    const mobile = within(getPanel(toggle)).getByRole("list", {
      name: "折叠导航条目",
    });

    expect(within(mobile).getAllByRole("link")).toHaveLength(3);
    expect(within(mobile).getByRole("link", { name: "文章" })).toHaveAttribute(
      "href",
      "/posts",
    );
  });

  it("当前路径用 aria-current 标记（含子路径）", () => {
    navigationState.pathname = "/posts/hello-world";
    render(<NavMenu items={items} />);

    const desktop = screen.getByRole("list", { name: "导航条目" });
    expect(within(desktop).getByRole("link", { name: "文章" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      within(desktop).getByRole("link", { name: "首页" }),
    ).not.toHaveAttribute("aria-current");
  });

  it("路径变化后自动收起", async () => {
    navigationState.pathname = "/";
    const user = userEvent.setup();
    const { rerender } = render(<NavMenu items={items} />);

    const toggle = screen.getByRole("button", { name: "打开导航菜单" });
    const panel = getPanel(toggle);

    await user.click(toggle);
    expect(panel).not.toHaveAttribute("hidden");

    navigationState.pathname = "/about";
    rerender(<NavMenu items={items} />);

    expect(panel).toHaveAttribute("hidden");
  });

  it("点击面板外部收起", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <NavMenu items={items} />
        <button type="button">外部按钮</button>
      </div>,
    );

    const toggle = screen.getByRole("button", { name: "打开导航菜单" });
    const panel = getPanel(toggle);

    await user.click(toggle);
    expect(panel).not.toHaveAttribute("hidden");

    await user.click(screen.getByRole("button", { name: "外部按钮" }));
    expect(panel).toHaveAttribute("hidden");
  });
});

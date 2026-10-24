// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const routerState = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: routerState.push }),
}));

import { SearchPanel } from "@/components/search/search-panel";
import type { SearchEntry } from "@/lib/search";

afterEach(cleanup);

beforeEach(() => {
  routerState.push.mockClear();
});

const index: SearchEntry[] = [
  {
    slug: "hello-world",
    title: "你好，世界",
    description: "第一篇文章：记录技术选型与内容组织方式。",
    date: "2026-10-23",
    categories: ["开发记录"],
    tags: ["博客", "Next.js"],
  },
  {
    slug: "shiki-highlight",
    title: "用 Shiki 做构建期代码高亮",
    description: "记录引入 rehype-pretty-code 的过程与取舍。",
    date: "2026-10-24",
    categories: ["开发记录"],
    tags: ["Shiki"],
  },
];

function renderPanel() {
  const user = userEvent.setup();
  render(<SearchPanel index={index} />);
  const input = screen.getByRole("searchbox", { name: "搜索文章" });
  return { user, input };
}

describe("SearchPanel", () => {
  it("初始展示引导态，不显示结果", () => {
    renderPanel();

    expect(screen.getByText(/输入关键词开始搜索/)).toBeInTheDocument();
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });

  it("输入关键词即时过滤并展示命中条数与结果", async () => {
    const { user, input } = renderPanel();

    await user.type(input, "shiki");

    expect(screen.getAllByText("找到 1 篇").length).toBeGreaterThan(0);
    // 结果链接的无障碍名称是「标题，日期」，避免把整段摘要念给屏幕阅读器
    expect(
      screen.getByRole("link", {
        name: "用 Shiki 做构建期代码高亮，2026 年 10 月 24 日",
      }),
    ).toHaveAttribute("href", "/posts/shiki-highlight");
    expect(screen.queryByRole("link", { name: /你好，世界/ })).toBeNull();
  });

  it("命中词在标题里被 <mark> 标记", async () => {
    const { user, input } = renderPanel();

    await user.type(input, "shiki");

    const marks = document.querySelectorAll("mark");
    expect(marks.length).toBeGreaterThan(0);
    expect(marks[0]?.textContent).toBe("Shiki");
  });

  it("没有命中时展示空结果提示并把关键词回显", async () => {
    const { user, input } = renderPanel();

    await user.type(input, "区块链");

    expect(screen.getByText("没有匹配「区块链」的文章")).toBeInTheDocument();
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });

  it("Escape 清空输入并回到引导态", async () => {
    const { user, input } = renderPanel();

    await user.type(input, "shiki");
    await user.keyboard("{Escape}");

    expect(input).toHaveValue("");
    expect(screen.getByText(/输入关键词开始搜索/)).toBeInTheDocument();
  });

  it("↓ 选择 + Enter 打开命中的文章", async () => {
    const { user, input } = renderPanel();

    await user.type(input, "shiki");
    await user.keyboard("{ArrowDown}");
    await user.keyboard("{Enter}");

    expect(routerState.push).toHaveBeenCalledWith("/posts/shiki-highlight");
  });

  it("Ctrl+K 把焦点移到搜索框", async () => {
    const { user, input } = renderPanel();

    expect(input).not.toHaveFocus();
    await user.keyboard("{Control>}k{/Control}");
    expect(input).toHaveFocus();
  });

  it("中文关键词也能命中标题", async () => {
    const { user, input } = renderPanel();

    await user.type(input, "世界");

    expect(screen.getByRole("link", { name: /你好，世界/ })).toHaveAttribute(
      "href",
      "/posts/hello-world",
    );
  });
});

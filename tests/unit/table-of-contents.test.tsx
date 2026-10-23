// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { TableOfContents } from "@/components/post/table-of-contents";

afterEach(cleanup);

const toc = [
  { id: "为什么写博客", text: "为什么写博客", depth: 2 as const },
  { id: "内容优先", text: "内容优先", depth: 3 as const },
];

describe("TableOfContents", () => {
  it("每个条目都指向正文里的锚点", () => {
    render(<TableOfContents toc={toc} />);

    expect(screen.getByRole("link", { name: "为什么写博客" })).toHaveAttribute(
      "href",
      "#为什么写博客",
    );
    expect(screen.getByRole("link", { name: "内容优先" })).toHaveAttribute(
      "href",
      "#内容优先",
    );
  });

  it("h3 条目缩进一级", () => {
    render(<TableOfContents toc={toc} />);

    const nested = screen.getByRole("link", { name: "内容优先" }).closest("li");
    const top = screen
      .getByRole("link", { name: "为什么写博客" })
      .closest("li");
    expect(nested).toHaveClass("pl-4");
    expect(top).not.toHaveClass("pl-4");
  });

  it("目录为空时不渲染", () => {
    const { container } = render(<TableOfContents toc={[]} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("导航有可访问名称", () => {
    render(<TableOfContents toc={toc} />);

    expect(
      screen.getByRole("navigation", { name: "目录" }),
    ).toBeInTheDocument();
  });
});

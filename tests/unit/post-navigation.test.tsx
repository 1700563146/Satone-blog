// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { PostNavigation } from "@/components/post/post-navigation";
import type { PostSummary } from "@/lib/content/schema";

afterEach(cleanup);

function makePost(slug: string, title: string): PostSummary {
  return {
    title,
    slug,
    description: `${title} 的摘要`,
    date: "2026-10-23",
    categories: [],
    tags: [],
    featured: false,
  };
}

const older = makePost("older", "更早的一篇");
const newer = makePost("newer", "更新的一篇");

describe("PostNavigation", () => {
  it("同时展示上一篇与下一篇", () => {
    render(<PostNavigation older={older} newer={newer} />);

    expect(screen.getByRole("link", { name: /上一篇/ })).toHaveAttribute(
      "href",
      "/posts/older",
    );
    expect(screen.getByRole("link", { name: /下一篇/ })).toHaveAttribute(
      "href",
      "/posts/newer",
    );
  });

  it("只有一侧存在时只渲染那一侧", () => {
    const { container } = render(<PostNavigation older={null} newer={newer} />);

    expect(screen.queryByRole("link", { name: /上一篇/ })).toBeNull();
    expect(screen.getByRole("link", { name: /下一篇/ })).toBeInTheDocument();
    expect(container.querySelectorAll("a")).toHaveLength(1);
  });

  it("两侧都没有时不渲染导航", () => {
    const { container } = render(<PostNavigation older={null} newer={null} />);

    expect(container).toBeEmptyDOMElement();
  });
});

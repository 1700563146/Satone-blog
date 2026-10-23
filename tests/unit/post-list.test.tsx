// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { PostList } from "@/components/post/post-list";
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

describe("PostList", () => {
  it("按传入顺序渲染文章卡片", () => {
    render(
      <PostList posts={[makePost("a", "第一篇"), makePost("b", "第二篇")]} />,
    );

    const links = screen.getAllByRole("link");
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/posts/a",
      "/posts/b",
    ]);
  });

  it("空列表展示默认引导文案", () => {
    render(<PostList posts={[]} />);

    expect(screen.getByText("还没有已发布的文章")).toBeInTheDocument();
    expect(screen.getByText(/content\/posts\//)).toBeInTheDocument();
  });

  it("空列表可以自定义文案", () => {
    render(
      <PostList
        posts={[]}
        emptyTitle="该分类下还没有已发布的文章"
        emptyDescription="换个分类看看。"
      />,
    );

    expect(screen.getByText("该分类下还没有已发布的文章")).toBeInTheDocument();
    expect(screen.getByText("换个分类看看。")).toBeInTheDocument();
  });
});

// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { PostCard } from "@/components/post/post-card";
import type { PostSummary } from "@/lib/content/schema";

afterEach(cleanup);

const post: PostSummary = {
  title: "你好，世界",
  slug: "hello-world",
  description: "第一篇文章的摘要",
  date: "2026-10-23",
  categories: ["开发记录"],
  tags: ["博客", "Next.js"],
  featured: true,
};

describe("PostCard", () => {
  it("标题是唯一指向文章详情的链接", () => {
    render(<PostCard post={post} />);

    expect(screen.getByRole("link", { name: "你好，世界" })).toHaveAttribute(
      "href",
      "/posts/hello-world",
    );
  });

  it("展示中文日期、摘要与精选标记", () => {
    render(<PostCard post={post} />);

    expect(screen.getByText("2026 年 10 月 23 日")).toBeInTheDocument();
    expect(screen.getByText("第一篇文章的摘要")).toBeInTheDocument();
    expect(screen.getByText("精选")).toBeInTheDocument();
  });

  it("分类与标签分别链接到归档页，标签带 # 前缀", () => {
    render(<PostCard post={post} />);

    expect(screen.getByRole("link", { name: "开发记录" })).toHaveAttribute(
      "href",
      `/categories/${encodeURIComponent("开发记录")}`,
    );
    expect(screen.getByRole("link", { name: "#博客" })).toHaveAttribute(
      "href",
      `/tags/${encodeURIComponent("博客")}`,
    );
  });

  it("没有精选与分类标签时不渲染多余元素", () => {
    render(
      <PostCard
        post={{ ...post, featured: false, categories: [], tags: [] }}
      />,
    );

    expect(screen.queryByText("精选")).toBeNull();
    expect(screen.queryByRole("link", { name: /^#/ })).toBeNull();
  });

  it("有更新日期时额外展示", () => {
    render(<PostCard post={{ ...post, updatedAt: "2026-10-24" }} />);

    expect(screen.getByText("更新于 2026 年 10 月 24 日")).toBeInTheDocument();
  });
});

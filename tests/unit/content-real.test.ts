import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  collectPosts,
  loadAllPosts,
  loadPublicIndex,
} from "@/lib/content/read-posts";
import { analyzeMarkdown, renderMarkdown } from "@/lib/content/render-markdown";
import { isPublished } from "@/lib/content/schema";

const postsDir = path.join(process.cwd(), "content", "posts");

describe("仓库中的真实内容", () => {
  it("示例文章全部通过 frontmatter 校验", async () => {
    const { posts, issues } = await collectPosts({ postsDir });

    expect(issues.filter((issue) => issue.severity === "error")).toEqual([]);
    expect(posts.length).toBeGreaterThanOrEqual(2);
    expect(posts.some((post) => post.slug === "hello-world")).toBe(true);
    expect(posts.some((post) => post.slug === "draft-notes")).toBe(true);
  });

  it("正文通过 Markdown 安全检查", async () => {
    const { posts } = await collectPosts({ postsDir });

    for (const post of posts) {
      const issues = analyzeMarkdown(post.content, post.sourcePath);
      expect(
        issues.filter((issue) => issue.severity === "error"),
        post.sourcePath,
      ).toEqual([]);
    }
  });

  it("公开索引不包含草稿及其分类与标签", async () => {
    const index = await loadPublicIndex({ postsDir });
    const serialized = JSON.stringify(index);

    expect(index.posts.map((post) => post.slug)).toContain("hello-world");
    expect(index.posts.map((post) => post.slug)).not.toContain("draft-notes");
    expect(serialized).not.toContain("DRAFT_SENTINEL_2026");
    expect(serialized).not.toContain("草稿箱");
    expect(serialized).not.toContain("草稿专用");
  });

  it("hello-world 的 frontmatter 与摘要符合预期", async () => {
    const posts = await loadAllPosts({ postsDir });
    const post = posts.find((candidate) => candidate.slug === "hello-world");

    expect(post).toBeDefined();
    expect(post && isPublished(post)).toBe(true);
    expect(post?.featured).toBe(true);
    expect(post?.categories).toEqual(["开发记录"]);
    expect(post?.tags).toEqual(["博客", "Next.js"]);
  });

  it("hello-world 渲染出目录、代码块与安全外链", async () => {
    const posts = await loadAllPosts({ postsDir });
    const post = posts.find((candidate) => candidate.slug === "hello-world");
    if (post === undefined) throw new Error("缺少 hello-world 示例文章");

    const { html, toc } = await renderMarkdown(post.content, {
      sourcePath: post.sourcePath,
    });

    expect(toc.map((entry) => entry.text)).toEqual([
      "为什么写博客",
      "技术选型",
      "内容优先",
      "接下来要做的事",
    ]);
    expect(toc.find((entry) => entry.text === "内容优先")?.depth).toBe(3);

    expect(html).toContain('data-language="ts"');
    expect(html).toContain("<table>");
    expect(html).toContain('type="checkbox"');
    expect(html).toContain('href="/about"');
    expect(html).toContain(
      '<a href="https://nextjs.org/docs" target="_blank" rel="noopener noreferrer">',
    );
  });
});

import { describe, expect, it } from "vitest";

import type { PostSummary } from "@/lib/content/schema";
import {
  buildSearchIndex,
  highlightSegments,
  searchPosts,
  tokenize,
  type SearchEntry,
} from "@/lib/search";

function makePost(overrides: Partial<PostSummary> = {}): PostSummary {
  return {
    title: "你好，世界",
    slug: "hello-world",
    description: "Sato Blog 的第一篇文章：记录技术选型与内容组织方式。",
    date: "2026-10-23",
    categories: ["开发记录"],
    tags: ["博客", "Next.js"],
    featured: true,
    ...overrides,
  };
}

const index: SearchEntry[] = buildSearchIndex([
  makePost(),
  makePost({
    title: "用 Shiki 做构建期代码高亮",
    slug: "shiki-highlight",
    description: "记录引入 rehype-pretty-code 的过程与取舍。",
    date: "2026-10-24",
    categories: ["开发记录"],
    tags: ["Shiki"],
  }),
  makePost({
    title: "关于阅读的笔记",
    slug: "reading-notes",
    description: "一些书摘与想法。",
    date: "2026-09-01",
    categories: ["生活"],
    tags: ["读书"],
  }),
]);

describe("buildSearchIndex", () => {
  it("只保留搜索需要的字段，并复制分类与标签", () => {
    const entry = buildSearchIndex([makePost()])[0];

    expect(entry).toEqual({
      slug: "hello-world",
      title: "你好，世界",
      description: "Sato Blog 的第一篇文章：记录技术选型与内容组织方式。",
      date: "2026-10-23",
      categories: ["开发记录"],
      tags: ["博客", "Next.js"],
    });
    expect(Object.keys(entry ?? {})).not.toContain("featured");
  });
});

describe("tokenize", () => {
  it("按空白切分并小写化", () => {
    expect(tokenize("  Next   Shiki ")).toEqual(["next", "shiki"]);
  });

  it("空字符串与纯空白返回空数组", () => {
    expect(tokenize("")).toEqual([]);
    expect(tokenize("   ")).toEqual([]);
  });
});

describe("searchPosts", () => {
  it("空查询不返回任何结果", () => {
    expect(searchPosts(index, "")).toEqual([]);
    expect(searchPosts(index, "   ")).toEqual([]);
  });

  it("大小写不敏感地命中 slug 与标签", () => {
    expect(searchPosts(index, "next").map((hit) => hit.slug)).toEqual([
      "hello-world",
    ]);
    expect(searchPosts(index, "SHIKI").map((hit) => hit.slug)).toEqual([
      "shiki-highlight",
    ]);
  });

  it("支持中文关键词（标题、分类、摘要）", () => {
    expect(searchPosts(index, "世界").map((hit) => hit.slug)).toEqual([
      "hello-world",
    ]);
    // 两篇都在「开发记录」分类下：同分按日期倒序
    expect(searchPosts(index, "开发记录").map((hit) => hit.slug)).toEqual([
      "shiki-highlight",
      "hello-world",
    ]);
    expect(searchPosts(index, "书摘").map((hit) => hit.slug)).toEqual([
      "reading-notes",
    ]);
  });

  it("多个关键词是 AND 关系", () => {
    expect(searchPosts(index, "shiki 高亮").map((hit) => hit.slug)).toEqual([
      "shiki-highlight",
    ]);
    expect(searchPosts(index, "shiki 读书")).toEqual([]);
  });

  it("标题命中排在摘要命中之前", () => {
    // "开发记录" 在分类里；"高亮" 在标题与摘要里 —— 标题权重更高
    const hits = searchPosts(index, "高亮");
    expect(hits[0]?.slug).toBe("shiki-highlight");
    expect(hits[0]?.score).toBeGreaterThan(0);
  });

  it("同分时按日期倒序", () => {
    const hits = searchPosts(index, "开发记录");
    expect(hits.map((hit) => hit.slug)).toEqual([
      "shiki-highlight",
      "hello-world",
    ]);
  });

  it("limit 生效", () => {
    expect(searchPosts(index, "开发记录", 1)).toHaveLength(1);
  });

  it("没有匹配时返回空数组", () => {
    expect(searchPosts(index, "不存在的关键词")).toEqual([]);
  });
});

describe("highlightSegments", () => {
  it("按关键词切分并标记命中片段（大小写不敏感）", () => {
    expect(highlightSegments("Next.js 与 next 的区别", "next")).toEqual([
      { text: "Next", match: true },
      { text: ".js 与 ", match: false },
      { text: "next", match: true },
      { text: " 的区别", match: false },
    ]);
  });

  it("空查询或空文本时只有一个未命中片段", () => {
    expect(highlightSegments("任意文本", "")).toEqual([
      { text: "任意文本", match: false },
    ]);
    expect(highlightSegments("", "next")).toEqual([{ text: "", match: false }]);
  });

  it("关键词里的正则元字符被转义", () => {
    expect(highlightSegments("a.b 与 axb", "a.b")).toEqual([
      { text: "a.b", match: true },
      { text: " 与 axb", match: false },
    ]);
  });
});

import { describe, expect, it } from "vitest";

import {
  deriveDescription,
  deriveTitle,
  formatPostSource,
  preparePost,
  slugify,
  todayInOffset,
} from "@/lib/content/publish";
import { parsePostSource } from "@/lib/content/parse-frontmatter";
import { ContentValidationError } from "@/lib/content/schema";

const FALLBACK_DATE = "2026-10-24";

const plainMarkdown = `# 我的第一篇文章

这是正文的第一段，用来做摘要。

## 小节

- 列表项
`;

describe("slugify", () => {
  it("转小写并把非字母数字折叠成连字符", () => {
    expect(slugify("My First Post")).toBe("my-first-post");
    expect(slugify("Hello__World!!")).toBe("hello-world");
    expect(slugify("  -trim-  ")).toBe("trim");
  });

  it("中文等非 ASCII 字符会被去掉，可能得到空串", () => {
    expect(slugify("我的文章")).toBe("");
  });
});

describe("todayInOffset", () => {
  it("按给定偏移换算日期（跨 UTC 日界）", () => {
    const now = new Date("2026-10-23T20:30:00Z");
    expect(todayInOffset("+08:00", now)).toBe("2026-10-24");
    expect(todayInOffset("-05:00", now)).toBe("2026-10-23");
    expect(todayInOffset("+08:00")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("deriveTitle / deriveDescription", () => {
  it("取第一个 H1 作为标题", () => {
    expect(deriveTitle(plainMarkdown)).toBe("我的第一篇文章");
    expect(deriveTitle("没有标题的正文")).toBeUndefined();
  });

  it("取第一段纯文本作为摘要，跳过标题/代码块/引用/列表", () => {
    const markdown = [
      "# 标题",
      "",
      "```ts",
      "const a = 1;",
      "```",
      "",
      "> 引用不算摘要",
      "",
      "这是 **正文** 的第一段，带 [链接](https://example.com) 与 `代码`。",
    ].join("\n");

    expect(deriveDescription(markdown)).toBe(
      "这是 正文 的第一段，带 链接 与 代码。",
    );
  });

  it("超长摘要会被截断并加省略号", () => {
    const long = "字".repeat(260);
    const result = deriveDescription(`# 标题\n\n${long}`);
    expect(result).toHaveLength(200);
    expect(result?.endsWith("…")).toBe(true);
  });
});

describe("preparePost", () => {
  it("没有 frontmatter 时从正文推导全部必需字段", () => {
    const prepared = preparePost(plainMarkdown, {
      filename: "my-first-post.md",
      fallbackDate: FALLBACK_DATE,
    });

    expect(prepared.frontmatter).toMatchObject({
      title: "我的第一篇文章",
      slug: "my-first-post",
      description: "这是正文的第一段，用来做摘要。",
      date: FALLBACK_DATE,
      published: true,
      draft: false,
      categories: [],
      tags: [],
      featured: false,
    });
    expect(prepared.body.startsWith("# ")).toBe(false);
    expect(prepared.body).toContain("## 小节");
    expect(prepared.warnings.join()).toContain("没有 frontmatter");
    expect(prepared.warnings.join()).toContain(
      "一级标题与 frontmatter 标题重复",
    );
  });

  it("保留已有 frontmatter，并允许命令行覆盖", () => {
    const source = `---
title: "原标题"
slug: "original"
description: "原摘要"
date: "2026-10-01"
published: true
draft: false
categories:
  - "开发记录"
tags:
  - "博客"
---

正文。
`;

    const prepared = preparePost(source, {
      filename: "whatever.md",
      fallbackDate: FALLBACK_DATE,
      title: "新标题",
      tags: ["Next.js"],
    });

    expect(prepared.frontmatter.title).toBe("新标题");
    expect(prepared.frontmatter.slug).toBe("original");
    expect(prepared.frontmatter.tags).toEqual(["Next.js"]);
    expect(prepared.frontmatter.categories).toEqual(["开发记录"]);
    expect(prepared.frontmatter.published).toBe(true);
  });

  it("--date 覆盖文件里的日期", () => {
    const source = `---
title: "日期覆盖"
slug: "date-override"
description: "摘要"
date: "2026-10-01"
published: true
draft: false
---

正文。
`;

    const prepared = preparePost(source, {
      filename: "date-override.md",
      fallbackDate: FALLBACK_DATE,
      date: "2026-10-20",
    });

    expect(prepared.frontmatter.date).toBe("2026-10-20");
  });

  it("未加引号的日期会被规范成字符串并给出提示", () => {
    const source = `---
title: "日期测试"
slug: "date-test"
description: "摘要"
date: 2026-10-23
published: true
draft: false
---

正文。
`;

    const prepared = preparePost(source, {
      filename: "date-test.md",
      fallbackDate: FALLBACK_DATE,
    });

    expect(prepared.frontmatter.date).toBe("2026-10-23");
    expect(prepared.warnings.join()).toContain("日期没有加引号");
  });

  it("未知字段直接报错（拼写错误不会被静默吞掉）", () => {
    const source = `---
title: "拼错字段"
slug: "typo"
description: "摘要"
date: "2026-10-23"
pubished: true
---

正文。
`;

    expect(() =>
      preparePost(source, { filename: "typo.md", fallbackDate: FALLBACK_DATE }),
    ).toThrow(ContentValidationError);

    try {
      preparePost(source, { filename: "typo.md", fallbackDate: FALLBACK_DATE });
    } catch (error) {
      const issues = (error as ContentValidationError).issues;
      expect(issues[0]?.field).toBe("pubished");
      expect(issues[0]?.message).toContain("未知字段");
    }
  });

  it("published 与 draft 同时为 true 时报错", () => {
    const source = `---
title: "冲突"
slug: "conflict"
description: "摘要"
date: "2026-10-23"
published: true
draft: true
---

正文。
`;

    expect(() =>
      preparePost(source, {
        filename: "conflict.md",
        fallbackDate: FALLBACK_DATE,
      }),
    ).toThrow(ContentValidationError);
  });

  it("无法从文件名推导 slug 时提示用 --slug", () => {
    expect(() =>
      preparePost(plainMarkdown, {
        filename: "我的文章.md",
        fallbackDate: FALLBACK_DATE,
      }),
    ).toThrow(/slug/);
  });

  it("--draft 生成草稿（published: false）", () => {
    const prepared = preparePost(plainMarkdown, {
      filename: "draft-post.md",
      fallbackDate: FALLBACK_DATE,
      draft: true,
    });

    expect(prepared.frontmatter.published).toBe(false);
    expect(prepared.frontmatter.draft).toBe(true);
  });
});

describe("formatPostSource", () => {
  it("输出能被生产解析器接受（日期带引号、字段顺序稳定）", () => {
    const prepared = preparePost(plainMarkdown, {
      filename: "round-trip.md",
      fallbackDate: FALLBACK_DATE,
      categories: ["开发记录"],
      tags: ["博客"],
    });
    const source = formatPostSource(prepared.frontmatter, prepared.body);

    expect(source).toContain(`date: "${FALLBACK_DATE}"`);
    expect(source).toContain('  - "开发记录"');

    const reparsed = parsePostSource(source, "content/posts/round-trip.md");
    expect(reparsed.frontmatter).toEqual(prepared.frontmatter);
    expect(reparsed.content.trim()).toContain("## 小节");
  });

  it("空分类与标签输出为 []", () => {
    const prepared = preparePost(plainMarkdown, {
      filename: "empty-taxonomy.md",
      fallbackDate: FALLBACK_DATE,
    });
    const source = formatPostSource(prepared.frontmatter, prepared.body);

    expect(source).toContain("categories: []");
    expect(source).toContain("tags: []");
  });
});

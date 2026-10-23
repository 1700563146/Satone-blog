import { describe, expect, it } from "vitest";
import { ContentValidationError } from "@/lib/content/schema";
import {
  normalizeNewlines,
  parsePostSource,
} from "@/lib/content/parse-frontmatter";

const validSource = `---
title: "标题"
slug: "hello"
description: "摘要"
date: "2026-10-23"
published: true
draft: false
---

正文第一段。
`;

function issuesOf(error: unknown) {
  expect(error).toBeInstanceOf(ContentValidationError);
  return (error as ContentValidationError).issues;
}

describe("normalizeNewlines", () => {
  it("去掉 BOM 并统一换行符", () => {
    expect(normalizeNewlines("﻿a\r\nb\rc")).toBe("a\nb\nc");
  });
});

describe("parsePostSource", () => {
  it("解析 frontmatter 与正文", () => {
    const parsed = parsePostSource(validSource, "content/posts/hello.md");

    expect(parsed.frontmatter.title).toBe("标题");
    expect(parsed.frontmatter.slug).toBe("hello");
    expect(parsed.frontmatter.categories).toEqual([]);
    expect(parsed.content.trim()).toBe("正文第一段。");
  });

  it("支持 BOM 与 CRLF", () => {
    const source = `﻿${validSource.replace(/\n/g, "\r\n")}`;
    const parsed = parsePostSource(source, "content/posts/hello.md");

    expect(parsed.frontmatter.slug).toBe("hello");
    expect(parsed.content).not.toContain("\r");
  });

  it("拒绝未加引号的日期（避免 YAML 自动进位掩盖非法日期）", () => {
    for (const date of ["2026-10-23", "2026-02-30"]) {
      try {
        parsePostSource(
          `---
title: "标题"
slug: "hello"
description: "摘要"
date: ${date}
published: true
draft: false
---

正文
`,
          "content/posts/hello.md",
        );
        expect.unreachable(`未加引号的日期应被拒绝：${date}`);
      } catch (error) {
        const issues = issuesOf(error);
        expect(issues[0]?.field).toBe("date");
        expect(issues[0]?.message).toContain("加引号");
      }
    }
  });

  it("updatedAt 为空字符串时视为未填写", () => {
    const parsed = parsePostSource(
      validSource.replace("draft: false\n", 'draft: false\nupdatedAt: ""\n'),
      "content/posts/hello.md",
    );
    expect(parsed.frontmatter.updatedAt).toBeUndefined();
  });

  it("缺少 frontmatter 时报错并指向第一行", () => {
    try {
      parsePostSource("正文没有 frontmatter\n", "content/posts/plain.md");
      expect.unreachable("应当抛出 ContentValidationError");
    } catch (error) {
      const issues = issuesOf(error);
      expect(issues).toHaveLength(1);
      expect(issues[0]?.code).toBe("INVALID_FRONTMATTER");
      expect(issues[0]?.line).toBe(1);
    }
  });

  it("拒绝 ---js / ---json 等自定义解析器", () => {
    for (const opener of ["---js", "---json", "---toml"]) {
      expect(() =>
        parsePostSource(
          `${opener}\nmodule.exports = {}\n---\n`,
          "content/posts/x.md",
        ),
      ).toThrow(ContentValidationError);
    }
  });

  it("YAML 语法错误转换为 INVALID_YAML，并给出文件行号", () => {
    try {
      parsePostSource(
        `---
title: "未闭合
slug: "broken"
published: true
draft: false
---

正文
`,
        "content/posts/broken.md",
      );
      expect.unreachable("应当抛出 ContentValidationError");
    } catch (error) {
      const issues = issuesOf(error);
      expect(issues[0]?.code).toBe("INVALID_YAML");
      expect(issues[0]?.line).toBeGreaterThanOrEqual(2);
      expect(issues[0]?.message).toContain("YAML");
    }
  });

  it("未知字段映射到 field，便于定位拼写错误", () => {
    try {
      parsePostSource(
        validSource.replace("draft: false", "draft: false\npubished: true"),
        "content/posts/hello.md",
      );
      expect.unreachable("应当抛出 ContentValidationError");
    } catch (error) {
      const issues = issuesOf(error);
      const issue = issues.find((candidate) => candidate.field === "pubished");
      expect(issue).toBeDefined();
      expect(issue?.code).toBe("INVALID_FRONTMATTER");
    }
  });

  it("published 与 draft 同时为 true 时映射到 draft 字段", () => {
    try {
      parsePostSource(
        validSource.replace("draft: false", "draft: true"),
        "content/posts/hello.md",
      );
      expect.unreachable("应当抛出 ContentValidationError");
    } catch (error) {
      const issues = issuesOf(error);
      expect(issues.some((issue) => issue.field === "draft")).toBe(true);
    }
  });
});

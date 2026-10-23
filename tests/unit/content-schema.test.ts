import { describe, expect, it } from "vitest";
import {
  ContentValidationError,
  formatContentIssue,
  formatPostDate,
  isPublished,
  isValidPostSlug,
  normalizeTaxonomyName,
  postFrontmatterSchema,
  resolveTaxonomyParam,
  taxonomyHref,
  toSummary,
  type ContentIssue,
  type Post,
} from "@/lib/content/schema";

function validFrontmatter(overrides: Record<string, unknown> = {}) {
  return {
    title: "测试文章",
    slug: "test-post",
    description: "一段用于测试的文章摘要。",
    date: "2026-10-23",
    published: true,
    draft: false,
    ...overrides,
  };
}

describe("postFrontmatterSchema", () => {
  it("接受最小合法 frontmatter，并补齐默认值", () => {
    const result = postFrontmatterSchema.safeParse(validFrontmatter());
    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.categories).toEqual([]);
    expect(result.data.tags).toEqual([]);
    expect(result.data.featured).toBe(false);
    expect(result.data.updatedAt).toBeUndefined();
  });

  it("拒绝 YAML 自动解析出的 Date，要求日期加引号", () => {
    const result = postFrontmatterSchema.safeParse(
      validFrontmatter({ date: new Date(Date.UTC(2026, 9, 23)) }),
    );
    expect(result.success).toBe(false);
    if (!result.success)
      expect(result.error.issues[0]?.message).toContain("加引号");
  });

  it("拒绝非 YYYY-MM-DD 格式和不存在的日期", () => {
    for (const date of ["2026-2-3", "2026/10/23", "2026-02-30", "2026-13-01"]) {
      const result = postFrontmatterSchema.safeParse(
        validFrontmatter({ date }),
      );
      expect(result.success, date).toBe(false);
    }
  });

  it("要求 updatedAt 不早于 date", () => {
    const result = postFrontmatterSchema.safeParse(
      validFrontmatter({ updatedAt: "2026-10-22" }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((issue) => issue.path.includes("updatedAt")),
      ).toBe(true);
    }
  });

  it("拒绝 published 与 draft 同时为 true", () => {
    const result = postFrontmatterSchema.safeParse(
      validFrontmatter({ draft: true }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((issue) =>
          issue.message.includes("不能同时为 true"),
        ),
      ).toBe(true);
    }
  });

  it("必填 published 与 draft，缺失或类型错误时失败", () => {
    const missing = validFrontmatter();
    delete (missing as Record<string, unknown>).published;
    expect(postFrontmatterSchema.safeParse(missing).success).toBe(false);
    expect(
      postFrontmatterSchema.safeParse(validFrontmatter({ draft: "yes" }))
        .success,
    ).toBe(false);
  });

  it("拒绝未知字段（拼写错误不会被静默忽略）", () => {
    const result = postFrontmatterSchema.safeParse(
      validFrontmatter({ pubished: true }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find(
        (candidate) => candidate.code === "unrecognized_keys",
      );
      expect(issue).toBeDefined();
      if (issue?.code === "unrecognized_keys")
        expect(issue.keys).toEqual(["pubished"]);
    }
  });

  it("校验 title、slug 与 description", () => {
    expect(
      postFrontmatterSchema.parse(validFrontmatter({ title: "  标题  " }))
        .title,
    ).toBe("标题");
    expect(
      postFrontmatterSchema.safeParse(validFrontmatter({ title: "" })).success,
    ).toBe(false);
    expect(
      postFrontmatterSchema.safeParse(
        validFrontmatter({ title: "a".repeat(121) }),
      ).success,
    ).toBe(false);
    expect(
      postFrontmatterSchema.safeParse(validFrontmatter({ title: "a\u0000b" }))
        .success,
    ).toBe(false);
    expect(
      postFrontmatterSchema.safeParse(validFrontmatter({ description: "" }))
        .success,
    ).toBe(false);

    for (const slug of ["hello-world", "post-2026", "a1"]) {
      expect(
        postFrontmatterSchema.safeParse(validFrontmatter({ slug })).success,
        slug,
      ).toBe(true);
    }
    for (const slug of [
      "Hello",
      "-hello",
      "hello-",
      "hello_world",
      "hello world",
      "a".repeat(81),
    ]) {
      expect(
        postFrontmatterSchema.safeParse(validFrontmatter({ slug })).success,
        slug,
      ).toBe(false);
    }
  });

  it("规范化并去重分类与标签", () => {
    const result = postFrontmatterSchema.parse(
      validFrontmatter({
        categories: ["  开发   记录 ", "开发 记录"],
        tags: ["Next.js", "Next.js", "博客"],
      }),
    );
    expect(result.categories).toEqual(["开发 记录"]);
    expect(result.tags).toEqual(["Next.js", "博客"]);
  });

  it("拒绝非法分类/标签名与超量列表", () => {
    for (const name of [
      "a/b",
      "a\\b",
      "a?b",
      "a#b",
      "a%b",
      ".",
      "..",
      "",
      "a".repeat(41),
    ]) {
      expect(
        postFrontmatterSchema.safeParse(
          validFrontmatter({ categories: [name] }),
        ).success,
        name,
      ).toBe(false);
    }

    expect(
      postFrontmatterSchema.safeParse(
        validFrontmatter({ categories: ["一", "二", "三", "四", "五", "六"] }),
      ).success,
    ).toBe(false);
    expect(
      postFrontmatterSchema.safeParse(
        validFrontmatter({
          tags: Array.from({ length: 21 }, (_, index) => `标签${index}`),
        }),
      ).success,
    ).toBe(false);
  });

  it("分类与标签为 null 时视为空数组，非数组时报错", () => {
    const parsed = postFrontmatterSchema.parse(
      validFrontmatter({ categories: null, tags: null }),
    );
    expect(parsed.categories).toEqual([]);
    expect(parsed.tags).toEqual([]);
    expect(
      postFrontmatterSchema.safeParse(validFrontmatter({ tags: "博客" }))
        .success,
    ).toBe(false);
  });

  it("校验 cover 为站内路径或 https 地址", () => {
    for (const cover of [
      "/images/posts/a.webp",
      "https://cdn.example.com/a.png",
    ]) {
      expect(
        postFrontmatterSchema.safeParse(validFrontmatter({ cover })).success,
        cover,
      ).toBe(true);
    }
    for (const cover of [
      "http://cdn.example.com/a.png",
      "//cdn.example.com/a.png",
      "../a.png",
      "a.png",
      "\\\\a.png",
      "",
    ]) {
      expect(
        postFrontmatterSchema.safeParse(validFrontmatter({ cover })).success,
        cover,
      ).toBe(false);
    }
  });
});

describe("发布状态与摘要", () => {
  it("isPublished 只在 published=true 且 draft=false 时为真", () => {
    expect(isPublished({ published: true, draft: false })).toBe(true);
    expect(isPublished({ published: true, draft: true })).toBe(false);
    expect(isPublished({ published: false, draft: false })).toBe(false);
    expect(isPublished({ published: false, draft: true })).toBe(false);
  });

  it("toSummary 不包含发布状态、正文与源路径", () => {
    const post: Post = {
      ...postFrontmatterSchema.parse(validFrontmatter()),
      content: "正文",
      sourcePath: "content/posts/test-post.md",
    };
    const summary = toSummary(post);

    expect(summary.slug).toBe("test-post");
    expect(summary).not.toHaveProperty("published");
    expect(summary).not.toHaveProperty("draft");
    expect(summary).not.toHaveProperty("content");
    expect(summary).not.toHaveProperty("sourcePath");
  });
});

describe("分类/标签工具函数", () => {
  it("normalizeTaxonomyName 统一 NFC、首尾空白与连续空白", () => {
    expect(normalizeTaxonomyName("  Next.js  ")).toBe("Next.js");
    expect(normalizeTaxonomyName("开  发\t记录")).toBe("开 发 记录");
    expect(normalizeTaxonomyName("é")).toBe("é");
  });

  it("taxonomyHref 对中文与特殊字符做 URL 编码", () => {
    expect(taxonomyHref("categories", "开发记录")).toBe(
      `/categories/${encodeURIComponent("开发记录")}`,
    );
    expect(taxonomyHref("tags", "Next.js")).toBe("/tags/Next.js");
  });

  it("resolveTaxonomyParam 恰好解码一次并拒绝非法参数", () => {
    const encoded = encodeURIComponent("开发记录");
    expect(resolveTaxonomyParam(encoded)).toBe("开发记录");
    expect(resolveTaxonomyParam("Next.js")).toBe("Next.js");
    expect(resolveTaxonomyParam("%E5%BC%80%E5%8F%91")).toBe("开发");
    expect(resolveTaxonomyParam("%E0%A4%A")).toBeNull();
    expect(resolveTaxonomyParam("%2F")).toBeNull();
    expect(resolveTaxonomyParam("%252F")).toBeNull();
    expect(resolveTaxonomyParam("")).toBeNull();
    expect(resolveTaxonomyParam("..")).toBeNull();
    expect(resolveTaxonomyParam("a".repeat(41))).toBeNull();
  });

  it("isValidPostSlug 与 schema 规则一致", () => {
    expect(isValidPostSlug("hello-world")).toBe(true);
    expect(isValidPostSlug("Hello")).toBe(false);
    expect(isValidPostSlug("hello/world")).toBe(false);
  });
});

describe("展示工具", () => {
  it("formatPostDate 用中文展示日期", () => {
    expect(formatPostDate("2026-10-23")).toBe("2026 年 10 月 23 日");
    expect(formatPostDate("2026-01-05")).toBe("2026 年 1 月 5 日");
    expect(formatPostDate("invalid")).toBe("invalid");
  });

  it("formatContentIssue 输出路径、行号、错误码与字段", () => {
    const issue: ContentIssue = {
      code: "INVALID_FRONTMATTER",
      severity: "error",
      sourcePath: "content/posts/a.md",
      line: 3,
      field: "title",
      message: "标题不能为空",
    };
    expect(formatContentIssue(issue)).toBe(
      "content/posts/a.md:3 [INVALID_FRONTMATTER] title: 标题不能为空",
    );
  });

  it("ContentValidationError 汇总全部问题", () => {
    const issues: ContentIssue[] = [
      {
        code: "DUPLICATE_SLUG",
        severity: "error",
        sourcePath: "content/posts/a.md",
        message: "slug 重复",
      },
      {
        code: "DUPLICATE_SLUG",
        severity: "error",
        sourcePath: "content/posts/b.md",
        message: "slug 重复",
      },
    ];
    const error = new ContentValidationError(issues);

    expect(error.issues).toHaveLength(2);
    expect(error.message).toContain("2 个问题");
    expect(error.message).toContain("[DUPLICATE_SLUG]");
    expect(error.name).toBe("ContentValidationError");
  });
});

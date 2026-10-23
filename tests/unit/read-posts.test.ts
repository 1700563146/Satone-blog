import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildPublicIndex,
  collectPosts,
  findPublicPostBySlug,
  findTaxonomyTerm,
  loadAllPosts,
  loadPublicIndex,
  loadTaxonomyPage,
} from "@/lib/content/read-posts";
import { ContentValidationError } from "@/lib/content/schema";

const fixturesDir = path.join(process.cwd(), "tests", "fixtures", "content");
const validDir = path.join(fixturesDir, "valid");

describe("collectPosts", () => {
  it("读取全部文章（含草稿）且不产生问题", async () => {
    const { posts, issues } = await collectPosts({ postsDir: validDir });

    expect(issues).toEqual([]);
    expect(posts.map((post) => post.slug).sort()).toEqual([
      "alpha",
      "beta",
      "draft-sentinel",
      "same-day-a",
      "same-day-b",
      "unpublished",
    ]);
  });

  it("sourcePath 使用仓库相对路径与 / 分隔", async () => {
    const { posts } = await collectPosts({ postsDir: validDir });

    for (const post of posts) {
      expect(post.sourcePath).toContain("tests/fixtures/content/valid/");
      expect(post.sourcePath).not.toContain("\\");
    }
  });

  it("空目录返回空结果", async () => {
    const { posts, issues } = await collectPosts({
      postsDir: path.join(fixturesDir, "empty"),
    });
    expect(posts).toEqual([]);
    expect(issues).toEqual([]);
  });

  it("目录不存在时抛出错误", async () => {
    await expect(
      collectPosts({ postsDir: path.join(fixturesDir, "does-not-exist") }),
    ).rejects.toThrow();
  });

  it("检测重复 slug（草稿也参与检查）", async () => {
    const { posts, issues } = await collectPosts({
      postsDir: path.join(fixturesDir, "duplicate-slug"),
    });

    expect(posts).toHaveLength(2);
    const duplicates = issues.filter(
      (issue) => issue.code === "DUPLICATE_SLUG",
    );
    expect(duplicates).toHaveLength(2);
    expect(duplicates.every((issue) => issue.severity === "error")).toBe(true);
    expect(duplicates.every((issue) => issue.field === "slug")).toBe(true);
  });

  it("汇总多个 frontmatter 错误而不中断读取", async () => {
    const { posts, issues } = await collectPosts({
      postsDir: path.join(fixturesDir, "invalid-frontmatter"),
    });

    expect(posts).toEqual([]);
    const errors = issues.filter((issue) => issue.severity === "error");
    expect(errors).toHaveLength(5);
    expect(errors.every((issue) => issue.code === "INVALID_FRONTMATTER")).toBe(
      true,
    );
    expect(errors.some((issue) => issue.field === "title")).toBe(true);
    expect(errors.some((issue) => issue.field === "pubished")).toBe(true);
    expect(errors.filter((issue) => issue.field === "date")).toHaveLength(2);
    expect(errors.some((issue) => issue.field === "categories.0")).toBe(true);
  });

  it("YAML 语法错误会被收集", async () => {
    const { issues } = await collectPosts({
      postsDir: path.join(fixturesDir, "invalid-yaml"),
    });

    expect(issues).toHaveLength(1);
    expect(issues[0]?.code).toBe("INVALID_YAML");
  });

  it("子目录报错，非 .md 文件产生警告", async () => {
    const { posts, issues } = await collectPosts({
      postsDir: path.join(fixturesDir, "unsupported"),
    });

    expect(posts).toEqual([]);
    expect(
      issues.some(
        (issue) =>
          issue.code === "UNSUPPORTED_FILE" && issue.severity === "error",
      ),
    ).toBe(true);
    expect(
      issues.some(
        (issue) =>
          issue.code === "UNEXPECTED_FILE" && issue.severity === "warning",
      ),
    ).toBe(true);
  });
});

describe("loadAllPosts", () => {
  it("按日期倒序、同日按 slug 升序排序", async () => {
    const posts = await loadAllPosts({ postsDir: validDir });
    expect(posts.map((post) => post.slug)).toEqual([
      "draft-sentinel",
      "beta",
      "same-day-a",
      "same-day-b",
      "alpha",
      "unpublished",
    ]);
  });

  it("草稿与未发布文章无法按 slug 读取", async () => {
    const posts = await loadAllPosts({ postsDir: validDir });

    expect(findPublicPostBySlug(posts, "alpha")?.slug).toBe("alpha");
    expect(findPublicPostBySlug(posts, "draft-sentinel")).toBeNull();
    expect(findPublicPostBySlug(posts, "unpublished")).toBeNull();
    expect(findPublicPostBySlug(posts, "does-not-exist")).toBeNull();
  });

  it("存在错误时抛出 ContentValidationError", async () => {
    await expect(
      loadAllPosts({ postsDir: path.join(fixturesDir, "duplicate-slug") }),
    ).rejects.toBeInstanceOf(ContentValidationError);
    await expect(
      loadAllPosts({ postsDir: path.join(fixturesDir, "unsupported") }),
    ).rejects.toBeInstanceOf(ContentValidationError);
  });
});

describe("buildPublicIndex", () => {
  it("过滤草稿与未发布文章，并统计分类/标签", async () => {
    const posts = await loadAllPosts({ postsDir: validDir });
    const index = buildPublicIndex(posts);

    expect(index.posts.map((post) => post.slug)).toEqual([
      "beta",
      "same-day-a",
      "same-day-b",
      "alpha",
    ]);

    const serialized = JSON.stringify(index);
    expect(serialized).not.toContain("DRAFT_SENTINEL_2026");
    expect(serialized).not.toContain("UNPUBLISHED_SENTINEL_2026");
    expect(serialized).not.toContain("草稿箱");
    expect(serialized).not.toContain("未发布分类");

    expect(index.categories).toEqual([
      {
        kind: "categories",
        name: "开发记录",
        slug: "开发记录",
        href: `/categories/${encodeURIComponent("开发记录")}`,
        count: 2,
      },
      {
        kind: "categories",
        name: "生活",
        slug: "生活",
        href: `/categories/${encodeURIComponent("生活")}`,
        count: 1,
      },
    ]);

    expect(index.tags.map((tag) => [tag.name, tag.count])).toEqual([
      ["博客", 3],
      ["Next.js", 1],
    ]);
  });

  it("摘要不包含发布状态、正文与源路径", async () => {
    const index = await loadPublicIndex({ postsDir: validDir });
    const summary = index.posts[0];

    expect(summary).toBeDefined();
    expect(JSON.stringify(summary)).not.toContain("published");
    expect(JSON.stringify(summary)).not.toContain("sourcePath");
    expect(JSON.stringify(summary)).not.toContain("这是 Beta 文章的正文");
  });
});

describe("分类/标签查询", () => {
  it("按路由参数查找分类并返回该分类下的文章", async () => {
    const page = await loadTaxonomyPage(
      "categories",
      encodeURIComponent("开发记录"),
      {
        postsDir: validDir,
      },
    );

    expect(page).not.toBeNull();
    expect(page?.name).toBe("开发记录");
    expect(page?.posts.map((post) => post.slug)).toEqual(["beta", "alpha"]);
  });

  it("按标签查找", async () => {
    const page = await loadTaxonomyPage("tags", "Next.js", {
      postsDir: validDir,
    });
    expect(page?.posts.map((post) => post.slug)).toEqual(["alpha"]);

    const blogPage = await loadTaxonomyPage(
      "tags",
      encodeURIComponent("博客"),
      {
        postsDir: validDir,
      },
    );
    expect(blogPage?.posts.map((post) => post.slug)).toEqual([
      "beta",
      "same-day-a",
      "alpha",
    ]);
  });

  it("未知或非法参数返回 null", async () => {
    await expect(
      loadTaxonomyPage("categories", "不存在", { postsDir: validDir }),
    ).resolves.toBeNull();
    await expect(
      loadTaxonomyPage("categories", "%E0%A4%A", { postsDir: validDir }),
    ).resolves.toBeNull();
  });

  it("findTaxonomyTerm 对 slug 精确匹配", async () => {
    const index = await loadPublicIndex({ postsDir: validDir });
    expect(
      findTaxonomyTerm(index.tags, encodeURIComponent("博客"))?.count,
    ).toBe(3);
    expect(findTaxonomyTerm(index.tags, "不存在")).toBeNull();
  });
});

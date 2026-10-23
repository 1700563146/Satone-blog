import path from "node:path";
import { describe, expect, it } from "vitest";
import { readPage } from "@/lib/content/read-pages";
import { ContentValidationError } from "@/lib/content/schema";

const pagesDir = path.join(process.cwd(), "tests", "fixtures", "pages");

describe("readPage", () => {
  it("读取带 frontmatter 的页面并保留正文", async () => {
    const page = await readPage("sample", { pagesDir });

    expect(page).not.toBeNull();
    expect(page?.frontmatter).toEqual({
      title: "关于",
      description: "一个用于测试的独立页面。",
      updatedAt: "2026-10-23",
    });
    expect(page?.content).toContain("这是正文的第一段。");
    expect(page?.content).not.toContain("---");
    expect(page?.sourcePath).toContain("tests/fixtures/pages/sample.md");
    expect(page?.sourcePath).not.toContain("\\");
  });

  it("允许整个 frontmatter 省略", async () => {
    const page = await readPage("plain", { pagesDir });

    expect(page).not.toBeNull();
    expect(page?.frontmatter.title).toBeUndefined();
    expect(page?.frontmatter.description).toBeUndefined();
    expect(page?.frontmatter.updatedAt).toBeUndefined();
    expect(page?.content).toContain("没有 frontmatter 的页面也是合法的");
  });

  it("文件不存在返回 null（由页面渲染 404）", async () => {
    await expect(readPage("does-not-exist", { pagesDir })).resolves.toBeNull();
  });

  it("页面名非法时拒绝读取，避免路径穿越", async () => {
    await expect(readPage("../secrets", { pagesDir })).rejects.toBeInstanceOf(
      ContentValidationError,
    );
    await expect(readPage("About", { pagesDir })).rejects.toBeInstanceOf(
      ContentValidationError,
    );
  });

  it("未知字段导致校验失败", async () => {
    const error = await readPage("unknown-key", { pagesDir }).catch(
      (cause: unknown) => cause,
    );

    expect(error).toBeInstanceOf(ContentValidationError);
    const issues = (error as ContentValidationError).issues;
    expect(issues).toHaveLength(1);
    expect(issues[0]?.code).toBe("INVALID_FRONTMATTER");
    expect(issues[0]?.field).toBe("publish");
  });

  it("不存在的日期导致校验失败", async () => {
    const error = await readPage("bad-date", { pagesDir }).catch(
      (cause: unknown) => cause,
    );

    expect(error).toBeInstanceOf(ContentValidationError);
    const issues = (error as ContentValidationError).issues;
    expect(issues[0]?.field).toBe("updatedAt");
    expect(issues[0]?.message).toContain("2026-02-30");
  });
});

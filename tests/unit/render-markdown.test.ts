import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  analyzeMarkdown,
  isSafeUrl,
  renderMarkdown,
} from "@/lib/content/render-markdown";
import { ContentValidationError } from "@/lib/content/schema";

const casesDir = path.join(
  process.cwd(),
  "tests",
  "fixtures",
  "content",
  "markdown-cases",
);

async function readCase(name: string): Promise<string> {
  return readFile(path.join(casesDir, name), "utf8");
}

describe("renderMarkdown", () => {
  it("提取 h2/h3 目录，忽略 h1/h4 与脚注标题", async () => {
    const { toc } = await renderMarkdown(await readCase("gfm.md"), {
      sourcePath: "markdown-cases/gfm.md",
    });

    expect(toc).toEqual([
      { id: "第一节", text: "第一节", depth: 2 },
      { id: "第一节的子节", text: "第一节的子节", depth: 3 },
    ]);
  });

  it("支持 GFM 表格、任务列表、删除线与脚注", async () => {
    const { html } = await renderMarkdown(await readCase("gfm.md"));

    expect(html).toContain("<table>");
    expect(html).toContain("<del>删除线</del>");
    expect(html).toContain('type="checkbox"');
    expect(html).toContain("checked");
    expect(html).toContain('id="footnote-label"');
    expect(html).toContain("脚注内容");
  });

  it("保留代码块语言标识", async () => {
    const { html } = await renderMarkdown("```ts\nconst answer = 42;\n```\n");
    expect(html).toContain('class="language-ts"');
    expect(html).toContain("const answer = 42;");
  });

  it("目录文本包含行内标记的纯文本", async () => {
    const { toc } = await renderMarkdown("## 带 **粗体** 与 `代码` 的标题\n");
    expect(toc).toEqual([
      {
        id: "带-粗体-与-代码-的标题",
        text: "带 粗体 与 代码 的标题",
        depth: 2,
      },
    ]);
  });

  it("丢弃原始 HTML（不渲染、不执行）", async () => {
    const { html } = await renderMarkdown(await readCase("raw-html.md"));
    expect(html).not.toContain("alert(1)");
    expect(html).not.toContain("<div");
    expect(html).toContain("普通段落。");
  });

  it("危险链接与缺失 alt 会导致渲染失败", async () => {
    await expect(
      renderMarkdown(await readCase("unsafe-url.md")),
    ).rejects.toBeInstanceOf(ContentValidationError);
    await expect(
      renderMarkdown(await readCase("missing-alt.md")),
    ).rejects.toBeInstanceOf(ContentValidationError);
    await expect(
      renderMarkdown("![x](javascript:alert(1))"),
    ).rejects.toBeInstanceOf(ContentValidationError);
  });

  it("外部链接添加安全属性，站内链接保持不变", async () => {
    const { html } = await renderMarkdown(
      [
        "[外部](https://example.com/a)",
        "[同站](https://blog.example.com/about)",
        "[站内](/about)",
        "[邮件](mailto:a@example.com)",
      ].join("\n\n"),
      { siteUrl: "https://blog.example.com" },
    );

    expect(html).toContain(
      '<a href="https://example.com/a" target="_blank" rel="noopener noreferrer">外部</a>',
    );
    expect(html).toContain('<a href="https://blog.example.com/about">同站</a>');
    expect(html).toContain('<a href="/about">站内</a>');
    expect(html).toContain('<a href="mailto:a@example.com">邮件</a>');
  });

  it("图片保留 alt 并默认懒加载", async () => {
    const { html } = await renderMarkdown(
      "![页面截图](/images/screenshot.png)\n",
    );

    expect(html).toContain('alt="页面截图"');
    expect(html).toContain('loading="lazy"');
    expect(html).toContain('decoding="async"');
  });
});

describe("analyzeMarkdown", () => {
  it("原始 HTML 产生警告", async () => {
    const issues = analyzeMarkdown(
      await readCase("raw-html.md"),
      "markdown-cases/raw-html.md",
    );

    expect(issues).toHaveLength(1);
    expect(issues[0]?.code).toBe("MARKDOWN_RAW_HTML");
    expect(issues[0]?.severity).toBe("warning");
    expect(issues[0]?.line).toBe(3);
  });

  it("危险链接产生错误", async () => {
    const issues = analyzeMarkdown(
      await readCase("unsafe-url.md"),
      "markdown-cases/unsafe-url.md",
    );

    expect(issues.some((issue) => issue.code === "MARKDOWN_UNSAFE_URL")).toBe(
      true,
    );
    expect(issues.every((issue) => issue.severity === "error")).toBe(true);
  });

  it("图片缺少 alt 产生错误", async () => {
    const issues = analyzeMarkdown(
      await readCase("missing-alt.md"),
      "markdown-cases/missing-alt.md",
    );

    expect(issues.some((issue) => issue.code === "MARKDOWN_MISSING_ALT")).toBe(
      true,
    );
  });

  it("合法 Markdown 不产生问题", () => {
    expect(
      analyzeMarkdown("# 标题\n\n[站内](/about)\n\n![图](/images/a.png)\n"),
    ).toEqual([]);
  });
});

describe("isSafeUrl", () => {
  it("允许安全协议、站内路径与相对路径", () => {
    for (const url of [
      "https://example.com/a",
      "http://example.com",
      "mailto:a@example.com",
      "tel:+8610000",
      "/images/a.png",
      "#section",
      "./a.png",
      "../a.png",
      "images/a.png",
      "?q=1",
    ]) {
      expect(isSafeUrl(url), url).toBe(true);
    }
  });

  it("拒绝危险协议与混淆写法", () => {
    for (const url of [
      "javascript:alert(1)",
      "JaVaScRiPt:alert(1)",
      " javascript:alert(1)",
      "java\nscript:alert(1)",
      "vbscript:msgbox(1)",
      "data:text/html,<script>",
      "file:///etc/passwd",
      "//evil.example.com",
      "/\\evil.example.com",
      "\\\\evil.example.com",
      "",
    ]) {
      expect(isSafeUrl(url), url).toBe(false);
    }
  });
});

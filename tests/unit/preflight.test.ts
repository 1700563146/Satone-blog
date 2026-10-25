import { describe, expect, it } from "vitest";

import {
  hasBlockingIssue,
  isSafeUrl,
  preflightMarkdown,
} from "@/lib/publish/preflight";

describe("isSafeUrl", () => {
  it("允许 http/https/mailto/tel、站内路径、锚点与相对路径", () => {
    for (const url of [
      "https://example.com/a",
      "http://example.com",
      "mailto:a@b.c",
      "tel:+123",
      "/images/a.png",
      "#section",
      "relative/path.png",
    ]) {
      expect(isSafeUrl(url), url).toBe(true);
    }
  });

  it("拒绝危险协议、协议相对地址与反斜杠路径", () => {
    for (const url of [
      "javascript:alert(1)",
      "data:text/html,x",
      "file:///c:/x",
      "//host/x",
      "a\\b.png",
      "  ",
    ]) {
      expect(isSafeUrl(url), url).toBe(false);
    }
  });
});

describe("preflightMarkdown", () => {
  it("图片缺少 alt 报错", () => {
    const { issues } = preflightMarkdown("# 标题\n\n![](/images/a.png)\n");

    expect(issues).toHaveLength(1);
    expect(issues[0]?.severity).toBe("error");
    expect(issues[0]?.line).toBe(3);
    expect(issues[0]?.message).toContain("alt");
  });

  it("危险链接与图片地址报错", () => {
    const { issues } = preflightMarkdown(
      [
        "# 标题",
        "",
        "[点我](javascript:alert(1))",
        "",
        "![截图](data:image/png;base64,xx)",
      ].join("\n"),
    );

    expect(issues.map((issue) => issue.severity)).toEqual(["error", "error"]);
    expect(issues.map((issue) => issue.message).join()).toContain("不安全");
  });

  it("围栏代码块里的链接与尖括号不检查", () => {
    const { issues } = preflightMarkdown(
      [
        "```md",
        "[x](javascript:alert(1))",
        "<div>hi</div>",
        "```",
        "",
        "正文",
      ].join("\n"),
    );

    expect(issues).toEqual([]);
  });

  it("行内代码里的尖括号不报警", () => {
    const { issues } = preflightMarkdown("用 `<div>` 表示块级元素。\n");

    expect(issues).toEqual([]);
  });

  it("真正的原始 HTML 给 warning，不阻塞提交", () => {
    const { issues } = preflightMarkdown('<div class="x">hi</div>\n');

    expect(issues).toHaveLength(1);
    expect(issues[0]?.severity).toBe("warning");
    expect(hasBlockingIssue(issues)).toBe(false);
  });

  it("统计字数、标题、图片、链接与代码块", () => {
    const source = [
      "# 一",
      "",
      "段落 [链接](https://a.com) ![图](/a.png)",
      "",
      "```ts",
      "const a = 1;",
      "```",
    ].join("\n");
    const { stats } = preflightMarkdown(source);

    expect(stats.headings).toBe(1);
    expect(stats.images).toBe(1);
    expect(stats.links).toBe(1);
    expect(stats.codeBlocks).toBe(1);
    expect(stats.characters).toBeGreaterThan(0);
  });

  it("安全文档没有 issue", () => {
    const { issues } = preflightMarkdown(
      "# 标题\n\n正文 [外链](https://example.com) ![图](/a.png)\n",
    );

    expect(issues).toEqual([]);
    expect(hasBlockingIssue(issues)).toBe(false);
  });
});

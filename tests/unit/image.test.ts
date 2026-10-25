import { describe, expect, it } from "vitest";

import {
  appendSnippet,
  buildImagePlan,
  formatBytes,
  imageExtension,
  isSupportedImageName,
  sanitizeImageName,
  toBase64Bytes,
  IMAGE_DIR,
  MAX_IMAGE_BYTES,
} from "@/lib/publish/image";

describe("imageExtension / isSupportedImageName", () => {
  it("识别常见图片扩展名", () => {
    expect(imageExtension("a.PNG")).toBe("png");
    expect(isSupportedImageName("shot.webp")).toBe(true);
    expect(isSupportedImageName("icon.svg")).toBe(true);
  });

  it("拒绝非图片与无扩展名", () => {
    expect(isSupportedImageName("note.md")).toBe(false);
    expect(isSupportedImageName("photo")).toBe(false);
    expect(isSupportedImageName("evil.exe")).toBe(false);
  });
});

describe("sanitizeImageName", () => {
  it("小写、空白与符号折叠成连字符", () => {
    expect(sanitizeImageName("My Photo 01.PNG")).toBe("my-photo-01.png");
  });

  it("中文文件名只剩数字时保留数字", () => {
    expect(sanitizeImageName("截图 2026.png")).toBe("2026.png");
  });

  it("纯中文文件名退化成 image.<ext>", () => {
    expect(sanitizeImageName("封面图.png")).toBe("image.png");
  });

  it("未知扩展名被丢弃", () => {
    expect(sanitizeImageName("a.bmp")).toBe("a");
  });
});

describe("buildImagePlan", () => {
  it("生成带 slug 前缀的仓库路径、URL 与 Markdown 片段", () => {
    const result = buildImagePlan("hello-world", {
      name: "Cover.PNG",
      size: 1024,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.plan.repoFileName).toBe("hello-world-cover.png");
    expect(result.plan.repoPath).toBe(`${IMAGE_DIR}/hello-world-cover.png`);
    expect(result.plan.url).toBe("/images/posts/hello-world-cover.png");
    expect(result.plan.snippet).toBe(
      "![cover](/images/posts/hello-world-cover.png)",
    );
  });

  it("文件名已经带 slug 前缀时不重复添加", () => {
    const result = buildImagePlan("hello-world", {
      name: "hello-world-cover.png",
      size: 10,
    });

    expect(result.ok && result.plan.repoFileName).toBe("hello-world-cover.png");
  });

  it("超限体积给出可读错误", () => {
    const result = buildImagePlan("post", {
      name: "big.png",
      size: MAX_IMAGE_BYTES + 1,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("超过");
    expect(result.error).toContain("big.png");
  });

  it("不支持的格式给出可读错误", () => {
    const result = buildImagePlan("post", { name: "doc.pdf", size: 10 });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("不支持");
  });
});

describe("toBase64Bytes", () => {
  it("二进制内容可逆（含非 UTF-8 字节）", () => {
    const bytes = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0xff, 0x00,
    ]);

    expect(atob(toBase64Bytes(bytes))).toBe(String.fromCharCode(...bytes));
  });
});

describe("formatBytes", () => {
  it("按量级选择单位", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2 KB");
    expect(formatBytes(3 * 1024 * 1024)).toBe("3.0 MB");
  });
});

describe("appendSnippet", () => {
  it("空正文只放片段", () => {
    expect(appendSnippet("", "![a](/a.png)")).toBe("![a](/a.png)\n");
  });

  it("已有正文时用空行分隔，并去掉结尾多余空白", () => {
    expect(appendSnippet("正文\n\n", "![a](/a.png)")).toBe(
      "正文\n\n![a](/a.png)\n",
    );
  });
});

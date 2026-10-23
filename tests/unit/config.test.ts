import { describe, expect, it } from "vitest";

import { resolveSiteUrl, siteConfig } from "@/lib/config";

describe("siteConfig", () => {
  it("提供站点名称与语言", () => {
    expect(siteConfig.name).toBe("Sato Blog");
    expect(siteConfig.locale).toBe("zh-CN");
  });

  it("提供合法的站点地址", () => {
    expect(siteConfig.url).toMatch(/^https?:\/\//);
  });

  it("地址不带结尾斜杠", () => {
    expect(siteConfig.url.endsWith("/")).toBe(false);
  });
});

describe("resolveSiteUrl", () => {
  it("优先使用显式 SITE_URL，并去掉结尾斜杠", () => {
    expect(
      resolveSiteUrl({
        SITE_URL: "https://satone-blog.vercel.app/",
        VERCEL_PROJECT_PRODUCTION_URL: "ignored.vercel.app",
      }),
    ).toBe("https://satone-blog.vercel.app");
  });

  it("SITE_URL 为空或全空白时视为未设置", () => {
    expect(
      resolveSiteUrl({
        SITE_URL: "   ",
        VERCEL_PROJECT_PRODUCTION_URL: "satone-blog.vercel.app",
      }),
    ).toBe("https://satone-blog.vercel.app");
  });

  it("没有 SITE_URL 时回退到 Vercel 的生产域名", () => {
    expect(
      resolveSiteUrl({
        VERCEL_PROJECT_PRODUCTION_URL: "satone-blog.vercel.app",
        VERCEL_URL: "satone-blog-abc123.vercel.app",
      }),
    ).toBe("https://satone-blog.vercel.app");
  });

  it("只有当前部署域名时使用它（Preview 部署）", () => {
    expect(
      resolveSiteUrl({ VERCEL_URL: "satone-blog-abc123.vercel.app" }),
    ).toBe("https://satone-blog-abc123.vercel.app");
  });

  it("两者都没有时回退到本地地址", () => {
    expect(resolveSiteUrl({})).toBe("http://localhost:3000");
  });
});

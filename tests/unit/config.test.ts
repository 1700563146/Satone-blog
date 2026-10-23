import { describe, expect, it } from "vitest";

import { siteConfig } from "@/lib/config";

describe("siteConfig", () => {
  it("提供站点名称与语言", () => {
    expect(siteConfig.name).toBe("Sato Blog");
    expect(siteConfig.locale).toBe("zh-CN");
  });

  it("提供合法的站点地址", () => {
    expect(siteConfig.url).toMatch(/^https?:\/\//);
  });
});

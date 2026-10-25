import { expect, test } from "@playwright/test";

/** 仓库里已发布的示例文章与草稿（content/posts/）。 */
const PUBLISHED = { slug: "hello-world", title: "你好，世界" };
const DRAFT_SLUG = "draft-notes";
const CATEGORY = "开发记录";

test.describe("首页与文章", () => {
  test("首页展示站点信息与已发布文章", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Sato Blog",
    );
    await expect(
      page.getByRole("link", { name: PUBLISHED.title }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "浏览文章" })).toBeVisible();
  });

  test("从首页点进文章，详情页有正文与目录", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: PUBLISHED.title }).click();

    await expect(page).toHaveURL(new RegExp(`/posts/${PUBLISHED.slug}$`));
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      PUBLISHED.title,
    );
    await expect(page.locator(".prose")).toContainText("为什么写博客");

    // 目录锚点与正文标题对应
    const toc = page.getByRole("navigation", { name: "目录" });
    await expect(toc).toBeVisible();
    await expect(toc.getByRole("link", { name: "技术选型" })).toHaveAttribute(
      "href",
      "#技术选型",
    );
    await expect(page.locator("h2#技术选型")).toBeVisible();
  });

  test("文章列表与归档页可访问", async ({ page }) => {
    await page.goto("/posts");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("文章");
    await expect(
      page.getByRole("link", { name: PUBLISHED.title }),
    ).toBeVisible();

    await page.goto(`/categories/${encodeURIComponent(CATEGORY)}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      `分类：${CATEGORY}`,
    );

    await page.goto("/about");
    await expect(page.locator(".prose")).toContainText("关于这个博客");
  });
});

test.describe("404 与私有内容", () => {
  test("草稿文章返回 404 且不泄漏正文", async ({ page }) => {
    const response = await page.goto(`/posts/${DRAFT_SLUG}`);

    expect(response?.status()).toBe(404);
    await expect(page.getByText("页面不存在")).toBeVisible();
    await expect(page.locator("body")).not.toContainText("DRAFT_SENTINEL_2026");
  });

  test("不存在的标签返回 404", async ({ page }) => {
    const response = await page.goto("/tags/never-existed-tag");

    expect(response?.status()).toBe(404);
    await expect(page.getByText("页面不存在")).toBeVisible();
  });
});

test.describe("订阅与搜索引擎文件", () => {
  test("RSS 是合法的 rss 2.0 且只包含已发布文章", async ({ request }) => {
    const response = await request.get("/feed.xml");

    expect(response.status()).toBe(200);
    // 纯静态托管按扩展名给类型（application/xml），本地预览服务器给 rss+xml，两者都可接受
    expect(response.headers()["content-type"]).toMatch(/xml/);
    const body = await response.text();
    expect(body).toContain('<rss version="2.0">');
    expect(body).toContain(PUBLISHED.title);
    expect(body).not.toContain("DRAFT_SENTINEL_2026");
  });

  test("sitemap 只列出公开地址", async ({ request }) => {
    const response = await request.get("/sitemap.xml");
    expect(response.status()).toBe(200);

    const body = await response.text();
    expect(body).toContain(`/posts/${PUBLISHED.slug}`);
    expect(body).not.toContain(DRAFT_SLUG);
  });

  test("robots.txt 指向 sitemap", async ({ request }) => {
    const response = await request.get("/robots.txt");
    expect(response.status()).toBe(200);
    expect(await response.text()).toContain("Sitemap:");
  });
});

test.describe("上传发布页", () => {
  test("页面不索引，且拖入 md 后自动填好元信息（不提交）", async ({ page }) => {
    await page.goto("/admin/publish");

    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      /noindex/,
    );
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "发布文章",
    );

    const content = [
      "# 端到端标题",
      "",
      "第一段摘要。",
      "",
      "## 小节",
      "",
      "正文内容。",
    ].join("\n");

    await page.locator('input[type="file"]').setInputFiles({
      name: "e2e-post.md",
      mimeType: "text/markdown",
      buffer: Buffer.from(content, "utf8"),
    });

    await expect(page.getByLabel("标题")).toHaveValue("端到端标题");
    await expect(page.getByLabel(/slug/)).toHaveValue("e2e-post");
    await expect(page.getByLabel(/摘要/)).toHaveValue("第一段摘要。");

    // 没有 token 时不允许提交
    await expect(
      page.getByRole("button", { name: "提交到仓库" }),
    ).toBeDisabled();
    await expect(page.getByText("状态：未设置")).toBeVisible();
  });
});

test.describe("站内搜索", () => {
  test("导航里能进入搜索页，输入关键词命中文章并打开", async ({
    page,
    isMobile,
  }) => {
    await page.goto("/");

    // 桌面端导航横排可见；移动端要先展开折叠菜单
    if (isMobile) {
      await page.getByRole("button", { name: "打开导航菜单" }).click();
      await page
        .locator('ul[aria-label="折叠导航条目"]')
        .getByRole("link", { name: "搜索" })
        .click();
    } else {
      await page
        .getByRole("navigation", { name: "主导航" })
        .getByRole("link", { name: "搜索" })
        .click();
    }

    await expect(page).toHaveURL(/\/search$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("搜索");

    const input = page.getByRole("searchbox", { name: "搜索文章" });
    await input.fill("世界");

    const result = page.getByRole("link", {
      name: `${PUBLISHED.title}，2026 年 10 月 23 日`,
    });
    await expect(result).toBeVisible();
    await result.click();

    await expect(page).toHaveURL(new RegExp(`/posts/${PUBLISHED.slug}$`));
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      PUBLISHED.title,
    );
  });

  test("没有命中时给出空结果提示，Escape 可清空", async ({ page }) => {
    await page.goto("/search");

    const input = page.getByRole("searchbox", { name: "搜索文章" });
    await input.fill("不存在的关键词");

    await expect(
      page.getByText("没有匹配「不存在的关键词」的文章"),
    ).toBeVisible();

    await input.press("Escape");
    await expect(input).toHaveValue("");
    await expect(page.getByText(/输入关键词开始搜索/)).toBeVisible();
  });

  test("Ctrl+K 聚焦搜索框", async ({ page }) => {
    await page.goto("/search");

    const input = page.getByRole("searchbox", { name: "搜索文章" });
    await expect(input).not.toBeFocused();

    await page.keyboard.press("Control+k");
    await expect(input).toBeFocused();
  });
});

test.describe("移动端导航", () => {
  test.skip(({ isMobile }) => !isMobile, "折叠菜单只在移动端视口验证");

  test("折叠菜单可展开、可跳转、Escape 可关闭", async ({ page }) => {
    await page.goto("/");

    const toggle = page.getByRole("button", { name: "打开导航菜单" });
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");

    await toggle.click();
    await expect(
      page.getByRole("button", { name: "关闭导航菜单" }),
    ).toHaveAttribute("aria-expanded", "true");

    await page.getByRole("button", { name: "关闭导航菜单" }).click();
    await expect(
      page.getByRole("button", { name: "打开导航菜单" }),
    ).toHaveAttribute("aria-expanded", "false");

    // 展开后点击条目完成导航
    await page.getByRole("button", { name: "打开导航菜单" }).click();
    const panel = page.locator('ul[aria-label="折叠导航条目"]');
    await expect(panel).toBeVisible();
    await panel.getByRole("link", { name: "关于" }).click();

    await expect(page).toHaveURL(/\/about$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("关于");
  });
});

import { describe, expect, it } from "vitest";
import { siteConfig } from "@/lib/config";
import {
  formatPostDate,
  postHref,
  taxonomyHref,
  type PostDetail,
  type PostSummary,
  type TaxonomyPage,
} from "@/lib/content/schema";
import {
  absoluteUrl,
  buildPageMetadata,
  buildPostMetadata,
  buildTaxonomyMetadata,
} from "@/lib/seo/metadata";
import { buildRssFeed, escapeXml, toRfc822Date } from "@/lib/seo/rss";
import { PLACEHOLDER_STATIC_SLUG, toStaticSlugParams } from "@/lib/routing";

const summary: PostSummary = {
  title: "你好 & 世界 <测试>",
  slug: "hello-world",
  description: '摘要里的 "引号" 与 & 符号',
  date: "2026-10-23",
  categories: ["开发记录"],
  tags: ["博客"],
  featured: true,
};

const detail: PostDetail = {
  ...summary,
  html: "<p>正文</p>",
  toc: [{ id: "section", text: "小节", depth: 2 }],
};

describe("escapeXml", () => {
  it("转义 XML 敏感字符", () => {
    expect(escapeXml(`<a href="x">Tom & Jerry's</a>`)).toBe(
      "&lt;a href=&quot;x&quot;&gt;Tom &amp; Jerry&apos;s&lt;/a&gt;",
    );
  });
});

describe("toRfc822Date", () => {
  it("把日历日期转成 RFC 822 格式", () => {
    expect(toRfc822Date("2026-10-23")).toBe("Fri, 23 Oct 2026 00:00:00 +0800");
  });

  it("非法输入返回空字符串", () => {
    expect(toRfc822Date("2026/10/23")).toBe("");
    expect(toRfc822Date("")).toBe("");
  });
});

describe("buildRssFeed", () => {
  const xml = buildRssFeed([
    summary,
    { ...summary, slug: "second", title: "第二篇" },
  ]);

  it("生成合法的 RSS 2.0 骨架", () => {
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain('<rss version="2.0">');
    expect(xml).toContain(`<title>${escapeXml(siteConfig.name)}</title>`);
    expect(xml).toContain(`<language>${siteConfig.locale}</language>`);
    expect(xml).toContain("</rss>");
  });

  it("标题与摘要会转义，链接使用绝对地址", () => {
    expect(xml).toContain("<title>你好 &amp; 世界 &lt;测试&gt;</title>");
    expect(xml).not.toContain("<测试>");
    expect(xml).toContain(`<link>${siteConfig.url}/posts/hello-world</link>`);
  });

  it("每条文章包含 guid、pubDate 与分类标签", () => {
    expect(xml.match(/<item>/g)).toHaveLength(2);
    expect(xml).toContain('<guid isPermaLink="true">');
    expect(xml).toContain("<pubDate>Fri, 23 Oct 2026 00:00:00 +0800</pubDate>");
    expect(xml).toContain("<category>开发记录</category>");
    expect(xml).toContain("<category>博客</category>");
  });

  it("没有文章时仍然生成合法的空频道", () => {
    const empty = buildRssFeed([]);
    expect(empty).toContain("<channel>");
    expect(empty).not.toContain("<item>");
    expect(empty).not.toContain("<lastBuildDate>");
  });
});

describe("absoluteUrl", () => {
  it("拼接站内绝对地址", () => {
    expect(absoluteUrl("/")).toBe(siteConfig.url);
    expect(absoluteUrl("/posts")).toBe(`${siteConfig.url}/posts`);
    expect(absoluteUrl("posts")).toBe(`${siteConfig.url}/posts`);
  });
});

describe("元数据构建", () => {
  it("静态页面包含 canonical 与 Open Graph", () => {
    const metadata = buildPageMetadata({
      title: "文章",
      description: "全部文章",
      path: "/posts",
    });

    expect(metadata.title).toBe("文章");
    expect(metadata.alternates?.canonical).toBe(`${siteConfig.url}/posts`);
    expect(metadata.openGraph).toMatchObject({
      type: "website",
      locale: "zh_CN",
      url: `${siteConfig.url}/posts`,
    });
  });

  it("首页省略标题，沿用父级默认值", () => {
    const metadata = buildPageMetadata({ path: "/" });
    expect(metadata.title).toBeUndefined();
    expect(metadata.alternates?.canonical).toBe(siteConfig.url);
  });

  it("文章页使用 article 类型并带上发布时间与标签", () => {
    const metadata = buildPostMetadata(detail);

    expect(metadata.title).toBe(summary.title);
    expect(metadata.alternates?.canonical).toBe(
      `${siteConfig.url}${postHref(summary.slug)}`,
    );
    expect(metadata.openGraph).toMatchObject({
      type: "article",
      publishedTime: "2026-10-23",
      modifiedTime: "2026-10-23",
      tags: ["博客"],
    });
  });

  it("归档页标题使用中文分类/标签前缀并编码 URL", () => {
    const page: TaxonomyPage = {
      kind: "categories",
      name: "开发记录",
      slug: "开发记录",
      href: taxonomyHref("categories", "开发记录"),
      count: 2,
      posts: [summary],
    };
    const metadata = buildTaxonomyMetadata(page);

    expect(metadata.title).toBe("分类：开发记录");
    expect(metadata.alternates?.canonical).toBe(
      `${siteConfig.url}/categories/${encodeURIComponent("开发记录")}`,
    );
  });
});

describe("generateStaticParams 辅助", () => {
  it("有内容时逐个映射 slug", () => {
    expect(toStaticSlugParams(["a", "b"])).toEqual([
      { slug: "a" },
      { slug: "b" },
    ]);
  });

  it("没有内容时返回占位参数，避免构建失败", () => {
    expect(toStaticSlugParams([])).toEqual([{ slug: PLACEHOLDER_STATIC_SLUG }]);
  });
});

describe("日期展示", () => {
  it("中文日期不受时区影响", () => {
    expect(formatPostDate("2026-10-23")).toBe("2026 年 10 月 23 日");
  });
});

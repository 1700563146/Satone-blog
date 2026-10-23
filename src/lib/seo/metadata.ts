import type { Metadata } from "next";

import { siteConfig } from "../config";
import {
  postHref,
  taxonomyHref,
  type PostDetail,
  type TaxonomyPage,
} from "../content/schema";

/** Open Graph 的 locale 使用下划线写法（zh_CN）。 */
const OG_LOCALE = siteConfig.locale.replace("-", "_");

/** 拼接站内绝对地址，用于 canonical、Open Graph 与 sitemap。 */
export function absoluteUrl(pathname: string): string {
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return path === "/" ? siteConfig.url : `${siteConfig.url}${path}`;
}

export interface PageMetadataInput {
  /** 省略时沿用父级默认标题（首页）。 */
  title?: string;
  description?: string;
  /** 站内路径，如 /posts。 */
  path: string;
}

/** 静态页面的元数据：标题、描述、canonical 与基础 Open Graph。 */
export function buildPageMetadata({
  title,
  description,
  path,
}: PageMetadataInput): Metadata {
  const url = absoluteUrl(path);
  return {
    ...(title === undefined ? {} : { title }),
    ...(description === undefined ? {} : { description }),
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      siteName: siteConfig.name,
      locale: OG_LOCALE,
      url,
      ...(title === undefined ? {} : { title }),
      ...(description === undefined ? {} : { description }),
    },
  };
}

/** 文章详情页的元数据：canonical、article 类型的 Open Graph 与标签。 */
export function buildPostMetadata(post: PostDetail): Metadata {
  const url = absoluteUrl(postHref(post.slug));
  const modifiedTime = post.updatedAt ?? post.date;

  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.description,
      url,
      siteName: siteConfig.name,
      locale: OG_LOCALE,
      publishedTime: post.date,
      modifiedTime,
      tags: post.tags,
    },
  };
}

/** 分类/标签归档页的元数据。 */
export function buildTaxonomyMetadata(page: TaxonomyPage): Metadata {
  const label = page.kind === "categories" ? "分类" : "标签";
  const title = `${label}：${page.name}`;
  const description = `${siteConfig.name} 中${label}「${page.name}」下的 ${page.count} 篇文章。`;

  return buildPageMetadata({
    title,
    description,
    path: taxonomyHref(page.kind, page.slug),
  });
}

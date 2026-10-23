import "server-only";
import { cacheLife } from "next/cache";
import {
  findPublicPostBySlug,
  loadAllPosts,
  loadPublicIndex,
  loadTaxonomyPage,
} from "./read-posts";
import { renderMarkdown } from "./render-markdown";
import { toSummary } from "./schema";
import type {
  PostDetail,
  PostSummary,
  TaxonomyPage,
  TaxonomySummary,
} from "./schema";

/**
 * 内容访问层（仅供服务端使用）。
 *
 * 所有读取都放在 `'use cache'` 边界内：页面组件只调用这里的函数，
 * 不直接触碰文件系统；开发环境下关闭缓存，修改 Markdown 后立即生效。
 */
export async function getPosts(): Promise<PostSummary[]> {
  "use cache";
  if (process.env.NODE_ENV === "development") {
    cacheLife({ revalidate: 0 });
  } else {
    cacheLife("max");
  }
  const { posts } = await loadPublicIndex();
  return posts;
}

/** 按 slug 读取已发布文章；草稿、未发布或不存在均返回 null。 */
export async function getPostBySlug(slug: string): Promise<PostDetail | null> {
  "use cache";
  const post = findPublicPostBySlug(await loadAllPosts(), slug);
  if (process.env.NODE_ENV === "development") {
    cacheLife({ revalidate: 0 });
  } else if (post === null) {
    cacheLife("minutes");
  } else {
    cacheLife("max");
  }
  if (post === null) return null;

  const { html, toc } = await renderMarkdown(post.content, { sourcePath: post.sourcePath });
  return { ...toSummary(post), html, toc };
}

/** 分类列表，按文章数倒序、同数按名称排序。 */
export async function getCategories(): Promise<TaxonomySummary[]> {
  "use cache";
  if (process.env.NODE_ENV === "development") {
    cacheLife({ revalidate: 0 });
  } else {
    cacheLife("max");
  }
  const { categories } = await loadPublicIndex();
  return categories;
}

/** 标签列表，排序规则同分类。 */
export async function getTags(): Promise<TaxonomySummary[]> {
  "use cache";
  if (process.env.NODE_ENV === "development") {
    cacheLife({ revalidate: 0 });
  } else {
    cacheLife("max");
  }
  const { tags } = await loadPublicIndex();
  return tags;
}

/** 某个分类下的文章；分类不存在或参数非法时返回 null。 */
export async function getPostsByCategory(param: string): Promise<TaxonomyPage | null> {
  "use cache";
  const page = await loadTaxonomyPage("categories", param);
  if (process.env.NODE_ENV === "development") {
    cacheLife({ revalidate: 0 });
  } else if (page === null) {
    cacheLife("minutes");
  } else {
    cacheLife("max");
  }
  return page;
}

/** 某个标签下的文章；标签不存在或参数非法时返回 null。 */
export async function getPostsByTag(param: string): Promise<TaxonomyPage | null> {
  "use cache";
  const page = await loadTaxonomyPage("tags", param);
  if (process.env.NODE_ENV === "development") {
    cacheLife({ revalidate: 0 });
  } else if (page === null) {
    cacheLife("minutes");
  } else {
    cacheLife("max");
  }
  return page;
}

export type {
  PostDetail,
  PostSummary,
  TaxonomyPage,
  TaxonomySummary,
  TocEntry,
  TaxonomyKind,
} from "./schema";

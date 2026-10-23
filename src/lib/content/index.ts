import "server-only";
import { cacheLife } from "next/cache";
import {
  findPostNeighbors,
  findPublicPostBySlug,
  loadAllPosts,
  loadPublicIndex,
  loadTaxonomyPage,
} from "./read-posts";
import { readPage } from "./read-pages";
import { renderMarkdown } from "./render-markdown";
import { toSummary } from "./schema";
import type {
  PageDetail,
  PostDetail,
  PostSummary,
  TaxonomyPage,
  TaxonomySummary,
} from "./schema";
import type { PostNeighbors } from "./read-posts";

/**
 * 内容访问层（仅供服务端使用）。
 *
 * 所有读取都放在 `'use cache'` 边界内：页面组件只调用这里的函数，
 * 不直接触碰文件系统。
 *
 * 缓存时长约定：
 * - 开发环境 `{ revalidate: 1, stale: 30 }`：改完 Markdown 刷新即可看到变化。
 *   这里不能写 `revalidate: 0`——`ensureStatic = "navigation"`（见 (site)/layout.tsx）
 *   会拒绝 revalidate 为 0 的缓存作用域，1 秒在实践中等价于"改完就生效"。
 * - 生产环境已发布内容用 `max`；"查不到"的结果用 `minutes`，避免把不存在的
 *   文章长期缓存。
 */
export async function getPosts(): Promise<PostSummary[]> {
  "use cache";
  if (process.env.NODE_ENV === "development") {
    cacheLife({ revalidate: 1, stale: 30 });
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
    cacheLife({ revalidate: 1, stale: 30 });
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
    cacheLife({ revalidate: 1, stale: 30 });
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
    cacheLife({ revalidate: 1, stale: 30 });
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
    cacheLife({ revalidate: 1, stale: 30 });
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
    cacheLife({ revalidate: 1, stale: 30 });
  } else if (page === null) {
    cacheLife("minutes");
  } else {
    cacheLife("max");
  }
  return page;
}

/** 文章详情页的上一篇/下一篇；文章不存在或不可公开时两者都为 null。 */
export async function getPostNeighbors(slug: string): Promise<PostNeighbors> {
  "use cache";
  if (process.env.NODE_ENV === "development") {
    cacheLife({ revalidate: 1, stale: 30 });
  } else {
    cacheLife("max");
  }
  const { posts } = await loadPublicIndex();
  return findPostNeighbors(posts, slug);
}

/**
 * 独立页面（如 about）的正文；`content/pages/<name>.md` 不存在时返回 null，
 * 由页面渲染 404，避免把"文件被删"静默变成空白页。
 */
export async function getPage(name: string): Promise<PageDetail | null> {
  "use cache";
  const page = await readPage(name);
  if (process.env.NODE_ENV === "development") {
    cacheLife({ revalidate: 1, stale: 30 });
  } else if (page === null) {
    cacheLife("minutes");
  } else {
    cacheLife("max");
  }
  if (page === null) return null;

  const { html, toc } = await renderMarkdown(page.content, {
    sourcePath: page.sourcePath,
  });

  return {
    ...(page.frontmatter.title === undefined ? {} : { title: page.frontmatter.title }),
    ...(page.frontmatter.description === undefined
      ? {}
      : { description: page.frontmatter.description }),
    ...(page.frontmatter.updatedAt === undefined
      ? {}
      : { updatedAt: page.frontmatter.updatedAt }),
    html,
    toc,
    sourcePath: page.sourcePath,
  };
}

export type {
  PageDetail,
  PostDetail,
  PostSummary,
  TaxonomyPage,
  TaxonomySummary,
  TocEntry,
  TaxonomyKind,
} from "./schema";
export type { PostNeighbors } from "./read-posts";

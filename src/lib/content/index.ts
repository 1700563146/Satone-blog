import "server-only";
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
 * 内容访问层（仅供服务端使用，页面组件只调用这里的函数）。
 *
 * 这里的函数只在**构建期**执行：站点采用纯静态导出（`output: "export"`，见 ADR-027），
 * 文章、分类、标签、独立页面都在 `next build` 时渲染成 HTML，运行时不读文件系统。
 * 这样产物是纯静态文件，可以部署到任何静态托管（Cloudflare Workers Assets / Pages /
 * 对象存储），也避免了在 workerd 里调用 `node:fs` 或 Shiki。
 *
 * 开发环境（`next dev`）下这些函数每个请求都会重新执行，改完 Markdown 刷新即可看到。
 */
export async function getPosts(): Promise<PostSummary[]> {
  const { posts } = await loadPublicIndex();
  return posts;
}

/** 按 slug 读取已发布文章；草稿、未发布或不存在均返回 null。 */
export async function getPostBySlug(slug: string): Promise<PostDetail | null> {
  const post = findPublicPostBySlug(await loadAllPosts(), slug);
  if (post === null) return null;

  const { html, toc } = await renderMarkdown(post.content, { sourcePath: post.sourcePath });
  return { ...toSummary(post), html, toc };
}

/** 分类列表，按文章数倒序、同数按名称排序。 */
export async function getCategories(): Promise<TaxonomySummary[]> {
  const { categories } = await loadPublicIndex();
  return categories;
}

/** 标签列表，排序规则同分类。 */
export async function getTags(): Promise<TaxonomySummary[]> {
  const { tags } = await loadPublicIndex();
  return tags;
}

/** 某个分类下的文章；分类不存在或参数非法时返回 null。 */
export async function getPostsByCategory(param: string): Promise<TaxonomyPage | null> {
  return loadTaxonomyPage("categories", param);
}

/** 某个标签下的文章；标签不存在或参数非法时返回 null。 */
export async function getPostsByTag(param: string): Promise<TaxonomyPage | null> {
  return loadTaxonomyPage("tags", param);
}

/** 文章详情页的上一篇/下一篇；文章不存在或不可公开时两者都为 null。 */
export async function getPostNeighbors(slug: string): Promise<PostNeighbors> {
  const { posts } = await loadPublicIndex();
  return findPostNeighbors(posts, slug);
}

/**
 * 独立页面（如 about）的正文；`content/pages/<name>.md` 不存在时返回 null，
 * 由页面渲染 404，避免把"文件被删"静默变成空白页。
 */
export async function getPage(name: string): Promise<PageDetail | null> {
  const page = await readPage(name);
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

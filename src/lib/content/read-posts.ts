import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { parsePostSource } from "./parse-frontmatter";
import {
  ContentValidationError,
  isPublished,
  normalizeTaxonomyName,
  resolveTaxonomyParam,
  taxonomyHref,
  toSummary,
  type ContentIssue,
  type Post,
  type PostSummary,
  type PublicIndex,
  type TaxonomyKind,
  type TaxonomyPage,
  type TaxonomySummary,
} from "./schema";

/** 文章目录默认位置：仓库根的 content/posts。 */
export const POSTS_DIR = path.join(process.cwd(), "content", "posts");

export interface ReadPostsOptions {
  /** 测试时可指向 fixture 目录。 */
  postsDir?: string;
}

export interface CollectPostsResult {
  posts: Post[];
  issues: ContentIssue[];
}

function compareStrings(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/** 仓库相对路径，统一用 / 分隔，保证 Windows 与 CI 的报错一致。 */
function toSourcePath(fullPath: string): string {
  return path.relative(process.cwd(), fullPath).split(path.sep).join("/");
}

function isMarkdownFile(name: string): boolean {
  return name.toLowerCase().endsWith(".md");
}

/**
 * 读取目录下所有 .md 文章并解析 frontmatter。
 *
 * - 只处理 content/posts 的顶层文件；子目录视为错误，避免文章被静默忽略。
 * - 非 .md 文件产生警告，不参与构建。
 * - 单个文件的问题不会中断其余文件的收集，最终由调用方决定是否失败。
 * - 重复 slug 在全部文章（含草稿）之间检查。
 */
export async function collectPosts(options: ReadPostsOptions = {}): Promise<CollectPostsResult> {
  const postsDir = options.postsDir ?? POSTS_DIR;
  // 内容目录路径支持测试注入；忽略静态追踪，部署所需文件由 next.config.ts 的
  // outputFileTracingIncludes 显式包含。
  const entries = await readdir(/* turbopackIgnore: true */ postsDir, { withFileTypes: true });
  entries.sort((a, b) => compareStrings(a.name, b.name));

  const issues: ContentIssue[] = [];
  const posts: Post[] = [];

  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;

    const fullPath = path.join(/* turbopackIgnore: true */ postsDir, entry.name);
    const sourcePath = toSourcePath(fullPath);

    if (entry.isDirectory()) {
      issues.push({
        code: "UNSUPPORTED_FILE",
        severity: "error",
        sourcePath,
        message: "content/posts 不支持子目录；请把文章直接放在 content/posts/ 下",
      });
      continue;
    }

    if (!entry.isFile() && !entry.isSymbolicLink()) continue;

    if (!isMarkdownFile(entry.name)) {
      issues.push({
        code: "UNEXPECTED_FILE",
        severity: "warning",
        sourcePath,
        message: "只有 .md 文件会被当作文章读取，该文件已忽略",
      });
      continue;
    }

    try {
      const source = await readFile(/* turbopackIgnore: true */ fullPath, "utf8");
      const parsed = parsePostSource(source, sourcePath);
      posts.push({
        ...parsed.frontmatter,
        content: parsed.content,
        sourcePath,
      });
    } catch (error) {
      if (error instanceof ContentValidationError) {
        issues.push(...error.issues);
      } else {
        issues.push({
          code: "READ_ERROR",
          severity: "error",
          sourcePath,
          message: `读取文章失败：${error instanceof Error ? error.message : String(error)}`,
        });
      }
    }
  }

  posts.sort((a, b) => compareStrings(a.sourcePath, b.sourcePath));
  issues.push(...findDuplicateSlugs(posts));

  return { posts, issues };
}

function findDuplicateSlugs(posts: Post[]): ContentIssue[] {
  const bySlug = new Map<string, Post[]>();
  for (const post of posts) {
    const group = bySlug.get(post.slug);
    if (group === undefined) {
      bySlug.set(post.slug, [post]);
    } else {
      group.push(post);
    }
  }

  const issues: ContentIssue[] = [];
  for (const [slug, group] of bySlug) {
    if (group.length < 2) continue;
    for (const post of group) {
      const others = group
        .filter((candidate) => candidate.sourcePath !== post.sourcePath)
        .map((candidate) => candidate.sourcePath);
      issues.push({
        code: "DUPLICATE_SLUG",
        severity: "error",
        sourcePath: post.sourcePath,
        field: "slug",
        message: `slug "${slug}" 重复；与 ${others.join("、")} 冲突`,
      });
    }
  }
  return issues;
}

/**
 * 读取全部文章（含草稿），按发布日期倒序、同日按 slug 升序排序。
 * 任意错误都会抛出 ContentValidationError，构建因此失败。
 */
export async function loadAllPosts(options: ReadPostsOptions = {}): Promise<Post[]> {
  const { posts, issues } = await collectPosts(options);
  const errors = issues.filter((issue) => issue.severity === "error");
  if (errors.length > 0) {
    throw new ContentValidationError(errors);
  }
  return [...posts].sort(comparePosts);
}

function comparePosts(a: Pick<Post, "date" | "slug">, b: Pick<Post, "date" | "slug">): number {
  if (a.date !== b.date) return a.date < b.date ? 1 : -1;
  return compareStrings(a.slug, b.slug);
}

/** 由全部文章构建公开索引：过滤草稿，统计分类/标签。 */
export function buildPublicIndex(posts: Post[]): PublicIndex {
  const published = posts.filter(isPublished).sort(comparePosts).map(toSummary);
  return {
    posts: published,
    categories: buildTaxonomy("categories", published),
    tags: buildTaxonomy("tags", published),
  };
}

function buildTaxonomy(kind: TaxonomyKind, posts: PostSummary[]): TaxonomySummary[] {
  const counts = new Map<string, number>();
  for (const post of posts) {
    for (const rawName of post[kind]) {
      const name = normalizeTaxonomyName(rawName);
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([name, count]) => ({
      kind,
      name,
      slug: name,
      href: taxonomyHref(kind, name),
      count,
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "zh-CN"));
}

/** 公开索引：不会包含任何草稿或未发布文章。 */
export async function loadPublicIndex(options: ReadPostsOptions = {}): Promise<PublicIndex> {
  return buildPublicIndex(await loadAllPosts(options));
}

/** 按 slug 查找可公开访问的文章；草稿、未发布与不存在的 slug 均返回 null。 */
export function findPublicPostBySlug(posts: Post[], slug: string): Post | null {
  const post = posts.find((candidate) => candidate.slug === slug);
  if (post === undefined || !isPublished(post)) return null;
  return post;
}

/** 按路由参数定位分类/标签（参数会先解码一次）。 */
export function findTaxonomyTerm(
  terms: TaxonomySummary[],
  param: string,
): TaxonomySummary | null {
  const name = resolveTaxonomyParam(param);
  if (name === null) return null;
  return terms.find((term) => term.slug === name) ?? null;
}

/** 汇总某个分类/标签下的文章；找不到时返回 null，由页面渲染 404。 */
export async function loadTaxonomyPage(
  kind: TaxonomyKind,
  param: string,
  options: ReadPostsOptions = {},
): Promise<TaxonomyPage | null> {
  const index = await loadPublicIndex(options);
  const term = findTaxonomyTerm(index[kind], param);
  if (term === null) return null;

  return {
    ...term,
    posts: index.posts.filter((post) =>
      post[kind].some((name) => normalizeTaxonomyName(name) === term.name),
    ),
  };
}

/** 文章详情页的上一篇/下一篇。 */
export interface PostNeighbors {
  /** 更早发布的一篇（列表中位于当前文章之后）。 */
  older: PostSummary | null;
  /** 更晚发布的一篇（列表中位于当前文章之前）。 */
  newer: PostSummary | null;
}

/**
 * 在公开文章列表（已按日期倒序）中定位相邻文章。
 *
 * 排序与列表页保持一致，保证"上一篇/下一篇"与列表顺序相符；找不到当前文章时
 * 两者都返回 null。
 */
export function findPostNeighbors(published: PostSummary[], slug: string): PostNeighbors {
  const index = published.findIndex((post) => post.slug === slug);
  if (index === -1) return { older: null, newer: null };

  return {
    older: published[index + 1] ?? null,
    newer: published[index - 1] ?? null,
  };
}

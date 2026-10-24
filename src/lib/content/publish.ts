import matter from "gray-matter";

import { normalizeNewlines } from "./parse-frontmatter";
import {
  ContentValidationError,
  postFrontmatterSchema,
  type ContentIssue,
  type PostFrontmatter,
} from "./schema";

/**
 * 把"随手写的 Markdown"整备成符合内容规范的博客文章（纯函数，可单测）。
 *
 * 解决的问题：日常写作用的编辑器（Typora / Obsidian / VS Code）导出的 `.md`
 * 通常没有 frontmatter，或者日期没加引号。而本站的 frontmatter 是严格校验的，
 * 直接放进仓库会让构建失败。这里负责：
 *
 * - 缺 frontmatter 时从正文推导（H1 → 标题、首段 → 摘要、文件名 → slug、当天 → 日期）；
 * - 常见错误就地修正（未加引号的日期、缺失的 published/draft）；
 * - 未知字段、非法取值仍然报错（与构建期同一套 schema，避免"脚本通过、构建失败"）。
 */

/** 允许出现在 frontmatter 里的字段，用于替代 strictObject 的拼写检查提示。 */
const KNOWN_FRONTMATTER_KEYS = new Set([
  "title",
  "slug",
  "description",
  "date",
  "updatedAt",
  "published",
  "draft",
  "categories",
  "tags",
  "cover",
  "featured",
]);

const MAX_DESCRIPTION_LENGTH = 200;

export interface PreparePostOptions {
  /** 原始文件名（含扩展名），用于推导 slug。 */
  filename: string;
  /** 缺少日期时使用的 YYYY-MM-DD（由调用方按站点时区算出）。 */
  fallbackDate: string;
  /** 以下均为命令行覆盖项：给了就优先于文件里的 frontmatter。 */
  title?: string;
  slug?: string;
  description?: string;
  date?: string;
  categories?: string[];
  tags?: string[];
  /** 强制作为草稿（published: false + draft: true）。 */
  draft?: boolean;
}

export interface PreparedPost {
  frontmatter: PostFrontmatter;
  body: string;
  /** 自动补全/修正的说明，供 CLI 打印。 */
  warnings: string[];
}

/** 标题里允许的字符：小写字母、数字，单词间单个连字符。 */
export function slugify(value: string): string {
  return value
    .normalize("NFC")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

/** 按固定时区偏移取"今天"，避免构建机/本机时区影响发布日期（ADR-010）。 */
export function todayInOffset(offset: string, now: Date = new Date()): string {
  const match = /^([+-])(\d{2}):?(\d{2})$/.exec(offset.trim());
  const minutes = match === null ? 0 : (match[1] === "-" ? -1 : 1) * (Number(match[2]) * 60 + Number(match[3]));
  const shifted = new Date(now.getTime() + minutes * 60_000);
  return shifted.toISOString().slice(0, 10);
}

/** 取正文里第一个 ATX 一级标题作为标题。 */
export function deriveTitle(markdown: string): string | undefined {
  const match = /^#\s+(.+?)\s*$/m.exec(markdown);
  return match?.[1]?.trim() || undefined;
}

/** 取第一段正文纯文本作为摘要（跳过标题、代码块、引用与列表）。 */
export function deriveDescription(markdown: string, max = MAX_DESCRIPTION_LENGTH): string | undefined {
  const blocks = markdown.split(/\n{2,}/);
  for (const block of blocks) {
    const trimmed = block.trim();
    if (trimmed.length === 0) continue;
    if (/^#{1,6}\s/.test(trimmed)) continue;
    if (/^```/.test(trimmed)) continue;
    if (/^>\s?/.test(trimmed)) continue;
    if (/^([-*+]|\d+\.)\s/.test(trimmed)) continue;

    const plain = trimmed
      .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
      .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
      .replace(/[*_~`]/g, "")
      .replace(/\s+/g, " ")
      .trim();

    if (plain.length === 0) continue;
    return plain.length <= max ? plain : `${plain.slice(0, max - 1)}…`;
  }
  return undefined;
}

function asStringArray(value: unknown): string[] | undefined {
  if (value === undefined || value === null) return undefined;
  if (Array.isArray(value)) return value.map((item) => String(item));
  return [String(value)];
}

/** js-yaml 会把未加引号的日期解析成 Date；这里转回 YYYY-MM-DD 并提示。 */
function normalizeDateValue(value: unknown): { value?: string; wasDateObject: boolean } {
  if (value === undefined || value === null || value === "") return { wasDateObject: false };
  if (value instanceof Date) {
    return { value: value.toISOString().slice(0, 10), wasDateObject: true };
  }
  return { value: String(value).trim(), wasDateObject: false };
}

function firstHeadingLineIndex(markdown: string): number {
  const lines = markdown.split("\n");
  return lines.findIndex((line) => /^#\s+/.test(line));
}

/** 去掉与标题重复的那一行 H1，避免页面出现两个一级标题。 */
function stripLeadingTitle(markdown: string, title: string): { body: string; removed: boolean } {
  const lines = markdown.split("\n");
  const index = firstHeadingLineIndex(markdown);
  if (index === -1) return { body: markdown, removed: false };

  const heading = lines[index]?.replace(/^#\s+/, "").trim() ?? "";
  if (heading !== title.trim()) return { body: markdown, removed: false };

  const rest = [...lines.slice(0, index), ...lines.slice(index + 1)].join("\n");
  return { body: rest.replace(/^\n+/, ""), removed: true };
}

function toIssues(error: {
  issues: Array<{ path: PropertyKey[]; message: string }>;
}): ContentIssue[] {
  return error.issues.map((issue) => ({
    code: "INVALID_FRONTMATTER" as const,
    severity: "error" as const,
    sourcePath: "<pending>",
    field: issue.path.length === 0 ? undefined : issue.path.map(String).join("."),
    message: issue.message,
  }));
}

/**
 * 解析并整备一篇待发布的文章。
 *
 * 抛错（`ContentValidationError`）的情形：未知字段、非法取值、slug 无法推导。
 */
export function preparePost(source: string, options: PreparePostOptions): PreparedPost {
  const warnings: string[] = [];
  const normalized = normalizeNewlines(source);
  const hasFrontmatter = normalized.split("\n", 1)[0]?.trim() === "---";

  let data: Record<string, unknown> = {};
  let content = normalized;

  if (hasFrontmatter) {
    const parsed = matter(normalized);
    data = (parsed.data ?? {}) as Record<string, unknown>;
    content = parsed.content.replace(/^\n+/, "");

    const unknownKeys = Object.keys(data).filter((key) => !KNOWN_FRONTMATTER_KEYS.has(key));
    if (unknownKeys.length > 0) {
      throw new ContentValidationError([
        {
          code: "INVALID_FRONTMATTER",
          severity: "error",
          sourcePath: "<pending>",
          field: unknownKeys.join(", "),
          message: `frontmatter 里有未知字段：${unknownKeys.join("、")}（拼写错误？）`,
        },
      ]);
    }
  } else {
    warnings.push("没有 frontmatter，已从正文推导标题、摘要与日期");
  }

  const derivedTitle = deriveTitle(content);
  // 优先级：命令行 > 文件 frontmatter > 正文推导
  const title = String(options.title ?? data.title ?? derivedTitle ?? "").trim();
  if (title.length === 0) {
    throw new ContentValidationError([
      {
        code: "INVALID_FRONTMATTER",
        severity: "error",
        sourcePath: "<pending>",
        field: "title",
        message: "缺少标题：正文里没有一级标题（# 标题），也没有传 --title",
      },
    ]);
  }

  const baseName = options.filename.replace(/\.[^.]+$/, "");
  const slugFromFile = slugify(baseName);
  const slug = String(options.slug ?? data.slug ?? slugFromFile).trim();
  if (slug.length === 0) {
    throw new ContentValidationError([
      {
        code: "INVALID_FRONTMATTER",
        severity: "error",
        sourcePath: "<pending>",
        field: "slug",
        message: "无法从文件名生成 slug（只接受小写字母/数字/连字符），请用 --slug 指定，例如 --slug my-post",
      },
    ]);
  }

  const derivedDescription = deriveDescription(content);
  const description = String(
    options.description ?? data.description ?? derivedDescription ?? "",
  ).trim();

  const date = normalizeDateValue(options.date ?? data.date ?? options.fallbackDate);
  if (date.wasDateObject) {
    warnings.push("日期没有加引号，已自动转成 YYYY-MM-DD 字符串（YAML 会把未加引号的日期解析成时间对象）");
  }
  if (data.date === undefined && options.date === undefined) {
    warnings.push(`没有写日期，已使用 ${options.fallbackDate}`);
  }

  const updatedAt = normalizeDateValue(data.updatedAt);
  if (updatedAt.wasDateObject) {
    warnings.push("updatedAt 没有加引号，已自动转成 YYYY-MM-DD 字符串");
  }

  const draftFlag = options.draft === true;
  const isDraft = draftFlag ? true : (data.draft ?? false);
  const published = draftFlag ? false : (data.published ?? (isDraft === true ? false : true));

  const { body: bodyWithoutTitle, removed } = stripLeadingTitle(content, title);
  if (removed) {
    warnings.push("正文开头的一级标题与 frontmatter 标题重复，已移除（页面会渲染标题）");
  }

  const candidates: Record<string, unknown> = {
    title,
    slug,
    description,
    date: date.value,
    updatedAt: updatedAt.value,
    published,
    draft: isDraft,
    categories: asStringArray(options.categories ?? data.categories) ?? [],
    tags: asStringArray(options.tags ?? data.tags) ?? [],
    cover: data.cover,
    featured: data.featured,
  };

  const parsed = postFrontmatterSchema.safeParse(candidates);
  if (!parsed.success) {
    throw new ContentValidationError(toIssues(parsed.error));
  }

  return {
    frontmatter: parsed.data,
    body: bodyWithoutTitle.trimStart(),
    warnings,
  };
}

function quote(value: string): string {
  return JSON.stringify(value);
}

/** 按固定字段顺序序列化 frontmatter + 正文，保证输出稳定、可 review。 */
export function formatPostSource(frontmatter: PostFrontmatter, body: string): string {
  const lines: string[] = ["---"];
  lines.push(`title: ${quote(frontmatter.title)}`);
  lines.push(`slug: ${quote(frontmatter.slug)}`);
  lines.push(`description: ${quote(frontmatter.description)}`);
  // 日期一律加引号：不加会被 YAML 解析成 Date（ADR-010）
  lines.push(`date: ${quote(frontmatter.date)}`);
  if (frontmatter.updatedAt !== undefined) {
    lines.push(`updatedAt: ${quote(frontmatter.updatedAt)}`);
  }
  lines.push(`published: ${frontmatter.published}`);
  lines.push(`draft: ${frontmatter.draft}`);
  if (frontmatter.categories.length === 0) {
    lines.push("categories: []");
  } else {
    lines.push("categories:");
    for (const name of frontmatter.categories) lines.push(`  - ${quote(name)}`);
  }
  if (frontmatter.tags.length === 0) {
    lines.push("tags: []");
  } else {
    lines.push("tags:");
    for (const name of frontmatter.tags) lines.push(`  - ${quote(name)}`);
  }
  if (frontmatter.cover !== undefined) lines.push(`cover: ${quote(frontmatter.cover)}`);
  lines.push(`featured: ${frontmatter.featured}`);
  lines.push("---");

  // frontmatter 与正文之间留一个空行，符合 Markdown 惯例（也便于 diff）
  return `${lines.join("\n")}\n\n${body.replace(/\n+$/, "")}\n`;
}

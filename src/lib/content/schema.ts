import { z } from "zod";

/**
 * 内容层公共类型、常量与纯函数。
 *
 * 本模块不依赖 Next.js 运行时，可被单元测试、校验脚本与页面组件直接使用。
 * 错误信息统一为中文（Zod 内置提示也在下方配置为 zh-CN）。
 */
z.config(z.locales.zhCN());

/** 文章 slug：小写字母/数字，单词之间用单个连字符连接。 */
const POST_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const CONTROL_CHAR_PATTERN = /[\u0000-\u001f\u007f]/;
const TAXONOMY_FORBIDDEN_PATTERN = /[/\\?#%\u0000-\u001f\u007f]/;

const MAX_TITLE_LENGTH = 120;
const MAX_DESCRIPTION_LENGTH = 200;
const MAX_SLUG_LENGTH = 80;
const MAX_TAXONOMY_LENGTH = 40;
const MAX_CATEGORIES = 5;
const MAX_TAGS = 20;
const MAX_COVER_LENGTH = 2048;

export type ContentIssueCode =
  | "INVALID_FRONTMATTER"
  | "INVALID_YAML"
  | "DUPLICATE_SLUG"
  | "UNSUPPORTED_FILE"
  | "UNEXPECTED_FILE"
  | "READ_ERROR"
  | "MARKDOWN_UNSAFE_URL"
  | "MARKDOWN_MISSING_ALT"
  | "MARKDOWN_RAW_HTML"
  | "NO_PUBLIC_POSTS";

export interface ContentIssue {
  code: ContentIssueCode;
  severity: "error" | "warning";
  /** 仓库相对路径（统一使用 / 分隔），便于在 CI 日志中定位。 */
  sourcePath: string;
  /** 1 起始的行号（能定位时提供）。 */
  line?: number;
  /** 出错的 frontmatter 字段，如 title、categories.0。 */
  field?: string;
  message: string;
}

export class ContentValidationError extends Error {
  readonly issues: readonly ContentIssue[];

  constructor(issues: readonly ContentIssue[]) {
    const lines = issues.map((issue) => `  - ${formatContentIssue(issue)}`);
    super([`内容校验失败（${issues.length} 个问题）：`, ...lines].join("\n"));
    this.name = "ContentValidationError";
    this.issues = issues;
  }
}

/** 将一条问题格式化为可读的单行文本：`路径:行号 [CODE] 字段: 说明`。 */
export function formatContentIssue(issue: ContentIssue): string {
  const location = issue.line === undefined ? issue.sourcePath : `${issue.sourcePath}:${issue.line}`;
  const field = issue.field === undefined || issue.field.length === 0 ? "" : `${issue.field}: `;
  return `${location} [${issue.code}] ${field}${issue.message}`;
}

/**
 * 校验并规范化 `YYYY-MM-DD`。
 *
 * 只接受字符串：js-yaml 会把未加引号的日期解析成 Date，并且会把 2026-02-30
 * 这类不存在的日期自动进位成 2026-03-02，从而掩盖错误；统一要求加引号。
 */
function parseCivilDate(value: string, ctx: z.core.$RefinementCtx): string {
  const raw = value.trim();
  const match = ISO_DATE_PATTERN.exec(raw);
  if (match === null) {
    ctx.addIssue({
      code: "custom",
      message: `日期格式必须是 YYYY-MM-DD（收到 ${JSON.stringify(value)}）`,
    });
    return z.NEVER;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!isRealCalendarDate(year, month, day)) {
    ctx.addIssue({ code: "custom", message: `日期 ${raw} 不存在，请检查年月日` });
    return z.NEVER;
  }

  return raw;
}

function isRealCalendarDate(year: number, month: number, day: number): boolean {
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

const civilDateSchema = z
  .string({
    error:
      '日期必须写成加引号的 YYYY-MM-DD 字符串（如 "2026-10-23"）；未加引号会被 YAML 解析成时间对象，并可能自动进位掩盖非法日期',
  })
  .transform(parseCivilDate);

/** 去掉首尾空白、合并内部连续空白，并做 Unicode NFC 规范化。 */
export function normalizeTaxonomyName(value: string): string {
  return value.normalize("NFC").trim().replace(/\s+/g, " ");
}

const taxonomyNameSchema = z
  .string()
  .transform((value) => normalizeTaxonomyName(value))
  .pipe(
    z
      .string()
      .min(1, "分类/标签名不能为空")
      .max(MAX_TAXONOMY_LENGTH, `分类/标签名最多 ${MAX_TAXONOMY_LENGTH} 个字符`)
      .refine(
        (value) => !TAXONOMY_FORBIDDEN_PATTERN.test(value),
        "分类/标签名不能包含 / \\ ? # % 或控制字符",
      )
      .refine(
        (value) => value !== "." && value !== "..",
        "分类/标签名不能是 . 或 ..",
      ),
  );

function normalizeTaxonomyList(value: unknown): unknown {
  if (value === null || value === undefined) return [];
  if (!Array.isArray(value)) return value;

  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") return value;
    const name = normalizeTaxonomyName(item);
    if (seen.has(name)) continue;
    seen.add(name);
    result.push(name);
  }
  return result;
}

function taxonomyListSchema(max: number) {
  return z.preprocess(normalizeTaxonomyList, z.array(taxonomyNameSchema).max(max, `最多 ${max} 个`));
}

function isSafeCover(value: string): boolean {
  if (value.includes("\\")) return false;
  if (value.startsWith("/")) {
    return !value.startsWith("//") && !value.includes("..");
  }
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

const coverSchema = z.preprocess(
  (value) => (value === null ? undefined : value),
  z
    .string()
    .trim()
    .min(1, "封面地址不能为空")
    .max(MAX_COVER_LENGTH, `封面地址最多 ${MAX_COVER_LENGTH} 个字符`)
    .refine(
      isSafeCover,
      "封面必须是站内绝对路径（如 /images/posts/first.webp）或 https 地址",
    )
    .optional(),
);

/**
 * 单篇文章的 frontmatter 规范。
 *
 * 未知字段会被拒绝，避免 `pubished` 之类的拼写错误静默生效。
 * 顶部需使用普通 `---`，`---js` / `---json` 等自定义解析器不被支持。
 */
export const postFrontmatterSchema = z
  .strictObject({
    title: z
      .string()
      .transform((value) => value.normalize("NFC").trim())
      .pipe(
        z
          .string()
          .min(1, "标题不能为空")
          .max(MAX_TITLE_LENGTH, `标题最多 ${MAX_TITLE_LENGTH} 个字符`)
          .refine((value) => !CONTROL_CHAR_PATTERN.test(value), "标题不能包含控制字符"),
      ),
    slug: z
      .string()
      .min(1, "slug 不能为空")
      .max(MAX_SLUG_LENGTH, `slug 最多 ${MAX_SLUG_LENGTH} 个字符`)
      .regex(POST_SLUG_PATTERN, "slug 只能包含小写字母、数字和连字符，且不能以连字符开头或结尾"),
    description: z
      .string()
      .transform((value) => value.normalize("NFC").trim())
      .pipe(
        z
          .string()
          .min(1, "摘要不能为空")
          .max(MAX_DESCRIPTION_LENGTH, `摘要最多 ${MAX_DESCRIPTION_LENGTH} 个字符`)
          .refine((value) => !CONTROL_CHAR_PATTERN.test(value), "摘要不能包含控制字符"),
      ),
    date: civilDateSchema,
    updatedAt: z.preprocess(
      (value) => (value === null || value === "" ? undefined : value),
      civilDateSchema.optional(),
    ),
    published: z.boolean({
      error: "published 必须是布尔值；草稿请明确写 published: false",
    }),
    draft: z.boolean({ error: "draft 必须是布尔值" }),
    categories: taxonomyListSchema(MAX_CATEGORIES),
    tags: taxonomyListSchema(MAX_TAGS),
    cover: coverSchema,
    featured: z.preprocess((value) => (value === null ? undefined : value), z.boolean().default(false)),
  })
  .superRefine((value, ctx) => {
    if (value.published && value.draft) {
      ctx.addIssue({
        code: "custom",
        path: ["draft"],
        message: "published 与 draft 不能同时为 true；草稿请设 published: false 或 draft: true",
      });
    }
    if (value.updatedAt !== undefined && value.updatedAt < value.date) {
      ctx.addIssue({
        code: "custom",
        path: ["updatedAt"],
        message: `updatedAt（${value.updatedAt}）不能早于 date（${value.date}）`,
      });
    }
  });

export type PostFrontmatter = z.infer<typeof postFrontmatterSchema>;

export interface Post extends PostFrontmatter {
  /** 正文 Markdown（不含 frontmatter）。 */
  content: string;
  /** 仓库相对路径；用于报错定位，不对外展示。 */
  sourcePath: string;
}

/** 对外列表用的文章摘要：不包含发布状态字段，避免草稿信息泄漏。 */
export type PostSummary = Omit<PostFrontmatter, "published" | "draft">;

export interface TocEntry {
  id: string;
  text: string;
  depth: 2 | 3;
}

export interface PostDetail extends PostSummary {
  html: string;
  toc: TocEntry[];
}

export type TaxonomyKind = "categories" | "tags";

export interface TaxonomySummary {
  kind: TaxonomyKind;
  name: string;
  /** 目前 slug 与规范化后的名称一致；链接时再做 URL 编码。 */
  slug: string;
  href: string;
  count: number;
}

export interface TaxonomyPage extends TaxonomySummary {
  posts: PostSummary[];
}

export interface PublicIndex {
  posts: PostSummary[];
  categories: TaxonomySummary[];
  tags: TaxonomySummary[];
}

/** 只有明确发布且未标记草稿的文章才对外可见。 */
export function isPublished(post: Pick<PostFrontmatter, "published" | "draft">): boolean {
  return post.published === true && post.draft === false;
}

export function toTaxonomySlug(name: string): string {
  return normalizeTaxonomyName(name);
}

export function taxonomyHref(kind: TaxonomyKind, slug: string): string {
  return `/${kind}/${encodeURIComponent(slug)}`;
}

const FORBIDDEN_TAXONOMY_PARAM_PATTERN = /[/\\?#%\u0000-\u001f\u007f]/;

/**
 * 把路由参数还原为分类/标签名。
 *
 * Next 在把动态段交给页面代码前会做一次 encodeURIComponent，
 * 因此这里必须恰好解码一次；非法编码返回 null，由页面渲染 404。
 */
export function resolveTaxonomyParam(param: string): string | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(param);
  } catch {
    return null;
  }

  const name = normalizeTaxonomyName(decoded);
  if (name.length === 0 || name.length > MAX_TAXONOMY_LENGTH) return null;
  if (name === "." || name === "..") return null;
  if (FORBIDDEN_TAXONOMY_PARAM_PATTERN.test(name)) return null;
  return name;
}

export function isValidPostSlug(slug: string): boolean {
  return POST_SLUG_PATTERN.test(slug);
}

/** 用中文展示日期，不做时区换算，避免构建机时区影响显示。 */
export function formatPostDate(value: string): string {
  const match = ISO_DATE_PATTERN.exec(value);
  if (match === null) return value;
  return `${match[1]} 年 ${Number(match[2])} 月 ${Number(match[3])} 日`;
}

/** 只保留对外可见字段：发布状态与正文不会进入列表数据。 */
export function toSummary(post: Post): PostSummary {
  return {
    title: post.title,
    slug: post.slug,
    description: post.description,
    date: post.date,
    ...(post.updatedAt === undefined ? {} : { updatedAt: post.updatedAt }),
    categories: post.categories,
    tags: post.tags,
    ...(post.cover === undefined ? {} : { cover: post.cover }),
    featured: post.featured,
  };
}

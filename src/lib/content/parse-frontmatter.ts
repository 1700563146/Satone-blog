import matter from "gray-matter";
import type { ZodError, ZodIssue } from "zod";
import {
  ContentValidationError,
  postFrontmatterSchema,
  type ContentIssue,
  type PostFrontmatter,
} from "./schema";

export interface ParsedPost {
  frontmatter: PostFrontmatter;
  /** 正文 Markdown（不含 frontmatter，换行已统一为 \n）。 */
  content: string;
}

/** 去掉 BOM，并把 CRLF/CR 统一为 LF，保证行号与正文在 Windows 上一致。 */
export function normalizeNewlines(source: string): string {
  return source.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
}

function firstLineOf(source: string): string {
  const newlineIndex = source.indexOf("\n");
  return newlineIndex === -1 ? source : source.slice(0, newlineIndex);
}

interface JsYamlError {
  mark?: { line?: unknown };
}

/** js-yaml 的 mark.line 从 0 开始，且相对 frontmatter 首行；换算成文件行号需 +2。 */
function yamlErrorLine(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  const mark = (error as JsYamlError).mark;
  if (mark === undefined || typeof mark.line !== "number") return undefined;
  return mark.line + 2;
}

function yamlErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message.split("\n")[0];
  return String(error);
}

/** 把 Zod 问题映射为 frontmatter 字段名；未知字段直接列出键名，便于定位拼写错误。 */
export function toIssueField(issue: ZodIssue): string | undefined {
  if (issue.code === "unrecognized_keys") return issue.keys.join(", ");
  if (issue.path.length === 0) return undefined;
  return issue.path.join(".");
}

/** 文章与页面共用的 Zod 错误转换，保证两边的报错格式一致。 */
export function zodIssuesToContentIssues(error: ZodError, sourcePath: string): ContentIssue[] {
  return error.issues.map((issue) => ({
    code: "INVALID_FRONTMATTER",
    severity: "error",
    sourcePath,
    field: toIssueField(issue),
    message: issue.message,
  }));
}

/**
 * 解析一篇 Markdown 文章：校验 frontmatter 并返回正文。
 * 任何不符合规范的内容都会抛出 ContentValidationError（可能包含多个问题）。
 */
export function parsePostSource(source: string, sourcePath: string): ParsedPost {
  const normalized = normalizeNewlines(source);

  if (firstLineOf(normalized).trim() !== "---") {
    throw new ContentValidationError([
      {
        code: "INVALID_FRONTMATTER",
        severity: "error",
        sourcePath,
        line: 1,
        message: "缺少 frontmatter：文件第一行必须是 ---（不支持 ---js / ---json 等自定义解析器）",
      },
    ]);
  }

  let parsed: ReturnType<typeof matter>;
  try {
    parsed = matter(normalized);
  } catch (error) {
    throw new ContentValidationError([
      {
        code: "INVALID_YAML",
        severity: "error",
        sourcePath,
        line: yamlErrorLine(error),
        message: `frontmatter 不是合法的 YAML：${yamlErrorMessage(error)}`,
      },
    ]);
  }

  const result = postFrontmatterSchema.safeParse(parsed.data);
  if (!result.success) {
    throw new ContentValidationError(zodIssuesToContentIssues(result.error, sourcePath));
  }

  return { frontmatter: result.data, content: parsed.content };
}

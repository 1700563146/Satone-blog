import { readFile } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { normalizeNewlines, zodIssuesToContentIssues } from "./parse-frontmatter";
import {
  ContentValidationError,
  pageFrontmatterSchema,
  type PageFrontmatter,
} from "./schema";

/** 独立页面目录默认位置：仓库根的 content/pages。 */
export const PAGES_DIR = path.join(process.cwd(), "content", "pages");

/** 页面名即 URL 无关的文件名，仅允许小写字母、数字与连字符（同时挡掉路径穿越）。 */
const PAGE_NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export interface ReadPageOptions {
  /** 测试时可指向 fixture 目录。 */
  pagesDir?: string;
}

export interface ParsedPage {
  frontmatter: PageFrontmatter;
  /** 正文 Markdown（不含 frontmatter，换行已统一为 \n）。 */
  content: string;
  sourcePath: string;
}

function toSourcePath(fullPath: string): string {
  return path.relative(process.cwd(), fullPath).split(path.sep).join("/");
}

/**
 * 读取一个独立页面（如 about）。
 *
 * - 文件不存在返回 null，由页面渲染 404；
 * - frontmatter 可整体省略；写了就必须符合 pageFrontmatterSchema（未知字段报错）；
 * - 页面名非法或 frontmatter 不合法时抛出 ContentValidationError。
 */
export async function readPage(
  name: string,
  options: ReadPageOptions = {},
): Promise<ParsedPage | null> {
  if (!PAGE_NAME_PATTERN.test(name)) {
    throw new ContentValidationError([
      {
        code: "UNEXPECTED_FILE",
        severity: "error",
        sourcePath: `content/pages/${name}.md`,
        message: "页面名只能包含小写字母、数字与连字符",
      },
    ]);
  }

  const pagesDir = options.pagesDir ?? PAGES_DIR;
  const fullPath = path.join(/* turbopackIgnore: true */ pagesDir, `${name}.md`);
  const sourcePath = toSourcePath(fullPath);

  let source: string;
  try {
    source = await readFile(/* turbopackIgnore: true */ fullPath, "utf8");
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return null;
    throw new ContentValidationError([
      {
        code: "READ_ERROR",
        severity: "error",
        sourcePath,
        message: `读取页面失败：${error instanceof Error ? error.message : String(error)}`,
      },
    ]);
  }

  const normalized = normalizeNewlines(source);
  let parsed: ReturnType<typeof matter>;
  try {
    parsed = matter(normalized);
  } catch (error) {
    throw new ContentValidationError([
      {
        code: "INVALID_YAML",
        severity: "error",
        sourcePath,
        message: `frontmatter 不是合法的 YAML：${
          error instanceof Error ? error.message.split("\n")[0] : String(error)
        }`,
      },
    ]);
  }

  const result = pageFrontmatterSchema.safeParse(parsed.data);
  if (!result.success) {
    throw new ContentValidationError(zodIssuesToContentIssues(result.error, sourcePath));
  }

  return { frontmatter: result.data, content: parsed.content, sourcePath };
}

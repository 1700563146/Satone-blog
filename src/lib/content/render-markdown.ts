import type { Element, Root as HastRoot } from "hast";
import type { Root as MdastRoot } from "mdast";
import rehypeSlug from "rehype-slug";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified, type Plugin } from "unified";
import { visit } from "unist-util-visit";
import { siteConfig } from "../config";
import {
  ContentValidationError,
  type ContentIssue,
  type TocEntry,
} from "./schema";

export interface RenderOptions {
  /** 出错信息中使用的路径。 */
  sourcePath?: string;
  /** 站点地址，用于区分站内链接与外部链接；默认取 siteConfig.url。 */
  siteUrl?: string;
}

export interface RenderedMarkdown {
  html: string;
  toc: TocEntry[];
}

const SAFE_PROTOCOLS = new Set(["http", "https", "mailto", "tel"]);

/**
 * 判断链接/图片地址是否安全。
 *
 * 允许：http、https、mailto、tel、站内绝对路径（/...）、锚点与相对路径。
 * 拒绝：javascript/vbscript/data/file 等协议、协议相对地址（//host）、
 * 反斜杠路径，以及用空白/控制字符混淆的协议。
 */
export function isSafeUrl(rawUrl: string): boolean {
  const url = rawUrl.trim();
  if (url.length === 0) return false;
  if (url.includes("\\")) return false;
  if (url.startsWith("#")) return true;
  if (url.startsWith("//")) return false;
  if (url.startsWith("/")) return true;

  const compact = url.replace(/[\u0000- \u007f]+/g, "");
  const scheme = /^([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(compact);
  if (scheme === null) return true;
  return SAFE_PROTOCOLS.has(scheme[1].toLowerCase());
}

function truncate(value: string, maxLength = 80): string {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength)}…`;
}

function collectMarkdownIssues(tree: MdastRoot, sourcePath: string): ContentIssue[] {
  const issues: ContentIssue[] = [];

  visit(tree, "html", (node) => {
    issues.push({
      code: "MARKDOWN_RAW_HTML",
      severity: "warning",
      sourcePath,
      line: node.position?.start.line,
      message: "正文包含原始 HTML；出于安全考虑不会渲染，如需展示标签请放进代码块",
    });
  });

  visit(tree, "link", (node) => {
    if (isSafeUrl(node.url)) return;
    issues.push({
      code: "MARKDOWN_UNSAFE_URL",
      severity: "error",
      sourcePath,
      line: node.position?.start.line,
      message: `链接地址不安全：${truncate(node.url)}（仅允许 http/https/mailto/tel 与站内相对路径）`,
    });
  });

  visit(tree, "image", (node) => {
    if (!isSafeUrl(node.url)) {
      issues.push({
        code: "MARKDOWN_UNSAFE_URL",
        severity: "error",
        sourcePath,
        line: node.position?.start.line,
        message: `图片地址不安全：${truncate(node.url)}`,
      });
    }
    if (typeof node.alt !== "string" || node.alt.trim().length === 0) {
      issues.push({
        code: "MARKDOWN_MISSING_ALT",
        severity: "error",
        sourcePath,
        line: node.position?.start.line,
        message: "图片必须填写替代文本（alt），例如 ![页面截图](/images/screenshot.png)",
      });
    }
  });

  return issues;
}

/** 只做静态检查、不渲染：返回原始 HTML、危险链接与缺失 alt 等问题。 */
export function analyzeMarkdown(source: string, sourcePath = "<markdown>"): ContentIssue[] {
  const tree = unified().use(remarkParse).use(remarkGfm).parse(source);
  return collectMarkdownIssues(tree as MdastRoot, sourcePath);
}

function remarkValidateMarkdown(sourcePath: string): Plugin<[], MdastRoot> {
  return () => (tree) => {
    const errors = collectMarkdownIssues(tree, sourcePath).filter(
      (issue) => issue.severity === "error",
    );
    if (errors.length > 0) {
      throw new ContentValidationError(errors);
    }
  };
}

function textContent(node: Element): string {
  let text = "";
  visit(node, "text", (textNode) => {
    text += textNode.value;
  });
  return text;
}

function rehypeCollectToc(toc: TocEntry[]): Plugin<[], HastRoot> {
  return () => (tree) => {
    visit(tree, "element", (node) => {
      if (node.tagName !== "h2" && node.tagName !== "h3") return;
      const id = node.properties?.id;
      if (typeof id !== "string" || id.length === 0) return;
      // GFM 脚注区的标题由 remark-rehype 生成，不属于文章目录
      if (id === "footnote-label") return;
      const depth: 2 | 3 = node.tagName === "h2" ? 2 : 3;
      toc.push({ id, text: textContent(node).trim(), depth });
    });
  };
}

function toOrigin(siteUrl: string): string | null {
  try {
    return new URL(siteUrl).origin;
  } catch {
    return null;
  }
}

function isExternalHttpUrl(url: string, origin: string | null): boolean {
  if (!/^https?:\/\//i.test(url)) return false;
  if (origin === null) return true;
  try {
    return new URL(url).origin !== origin;
  } catch {
    return true;
  }
}

function rehypeLinkAttributes(siteUrl: string): Plugin<[], HastRoot> {
  return () => (tree) => {
    const origin = toOrigin(siteUrl);

    visit(tree, "element", (node) => {
      if (node.tagName === "a") {
        const href = node.properties?.href;
        if (typeof href === "string" && isExternalHttpUrl(href, origin)) {
          node.properties = {
            ...node.properties,
            target: "_blank",
            rel: ["noopener", "noreferrer"],
          };
        }
      } else if (node.tagName === "img") {
        node.properties = {
          ...node.properties,
          loading: "lazy",
          decoding: "async",
        };
      }
    });
  };
}

/**
 * 把正文 Markdown 渲染为 HTML，并提取 h2/h3 目录。
 *
 * 安全策略：
 * - 不开启 allowDangerousHtml，原始 HTML 会被丢弃（analyzeMarkdown 会给出警告）；
 * - 危险链接/图片地址会直接抛出 ContentValidationError；
 * - 外部链接自动加 target="_blank" 与 rel="noopener noreferrer"；
 * - 图片默认懒加载。
 */
export async function renderMarkdown(
  source: string,
  options: RenderOptions = {},
): Promise<RenderedMarkdown> {
  const sourcePath = options.sourcePath ?? "<markdown>";
  const siteUrl = options.siteUrl ?? siteConfig.url;
  const toc: TocEntry[] = [];

  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkValidateMarkdown(sourcePath))
    .use(remarkRehype)
    .use(rehypeSlug)
    .use(rehypeCollectToc(toc))
    .use(rehypeLinkAttributes(siteUrl))
    .use(rehypeStringify);

  const file = await processor.process(source);
  return { html: String(file), toc };
}

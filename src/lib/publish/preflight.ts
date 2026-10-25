/**
 * 上传前的 Markdown 预检（浏览器可用，不依赖 unified）。
 *
 * 为什么不用 `analyzeMarkdown`：它会把 unified/remark/rehype 打进客户端包（几百 KB）。
 * 这里只做"最常犯、后果最重"的两类检查——危险链接与图片缺少 alt——用与构建期
 * 一致的 allowlist 语义。**构建期的检查仍然是权威**（`npm run build` 会跑完整管线），
 * 这里只是让问题在提交前就暴露，避免推上去之后构建失败。
 */

const SAFE_PROTOCOLS = new Set(["http", "https", "mailto", "tel"]);

/** 与 `render-markdown.ts` 的 `isSafeUrl` 语义保持一致（见 ADR-013）。 */
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
  return SAFE_PROTOCOLS.has((scheme[1] ?? "").toLowerCase());
}

export interface PreflightIssue {
  severity: "error" | "warning";
  message: string;
  /** 1 起始的行号。 */
  line?: number;
}

export interface MarkdownStats {
  /** 去掉代码块与空白后的字符数（中文按字算）。 */
  characters: number;
  images: number;
  links: number;
  codeBlocks: number;
  headings: number;
}

export interface PreflightResult {
  issues: PreflightIssue[];
  stats: MarkdownStats;
}

const IMAGE_PATTERN = /!\[([^\]]*)\]\(([^)\s]+)/g;
const LINK_PATTERN = /(?<!!)\[[^\]]*\]\(([^)\s]+)/g;
const HTML_PATTERN = /<[a-zA-Z!/][^>]*>/;
const INLINE_CODE_PATTERN = /`[^`]*`/g;

export function preflightMarkdown(source: string): PreflightResult {
  const issues: PreflightIssue[] = [];
  let inCodeBlock = false;

  source.split("\n").forEach((text, index) => {
    const line = index + 1;

    if (/^\s*```/.test(text)) {
      inCodeBlock = !inCodeBlock;
      return;
    }
    if (inCodeBlock) return;

    for (const match of text.matchAll(IMAGE_PATTERN)) {
      const alt = (match[1] ?? "").trim();
      const url = match[2] ?? "";

      if (alt.length === 0) {
        issues.push({
          severity: "error",
          line,
          message: "图片缺少替代文本（alt），例如 ![截图](/images/x.png)",
        });
      }
      if (!isSafeUrl(url)) {
        issues.push({
          severity: "error",
          line,
          message: `图片地址不安全：${url}`,
        });
      }
    }

    for (const match of text.matchAll(LINK_PATTERN)) {
      const url = match[1] ?? "";
      if (!isSafeUrl(url)) {
        issues.push({
          severity: "error",
          line,
          message: `链接地址不安全：${url}`,
        });
      }
    }

    // 行内代码里的尖括号不算 HTML
    const withoutInlineCode = text.replace(INLINE_CODE_PATTERN, "");
    if (HTML_PATTERN.test(withoutInlineCode)) {
      issues.push({
        severity: "warning",
        line,
        message:
          "正文里有原始 HTML，构建时会被丢弃（需要展示标签请放进代码块）",
      });
    }
  });

  const withoutFences = source.replace(/```[\s\S]*?```/g, "");
  const stats: MarkdownStats = {
    characters: withoutFences.replace(/\s+/g, "").length,
    images: [...source.matchAll(IMAGE_PATTERN)].length,
    links: [...source.matchAll(LINK_PATTERN)].length,
    codeBlocks: Math.floor((source.match(/```/g)?.length ?? 0) / 2),
    headings: (source.match(/^#{1,6}\s/gm) ?? []).length,
  };

  return { issues, stats };
}

/** 有 error 就不允许提交。 */
export function hasBlockingIssue(issues: readonly PreflightIssue[]): boolean {
  return issues.some((issue) => issue.severity === "error");
}

/** 格式化一行，供 UI 与测试使用。 */
export function formatPreflightIssue(issue: PreflightIssue): string {
  const location = issue.line === undefined ? "" : `第 ${issue.line} 行：`;
  return `${location}${issue.message}`;
}

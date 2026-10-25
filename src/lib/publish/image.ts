/**
 * 图片上传的纯逻辑（浏览器与 Node 都能用）。
 *
 * 图片不经过任何服务端：直接以 base64 提交到仓库的 `public/images/posts/`，
 * 由构建把 `public/` 原样复制到 `out/`（ADR-030）。文件名统一带上文章 slug 前缀，
 * 好处是同一篇文章的图片聚在一起，也天然降低重名概率。
 */

/** 允许的图片扩展名（与 `next` 静态托管支持的类型一致，svg 便于图标但需自担风险）。 */
const ALLOWED_EXTENSIONS = new Set([
  "png",
  "jpg",
  "jpeg",
  "webp",
  "gif",
  "avif",
  "svg",
]);

/** 单张图片上限：再大就不适合塞进 Git 仓库（GitHub Contents API 也会变慢）。 */
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
export const MAX_IMAGE_LABEL = "2 MB";

/** 仓库内的图片目录（相对仓库根）与对应的公开 URL 前缀。 */
export const IMAGE_DIR = "public/images/posts";
export const IMAGE_URL_PREFIX = "/images/posts";

export function imageExtension(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot === -1 ? "" : fileName.slice(dot + 1).toLowerCase();
}

export function isSupportedImageName(fileName: string): boolean {
  return ALLOWED_EXTENSIONS.has(imageExtension(fileName));
}

/**
 * 把原始文件名变成仓库里安全的文件名：只保留小写字母/数字/连字符，扩展名走白名单。
 *
 * 中文文件名会退化成 `image.<ext>`（图片名对 SEO 没意义，靠 alt 文本更实在）。
 */
export function sanitizeImageName(fileName: string): string {
  const extension = imageExtension(fileName);
  const base = fileName.replace(/\.[^.]+$/, "");
  const safeBase =
    base
      .normalize("NFC")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "image";
  return ALLOWED_EXTENSIONS.has(extension)
    ? `${safeBase}.${extension}`
    : safeBase;
}

export interface ImagePlan {
  /** 用户拖进来的原始文件名。 */
  fileName: string;
  /** 仓库里实际使用的文件名（带 slug 前缀）。 */
  repoFileName: string;
  /** 仓库相对路径，用于 CONTENTS API。 */
  repoPath: string;
  /** 站点上的公开 URL。 */
  url: string;
  /** 建议的 alt 文本（来自文件名）。 */
  alt: string;
  /** 可直接粘进正文的 Markdown。 */
  snippet: string;
}

export type ImagePlanResult =
  { ok: true; plan: ImagePlan } | { ok: false; error: string };

/** 由文章 slug + 原始文件名生成上传计划；同时做类型与体积校验。 */
export function buildImagePlan(
  slug: string,
  file: { name: string; size: number },
): ImagePlanResult {
  if (!isSupportedImageName(file.name)) {
    return {
      ok: false,
      error: `${file.name}：不支持的图片类型（只接受 ${[...ALLOWED_EXTENSIONS].join(" / ")}）`,
    };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return {
      ok: false,
      error: `${file.name}：超过 ${MAX_IMAGE_LABEL}（${formatBytes(file.size)}），请压缩后重试`,
    };
  }

  const safeName = sanitizeImageName(file.name);
  const repoFileName = safeName.startsWith(`${slug}-`)
    ? safeName
    : `${slug}-${safeName}`;
  const alt = safeName
    .replace(/\.[^.]+$/, "")
    .replace(/-+/g, " ")
    .trim();

  return {
    ok: true,
    plan: {
      fileName: file.name,
      repoFileName,
      repoPath: `${IMAGE_DIR}/${repoFileName}`,
      url: `${IMAGE_URL_PREFIX}/${repoFileName}`,
      alt: alt.length > 0 ? alt : "文章配图",
      snippet: `![${alt.length > 0 ? alt : "文章配图"}](${IMAGE_URL_PREFIX}/${repoFileName})`,
    },
  };
}

/** UTF-8 / 二进制安全的 base64 编码（`btoa` 只接受 latin1）。 */
export function toBase64Bytes(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** 把图片片段追加到正文末尾（保持一个空行分隔）。 */
export function appendSnippet(body: string, snippet: string): string {
  const trimmed = body.replace(/\s+$/, "");
  return trimmed.length === 0 ? `${snippet}\n` : `${trimmed}\n\n${snippet}\n`;
}

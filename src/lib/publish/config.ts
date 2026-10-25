/**
 * 发布目标仓库配置（浏览器端上传页与本地脚本共用）。
 *
 * 这里只放公开信息：owner/repo/branch/目录。**不要**在这里放 token——
 * token 只存在于浏览器 localStorage 或环境变量里（见 ADR-030）。
 */
export const PUBLISH_TARGET = {
  owner: "1700563146",
  repo: "Satone-blog",
  branch: "main",
  /** 文章目录（仓库相对路径，不带首尾斜杠）。 */
  postsDir: "content/posts",
  /** localStorage 里保存 token 的键名。 */
  tokenStorageKey: "satoneBlog:githubToken",
} as const;

export type PublishTarget = typeof PUBLISH_TARGET;

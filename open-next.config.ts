import { defineCloudflareConfig } from "@opennextjs/cloudflare";

/**
 * Cloudflare 适配配置（OpenNext）。
 *
 * 本站是全静态产出：文章在构建期渲染成 HTML，没有 ISR / 按需重验证，
 * 因此不配置 R2 增量缓存与 tag 缓存，也不需要额外的基础设施。
 * 如果以后要启用 ISR，再按 https://opennext.js.org/cloudflare/caching 添加缓存覆盖。
 */
export default defineCloudflareConfig();

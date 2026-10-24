/** 去掉结尾斜杠，避免拼接出 //path。 */
function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

export interface SiteUrlEnv {
  SITE_URL?: string | undefined;
  /** Vercel 注入：项目的生产域名（所有部署都可读到）。 */
  VERCEL_PROJECT_PRODUCTION_URL?: string | undefined;
  /** Vercel 注入：当前这次部署自己的域名（Preview 部署会不同）。 */
  VERCEL_URL?: string | undefined;
  /** 允许直接把 `process.env` 传进来。 */
  [key: string]: string | undefined;
}

/**
 * 解析站点对外地址（见 ADR-025）。
 *
 * 优先级：显式 `SITE_URL` → Vercel 的生产域名 → 当前部署域名 → 本地地址。
 *
 * 之所以要回退：canonical、sitemap、RSS 里的绝对地址都取自这里，
 * 一旦忘了配 `SITE_URL`，整站会把自己的正式地址写成 localhost，
 * 搜索引擎因此可能判定 canonical 指向别处而丢弃页面。Vercel 本身已经把
 * 域名注入到环境变量里，直接用它比依赖人工配置更可靠。
 */
export function resolveSiteUrl(env: SiteUrlEnv): string {
  const explicit = env.SITE_URL?.trim();
  if (explicit !== undefined && explicit.length > 0) {
    return stripTrailingSlash(explicit);
  }

  const vercelHost =
    env.VERCEL_PROJECT_PRODUCTION_URL?.trim() || env.VERCEL_URL?.trim() || "";
  if (vercelHost.length > 0) {
    return `https://${stripTrailingSlash(vercelHost)}`;
  }

  return "http://localhost:3000";
}

/**
 * 站点配置的唯一来源。
 * 跨页面共享的站点级配置加在这里，不要在组件中重复写死。
 */
export const siteConfig = {
  name: "Sato Blog",
  description: "Sato 的个人博客：记录开发、阅读与生活。",
  /** 用于 <html lang>、RSS 的 <language> 与日期展示约定。 */
  locale: "zh-CN",
  author: "Sato",
  /** 站点对外地址，决定 canonical / sitemap / RSS 里的绝对链接。 */
  url: resolveSiteUrl(process.env),
  /**
   * RSS 的 pubDate 需要一个具体时刻，而文章 date 只是"日历上的一天"（ADR-010）。
   * 这里固定按站点所在时区把 00:00 当作该日的时刻，构建机所在时区不参与计算。
   */
  timeZoneOffset: "+08:00",
} as const;

/** RSS 订阅地址；同时用于页面 <link rel="alternate"> 自动发现。 */
export const RSS_PATH = "/feed.xml";

/** 主导航条目 */
export const navItems = [
  { label: "首页", href: "/" },
  { label: "文章", href: "/posts" },
  { label: "搜索", href: "/search" },
  { label: "关于", href: "/about" },
  { label: "友链", href: "/friends" },
] as const;

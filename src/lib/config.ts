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
  /** 站点对外地址；去掉结尾斜杠，避免拼接出 //path。 */
  url: (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/+$/, ""),
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
  { label: "关于", href: "/about" },
  { label: "友链", href: "/friends" },
] as const;

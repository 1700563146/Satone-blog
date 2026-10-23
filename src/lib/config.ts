/**
 * 站点配置的唯一来源。
 * 跨页面共享的站点级配置加在这里，不要在组件中重复写死。
 */
export const siteConfig = {
  name: "Sato Blog",
  description: "Sato 的个人博客：记录开发、阅读与生活。",
  locale: "zh-CN",
  url: process.env.SITE_URL ?? "http://localhost:3000",
} as const;

/** 主导航条目 */
export const navItems = [
  { label: "首页", href: "/" },
  { label: "文章", href: "/posts" },
  { label: "关于", href: "/about" },
  { label: "友链", href: "/friends" },
] as const;

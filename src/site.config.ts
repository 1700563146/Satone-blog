export const SITE = {
  name: 'Satone',
  title: 'Satone_沢山聽 | 视觉博客与作品集',
  description: '一个记录创作、技术与视觉实验的个人静态博客。',
  url: 'https://1700563146.github.io/Satone-blog',
  author: 'Satone_沢山聽',
  locale: 'zh-CN',
  defaultImage: '/og-default.svg',
  nav: [
    { label: '首页', href: '/' },
    { label: '博客', href: '/blog/' },
    { label: '作品', href: '/projects/' },
  ],
  socials: [
    { label: 'GitHub', href: 'https://github.com/1700563146' },
    { label: 'RSS', href: '/rss.xml' },
  ],
};

export type SiteNavItem = (typeof SITE.nav)[number];

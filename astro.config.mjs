import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  // 改成你的 GitHub Pages 地址
  site: 'https://1700563146.github.io',
  // 添加 base，指向你的仓库名
  base: '/Satone-blog',
  output: 'static',
  trailingSlash: 'always',
  integrations: [sitemap()],
});

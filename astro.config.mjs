import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://1700563146.github.io',  // ✅ 改成你的实际地址
  base: '/Satone-blog',                   // ✅ 保留这个
  output: 'static',
  trailingSlash: 'always',
  integrations: [sitemap()],
});

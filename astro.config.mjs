import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://1700563146.github.io',
  base: '/Satone-blog',
  output: 'static',
  trailingSlash: 'always',
  integrations: [sitemap()],
});

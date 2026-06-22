import type { APIRoute } from 'astro';
import { SITE } from '../site.config';

export const GET: APIRoute = () => {
  const sitemap = new URL('/sitemap-index.xml', SITE.url).href;

  return new Response(`User-agent: *
Allow: /

Sitemap: ${sitemap}
`, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
};

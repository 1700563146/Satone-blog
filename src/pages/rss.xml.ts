import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { SITE } from '../site.config';
import { entrySlug, sortByDateDesc } from '../utils/content';

export async function GET() {
  const posts = sortByDateDesc(await getCollection('blog', ({ data }) => !data.draft));

  return rss({
    title: SITE.title,
    description: SITE.description,
    site: SITE.url,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      link: `/blog/${entrySlug(post.id)}/`,
    })),
  });
}

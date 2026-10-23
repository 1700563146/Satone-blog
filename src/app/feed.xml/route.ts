import { getPosts } from "@/lib/content";
import { RSS_CONTENT_TYPE, buildRssFeed } from "@/lib/seo/rss";

/**
 * RSS 2.0 订阅源：`/feed.xml`。
 *
 * 只读取带缓存的访问层，因此本路由在构建时即可预渲染（不访问任何请求期 API）；
 * 文章更新后重新构建即可刷新。
 */
export async function GET() {
  const posts = await getPosts();

  return new Response(buildRssFeed(posts), {
    headers: {
      "Content-Type": RSS_CONTENT_TYPE,
      "X-Content-Type-Options": "nosniff",
    },
  });
}

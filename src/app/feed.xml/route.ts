import { getPosts } from "@/lib/content";
import { RSS_CONTENT_TYPE, buildRssFeed } from "@/lib/seo/rss";

/**
 * RSS 2.0 订阅源：`/feed.xml`。
 *
 * 纯静态导出下这一路由在构建时执行一次，产出 out/feed.xml（ADR-027）。
 * 注意：静态托管通常按扩展名给 Content-Type（application/xml），
 * 因此订阅器实际收到的不一定是 application/rss+xml，这不影响解析。
 */
export const dynamic = "force-static";

export async function GET() {
  const posts = await getPosts();

  return new Response(buildRssFeed(posts), {
    headers: {
      "Content-Type": RSS_CONTENT_TYPE,
      "X-Content-Type-Options": "nosniff",
    },
  });
}

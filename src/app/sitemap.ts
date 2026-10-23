import type { MetadataRoute } from "next";

import { getCategories, getPosts, getTags } from "@/lib/content";
import { postHref, taxonomyHref } from "@/lib/content/schema";
import { absoluteUrl } from "@/lib/seo/metadata";

/**
 * sitemap.xml。
 *
 * 只包含公开内容：草稿与未发布文章在访问层就被过滤掉了（ADR-012），
 * 因此这里不需要再做一次状态判断。
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, categories, tags] = await Promise.all([
    getPosts(),
    getCategories(),
    getTags(),
  ]);

  const staticEntries: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), changeFrequency: "daily", priority: 1 },
    { url: absoluteUrl("/posts"), changeFrequency: "daily", priority: 0.8 },
    { url: absoluteUrl("/about"), changeFrequency: "monthly", priority: 0.5 },
  ];

  const postEntries: MetadataRoute.Sitemap = posts.map((post) => ({
    url: absoluteUrl(postHref(post.slug)),
    lastModified: post.updatedAt ?? post.date,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  const taxonomyEntries: MetadataRoute.Sitemap = [...categories, ...tags].map(
    (term) => ({
      url: absoluteUrl(taxonomyHref(term.kind, term.slug)),
      changeFrequency: "weekly",
      priority: 0.4,
    }),
  );

  return [...staticEntries, ...postEntries, ...taxonomyEntries];
}

import type { MetadataRoute } from "next";

import { siteConfig } from "@/lib/config";
import { absoluteUrl } from "@/lib/seo/metadata";

/** robots.txt：允许抓取全部公开页面，并声明 sitemap 位置。 */
// 纯静态导出下元数据路由必须显式声明为静态（ADR-027）
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/" }],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: siteConfig.url,
  };
}

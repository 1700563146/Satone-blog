import type { MetadataRoute } from "next";

import { siteConfig } from "@/lib/config";
import { absoluteUrl } from "@/lib/seo/metadata";

/** robots.txt：允许抓取全部公开页面，并声明 sitemap 位置。 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/" }],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: siteConfig.url,
  };
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { siteConfig } from "@/lib/config";
import { getPage } from "@/lib/content";
import { formatPostDate } from "@/lib/content/schema";
import { buildPageMetadata } from "@/lib/seo/metadata";

/** 关于页正文来自 content/pages/about.md；文件缺失时返回 404 而不是空白页。 */
export const metadata: Metadata = buildPageMetadata({
  title: "关于",
  description: `关于 ${siteConfig.name} 与作者。`,
  path: "/about",
});

export default async function AboutPage() {
  const page = await getPage("about");
  if (page === null) notFound();

  return (
    <div className="pb-8">
      <PageHeader
        title={page.title ?? "关于"}
        description={page.description}
        meta={
          page.updatedAt === undefined ? undefined : (
            <span>更新于 {formatPostDate(page.updatedAt)}</span>
          )
        }
      />
      <div className="prose" dangerouslySetInnerHTML={{ __html: page.html }} />
    </div>
  );
}

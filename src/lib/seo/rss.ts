import { siteConfig } from "../config";
import { absoluteUrl } from "./metadata";
import { postHref, type PostSummary } from "../content/schema";

/** RSS 响应的 Content-Type。 */
export const RSS_CONTENT_TYPE = "application/rss+xml; charset=utf-8";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

const CIVIL_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/** 转义 XML 文本与属性值，避免标题里的 & < > 破坏文档结构。 */
export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * 把"日历日期"转成 RFC 822 时间（RSS `pubDate` 需要的格式）。
 *
 * 文章日期不含时刻（ADR-010），这里统一取站点时区的 00:00；
 * 星期与月份用 UTC 分量计算，避免构建机时区改变结果。
 */
export function toRfc822Date(
  civilDate: string,
  offset: string = siteConfig.timeZoneOffset,
): string {
  const match = CIVIL_DATE_PATTERN.exec(civilDate);
  if (match === null) return "";

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(date.getTime())) return "";

  // RFC 822 的时区写成 +0800；配置里用 ISO 风格的 +08:00，这里去掉冒号
  const compactOffset = offset.replace(":", "");

  return `${WEEKDAYS[date.getUTCDay()]}, ${String(day).padStart(2, "0")} ${MONTHS[month - 1]} ${year} 00:00:00 ${compactOffset}`;
}

/** 生成 RSS 2.0 文档；只接收已过滤的公开文章摘要。 */
export function buildRssFeed(posts: readonly PostSummary[]): string {
  const channelUrl = absoluteUrl("/");
  const latest = posts[0];

  const items = posts.map((post) => {
    const url = absoluteUrl(postHref(post.slug));
    const categories = [...post.categories, ...post.tags]
      .map((name) => `      <category>${escapeXml(name)}</category>`)
      .join("\n");
    return [
      "    <item>",
      `      <title>${escapeXml(post.title)}</title>`,
      `      <link>${escapeXml(url)}</link>`,
      `      <guid isPermaLink="true">${escapeXml(url)}</guid>`,
      `      <pubDate>${toRfc822Date(post.date)}</pubDate>`,
      `      <description>${escapeXml(post.description)}</description>`,
      categories,
      "    </item>",
    ]
      .filter((line) => line.length > 0)
      .join("\n");
  });

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0">',
    "  <channel>",
    `    <title>${escapeXml(siteConfig.name)}</title>`,
    `    <link>${escapeXml(channelUrl)}</link>`,
    `    <description>${escapeXml(siteConfig.description)}</description>`,
    `    <language>${escapeXml(siteConfig.locale)}</language>`,
    ...(latest === undefined
      ? []
      : [`    <lastBuildDate>${toRfc822Date(latest.date)}</lastBuildDate>`]),
    ...items,
    "  </channel>",
    "</rss>",
    "",
  ].join("\n");
}

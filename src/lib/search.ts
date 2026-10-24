import type { PostSummary } from "./content/schema";

/**
 * 站内搜索（纯函数，可单测）。
 *
 * 站点是纯静态导出（ADR-027），所以搜索必须是"构建期生成索引 + 客户端过滤"：
 * 没有搜索服务、没有 API 路由，也不需要网络请求。
 */

/** 索引里保存的字段：够用即可，不要把正文塞进来（体积会随文章量爆炸）。 */
export interface SearchEntry {
  slug: string;
  title: string;
  description: string;
  date: string;
  categories: string[];
  tags: string[];
}

export interface SearchHit extends SearchEntry {
  /** 命中得分，越大越相关；同分按日期倒序。 */
  score: number;
}

/** 字段权重：标题最重要，其次分类/标签，再是摘要，最后是 slug。 */
const FIELD_WEIGHTS = {
  title: 5,
  taxonomy: 3,
  description: 2,
  slug: 1,
} as const;

/** 从公开文章摘要生成索引（顺序与列表页一致：日期倒序）。 */
export function buildSearchIndex(posts: readonly PostSummary[]): SearchEntry[] {
  return posts.map((post) => ({
    slug: post.slug,
    title: post.title,
    description: post.description,
    date: post.date,
    categories: [...post.categories],
    tags: [...post.tags],
  }));
}

/** 关键词拆分：按空白切分并小写化；中文没有空格，所以也支持整段作为单个词。 */
export function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter((term) => term.length > 0);
}

function fieldScore(entry: SearchEntry, term: string): number {
  if (entry.title.toLowerCase().includes(term)) return FIELD_WEIGHTS.title;
  if (
    [...entry.categories, ...entry.tags].join(" ").toLowerCase().includes(term)
  ) {
    return FIELD_WEIGHTS.taxonomy;
  }
  if (entry.description.toLowerCase().includes(term))
    return FIELD_WEIGHTS.description;
  if (entry.slug.toLowerCase().includes(term)) return FIELD_WEIGHTS.slug;
  return 0;
}

/**
 * 在索引中检索。规则：
 *
 * - 多个关键词是 **AND** 关系（都要命中），得分取各词最高权重之和；
 * - 空查询返回空数组（页面据此展示引导态）；
 * - 同一得分按日期倒序、再按标题排序，保证结果稳定。
 */
export function searchPosts(
  index: readonly SearchEntry[],
  query: string,
  limit = 20,
): SearchHit[] {
  const terms = tokenize(query);
  if (terms.length === 0) return [];

  const hits: SearchHit[] = [];
  for (const entry of index) {
    let score = 0;
    let matchedTerms = 0;

    for (const term of terms) {
      const termScore = fieldScore(entry, term);
      if (termScore > 0) {
        matchedTerms += 1;
        score += termScore;
      }
    }

    if (matchedTerms !== terms.length) continue;
    hits.push({ ...entry, score });
  }

  hits.sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score;
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return a.title.localeCompare(b.title, "zh-CN");
  });

  return hits.slice(0, limit);
}

/** 高亮片段：把文本按命中的关键词切成"匹配 / 未匹配"的片段。 */
export interface HighlightSegment {
  text: string;
  match: boolean;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * 把文本按查询词切段，供界面用 `<mark>` 标记。
 *
 * 长词优先匹配，避免短词先把长词切碎；大小写不敏感。
 */
export function highlightSegments(
  text: string,
  query: string,
): HighlightSegment[] {
  const terms = tokenize(query)
    .filter((term) => term.length > 0)
    .sort((a, b) => b.length - a.length);

  if (text.length === 0 || terms.length === 0) return [{ text, match: false }];

  const pattern = terms.map(escapeRegExp).join("|");
  const parts = text.split(new RegExp(`(${pattern})`, "gi"));
  const matcher = new RegExp(`^(?:${pattern})$`, "i");

  return parts
    .filter((part) => part.length > 0)
    .map((part) => ({ text: part, match: matcher.test(part) }));
}

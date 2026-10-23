/**
 * 生成 `generateStaticParams` 的返回值。
 *
 * 使用 Cache Components 时，`generateStaticParams` 必须至少返回一个参数，
 * 空数组会让构建直接失败（next docs: empty-generate-static-params）。
 * 因此在"还没有任何已发布内容"的仓库里返回一个不可达的占位 slug：
 * 该路径会走到 `notFound()`，既不会伪造内容，也不会阻塞空博客的构建。
 */
export const PLACEHOLDER_STATIC_SLUG = "__placeholder__";

export function toStaticSlugParams(
  slugs: readonly string[],
): { slug: string }[] {
  if (slugs.length === 0) return [{ slug: PLACEHOLDER_STATIC_SLUG }];
  return slugs.map((slug) => ({ slug }));
}

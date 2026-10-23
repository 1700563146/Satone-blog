import Link from "next/link";

import { taxonomyHref, type TaxonomyKind } from "@/lib/content/schema";

type TaxonomyLinksProps = {
  kind: TaxonomyKind;
  names: readonly string[];
  /** 分类用浅色底，标签用 # 前缀的描边样式。 */
  variant?: "category" | "tag";
};

/** 分类/标签链接组；没有条目时不渲染任何内容。 */
export function TaxonomyLinks({
  kind,
  names,
  variant = "tag",
}: TaxonomyLinksProps) {
  if (names.length === 0) return null;

  return (
    <>
      {names.map((name) => (
        <Link
          key={`${kind}-${name}`}
          href={taxonomyHref(kind, name)}
          className={
            variant === "category"
              ? "rounded-control bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent transition-colors hover:bg-accent/20"
              : "rounded-control border border-border px-2.5 py-1 text-xs text-muted transition-colors hover:border-accent/40 hover:text-accent"
          }
        >
          {variant === "tag" ? `#${name}` : name}
        </Link>
      ))}
    </>
  );
}

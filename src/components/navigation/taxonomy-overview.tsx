import Link from "next/link";

import type { TaxonomySummary } from "@/lib/content/schema";

type TaxonomyOverviewProps = {
  title: string;
  terms: readonly TaxonomySummary[];
};

/** 分类/标签总览：条目带文章数，作为归档页的入口。 */
export function TaxonomyOverview({ title, terms }: TaxonomyOverviewProps) {
  if (terms.length === 0) return null;

  return (
    <section aria-label={title} className="mt-10">
      <h2 className="text-sm font-semibold tracking-tight text-muted">
        {title}
      </h2>
      <ul className="mt-3 flex flex-wrap gap-2">
        {terms.map((term) => (
          <li key={`${term.kind}-${term.name}`}>
            <Link
              href={term.href}
              className="flex items-center gap-1.5 glass-card px-3 py-1.5 text-sm text-muted transition-colors hover:text-accent"
            >
              <span>{term.name}</span>
              <span className="text-xs tabular-nums opacity-60">
                {term.count}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

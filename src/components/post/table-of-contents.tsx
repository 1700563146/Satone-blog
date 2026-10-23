import type { TocEntry } from "@/lib/content/schema";

/**
 * 文章目录：条目来自渲染阶段的 h2/h3，锚点 id 与之对应。
 * 移动端显示在正文上方，桌面端吸附在右侧（由详情页布局决定）。
 */
export function TableOfContents({ toc }: { toc: readonly TocEntry[] }) {
  if (toc.length === 0) return null;

  return (
    <nav aria-labelledby="toc-heading" className="glass-card px-5 py-4">
      <h2 id="toc-heading" className="text-sm font-semibold tracking-tight">
        目录
      </h2>
      <ul className="mt-3 space-y-2 text-sm">
        {toc.map((entry) => (
          <li key={entry.id} className={entry.depth === 3 ? "pl-4" : undefined}>
            <a
              href={`#${entry.id}`}
              className="text-muted transition-colors hover:text-accent"
            >
              {entry.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

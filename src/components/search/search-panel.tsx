"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useEffect, useMemo, useRef, useState } from "react";

import { formatPostDate, postHref } from "@/lib/content/schema";
import {
  highlightSegments,
  searchPosts,
  type HighlightSegment,
  type SearchEntry,
} from "@/lib/search";

/** 单次最多渲染多少条结果，避免文章多时一次塞进太多 DOM。 */
const RESULT_LIMIT = 20;

function Highlighted({ text, query }: { text: string; query: string }) {
  const segments: HighlightSegment[] = highlightSegments(text, query);

  return (
    <>
      {segments.map((segment, index) =>
        segment.match ? (
          <mark
            // 片段是稳定切分结果，顺序索引即可作为 key
            key={index}
            className="rounded-sm bg-accent/20 px-0.5 text-text"
          >
            {segment.text}
          </mark>
        ) : (
          <span key={index}>{segment.text}</span>
        ),
      )}
    </>
  );
}

const ITEM_CLASS =
  "block rounded-control border border-transparent px-4 py-3 transition-colors hover:border-accent/40 hover:bg-surface";
const ACTIVE_CLASS = "border-accent/40 bg-surface";

/**
 * 站内搜索面板（客户端组件）。
 *
 * 索引由服务端在构建期传进来，这里只做本地过滤；因此没有请求、没有 API、
 * 也没有 URL 参数依赖（静态导出下 `useSearchParams` 会带来额外的边界要求）。
 */
export function SearchPanel({ index }: { index: readonly SearchEntry[] }) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const inputId = useId();
  const hintId = useId();
  const resultsId = useId();

  const results = useMemo(
    () => searchPosts(index, query, RESULT_LIMIT),
    [index, query],
  );
  const activeResult =
    results.length === 0
      ? null
      : results[Math.min(activeIndex, results.length - 1)];

  // Ctrl/⌘ + K 快速聚焦搜索框（只在搜索页生效，不影响全站快捷键）
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "k")
        return;
      event.preventDefault();
      inputRef.current?.focus();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const openActive = () => {
    if (activeResult === null) return;
    router.push(postHref(activeResult.slug));
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) =>
        Math.min(current + 1, Math.max(results.length - 1, 0)),
      );
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => Math.max(current - 1, 0));
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      openActive();
      return;
    }
    if (event.key === "Escape") {
      setQuery("");
      setActiveIndex(0);
    }
  };

  const trimmed = query.trim();
  const countText =
    trimmed.length === 0
      ? ""
      : results.length === 0
        ? "没有匹配的文章"
        : `找到 ${results.length} 篇`;

  return (
    <div role="search" aria-label="站内搜索">
      <label htmlFor={inputId} className="sr-only">
        搜索文章
      </label>
      <input
        id={inputId}
        ref={inputRef}
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder="搜索标题、摘要、分类或标签…"
        autoComplete="off"
        spellCheck={false}
        aria-describedby={hintId}
        aria-controls={resultsId}
        className="w-full glass-card px-4 py-3 text-base text-text placeholder:text-muted/70 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
      />
      <p id={hintId} className="mt-2 text-xs text-muted">
        输入关键词即时过滤；↑ ↓ 选择、Enter 打开、Esc 清空。
      </p>

      {/* 结果数量用 aria-live 播报，视觉上不占位 */}
      <p aria-live="polite" className="sr-only">
        {countText}
      </p>

      <div id={resultsId} className="mt-6">
        {trimmed.length === 0 ? (
          <p className="glass-card px-5 py-8 text-center text-sm text-muted">
            输入关键词开始搜索，例如文章标题、分类「开发记录」或标签「Next.js」。
          </p>
        ) : results.length === 0 ? (
          <div className="glass-card px-5 py-8 text-center">
            <p className="text-sm font-medium">没有匹配「{trimmed}」的文章</p>
            <p className="mt-2 text-sm text-muted">
              试试更短的关键词，或者只搜标题里的词。
            </p>
          </div>
        ) : (
          <>
            <p className="text-xs text-muted" aria-hidden="true">
              {countText}
            </p>
            <ul className="mt-3 flex flex-col gap-2">
              {results.map((hit, index) => (
                <li key={hit.slug}>
                  <Link
                    href={postHref(hit.slug)}
                    onMouseEnter={() => setActiveIndex(index)}
                    onFocus={() => setActiveIndex(index)}
                    // 卡片里的日期/摘要/标签会让无障碍名称变成长段落，这里只播报标题与日期
                    aria-label={`${hit.title}，${formatPostDate(hit.date)}`}
                    className={`${ITEM_CLASS} ${hit.slug === activeResult?.slug ? ACTIVE_CLASS : ""}`}
                  >
                    <span className="text-xs text-muted">
                      {formatPostDate(hit.date)}
                    </span>
                    <span className="mt-1 block text-base font-medium">
                      <Highlighted text={hit.title} query={query} />
                    </span>
                    <span className="mt-1 block text-sm text-muted">
                      <Highlighted text={hit.description} query={query} />
                    </span>
                    {hit.categories.length === 0 &&
                    hit.tags.length === 0 ? null : (
                      <span className="mt-2 flex flex-wrap gap-2 text-xs text-muted">
                        {hit.categories.map((name) => (
                          <span key={`c-${name}`}>{name}</span>
                        ))}
                        {hit.tags.map((name) => (
                          <span key={`t-${name}`}>#{name}</span>
                        ))}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

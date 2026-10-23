import type { ReactNode } from "react";

type PagePlaceholderProps = {
  title: string;
  description?: ReactNode;
};

/** 阶段 1 的占位页面：只保证路由与布局可用，真实内容在后续阶段实现。 */
export function PagePlaceholder({ title, description }: PagePlaceholderProps) {
  return (
    <section className="mx-auto w-full max-w-(--content-width) py-16">
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      <div className="mt-6 glass-card px-6 py-5 text-muted">
        {description ?? "该页面将在后续阶段实现。"}
      </div>
    </section>
  );
}

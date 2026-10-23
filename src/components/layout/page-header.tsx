import type { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  description?: ReactNode;
  /** 标题下方的元信息（日期、分类、标签等）。 */
  meta?: ReactNode;
};

/** 前台页面统一的标题区：首页分区、列表页与详情页共用同一套字号与间距。 */
export function PageHeader({ title, description, meta }: PageHeaderProps) {
  return (
    <header className="pt-10 pb-8">
      <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
        {title}
      </h1>
      {description === undefined ? null : (
        <p className="mt-4 max-w-prose leading-relaxed text-muted">
          {description}
        </p>
      )}
      {meta === undefined ? null : (
        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted">
          {meta}
        </div>
      )}
    </header>
  );
}

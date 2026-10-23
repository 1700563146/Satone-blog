import type { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  description?: ReactNode;
};

/** 空数据状态：列表页、归档页在没有内容时统一使用。 */
export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="glass-card px-6 py-10 text-center">
      <p className="text-base font-medium">{title}</p>
      {description === undefined ? null : (
        <p className="mt-2 text-sm leading-relaxed text-muted">{description}</p>
      )}
    </div>
  );
}

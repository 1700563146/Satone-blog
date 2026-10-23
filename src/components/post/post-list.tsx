import { EmptyState } from "@/components/layout/empty-state";
import { PostCard } from "@/components/post/post-card";
import type { PostSummary } from "@/lib/content/schema";

type PostListProps = {
  posts: readonly PostSummary[];
  emptyTitle?: string;
  emptyDescription?: string;
};

/** 文章列表：空数据时用 EmptyState 说明原因，不渲染空的容器。 */
export function PostList({
  posts,
  emptyTitle = "还没有已发布的文章",
  emptyDescription = "在 content/posts/ 下新建 Markdown 文件，把 published 设为 true 即可出现在这里。",
}: PostListProps) {
  if (posts.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <ul className="flex flex-col gap-4">
      {posts.map((post) => (
        <li key={post.slug}>
          <PostCard post={post} />
        </li>
      ))}
    </ul>
  );
}

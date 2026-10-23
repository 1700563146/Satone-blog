import { collectPosts } from "../src/lib/content/read-posts";
import { analyzeMarkdown } from "../src/lib/content/render-markdown";
import { formatContentIssue, isPublished } from "../src/lib/content/schema";
import type { ContentIssue } from "../src/lib/content/schema";

function compareIssues(a: ContentIssue, b: ContentIssue): number {
  if (a.severity !== b.severity) return a.severity === "error" ? -1 : 1;
  if (a.sourcePath !== b.sourcePath)
    return a.sourcePath < b.sourcePath ? -1 : 1;
  return (a.line ?? 0) - (b.line ?? 0);
}

async function main(): Promise<void> {
  const { posts, issues } = await collectPosts();

  for (const post of posts) {
    issues.push(...analyzeMarkdown(post.content, post.sourcePath));
  }

  const publishedCount = posts.filter(isPublished).length;
  if (publishedCount === 0) {
    issues.push({
      code: "NO_PUBLIC_POSTS",
      severity: "warning",
      sourcePath: "content/posts",
      message: "没有已发布的文章，前台列表与 RSS 将为空",
    });
  }

  issues.sort(compareIssues);

  const errors = issues.filter((issue) => issue.severity === "error");
  const warnings = issues.filter((issue) => issue.severity === "warning");

  if (issues.length > 0) {
    const lines = issues.map((issue) => `  - ${formatContentIssue(issue)}`);
    const output = [
      `内容检查发现 ${errors.length} 个错误、${warnings.length} 个警告：`,
      ...lines,
    ].join("\n");
    if (errors.length > 0) {
      console.error(output);
    } else {
      console.warn(output);
    }
  }

  if (errors.length > 0) {
    console.error(
      `\n内容检查未通过：共 ${posts.length} 篇文章（已发布 ${publishedCount} 篇）。请修复上方错误后重试。`,
    );
    process.exitCode = 1;
    return;
  }

  console.log(
    `内容检查通过：共 ${posts.length} 篇文章（已发布 ${publishedCount} 篇，草稿/未发布 ${
      posts.length - publishedCount
    } 篇），${warnings.length} 个警告。`,
  );
}

main().catch((error: unknown) => {
  console.error(
    "内容校验脚本执行失败：",
    error instanceof Error ? error.message : error,
  );
  process.exitCode = 1;
});

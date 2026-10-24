import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { siteConfig } from "../src/lib/config";
import { formatContentIssue } from "../src/lib/content/schema";
import { collectPosts, POSTS_DIR } from "../src/lib/content/read-posts";
import {
  formatPostSource,
  preparePost,
  todayInOffset,
} from "../src/lib/content/publish";
import { parsePostSource } from "../src/lib/content/parse-frontmatter";
import { analyzeMarkdown } from "../src/lib/content/render-markdown";
import { ContentValidationError } from "../src/lib/content/schema";

const HELP = `用法：
  npm run publish -- <文章.md> [选项]

选项：
  --title <标题>        覆盖从正文一级标题推导出的标题
  --slug <slug>         覆盖从文件名推导出的 slug（小写字母/数字/连字符）
  --description <摘要>  覆盖从首段推导出的摘要（最多 200 字）
  --date <YYYY-MM-DD>   发布日期，默认按站点时区取今天
  --category <名称>     分类，可重复
  --tag <名称>          标签，可重复
  --draft               作为草稿发布（published: false, draft: true）
  --force               覆盖已存在的同名文章
  --dry-run             只校验并打印结果，不写文件、不提交
  --no-commit           写入文件但不提交
  --no-push             提交但不推送
  -h, --help            显示本帮助

示例：
  npm run publish -- D:/写作/我的第一篇.md --category 开发记录 --tag Next.js
`;

interface CliOptions {
  file?: string;
  title?: string;
  slug?: string;
  description?: string;
  date?: string;
  categories: string[];
  tags: string[];
  draft: boolean;
  force: boolean;
  dryRun: boolean;
  noCommit: boolean;
  noPush: boolean;
  help: boolean;
}

const VALUE_FLAGS = new Set([
  "title",
  "slug",
  "description",
  "date",
  "category",
  "tag",
]);
const BOOLEAN_FLAGS = new Set([
  "draft",
  "force",
  "dry-run",
  "no-commit",
  "no-push",
  "help",
  "h",
]);

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    categories: [],
    tags: [],
    draft: false,
    force: false,
    dryRun: false,
    noCommit: false,
    noPush: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index] ?? "";

    if (!arg.startsWith("--") && arg !== "-h") {
      if (options.file !== undefined) {
        throw new Error(`只能指定一个文件，多余参数：${arg}`);
      }
      options.file = arg;
      continue;
    }

    const name = arg.replace(/^--?/, "");
    if (BOOLEAN_FLAGS.has(name)) {
      if (name === "draft") options.draft = true;
      else if (name === "force") options.force = true;
      else if (name === "dry-run") options.dryRun = true;
      else if (name === "no-commit") options.noCommit = true;
      else if (name === "no-push") options.noPush = true;
      else options.help = true;
      continue;
    }

    if (!VALUE_FLAGS.has(name)) {
      throw new Error(`未知选项：${arg}（用 --help 查看用法）`);
    }

    const value = argv[index + 1];
    if (value === undefined || value.startsWith("--")) {
      throw new Error(`选项 ${arg} 缺少取值`);
    }
    index += 1;

    if (name === "title") options.title = value;
    else if (name === "slug") options.slug = value;
    else if (name === "description") options.description = value;
    else if (name === "date") options.date = value;
    else if (name === "category") options.categories.push(value);
    else options.tags.push(value);
  }

  return options;
}

function runGit(args: string[]): void {
  execFileSync("git", args, { stdio: "inherit" });
}

async function main(): Promise<void> {
  let options: CliOptions;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(
      `参数错误：${error instanceof Error ? error.message : String(error)}`,
    );
    process.exitCode = 1;
    return;
  }

  if (options.help || options.file === undefined) {
    console.log(HELP);
    process.exitCode = options.file === undefined && !options.help ? 1 : 0;
    return;
  }

  const sourcePath = path.resolve(options.file);
  let raw: string;
  try {
    raw = await readFile(sourcePath, "utf8");
  } catch (error) {
    console.error(
      `读取失败：${sourcePath}（${error instanceof Error ? error.message : String(error)}）`,
    );
    process.exitCode = 1;
    return;
  }

  let prepared;
  try {
    prepared = preparePost(raw, {
      filename: path.basename(sourcePath),
      fallbackDate: todayInOffset(siteConfig.timeZoneOffset),
      date: options.date,
      title: options.title,
      slug: options.slug,
      description: options.description,
      categories:
        options.categories.length > 0 ? options.categories : undefined,
      tags: options.tags.length > 0 ? options.tags : undefined,
      draft: options.draft,
    });
  } catch (error) {
    if (error instanceof ContentValidationError) {
      console.error("文章不符合内容规范：");
      for (const issue of error.issues)
        console.error(`  - ${formatContentIssue(issue)}`);
      console.error("修正后重试（或先跑 --dry-run 看推导结果）。");
    } else {
      console.error(
        `整备失败：${error instanceof Error ? error.message : String(error)}`,
      );
    }
    process.exitCode = 1;
    return;
  }

  const { frontmatter, body, warnings } = prepared;
  const finalSource = formatPostSource(frontmatter, body);
  const relativePath = path.posix.join(
    "content",
    "posts",
    `${frontmatter.slug}.md`,
  );

  // 用生产同一套校验器复核：确保写进去的内容一定能通过构建
  try {
    parsePostSource(finalSource, relativePath);
  } catch (error) {
    if (error instanceof ContentValidationError) {
      console.error("整备后的内容仍未通过校验（这通常是脚本的 bug）：");
      for (const issue of error.issues)
        console.error(`  - ${formatContentIssue(issue)}`);
    } else {
      console.error(error);
    }
    process.exitCode = 1;
    return;
  }

  const markdownIssues = analyzeMarkdown(body, relativePath);
  const markdownErrors = markdownIssues.filter(
    (issue) => issue.severity === "error",
  );
  if (markdownErrors.length > 0) {
    console.error("正文检查未通过：");
    for (const issue of markdownErrors)
      console.error(`  - ${formatContentIssue(issue)}`);
    process.exitCode = 1;
    return;
  }

  // slug 唯一性：草稿也参与（与构建期一致）
  const { posts } = await collectPosts();
  const conflict = posts.find((post) => post.slug === frontmatter.slug);
  const targetPath = path.join(POSTS_DIR, `${frontmatter.slug}.md`);
  if (conflict !== undefined && conflict.sourcePath !== relativePath) {
    console.error(
      `slug 冲突：${frontmatter.slug} 已被 ${conflict.sourcePath} 使用（草稿也算）。请用 --slug 换一个。`,
    );
    process.exitCode = 1;
    return;
  }

  const isUpdate = conflict !== undefined;

  if (warnings.length > 0) {
    console.log("已自动处理：");
    for (const warning of warnings) console.log(`  · ${warning}`);
  }
  for (const issue of markdownIssues)
    console.log(`  ! ${formatContentIssue(issue)}`);

  console.log(`\n文章：${frontmatter.title}`);
  console.log(`slug：${frontmatter.slug}`);
  console.log(`日期：${frontmatter.date}`);
  console.log(
    `状态：${frontmatter.published && !frontmatter.draft ? "已发布" : "草稿（不会出现在线上页面）"}`,
  );
  console.log(`写入：${relativePath}`);

  if (options.dryRun) {
    console.log("\n--- dry-run：以下内容将写入文件 ---\n");
    console.log(finalSource);
    return;
  }

  if (
    conflict !== undefined &&
    conflict.sourcePath === relativePath &&
    !options.force
  ) {
    console.error("\n目标文件已存在。确认要覆盖请加 --force。");
    process.exitCode = 1;
    return;
  }

  await writeFile(targetPath, finalSource, "utf8");
  console.log(`\n✓ 已写入 ${relativePath}`);

  if (options.noCommit) {
    console.log("已跳过提交（--no-commit）。");
    return;
  }

  const message = isUpdate
    ? `post(${frontmatter.slug}): 更新《${frontmatter.title}》`
    : `post(${frontmatter.slug}): 添加《${frontmatter.title}》`;

  try {
    runGit(["add", "--", relativePath]);
    runGit(["commit", "-m", message]);
  } catch {
    console.error("git 提交失败，请检查仓库状态后手动提交。");
    process.exitCode = 1;
    return;
  }

  if (options.noPush) {
    console.log("已跳过推送（--no-push）。");
    return;
  }

  try {
    runGit(["push", "origin", "main"]);
  } catch {
    console.error(
      "推送失败（检查网络或远程配置）。提交已在本地，可稍后手动 `git push`。",
    );
    process.exitCode = 1;
    return;
  }

  console.log(
    `\n✓ 已推送。CI 与部署会自动执行，通常 1~3 分钟后上线：${siteConfig.url}/posts/${frontmatter.slug}`,
  );
}

main().catch((error: unknown) => {
  console.error(
    "发布脚本执行失败：",
    error instanceof Error ? error.message : error,
  );
  process.exitCode = 1;
});

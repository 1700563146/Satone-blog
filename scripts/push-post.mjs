/**
 * 一键推送刚写完的文章。
 *
 * 只碰 src/content/posts/ 下面的东西（文章 + 图片），从不 `git add -A`，
 * 所以工作区里别的改动不会被顺手带走。
 *
 * 用法：
 *   pnpm post:push               把 src/content/posts 下的改动提交并推送
 *   pnpm post:push my-slug       只处理 my-slug 这一篇（含它的图片）
 *   pnpm post:push --dry-run     只打印要做什么，不提交
 *   pnpm post:push --no-push     只提交，不推送
 *   pnpm post:push --build       提交前先跑 pnpm build 校验（慢，但能挡住 schema 错）
 *
 * 退出码：0 = 成功或被跳过，1 = 出错。
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const POSTS_DIR = "src/content/posts";

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const NO_PUSH = args.includes("--no-push");
const BUILD = args.includes("--build");
const slug = args.find((arg) => !arg.startsWith("--")) ?? "";

/**
 * 跑命令，默认把输出接到终端，返回 stdout。
 * @param {string[]} argv
 * @param {{ inherit?: boolean }} [options]
 * @returns {{ ok: boolean, out: string, code: number }}
 */
function run(argv, { inherit = false } = {}) {
	try {
		const out = execFileSync(argv[0], argv.slice(1), {
			encoding: "utf8",
			stdio: inherit ? "inherit" : ["ignore", "pipe", "pipe"],
			maxBuffer: 32 * 1024 * 1024,
		});
		return { ok: true, out: out ?? "", code: 0 };
	} catch (error) {
		return {
			ok: false,
			out: String(error.stdout ?? error.stderr ?? ""),
			code: typeof error.status === "number" ? error.status : 1,
		};
	}
}

/**
 * @param {string[]} argv
 * @returns {string}
 */
function gitOut(argv) {
	return run(["git", ...argv]).out.trim();
}

// ── 定位仓库根目录（脚本可能从子目录被调用）──────────────────────
const top = gitOut(["rev-parse", "--show-toplevel"]);
if (!top) {
	console.error("✗ 这里不是 git 仓库");
	process.exit(1);
}
process.chdir(top);

const branch = gitOut(["rev-parse", "--abbrev-ref", "HEAD"]);
const repo = gitOut(["remote", "get-url", "origin"]).replace(
	/.*[/:]([^/]+\/[^/]+?)(\.git)?$/,
	"$1",
);

// ── 收集 src/content/posts 下的改动 ─────────────────────────────
const statusOut = run([
	"git",
	"status",
	"--porcelain",
	"-z",
	"--untracked-files=all",
	"--",
	POSTS_DIR,
]).out;

/** @type {{ code: string, path: string, title?: string }[]} */
const changes = [];
const entries = statusOut.split("\0").filter(Boolean);
for (let i = 0; i < entries.length; i++) {
	const entry = entries[i];
	const code = entry.slice(0, 2);
	const filePath = entry.slice(3);
	// 重命名/复制时 -z 后面还会跟一个旧路径，跳过它
	if (code[0] === "R" || code[0] === "C") i++;
	if (slug && !filePath.includes(slug)) continue;
	changes.push({ code, path: filePath });
}

if (changes.length === 0) {
	console.log(
		slug
			? `没有找到和「${slug}」相关的改动（${POSTS_DIR} 下）`
			: `没有需要推送的改动（${POSTS_DIR} 下）`,
	);
	process.exit(0);
}

// ── 暂存区里如果还有别的文件，先停下来 ──────────────────────────
const alreadyStaged = gitOut(["diff", "--cached", "--name-only"])
	.split("\n")
	.map((line) => line.trim())
	.filter(Boolean);
const foreignStaged = alreadyStaged.filter(
	(file) => !file.startsWith(POSTS_DIR),
);
if (foreignStaged.length > 0) {
	console.error("✗ 暂存区里还有文章目录之外的改动，先处理掉再跑：");
	for (const file of foreignStaged) console.error(`    ${file}`);
	console.error("\n  取消暂存：git restore --staged <文件>");
	process.exit(1);
}

// ── 读出标题、检查 frontmatter / 草稿 / 图片 ────────────────────
/**
 * @param {string} file
 * @returns {string}
 */
function readContent(file) {
	if (!existsSync(file)) {
		return run(["git", "show", `HEAD:${file}`]).out;
	}
	return readFileSync(file, "utf8");
}

/**
 * @param {string} content
 * @returns {{ title: string, isDraft: boolean, body: string }}
 */
function parseFrontmatter(content) {
	// 有些编辑器会写 BOM，先剥掉，否则 ^--- 匹配不上
	const text = content.replace(/^\uFEFF/, "");
	const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(text);
	if (!match) return { title: "", isDraft: true, body: text };
	const front = match[1];
	const title = (front.match(/^title:\s*(.+)$/m)?.[1] ?? "")
		.trim()
		.replace(/^["']|["']$/g, "");
	const isDraft = /^draft:\s*true\s*$/im.test(front);
	const hasPublished = /^published:\s*\S+/m.test(front);
	return {
		title,
		isDraft: isDraft || !hasPublished,
		body: text.slice(match[0].length),
	};
}

const warnings = [];

for (const change of changes) {
	if (!/\.mdx?$/.test(change.path)) continue;
	const content = readContent(change.path);
	const { title, isDraft, body } = parseFrontmatter(content);
	change.title = title || path.basename(change.path, path.extname(change.path));
	if (isDraft) {
		warnings.push(
			`${change.path}：draft: true 或缺少 published，构建后不会出现在线上`,
		);
	}
	// 正文引用的图片是否真的存在
	for (const ref of body.matchAll(/!\[[^\]]*\]\(([^)\s]+)[^)]*\)/g)) {
		const target = ref[1];
		if (/^(https?:|data:|\/)/.test(target)) continue;
		const resolved = target.startsWith("./")
			? path.join(path.dirname(change.path), target)
			: path.join(POSTS_DIR, target);
		if (!existsSync(resolved)) {
			warnings.push(`${change.path}：引用的图片不存在 -> ${target}`);
		}
	}
}

const deleted = changes.filter((c) => c.code[0] === "D");
const added = changes.filter((c) => c.code === "??" || c.code[0] === "A");
const modified = changes.filter(
	(c) => !added.includes(c) && !deleted.includes(c),
);

// ── 组装提交信息 ────────────────────────────────────────────────
/**
 * @param {{ path: string, title?: string }[]} list
 * @returns {string[]}
 */
function names(list) {
	return list
		.filter((c) => /\.mdx?$/.test(c.path))
		.map((c) => `《${c.title || path.basename(c.path)}》`);
}

let subject;
const mdChanges = changes.filter((c) => /\.mdx?$/.test(c.path));
if (mdChanges.length === 1) {
	// 一篇正文（可能连带它的图片）：直接点出标题
	const one = mdChanges[0];
	const verb = added.includes(one)
		? "新增"
		: deleted.includes(one)
			? "删除"
			: "更新";
	subject = `post: ${verb}${names([one])[0]}`;
} else {
	const parts = [
		added.length > 0 ? `新增 ${added.length} 个文件` : "",
		modified.length > 0 ? `更新 ${modified.length} 个文件` : "",
		deleted.length > 0 ? `删除 ${deleted.length} 个文件` : "",
	].filter(Boolean);
	subject = `post: ${parts.join("、") || "内容更新"}`;
}
// 单篇时标题已经在 subject 里了，不再重复写 body
const body =
	mdChanges.length > 1 ? names(mdChanges).filter(Boolean).join("\n") : "";

// ── 打印计划 ────────────────────────────────────────────────────
console.log(`\n仓库 ${repo}，分支 ${branch}`);
if (branch !== "main") {
	console.log("⚠ 当前不在 main：推上去不会自动部署（Deploy 只在 main 触发）");
}
console.log(`\n将提交 ${changes.length} 个文件：`);
for (const change of changes) console.log(`  ${change.code}  ${change.path}`);
console.log(`\n提交信息：${subject}`);
if (body)
	console.log(
		body
			.split("\n")
			.map((line) => `  ${line}`)
			.join("\n"),
	);
for (const warning of warnings) console.log(`\n⚠ ${warning}`);

if (DRY_RUN) {
	console.log("\n（--dry-run：到此为止，什么都没改）");
	process.exit(0);
}

// ── 可选：先构建校验 ────────────────────────────────────────────
if (BUILD) {
	console.log("\n▶ pnpm build（校验 frontmatter 与整体构建）");
	const built = run(["pnpm", "build"], { inherit: true });
	if (!built.ok) {
		console.error(
			"\n✗ 构建失败，没提交。修好再跑，或去掉 --build 先推上去看 CI 报错",
		);
		process.exit(1);
	}
}

// ── 提交 ────────────────────────────────────────────────────────
console.log("\n▶ git add + commit（钩子会扫一遍敏感文件）");
const staged = run(["git", "add", "--", ...changes.map((c) => c.path)]);
if (!staged.ok) {
	console.error("✗ git add 失败");
	console.error(staged.out);
	process.exit(1);
}
const commitArgs = ["git", "commit", "-m", subject];
if (body) commitArgs.push("-m", body);
const committed = run(commitArgs, { inherit: true });
if (!committed.ok) {
	console.error("\n✗ 提交没成功（多半是钩子拦下了敏感文件，或没有改动可提交）");
	process.exit(1);
}

if (NO_PUSH) {
	console.log("\n已提交，按 --no-push 没推。手动推：git push origin main");
	process.exit(0);
}

// ── 推送 ────────────────────────────────────────────────────────
console.log("\n▶ git push");
const pushed = run(["git", "push", "origin", "HEAD"], { inherit: true });
if (!pushed.ok) {
	console.error(`
✗ 推送失败。常见原因与处理：

  远端有新提交（non-fast-forward）：
      git pull --rebase && git push origin main

  权限 / 网络：
      ssh -T git@github.com     # 验证 GitHub 连通

  提交已经在本地了，修好上面任一问题后直接 git push 即可，不用重跑本脚本。
`);
	process.exit(1);
}

console.log(`
✓ 推完了。接下来在 GitHub 上自动跑：
    Actions → Deploy (Aliyun ECS)   构建 + rsync，约 5~7 分钟后站点更新
    Actions → CI                    secret-scan + 构建校验

看构建进度：https://github.com/${repo}/actions
`);

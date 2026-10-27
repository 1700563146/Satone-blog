/**
 * 构建前清理「0 字节文章」。
 *
 * 编辑器（Pages CMS / 站内发布页）新建条目但还没来得及写内容时，
 * 会在 src/content/ 下留下一个空文件；空 frontmatter 过不了 zod schema，
 * 会让整站构建直接失败。这里在构建前把它们移走（备份到系统临时目录，
 * 不直接删，万一要找回还在），并在日志里说明。
 *
 * 只处理 0 字节的 .md/.mdx；有任何内容（哪怕是几个空格）都不动。
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const ROOTS = ["src/content/posts", "src/content/dynamic", "src/content/projects"];
const EXTS = new Set([".md", ".mdx"]);

const backupDir = path.join(os.tmpdir(), "satone-blog-empty-content");

function collect(dir: string, found: string[] = []): string[] {
	if (!fs.existsSync(dir)) return found;
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			collect(full, found);
		} else if (entry.isFile() && EXTS.has(path.extname(entry.name).toLowerCase())) {
			if (fs.statSync(full).size === 0) found.push(full);
		}
	}
	return found;
}

const empty = ROOTS.flatMap((root) => collect(root));

if (empty.length === 0) {
	console.log("[prune-empty-content] 没有空文件，跳过");
} else {
	fs.mkdirSync(backupDir, { recursive: true });
	for (const file of empty) {
		const backup = path.join(backupDir, `${Date.now()}-${path.basename(file)}`);
		fs.copyFileSync(file, backup);
		fs.rmSync(file);
		console.warn(
			`[prune-empty-content] 移走空文件 ${file}（备份：${backup}）—— 空 frontmatter 会让构建失败`,
		);
	}
	console.warn(
		`[prune-empty-content] 共移走 ${empty.length} 个空文件。若这是刚在 CMS 里新建的条目，去补上标题和日期即可。`,
	);
}

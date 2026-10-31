/**
 * 盯着 src/content/posts/，文件稳定后自动提交推送。
 *
 * 用途：把写好的 .md 和图片直接拖进文件夹，脚本自己推，不用敲命令。
 *
 * 用法：
 *   pnpm post:watch                  稳定 5 秒后自动推
 *   pnpm post:watch --quiet 30       稳定 30 秒才推（在编辑器里写文章时用这个，避免每停顿一次就推）
 *   pnpm post:watch --dry-run        只监听并打印"会推什么"，不真的提交（其余参数同样透传给 push-post）
 *
 * 停止：Ctrl+C。
 *
 * 说明：
 *   - 只监听 src/content/posts/（含 images/），别的目录改了不会触发；
 *   - 编辑器临时文件（.swp / .tmp / .part / ~$xxx / 隐藏文件）会被忽略；
 *   - 一次拖入多个文件会合并成一次提交（等所有文件都稳定下来才动手）；
 *   - 推送失败不退出，改完再拖一次就重试。
 */

import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const WATCH_DIR = "src/content/posts";
const PUSH_SCRIPT = "scripts/push-post.mjs";

const IGNORE = [
	/(^|\/)\./, // 隐藏文件 / .DS_Store
	/(^|\/)\.\.?$/,
	/\.(swp|swo|tmp|temp|part|crdownload|lock)$/i,
	/~$/,
	/(^|\/)~\$/, // Office / WPS 的临时文件
	/(^|\/)#.*#$/,
];

const argv = process.argv.slice(2);

/**
 * 取一个参数的值：--quiet 30 / --quiet=30 都认。
 * @param {string} flag
 * @param {string} fallback
 * @returns {string}
 */
function option(flag, fallback) {
	const inline = argv.find((arg) => arg.startsWith(`${flag}=`));
	if (inline) return inline.slice(flag.length + 1);
	const index = argv.indexOf(flag);
	if (index >= 0 && argv[index + 1]) return argv[index + 1];
	return fallback;
}

/**
 * 把本脚本自己的参数摘出去，剩下的原样传给 push-post。
 * @returns {string[]}
 */
function forwardArgs() {
	const skip = new Set(["--quiet", "--interval"]);
	const out = [];
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (skip.has(arg)) {
			i++;
			continue;
		}
		if (arg.startsWith("--quiet=") || arg.startsWith("--interval=")) continue;
		out.push(arg);
	}
	return out;
}

const quietSeconds = Number(option("--quiet", "5"));
const intervalSeconds = Number(option("--interval", "1"));

if (!Number.isFinite(quietSeconds) || quietSeconds < 0) {
	console.error("✗ --quiet 需要是一个非负秒数");
	process.exit(1);
}

const top = execFileSync("git", ["rev-parse", "--show-toplevel"], {
	encoding: "utf8",
}).trim();
if (!top) {
	console.error("✗ 这里不是 git 仓库");
	process.exit(1);
}
process.chdir(top);

if (!existsSync(WATCH_DIR)) {
	console.error(`✗ 找不到 ${WATCH_DIR}`);
	process.exit(1);
}

const pushScriptPath = path.join(top, PUSH_SCRIPT);
if (!existsSync(pushScriptPath)) {
	console.error(`✗ 找不到 ${PUSH_SCRIPT}`);
	process.exit(1);
}

/**
 * 给目录拍个快照：相对路径 -> 修改时间 + 大小。
 * @returns {Map<string, string>}
 */
function snapshot() {
	/** @type {Map<string, string>} */
	const map = new Map();
	/** @type {string[]} */
	let entries = [];
	try {
		entries = readdirSync(WATCH_DIR, { recursive: true, encoding: "utf8" });
	} catch {
		return map; // 目录正在被改动（比如刚被删掉），下一轮再看
	}
	for (const entry of entries) {
		const relative = String(entry).replace(/\\/g, "/");
		if (IGNORE.some((re) => re.test(relative))) continue;
		const absolute = path.join(WATCH_DIR, relative);
		try {
			const stat = statSync(absolute);
			if (!stat.isFile()) continue;
			map.set(relative, `${stat.mtimeMs}:${stat.size}`);
		} catch {
			// 文件在扫描过程中消失了，忽略
		}
	}
	return map;
}

/**
 * @param {Map<string, string>} before
 * @param {Map<string, string>} after
 * @returns {{ added: number, changed: number, removed: number }}
 */
function diff(before, after) {
	let added = 0;
	let changed = 0;
	let removed = 0;
	for (const [file, stamp] of after) {
		if (!before.has(file)) added++;
		else if (before.get(file) !== stamp) changed++;
	}
	for (const file of before.keys()) {
		if (!after.has(file)) removed++;
	}
	return { added, changed, removed };
}

/**
 * @param {number} count
 * @returns {string}
 */
function plural(count) {
	return count === 1 ? "1 个文件" : `${count} 个文件`;
}

/**
 * @param {number} count
 * @returns {string}
 */
function stamp() {
	const now = new Date();
	const pad = (value) => String(value).padStart(2, "0");
	return `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

const forwarded = forwardArgs();
let last = snapshot();
let pending = { added: 0, changed: 0, removed: 0 };
let lastChangeAt = 0;

console.log(`▶ 正在监听 ${WATCH_DIR}/（含 ${WATCH_DIR}/images/）`);
console.log(
	`  文件停止变化 ${quietSeconds}s 后自动提交推送（每 ${intervalSeconds}s 扫一次）；Ctrl+C 停止`,
);
if (forwarded.length > 0)
	console.log(`  透传给 push-post 的参数：${forwarded.join(" ")}`);
console.log(
	"  提示：正在编辑器里写文章时用 pnpm post:watch --quiet 30，否则每次停顿都会推一次\n",
);

const timer = setInterval(() => {
	const current = snapshot();
	const delta = diff(last, current);

	if (delta.added + delta.changed + delta.removed > 0) {
		pending = {
			added: pending.added + delta.added,
			changed: pending.changed + delta.changed,
			removed: pending.removed + delta.removed,
		};
		last = current;
		lastChangeAt = Date.now();
		console.log(
			`[${stamp()}] 检测到变化：新增 ${delta.added}、修改 ${delta.changed}、删除 ${delta.removed}`,
		);
		return;
	}

	if (pending.added + pending.changed + pending.removed === 0) return;
	if (Date.now() - lastChangeAt < quietSeconds * 1000) return;

	// 再拍一次快照：如果文件还在变（大图片正在拷），继续等
	const settled = snapshot();
	const stillMoving = diff(current, settled);
	if (stillMoving.added + stillMoving.changed + stillMoving.removed > 0) {
		last = settled;
		lastChangeAt = Date.now();
		return;
	}

	const summary = [
		pending.added > 0 ? `新增 ${plural(pending.added)}` : "",
		pending.changed > 0 ? `修改 ${plural(pending.changed)}` : "",
		pending.removed > 0 ? `删除 ${plural(pending.removed)}` : "",
	]
		.filter(Boolean)
		.join("、");

	pending = { added: 0, changed: 0, removed: 0 };
	last = settled;
	console.log(`[${stamp()}] 文件已稳定（${summary}），开始推送 …\n`);

	try {
		execFileSync(process.execPath, [pushScriptPath, ...forwarded], {
			stdio: "inherit",
		});
	} catch {
		console.error(`[${stamp()}] ✗ 推送没成功，继续监听；改完再存一次会重试\n`);
	}
	console.log(`\n[${stamp()}] 继续监听 …\n`);
}, Math.max(intervalSeconds, 0.2) * 1000);

/**
 * 退出时收尾。
 * @param {string} reason
 */
function shutdown(reason) {
	clearInterval(timer);
	console.log(`\n■ 已停止监听（${reason}）`);
	process.exit(0);
}

process.on("SIGINT", () => shutdown("Ctrl+C"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

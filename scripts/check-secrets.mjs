/**
 * 敏感信息扫描器。
 *
 * 三个地方共用同一份规则：
 *   - .githooks/pre-commit   提交前查暂存区
 *   - .githooks/pre-push     推送前查 HEAD（拦住 --no-verify 漏过去的提交）
 *   - .github/workflows/ci.yml  服务端再查一遍（本地钩子可以被绕过，这个绕不过）
 *
 * 用法：
 *   node scripts/check-secrets.mjs --staged   查暂存区（pre-commit）
 *   node scripts/check-secrets.mjs --head     查 HEAD 里的全部文件（pre-push / CI）
 *
 * 退出码：0 = 干净，1 = 发现敏感信息，2 = 用法错误。
 * 真的需要提交这类文件（比如测试夹具）时用 `git commit --no-verify` 明确绕过。
 */

import { execFileSync } from "node:child_process";

/** @type {readonly {re: RegExp, why: string}[]} */
const PATH_RULES = [
	{ re: /(^|\/)\.env(\.[^/]*)?$/, why: "环境变量文件" },
	{
		re: /\.(pem|key|p12|pfx|jks|keystore|ovpn|kdbx|ppk)$/i,
		why: "密钥/证书文件",
	},
	{ re: /(^|\/)(id_rsa|id_dsa|id_ecdsa|id_ed25519)(\.pub)?$/, why: "SSH 密钥" },
	{ re: /(^|\/)[^/]*_deploy(\.pub)?$/, why: "部署密钥" },
	{ re: /(^|\/)(secrets|credentials)\//, why: "凭证目录" },
];

/** `.env.example` 这类模板是允许的，里面只放占位值 */
const PATH_ALLOW = /(^|\/)\.env\.(example|sample|template)$/i;

/**
 * 内容规则：私钥块与常见 token 前缀。
 * 必须是 POSIX ERE（git grep -E 不支持 `(?:`），且写成源码后不会匹配到本文件自身
 * —— 前缀后面紧跟的是 `[`，不满足字符集要求。
 */
const CONTENT_RULES = [
	{ re: "-----BEGIN ([A-Z0-9]+ )?PRIVATE KEY( BLOCK)?-----", why: "私钥内容" },
	{ re: "gh[pousr]_[A-Za-z0-9]{36,}", why: "GitHub token" },
	{ re: "github_pat_[A-Za-z0-9_]{50,}", why: "GitHub fine-grained token" },
	{ re: "xox[baprs]-[A-Za-z0-9-]{10,}", why: "Slack token" },
	{ re: "AKIA[0-9A-Z]{16}", why: "AWS access key" },
	{ re: "LTAI[0-9A-Za-z]{12,}", why: "阿里云 AccessKey" },
	{ re: "sk-[A-Za-z0-9]{32,}", why: "API key（sk- 前缀）" },
	{ re: "AIza[0-9A-Za-z_-]{35}", why: "Google API key" },
];

/**
 * 扫描时跳过的路径：第三方压缩产物，噪音大且不可能放凭证。
 * @type {readonly string[]}
 */
const EXCLUDE = [
	":(exclude)pnpm-lock.yaml",
	":(exclude)public/assets/js/*.min.js",
	":(exclude)src/constants/lqips.json",
];

const mode = process.argv.includes("--staged")
	? "staged"
	: process.argv.includes("--head")
		? "head"
		: null;

if (!mode) {
	console.error("用法: node scripts/check-secrets.mjs --staged | --head");
	process.exit(2);
}

/**
 * 跑 git，返回 stdout（不抛异常）。
 * @param {string[]} args
 * @returns {{ ok: boolean, out: string, code: number }}
 */
function git(args) {
	try {
		const out = execFileSync("git", args, {
			encoding: "utf8",
			maxBuffer: 64 * 1024 * 1024,
			stdio: ["ignore", "pipe", "pipe"],
		});
		return { ok: true, out, code: 0 };
	} catch (error) {
		const stderr = String(error.stderr ?? "").trim();
		const stdout = String(error.stdout ?? "");
		return {
			ok: false,
			out: stdout || stderr,
			code: typeof error.status === "number" ? error.status : 1,
		};
	}
}

/**
 * 取出要检查的文件名单。
 * @returns {string[]}
 */
function listFiles() {
	const args =
		mode === "staged"
			? ["diff", "--cached", "--name-only", "-z", "--diff-filter=ACMR"]
			: ["ls-tree", "-r", "-z", "--name-only", "HEAD"];
	const { out } = git(args);
	return out.split("\0").filter(Boolean);
}

/** @type {{ file: string, why: string, detail?: string }[]} */
const problems = [];

// 1) 文件名
for (const file of listFiles()) {
	if (PATH_ALLOW.test(file)) continue;
	for (const rule of PATH_RULES) {
		if (rule.re.test(file)) {
			problems.push({ file, why: rule.why });
			break;
		}
	}
}

// 2) 文件内容：一次 git grep 搞定（-I 跳过二进制，-n 带行号）
//    退出码 0 = 有命中，1 = 没有命中，>1 = 出错
const grep = git([
	"grep",
	...(mode === "staged" ? ["--cached"] : []),
	"-n",
	"-I",
	"-E",
	...CONTENT_RULES.flatMap((rule) => ["-e", rule.re]),
	"--",
	...EXCLUDE,
]);

if (grep.code !== 0 && grep.code !== 1) {
	console.error("敏感信息扫描失败：git grep 出错");
	console.error(grep.out);
	process.exit(2);
}

if (grep.code === 0) {
	for (const line of grep.out.split("\n").filter(Boolean)) {
		// 格式：path:行号:内容
		const match = /^(.*?):(\d+):(.*)$/.exec(line);
		if (!match) continue;
		const [, file, lineno, text] = match;
		const hit = CONTENT_RULES.find((rule) => new RegExp(rule.re).test(text));
		problems.push({
			file,
			why: hit?.why ?? "疑似凭证",
			detail: `第 ${lineno} 行`,
		});
	}
}

if (problems.length === 0) {
	console.log(`敏感信息扫描通过（${mode === "staged" ? "暂存区" : "HEAD"}）`);
	process.exit(0);
}

console.error("\n✗ 发现疑似敏感信息，已阻止：\n");
for (const { file, why, detail } of problems) {
	console.error(`  ${file}${detail ? `  ${detail}` : ""}  —— ${why}`);
}
console.error(`
处理方式：
  1. git restore --staged <文件> 把它从这次提交里拿掉；
  2. 真的需要提交（测试夹具等）才用 git commit --no-verify 明确绕过；
  3. 密钥放 ~/.ssh 或 CI 的 Secrets，不要放仓库里。
见 docs/SECRETS.md。
`);
process.exit(1);

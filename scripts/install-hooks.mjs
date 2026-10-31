/**
 * 把仓库里的 .githooks 设为 Git 钩子目录（core.hooksPath）。
 *
 * 由 package.json 的 `prepare` 自动执行，所以 `pnpm install` 一次就装好；
 * 也可以随时手动跑 `pnpm hooks:install`。
 *
 * 钩子内容见 .githooks/：pre-commit / pre-push 都会跑 scripts/check-secrets.mjs。
 */

import { execFileSync } from "node:child_process";

try {
	execFileSync("git", ["rev-parse", "--git-dir"], { stdio: "ignore" });
	execFileSync("git", ["config", "core.hooksPath", ".githooks"], {
		stdio: "inherit",
	});
	console.log("已启用 .githooks（提交/推送前扫描敏感信息）");
} catch {
	console.log("跳过钩子安装：当前目录不是 git 仓库，或没装 git");
}

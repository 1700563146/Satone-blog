# 敏感信息

仓库是公开的：**代码和文章进仓库，凭证进 `~/.ssh` 或 GitHub Secrets**。
这里的规则和 `scripts/check-secrets.mjs` 一一对应，三处共用同一份判定：

| 时机 | 谁在拦 | 能否绕过 |
| --- | --- | --- |
| 写文件时 | `.gitignore`（看不到、`git status` 不提示） | `git add -f` |
| 提交 / 推送时 | `.githooks/pre-commit`、`.githooks/pre-push` | `--no-verify` |
| 推到 GitHub 后 | `.github/workflows/ci.yml` 的 `secret-scan` job | 绕不过（红了就是红了） |

## 被拦的东西

**文件名**（`.gitignore` + 扫描器）：

| 规则 | 例子 |
| --- | --- |
| 环境变量文件 | `.env`、`.env.local`、`.env.production`（`.env.example` 允许） |
| 密钥 / 证书 | `*.pem`、`*.key`、`*.p12`、`*.pfx`、`*.jks`、`*.keystore`、`*.ovpn`、`*.kdbx` |
| SSH 密钥 | `id_rsa`、`id_ed25519`、`id_ecdsa`、`id_dsa`（含 `.pub`） |
| 部署密钥 | `*_deploy`、`*_deploy.pub` |
| 凭证目录 | `secrets/`、`credentials/` |

**文件内容**（哪怕名字很普通）：私钥块（`BEGIN … PRIVATE KEY`）、GitHub token（`ghp_` / `github_pat_` / `gho_` …）、
AWS `AKIA…`、阿里云 `LTAI…`、Slack `xox?-`、OpenAI `sk-…`、Google `AIza…`。

## 密钥该放哪

- **部署私钥**：`~/.ssh/aliyun_deploy`（生成也在那里，见 `docs/DEPLOY-ALIYUN.md` 第 4 步）。
  CI 用的是 GitHub Secrets 里的副本，不读本地文件。
- **站内发布用的 GitHub token**：只存在浏览器 `localStorage`，别写进任何文件。
- **CI 用的**：仓库 Settings → Secrets and variables → Actions。

## 钩子怎么装

`pnpm install` 会自动装（`package.json` 的 `prepare` → `scripts/install-hooks.mjs`，
它把 `core.hooksPath` 指到 `.githooks`）。不想等安装，也可以：

```bash
pnpm hooks:install
```

自检：

```bash
pnpm check:secrets             # 扫 HEAD 里所有文件
node scripts/check-secrets.mjs --staged   # 只扫暂存区
```

## 真的需要提交这类文件

测试夹具之类确实要提交时，用 `git commit --no-verify` / `git push --no-verify` **明确绕过一次**。
不要为此去改扫描规则——规则一松，下次真泄露就没人拦了。

## 万一已经推上去了

推上去的那一刻就要当成已泄露处理：

1. **先吊销再清理**：换 token / 换密钥（服务器上 `authorized_keys` 删掉旧公钥，GitHub Secrets 更新）；
2. 再看要不要清历史：`git filter-repo --path <文件> --invert-paths` 后强推，
   并让 GitHub 支持清理缓存（或直接按新仓库迁移）；
3. 只删文件、不轮换凭证 —— 等于没处理（历史里还在，fork 里也在）。

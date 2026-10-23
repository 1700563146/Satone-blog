# 部署指南（可执行清单）

> 状态：阶段 4 runbook。CI 已包含检查与端到端测试；下面的命令按顺序执行即可完成首次上线。
> 站点是**全静态产出**（Cache Components + `ensureStatic = "navigation"`），因此不需要数据库、迁移或运行时密钥。

## 0. 前置条件

| 项目       | 说明                                                               |
| ---------- | ------------------------------------------------------------------ |
| 远程仓库   | <https://github.com/1700563146/Satone-blog>，`main` 分支即生产分支 |
| 托管平台   | Vercel（已选定）；也可用任何支持 Next.js 16 + Node 24 的平台       |
| 域名       | 可选；没有则先用 `*.vercel.app` 域名                               |
| `SITE_URL` | 站点**最终**公开地址，决定 canonical、sitemap、RSS 里的绝对地址    |

> **不要部署到 GitHub Pages。** 本项目需要 Node 运行时：`cacheComponents` / `ensureStatic` 是 Next.js 的服务端能力，`/feed.xml` 是路由处理器，Pages 只能托管静态文件。
> 仓库里旧版的 Astro + Pages 方案（`deploy.yml`、`base: '/Satone-blog'`、`output: 'static'`）已整体存档到 `astro-archive` 分支；如仍在仓库设置里开着 Pages，建议到 **Settings → Pages** 关闭，避免出现空白部署记录。

> 顺序很重要：先确定域名再设 `SITE_URL`。如果先用临时域名部署，改域名后必须更新 `SITE_URL` 并重新部署，否则搜索引擎看到的 canonical 还是旧地址。

## 1. 建立远程仓库并启用 CI

```bash
git remote add origin git@github.com:<你的账号>/sato-blog.git
git push -u origin main
```

push 之后 GitHub Actions（[.github/workflows/ci.yml](../.github/workflows/ci.yml)）会跑两组任务：

1. `checks`：format:check → lint → typecheck → test（单元 + 组件）→ build
2. `e2e`：build → 安装 Chromium → Playwright 端到端（桌面 + 移动端两个 project）

两组的日志与失败报告（`playwright-report`）都会保留在 Actions 页面；e2e 失败时先下载 artifact 看截图与 trace。

## 2. 在 Vercel 上创建项目

1. Vercel → **Add New → Project** → 选择该仓库。
2. Framework Preset 会自动识别为 Next.js，**保持默认**：
   - Build Command：`npm run build`（`prebuild` 会先执行 `validate:content`，内容有错误则构建失败）
   - Output Directory：留空（Next.js 由平台处理）
   - Install Command：`npm install`
3. **Node.js 版本**：Project Settings → General → Node.js Version 选择 **24.x**（与 [.nvmrc](../.nvmrc) 一致）。
4. **环境变量 `SITE_URL`（可选但推荐）**：
   - 不配也能正常工作：构建时自动回退到 Vercel 注入的 `VERCEL_PROJECT_PRODUCTION_URL`（生产域名）或 `VERCEL_URL`（当前部署），见 [ADR-025](DECISIONS.md)
   - 绑定自定义域名后建议显式设为 `https://你的域名`，让 Preview 部署的 canonical 也统一指向正式地址
5. Deploy。

首次部署完成后，确认这三个地址可访问：`/sitemap.xml`、`/robots.txt`、`/feed.xml`，并检查文章页的 canonical 是否是你的正式域名（不是 `localhost:3000`）。

## 3. 域名、HTTPS 与 DNS

1. Vercel → Project → **Settings → Domains** → 添加 `sato.example.com`（建议同时添加 `www` 并设为主域名的跳转）。
2. 按提示在域名商处配置：
   - 根域名：`A` 记录指向 Vercel 提供的 IP，或改用 `ALIAS/ANAME`
   - 子域名：`CNAME` 指向 `cname.vercel-dns.com`
3. 等待证书签发（Let's Encrypt，自动续期）。
4. **把 `SITE_URL` 改成最终域名并重新部署**，然后复查 `/sitemap.xml` 里的绝对地址。

## 4. 上线前的本地检查

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test        # 单元 + 组件（jsdom）
npm run build       # 含内容校验
npm run test:e2e    # 端到端；需要先 build
```

如果所在网络下载不到 Playwright 的浏览器二进制，可以先借用本机已安装的 Chrome/Edge：

```bash
PLAYWRIGHT_CHANNEL=chrome npm run test:e2e   # Windows PowerShell: $env:PLAYWRIGHT_CHANNEL="chrome"
```

## 5. 上线后的冒烟测试

```bash
BASE=https://sato.example.com

curl -sS -o /dev/null -w 'home %{http_code}\n'      "$BASE/"
curl -sS -o /dev/null -w 'posts %{http_code}\n'     "$BASE/posts"
curl -sS -o /dev/null -w 'post %{http_code}\n'      "$BASE/posts/hello-world"
curl -sS -o /dev/null -w 'draft %{http_code}\n'     "$BASE/posts/draft-notes"   # 期望 404
curl -sS -o /dev/null -w 'sitemap %{http_code}\n'   "$BASE/sitemap.xml"
curl -sS "$BASE/feed.xml" | head -c 160; echo
curl -sS "$BASE/sitemap.xml" | grep -c '<loc>'
curl -sS "$BASE/robots.txt"
```

人工检查：

- [ ] 手机与桌面浏览器各打开首页、文章详情、分类/标签页
- [ ] 移动端汉堡菜单能展开、能跳转、Escape 与点击外部都能关闭
- [ ] 文章页目录锚点能跳转，代码块有高亮且可横向滚动
- [ ] RSS 阅读器能订阅 `/feed.xml`
- [ ] Lighthouse 检查首页与文章页（性能、可访问性、SEO）
- [ ] 分享链接时 Open Graph 标题与摘要正确（可用平台预览工具）

## 6. 回滚

| 场景           | 操作                                                                  |
| -------------- | --------------------------------------------------------------------- |
| 代码/内容回退  | Vercel → Deployments → 选中上一个成功部署 → **Promote to Production** |
| 需要修历史     | `git revert <sha>` 后 push，自动触发新部署（推荐，保留完整历史）      |
| 单篇文章回退   | `git checkout <sha> -- content/posts/<slug>.md` 后提交                |
| 平台侧快速回退 | `vercel rollback`（已安装并登录 Vercel CLI 时）                       |

回滚后仍需跑一遍第 5 节冒烟测试：静态站点的 sitemap/RSS 是构建产物，回滚会一并回退。

## 7. 备份与恢复演练

内容就是 Git 里的 Markdown，**Git 远程仓库本身就是备份**；此外建议：

- 每月导出一次：`git archive --format=zip HEAD content/ > content-backup.zip`
- 图片：`public/images/` 随仓库备份；若后续改用图床，保留一份文件清单
- **恢复演练（至少做一次）**：clone 到临时目录 → `npm ci && npm run build`，确认能独立构建出完整站点

## 8. 环境区分

- `development`：本地 `npm run dev`，`SITE_URL` 默认 `http://localhost:3000`
- `preview`：Vercel 为每个 PR 生成预览部署；建议用非生产域名，且不要接入生产分析/密钥
- `production`：正式站点，只有 `main` 合并后部署

## 9. 备选：自托管 Node

```bash
npm ci
npm run build
npm run start          # 默认 3000 端口
```

- 需要 Node 24（见 [.nvmrc](../.nvmrc)），前面加反向代理时转发 `Host` 与 `X-Forwarded-*`
- 静态产物在 `.next/`；若打包成容器，可在 `next.config.ts` 打开 `output: "standalone"` 后复制 `.next/standalone`（当前未启用）
- 反向代理的缓存策略要放行 `/_next/static` 的长期缓存，其它路径不要缓存 HTML（内容随构建变化）

## 10. 阶段 4 待办

- [ ] 创建 GitHub 远程仓库并确认 CI 两组任务变绿
- [ ] 创建 Vercel 项目、绑定仓库与自动部署
- [ ] 配置自定义域名、HTTPS 与 DNS
- [ ] 配置生产 `SITE_URL` 并复查 canonical/sitemap/RSS
- [ ] 完成一次回滚演练与一次备份恢复演练
- [ ] 上线后冒烟测试（第 5 节）全部勾选
- [ ] （可选）接入错误监控与访问统计

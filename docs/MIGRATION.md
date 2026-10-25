# 从 Next.js 迁移到 Astro + Firefly

这次迁移把原来的自建 Next.js 博客换成了 Astro 7 + [Firefly](https://github.com/CuteLeaf/Firefly)（MIT）主题。记录一下变了什么、什么被保留、以及为什么。

## 为什么换

原方案（Next.js 静态导出 + 自建内容引擎 + 自建组件）功能完整，但视觉效果与「成熟主题」差距明显，继续自己写 UI 的成本高于接入模板。Firefly 提供了开箱可用的布局、暗色主题、代码块（expressive-code）、数学公式（KaTeX）、全文搜索（Pagefind）、i18n、图集、时间线等，且同样是纯静态产出。

## 保留

- 仓库、Cloudflare Workers 静态资源部署模型、GitHub Actions 部署链路（改为 pnpm）
- 文章内容（frontmatter 字段映射后迁移）
- 上传发布工具的思路：仍然"浏览器直接调 GitHub Contents API"，但改写成 **纯 HTML + JS**（`public/admin/publish.html`），不再依赖 React
- 站点域名、`noindex` 的 Vercel 备站策略

## 变化

| 维度 | 迁移前（Next.js） | 迁移后（Astro + Firefly） |
| --- | --- | --- |
| 框架 | Next.js 16 App Router + `output: "export"` | Astro 7（静态）+ Svelte 5 岛屿 |
| 包管理 | npm | **pnpm**（`preinstall` 强制） |
| 内容位置 | `content/posts/*.md` | `src/content/posts/*.md`（Content Collections） |
| 内容校验 | 自建 Zod schema + `validate:content` 脚本 | Astro content schema（`z.date()` 等） |
| 日期写法 | 必须加引号 `"2026-10-23"` | 必须**不加引号** `2026-10-23`（Date 类型） |
| URL | `/posts/<slug>`（无尾斜杠） | `/posts/<slug>/`（`trailingSlash: "always"`） |
| 搜索 | 自建构建期索引 + 客户端过滤 | Pagefind |
| 站点配置 | `src/lib/config.ts` | `src/config/siteConfig.ts` 等 |
| 上传页 | React 组件（`/admin/publish`） | 纯 HTML/JS（`public/admin/publish.html`，同样路径） |
| 测试 | 211 个 Vitest 用例 + Playwright e2e | 无单测框架，靠 `pnpm check` / `type-check` / `build` |
| 图片 | `public/images/posts/` | 同左（`/images/posts/...` 引用不变） |

## 旧实现存留

迁移前的文档（架构、ADR、内容规范、部署 runbook）已归档在 [`docs/legacy-next/`](legacy-next/)，仍可在 `main` 历史上翻阅，仅作参考。

## 已知待办

- 旧文章 URL 的 301 重定向（`/posts/readme` → 新 slug）需要时可用 `_redirects` 或在 `astro.config` 里加 `redirects`
- 恢复一套最小 e2e（Playwright）覆盖首页/文章页/搜索/上传页
- `public/pio`（约 14.6 MB 看板娘资源）已删除：需要时从 Firefly 仓库复制回来，并打开 `pioConfig`
- 主题自带的示例配置（友链、相册、书签、打赏）目前全部关闭，需要时再逐个开启

# Sato Blog

个人博客系统。Next.js App Router + TypeScript + Tailwind CSS，文章以 Markdown 保存在仓库中（content/ 是内容的唯一来源）。

## 快速开始

环境要求：Node.js >= 20.9（推荐 24，见 [.nvmrc](.nvmrc)）。

```bash
npm install
npm run dev
```

打开 <http://localhost:3000>。

可选：复制 [.env.example](.env.example) 为 `.env.local`，本地覆盖站点地址。

## 常用命令

| 命令                       | 说明                                          |
| -------------------------- | --------------------------------------------- |
| `npm run dev`              | 启动开发服务器（Turbopack）                   |
| `npm run build`            | 校验内容并生产构建                            |
| `npm run start`            | 启动生产服务器                                |
| `npm run lint`             | ESLint 检查                                   |
| `npm run typecheck`        | 生成路由类型并执行 TypeScript 检查            |
| `npm run test`             | Vitest 单元测试 + 组件测试（jsdom）           |
| `npm run test:watch`       | Vitest 监听模式                               |
| `npm run test:e2e`         | Playwright 端到端测试（需先 `npm run build`） |
| `npm run validate:content` | 校验文章 frontmatter 与正文                   |
| `npm run format`           | Prettier 格式化全部文件                       |
| `npm run format:check`     | Prettier 格式检查（CI 使用）                  |

端到端测试默认使用 Playwright 自带的 Chromium（`npx playwright install chromium`）；网络受限时可用本机浏览器：`PLAYWRIGHT_CHANNEL=chrome npm run test:e2e`。

写文章：在 `content/posts/` 新建 `<slug>.md`，按 [内容规范](docs/CONTENT_SCHEMA.md) 填写 frontmatter，然后运行 `npm run validate:content`。草稿（`published: false` 或 `draft: true`）不会出现在任何公开页面。

## 目录结构

```text
├─ content/            # 文章与页面内容（Markdown，唯一内容源）
│  ├─ posts/           # 文章（顶层 .md，URL 由 frontmatter 的 slug 决定）
│  └─ pages/           # 独立页面，如 about.md → /about
├─ docs/               # 架构、开发、内容与部署文档
├─ public/             # 可公开访问的静态资源
│  ├─ images/
│  ├─ fonts/
│  └─ favicon.ico
├─ src/
│  ├─ app/
│  │  ├─ (site)/       # 前台路由组：首页、文章、分类、标签、关于、友链 + 404
│  │  ├─ layout.tsx    # 根布局（zh-CN、站点元数据、RSS 自动发现）
│  │  ├─ not-found.tsx # 未匹配路径的 404
│  │  ├─ sitemap.ts    # /sitemap.xml（只含公开内容）
│  │  ├─ robots.ts     # /robots.txt
│  │  └─ feed.xml/     # /feed.xml（RSS 2.0，构建时预渲染）
│  ├─ components/
│  │  ├─ layout/       # 标题区、空状态、占位页
│  │  ├─ navigation/   # 导航栏、分类/标签链接与总览
│  │  ├─ post/         # 文章卡片、列表、目录、上一篇/下一篇
│  │  ├─ effects/      # 预留（视觉增强）
│  │  └─ ui/           # 预留（基础组件）
│  ├─ lib/
│  │  ├─ content/      # 内容引擎（唯一入口 index.ts，带缓存）+ 独立页面读取
│  │  ├─ seo/          # 元数据与 RSS 构建（纯函数，可单测）
│  │  ├─ routing.ts    # generateStaticParams 辅助
│  │  └─ config.ts     # 站点配置唯一来源
│  ├─ styles/
│  │  └─ globals.css   # Tailwind 入口、设计 Token 与正文排版
│  └─ types/
├─ scripts/           # 内容校验等仓库级脚本
├─ tests/
│  ├─ unit/
│  ├─ fixtures/       # 文章与页面的测试夹具
│  └─ e2e/
└─ .github/workflows/ci.yml
```

## 路由

| 路由                          | 说明                                      |
| ----------------------------- | ----------------------------------------- |
| `/`                           | 首页：站点介绍、精选、最新文章、分类入口  |
| `/posts`                      | 全部已发布文章 + 分类/标签总览            |
| `/posts/[slug]`               | 文章详情：正文、目录、上一篇/下一篇       |
| `/categories/[slug]`          | 分类归档（中文名称即 URL 段）             |
| `/tags/[slug]`                | 标签归档                                  |
| `/about`                      | 关于页，正文来自 `content/pages/about.md` |
| `/friends`                    | 友链（P1，暂为占位）                      |
| `/feed.xml`                   | RSS 2.0 订阅                              |
| `/sitemap.xml`、`/robots.txt` | 搜索引擎用文件                            |

草稿、未发布文章与不存在的 slug 统一返回真正的 404 状态码（见 [ADR-016](docs/DECISIONS.md)）。

## 文档

- 总规划：[开发文档.md](开发文档.md)
- 开发指南：[docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)
- 架构说明：[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- 内容规范：[docs/CONTENT_SCHEMA.md](docs/CONTENT_SCHEMA.md)
- 部署指南：[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)
- 产品范围：[docs/PRODUCT_SCOPE.md](docs/PRODUCT_SCOPE.md)
- 技术决策：[docs/DECISIONS.md](docs/DECISIONS.md)

## 开发阶段

- [x] 阶段 1：项目骨架
- [x] 阶段 2：内容引擎
- [x] 阶段 3：前台页面（首页、列表、详情、分类、标签、关于、404、SEO、RSS、sitemap、代码高亮、移动端折叠导航）
- [ ] 阶段 4：部署与可观测性（清单见 [部署指南](docs/DEPLOYMENT.md)）
- [ ] 阶段 5：写作体验与增强功能

测试：120 个单元/组件用例，9 个端到端用例（桌面与移动端两个 project，共 18 次执行）。P1 待做：站内搜索、友链、暗色主题。

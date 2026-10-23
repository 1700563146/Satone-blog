# 开发指南

> 状态：阶段 2（内容引擎）。后续阶段（真实页面、部署、后台）补充相应说明。

## 环境要求

- Node.js >= 20.9.0（推荐 24，见 [.nvmrc](../.nvmrc)）
- npm 11（项目使用 npm，见 package.json 的 `packageManager`）

## 安装与运行

```bash
npm install
npm run dev        # http://localhost:3000
```

环境变量：复制 [.env.example](../.env.example) 为 `.env.local` 后按需修改。`.env*` 不会提交到仓库（`.env.example` 除外）。

| 变量       | 说明                                   | 默认值                  |
| ---------- | -------------------------------------- | ----------------------- |
| `SITE_URL` | 站点对外地址，用于 metadataBase 与 SEO | `http://localhost:3000` |

## 命令

| 命令                       | 说明                            |
| -------------------------- | ------------------------------- |
| `npm run dev`              | 开发服务器（Turbopack）         |
| `npm run build`            | 生产构建                        |
| `npm run start`            | 启动生产服务器                  |
| `npm run lint`             | ESLint（flat config）           |
| `npm run typecheck`        | `next typegen` + `tsc --noEmit` |
| `npm run test`             | Vitest 单元测试（tests/unit）   |
| `npm run validate:content` | 校验文章 frontmatter 与正文     |
| `npm run format`           | Prettier 格式化                 |
| `npm run format:check`     | Prettier 检查                   |

> `typecheck` 先执行 `next typegen`，因为 Next 16 的 `PageProps` / `LayoutProps` 全局类型由类型生成步骤产出；全新克隆后直接 `tsc` 会失败。
>
> `build` 会通过 `prebuild` 自动执行 `validate:content`；内容有错误时构建直接失败，且不会产出半成品站点。

## 目录约定

- `content/`：只存放内容（Markdown），不存放业务代码；是文章的唯一来源。
- `public/`：只放可公开访问的静态资源，不得放密钥、私密备份或草稿。
- `src/app/`：路由与页面组合。前台页面统一放在 `(site)` 路由组内。
- `src/components/`：可复用展示组件；`ui/` 预留给基础组件（shadcn/ui 按需引入）。
- `src/lib/content/`：内容引擎。`index.ts` 是对外唯一入口（带缓存），其余模块保持纯函数以便单测。
- `scripts/`：仓库级脚本；目前只有内容校验。
- `src/lib/config.ts`：站点配置唯一来源，不要在组件中重复写死。
- `docs/`：架构决策、内容规范、部署流程。
- `tests/unit/`：单元测试；`tests/fixtures/content/` 是内容引擎的测试夹具。
- `tests/e2e/`：Playwright（阶段 3/4 引入）。

## 写作流程

1. 在 `content/posts/` 新建 `<slug>.md`，按 [内容规范](CONTENT_SCHEMA.md) 填写 frontmatter。
2. 草稿保持 `published: false` 或 `draft: true`，两种写法都会从公开数据中过滤。
3. 运行 `npm run validate:content`，按提示修复所有 error。
4. `npm run dev` 预览；发布时把 `published` 设为 `true`、`draft` 设为 `false`，提交后构建。

日期统一写成带引号的 `date: "2026-10-23"`。未加引号的日期会被 YAML 解析成 Date，并且可能把 `2026-02-30` 自动进位成 `2026-03-02`；本项目要求加引号，未加引号会直接报错。

页面与组件只能从 `@/lib/content` 导入数据函数；直接导入 `read-posts` / `parse-frontmatter` 会被 ESLint 拦截（会绕过缓存与草稿隔离）。纯工具函数（如 `formatPostDate`、`taxonomyHref`）可从 `@/lib/content/schema` 导入。

## 设计 Token

设计变量集中在 [src/styles/globals.css](../src/styles/globals.css) 的 `@theme` 块（来源：开发文档 §9.2）。Tailwind v4 会同时：

- 在 `:root` 输出这些 CSS 变量；
- 生成工具类，如 `bg-bg`、`text-muted`、`border-border`、`rounded-card`、`shadow-card`；
- 自定义工具类 `glass-card` 提供毛玻璃卡片基础样式。

新增或调整颜色、圆角、宽度时只改 `@theme`，不要在组件中散落颜色值。尺寸变量用 Tailwind 变量简写访问，如 `max-w-(--content-width)`。

暗色主题（P1）通过在 `.dark` 下覆盖同名变量实现，无需改动组件。

## 代码规范

- ESLint flat config（eslint-config-next + eslint-config-prettier），`npm run lint`。
- Prettier + `prettier-plugin-tailwindcss`（Tailwind 类名排序），`npm run format`。
- TypeScript strict；不要用 `any` 绕过类型检查。
- 组件注释、提交信息使用中文或英文均可，保持一致即可。

## 测试

- 单元测试：Vitest，纯 Node 环境，文件放在 `tests/unit/*.test.ts`。
- 内容引擎测试直接使用 `tests/fixtures/content/` 下的夹具；测试**不要**导入 `@/lib/content`（`index.ts` 依赖 `server-only` 与 `next/cache`）。
- 组件测试：需要时再引入 jsdom 与 Testing Library。
- 端到端：Playwright，阶段 3/4 引入。
- CI 门槛：format:check → lint → typecheck → test → build（与开发文档 §13.4 对应）；`build` 内含内容校验。

## CI

[.github/workflows/ci.yml](../.github/workflows/ci.yml)：push 到 `main`、PR、手动触发时运行全部检查。GitHub 远程仓库需由项目所有者创建并 push 后生效。

## Windows 注意事项

- 项目在 Git Bash 下开发；`.gitattributes` 统一为 LF，避免 Windows/CI 换行差异。
- 路径中的中文文件名（如 开发文档.md）已在 `.prettierignore` 中排除。

## 阶段边界

当前处于阶段 2（内容引擎）：Markdown 读取、frontmatter 校验、草稿隔离、目录与链接安全、内容校验脚本与单元测试已完成；页面仍是占位页。真实页面与 SEO（阶段 3）、部署（阶段 4）、后台与增强功能（阶段 5）按开发文档路线推进。

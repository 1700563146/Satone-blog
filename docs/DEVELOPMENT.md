# 开发指南

> 状态：阶段 3（前台页面）。后续阶段（部署、后台）补充相应说明。

## 环境要求

- Node.js >= 20.9.0（推荐 24，见 [.nvmrc](../.nvmrc)）
- npm 11（项目使用 npm，见 package.json 的 `packageManager`）

## 安装与运行

```bash
npm install
npm run dev        # http://localhost:3000
```

环境变量：复制 [.env.example](../.env.example) 为 `.env.local` 后按需修改。`.env*` 不会提交到仓库（`.env.example` 除外）。

| 变量       | 说明                                                       | 默认值                                                      |
| ---------- | ---------------------------------------------------------- | ----------------------------------------------------------- |
| `SITE_URL` | 站点对外地址，用于 canonical、sitemap、RSS 与 metadataBase | 本地为 `http://localhost:3000`；Vercel 自动回退到注入的域名 |

Vercel 会把 `VERCEL_PROJECT_PRODUCTION_URL` / `VERCEL_URL` 注入到构建环境，未配置 `SITE_URL` 时自动使用它们（见 [ADR-025](DECISIONS.md)），所以线上不会出现 canonical 指向 localhost 的情况。绑定自定义域名后建议显式设置 `SITE_URL`，让 Preview 部署也统一指向正式域名。

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

- `content/`：只存放内容（Markdown），不存放业务代码；`posts/` 是文章，`pages/` 是独立页面。
- `public/`：只放可公开访问的静态资源，不得放密钥、私密备份或草稿。
- `src/app/`：路由与页面组合。前台页面统一放在 `(site)` 路由组内；`sitemap.ts`、`robots.ts`、`feed.xml/` 也在这一层。
- `src/components/`：可复用展示组件（`post/`、`navigation/`、`layout/`）；`ui/` 预留给基础组件。
- `src/lib/content/`：内容引擎。`index.ts` 是对外唯一入口（带缓存），其余模块保持纯函数以便单测；`read-pages.ts` 负责独立页面。
- `src/lib/seo/`：元数据与 RSS 构建，纯函数，可直接单测。
- `src/lib/routing.ts`：`generateStaticParams` 的参数辅助。
- `scripts/`：仓库级脚本；目前只有内容校验（文章 + 独立页面）。
- `src/lib/config.ts`：站点配置唯一来源，不要在组件中重复写死。
- `docs/`：架构决策、内容规范、部署流程。
- `tests/unit/`：单元测试；`tests/fixtures/content/` 与 `tests/fixtures/pages/` 是测试夹具。
- `tests/e2e/`：Playwright（阶段 4 引入）。

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

三层，命令与职责分开：

| 层     | 命令               | 位置                    | 环境                                             |
| ------ | ------------------ | ----------------------- | ------------------------------------------------ |
| 单元   | `npm run test`     | `tests/unit/*.test.ts`  | Node（内容引擎、SEO、RSS）                       |
| 组件   | 同上（一次跑完）   | `tests/unit/*.test.tsx` | jsdom（文件首行 `// @vitest-environment jsdom`） |
| 端到端 | `npm run test:e2e` | `tests/e2e/*.spec.ts`   | 真实浏览器（先 `npm run build`）                 |

细则：

- 内容引擎测试直接使用 `tests/fixtures/content/` 与 `tests/fixtures/pages/` 下的夹具；测试**不要**导入 `@/lib/content`（`index.ts` 依赖 `server-only` 与 `next/cache`）。
- 组件测试用 Testing Library + `tests/setup.tsx` 里的全局桩：`next/link` 被替换成普通 `<a href>`，并拦截 `<a>` 的默认跳转（jsdom 不支持导航）。断言优先用可访问名称（`getByRole`），不要依赖类名。
- 端到端测试覆盖：首页 → 文章详情（含目录锚点）、列表与归档页、草稿返回 404 且不泄漏正文、RSS/sitemap/robots、移动端折叠菜单。桌面与移动端由 `playwright.config.ts` 的两个 project 分别跑。
- 端到端需要浏览器二进制：`npx playwright install chromium`；若网络下载不到，可临时借用本机浏览器 `PLAYWRIGHT_CHANNEL=chrome npm run test:e2e`。
- 本地跑 e2e 前必须先 `npm run build`：`webServer` 只启动 `next start`，不会替你构建。
- CI 门槛：format:check → lint → typecheck → test → build（`checks` job），随后 e2e（`e2e` job，含构建与浏览器安装）。

## CI

[.github/workflows/ci.yml](../.github/workflows/ci.yml)：push 到 `main`、PR、手动触发时运行两组任务（`checks` 与 `e2e`）。GitHub 远程仓库需由项目所有者创建并 push 后生效。

## Windows 注意事项

- 项目在 Git Bash 下开发；`.gitattributes` 统一为 LF，避免 Windows/CI 换行差异。
- 路径中的中文文件名（如 开发文档.md）已在 `.prettierignore` 中排除。

## 阶段边界

当前处于阶段 3（前台页面完成）：首页、文章列表、详情页（正文 + 目录 + 上一篇/下一篇）、分类与标签归档、关于页、404、SEO（canonical / Open Graph）、sitemap、robots 与 RSS 已完成，全部路由在构建期静态产出。

阶段 3 已全部完成（含代码高亮、移动端折叠菜单、组件测试与端到端测试）。下一阶段（阶段 4）按 [DEPLOYMENT.md](DEPLOYMENT.md) 的清单部署与观测。

## 页面开发

前台页面统一放在 `(site)` 路由组，页面只负责组合，数据一律从 `@/lib/content` 获取：

```tsx
export default async function PostsPage() {
  const [posts, categories] = await Promise.all([getPosts(), getCategories()]);
  return <PostList posts={posts} />;
}
```

规则：

- 页面不能直接 `import` `read-posts` / `parse-frontmatter`（ESLint 会拦截），否则会绕过缓存与草稿隔离。
- 动态段必须导出 `generateStaticParams`，参数用 `toStaticSlugParams()` 包装（处理空内容的情况）；`generateMetadata` 与页面本体可以各自调用访问层函数（都有缓存）。
- 参数解析失败或内容不存在时调用 `notFound()`，不要渲染空白页。
- 新增独立页面：在 `content/pages/` 加 `<name>.md`，页面里调用 `getPage("<name>")`。
- 样式只使用 `@theme` 里的设计 Token（`text-muted`、`glass-card`、`max-w-(--content-width)` 等），不要在组件里写死颜色。

### 不要破坏整站静态产出

`(site)/layout.tsx` 导出了 `ensureStatic = "navigation"`，构建会校验"完整路由不包含未缓存读取或请求期 API"。因此：

- 新增数据读取时放进 `use cache` 作用域（`src/lib/content/index.ts`），或明确接受该路由重新变成动态渲染（需要同步调整 `ensureStatic` 并记录 ADR）。
- `use cache` 作用域里不要用 `revalidate: 0`，否则校验失败；开发期用 `{ revalidate: 1, stale: 30 }`。

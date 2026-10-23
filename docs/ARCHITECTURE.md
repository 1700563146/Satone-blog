# 架构说明

> 状态：阶段 3（前台页面完成），依据[开发文档](../开发文档.md) §6、§7、§8、§10。阶段 4 处理部署与可观测性。

## MVP 架构

```text
访客浏览器
    |
    v
Next.js 页面层（src/app，App Router + Cache Components）
    |-- 首页 / 列表 / 详情 / 分类 / 标签 / 关于 / 友链
    |-- 404（根级 + 前台路由组各一份）
    |-- SEO：metadata（canonical、Open Graph）、sitemap.ts、robots.ts
    |-- RSS：app/feed.xml/route.ts
    |
    v
展示组件层（src/components）
    |-- post：卡片、列表、目录、上一篇/下一篇
    |-- navigation：导航栏、分类标签链接与总览
    |-- layout：标题区、空状态、占位页
    |
    v
内容访问层（src/lib/content/index.ts，'use cache' 边界）
    |-- getPosts / getPostBySlug / getPostNeighbors
    |-- getCategories / getTags / getPostsByCategory / getPostsByTag
    |-- getPage（content/pages/*.md → 关于页等）
    |
    v
内容引擎（src/lib/content/*，纯 TypeScript，可单测）
    |-- read-posts：目录扫描、重复 slug 检查、公开索引、相邻文章
    |-- read-pages：独立页面读取（frontmatter 可省略）
    |-- parse-frontmatter：gray-matter + Zod 校验
    |-- render-markdown：unified 渲染、目录提取、链接安全、Shiki 代码高亮
    |
    v
content/posts + content/pages（唯一内容源）
    |
    v
Git 仓库 -> CI 检查与构建 -> 部署平台（阶段 4）
```

另有两个不依赖 Next 运行时的纯函数模块，便于单测：

- `src/lib/seo/metadata.ts`：canonical、Open Graph、绝对地址拼接；
- `src/lib/seo/rss.ts`：RSS 2.0 文档、RFC 822 日期、XML 转义。

## 内容数据流

```text
content/posts/*.md
  -> collectPosts()            读取全部文章（含草稿），汇总所有 ContentIssue
  -> parsePostSource()         校验 frontmatter，失败抛 ContentValidationError
  -> loadAllPosts()            有错误则失败；按 date 倒序、同日按 slug 升序
  -> buildPublicIndex()        过滤 isPublished，生成 PostSummary 与分类/标签计数
  -> getPosts() 等              'use cache' 缓存后提供给页面
```

- **草稿隔离**：过滤发生在 `buildPublicIndex`，公开数据在物理上不包含草稿；不存在 `includeDrafts` 之类的开关，避免漏传参数导致泄漏。
- **slug 唯一性**：在 `collectPosts` 中对全部文章（含草稿）检查；重复时构建失败。
- **缓存边界**：只有 `src/lib/content/index.ts` 导入 `server-only` 与 `next/cache`；其余模块保持纯函数/纯 IO，Vitest 可直接测试。
- **开发环境**：`{ revalidate: 1, stale: 30 }`，改完 Markdown 刷新即可看到变化（不能用 `revalidate: 0`，见 ADR-016）。
- **生产环境**：已发布结果使用 `max` 配置；查找失败的结果使用 `minutes`，避免把"文章暂不存在"长期缓存。

## 页面渲染与 404

- 前台路由组 [`src/app/(site)/layout.tsx`](<../src/app/(site)/layout.tsx>) 导出 `ensureStatic = "navigation"`：整站要求"完整路由在构建期静态产出"，构建会阻止任何未缓存读取或请求期 API 混入。
- 三个动态段（`/posts/[slug]`、`/categories/[slug]`、`/tags/[slug]`）都用 `generateStaticParams` 预渲染所有已知参数，参数未列出时 Next 会**等待**静态结果后再响应，因此页面里的 `notFound()` 返回真正的 404 状态码（否则会先返回 200 的软 404）。
- 内容为空时 `toStaticSlugParams()` 返回占位参数，避免 `generateStaticParams` 返回空数组导致构建失败（ADR-017）。
- 404 有两处：根级 [`src/app/not-found.tsx`](../src/app/not-found.tsx) 处理未匹配路径；前台路由组 [`src/app/(site)/not-found.tsx`](<../src/app/(site)/not-found.tsx>) 处理 `notFound()`，保留主导航。

## 路由参数与分类/标签

Next 16 在把动态段交给页面代码前会执行一次 `encodeURIComponent`，因此页面拿到的 `params.slug` 是编码后的字符串：

- 页面/API 必须通过 `resolveTaxonomyParam()` **恰好解码一次**；
- 生成链接使用 `taxonomyHref(kind, name)`，它负责编码；
- `generateStaticParams` 返回**未编码**的原始名称（如「开发记录」），编码由 Next 完成。

分类/标签的 slug 目前就是规范化后的名称本身（中文保留在 URL 中，由浏览器编码）。这避免了维护额外的拼音/英文映射表，代价是改名即改 URL。

## 分层与边界

| 层         | 位置                          | 职责                                           |
| ---------- | ----------------------------- | ---------------------------------------------- |
| 路由/页面  | `src/app/`                    | 路由与页面组合；只调用内容访问层，不直接读文件 |
| 展示组件   | `src/components/`             | 纯展示；服务端组件优先，交互才用客户端组件     |
| SEO        | `src/lib/seo/`                | 元数据与 RSS 构建，纯函数                      |
| 内容访问层 | `src/lib/content/index.ts`    | `'use cache'` 包装，页面唯一入口               |
| 内容引擎   | `src/lib/content/*.ts`        | 解析、校验、排序、渲染；不依赖 Next 运行时     |
| 校验脚本   | `scripts/validate-content.ts` | 写作后与构建前的内容检查（文章 + 独立页面）    |
| 站点配置   | `src/lib/config.ts`           | 站点级配置唯一来源                             |
| 内容       | `content/`                    | 只存 Markdown，不放业务代码                    |

## 关键约束

- 页面组件不直接读文件系统；一律通过 `@/lib/content` 的统一接口（ESLint `no-restricted-imports` 已限制）。
- 公开构建只收录已发布文章；草稿不得出现在列表、搜索、RSS、sitemap 或公开 API 中。
- 内容引擎不信任 Markdown：原始 HTML 丢弃、危险 URL 拒绝、图片必须带 alt。
- 站点地址、导航、作者等配置只在 `src/lib/config.ts` 维护；`SITE_URL` 决定 canonical、sitemap 与 RSS 里的绝对地址。
- 后台写操作（未来）必须在服务端完成鉴权、校验与授权。
- MVP 不引入微服务、消息队列或数据库。

## 技术栈

Next.js 16（App Router、Turbopack、Cache Components、`ensureStatic`）、React 19、TypeScript strict、Tailwind CSS v4、Zod 4、unified/remark/rehype、Shiki（`rehype-pretty-code`）、Vitest。详见 [DECISIONS.md](DECISIONS.md)。

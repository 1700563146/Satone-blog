# 技术决策记录

> 记录影响深远的架构与技术选择。新增或推翻决策时追加条目，不要改写历史条目。

## ADR-001：内容架构采用方案 A（静态 Markdown 优先）

- 日期：2026-10-23
- 状态：已采纳
- 决策：文章保存在 `content/posts/*.md`，构建时读取；Git 作为版本历史与备份。首期不引入数据库。
- 理由：个人博客以文章为核心资产，Markdown 可迁移、可离线写作；避免维护"文件 + 数据库"两套真相来源（开发文档 §5.3）。
- 影响：在线管理后台、定时发布等能力推迟到阶段 5，且需重新评估内容写入方式。

## ADR-002：MVP 不实现在线后台、评论与数据库

- 日期：2026-10-23
- 状态：已采纳
- 决策：按开发文档 P0 范围推进；后台、评论、搜索增强等属于 P1/P2。
- 理由：严格控制首版范围，先交付可靠的内容与阅读体验（开发文档 §2.2、§17）。

## ADR-003：包管理器使用 npm

- 日期：2026-10-23
- 状态：已采纳
- 决策：统一使用 npm，锁定 `package-lock.json`；`packageManager` 字段固定 npm 11.12.1。
- 理由：开发环境仅安装 npm（无 pnpm/yarn），减少工具链差异。

## ADR-004：字体使用系统字体栈，不引入 Google Fonts

- 日期：2026-10-23
- 状态：已采纳
- 决策：`--font-sans` 使用 PingFang SC / Microsoft YaHei / Noto Sans SC / system-ui 栈；不使用 `next/font/google` 的 Geist。
- 理由：国内网络构建时拉取 fonts.googleapis.com 不稳定，会同时影响本地构建与 CI；Geist 无中文字形。后续如需品牌字体，自托管到 `public/fonts/` 再引入。

## ADR-005：设计 Token 通过 Tailwind v4 `@theme` 集中管理

- 日期：2026-10-23
- 状态：已采纳
- 决策：开发文档 §9.2 的变量写入 `src/styles/globals.css` 的 `@theme`，同时生成 CSS 变量与工具类；毛玻璃容器统一使用 `@utility glass-card`。
- 理由：单一来源，避免组件中散落颜色/圆角；后续暗色主题通过变量覆盖即可实现。

## ADR-006：测试基线为 Vitest（单元），Playwright 延后

- 日期：2026-10-23
- 状态：已采纳
- 决策：阶段 1 仅配置 Vitest（Node 环境、纯 TS 单元测试）；React 组件测试在阶段 2 引入 jsdom/Testing Library；Playwright 端到端测试在阶段 3/4 引入。
- 理由：按实际测试需求渐进引入依赖，避免空配置。

## ADR-007：保持 Next 16 默认的 Cache Components 配置

- 日期：2026-10-23
- 状态：已采纳
- 决策：保留模板默认的 `cacheComponents: true` 与 `partialPrefetching: true`。
- 理由：跟随框架默认能力；动态路由的 `params` 按官方指引在 `<Suspense>` 内 await，保证静态外壳可预渲染。阶段 2/3 实现内容读取后如遇缓存语义问题，在此记录调整。

## ADR-008：开发文档保留在仓库根目录

- 日期：2026-10-23
- 状态：已采纳
- 决策：`开发文档.md` 保持在根目录作为总规划文档；README 与 docs/ 链接引用它。
- 理由：它是项目开工前的规划基线，与仓库一同版本化；避免与 docs/ 内的阶段文档重复维护。

## ADR-009：分类/标签 slug 使用规范化后的原始名称

- 日期：2026-10-23
- 状态：已采纳
- 决策：分类/标签的 URL 段就是名称本身（如「开发记录」），链接时用 `encodeURIComponent` 编码；页面参数通过 `resolveTaxonomyParam()` 恰好解码一次。
- 理由：中文博客的分类以中文为主，额外维护拼音/英文映射表会增加写作负担与不一致风险。Next 在把动态段交给页面代码前会执行一次 `encodeURIComponent`（已在 node_modules 中核实），因此必须约定解码边界；`generateStaticParams`（阶段 3）返回原始名称，由 Next 负责编码。
- 影响：改名即改 URL，已发布内容需要重定向；名称禁止包含 `/ \ ? # %` 等字符。

## ADR-010：日期使用"日历日期"字符串，不做时区换算

- 日期：2026-10-23
- 状态：已采纳
- 决策：`date` / `updatedAt` 必须是加引号的 `YYYY-MM-DD` 字符串；拒绝 YAML 自动解析出的 Date；展示时直接拼接中文年月日。
- 理由：博客的发布日期表达的是"哪一天"，不是精确时刻。使用字符串比较排序可避免构建机时区导致日期漂移；`formatPostDate` 不经过 Date 运算。更关键的是，js-yaml 会把 `2026-02-30` 自动进位成 `2026-03-02`，接受 Date 等于静默接受非法日期，因此必须要求在源头加引号。
- 影响：日期书写多一对引号；跨时区定时发布不在 MVP 范围内。

## ADR-011：内容引擎与 Next 运行时分离，缓存只在访问层

- 日期：2026-10-23
- 状态：已采纳
- 决策：`schema` / `parse-frontmatter` / `read-posts` / `render-markdown` 不导入 `next/cache` 或 `server-only`；只有 `src/lib/content/index.ts` 使用 `'use cache'` 并提供页面所需的数据获取函数。
- 理由：核心逻辑可在纯 Node 环境下用 Vitest 直接测试，也避免单元测试被 Next 的缓存上下文限制。页面通过 ESLint 规则禁止绕过访问层。
- 影响：所有新增的公开数据获取函数都加在 `index.ts`；内部工具函数不要从页面直接调用。

## ADR-012：草稿隔离采用物理过滤，不提供 includeDrafts 开关

- 日期：2026-10-23
- 状态：已采纳
- 决策：`buildPublicIndex()` 只接受 `isPublished()` 为真的文章；公开 DTO（`PostSummary`、`PostDetail`）不包含 `published` / `draft` 字段。
- 理由：fail-closed。若提供开关，任何一处忘记传参都可能把草稿泄漏到列表、RSS 或 sitemap；从数据结构上移除标志位也能减少误用。
- 影响：需要读取草稿的场景（如未来后台）使用 `loadAllPosts()`，该函数明确返回全部文章并仅限服务端内部使用。

## ADR-013：Markdown 安全策略与渲染管线

- 日期：2026-10-23
- 状态：已采纳
- 决策：使用 unified + remark-parse + remark-gfm + remark-rehype + rehype-slug + rehype-stringify；不开启 `allowDangerousHtml`；URL 采用 allowlist（http/https/mailto/tel/站内相对路径）；外链加 `target="_blank"` + `rel="noopener noreferrer"`；图片必须有 alt 并默认懒加载。
- 理由：内容来自仓库作者本人，但仍需防止误粘贴的危险链接；不开原始 HTML 可以从根本上消除 XSS 面。安全规则同时用于渲染与 `analyzeMarkdown` 静态检查，保证"能通过校验"与"能安全渲染"一致。
- 影响：语法高亮（Shiki / rehype-pretty-code）、图片尺寸优化、自动链接增强推迟到阶段 3；当前保留 `language-xx` 类名。

## ADR-014：构建前运行内容校验脚本

- 日期：2026-10-23
- 状态：已采纳
- 决策：新增 `scripts/validate-content.ts`（`npm run validate:content`），通过 `prebuild` 在每次 `next build` 前自动执行；脚本汇总 frontmatter、重复 slug 与 Markdown 问题，存在 error 时退出码为 1。
- 理由：把内容错误挡在构建之前，错误信息包含文件、行号与错误码，便于作者直接修复；CI 的 `build` 步骤因此天然包含内容检查。
- 影响：Node 侧的校验与页面读取共用同一套 schema 与解析代码，不会出现"脚本通过但构建失败"的规则漂移。

## ADR-015：frontmatter 严格校验，未知字段直接报错

- 日期：2026-10-23
- 状态：已采纳
- 决策：使用 `z.strictObject`；`published` 与 `draft` 均为必填布尔值且不能同时为 `true`；`slug`/`title`/`description`/`date` 必填；分类最多 5 个、标签最多 20 个。
- 理由：拼写错误（如 `pubished`）与缺失发布标志是静态博客最常见的事故来源，静默忽略可能导致文章意外发布或消失。显式要求两个标志，也让"草稿"和"未发布"语义清晰。
- 影响：旧文章迁移时需要补全字段；错误消息统一为中文（Zod zh-CN locale + 自定义提示）。

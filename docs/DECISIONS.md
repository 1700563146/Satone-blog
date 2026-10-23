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

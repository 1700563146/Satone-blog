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

## ADR-016：前台整站要求静态产出，未列出的动态参数返回真正的 404

- 日期：2026-10-23
- 状态：已采纳
- 决策：在 [`src/app/(site)/layout.tsx`](<../src/app/(site)/layout.tsx>) 导出 `ensureStatic = "navigation"`；同时把 `use cache` 作用域的开发期配置从 `revalidate: 0` 改为 `{ revalidate: 1, stale: 30 }`。
- 理由：Cache Components 下 `dynamicParams` 被禁用（构建直接报错），未在 `generateStaticParams` 中列出的参数会先用 App Shell 响应——页面里的 `notFound()` 在流式渲染中已经来不及改状态码，实测第一次请求返回 **200 的软 404**，第二次请求又变成 Next 内置错误页。`ensureStatic = 'navigation'` 要求"未列出的参数等待完整静态结果生成后再响应"，`notFound()` 因此返回真正的 404；同时它在构建期校验"完整路由不得包含未缓存读取或请求期 API"，可防止后续改动悄悄把静态页变成动态页。
- 影响：`revalidate: 0` 会与 `ensureStatic` 冲突（构建/开发均校验失败），开发期改用 1 秒失效——改完 Markdown 刷新即可看到，效果与关闭缓存一致。新增页面若引入未缓存的数据读取会构建失败，需放进 `use cache` 作用域。

## ADR-017：`generateStaticParams` 在无已发布内容时返回占位参数

- 日期：2026-10-23
- 状态：已采纳
- 决策：所有动态段统一通过 [`src/lib/routing.ts`](../src/lib/routing.ts) 的 `toStaticSlugParams()` 生成参数；内容为空时返回 `{ slug: "__placeholder__" }`。
- 理由：Cache Components 要求 `generateStaticParams` 至少返回一个参数，空数组会让构建直接失败（`empty-generate-static-params`）。占位参数会走到 `notFound()`，既不伪造内容，也不让"刚初始化、还没写文章"的仓库无法构建。
- 影响：空仓库首次构建会多出一个 404 静态条目；有内容后自然消失。分类/标签页同样复用该函数。

## ADR-018：独立页面使用 `content/pages/<name>.md` 与可选 frontmatter

- 日期：2026-10-23
- 状态：已采纳
- 决策：关于等固定页面的正文来自 `content/pages/<name>.md`，页面名只能是小写字母、数字与连字符（同时挡掉路径穿越）；frontmatter **可整体省略**，允许的字段只有 `title` / `description` / `updatedAt`，未知字段同样报错；文件缺失时 `notFound()`，不渲染空白页。
- 理由：about 页需要有正文可编辑，但不应为此引入 CMS；与文章共用同一套 Markdown 安全渲染管线。页面比文章简单——没有 slug（由文件名决定）、没有发布状态，避免维护第二套"真相"。
- 影响：新增独立页面只需加一个 md 文件并在页面里调用 `getPage(name)`；`npm run validate:content` 已把 `content/pages/` 纳入检查。

## ADR-019：RSS 的 `pubDate` 以站点时区锚定到当日 00:00

- 日期：2026-10-23
- 状态：已采纳
- 决策：`toRfc822Date()` 用文章日期 + `siteConfig.timeZoneOffset` 生成 RFC 822 时间，星期与月份用 UTC 分量计算；标题、描述、链接一律经过 `escapeXml()`。
- 理由：文章 `date` 只表示"日历上的哪一天"（ADR-010），而 RSS 需要具体时刻；固定偏移而不是读取构建机时区，保证本机与 CI 产出完全一致。RFC 822 要求 `+HHMM`，因此配置里写便于阅读的 `+08:00`，输出前去掉冒号。
- 影响：读者客户端按本地时区显示日期时，东八区以外可能显示为前一天——这是"只有日期没有时刻"的固有取舍。

## ADR-020：语法高亮推迟到部署前，先做代码块排版

- 日期：2026-10-23
- 状态：已被 ADR-021 取代（高亮已接入，见下一条）
- 决策：阶段 3 只提供代码块的排版样式（深底、横向滚动、保留 `language-xx` 类名），暂不引入 Shiki / rehype-pretty-code。
- 理由：高亮需要新增依赖与构建期主题资源，属于阅读体验的装饰层；先把页面、目录、404、SEO 与可访问性闭环，收益更高。
- 影响：代码块目前没有颜色区分；后续接入时只需在 `renderMarkdown` 的 rehype 链上加一个插件，配色可直接复用 `.prose pre` 的样式。

## ADR-021：代码高亮改用 Shiki + rehype-pretty-code，构建期着色

- 日期：2026-10-23
- 状态：已采纳（取代 ADR-020）
- 决策：引入 `rehype-pretty-code` + `shiki`，在 `renderMarkdown` 的 rehype 链上着色；主题 `github-dark-default`，`keepBackground: false`（背景仍由 `.prose pre` 决定），`defaultLang: "text"`（未标语言的代码块按纯文本渲染），`bypassInlineCode: true`（行内代码不着色）。
- 理由：页面、SEO、404 已经闭环，代码可读性是技术博客的核心阅读体验；Shiki 在构建期把代码渲染成纯 HTML + 行内颜色，不向客户端发送 JS（已核对产物：客户端 chunk 中不含 shiki/oniguruma）。`defaultLang` 避免"忘记写语言"导致构建失败，`bypassInlineCode` 避免给行内代码套一层无意义的 span。
- 影响：HTML 体积随代码量增长（示例文章页约 26 KB）；主题升级可能改变配色，单元测试只断言结构与"存在行内颜色"，不断言具体色值。新增语法无需配置——Shiki 按需加载语言包。

## ADR-022：组件测试用 jsdom + Testing Library，按文件声明环境

- 日期：2026-10-23
- 状态：已采纳
- 决策：引入 `jsdom`、`@testing-library/react`、`@testing-library/user-event`、`@testing-library/jest-dom`；Vitest 全局环境仍是 `node`，组件测试文件首行用 `// @vitest-environment jsdom` 切换。`tests/setup.tsx` 提供两件事：jest-dom 匹配器；把 `next/link` 替成普通 `<a href>` 并拦截 `<a>` 的默认跳转。
- 理由：绝大多数测试是纯逻辑（内容引擎、SEO、RSS），放进 jsdom 会显著拖慢；按文件切换环境可以两者兼得。组件在 jsdom 里没有 App Router 上下文，`next/link` 会直接报错，因此在 setup 里替换为语义等价的链接，断言仍然落在可访问名称与 `href` 上。
- 影响：新增组件测试文件必须写环境注释，否则会因为没有 `document` 而失败；断言不要依赖 Tailwind 类名，优先 `getByRole` / `getByText`。

## ADR-023：端到端测试用 Playwright，桌面与移动端双 project

- 日期：2026-10-23
- 状态：已采纳
- 决策：引入 `@playwright/test`，`tests/e2e/*.spec.ts`；`playwright.config.ts` 定义 `desktop`（Desktop Chrome）与 `mobile`（Pixel 7）两个 project，`webServer` 只负责 `next start`（固定端口 34901），构建由调用方先行完成。CI 中 e2e 是独立 job：build → 安装 Chromium → 跑测试 → 失败时上传 `playwright-report`/`test-results`。
- 理由：单元/组件测试无法覆盖"真浏览器里点进去"的关键路径（路由跳转、PPR 静态壳、移动端折叠菜单）。桌面/移动端双 project 让同一份用例顺带验证响应式行为，移动端专属用例用 `test.skip(({ isMobile }) => !isMobile)` 精确跳过。
- 影响：本地必须先 `npm run build`；浏览器二进制需要单独下载。网络受限时可用 `PLAYWRIGHT_CHANNEL=chrome`（或 `msedge`）借用本机浏览器，CI 不受影响。

## ADR-024：导航折叠菜单是客户端组件，状态复位在渲染阶段完成

- 日期：2026-10-23
- 状态：已采纳
- 决策：把交互部分拆到 `src/components/navigation/nav-menu.tsx`（`"use client"`），`navbar.tsx` 保持服务端组件并以 props 传入导航条目；折叠状态与"它属于哪个路径"一起存放，路由变化时在渲染阶段直接复位，而不是在 `useEffect` 里 `setState`。
- 理由：原方案靠 `flex-wrap` 折行，虽然无 JS，但开发文档 §9.3 要求"清楚的折叠方案"；真正的折叠菜单需要 `aria-expanded`、`aria-controls`、Escape 关闭与焦点归还，这些只有客户端组件能做。把服务端配置留在父组件，避免把 `SITE_URL` 等 env 派生值打进客户端包。渲染期复位遵循 React 的"派生状态"模式，同时满足 `react-hooks/set-state-in-effect` 规则（该规则会拦截 effect 里的同步 setState）。
- 影响：引入首个客户端组件（体积很小：只有图标与状态）；收起方式有三种——点击条目、按 Escape（焦点归还按钮）、点击面板与按钮之外的区域，另外路由变化会在渲染阶段复位。`<details>` 方案虽然零 JS，但无法在 Escape 时关闭并归还焦点，也无法标记当前页，故未采用。

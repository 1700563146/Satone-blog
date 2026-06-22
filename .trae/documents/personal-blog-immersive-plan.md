# 个人沉浸式静态博客网站实施计划

## Summary

目标是从零搭建一个可静态部署、可持续维护的个人博客与作品集网站。首版采用“静态博客”路线，面向“会一点代码”的使用者，支持用 Markdown 或 MDX 写文章与作品说明。

网站风格定位为“沉浸式全屏视觉博客”：背景图或视觉背景占主导，内容通过玻璃拟态遮罩悬浮其上，排版极简，加入轻量淡入、悬停反馈和低强度视差。首版范围包含首页、关于页、博客列表、文章详情、作品列表、作品详情、标签归档、RSS、sitemap、robots 和基础 SEO。

推荐技术栈为 Astro + TypeScript + Markdown/MDX + 原生 CSS。Astro 适合内容型静态站，Content Collections 可以为博客文章和作品集提供结构化内容管理、类型约束和构建期静态生成；原生 CSS 能更精细地实现玻璃拟态、全屏视觉、响应式排版和微交互，避免首版引入过重 UI 库。

## Current State Analysis

当前所选文件夹为空，没有现有项目结构、依赖文件或可复用代码。因此本计划按“新建 Astro 静态站项目”设计，不涉及迁移旧代码。

用户已明确以下需求：

- 搭建方式：静态博客。
- 技术水平：会一点代码。
- 首版功能：基础博客、作品展示。
- 视觉方向：沉浸式全屏视觉博客，强调背景主导、玻璃拟态遮罩、极简排版与动态微交互。
- 情绪关键词：梦幻感、电影感、静谧治愈、未来主义、二次元美学、极简主义、情绪化视觉。

设计技能约束要求本项目不能采用模板化、普通卡片堆叠或常见 AI 风格页面。执行时需要先确立强视觉方向，再用一致的字体、色彩、背景层、玻璃层、动效系统和响应式规则落地。动效应服务于氛围，不应影响阅读、性能和可访问性。

## Proposed Changes

### 项目根目录

#### `package.json`

创建项目依赖与脚本。

用途：

- 声明 Astro、TypeScript、RSS 和 sitemap 相关依赖。
- 提供本地开发、构建和预览命令。

建议内容：

- `dev`: `astro dev`
- `build`: `astro check && astro build`
- `preview`: `astro preview`

首版依赖：

- `astro`
- `@astrojs/sitemap`
- `@astrojs/rss`
- `typescript`

可选依赖：

- `@astrojs/mdx`，仅当文章需要嵌入组件时启用。

#### `astro.config.mjs`

创建 Astro 配置。

用途：

- 设置 `output: 'static'`，确保站点可静态部署。
- 配置 `site`，用于 canonical、sitemap 和 RSS。
- 启用 `@astrojs/sitemap`。
- 需要 MDX 时启用 `@astrojs/mdx`。

决策：

- 首版使用静态输出。
- `trailingSlash` 建议设为 `always`，保持 URL 稳定。
- `site` 先使用占位域名，部署前替换为真实域名。

#### `tsconfig.json`

创建 TypeScript 配置。

用途：

- 使用 Astro 推荐配置。
- 为内容集合、页面 props 和组件 props 提供类型检查。

### 内容模型

#### `src/content.config.ts`

创建 `blog` 与 `projects` 两个内容集合。

用途：

- 用 schema 校验 Markdown frontmatter。
- 支持构建期静态生成文章和作品详情页。
- 避免文章字段不完整导致页面展示异常。

`blog` 字段：

- `title`: 文章标题。
- `description`: SEO 摘要和卡片描述。
- `pubDate`: 发布时间。
- `updatedDate`: 可选更新时间。
- `tags`: 标签数组。
- `heroImage`: 可选封面图。
- `heroAlt`: 封面图说明。
- `draft`: 草稿标记。
- `featured`: 首页精选标记。

`projects` 字段：

- `title`: 作品标题。
- `description`: 作品摘要。
- `pubDate`: 发布时间。
- `role`: 项目角色。
- `stack`: 技术栈数组。
- `coverImage`: 作品封面。
- `coverAlt`: 封面说明。
- `demoUrl`: 可选演示链接。
- `repoUrl`: 可选代码仓库链接。
- `draft`: 草稿标记。
- `featured`: 首页精选标记。

#### `src/content/blog/first-post/index.md`

创建示例文章。

用途：

- 验证博客集合 schema。
- 展示用户后续如何写文章。
- 提供首版页面数据。

内容应包含完整 frontmatter 和一段示例正文，正文可围绕“第一篇个人博客”或“视觉与创作记录”。

#### `src/content/projects/first-project/index.md`

创建示例作品。

用途：

- 验证作品集合 schema。
- 展示作品说明写法。
- 支撑首页与作品列表展示。

内容应包含项目背景、角色、技术栈、成果描述和可选链接字段。

### 站点配置

#### `src/site.config.ts`

创建统一站点配置。

用途：

- 集中维护站点名、作者、描述、域名、导航和社交链接。
- 避免页面中重复硬编码 SEO 信息。

字段建议：

- `name`
- `title`
- `description`
- `url`
- `author`
- `locale`
- `nav`
- `socials`

执行时应使用中文默认内容和可替换占位信息，例如“你的名字”“视觉博客与作品集”。

### 页面路由

#### `src/pages/index.astro`

创建首页。

用途：

- 展示全屏沉浸式 Hero。
- 展示个人简介、精选文章和精选作品。
- 作为视觉风格的核心样板。

实现方式：

- 使用 `getCollection('blog')` 和 `getCollection('projects')` 读取非草稿内容。
- 优先展示 `featured: true` 内容。
- 使用 `HeroVisual`、`GlassPanel`、`PostCard`、`ProjectCard` 组件。

视觉要求：

- 首屏高度接近完整视口。
- 背景层占据主导，顶部保留视觉留白。
- 标题、标语和按钮位于中央或中下部。
- CTA 使用玻璃按钮和微弱光晕 hover。

#### `src/pages/about.astro`

创建关于页。

用途：

- 展示个人介绍、关注方向、技能、联系方式。
- 延续沉浸式背景与玻璃面板风格。

实现方式：

- 使用 `BaseLayout`。
- 用一个主视觉区和若干轻量信息块组成。
- 不引入复杂时间线，避免首版过度设计。

#### `src/pages/blog/index.astro`

创建博客列表页。

用途：

- 按发布时间倒序展示文章。
- 提供标签入口。

实现方式：

- 读取 `blog` 集合。
- 过滤 `draft: true`。
- 使用 `PostCard` 展示文章标题、描述、日期、标签和封面。

#### `src/pages/blog/[...slug].astro`

创建文章详情页。

用途：

- 为每篇 Markdown 文章生成静态页面。
- 渲染文章正文、封面、标签、日期和 SEO 信息。

实现方式：

- 使用 `getStaticPaths()` 从 `blog` 集合生成路由。
- 使用 `render(post)` 渲染正文。
- 使用 `PostLayout` 包裹内容。
- 注入 `BlogPosting` JSON-LD。

#### `src/pages/projects/index.astro`

创建作品列表页。

用途：

- 展示所有非草稿作品。
- 用视觉卡片突出封面、角色和技术栈。

实现方式：

- 读取 `projects` 集合。
- 过滤草稿。
- 使用 `ProjectCard`。
- 桌面端可采用不完全对称网格，移动端单列展示。

#### `src/pages/projects/[...slug].astro`

创建作品详情页。

用途：

- 为每个作品生成静态详情页。
- 展示封面、角色、技术栈、项目说明、演示链接和仓库链接。

实现方式：

- 使用 `getStaticPaths()` 从 `projects` 集合生成路由。
- 使用 `ProjectLayout` 渲染正文。
- 注入 `CreativeWork` JSON-LD。

#### `src/pages/tags/[tag].astro`

创建标签归档页。

用途：

- 为博客标签生成聚合页。
- 提高内容组织和 SEO 友好度。

实现方式：

- 从非草稿文章中收集所有标签。
- 为每个标签生成静态路径。
- 页面中展示该标签下所有文章。

#### `src/pages/rss.xml.ts`

创建 RSS 输出。

用途：

- 支持用户订阅文章更新。

实现方式：

- 使用 `@astrojs/rss`。
- 仅输出非草稿博客文章。
- 标题、描述、链接和发布时间来自 frontmatter。

#### `src/pages/robots.txt.ts`

创建 robots 输出。

用途：

- 允许搜索引擎抓取。
- 指向 sitemap。

实现方式：

- 通过 Astro API route 返回纯文本。
- 使用站点配置生成 sitemap 地址。

### 布局组件

#### `src/layouts/BaseLayout.astro`

创建全站基础布局。

用途：

- 设置 HTML 语言为 `zh-CN`。
- 引入全局样式。
- 注入 `BaseHead`。
- 包含导航、主内容和页脚。

实现方式：

- 接收 `title`、`description`、`image`、`type` 等 props。
- 支持页面级背景配置或插槽。

#### `src/layouts/PostLayout.astro`

创建文章布局。

用途：

- 统一文章详情页视觉结构。
- 保证阅读体验稳定。

实现方式：

- 顶部使用大封面和渐变遮罩。
- 标题区使用玻璃面板。
- 正文区域限制最大宽度为约 `72ch`。
- 底部展示标签和返回博客链接。

#### `src/layouts/ProjectLayout.astro`

创建作品布局。

用途：

- 统一作品详情页视觉结构。

实现方式：

- 首屏展示作品封面。
- 玻璃信息面板展示角色、技术栈和外链。
- 正文介绍项目背景、过程和成果。

### UI 组件

#### `src/components/BaseHead.astro`

创建 SEO 组件。

用途：

- 统一输出 `title`、`description`、canonical、Open Graph、Twitter Card、favicon、theme-color。
- 支持注入结构化数据。

执行要求：

- 不在各页面重复写散乱 meta。
- 每个页面都传入唯一标题和描述。

#### `src/components/SiteNav.astro`

创建导航组件。

用途：

- 提供首页、博客、作品、关于入口。

视觉要求：

- 不使用厚重传统导航栏。
- 可采用悬浮式玻璃导航或极简文字导航。
- 移动端保持可点击区域足够大。

#### `src/components/SiteFooter.astro`

创建页脚组件。

用途：

- 展示版权、RSS、社交链接和返回顶部入口。

#### `src/components/HeroVisual.astro`

创建沉浸式首屏组件。

用途：

- 封装背景图、渐变遮罩、标题、标语和 CTA。
- 成为首页视觉核心。

视觉要求：

- 背景占满视口。
- 内容浮在中部或中下部。
- 使用透明、模糊和柔和阴影保证可读性。

#### `src/components/GlassPanel.astro`

创建玻璃拟态容器组件。

用途：

- 统一玻璃面板样式。
- 避免重复 CSS。

实现要求：

- 使用半透明背景。
- 使用 `backdrop-filter` 和 `-webkit-backdrop-filter`。
- 提供无 `backdrop-filter` 时的可读降级背景。

#### `src/components/PostCard.astro`

创建文章卡片组件。

用途：

- 统一文章列表和首页精选文章展示。

内容：

- 封面图。
- 标题。
- 描述。
- 日期。
- 标签。

交互：

- hover 时轻微上浮、光晕或图片缩放。
- 触屏端不能依赖 hover 才显示关键信息。

#### `src/components/ProjectCard.astro`

创建作品卡片组件。

用途：

- 统一作品列表和首页精选作品展示。

内容：

- 封面图。
- 标题。
- 角色。
- 技术栈。
- 描述。

视觉要求：

- 图片主导。
- 文字通过玻璃遮罩浮层展示。
- 移动端默认显示所有关键信息。

#### `src/components/TagPill.astro`

创建标签组件。

用途：

- 统一博客标签显示。
- 链接到标签归档页。

#### `src/components/Prose.astro`

创建正文排版组件或样式包装。

用途：

- 统一 Markdown 正文的标题、段落、引用、代码块、图片样式。

#### `src/components/Reveal.astro`

创建淡入包装组件。

用途：

- 为需要进入视口淡入的内容添加 `data-reveal` 标记。
- 避免页面中手写重复属性。

### 样式系统

#### `src/styles/tokens.css`

创建设计令牌。

用途：

- 集中维护颜色、字体、间距、圆角、阴影、模糊强度和动效时长。

设计方向：

- 背景色采用深色电影感基底。
- 文字采用暖白或浅灰。
- 点缀色可选低饱和金色、浅蓝或冷白光。
- 标题字体应比常规系统字体更有记忆点；如使用网络字体，应注意加载性能和中文兼容性。

#### `src/styles/global.css`

创建全局样式。

用途：

- reset。
- body 背景与字体。
- 图片自适应。
- 链接样式。
- 可访问性 focus 样式。

要求：

- 全站避免横向滚动。
- focus 状态必须清晰可见。

#### `src/styles/layout.css`

创建布局样式。

用途：

- 页面容器。
- 网格。
- section 间距。
- 响应式断点。

断点决策：

- 手机：单列布局，Hero 使用 `min-height: 82svh` 以上。
- 平板：两列卡片。
- 桌面：沉浸式大背景和多列作品网格。

#### `src/styles/motion.css`

创建动效样式。

用途：

- 淡入。
- hover。
- 低强度浮动。
- `prefers-reduced-motion` 降级。

要求：

- 动画只使用 `transform` 和 `opacity` 为主。
- 不能让正文阅读区产生明显跳动。
- 当用户开启减少动画时，应基本关闭动画和视差。

#### `src/styles/prose.css`

创建正文样式。

用途：

- 控制 Markdown 正文行宽、字号、行距和段落间距。
- 美化代码块、引用、列表、图片说明。

要求：

- 正文最大宽度控制在约 `72ch`。
- 行距保持宽松，符合静谧治愈的阅读氛围。

### 脚本

#### `src/scripts/reveal.ts`

创建进入视口淡入脚本。

用途：

- 使用 `IntersectionObserver` 给 `[data-reveal]` 元素添加可见类。

要求：

- 元素显示后取消观察，减少运行成本。
- 不支持或关闭动画时不影响内容显示。

#### `src/scripts/parallax.ts`

创建低强度视差脚本。

用途：

- 只为首屏背景或少量装饰层添加滚动视差。

要求：

- 使用 `requestAnimationFrame`。
- 移动端或 `prefers-reduced-motion: reduce` 时关闭。
- 不对大量卡片或正文应用视差。

### 静态资源

#### `public/favicon.svg`

创建站点图标。

用途：

- 浏览器标签页和书签显示。

#### `public/og-default.jpg`

准备默认分享图。

用途：

- 当页面没有单独封面时用于 Open Graph 分享。

#### `public/manifest.webmanifest`

创建基础 Web App manifest。

用途：

- 提供站点名称、主题色和图标信息。

#### `src/assets/backgrounds/`

存放沉浸式背景资源。

要求：

- 首屏背景需控制尺寸，避免过大影响加载。
- 同一背景可准备桌面与移动端版本。

## Assumptions & Decisions

### 技术决策

- 使用 Astro，而不是 Next.js、Nuxt 或 WordPress。原因是首版需要静态博客、Markdown 写作、较低维护成本和良好性能。
- 使用 Content Collections 管理文章和作品。原因是可以在构建阶段校验内容字段，减少维护出错。
- 首版不引入 CMS 后台。原因是用户选择静态博客且会一点代码，Markdown 写作更简单、稳定、成本低。
- 首版不引入大型动画库或 WebGL。原因是沉浸式视觉可以通过 CSS、图片、渐变、玻璃拟态和少量 JS 达成，复杂视觉库会增加维护和性能风险。
- 首版不实现评论、全文搜索、多语言和主题切换。这些功能可作为后续增强，避免首版范围过大。

### 视觉决策

- 采用深色电影感作为默认主题，配合高饱和背景图和低饱和玻璃 UI。
- 首屏不使用传统厚重导航栏，优先使用悬浮式极简导航。
- UI 元素不使用实体厚边框，主要依靠透明度、模糊、阴影、渐变遮罩和空间层级。
- 卡片和按钮 hover 使用轻微缩放、上浮、光晕扩散或渐变变化。
- 移动端必须保留文字可读性，不能把关键信息藏在 hover 状态中。

### 内容决策

- 博客 URL 使用 `/blog/slug/`。
- 作品 URL 使用 `/projects/slug/`。
- 标签 URL 使用 `/tags/tag/`。
- slug 建议使用英文或拼音，减少中文 URL 编码带来的分享问题。
- 每篇文章和作品必须提供 `title`、`description`、日期和必要图片说明。

### 部署决策

- 站点应兼容 Cloudflare Pages、Netlify、Vercel 和 GitHub Pages。
- 首选部署配置为 `npm run build`，输出目录为 `dist`。
- 如果部署到 GitHub Pages 的仓库子路径，执行时需要额外设置 Astro `base`，否则静态资源路径可能错误。

## Implementation Order

### 1. 初始化 Astro 项目

创建根目录项目文件、安装依赖、配置 Astro 和 TypeScript。

完成后应能运行：

- `npm run dev`
- `npm run build`

### 2. 建立内容集合

创建 `src/content.config.ts`，建立 `blog` 和 `projects` 集合，添加示例文章和示例作品。

完成后应能通过 schema 校验，并能在页面中读取内容。

### 3. 建立基础布局和 SEO

创建 `site.config.ts`、`BaseLayout.astro`、`BaseHead.astro`、`SiteNav.astro`、`SiteFooter.astro`。

完成后所有页面应共享统一布局、导航、页脚和 SEO 元信息。

### 4. 实现核心页面

依次实现首页、关于页、博客列表、文章详情、作品列表、作品详情和标签归档页。

完成后所有内容页面应能静态生成，草稿内容不会出现在生产页面。

### 5. 实现视觉系统

创建 tokens、global、layout、motion、prose 样式文件，完成 Hero、玻璃面板、文章卡片和作品卡片。

完成后站点应呈现统一的沉浸式视觉语言。

### 6. 实现微交互

创建 Reveal 和相关脚本，加入淡入、悬停和低强度视差。

完成后动效应轻量、稳定，并能在减少动画设置下关闭或降级。

### 7. 实现 RSS、robots 和 sitemap

创建 `rss.xml.ts` 和 `robots.txt.ts`，确保 sitemap 集成有效。

完成后应能访问 RSS、robots 和 sitemap。

### 8. 做部署准备

补齐 README 或简短使用说明，记录写文章、加作品和部署步骤。

完成后用户应能按说明新增 Markdown 内容并部署到静态托管平台。

## Verification Steps

### 本地构建验证

执行：

- `npm run build`
- `npm run preview`

检查：

- 构建无 TypeScript 或 Astro 错误。
- 所有动态路由能生成。
- 预览环境页面能正常访问。

### 功能验证

检查：

- 首页展示精选文章和精选作品。
- 博客列表按发布时间倒序。
- 作品列表展示封面、角色、技术栈和描述。
- 文章详情页能正确渲染 Markdown 正文。
- 作品详情页能正确渲染项目说明。
- 标签页能列出对应文章。
- `draft: true` 的文章和作品不会显示。

### SEO 验证

检查：

- 每页有唯一 `title`。
- 每页有 `description`。
- 每页有 canonical。
- Open Graph 信息存在。
- 文章页有 `BlogPosting` JSON-LD。
- 作品页有 `CreativeWork` JSON-LD。
- `rss.xml` 可访问。
- `robots.txt` 可访问并指向 sitemap。
- `sitemap-index.xml` 可生成。

### 响应式验证

检查：

- 手机端无横向滚动。
- 手机端导航可用。
- Hero 在小屏上不遮挡重要文字。
- 作品卡片在触屏设备上不依赖 hover 才显示关键信息。
- 正文行宽和字号适合阅读。
- 图片不会溢出容器。

### 视觉验证

检查：

- 首页首屏具有明确的沉浸式视觉效果。
- 背景图、渐变遮罩和玻璃面板层级清晰。
- 玻璃拟态不牺牲文字对比度。
- 字体、色彩、间距和动效保持一致。
- 页面不呈现通用模板感或普通卡片堆叠感。

### 性能验证

检查：

- 首屏背景图尺寸合理。
- 非首屏图片使用懒加载。
- 不引入大型动画库。
- JS 仅用于必要的 reveal 和 parallax。
- 动画主要使用 `transform` 和 `opacity`。

### 可访问性验证

检查：

- 图片有 `alt`，装饰图明确为空 alt。
- 链接文本有意义。
- 键盘 focus 清晰可见。
- 前景文字和背景对比足够。
- `prefers-reduced-motion` 下关闭或弱化动画。

## Out of Scope for First Version

首版不实现以下功能：

- 评论系统。
- 后台 CMS。
- 全文搜索。
- 多语言。
- 动态 OG 图片生成。
- 登录系统。
- WebGL 或 Three.js 大型视觉特效。
- 深色/浅色主题切换。

这些功能可以在基础站点稳定后按需追加。

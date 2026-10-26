# 深度定制指南

这份文档是给「想改动主题本身」的人看的：先记住**配置优先**——80% 的定制都能在 `src/config/*.ts` 里完成，不用碰组件。

## 1. 心智模型

```
src/pages/        路由（文件即路由，about.astro -> /about/）
src/layouts/      Layout.astro（HTML 外壳）/ MainGridLayout.astro（侧栏 + 导航 + 页脚网格）
src/components/   按域分组：layout / widget / pages / controls / features / common / misc
src/config/       所有开关与文案（barrel：src/config/index.ts）
src/content/      posts（文章）/ spec（关于、留言板）/ projects / dynamic（动态）
src/plugins/      自定义 remark/rehype 插件（15 个）
src/styles/       Tailwind 4 入口与全局样式
src/utils/        排序、日期、加密、TOC、图片 LQIP 等
scripts/          构建期脚本（LQIP、字体子集、Pagefind、图标）
public/           原样复制到 dist（含 /admin/publish 上传工具、图片）
```

改任何东西前先看 `src/config/index.ts` 导出了什么，多半已经有开关。

## 2. 配置速查

| 文件 | 管什么 |
| --- | --- |
| `siteConfig.ts` | 标题/副标题/描述/关键词/`site_url`/主题色相/页面开关/分页/文章页选项/订阅 |
| `navBarConfig.ts` | 导航菜单（`LinkPresets` + 自定义项）、搜索方式（Pagefind/Algolia） |
| `profileConfig.ts` | 头像、名字、签名、社交链接 |
| `sidebarConfig.ts` | 侧栏位置（left/right/both）、组件顺序与开关 |
| `backgroundWallpaper.ts` | 壁纸模式/图片/视频、横幅文案、打字机、遮罩暗度 |
| `fontConfig.ts` | 字体定义（`fontsList`）与各区域用哪个 `cssVariable` |
| `commentConfig.ts` | 评论系统（Twikoo/Waline/Giscus/Artalk…） |
| `analyticsConfig.ts` | 统计（Google/Umami/51la…） |
| `musicConfig.ts` / `announcementConfig.ts` | 音乐播放器、公告栏 |
| `friendsConfig.ts` / `sponsorConfig.ts` / `galleryConfig.ts` / `booknavConfig.ts` | 友链、打赏、相册、书签导航的数据 |
| `licenseConfig.ts` | 文章版权声明 |
| `effectsConfig.ts` / `pioConfig.ts` | 樱花/波纹等特效、看板娘 |
| `expressiveCodeConfig.ts` | 代码块（行号、折叠、语言标签、主题） |
| `coverImageConfig.ts` / `imageOptimization`（在 siteConfig） | 封面与图片压缩策略 |

页面级开关在 `siteConfig.ts` 顶部的 `pages`：把某项设成 `false`，对应路由会生成一个"跳转到 404"的空页并自动隐藏导航项。当前关闭：友链、留言板、动态、项目、相册、书签、打赏、B站/番组/VNDB/MAL。

## 3. 外观定制

**主题色**：`siteConfig.themeColor.hue`（0–360）+ `defaultMode`（light/dark/system）。整套配色由 Tailwind 的 OKLCH 派生，改一个数就换主题。

**字体**：两种做法
1. 用 Astro Fonts API：在 `fontsList` 里加一条，`provider` 可以是 `google`/`fontsource`/`bunny`/`fontshare`/`npm`/`local`；
2. **推荐：本地文件**（我们现在的做法）。把 woff2 放进 `public/assets/fonts/`，用 `provider: "local"` + `options.variants[].src`，构建期不联网。原因是 Astro 的远程 provider 会在构建时访问 CDN，网络受限时直接失败。

字体子集化：`fontConfig.subsetFonts` 里按 `cssVariable` 配置，构建脚本会扫描实际用到的字符生成精简 woff2（中文字体尤其重要）。

**布局**：`sidebarConfig` 决定左右侧栏与组件顺序；`siteConfig.pageWidth` 调内容宽度；`card.border`/`followTheme` 调卡片质感。

**横幅**：`backgroundWallpaper.common.homeText`（标题、副标题数组、打字机速度、下方链接）；`mode` 可选 `banner`/`fullscreen`/`overlay`/`none`。

## 4. 组件级修改

- 组件是 `.astro`（静态）+ `.svelte`（交互），Svelte 组件通过 `client:load` / `client:visible` 挂载。改交互逻辑找 `.svelte`。
- 想加一个页面级区块：在 `MainGridLayout.astro` 里插入，或新建 `src/pages/xxx.astro` 并复用 `MainGridLayout`。
- 想加一个侧栏组件：在 `src/components/widget/` 新建 `.astro`，再在 `sidebarConfig` 的组件列表里注册。

⚠️ **滚动性能有硬约束**（见 `CLAUDE.md`）：`src/utils/fullscreen-wallpaper-utils.ts` 的模糊值是量化到 2px 的、`grid-layout-utils.ts` 的粘性布局不得在滚动回调里读布局。改这两处前先读懂。

## 5. 内容玩法

- 前置元数据：`title` / `published`（Date，**不加引号**）/ `description` / `tags` / `category` / `image` / `draft` / `pinned` / `series`+`seriesOrder` / `password` / `comment`。
- 系列文章：同 `series` 值自动成组，`seriesOrder` 排序。
- 加密文章：设置 `password`（构建期加密，前端解密）。
- MDX：把 `.md` 换成 `.mdx` 即可在正文里用组件。

## 6. 加一个自定义 Markdown 插件

1. 在 `src/plugins/` 写 remark 或 rehype 插件（参考现有 15 个）；
2. 在 `astro.config.mjs` 的 `markdown.remarkPlugins` / `rehypePlugins` 里注册；
3. 若需要构建期数据（像 GitHub 卡片那样），在 `scripts/` 加脚本并串进 `package.json` 的 `build`。

## 7. 构建管线

`pnpm build` = `generate-github-card-data` → `generate-lqips` → `generate-vndb-covers` → `astro build` → `prune-pio-assets` → `subset-fonts` → `minify-inline-scripts` → `run-pagefind`。

- **LQIP**：`src/constants/lqips.json` 是提交进仓库的图片占位数据，换图片后要 `pnpm lqips` 重新生成。
- **Pagefind**：构建末尾对 `dist/` 建索引，搜索完全在前端跑，没有服务端。
- **图标**：`@iconify-json/*` 是本地图标集，新增图标集要 `pnpm add @iconify-json/<name>`。

## 8. 与上游同步（升级主题）

Firefly 更新很勤，建议：

```bash
git remote add firefly https://github.com/CuteLeaf/Firefly.git
git fetch firefly
git log --oneline firefly/main | head        # 看更新了什么
git diff --stat HEAD firefly/main -- src/ |  # 只关注 src/
```

实操建议：
- 我们改过的文件（`src/config/*`、`src/content/*`、`public/admin/*`、`docs/*`、`astro.config.mjs`、`package.json`）几乎必然冲突，先备份再合并；
- 优先"只取组件/样式"，配置文件保留我们自己的；
- 合并后跑 `pnpm install && pnpm check && pnpm build`，并重新 `pnpm lqips`（如果图片有变）。

## 9. 部署相关

- `site_url` 决定 canonical / sitemap / RSS，**换域名只改这一处**（外加 Cloudflare 自定义域名）；
- 产物 `dist/` 交给 Cloudflare Workers 静态资源（`wrangler.jsonc`），Vercel 是 `noindex` 备站；
- 静态托管的 404 依赖 `not_found_handling: "404-page"`，别把 `404.html` 删了。

## 10. 常见坑

| 现象 | 原因 |
| --- | --- |
| 构建报 `CannotFetchFontFile` | 字体用了远程 provider，改 `local` 并把 woff2 放进 `public/assets/fonts/` |
| 构建报 `published: Expected date` | frontmatter 日期加了引号，改成 `published: 2026-10-23` |
| 页面 404 但文件存在 | URL 少了尾斜杠（`trailingSlash: "always"`），或把页面放成了 `xxx.html` 而不是 `xxx/index.html` |
| 搜索搜不到 | 忘了跑 `run-pagefind`（`pnpm build` 会自动跑），或文字被 `data-pagefind-ignore` 排除 |
| 图片占位是旧图 | `src/constants/lqips.json` 没重新生成 |

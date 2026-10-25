# Sato Blog

基于 [Astro 7](https://astro.build) + [Firefly](https://github.com/CuteLeaf/Firefly) 主题的个人博客，纯静态产出，部署在 Cloudflare Workers（静态资源）。

- 站点：<https://blog.satone.cc.cd>
- 备站（noindex）：<https://satone-blog.vercel.app>

## 技术栈

| 层次 | 选择 |
| --- | --- |
| 框架 | Astro 7（静态站点生成） |
| 主题 | Firefly（基于 Fuwari），Svelte 5 交互组件 |
| 样式 | Tailwind CSS v4 |
| 内容 | Markdown + Astro Content Collections |
| 搜索 | Pagefind（构建期生成索引） |
| 部署 | Cloudflare Workers 静态资源 + GitHub Actions |

## 常用命令

```bash
pnpm install          # 安装依赖（只支持 pnpm）
pnpm dev              # 本地开发 http://localhost:4321
pnpm build            # 生产构建 → dist/（含图标、LQIP、字体子集、Pagefind 索引）
pnpm preview          # 预览构建产物
pnpm check            # Astro 诊断
pnpm type-check       # TypeScript 检查
pnpm new-post <slug>  # 新建一篇空文章
```

## 写文章

两种方式，都写进 `src/content/posts/<slug>.md`，然后由 CI 构建部署：

1. **浏览器上传**：打开 `/admin/publish/`，拖入 Markdown（可同时传图片），检查后一键提交到仓库。
2. **本地文件**：直接用编辑器写 `src/content/posts/<slug>.md`，`git push` 即可。

frontmatter 必填 `title` 与 `published`（写成未加引号的 YYYY-MM-DD），其余见 [内容规范](docs/CONTENT.md)。

## 部署

`git push` 到 `main` → GitHub Actions 跑 `pnpm check` / `type-check` / `build` → `wrangler deploy` 上传 `dist/`。详见 [部署说明](docs/DEPLOYMENT.md)。

## 目录速览

```
src/config/          站点配置（标题、导航、侧边栏、评论、字体……）
src/content/posts/   文章
src/content/spec/    关于等特殊页面
src/pages/           路由
public/admin/publish/ 上传发布工具（纯 HTML + JS，不依赖框架）
public/images/posts/ 文章图片
scripts/             构建期脚本（LQIP、字体子集、Pagefind 等）
```

主题本身的完整文档见 [Firefly 使用文档](https://docs-firefly.cuteleaf.cn/)。

# 沉浸式个人博客

这是一个基于 Astro 的静态个人博客与作品集网站，视觉风格为“沉浸式全屏视觉博客”：背景主导、玻璃拟态、极简排版和轻量微交互。

## 常用命令

```bash
npm install
npm run dev
npm run build
npm run preview
```

## 写一篇新文章

1. 在 `src/content/blog/` 下复制 `first-post` 文件夹并改名，例如 `my-new-post`。
2. 修改 `index.md` 的 frontmatter。
3. 正文直接写 Markdown。
4. `draft: false` 时会出现在网站中，`draft: true` 时不会发布。

## 添加一个新作品

1. 在 `src/content/projects/` 下复制 `first-project` 文件夹并改名。
2. 修改标题、描述、角色、技术栈、封面和链接。
3. 在正文中补充项目背景、过程和成果。

## 部署

推荐部署到 Cloudflare Pages、Netlify 或 Vercel。

- 构建命令：`npm run build`
- 输出目录：`dist`

部署前请把 `astro.config.mjs` 和 `src/site.config.ts` 中的 `https://your-domain.com` 替换为你的真实域名。

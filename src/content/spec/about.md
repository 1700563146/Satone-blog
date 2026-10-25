# 关于我

我是 **Sato**，这个博客的作者。

这里主要记录开发过程中的技术取舍、踩过的坑，以及读书和生活里的碎片。写作是为了把模糊的想法说清楚，也方便未来的自己回看。

## 关于这个博客

- 文章以 Markdown 保存在仓库的 `src/content/posts/`，Git 同时承担版本历史与备份；
- 没有数据库、没有在线后台，构建时读取内容并生成纯静态页面；
- 只收录未标记为草稿的文章，草稿不会出现在列表、RSS 或 sitemap 中。

## 技术栈

| 层次 | 选择 |
| --- | --- |
| 框架 | [Astro](https://astro.build)（静态站点生成） |
| 主题 | [Firefly](https://github.com/CuteLeaf/Firefly)（基于 Fuwari） |
| 样式 | Tailwind CSS v4 + Svelte 交互组件 |
| 内容 | Markdown + Astro Content Collections |
| 搜索 | Pagefind（构建期生成索引） |
| 部署 | Cloudflare Workers（静态资源）+ GitHub Actions |
| 发布 | `/admin/publish`（浏览器直接提交到仓库） |

# 内容规范

文章存放在 `src/content/posts/<slug>.md`，文件名（去掉扩展名）就是 URL 段：`hello-world.md` → `/posts/hello-world/`。

## frontmatter

```yaml
---
title: "你好，世界"
published: 2026-10-23
description: "列表里显示的摘要"
tags: ["博客", "Astro"]
category: "开发记录"
image: "/images/posts/hello-world-cover.png"
draft: false
pinned: false
---
```

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `title` | ✅ | 文章标题 |
| `published` | ✅ | 发布日期 `YYYY-MM-DD`（schema 用 `z.coerce.date()`，加不加引号都行；但建议不加） |
| `description` | | 摘要，列表与 RSS 使用；不填时为空 |
| `tags` | | 字符串数组 |
| `category` | | 单个分类（不是数组） |
| `image` | | 封面图，写 `images/x.png`（相对 `src/content/posts/`，会被优化）；老的 `/images/posts/x.png`（public 目录）也还能用 |
| `draft` | | `true` 表示草稿，不会出现在列表、RSS、sitemap |
| `pinned` | | 置顶 |
| `series` / `seriesOrder` | | 系列文章与排序 |
| `comment` / `password` | | 评论开关、文章密码 |
| `updated` | | 更新日期（Date） |

## 图片

正文图片放在 **`src/content/posts/images/`**（跟着文章进 Git）：

- 正文引用写成相对路径 `![](./images/xxx.png)`，Astro 会转 webp、补宽高、懒加载；
- 封面图在 frontmatter 里写 `image: "images/xxx.png"`（相对 `src/content/posts/`）；
- 文件名建议 `<slug>-<名字>.<ext>`，上传页会自动加前缀；
- 单张上限 8 MB，源图尽量压到 1 MB 以内（图片进 Git，构建时还会再转一次）。

> 老写法 `public/images/posts/` + `/images/posts/xxx.png` 仍能用，但**不经过图片优化**（原图直出、没有 LQIP），新图不要再这么放。

## 发布

三种方式，产物都是同一个目录里的 `.md`，提交后由 CI 构建部署：

1. **浏览器（站内自带）**：`/admin/publish/` → 拖入 Markdown（可同时拖图片）→ 检查元信息 → 提交成 `post/<slug>` 分支 → 打开 PR 链接看 Vercel 预览 → 合并上线；
2. **浏览器（Pages CMS）**：<https://app.pagescms.org> 里选仓库直接编辑，字段由根目录 `.pages.yml` 定义，图片自动进 `src/content/posts/images/`；
3. **本地**：`pnpm new-post <slug>` 或直接写文件，`pnpm dev` 预览，`git push`。

细节见 [`PUBLISH.md`](./PUBLISH.md)。

提交前可以本地 `pnpm build` 验证：frontmatter 不符合 schema 会让构建直接失败（这是有意的，避免坏内容上线）。

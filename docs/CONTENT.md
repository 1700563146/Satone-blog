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
| `published` | ✅ | 发布日期，**必须写成未加引号的 `YYYY-MM-DD`**（schema 要求 Date 类型，加引号会变成字符串并导致构建失败） |
| `description` | | 摘要，列表与 RSS 使用；不填时为空 |
| `tags` | | 字符串数组 |
| `category` | | 单个分类（不是数组） |
| `image` | | 封面图，支持 `/images/posts/x.png`（public 目录）或仓库内相对路径 |
| `draft` | | `true` 表示草稿，不会出现在列表、RSS、sitemap |
| `pinned` | | 置顶 |
| `series` / `seriesOrder` | | 系列文章与排序 |
| `comment` / `password` | | 评论开关、文章密码 |
| `updated` | | 更新日期（Date） |

## 图片

- 放进 `public/images/posts/`，引用写成 `/images/posts/xxx.png`；
- 上传页会自动把文件名改成 `<slug>-<名字>.<ext>`，同名直接覆盖；
- 单张上限 2 MB（图片进 Git，体积要控制）。

## 发布

两种方式都写进同一个目录，提交后由 GitHub Actions 构建部署：

1. **浏览器**：`/admin/publish` → 拖入 Markdown（可同时拖图片）→ 检查元信息 → 提交；
2. **本地**：直接编辑 `src/content/posts/<slug>.md`，`git push`。

提交前可以本地 `pnpm build` 验证：frontmatter 不符合 schema 会让构建直接失败（这是有意的，避免坏内容上线）。

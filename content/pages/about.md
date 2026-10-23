---
title: "关于"
description: "关于 Sato Blog：一个用 Markdown 写作、以 Git 发布的个人博客。"
updatedAt: "2026-10-23"
---

我是 Sato，这个博客的作者。

这里主要记录开发过程中的技术取舍、踩过的坑，以及读书和生活里的碎片。写作是为了把模糊的想法说清楚，也方便未来的自己回看。

## 关于这个博客

- 文章以 Markdown 文件保存在仓库的 `content/posts/` 目录，Git 同时承担版本历史与备份的职责；
- 没有数据库、没有在线后台、没有评论系统，构建时读取内容并生成静态页面；
- 只收录明确标记为已发布的文章，草稿不会出现在任何公开页面、RSS 或 sitemap 中。

## 技术栈

| 层次     | 选择                                |
| -------- | ----------------------------------- |
| 框架     | Next.js App Router + TypeScript     |
| 样式     | Tailwind CSS，设计 Token 集中管理   |
| 内容     | Markdown + Zod 校验的 frontmatter   |
| 渲染     | unified / remark / rehype           |
| 部署     | 计划使用支持 Next.js 的 Node 平台   |

## 订阅与联系

想跟进更新可以通过 [RSS 订阅](/feed.xml)。如果想了解这个站点的实现细节，可以从 [文章列表](/posts) 里的开发记录开始。

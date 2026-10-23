# 内容规范

> 状态：草案（阶段 1）。阶段 2 实现 frontmatter schema 与校验脚本后更新为正式规范。

## 文章位置

- 文章：`content/posts/<slug>.md`
- 独立页面：`content/pages/<name>.md`（如 `about.md`）
- 图片：`public/images/`（本地）或第三方图床/对象存储（P1）

## Frontmatter（草案，依据开发文档 §8.1）

```yaml
---
title: "我的第一篇文章"
slug: "first-post"
description: "文章摘要，用于列表和搜索引擎摘要"
date: "2026-10-23"
updatedAt: "2026-10-23"
published: true
draft: false
categories:
  - "开发记录"
tags:
  - "博客"
  - "Next.js"
cover: "/images/posts/first-post.webp"
featured: false
---
```

| 字段          | 类型        | 规则                                         |
| ------------- | ----------- | -------------------------------------------- |
| `title`       | string      | 必填                                         |
| `slug`        | string      | 必填、唯一、稳定；发布后变更需处理重定向     |
| `description` | string      | 建议必填，用于列表摘要与 SEO                 |
| `date`        | date/string | 必填，ISO 格式，明确时区策略                 |
| `updatedAt`   | date/string | 可选                                         |
| `published`   | boolean     | 是否对外发布                                 |
| `draft`       | boolean     | 草稿标志；与 `published` 的规则在阶段 2 统一 |
| `categories`  | string[]    | 可选                                         |
| `tags`        | string[]    | 可选                                         |
| `cover`       | string      | 可选，本地路径或允许的媒体 URL               |
| `featured`    | boolean     | 可选，是否精选                               |

## 发布规则

- `draft: true` 或 `published: false` 的文章不得出现在列表、搜索、RSS、sitemap 或公开 API。
- `slug` 必须唯一；构建阶段发现重复应直接失败。
- 日期使用 ISO 格式；展示时采用站点配置的时区。
- 正文 Markdown 中的危险 HTML 需安全处理；外链使用安全属性。
- 图片必须有替代文本；代码块保留语言标识。

> 阶段 2 将把以上规则实现为 Zod schema 与内容校验脚本，并以单元测试覆盖。

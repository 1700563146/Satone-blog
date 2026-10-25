---
title: "你好，世界"
published: 2026-10-23
description: "Sato Blog 的第一篇文章：记录这个博客的技术选型、内容组织方式，以及接下来要完成的事情。"
tags: ["博客", "Astro", "Firefly"]
category: "开发记录"
pinned: true
---

这是 Sato Blog 的第一篇文章，也是这个博客从零开始的记录。

## 为什么写博客

写作能逼着人把模糊的想法说清楚。把开发过程中踩过的坑、读过的书和做过的决定记下来，既方便未来的自己回顾，也能让别人少走一点弯路。

## 技术选型

这个博客刻意保持简单：没有数据库、没有后台、没有评论系统。文章以 Markdown 文件的形式保存在仓库里，构建时读取并生成静态页面。

### 内容优先

内容层的设计目标是**让写作只关心内容本身**：

- frontmatter 使用严格的字段校验，拼写错误会直接让构建失败；
- 草稿与未发布文章不会进入列表、分类、标签或任何公开数据；
- 正文中的危险链接会被拦截，外部链接自动添加安全属性。

| 层次     | 技术                        | 职责                       |
| -------- | --------------------------- | -------------------------- |
| 框架     | Astro                       | 路由、渲染与静态输出       |
| 主题     | Firefly（基于 Fuwari）      | 布局、配色与交互组件       |
| 样式     | Tailwind CSS v4             | 设计 Token 与视觉效果      |
| 内容     | Markdown + Content Collections | 写作与 frontmatter 校验 |

一个最小的文章 frontmatter 长这样：

```ts
type Frontmatter = {
  title: string;
  slug: string;
  description: string;
  date: string;
  published: boolean;
  draft: boolean;
};
```

## 接下来要做的事

- [x] 搭建项目骨架与内容引擎
- [ ] 完成文章列表、详情页与分类标签页
- [ ] 加入 SEO、RSS 与站点地图
- [ ] 写更多真实的内容

想了解这个站点，可以从[关于页面](/about/)开始；Astro 的相关用法可以参考[官方文档](https://docs.astro.build/)。

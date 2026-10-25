# 内容规范

> 状态：正式规范（阶段 3）。实现位置：`src/lib/content/schema.ts`（文章）与 `src/lib/content/read-pages.ts`（独立页面）；改动规则时请同步更新本文件与单元测试。

## 文章位置

- 文章：`content/posts/<slug>.md`（只支持顶层 `.md` 文件，不支持子目录）
- 独立页面：`content/pages/<name>.md`（关于页等，规则见下文）
- 图片：`public/images/`（本地）或第三方图床/对象存储（P1）

文件名不影响 URL，URL 由 frontmatter 中的 `slug` 决定。

## 独立页面

固定页面（目前是 `/about`）的正文来自 `content/pages/<name>.md`，页面名与路由的对应关系写在页面组件里（`getPage("about")`）。

```yaml
---
title: "关于"
description: "用于页面摘要与 SEO"
updatedAt: "2026-10-23"
---
```

| 字段          | 类型   | 必填 | 规则                             |
| ------------- | ------ | ---- | -------------------------------- |
| `title`       | string | 否   | 1–120 字符；省略时页面用默认标题 |
| `description` | string | 否   | 1–200 字符                       |
| `updatedAt`   | string | 否   | `YYYY-MM-DD`，必须是真实日期     |

- 整个 frontmatter 可以省略；写了就必须符合上面的字段，**未知字段同样报错**。
- 页面名只能是小写字母、数字与连字符（例如 `about`、`contact-me`），防止路径穿越。
- 文件不存在时页面返回 404，不会渲染空白页；`npm run validate:content` 会把 `content/pages/` 一并检查。
- 正文的 Markdown 规则（GFM、原始 HTML、链接与图片限制）与文章完全一致。

## Frontmatter

文章必须以第一行 `---` 开始，以单独一行 `---` 结束。不支持 `---js`、`---json` 等自定义解析器。

```yaml
---
title: "我的第一篇文章"
slug: "first-post"
description: "文章摘要，用于列表和搜索引擎摘要"
date: "2026-10-23"
updatedAt: "2026-10-24"
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

| 字段          | 类型     | 必填 | 规则                                                  |
| ------------- | -------- | ---- | ----------------------------------------------------- |
| `title`       | string   | 是   | 1–120 字符；自动去除首尾空白；不能包含控制字符        |
| `slug`        | string   | 是   | 1–80 字符；小写字母/数字，单词间用单个 `-`；全站唯一  |
| `description` | string   | 是   | 1–200 字符；用于列表摘要与 SEO                        |
| `date`        | string   | 是   | `YYYY-MM-DD`，必须是真实存在的日期                    |
| `updatedAt`   | string   | 否   | 同 `date`，且不能早于 `date`                          |
| `published`   | boolean  | 是   | 是否对外发布                                          |
| `draft`       | boolean  | 是   | 是否草稿；与 `published` 不能同时为 `true`            |
| `categories`  | string[] | 否   | 最多 5 个；默认空数组                                 |
| `tags`        | string[] | 否   | 最多 20 个；默认空数组                                |
| `cover`       | string   | 否   | 站内绝对路径（`/...`，不能含 `..`）或 `https://` 地址 |
| `featured`    | boolean  | 否   | 是否精选；默认 `false`                                |

**未知字段会被拒绝**：例如把 `published` 写成 `pubished` 会直接导致构建失败，避免拼写错误被静默忽略。

### 日期必须加引号

YAML 会把未加引号的日期解析成 `Date` 对象，而且会把不存在的日期自动进位——例如 `date: 2026-02-30` 会变成 `2026-03-02`，从而掩盖写作错误。因此本项目**只接受加引号的字符串**，未加引号的日期会直接报错：

```yaml
date: "2026-10-23"
```

日期只表示"日历上的哪一天"，展示时不做时区换算，因此构建机所在时区不会影响列表顺序与显示。

### 分类与标签

- 名称会做 Unicode NFC 规范化、去除首尾空白、合并连续空白，并在同一篇文章内去重。
- 名称不能包含 `/ \ ? # %` 或控制字符，不能是 `.` / `..`，最长 40 字符。
- 分类/标签的 URL 使用规范化后的名称本身（中文会进行 URL 编码），例如：
  - 分类「开发记录」→ `/categories/%E5%BC%80%E5%8F%91%E8%AE%B0%E5%BD%95`
  - 标签「Next.js」→ `/tags/Next.js`
- 重命名分类/标签等于改变 URL；如已发布，需要自行处理重定向。

## 发布规则

- 只有 `published: true` 且 `draft: false` 的文章才会进入公开数据。
- 草稿与未发布文章不会出现在列表、分类、标签、RSS、sitemap 或公开 API 中。
- 草稿可以保留在仓库中，但会被公开索引层直接过滤（fail-closed）。
- `slug` 必须全站唯一，重复时构建失败（草稿也参与唯一性检查）。
- 发布后不要随意修改 `slug`；需要修改时同步规划重定向。

## 正文 Markdown

- 支持 GFM：表格、任务列表、删除线、自动链接、脚注。
- **原始 HTML 不会渲染**：会被丢弃，并在校验脚本中产生警告。需要展示标签时请放进代码块。
- 链接与图片地址仅允许 `http` / `https` / `mailto` / `tel`、站内绝对路径与相对路径；`javascript:`、`data:`、`file:`、`//host` 等会被拒绝并导致构建失败。
- 外部链接自动添加 `target="_blank"` 与 `rel="noopener noreferrer"`。
- 图片必须有替代文本（alt），并默认使用 `loading="lazy"`、`decoding="async"`。
- 代码块在**构建期**由 Shiki（主题 `github-dark-default`）着色，产物是纯 HTML + 行内颜色，不会给访客增加 JS。
- 代码块建议标注语言（` ```ts `），未标注时按纯文本输出，不会让构建失败；行内代码不做着色。

## 校验

写作后运行：

```bash
npm run validate:content
```

脚本会检查 frontmatter、重复 slug、Markdown 链接与图片，并汇总所有问题（不会只报第一个）；`content/pages/` 下的独立页面走同一套检查。`npm run build` 会通过 `prebuild` 自动执行同样的检查。

常见错误码：

| 错误码                 | 含义                                       |
| ---------------------- | ------------------------------------------ |
| `INVALID_FRONTMATTER`  | frontmatter 字段缺失、类型或取值不符合规范 |
| `INVALID_YAML`         | frontmatter 不是合法 YAML                  |
| `DUPLICATE_SLUG`       | 多篇文章使用同一 slug                      |
| `UNSUPPORTED_FILE`     | 内容目录中出现不支持的文件/子目录          |
| `UNEXPECTED_FILE`      | 非 `.md` 文件（警告，已忽略）              |
| `READ_ERROR`           | 文件无法读取                               |
| `MARKDOWN_UNSAFE_URL`  | 正文链接或图片地址不安全                   |
| `MARKDOWN_MISSING_ALT` | 图片缺少替代文本                           |
| `MARKDOWN_RAW_HTML`    | 正文包含原始 HTML（警告）                  |
| `NO_PUBLIC_POSTS`      | 没有任何已发布文章（警告）                 |

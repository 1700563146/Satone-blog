# 架构说明

> 状态：阶段 1 基线，依据[开发文档](../开发文档.md) §6、§7。阶段 2 实现内容引擎后补充数据流细节。

## MVP 架构

```text
访客浏览器
    |
    v
Next.js 页面层（src/app，App Router）
    |-- 首页 / 列表 / 详情 / 分类 / 标签 / 关于
    |-- SEO 元数据 / sitemap / RSS（阶段 3）
    |
    v
内容访问层（src/lib/content，阶段 2）
    |-- 读取 Markdown
    |-- 校验 frontmatter
    |-- 解析正文、生成目录与代码高亮
    |
    v
content/posts + content/pages（唯一内容源）
    |
    v
Git 仓库 -> CI 检查与构建 -> 部署平台（阶段 4）
```

## 分层与边界

| 层         | 位置                | 职责                                                  |
| ---------- | ------------------- | ----------------------------------------------------- |
| 路由/页面  | `src/app/`          | 路由与页面组合，不直接散落实现内容读取逻辑            |
| 展示组件   | `src/components/`   | 纯展示与交互；服务端组件优先，交互才用客户端组件      |
| 内容访问层 | `src/lib/content/`  | Markdown 读取、frontmatter 校验、正文渲染（唯一入口） |
| 站点配置   | `src/lib/config.ts` | 站点级配置唯一来源                                    |
| 第三方服务 | `src/lib/`          | 图床、评论、统计等封装在独立模块，便于替换（P1）      |
| 内容       | `content/`          | 只存 Markdown，不放业务代码                           |

## 关键约束

- 页面组件不直接读文件系统；一律通过 `lib/content` 的统一接口。
- 公开构建只收录已发布文章；草稿不得出现在列表、搜索、RSS、sitemap 或公开 API 中。
- 后台写操作（未来）必须在服务端完成鉴权、校验与授权。
- MVP 不引入微服务、消息队列或数据库。

## 技术栈

Next.js 16（App Router、Turbopack、Cache Components）、React 19、TypeScript strict、Tailwind CSS v4、Vitest。详见 [DECISIONS.md](DECISIONS.md)。

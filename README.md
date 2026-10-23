# Sato Blog

个人博客系统。Next.js App Router + TypeScript + Tailwind CSS，文章以 Markdown 保存在仓库中（content/ 是内容的唯一来源）。

## 快速开始

环境要求：Node.js >= 20.9（推荐 24，见 [.nvmrc](.nvmrc)）。

```bash
npm install
npm run dev
```

打开 <http://localhost:3000>。

可选：复制 [.env.example](.env.example) 为 `.env.local`，本地覆盖站点地址。

## 常用命令

| 命令                   | 说明                               |
| ---------------------- | ---------------------------------- |
| `npm run dev`          | 启动开发服务器（Turbopack）        |
| `npm run build`        | 生产构建                           |
| `npm run start`        | 启动生产服务器                     |
| `npm run lint`         | ESLint 检查                        |
| `npm run typecheck`    | 生成路由类型并执行 TypeScript 检查 |
| `npm run test`         | Vitest 单元测试                    |
| `npm run test:watch`   | Vitest 监听模式                    |
| `npm run format`       | Prettier 格式化全部文件            |
| `npm run format:check` | Prettier 格式检查（CI 使用）       |

## 目录结构

```text
├─ content/            # 文章与页面内容（Markdown，唯一内容源）
│  ├─ posts/
│  └─ pages/
├─ docs/               # 架构、开发、内容与部署文档
├─ public/             # 可公开访问的静态资源
│  ├─ images/
│  ├─ fonts/
│  └─ favicon.ico
├─ src/
│  ├─ app/
│  │  ├─ (site)/       # 前台路由组：首页、文章、分类、标签、关于、友链
│  │  ├─ layout.tsx    # 根布局（zh-CN、站点元数据）
│  │  └─ not-found.tsx
│  ├─ components/
│  │  ├─ layout/
│  │  ├─ navigation/
│  │  ├─ post/
│  │  ├─ effects/
│  │  └─ ui/
│  ├─ lib/
│  │  ├─ content/      # 内容读取与解析（阶段 2）
│  │  ├─ seo/
│  │  └─ config.ts     # 站点配置唯一来源
│  ├─ styles/
│  │  └─ globals.css   # Tailwind 入口与设计 Token
│  └─ types/
├─ tests/
│  ├─ unit/
│  └─ e2e/
└─ .github/workflows/ci.yml
```

## 文档

- 总规划：[开发文档.md](开发文档.md)
- 开发指南：[docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)
- 架构说明：[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- 内容规范：[docs/CONTENT_SCHEMA.md](docs/CONTENT_SCHEMA.md)
- 部署指南：[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)
- 产品范围：[docs/PRODUCT_SCOPE.md](docs/PRODUCT_SCOPE.md)
- 技术决策：[docs/DECISIONS.md](docs/DECISIONS.md)

## 开发阶段

- [x] 阶段 1：项目骨架
- [ ] 阶段 2：内容引擎
- [ ] 阶段 3：前台页面
- [ ] 阶段 4：部署与可观测性
- [ ] 阶段 5：写作体验与增强功能

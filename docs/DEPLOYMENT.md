# 部署指南

> 状态：占位（阶段 4 内容）。当前仅有本地开发与 CI 检查，尚未创建部署环境。

## 规划要点（依据开发文档 §14）

- 目标平台：Vercel（或兼容 Next.js 的 Node.js 平台），待确认预算与区域要求。
- 环境区分：`development`（本地）、`preview`（测试部署，不使用生产密钥）、`production`（正式站点）。
- 环境变量：生产环境设置真实 `SITE_URL`；密钥仅存于平台环境变量，不进入仓库与客户端。
- 自动部署：`main` 分支通过 CI 检查后触发生产部署；PR 生成预览部署。
- 回滚：保留部署历史，出现问题时回滚到上一个已知可用版本。
- 备份：Git 远程仓库作为文章版本备份；媒体文件保存清单并确认可导出。

## 发布门槛

与 CI 一致（开发文档 §13.4）：

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
```

`npm run build` 会通过 `prebuild` 自动执行 `validate:content`；内容有 error 时不会产出部署产物。

## 待办（阶段 4）

- [ ] 创建 GitHub 远程仓库并启用 CI
- [ ] 创建 Vercel 项目、绑定仓库与自动部署
- [ ] 配置自定义域名、HTTPS 与 DNS
- [ ] 配置生产环境变量
- [ ] 记录回滚与恢复演练步骤
- [ ] 部署后冒烟测试

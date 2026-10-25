# 部署

站点是纯静态产出（`pnpm build` → `dist/`），主站跑在 **Cloudflare Workers 静态资源**，Vercel 作为备份（整站 `noindex`）。

## 产物

```
dist/
  index.html
  posts/<slug>/index.html     # trailingSlash: "always"，所以都有尾斜杠
  archive/  categories/  tags/  about/
  rss.xml  rss/  atom.xml  atom/
  sitemap-index.xml
  admin/publish/index.html    # 上传发布工具
  _astro/                     # 带 hash 的静态资源
  pagefind/                   # 搜索索引
```

## Cloudflare Workers（主站）

`wrangler.jsonc`：

```jsonc
{
	"name": "satone-blog",
	"compatibility_date": "2026-10-19",
	"assets": {
		"directory": "./dist",
		"html_handling": "auto-trailing-slash",
		"not_found_handling": "404-page"
	}
}
```

`html_handling: "auto-trailing-slash"` 让 `/posts/hello-world` 自动跳到 `/posts/hello-world/` 并命中 `index.html`；`not_found_handling` 用导出的 404 页面。

## GitHub Actions（推送即部署）

`.github/workflows/ci.yml`：

1. `checks`：`pnpm install --frozen-lockfile` → `pnpm check` → `pnpm type-check` → `pnpm build` → 校验 `dist/` 关键文件存在
2. `deploy-cf`（可选，靠 `vars.SITE_URL` 开关）：再跑一次 build，然后 `npx wrangler deploy`

需要的仓库配置（Settings → Secrets and variables → Actions）：

| 名称 | 类型 | 值 |
| --- | --- | --- |
| `CLOUDFLARE_API_TOKEN` | Secret | Workers Scripts: Edit + Account Settings: Read |
| `CLOUDFLARE_ACCOUNT_ID` | Secret | Cloudflare 账户 ID |
| `SITE_URL` | Variable | `https://blog.satone.cc.cd`（同时是部署 job 的开关） |

`deploy-cf` 带一个部署后冒烟：`/`、`/archive/`、`/about/`、`/admin/publish/`、`/rss.xml`、`/sitemap-index.xml`、`/robots.txt` 期望 200；403/429（Cloudflare Bot Fight Mode 拦截数据中心 IP）只记 warning，5xx 与连接失败才算失败。

## 域名

- 主域名 `blog.satone.cc.cd`：Cloudflare → Workers → `satone-blog` → Settings → Domains & Routes → Custom Domain。
- canonical / sitemap / RSS 都来自 `src/config/siteConfig.ts` 的 `site_url`，**改域名时同步改这里**。

## Vercel（备份）

`vercel.json` 指定 `pnpm build` + `dist`，并对所有路径加 `X-Robots-Tag: noindex, nofollow`，避免与主站重复收录。

## 本地验证

```bash
pnpm build
pnpm preview
```

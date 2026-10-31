# 发文章

站点是 git-based 的：文章就是 `src/content/posts/<slug>.md`，提交进仓库后由 CI 构建 + Vercel 部署。
所以"发布文章"= "往仓库写一个 md 文件以及它的图片"，下面三条路都指向同一个目录。

| 方式 | 需要什么 | 适合 |
| --- | --- | --- |
| **站内 `/admin/publish/`** | 一个 GitHub Token（只存本次会话） | 不想装环境、想在任意电脑上发 |
| **Pages CMS** | 一次性给仓库装 GitHub App | 手机上写、想要正经编辑器与媒体库 |
| **本地** | 本机有仓库 + pnpm | 长文、要反复预览、要压图 |

---

## 一、站内 `/admin/publish/`

地址：`/admin/publish/`（页面在 `src/pages/admin/publish.astro`，用的是站点自己的布局，
所以导航栏、明暗主题、字体、卡片样式都是站内的那一套）

三种进法，哪个顺手用哪个：

1. **右下角「写文章」按钮** —— 默认就在（不想让它出现可以在发布页顶部关掉，选择记在 localStorage）；
2. **快捷键 `Ctrl`/`⌘ + Shift + P`** —— 任何页面直接跳转，不用先开入口；
3. 直接敲地址 `/admin/publish/`。

### 1. 准备 token（一次）

1. GitHub → Settings → Developer settings → **Fine-grained tokens** → Generate new token；
2. Repository access 只选 `Satone-blog`；
3. Permissions → Repository permissions → **Contents: Read and write**（就这一个够了，开分支也在这个权限里）；
4. 复制 `github_pat_…`，粘进页面的 token 框 → 保存。

token 默认只写进 **sessionStorage**（关掉标签页就失效）。勾上"记住 token"才会进 localStorage，
共享电脑上别勾。

### 2. 写文章

1. 拖入 `.md` 文件（或直接在正文框里写）；页面会解析 frontmatter，缺的字段自动补；
2. 检查第 3 节：标题、slug、日期、摘要、分类、标签、封面、系列、密码、置顶、评论；
3. 正文在第 4 节。图片拖进下面的框 → 自动上传到 `src/content/posts/images/<slug>-xxx.png`，
   正文里插入的写法是 `![alt](./images/xxx.png)`；点"设为封面"会写进 frontmatter 的 `image`；
4. 第 5 节是预检（字数、标题数、图片数、代码块是否闭合、链接是否安全），第 6 节提交。

### 3. 提交 → 预览 → 合并

默认勾选"提交到新分支 `post/<slug>`"：

- 提交后页面会给一个 **compare 链接**，点开就是 GitHub 的"创建 PR"页面；
- 开了 PR，Vercel 会自动为这个分支出 **Preview 部署**，地址类似 `satone-blog-git-post-xxx.vercel.app`；
- 在预览里确认排版没问题 → 合并 PR → main 重新构建 → 线上更新。

同一篇反复改会复用同一个分支（分支已存在时直接追加提交），所以 PR 一直是最新的。

不想走分支时取消勾选即可直接提交到 `main`（约 5~7 分钟上线），此时若有同名文件会让你确认覆盖。

> 为什么默认走分支：直提 main 一旦 frontmatter 写错，线上构建会失败（站点不会坏，只是不更新），
> 而且没有"先看一眼"的机会。分支 + 预览把这一步补上了。

### 4. 图片规则

- 落盘位置 `src/content/posts/images/`，文件名自动加 `<slug>-` 前缀；
- 支持 png / jpg / jpeg / webp / gif / avif / svg，**单张 ≤ 8 MB**；
- 正文引用写 `./images/xxx.png`，Astro 构建时会转 webp、补宽高、懒加载；
- 封面图写 `images/xxx.png`（相对 `src/content/posts/`，不带 `./` 也行）。

> 老的 `public/images/posts/` 写法还能用，但**不走图片优化**（原图直出、无 LQIP），新图别这么放。

---

## 二、Pages CMS

[Pages CMS](https://app.pagescms.org) 是托管式的 git CMS：不需要自建服务，凭证由 GitHub App 签发（没有 PAT）。

### 接入（一次）

1. 打开 <https://app.pagescms.org> → GitHub 登录；
2. 给 `1700563146/Satone-blog` 安装它的 GitHub App（只授权这一个仓库）；
3. 选仓库，它会读根目录的 `.pages.yml`，于是出现两个集合：**文章**、**动态**。

### 用

- 新建文章：按标题生成文件名，**创建那一刻可以改成你想要的 slug**（文件名就是 URL 段）；
- 字段与 `src/content.config.ts` 的 schema 一一对应（日期、摘要、标签、分类、封面、草稿、置顶、系列、密码、评论）；
- 正文是富文本（Markdown + 预览），插图会存到 `src/content/posts/images/`，写进正文的是 `./images/...`；
- 保存即提交到这个仓库（commit 模板见 `.pages.yml` 的 `settings.commit`）。

### 改字段时注意

`.pages.yml` 和 `src/content.config.ts` 必须同时改：加字段两边都要加，否则构建会因为 schema 不认而失败（或字段被静默丢弃）。

---

## 三、本地

```bash
pnpm new-post my-slug     # 生成 src/content/posts/my-slug.md
pnpm dev                  # localhost:4321 实时预览
pnpm build                # 提交前跑一次，frontmatter 不合 schema 会直接失败
```

图片直接放进 `src/content/posts/images/`，正文写 `./images/xxx.png`。

提交前钩子会自动扫一遍敏感文件（`.env`、私钥、token 之类），被拦下时按提示把它们移出暂存区；
规则与绕过方式见 `docs/SECRETS.md`。只想手动查一次：`pnpm check:secrets`。

> 顺手一提：别用 `git add -A` / `git add .` 一把梭 —— 只 add 文章和它的图片。

---

## 常见问题

| 现象 | 原因 / 处理 |
| --- | --- |
| 构建报 `published: Expected date` | 日期被引号包住了，写成 `published: 2026-10-23`（不带引号） |
| 文章没出现在列表 | `draft: true`，或日期是未来的（列表按 published 排序） |
| slug 报错 | 只允许小写字母、数字、连字符；中文标题会自动转成拼音之外的占位，需要手改 |
| 图片 404 | 路径写错：正文用 `./images/x.png`，封面用 `images/x.png`；`public/` 那种写法才是 `/images/...` |
| 提交报 404 / 401 | token 过期或权限不足（需要 Contents: RW），或仓库名写错 |
| 分支提交后 Vercel 没出预览 | PR 没开：点页面给的 compare 链接手动创建 PR |

## 安全说明

- 站内上传页不做服务端校验：**它只是一个用你的 token 直连 GitHub API 的静态页面**。谁能拿到 token，谁就能往仓库写东西 —— 所以 token 别存太久、别勾"记住"、用完可以 `清除`。
- `/admin/publish/` 不可被搜索引擎收录：页面自带 `<meta name="robots" content="noindex, nofollow">`，`robots.txt` 里有 `Disallow: /admin/`，`vercel.json` 对 `/admin/(.*)` 也额外加了 `X-Robots-Tag`。三层都是"不被收录"，不是"不被访问"——任何人打开这个地址都能看到页面，但没有 token 什么也做不了。

# 部署到阿里云服务器（推送即更新）

站点是纯静态产物（`pnpm build` → `dist/`），所以「服务器跟着更新」本质就是：
**有变化时重新构建，把新的 `dist/` 换上去**。文章、图片、照片墙、音乐都在 git 里
（`src/content/posts/`、`public/wall/`、`public/music/`），所以 **push 一次 = 全站更新**。

## 先选方案

| | 方案 A：GitHub Actions 构建 + rsync | 方案 B：服务器自己拉取构建 | 方案 C：构建镜像推到 ACR |
|---|---|---|---|
| 服务器要装 Node/pnpm | ❌ 不用 | ✅ 要（Node 22 + pnpm） | ❌ 不用（要装 Docker） |
| 推送后多久生效 | 约 2–4 分钟 | 取决于定时器间隔（默认 5 分钟） | 约 3–5 分钟 |
| 需要 GitHub 连进服务器 | ✅ 需要（22 端口） | ❌ 不需要 | ❌ 不需要 |
| 服务器负载 | 只在 rsync 时 | 每次构建都吃 CPU/内存 | 只拉镜像 |
| 回滚 | 切软链接 | 切软链接 | 换镜像 tag |
| 适合 | **推荐**，2C2G 小机器也能扛 | 想完全自控 / 不想开 SSH | 多机部署 |

下面 A、B 都给完整步骤，A 是推荐路线。

两种方案都用「**releases + current 软链接**」的模式：

```
/var/www/sato-blog/
├── releases/
│   ├── 20261029-120000/       # 每次发布的完整 dist/
│   └── 20261029-133000/
└── current -> releases/20261029-133000
```

nginx 的 `root` 指向 `current`。发版只是 `ln -sfn` 换链接（几毫秒、原子操作），
正在被访问的旧文件不会被写坏；回滚就是把链接指回上一个目录。

---

## 方案 A：GitHub Actions 构建 + rsync（推荐）

已经写好：[`.github/workflows/deploy-aliyun.yml`](../.github/workflows/deploy-aliyun.yml)。
它会：装依赖 → `pnpm build` → 校验产物 → rsync 到 `releases/<时间戳>` → 切 `current` → 健康检查 → 只保留最近 5 个版本。

### 1. 服务器准备（一次性）

```bash
# nginx
sudo apt update && sudo apt install -y nginx rsync
sudo mkdir -p /var/www/sato-blog/releases
sudo chown -R www-data:www-data /var/www/sato-blog

# 专用部署用户（不要用 root 让 CI 登录）
sudo useradd -m -s /bin/bash deploy
sudo mkdir -p /home/deploy/.ssh && sudo chmod 700 /home/deploy/.ssh

# 目录权限：deploy 要能写 releases，nginx 要能读
sudo setfacl -R -m u:deploy:rwx /var/www/sato-blog || sudo chown -R deploy:www-data /var/www/sato-blog
sudo chmod -R g+rX /var/www/sato-blog
```

nginx 配置直接用仓库里的模板（把域名改掉）：

```bash
sudo cp scripts/deploy/nginx-sato-blog.conf /etc/nginx/conf.d/sato-blog.conf
sudo sed -i 's/blog.example.com/你的域名/g' /etc/nginx/conf.d/sato-blog.conf
sudo nginx -t && sudo systemctl reload nginx
```

> 阿里云安全组记得放行 **80/443**；**22 端口**要么对 `0.0.0.0/0` 放行，
> 要么把 GitHub Actions 的出口 IP 段加进去（`https://api.github.com/meta` 的 `actions` 字段）。

### 2. 生成部署密钥

在**本地**跑（不要给私钥设密码，Actions 里不方便交互）：

```bash
ssh-keygen -t ed25519 -C "github-actions@sato-blog" -f ./aliyun_deploy -N ""
# 公钥装到服务器
ssh-copy-id -i ./aliyun_deploy.pub deploy@你的服务器IP
# 或者手动：
#   cat aliyun_deploy.pub >> /home/deploy/.ssh/authorized_keys   （在服务器上，注意权限 600）
```

### 3. 配置 GitHub 仓库

Settings → Secrets and variables → Actions：

| 名称 | 类型 | 值 |
|---|---|---|
| `ALIYUN_HOST` | Secret | 服务器 IP 或域名 |
| `ALIYUN_USER` | Secret | `deploy` |
| `ALIYUN_SSH_KEY` | Secret | `aliyun_deploy` **私钥全文**（含 `-----BEGIN…` 和结尾换行） |
| `ALIYUN_PORT` | Secret（可选） | 非 22 端口时才填 |
| `ALIYUN_PATH` | Secret（可选） | 默认 `/var/www/sato-blog` |
| `ALIYUN_DEPLOY` | **Variable** | `true`（开关：不配就整个 workflow 跳过） |
| `SITE_URL` | Variable（可选） | 正式地址，用于部署摘要里的链接 |

配好后：`git push` → Actions 自动跑 → 网站更新。

想先演练一次：Actions → **Deploy (Aliyun ECS)** → Run workflow → 勾上 `dry_run`
（只做 `rsync --dry-run`，不切版本）。

### 4. 回滚

```bash
cd /var/www/sato-blog/releases && ls -1dt */
sudo ln -sfn /var/www/sato-blog/releases/<上一个时间戳> /var/www/sato-blog/current.new
sudo mv -Tf /var/www/sato-blog/current.new /var/www/sato-blog/current
```

---

## 方案 B：服务器自己拉取 + 构建

适合不想让 GitHub 连进服务器、或者服务器本来就在跑别的东西的场景。

### 1. 装环境

```bash
# Node 22（NodeSource）
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs rsync
sudo corepack enable && corepack prepare pnpm@latest --activate

# 源码目录（用 deploy 用户持有，构建也用它跑）
sudo mkdir -p /srv/sato-blog-src && sudo chown deploy:deploy /srv/sato-blog-src
sudo -u deploy git clone --depth 1 ssh://git@ssh.github.com:443/1700563146/Satone-blog.git /srv/sato-blog-src
# 如果服务器上没有 SSH key，可以临时用 https + PAT：
#   git clone --depth 1 https://<token>@github.com/1700563146/Satone-blog.git /srv/sato-blog-src

sudo mkdir -p /var/www/sato-blog/releases && sudo chown -R deploy:deploy /var/www/sato-blog
```

> 仓库里有约 44MB 音乐 + 照片墙图片，`git clone` 会慢一点，之后都是增量。

### 2. 装定时任务

```bash
sudo cp /srv/sato-blog-src/scripts/deploy/sato-blog-build.service \
        /srv/sato-blog-src/scripts/deploy/sato-blog-build.timer \
        /etc/systemd/system/
sudo chmod +x /srv/sato-blog-src/scripts/deploy/pull-build.sh
sudo systemctl daemon-reload
sudo systemctl enable --now sato-blog-build.timer

# 手动跑一次看看
sudo systemctl start sato-blog-build.service
journalctl -u sato-blog-build.service -f
```

脚本（`scripts/deploy/pull-build.sh`）逻辑：
`git fetch` → 比对远端 commit，**没变化直接退出**（不浪费 CPU）→ `pnpm install` → `pnpm build`
→ rsync 到新 release → 切 `current` → 只保留最近 5 个版本。带 `flock` 防并发。

### 3. 注意

- 2C2G 的机器构建时可能吃满内存，建议先加 2G swap：
  `sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile`
- `git` 报 `dubious ownership` 时：`sudo -u deploy git config --global --add safe.directory /srv/sato-blog-src`
- 想改频率：编辑 `/etc/systemd/system/sato-blog-build.timer` 里的 `OnUnitActiveSec`，再 `daemon-reload`。

---

## 内容更新怎么走

| 我在做什么 | 服务器会怎么变 |
|---|---|
| 写新文章（`src/content/posts/*.md`） | push 后自动重新构建，文章页、首页列表、RSS、sitemap、Pagefind 搜索索引一起更新 |
| 往文章里加图片（`src/content/posts/images/`） | 同上，图片随构建一起进 `dist/` |
| 换照片墙（`wall-src/` → `pnpm wall:opt` → `public/wall/`） | 新图覆盖进 `public/wall/`，push 即生效 |
| 换歌单（`pnpm music:offline` 或 `music:sync`） | `public/music/library.json` + `audio/` + `cover/` 一起进 git，push 即生效 |
| 改主题配置（`src/config/*.ts`） | 正常构建流程，push 即生效 |
| 只改本地配置、不想发布 | 别提交（`docs/CUSTOMIZE.md` 这类改动不要 commit） |

⚠️ **音乐/照片是二进制**：如果只是替换同名文件，Git 会存整份新副本，仓库会持续变大。
建议换图时**顺手换文件名**，并在 `pnpm build` 后确认 `dist` 体积没有异常增长。

## 验收 & 排查

```bash
# 服务器上
curl -sI http://127.0.0.1/ | head -n1          # 200
readlink -f /var/www/sato-blog/current          # 指向最新 release
ls -1dt /var/www/sato-blog/releases/*/ | head   # 最近几个版本
sudo tail -f /var/log/nginx/error.log
```

| 现象 | 多半是 |
|---|---|
| Actions 卡在 `Prepare SSH` | 安全组没放行 22，或 `ALIYUN_SSH_KEY` 粘贴时丢了首尾行 |
| `Permission denied (publickey)` | 公钥没进 `authorized_keys`，或权限不是 `600`/目录 `700` |
| `rsync: mkdir failed` / `Permission denied` on server | `deploy` 用户对 `ALIYUN_PATH` 没有写权限 |
| 页面 404 | nginx `root` 没指向 `.../current`，或 `try_files` 少了 `$uri/index.html` |
| 发了新文章但页面没变 | 浏览器/CDN 缓存了 HTML —— 本仓库的 nginx 模板已对 HTML 设 `no-cache`；若前面还有 Cloudflare，记得 purge |
| 音乐/图片 404 | 确认 `public/music/`、`public/wall/` 已提交（`git status` 里是 `??` 就是没提交） |
| 部署后字体/样式错乱 | 只同步了一半就切了 `current` —— 用 `--link-dest` 的 rsync 是全量镜像，一般不会出现；检查磁盘是否满 |

## HTTPS

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d 你的域名
```

certbot 会自动改 nginx 配置并加续期定时器。之后把 `SITE_URL` 改成 `https://…`，
并同步改 `src/config/siteConfig.ts` 的 `site_url`（canonical / sitemap / RSS 都读它）。

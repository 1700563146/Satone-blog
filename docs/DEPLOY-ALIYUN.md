# 部署到阿里云服务器（推送即更新）

站点是纯静态产物（`pnpm build` → `dist/`），所以「服务器跟着更新」本质就是：
**有变化时重新构建，把新的 `dist/` 换上去**。文章、图片、照片墙、音乐都在 git 里
（`src/content/posts/`、`public/wall/`、`public/music/`），所以 **push 一次 = 全站更新**。

## 结论：维持 nginx，构建放 GitHub Actions

| 决策 | 为什么 |
|---|---|
| **继续用 nginx 托管静态文件** | 纯静态站 nginx 就是最快的（几乎零开销，直接 `sendfile`），换 Node/Go/Docker 只会更慢更复杂 |
| **不在服务器上构建** | Astro 构建 + 字体子集化 + Pagefind 很吃 CPU/内存；2C 小机器要跑几分钟，还会和线上争资源 |
| **在 GitHub Actions 构建 + rsync 推过去** | Runner 是 4C16G、每次干净环境，2 分钟出结果；服务器只负责收文件，零运行时依赖 |
| **releases + `current` 软链接发布** | 切换是原子的，回滚一条命令；`--link-dest` 让没变的音乐/照片不重传 |
| **构建时预压缩 `.br` / `.gz`** | nginx `gzip_static`/`brotli_static` 直出，省掉每请求压缩的 CPU，文本再小 15%~20% |
| **HTTPS + HTTP/2** | 一次 certbot，之后自动续期；HTTP/2 多路复用对小文件多的站点提升明显 |
| 可选：前面挂 Cloudflare | 想让外地/海外用户更快就开（DNS 橙云），源站仍是这台 nginx |

所以你要做的只有：**服务器一次性配置 + GitHub 配 4 个值**，之后永远只 `git push`。

---

## 按这个顺序做（一次性，约 15 分钟）

### 第 1 步：服务器放行端口

阿里云控制台 → 安全组 → 入方向放行 **80**、**443**；**22** 放行给 GitHub 出口 IP
（`curl -s https://api.github.com/meta | jq -r '.actions[]'` 里的网段），或图省事先对 `0.0.0.0/0` 放行。

### 第 2 步：建目录与用户

```bash
sudo apt update && sudo apt install -y nginx rsync
sudo mkdir -p /var/www/sato-blog/releases
sudo useradd -m -s /bin/bash deploy
sudo chown -R deploy:www-data /var/www/sato-blog
sudo chmod -R 755 /var/www/sato-blog
```

### 第 3 步：启用仓库里的 nginx 配置

```bash
# 在服务器上的仓库副本里，或直接把文件 scp 上去
sudo cp scripts/deploy/nginx-sato-blog.conf /etc/nginx/conf.d/sato-blog.conf
sudo sed -i 's/blog.example.com/你的域名/g' /etc/nginx/conf.d/sato-blog.conf
sudo nginx -t && sudo systemctl reload nginx
```

> `nginx -t` 若报 `unknown directive "gzip_static"`：把该行删掉即可（其它加速项照旧生效）。

### 第 4 步：配部署密钥

本地：

```bash
ssh-keygen -t ed25519 -C "github-actions@sato-blog" -f ./aliyun_deploy -N ""
ssh-copy-id -i ./aliyun_deploy.pub deploy@你的服务器IP
```

### 第 5 步：配 GitHub

Settings → Secrets and variables → Actions：

| 名称 | 类型 | 值 |
|---|---|---|
| `ALIYUN_HOST` | Secret | 服务器 IP |
| `ALIYUN_USER` | Secret | `deploy` |
| `ALIYUN_SSH_KEY` | Secret | `aliyun_deploy` 私钥全文 |
| `ALIYUN_PORT` | Secret（可选） | 非 22 端口 |
| `ALIYUN_PATH` | Secret（可选） | 默认 `/var/www/sato-blog` |
| `ALIYUN_DEPLOY` | **Variable** | `true` |
| `SITE_URL` | Variable（可选） | `https://你的域名` |

### 第 6 步：发一次版验证

本地随便改点东西 push，或 Actions → **Deploy (Aliyun ECS)** → Run workflow。
跑完后在服务器上：

```bash
readlink -f /var/www/sato-blog/current     # 应指向最新 release
curl -sI http://127.0.0.1/ | head -n1      # 200
ls /var/www/sato-blog/current/*.br | head  # 预压缩文件已就位
```

### 第 7 步（建议）：HTTPS

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d 你的域名
```

证书自动续期；之后把 `SITE_URL` 与 `src/config/siteConfig.ts` 的 `site_url` 改成 `https://…`。

---

## 其它方案（了解即可，不推荐）

| | 方案 B：服务器自己拉取构建 | 方案 C：构建镜像推到 ACR |
|---|---|---|
| 服务器要装 Node/pnpm | ✅ 要 | ❌ 不用（要装 Docker） |
| 推送后多久生效 | 取决于定时器（默认 5 分钟） | 约 3–5 分钟 |
| 需要 GitHub 连进服务器 | ❌ 不需要 | ❌ 不需要 |
| 服务器负载 | 每次构建都吃 CPU/内存 | 只拉镜像 |
| 适合 | 不能开 SSH 时 | 多机部署 |

方案 B 的脚本也一起提供了，见文末「方案 B」。

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

## 回滚

```bash
cd /var/www/sato-blog/releases && ls -1dt */          # 看有哪些版本
sudo ln -sfn /var/www/sato-blog/releases/<目标时间戳> /var/www/sato-blog/current.new
sudo mv -Tf /var/www/sato-blog/current.new /var/www/sato-blog/current
```

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

## 端口：现在用 8081，备案后再换 80

中国大陆的 ECS 上，**80 端口用域名访问需要备案**，用 IP 访问一般能用；但为了避免各种拦截，
当前直接让站点跑在 **8081**：

```nginx
listen 8081 default_server;
listen [::]:8081 default_server;
server_name _;
```

对应要改的地方只有三处（都已在仓库里配好）：

| 位置 | 值 |
|---|---|
| `scripts/deploy/nginx-sato-blog.conf` | `listen 8081` |
| `src/config/siteConfig.ts` `site_url` | `http://8.148.77.40:8081` |
| GitHub `ALIYUN_HTTP_PORT`（可选 secret） | 不填默认 `8081`，用于部署后的健康检查 |

**安全组记得放行 8081**（入方向 TCP 8081，源 `0.0.0.0/0`）。

备案通过后切 80：

```bash
sudo sed -i 's/listen 8081/listen 80/; s/\[::\]:8081/[::]:80/' /etc/nginx/conf.d/sato-blog.conf
sudo nginx -t && sudo systemctl reload nginx
```

再把 `site_url` 与 GitHub 的 `ALIYUN_HTTP_PORT` 一起改成 80 / https。

## 还没有备案，先用 IP 访问

完全可行：**ICP 备案只约束「域名」，不约束 IP**。所以域名没下来之前直接
`http://8.148.77.40:8081/` 就能访问，不用等备案。

要做三处配合：

**1. nginx 用默认站点兜住所有 Host**（仓库里的模板已经是这样）

```nginx
listen 80 default_server;
listen [::]:80 default_server;
server_name _;
```

并删掉发行版自带的默认站点，否则它会抢走 80 端口、显示 "Welcome to nginx"：

```bash
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

**2. 把站点地址改成 IP**（canonical / sitemap / RSS / OG 都读它）

```ts
// src/config/siteConfig.ts
site_url: "http://8.148.77.40:8081",
```

```bash
pnpm build && git push     # 或者等 Actions 自动构建
```

**3. GitHub 的 `SITE_URL` variable 也写成 `http://8.148.77.40:8081`**（只是部署摘要里显示用）

> 注意：IP 访问时**不能上 HTTPS** —— Let's Encrypt 不给裸 IP 签证书。
> 所以这段时间是纯 HTTP：别在站内放登录/支付类敏感内容（本站是纯静态博客，问题不大）。
> 等备案通过后按下面「套域名」做一遍即可。

### 备案通过 / 域名可用之后

```bash
# 1) nginx 换成域名（去掉 default_server 也行，保留更稳）
sudo sed -i 's/server_name _;/server_name 你的域名;/' /etc/nginx/conf.d/sato-blog.conf
sudo nginx -t && sudo systemctl reload nginx

# 2) 证书（certbot 会自动补 443 与续期）
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d 你的域名
```

```bash
# 3) 站点地址改回 https 域名，重新构建
sed -i 's|site_url: "http://8.148.77.40:8081"|site_url: "https://你的域名"|' src/config/siteConfig.ts
git add src/config/siteConfig.ts && git commit -m "chore: 站点地址换成正式域名" && git push
```

DNS 那边（阿里云云解析）加一条 A 记录指向 `8.148.77.40` 即可；
国内服务器记得先在阿里云备案系统把域名备好，否则 80/443 上的域名访问会被拦截。

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

## 性能清单（都已在仓库配置里）

| 项 | 位置 | 效果 |
|---|---|---|
| 预压缩 `.br` / `.gz` | 工作流 `Precompress` 步骤 | 文本再小 15%~20%，且省掉每请求压缩的 CPU |
| `gzip_static` / `brotli_static` | nginx 配置 | 直接吐压缩文件；没装 brotli 模块就注释掉那行 |
| `sendfile` + `tcp_nopush` + `open_file_cache` | nginx 配置 | 小文件多时（文章分页、pagefind 索引）明显更快 |
| `_astro/` 一年 immutable 缓存 | nginx 配置 | 二次访问几乎零请求 |
| HTML `no-cache` | nginx 配置 | 发新文章刷新即见，不会看到旧页面 |
| `--link-dest` 增量 rsync | 工作流 | 音乐/照片不重复传输、不重复占盘 |
| HTTP/2 | certbot 或手动 | 多路复用，首屏并发请求更快 |

可选再加一层：DNS 挂 Cloudflare（橙云）做 CDN，源站仍是这台 nginx；
此时记得在 CF 里 purge 缓存，否则新文章要等缓存过期。

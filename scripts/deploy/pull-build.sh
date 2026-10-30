#!/usr/bin/env bash
# 方案 B：服务器自己拉代码 → 构建 → 切换版本（不需要 GitHub Actions 连进来）
#
# 用法（root 或 deploy 用户）：
#   REPO_DIR=/srv/sato-blog-src PUBLISH_DIR=/var/www/sato-blog ./pull-build.sh
#
# 通常由 systemd timer 定时触发，见 sato-blog-build.timer / docs/DEPLOY-ALIYUN.md。

set -euo pipefail

REPO_DIR="${REPO_DIR:-/srv/sato-blog-src}"
PUBLISH_DIR="${PUBLISH_DIR:-/var/www/sato-blog}"
BRANCH="${BRANCH:-main}"
KEEP_RELEASES="${KEEP_RELEASES:-5}"
NODE_BIN_DIR="${NODE_BIN_DIR:-/usr/local/bin}"

log() { printf '[%s] %s\n' "$(date -u +%FT%TZ)" "$*"; }

export PATH="$NODE_BIN_DIR:$PATH"

mkdir -p "$PUBLISH_DIR/releases"

# 并发保护：上一次还没跑完就跳过
exec 9>"$PUBLISH_DIR/.deploy.lock"
if ! flock -n 9; then
	log "已有部署在进行，跳过本次"
	exit 0
fi

cd "$REPO_DIR"

log "拉取 origin/$BRANCH"
git fetch --depth 1 origin "$BRANCH"
REMOTE_REV="$(git rev-parse "origin/$BRANCH")"
LOCAL_REV="$(git rev-parse HEAD 2>/dev/null || echo none)"

if [ "$LOCAL_REV" = "$REMOTE_REV" ] && [ -L "$PUBLISH_DIR/current" ]; then
	log "已是最新（${REMOTE_REV:0:8}），跳过"
	exit 0
fi

git reset --hard "$REMOTE_REV"

log "安装依赖"
pnpm install --frozen-lockfile

log "构建"
pnpm build

TS="$(date -u +%Y%m%d-%H%M%S)"
REL="$PUBLISH_DIR/releases/$TS"
log "发布到 $REL"
mkdir -p "$REL"
# --link-dest：没变的文件（音乐、照片）直接硬链接，不重复占磁盘
rsync -a --delete --link-dest="$PUBLISH_DIR/current" "$REPO_DIR/dist/" "$REL/"

ln -sfn "$REL" "$PUBLISH_DIR/current.new"
mv -Tf "$PUBLISH_DIR/current.new" "$PUBLISH_DIR/current"

cd "$PUBLISH_DIR/releases"
ls -1dt */ | tail -n +$((KEEP_RELEASES + 1)) | xargs -r rm -rf
log "完成，保留最近 $KEEP_RELEASES 个版本："
ls -1dt */ | head -n "$KEEP_RELEASES"

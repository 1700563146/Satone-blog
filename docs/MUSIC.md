# 音乐页：接口选型与曲库同步

## 结论先说

| 方案 | 优点 | 缺点 | 本项目 |
|---|---|---|---|
| **Meting API**（公开实例，本项目选 `api.injahow.cn`） | 免后端、免 key；一次请求拿到「曲名/歌手/封面/音频直链/歌词」；支持网易云/QQ/酷狗/虾米 | 公共实例会限流、偶尔挂；直链带签名会过期；字段风格有两种（`title/author` 与 `name/artist`） | ✅ 用来**构建期**同步 |
| NeteaseCloudMusicApi（自建） | 功能最全、稳定可控 | 要长期跑一个 Node 服务，静态站（Vercel / CF Pages）扛不住 | ❌ |
| Spotify / Apple Music API | 曲库正版、元数据规范 | 需要 OAuth + client secret，且**没有**可直接播放的直链 | ❌ |
| 自己托管音频（本地 mp3） | 完全可控、无外部依赖、可离线 | 需要自己拥有音频文件 | ✅ 作为兜底 / 长期方案 |

**本项目采用：构建期同步 + 提交静态 JSON。**
页面运行时**不请求任何第三方接口** —— 没有 CORS、没有限流、接口挂了页面也照常显示。
需要更新歌单时手动跑一次 `pnpm music:sync`，把生成的 JSON 一起提交。

## 工作流

```bash
# 默认按 src/config/musicConfig.ts 的 mode 走（local → 用本地 playlist）
pnpm music:sync

# 强制拉 Meting 歌单（不管 mode 是什么）
MUSIC_SOURCE=meting pnpm music:sync
# 或
pnpm music:sync --meting
```

脚本（`scripts/sync-music-library.ts`）会：

1. 依次尝试 `meting.api` 与 `meting.fallbackApis`（把 `:server/:type/:id` 替换成配置值）；
2. 兼容两种字段风格（`title/author` / `name/artist`），没名字或没直链的条目丢弃；
3. 写入 `src/constants/music-library.json`：`{ generatedAt, source, tracks[] }`；
4. 全部接口都失败时，退回 `local.playlist`（本地曲目），保证页面不空。

## 界面

`/music/` 读取这份 JSON 渲染：

- **黑胶牌面**：当前曲目的封面做中心标签，播放时纹路旋转；悬停微微抬起；
- **盘廊**：所有曲目缩成小黑胶，点选 / 滚轮 / ← → 切换；
- **曲目列表**：序号 + 封面 + 曲名/歌手，当前曲高亮；
- **播放器**：页面自带 `<audio>`，上一首 / 播放暂停 / 下一首 / 进度条（可点击跳转）+ 时间。

导航栏面板和侧栏那个 `MusicPlayer` 仍按 `musicConfig` 的本地/在线模式工作，互不影响。

## 音频直链实例要挑

同一个 Meting 接口，**列表**和**音频直链**的可用性不一样，实测（NetEase 歌单）：

| 实例 | 列表 | `type=url` 音频在 `<audio>` 里 |
|---|---|---|
| `api.i-meto.com` | ✅ `title/author` | ❌ 报 `MEDIA_ERR_SRC_NOT_SUPPORTED`（返回的是带签名的跳转，浏览器不认） |
| `api.injahow.cn` | ✅ `name/artist` | ✅ 正常播放 |

所以 `musicConfig.meting.api` 指向 **injahow**，i-meto 与 moeyao 作为 fallback 只用于拉列表。
如果之后 injahow 也挂了，优先换成"能代理转发的实例"，而不是直连 CDN 签名的那个。

## 唱针

唱片右上方是唱针：暂停时抬起摆在外侧（`rotate(116deg)`），播放时落到纹路上（`rotate(155deg)`），
620ms 缓动，配合纹路旋转一起给人"真的在放唱片"的感觉。状态由 `.music-hero[data-playing]` 驱动，
和播放/暂停、上一首/下一首完全同步。

## 已知限制

- Meting 返回的音频 URL 带签名参数，**可能过期**；过期时播放会失败，页面会提示「试试下一首」。
  长期稳定的做法是把音频下载到 `public/assets/music/`，把 `mode` 改回 `local`。
- 封面同样走 Meting 的图片接口，已经加 `referrerpolicy="no-referrer"` 避免防盗链。
- 歌单里没有时长字段，`总时长` 要等音频元数据加载后才显示。

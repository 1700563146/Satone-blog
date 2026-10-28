# 音乐页：接口选型与曲库同步

## 结论先说

| 方案 | 优点 | 缺点 | 本项目 |
|---|---|---|---|
| **Meting API**（公开实例） | 免后端、免 key；一次请求拿到「曲名/歌手/封面/音频直链/歌词」；支持网易云/QQ/酷狗/虾米 | 公共实例会限流、偶尔挂；直链带签名会过期；字段风格有两种（`title/author` 与 `name/artist`） | ✅ 用来**构建期**同步 |
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

## 已知限制

- Meting 返回的音频 URL 带签名参数，**可能过期**；过期时播放会失败，页面会提示「试试下一首」。
  长期稳定的做法是把音频下载到 `public/assets/music/`，把 `mode` 改回 `local`。
- 封面同样走 Meting 的图片接口，已经加 `referrerpolicy="no-referrer"` 避免防盗链。
- 歌单里没有时长字段，`总时长` 要等音频元数据加载后才显示。

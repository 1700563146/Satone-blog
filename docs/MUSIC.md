# 音乐页：接口选型与曲库同步

## 结论先说

| 方案 | 优点 | 缺点 | 本项目 |
|---|---|---|---|
| **Meting API**（公开实例，本项目选 `api.injahow.cn`） | 免后端、免 key；一次请求拿到「曲名/歌手/封面/音频直链/歌词」；支持网易云/QQ/酷狗/虾米 | 公共实例会限流、偶尔挂；直链带签名会过期；字段风格有两种（`title/author` 与 `name/artist`） | ✅ 用来**构建期**同步 |
| NeteaseCloudMusicApi（自建） | 功能最全、稳定可控 | 要长期跑一个 Node 服务，静态站（Vercel / CF Pages）扛不住 | ❌ |
| Spotify / Apple Music API | 曲库正版、元数据规范 | 需要 OAuth + client secret，且**没有**可直接播放的直链 | ❌ |
| 自己托管音频（本地 mp3） | 完全可控、无外部依赖、可离线 | 需要自己拥有音频文件 | ✅ 作为兜底 / 长期方案 |

**本项目采用：构建期同步 + 提交静态 JSON。** 输出到 `public/music/library.json`，
页面运行时只 fetch 这一个静态文件（几百首也不会撑大 HTML），列表按 80 首分页、盘廊只铺当前曲目附近 17 张。
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
3. 写入 `public/music/library.json`：`{ generatedAt, source, tracks[] }`；
4. 全部接口都失败时，退回 `local.playlist`（本地曲目），保证页面不空。

## 多个歌单一起导

`meting.playlistIds` 是数组，按顺序逐个拉取后**合并去重**（同名 + 同歌手算重复）：

```ts
meting: {
  playlistIds: ["18344910739", "17840783642", "17896692465"],
}
```

命令行也可以一次给多个（逗号或空格分隔，链接和纯 id 混着写都行）：

```bash
pnpm music:sync --playlist="https://music.163.com/#/my/m/music/playlist?id=18344910739,17840783642,17896692465"
```

仓库当前就是这三张公开歌单，合并去重后 378 首（44 + 270 + 120，重复 56 首）。

## 导入自己的网易云歌单

Meting 是**匿名接口**：能读公开歌单，读不到你私人的「我喜欢的音乐」「最近播放」这类带登录态的数据。
所以流程是「把歌单设成公开 → 拿 id → 同步」，**不需要**登录、不需要 cookie。

1. 打开网易云网页版，进入目标歌单，地址栏形如
   `https://music.163.com/#/playlist?id=123456789`（移动端分享链接里也有 `id=`）；
2. 确认这个歌单是**公开**的（歌单右上角「分享」能复制链接就说明公开）；
   「我喜欢的音乐」没有公开 id，想在站内放这些歌，就另建一个公开歌单把它们加进去；
3. 取到 id 后，二选一：

   ```bash
   # A. 直接粘链接（脚本会自动解析 id，--playlist= 或 MUSIC_PLAYLIST 都可以）
   pnpm music:sync --playlist="https://music.163.com/playlist?id=123456789"
   MUSIC_PLAYLIST=123456789 pnpm music:sync

   # B. 写进配置再同步
   #   src/config/musicConfig.ts → meting.id: "123456789"
   pnpm music:sync
   ```

4. 把更新后的 `public/music/library.json` 一起提交。

> 想换平台就把 `meting.server` 改成 `tencent` / `kugou`，`type` 改成 `playlist` / `album` / `search`，
> 其余流程不变。

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

## 唱针与音量

**唱针**（支点在圆盘右上方外侧）：

| 状态 | 角度 | 表现 |
|---|---|---|
| 暂停 | `90deg`（垂直向下） | 整条臂挂在盘外，磁头不压盘面 |
| 播放 | `90deg + 30deg + 30deg × 进度` | 从「垂直 +30°」扫到「垂直 +60°」：开头落在唱片外圈，越接近结尾越靠近盘心 |

- 进度来自 `audio` 的 `timeupdate`：`hero.style.setProperty("--track-progress", ratio)`，
  CSS 用 `transform: rotate(calc(90deg + 30deg + 30deg * var(--track-progress, 0)))`，
  520ms 缓动，唱针是"一格格往盘心挪"而不是硬切角度；
- 点播放立刻落针（`data-playing="true"`），音频起播失败再收针。

**唱片旋转**：`.disc-rotor` 把纹路 / 反光 / 封面打包成一个转子，播放时整盘转，暂停停在原角度；
`prefers-reduced-motion` 下不转。

**音量**：控制行右侧是「喇叭图标 + 水平滑条」——
图标点击静音 / 取消静音（两个图标切换），滑条 `input` 事件写 `audio.volume` 并记住到
`localStorage.musicVolume`；填充部分用 `linear-gradient` + 隐藏原生滑块（同 Uiverse 参考样式，
这里是水平方向），填充宽度由 `--vol` 变量驱动。

## 已知限制

- Meting 返回的音频 URL 带签名参数，**可能过期**；过期时播放会失败，页面会提示「试试下一首」。
  长期稳定的做法是把音频下载到 `public/assets/music/`，把 `mode` 改回 `local`。
- 封面同样走 Meting 的图片接口，已经加 `referrerpolicy="no-referrer"` 避免防盗链。
- 歌单里没有时长字段，`总时长` 要等音频元数据加载后才显示。

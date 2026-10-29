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

## 唱针：可拖拽的旋转控件

唱针不是单纯的状态动画，而是一个**可拖拽 + 可键盘操作**的旋转控件，角度直接映射播放进度。

| 角度 | 含义 |
|---|---|
| `0°` | 休息位：垂直向下挂在盘外，唱片不转 |
| `0–25°` | 悬在盘外（内圈以外），松手会**弹回 0°**，不会播放（防止"唱针落在机壳上"） |
| `25°` | 外环：落针门槛，越过它松手就 `play()` |
| `25–100°` | 盘面：角度线性映射进度，`ratio = (angle − 25) / 75` |
| `100°` | 内环：曲子放完的位置 |

交互细节：

- **拖拽**：按住唱臂拖动，角度 = 指针相对支点的极角（已归一化成 0–360，超过 180° 不会突然反转）；
  拖动过程中用 `pointerAngle += (target − pointerAngle) × 0.45` 做惯性阻尼，有"重量感"；
  同时实时 `audio.currentTime = ratio × duration`，等于用唱针刮擦整首歌。
- **边界**：拖动时可以略微越界（−6°～106°）做回弹观感，**松手时收回 0–100**；不允许逆时针越过 0。
- **松手**：`angle ≥ 25` → 落针播放（带落针动画 + 底噪渐入）；`angle < 25` → 弹回 0 并 `pause()`。
- **自动滑入**：播放中 `timeupdate` 把角度写成 `25 + 75 × 进度`，唱针顺时针滑向内环；播放结束 (`ended`) 自动复位到 0°。
- **键盘**（唱臂可 `Tab` 聚焦，`role="slider"`）：`↑/→` +2°、`↓/←` −2°、`Enter` 拨到外环并播放、`Esc` 复位。
- **动效**：落针时磁头 `head-set` 下沉 + 回弹 320ms；唱片由 `.disc-rotor` 整盘旋转（纹路 + 反光 + 封面一起转），暂停停在原角度。
- **底噪**：不引入音频文件，用 WebAudio 现场合成 2s 循环的白噪 + 随机爆点（bandpass 2.4kHz），
  落针时 0.5s 渐入到 0.09，暂停 / 结束 0.5s 渐出；`prefers-reduced-motion` 下不启用。

## 音量

两处都能调，共享同一个值（`localStorage.musicVolume`）：

1. **播放器那一行**：喇叭图标 + 水平滑条（渐变填充 + 隐藏原生滑块，`--vol` 变量驱动），
   点图标静音 / 恢复，图标在 `volume-up` / `volume-off` 之间切换；
2. **右下角浮动控件**：和「主页 / 发布 / 回到顶部」同款胶囊按钮，**悬停或聚焦时向上弹出竖直滑条**
   （内部把 range 旋转 −90° 并用绝对定位居中，所以弹层是窄长条而不是横条）。

两处通过 `musicVolumeChange` 事件同步：任一处改动都会写 `localStorage` 并应用到页面里所有 `<audio>`，
Swup 切页后由 `astro:page-load` 重新套一遍。

## 被限流了怎么办

公共 Meting 实例都有配额，超额时会直接返回
`{"message":"请求次数已达上限，请明天再试"}`（injajow 就是这种日限流）。
表现在页面上就是：**封面全是破图、点播放没有任何声音**。

根治办法是 **把曲库下载成本地文件**，让页面彻底不依赖第三方接口：

```bash
pnpm music:offline          # 默认 10 首（= --meting --offline=10）
pnpm music:sync --offline=15  # 想要更多就改数量
```

脚本会：

1. 先按正常流程拉歌单（元数据）；
2. 取前 N 首，按顺序尝试
   `https://music.163.com/song/media/outer/url?id=<id>.mp3`（128kbps，体积小）
   → 各 Meting 实例的 `type=url`（兜底）；
   **只收 mp3**（ID3 / 帧同步头），单曲超过 8MB 的 flac 直接跳过；
3. 音频写 `public/music/audio/<songId>.mp3`，封面写 `public/music/cover/<songId>.jpg`
   （封面会做魔数校验，避免把错误页当图片存下来）；
4. 把 `library.json` 里的 `url`/`cover` 改写成站内路径，并且 **只保留成功下载的这几首**。

结果：`/music/` 打开后**零第三方请求**（实测 451 个请求全在 localhost），
封面和音频都来自自己的域名，不怕限流、不怕直链过期。

体积参考：10 首 ≈ 44MB（mp3 平均 4.5MB/首）。仓库要小就把数量调成 6~8。

想回到「全量在线歌单」：

```bash
pnpm music:sync --meting     # 重新拉 378 首，url/cover 走 Meting 代理
```

> 导航栏/侧栏那个小播放器走的是 `musicPlayerConfig.mode`：离线阶段设为 `"local"`，
> 它只会读 `public/assets/music/` 里的本地文件，也不会去打接口。

## 已知限制

- Meting 返回的音频 URL 带签名参数，**可能过期**；过期时播放会失败，页面会提示「试试下一首」。
  长期稳定的做法是把音频下载到 `public/assets/music/`，把 `mode` 改回 `local`。
- 封面同样走 Meting 的图片接口，已经加 `referrerpolicy="no-referrer"` 避免防盗链。
- 歌单里没有时长字段，`总时长` 要等音频元数据加载后才显示。

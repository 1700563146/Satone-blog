# 番茄钟（占位实现）

> 状态：**占位 / 未接入计时逻辑**。当前只交付了组件骨架、配置项、侧边栏挂载与设计规范，
> 计时与提醒逻辑待后续实现。本文档记录现状与接入计划，避免后来者重复踩点。

## 现状

| 项 | 状态 |
| --- | --- |
| 组件文件 | `src/components/widget/Pomodoro.astro` |
| 侧边栏挂载 | `src/config/sidebarConfig.ts` → `rightComponents`（`type: "pomodoro"`）与 `mobileBottomComponents` |
| 组件注册 | `src/components/layout/SideBar.astro` 的 `componentMap.pomodoro` |
| 配置类型 | `src/types/sidebarConfig.ts` → `PomodoroConfig` |
| i18n | `I18nKey.pomodoro`（zh_CN / zh_TW / en / ja / ko / ru 六种语言已补齐） |
| 视觉 | 圆环（`conic-gradient` + `--pomodoro-progress`）、时长文案、禁用态按钮、说明文字 |
| 交互 | 无。开始按钮 `disabled`，不做假交互 |

原「站点信息」卡片（`src/components/widget/SiteInfo.astro`）仍保留在仓库里，
如需换回，把 `sidebarConfig.ts` 里对应的 `type` 改回 `"siteInfo"` 即可。

## 配置项

```ts
// src/config/sidebarConfig.ts
{
  type: "pomodoro",
  enable: true,
  position: "top",
  showOnPostPage: false,
  specificConfig: {
    pomodoro: {
      workMinutes: 25,          // 专注时长
      breakMinutes: 5,          // 短休息
      longBreakMinutes: 15,     // 长休息
      roundsBeforeLongBreak: 4, // 几轮后进入长休息
    },
  },
}
```

## 待实现清单

### 1. 计时内核

- 基于 `performance.now()` 计算剩余时间，**不要**用 `setInterval` 递减计数
  （后台标签页会被节流，递减会失准）；`setInterval` 只负责触发渲染。
- 状态机：`idle → focus → shortBreak / longBreak → focus → …`
- 页面不可见（`document.hidden`）时暂停渲染但保持计时；恢复可见时按时间差补算。
- 到点触发提醒：先做「标题闪烁 + 页面内提示」，再做可选系统通知
  （`Notification.requestPermission()` 需要用户手势触发，必须在点击开始时申请）。

### 2. 进度环

组件里已经预留了 `style="--pomodoro-progress: 0deg"`，
计时器只需更新这个变量（0–360deg），圆环自动推进，无需重绘结构。

### 3. 持久化

- `localStorage.pomodoroState`：`{ phase, startedAt, remainingMs, round }`
- 刷新页面要能续上（用 `startedAt + 时长 - now` 反推剩余时间）。
- 与 `setting-utils.ts` 里的其他偏好保持同一套读写风格。

### 4. 动效与可访问性

- 进度环推进用 `transition: --pomodoro-progress 0.3s linear`（需 `@property` 注册角度类型），
  或直接按秒更新，避免每帧写样式。
- **必须**遵循 `prefers-reduced-motion: reduce`：不做脉冲/呼吸动效。
- 按钮需要 `aria-pressed`、`aria-live="polite"` 的剩余时间播报（每 30s 一次，不要每秒播报）。
- 键盘：`Space` / `Enter` 开始，`R` 重置——只在组件获得焦点时生效。

### 5. 与全站一致的约定

- 定时器/监听器要幂等（`window.__pomodoroReady` 守卫），因为 Swup 会在切页时重跑模块脚本；
  侧边栏在文章页可能被重新渲染，需要在 `astro:page-load` 后重新绑定。
- 样式只用设计 token（`--primary`、`--card-bg`、`--btn-regular-bg` 等），不要写死颜色，
  否则主题色/暗色模式切换时会脱节。

## 验收标准

1. 25 分钟专注 + 5 分钟短休息 + 每 4 轮 15 分钟长休息，计时准确（后台标签页切回来不漂移）。
2. 刷新页面后能续上未完成的专注。
3. 圆环进度与实际剩余时间一致，切换主题/暗色不闪、不丢状态。
4. `prefers-reduced-motion` 下无脉冲动效。
5. 亮/暗色两套主题下对比度达标（正文 ≥ 4.5:1），键盘可完整操作。

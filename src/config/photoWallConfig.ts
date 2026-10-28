import type { PhotoWallConfig } from "../types/photoWallConfig";

// ============================================================================
// 照片墙配置 —— 相册分组，每组一叠照片
//
// · 照片放 public/wall/ 下，用 "/wall/xxx.jpg" 引用
//   （想走 Astro 的图片优化，可以改成 src/assets + <Image />，这里保持零依赖）
// · 组内照片按数组顺序叠放，第一张是封面
// · 组内不足 3 张时页面会自动补空白相纸，保证「一叠」的手感
// · 现在 9 张是自动生成的示例图（public/wall/demo/），换成自己的照片时
//   只改 src 即可，页面结构不用动
// ============================================================================
export const photoWallConfig: PhotoWallConfig = {
	enable: true,
	title: "照片墙",
	description: "随手拍下的画面，按组收在一叠一叠的相纸里。点开一叠，就是一整段时光。",
	albums: [
		{
			id: "night-flights",
			title: "夜航",
			date: "2026-04",
			description: "天还没亮就出门的那几次，山顶只有风声。",
			photos: [
				{
					src: "/wall/demo/night-1.webp",
					caption: "月亮升起来之前",
					meta: "2026-04-12 · 山脊",
				},
				{
					src: "/wall/demo/night-2.webp",
					caption: "等一场流星",
					meta: "2026-04-12 · 北坡",
				},
				{
					src: "/wall/demo/night-3.webp",
					caption: "回程的 blue hour",
					meta: "2026-04-13 · 山口",
				},
			],
		},
		{
			id: "dusk",
			title: "暮色",
			date: "2026-03",
			description: "太阳落下去之后的那二十分钟，橘色会漫上来。",
			photos: [
				{
					src: "/wall/demo/dusk-1.webp",
					caption: "橘紫交界",
					meta: "2026-03-21 · 江边",
				},
				{
					src: "/wall/demo/dusk-2.webp",
					caption: "最后一格电",
					meta: "2026-03-21 · 江边",
				},
				{
					src: "/wall/demo/dusk-3.webp",
					caption: "路灯亮起的一瞬",
					meta: "2026-03-28 · 老街",
				},
			],
		},
		{
			id: "after-rain",
			title: "雨后",
			date: "2026-02",
			description: "下过雨的空气是青灰色的，什么都像被擦过一遍。",
			photos: [
				{
					src: "/wall/demo/rain-1.webp",
					caption: "青灰",
					meta: "2026-02-09 · 天台",
				},
				{
					src: "/wall/demo/rain-2.webp",
					caption: "雨丝",
					meta: "2026-02-09 · 天台",
				},
				{
					src: "/wall/demo/rain-3.webp",
					caption: "放晴前的五分钟",
					meta: "2026-02-17 · 门口",
				},
			],
		},
	],
};

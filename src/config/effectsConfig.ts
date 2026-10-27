import type {
	InteractiveEffectsConfig,
	SakuraConfig,
} from "../types/effectsConfig";

// 特效配置 - 集中管理所有动画特效

export const sakuraConfig: SakuraConfig = {
	// 是否启用樱花特效
	enable: false,

	// 樱花数量
	sakuraNum: 21,

	// 樱花越界限制次数，-1为无限循环
	limitTimes: -1,

	// 樱花尺寸
	size: {
		// 樱花最小尺寸倍数
		min: 0.5,
		// 樱花最大尺寸倍数
		max: 1.1,
	},

	// 樱花不透明度
	opacity: {
		// 樱花最小不透明度
		min: 0.3,
		// 樱花最大不透明度
		max: 0.9,
	},

	// 樱花移动速度
	speed: {
		// 水平移动
		horizontal: {
			// 水平移动速度最小值
			min: -1.7,
			// 水平移动速度最大值
			max: -1.2,
		},
		// 垂直移动
		vertical: {
			// 垂直移动速度最小值
			min: 1.5,
			// 垂直移动速度最大值
			max: 2.2,
		},
		// 旋转速度
		rotation: 0.03,
		// 消失速度，不应大于最小不透明度
		fadeSpeed: 0.03,
	},

	// 层级，确保樱花在合适的层级显示
	zIndex: 100,
};

// ── 交互类特效（磁吸 / 星光 / 光晕 / 阅读进度 / 音乐流光） ──────────────
// 全部遵循 prefers-reduced-motion: reduce：开启系统减弱动态后一律不启动，
// 星光退化为静态星点（仍有画面，但不再逐帧绘制）。
export const interactiveEffectsConfig: InteractiveEffectsConfig = {
	// 磁吸：指针靠近按钮/卡片时，元素被轻轻带向指针（只在精确指针设备 + 未减弱动态时生效）
	magnetic: {
		enable: true,
		// 触发半径：元素外框再往外这么多 px 开始吸附
		radius: 90,
		// 按钮位移上限（px）：够感觉到，又不至于跑偏
		buttonPull: 6,
		// 卡片位移上限（px）：卡片大，位移必须更收敛
		cardPull: 3,
	},

	// 星空：仅暗色主题，绘制在页面背景层（卡片之下）。只画「星点 ↔ 指针」连线，
	// 星点之间不连线 —— 用数量、颜色和大小差异堆出星空感，而不是网格感。
	starfield: {
		enable: {
			desktop: true,
			// 移动端默认关闭：没有指针就没有连线，只剩耗电的逐帧绘制
			mobile: false,
		},
		density: 16800, // 每 19600 px² 一颗星（1440×900 约 66 颗，少量大节点才看得出星座）
		maxParticles: 88, // 数量上限（对齐最初的设计：上限 88）
		pointerDistance: 120, // 指针与星点连线的最大距离（更亮的那一级，短一点更贴身）
		maxLinks: 5, // 同时存在的连线数量上限
		starLinkMax: 16, // 星座连线总条数上限（少而清楚）
		bgDensity: 3200, // 背景繁星：每 3200 px² 一颗（1440×900 约 400 颗），只闪烁不连线
		bgMaxParticles: 520, // 背景繁星数量上限
		starLinkDistance: 110, // 星点之间连线的最大距离（星座网）
		drift: 0.055, // 极慢漂移，几乎察觉不到移动
	},

	// 鼠标跟随光晕：叠加在页面上的一团主色柔光（screen 混合，不压暗内容）
	cursorGlow: {
		enable: true,
		size: 520,
		opacityDark: 0.62,
		opacityLight: 0.42,
	},

	// 阅读进度条：有正文（.custom-md）的页面在顶部显示
	readingProgress: {
		enable: true,
	},

	// 音乐卡片播放按钮的流光边框
	musicGlow: {
		enable: true,
		speed: 6, // 流光旋转一周的秒数
	},
};


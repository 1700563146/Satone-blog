export type SakuraConfig = {
	enable: boolean; // 是否启用樱花特效
	sakuraNum: number; // 樱花数量，默认21
	limitTimes: number; // 樱花越界限制次数，-1为无限循环
	size: {
		min: number; // 樱花最小尺寸倍数
		max: number; // 樱花最大尺寸倍数
	};
	opacity: {
		min: number; // 樱花最小不透明度
		max: number; // 樱花最大不透明度
	};
	speed: {
		horizontal: {
			min: number; // 水平移动速度最小值
			max: number; // 水平移动速度最大值
		};
		vertical: {
			min: number; // 垂直移动速度最小值
			max: number; // 垂直移动速度最大值
		};
		rotation: number; // 旋转速度
		fadeSpeed: number; // 消失速度，不应大于最小不透明度
	};
	zIndex: number; // 层级，确保樱花在合适的层级显示
};

/** 磁吸效果：指针靠近时元素被轻轻带向指针 */
export type MagneticConfig = {
	enable: boolean; // 总开关
	radius: number; // 触发半径（px），指针进入元素外框 + 该半径时开始吸附
	buttonPull: number; // 按钮最大位移（px）
	cardPull: number; // 卡片最大位移（px），比按钮更收敛
};

/** 暗色背景星空：大量细小星点 + 指针连线（星点之间不连线） */
export type StarfieldConfig = {
	enable:
		| boolean
		| {
				desktop: boolean; // 桌面端是否启用
				mobile: boolean; // 移动端是否启用（无指针设备时只有星点闪烁）
		  };
	density: number; // 密度：平均每多少平方 px 一颗星，数值越小越密
	maxParticles: number; // 星点数量上限（性能封顶）
	pointerDistance: number; // 指针与星点连线的最大距离（px）
	maxLinks: number; // 同时存在的连线数量上限（2~3 条最清爽）
	drift: number; // 星点漂移速度（px/帧），0 为静止
};

/** 鼠标跟随光晕 */
export type CursorGlowConfig = {
	enable: boolean; // 总开关（仅在精确指针设备上生效）
	size: number; // 光晕直径（px）
	opacityDark: number; // 暗色主题下的最大不透明度
	opacityLight: number; // 亮色主题下的最大不透明度
};

/** 文章阅读进度条（页面最顶部） */
export type ReadingProgressConfig = {
	enable: boolean;
};

/** 音乐卡片播放按钮的流光边框 */
export type MusicGlowConfig = {
	enable: boolean;
	speed: number; // 流光旋转一周的秒数
};

/** 交互类特效配置：磁吸、星光、光晕、阅读进度、音乐流光 */
export type InteractiveEffectsConfig = {
	magnetic: MagneticConfig;
	starfield: StarfieldConfig;
	cursorGlow: CursorGlowConfig;
	readingProgress: ReadingProgressConfig;
	musicGlow: MusicGlowConfig;
};


// 照片墙配置（占位阶段）
//
// 现在只是把入口和版式定下来：真正的图片墙（瀑布流 / 可拖拽 / 灯箱）后面再实现，
// 到时候只需要往 photos 里塞图片、把占位瓦片换成真实缩略图，页面结构不用动。
export interface PhotoWallPhoto {
	/** 图片地址：public/wall/ 下的文件名（如 "/wall/2026-10-01-01.jpg"） */
	src: string;
	/** 说明文字（可空） */
	caption?: string;
	/** 拍摄地点 / 时间等，展示在图注里（可空） */
	meta?: string;
}

export interface PhotoWallConfig {
	enable: boolean;
	title: string;
	description: string;
	/** 真实照片；为空时页面显示占位瓦片 */
	photos: PhotoWallPhoto[];
	/** 占位瓦片数量 */
	placeholderCount: number;
}

export const photoWallConfig: PhotoWallConfig = {
	enable: true,
	title: "照片墙",
	description: "随手拍下的一些画面。现在先占个位，之后换一种更好看的表现形式。",
	photos: [],
	placeholderCount: 9,
};

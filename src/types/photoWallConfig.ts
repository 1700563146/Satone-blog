/** 照片墙：单张照片 */
export interface PhotoWallPhoto {
	/** 图片地址：public 下的路径，例如 "/wall/demo/night-1.jpg" */
	src: string;
	/** 图注（可空） */
	caption?: string;
	/** 拍摄时间 / 地点等副信息（可空） */
	meta?: string;
	/** 可选：竖图占两行，默认按图片比例自动 */
	tall?: boolean;
}

/** 照片墙：一个相册（分组） */
export interface PhotoWallAlbum {
	/** 路由 id，访问 /wall/<id>/ */
	id: string;
	/** 相册名 */
	title: string;
	/** 日期文字，例如 "2026-04" */
	date: string;
	/** 一句话描述（可空） */
	description?: string;
	/** 相册封面；缺省用第一张照片 */
	cover?: string;
	photos: PhotoWallPhoto[];
}

export interface PhotoWallConfig {
	enable: boolean;
	title: string;
	description: string;
	/** 相册列表（按展示顺序） */
	albums: PhotoWallAlbum[];
}

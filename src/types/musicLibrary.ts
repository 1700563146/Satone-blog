/** 音乐库：一条曲目（由 scripts/sync-music-library.ts 生成，见 src/constants/music-library.json） */
export interface MusicLibraryTrack {
	/** 稳定 id：优先用源站 id，取不到就用 name+artist 的 hash */
	id: string;
	/** 曲名 */
	name: string;
	/** 歌手（可能多个，用 / 分隔） */
	artist: string;
	/** 专辑名（可空） */
	album?: string;
	/** 封面地址（可空：为空时用渐变占位） */
	cover?: string;
	/** 音频地址（可能是第三方直链或本地路径） */
	url: string;
	/** 歌词地址（可空） */
	lrc?: string;
	/** 时长（秒，可空：元数据到手前不知道） */
	duration?: number;
}

/** 音乐库文件结构 */
export interface MusicLibrary {
	/** 生成时间（ISO） */
	generatedAt: string;
	/** 数据来源描述，例如 meting:netease:playlist:10046455237 / local */
	source: string;
	tracks: MusicLibraryTrack[];
}

/**
 * 音乐库同步：把播放列表拉成一份静态 JSON（public/music/library.json）。
 *
 * 为什么在构建期拉：
 *   页面运行时不再依赖第三方接口 —— 没有 CORS、没有限流、接口挂了页面也照常显示。
 *   音乐页只读这份 JSON（进仓库、可审阅），需要更新时手动跑一次 `pnpm music:sync`。
 *
 * 数据来源按 musicPlayerConfig 走：
 *   · mode = "meting" → 依次尝试 meting.api 与 fallbackApis（Meting API，公开实例）
 *   · mode = "local"  → 直接用 local.playlist
 *
 * 兼容两种 Meting 字段风格：{title,author}（i-meto）与 {name,artist}（injahow 等）。
 */
import fs from "node:fs";
import path from "node:path";
import { musicPlayerConfig } from "../src/config/musicConfig";
import type { MusicLibrary, MusicLibraryTrack } from "../src/types/musicLibrary";

// 输出到 public/，页面运行时 fetch 这份 JSON：
// 曲库可能有几百首，直接内联进 HTML 会让音乐页首包变得很大。
const OUT_FILE = path.join("public", "music", "library.json");

const TIMEOUT_MS = 15000;

interface RawMetingItem {
	title?: string;
	name?: string;
	author?: string;
	artist?: string;
	album?: string;
	pic?: string;
	cover?: string;
	url?: string;
	lrc?: string;
	duration?: number;
}

const hash = (input: string): string => {
	let h = 0;
	for (let i = 0; i < input.length; i++) {
		h = (h * 31 + input.charCodeAt(i)) | 0;
	}
	return Math.abs(h).toString(36);
};

const pick = (item: RawMetingItem): MusicLibraryTrack | null => {
	const name = (item.title ?? item.name ?? "").trim();
	const artist = (item.author ?? item.artist ?? "").trim();
	const url = (item.url ?? "").trim();
	if (!name || !url) return null;
	const cover = (item.pic ?? item.cover ?? "").trim();
	return {
		id: hash(`${name}|${artist}`),
		name,
		artist: artist || "未知歌手",
		...(item.album ? { album: item.album } : {}),
		...(cover ? { cover } : {}),
		url,
		...(item.lrc ? { lrc: item.lrc } : {}),
		...(typeof item.duration === "number" ? { duration: item.duration } : {}),
	};
};

/**
 * 解析歌单来源：支持直接粘网易云歌单链接或纯 id。
 *   https://music.163.com/playlist?id=10046455237
 *   https://music.163.com/#/playlist?id=10046455237
 *   .../playlist/10046455237
 *   10046455237
 */
const parsePlaylistId = (input: string): string | null => {
	const trimmed = input.trim();
	if (/^\d{4,}$/.test(trimmed)) return trimmed;
	const byQuery = trimmed.match(/[?&]id=(\d+)/);
	if (byQuery) return byQuery[1] ?? null;
	const byPath = trimmed.match(/playlist\/(\d+)/);
	if (byPath) return byPath[1] ?? null;
	const anyDigits = trimmed.match(/(\d{6,})/);
	return anyDigits ? (anyDigits[1] ?? null) : null;
};

const fetchPlaylist = async (api: string): Promise<RawMetingItem[]> => {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
	try {
		const response = await fetch(api, {
			signal: controller.signal,
			headers: {
				// 部分实例对无 UA 的请求返回 403
				"user-agent":
					"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
				accept: "application/json,text/plain,*/*",
			},
		});
		if (!response.ok) throw new Error(`HTTP ${response.status}`);
		const data = (await response.json()) as RawMetingItem[];
		if (!Array.isArray(data)) throw new Error("返回不是数组");
		return data;
	} finally {
		clearTimeout(timer);
	}
};

const buildFromMeting = async (): Promise<MusicLibrary | null> => {
	const { meting } = musicPlayerConfig;
	if (!meting?.api) return null;

	// 这几个字段在类型里是可选的，这里统一兜一下默认值
	const server = meting.server ?? "netease";
	const type = meting.type ?? "playlist";

	// 歌单来源优先级：--playlist= / MUSIC_PLAYLIST（可逗号分隔）> meting.playlistIds > meting.id
	const cliArg = process.argv.find((arg) => arg.startsWith("--playlist="));
	const rawList =
		cliArg?.slice("--playlist=".length) ?? process.env.MUSIC_PLAYLIST ?? null;
	const ids = (
		rawList
			? rawList.split(/[\s,]+/).map((item) => parsePlaylistId(item) ?? item)
			: (meting.playlistIds?.length ? meting.playlistIds : [meting.id ?? ""])
	).filter(Boolean);

	if (ids.length === 0) return null;
	if (rawList) console.log(`[music:sync] 使用命令行指定的歌单：${ids.join(", ")}`);

	const apisFor = (playlistId: string): string[] =>
		[meting.api, ...(meting.fallbackApis ?? [])]
			.filter((template): template is string => typeof template === "string")
			.map((template) =>
				template
					.replace(/:server/g, server)
					.replace(/:type/g, type)
					.replace(/:id/g, playlistId),
			);

	const tracks: MusicLibraryTrack[] = [];
	const seen = new Set<string>();
	const usedHosts = new Set<string>();
	const usedIds: string[] = [];

	for (const playlistId of ids) {
		let merged = false;
		for (const api of apisFor(playlistId)) {
			try {
				console.log(`[music:sync] 尝试 ${api}`);
				const raw = await fetchPlaylist(api);
				const picked = raw
					.map(pick)
					.filter((track): track is MusicLibraryTrack => track !== null);
				if (picked.length === 0) throw new Error("没有可用曲目");

				let added = 0;
				for (const track of picked) {
					const key = `${track.name}|${track.artist}`;
					if (seen.has(key)) continue;
					seen.add(key);
					tracks.push(track);
					added += 1;
				}
				usedHosts.add(new URL(api).host);
				usedIds.push(playlistId);
				console.log(
					`[music:sync] 歌单 ${playlistId}：${picked.length} 首，新增 ${added} 首`,
				);
				merged = true;
				break;
			} catch (error) {
				console.warn(
					`[music:sync] 失败：${api} → ${error instanceof Error ? error.message : String(error)}`,
				);
			}
		}
		if (!merged) console.warn(`[music:sync] 歌单 ${playlistId} 全部实例都失败，跳过`);
	}

	if (tracks.length === 0) return null;
	return {
		generatedAt: new Date().toISOString(),
		source: `meting:${server}:${type}:${usedIds.join("+")} (${[...usedHosts].join(", ")})`,
		tracks,
	};
};

const buildFromLocal = (): MusicLibrary | null => {
	const playlist = musicPlayerConfig.local?.playlist ?? [];
	if (playlist.length === 0) return null;
	const tracks: MusicLibraryTrack[] = playlist.map((track) => ({
		id: hash(`${track.name}|${track.artist}`),
		name: track.name,
		artist: track.artist || "未知歌手",
		cover: track.cover,
		url: track.url,
		...(track.lrc ? { lrc: track.lrc } : {}),
	}));
	return {
		generatedAt: new Date().toISOString(),
		source: "local",
		tracks,
	};
};

const main = async (): Promise<void> => {
	// 默认按 musicPlayerConfig.mode 决定；也可以用 MUSIC_SOURCE=meting / --meting 强制拉接口
	const forceMeting =
		process.env.MUSIC_SOURCE === "meting" || process.argv.includes("--meting");
	const useMeting = forceMeting || musicPlayerConfig.mode === "meting";
	const fromMeting = useMeting ? await buildFromMeting() : null;
	const library = fromMeting ?? buildFromLocal();

	if (!library) {
		console.error(
			"[music:sync] 没有拿到任何曲目：检查 musicPlayerConfig 的 meting / local 配置。",
		);
		process.exit(1);
	}

	// 字段顺序固定，方便 diff
	const normalized: MusicLibrary = {
		generatedAt: library.generatedAt,
		source: library.source,
		tracks: library.tracks,
	};

	fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
	fs.writeFileSync(OUT_FILE, `${JSON.stringify(normalized, null, "\t")}\n`, "utf8");
	console.log(
		`[music:sync] 写入 ${OUT_FILE}：${normalized.tracks.length} 首（来源 ${normalized.source}）`,
	);
};

await main();

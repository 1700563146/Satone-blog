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

// 离线模式：把音频与封面抓成本地文件，页面运行时就完全不需要外网了
const AUDIO_DIR = path.join("public", "music", "audio");
const COVER_DIR = path.join("public", "music", "cover");
const AUDIO_URL_BASE = "/music/audio";
const COVER_URL_BASE = "/music/cover";

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

/** 真实音频流的魔数校验：ID3 / fLaC / MP3 帧头 */
// 只收 mp3（ID3 头或帧同步头），flac 体积是 mp3 的 3~4 倍，不进仓库
const looksLikeAudio = (buf: Buffer): boolean => {
	if (buf.length < 200_000 || buf.length > 8 * 1024 * 1024) return false;
	const magic = buf.subarray(0, 4).toString("hex");
	return magic.startsWith("494433") || buf[0] === 0xff;
};

const looksLikeImage = (buf: Buffer): boolean => {
	if (buf.length < 1000) return false;
	const magic = buf.subarray(0, 4).toString("hex");
	return magic.startsWith("ffd8ff") || magic === "89504e47" || magic.startsWith("52494646");
};

const download = async (url: string): Promise<Buffer | null> => {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), 30000);
	try {
		const res = await fetch(url, {
			redirect: "follow",
			signal: controller.signal,
			headers: {
				// 网易云外链要求带 Referer / UA
				Referer: "https://music.163.com/",
				"User-Agent":
					"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
			},
		});
		if (!res.ok) return null;
		return Buffer.from(await res.arrayBuffer());
	} catch {
		return null;
	} finally {
		clearTimeout(timer);
	}
};

/**
 * 离线化：挑前 N 首，把音频与封面下载到 public/music/ 下，
 * 并把 JSON 里的 url / cover 换成站内路径。任何一首取不到就跳过。
 */
const buildOffline = async (
	library: MusicLibrary,
	count: number,
): Promise<MusicLibrary | null> => {
	const { meting } = musicPlayerConfig;
	const server = meting?.server ?? "netease";
	const templates = [meting?.api, ...(meting?.fallbackApis ?? [])]
		.filter((item): item is string => typeof item === "string");

	fs.mkdirSync(AUDIO_DIR, { recursive: true });
	fs.mkdirSync(COVER_DIR, { recursive: true });

	const picked: MusicLibraryTrack[] = [];
	let bytes = 0;

	for (const track of library.tracks) {
		if (picked.length >= count) break;
		// Meting 的代理 URL 里带着网易云 id，离线抓取时要用
		const songId = /[?&]id=(\d+)/.exec(track.url)?.[1];
		const fileName = `${songId ?? track.id}`;

		const audioPath = path.join(AUDIO_DIR, `${fileName}.mp3`);
		let audio: Buffer | null = null;

		if (fs.existsSync(audioPath)) {
			audio = fs.readFileSync(audioPath);
		} else {
			// 1) 网易云外链直链（128kbps，体积小）
			if (songId) {
				const outer = await download(
					`https://music.163.com/song/media/outer/url?id=${songId}.mp3`,
				);
				if (outer && looksLikeAudio(outer)) audio = outer;
			}
			// 2) 退回到 Meting 实例
			if (!audio) {
				for (const template of templates) {
					const url = template
						.replace(/:server/g, server)
						.replace(/:type/g, "url")
						.replace(/:id/g, songId ?? track.id);
					const buf = await download(url);
					if (buf && looksLikeAudio(buf)) {
						audio = buf;
						break;
					}
				}
			}
			if (!audio) {
				console.warn(`[music:offline] 跳过（拿不到音频）：${track.name}`);
				continue;
			}
			fs.writeFileSync(audioPath, audio);
		}

		// 封面
		const coverPath = path.join(COVER_DIR, `${fileName}.jpg`);
		let coverUrl: string | undefined;
		if (fs.existsSync(coverPath)) {
			coverUrl = `${COVER_URL_BASE}/${fileName}.jpg`;
		} else if (track.cover) {
			const buf = await download(track.cover);
			if (buf && looksLikeImage(buf)) {
				fs.writeFileSync(coverPath, buf);
				coverUrl = `${COVER_URL_BASE}/${fileName}.jpg`;
			}
		}

		bytes += audio.length;
		picked.push({
			...track,
			...(coverUrl ? { cover: coverUrl } : {}),
			url: `${AUDIO_URL_BASE}/${fileName}.mp3`,
		});
		console.log(
			`[music:offline] ${picked.length}/${count} ${track.name} (${(audio.length / 1e6).toFixed(1)}MB)`,
		);
	}

	if (picked.length === 0) return null;
	console.log(
		`[music:offline] 共 ${picked.length} 首，音频合计 ${(bytes / 1e6).toFixed(1)}MB`,
	);
	return {
		generatedAt: new Date().toISOString(),
		source: `offline:${server}:${picked.length} 首本地曲目（来自 ${library.source}）`,
		tracks: picked,
	};
};

const main = async (): Promise<void> => {
	// 默认按 musicPlayerConfig.mode 决定；也可以用 MUSIC_SOURCE=meting / --meting 强制拉接口
	const forceMeting =
		process.env.MUSIC_SOURCE === "meting" || process.argv.includes("--meting");
	const useMeting = forceMeting || musicPlayerConfig.mode === "meting";
	const fromMeting = useMeting ? await buildFromMeting() : null;
	let library = fromMeting ?? buildFromLocal();

	// --offline / --offline=12 / MUSIC_OFFLINE=12：抓成本地文件（默认 10 首）
	const offlineArg = process.argv.find((arg) => arg.includes("--offline"));
	const offlineCount = offlineArg
		? Number(offlineArg.split("=")[1] ?? process.env.MUSIC_OFFLINE ?? 10) || 10
		: Number(process.env.MUSIC_OFFLINE ?? 0) || 0;
	if (library && offlineCount > 0) {
		const offline = await buildOffline(library, offlineCount);
		if (!offline) {
			console.error("[music:offline] 一首都没抓到，保留在线曲库。");
		} else {
			library = offline;
		}
	}

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

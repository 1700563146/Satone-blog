/**
 * 照片墙图片优化：把原图压成 WebP（可选 AVIF），输出到 public/wall/。
 *
 * 用法：
 *   pnpm wall:opt            # 处理 wall-src/ 下的所有图片
 *   pnpm wall:opt --avif     # 同时输出 .avif
 *
 * 约定：
 *   - 原图放 wall-src/（gitignore，不入库）
 *   - 输出 public/wall/<同名>.webp，长边默认 1600px
 *   - 文件名统一小写、空格转连字符
 *   - 只处理 wall-src/ 一层目录；已存在且更新的输出会被覆盖
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const SRC_DIR = "wall-src";
// 输出目录可用 WALL_OUT 覆盖（例如 WALL_OUT=public/wall/demo）
const OUT_DIR = process.env.WALL_OUT ?? path.join("public", "wall");
const MAX_EDGE = Number(process.env.WALL_MAX_EDGE ?? 1600);
const QUALITY = Number(process.env.WALL_QUALITY ?? 78);
const WITH_AVIF = process.argv.includes("--avif");
const EXTS = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".JPG", ".JPEG", ".PNG"]);

if (!fs.existsSync(SRC_DIR)) {
	console.log(`[wall:opt] 没有 ${SRC_DIR}/ 目录，跳过。把原图放进去再运行。`);
	process.exit(0);
}

fs.mkdirSync(OUT_DIR, { recursive: true });

const files = fs
	.readdirSync(SRC_DIR)
	.filter((name) => EXTS.has(path.extname(name)))
	.sort();

if (files.length === 0) {
	console.log(`[wall:opt] ${SRC_DIR}/ 里没有图片。`);
	process.exit(0);
}

let before = 0;
let after = 0;

for (const name of files) {
	const input = path.join(SRC_DIR, name);
	const base = path
		.basename(name, path.extname(name))
		.toLowerCase()
		.replace(/[\s_]+/g, "-");
	const meta = await sharp(input).metadata();
	const width = meta.width ?? 0;
	const height = meta.height ?? 0;
	const isPortrait = height > width;
	const resize = isPortrait ? { height: MAX_EDGE } : { width: MAX_EDGE };

	const inputSize = fs.statSync(input).size;
	before += inputSize;

	const webpPath = path.join(OUT_DIR, `${base}.webp`);
	await sharp(input)
		.rotate()
		.resize({ ...resize, withoutEnlargement: true, fit: "inside" })
		.webp({ quality: QUALITY, effort: 5 })
		.toFile(webpPath);
	const webpSize = fs.statSync(webpPath).size;
	after += webpSize;
	console.log(
		`${name} → ${path.basename(webpPath)}  ${(inputSize / 1024).toFixed(0)}KB → ${(webpSize / 1024).toFixed(0)}KB  (${width}×${height} → 长边 ${MAX_EDGE})`,
	);

	if (WITH_AVIF) {
		const avifPath = path.join(OUT_DIR, `${base}.avif`);
		await sharp(input)
			.rotate()
			.resize({ ...resize, withoutEnlargement: true, fit: "inside" })
			.avif({ quality: Math.max(40, QUALITY - 18), effort: 4 })
			.toFile(avifPath);
		console.log(`   + ${path.basename(avifPath)}  ${(fs.statSync(avifPath).size / 1024).toFixed(0)}KB`);
	}
}

console.log(
	`[wall:opt] 完成 ${files.length} 张：${(before / 1024 / 1024).toFixed(1)}MB → ${(after / 1024 / 1024).toFixed(2)}MB（省 ${Math.max(0, Math.round((1 - after / before) * 100))}%）`,
);

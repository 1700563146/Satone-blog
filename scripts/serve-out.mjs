import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * 给 `out/`（静态导出产物）用的极简静态服务器。
 *
 * 用途：本地预览生产产物 + Playwright 的 webServer。
 * 行为对齐静态托管：`/a/b` 依次尝试 `a/b`、`a/b.html`、`a/b/index.html`，
 * 找不到时返回 `404.html` 与 404 状态码。
 */
const ROOT = fileURLToPath(new URL("../out", import.meta.url));
const PORT = Number(process.env.PORT ?? 3000);

const MIME = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".map", "application/json; charset=utf-8"],
  [".xml", "application/xml; charset=utf-8"],
  [".txt", "text/plain; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".ico", "image/x-icon"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".webp", "image/webp"],
  [".avif", "image/avif"],
  [".woff2", "font/woff2"],
  [".woff", "font/woff"],
]);

async function isFile(path) {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}

/** 把 URL 路径映射到 out/ 内的文件；拒绝路径穿越。 */
function toFsPath(urlPath) {
  let decoded;
  try {
    decoded = decodeURIComponent(urlPath.split("?")[0] ?? "/");
  } catch {
    return null;
  }

  const relative = normalize(decoded).replace(/^([/\\])+/, "");
  if (relative.split(sep).includes("..")) return null;
  return join(ROOT, relative);
}

async function resolveFile(urlPath) {
  const target = toFsPath(urlPath);
  if (target === null) return null;

  const candidates = urlPath.endsWith("/")
    ? [join(target, "index.html")]
    : [target, `${target}.html`, join(target, "index.html")];

  for (const candidate of candidates) {
    if (await isFile(candidate)) return candidate;
  }
  return null;
}

const server = createServer(async (request, response) => {
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { Allow: "GET, HEAD" }).end();
    return;
  }

  const urlPath = request.url ?? "/";
  const file = await resolveFile(urlPath);

  if (file === null) {
    const notFoundPage = join(ROOT, "404.html");
    const hasNotFoundPage = await isFile(notFoundPage);
    response.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
    if (hasNotFoundPage && request.method === "GET") {
      createReadStream(notFoundPage).pipe(response);
    } else {
      response.end("Not Found");
    }
    return;
  }

  const contentType =
    MIME.get(extname(file).toLowerCase()) ?? "application/octet-stream";
  const headers = { "Content-Type": contentType };
  // RSS 用更具体的类型，方便订阅器识别
  if (file.endsWith(`${sep}feed.xml`)) {
    headers["Content-Type"] = "application/rss+xml; charset=utf-8";
  }

  response.writeHead(200, headers);
  if (request.method === "HEAD") {
    response.end();
    return;
  }
  createReadStream(file).pipe(response);
});

server.listen(PORT, () => {
  console.log(`静态预览：http://127.0.0.1:${PORT}（目录 ${ROOT}）`);
});

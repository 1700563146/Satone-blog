import type { PublishTarget } from "./config";

/**
 * GitHub Contents API 的最小封装（浏览器可用）。
 *
 * 只用三个操作：读文件（拿 sha / 判断是否存在）、列目录（查重）、写文件（提交）。
 * 参考：https://docs.github.com/rest/repos/contents
 */

export class GithubError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "GithubError";
  }
}

const API = "https://api.github.com";

/** UTF-8 安全的 base64（`btoa` 只接受 latin1，中文会抛错）。 */
export function toBase64Utf8(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

/** 解码 GitHub 返回的 base64（其中带有换行）。 */
export function fromBase64Utf8(base64: string): string {
  const binary = atob(base64.replace(/\s+/g, ""));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function headers(token: string): HeadersInit {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

async function readError(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { message?: string };
    return data.message ?? response.statusText;
  } catch {
    return response.statusText;
  }
}

export interface RemoteFile {
  /** 更新已有文件时必须带上。 */
  sha: string;
  content: string;
}

/** 读取文件内容；文件不存在返回 null（其他错误抛出）。 */
export async function getFile(
  token: string,
  target: Pick<PublishTarget, "owner" | "repo" | "branch">,
  path: string,
): Promise<RemoteFile | null> {
  const url = `${API}/repos/${target.owner}/${target.repo}/contents/${encodeURI(path)}?ref=${encodeURIComponent(target.branch)}`;
  const response = await fetch(url, { headers: headers(token) });

  if (response.status === 404) return null;
  if (!response.ok) {
    throw new GithubError(
      `读取 ${path} 失败：${await readError(response)}`,
      response.status,
    );
  }

  const data = (await response.json()) as {
    content?: string;
    encoding?: string;
    sha?: string;
  };
  return {
    sha: data.sha ?? "",
    content: data.content === undefined ? "" : fromBase64Utf8(data.content),
  };
}

/** 列出目录下的文件名（不含路径）。目录不存在返回空数组。 */
export async function listFiles(
  token: string,
  target: Pick<PublishTarget, "owner" | "repo" | "branch">,
  dir: string,
): Promise<string[]> {
  const url = `${API}/repos/${target.owner}/${target.repo}/contents/${encodeURI(dir)}?ref=${encodeURIComponent(target.branch)}`;
  const response = await fetch(url, { headers: headers(token) });

  if (response.status === 404) return [];
  if (!response.ok) {
    throw new GithubError(
      `读取目录 ${dir} 失败：${await readError(response)}`,
      response.status,
    );
  }

  const data = (await response.json()) as Array<{
    name?: string;
    type?: string;
  }>;
  return data
    .filter((entry) => entry.type === "file")
    .map((entry) => entry.name ?? "");
}

export interface CommitResult {
  commitUrl: string;
  commitSha: string;
}

/** 创建或更新文件（更新时传 sha）。 */
export async function putFile(
  token: string,
  target: Pick<PublishTarget, "owner" | "repo" | "branch">,
  input: { path: string; content: string; message: string; sha?: string },
): Promise<CommitResult> {
  const url = `${API}/repos/${target.owner}/${target.repo}/contents/${encodeURI(input.path)}`;
  const response = await fetch(url, {
    method: "PUT",
    headers: { ...headers(token), "Content-Type": "application/json" },
    body: JSON.stringify({
      message: input.message,
      content: toBase64Utf8(input.content),
      branch: target.branch,
      ...(input.sha === undefined ? {} : { sha: input.sha }),
    }),
  });

  if (!response.ok) {
    throw new GithubError(
      `提交 ${input.path} 失败：${await readError(response)}`,
      response.status,
    );
  }

  const data = (await response.json()) as {
    commit?: { html_url?: string; sha?: string };
  };
  return {
    commitUrl: data.commit?.html_url ?? "",
    commitSha: data.commit?.sha ?? "",
  };
}

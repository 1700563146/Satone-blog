/**
 * GitHub Token 的浏览器端存储（ADR-030）。
 *
 * - 只存在 localStorage，不上传、不进代码仓库、不参与构建；
 * - 用 `useSyncExternalStore` 读它，避免"挂载后 setState"带来的水合不一致与 lint 问题。
 */

const STORAGE_KEY = "satoneBlog:githubToken";

/** 供测试与调试使用；页面不要直接拼接这个键。 */
export const TOKEN_STORAGE_KEY = STORAGE_KEY;

const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

export function subscribeToken(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** 当前保存的 token（服务端渲染时为空字符串）。 */
export function getStoredToken(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    // 隐私模式下 localStorage 可能抛错
    return "";
  }
}

export function saveToken(token: string): void {
  window.localStorage.setItem(STORAGE_KEY, token.trim());
  emit();
}

export function clearStoredToken(): void {
  window.localStorage.removeItem(STORAGE_KEY);
  emit();
}

/** 服务端快照：必须返回稳定值，否则会无限重渲染。 */
export function getServerToken(): string {
  return "";
}

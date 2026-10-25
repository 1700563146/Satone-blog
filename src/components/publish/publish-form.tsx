"use client";

import { useId, useMemo, useRef, useState, useSyncExternalStore } from "react";

import { siteConfig } from "@/lib/config";
import {
  formatPostSource,
  preparePost,
  todayInOffset,
  type PreparedPost,
} from "@/lib/content/publish";
import {
  ContentValidationError,
  formatContentIssue,
  postFrontmatterSchema,
  type ContentIssue,
  type PostFrontmatter,
} from "@/lib/content/schema";
import { PUBLISH_TARGET } from "@/lib/publish/config";
import {
  GithubError,
  getFile,
  putBinaryFile,
  putFile,
} from "@/lib/publish/github";
import {
  appendSnippet,
  buildImagePlan,
  formatBytes,
  toBase64Bytes,
  MAX_IMAGE_LABEL,
  type ImagePlan,
} from "@/lib/publish/image";
import {
  formatPreflightIssue,
  hasBlockingIssue,
  preflightMarkdown,
} from "@/lib/publish/preflight";
import {
  clearStoredToken,
  getServerToken,
  getStoredToken,
  saveToken,
  subscribeToken,
} from "@/lib/publish/token-store";

interface FormFields {
  title: string;
  slug: string;
  description: string;
  date: string;
  categories: string;
  tags: string;
  draft: boolean;
}

interface Status {
  kind: "info" | "error" | "success";
  text: string;
  href?: string;
}

function splitList(value: string): string[] {
  return value
    .split(/[,，、]/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function toContentIssues(
  issues: readonly { path: PropertyKey[]; message: string }[],
): ContentIssue[] {
  return issues.map((issue) => ({
    code: "INVALID_FRONTMATTER" as const,
    severity: "error" as const,
    sourcePath: "前置检查",
    field:
      issue.path.length === 0 ? undefined : issue.path.map(String).join("."),
    message: issue.message,
  }));
}

function parseFields(fields: FormFields): {
  data: PostFrontmatter | null;
  issues: ContentIssue[];
} {
  const result = postFrontmatterSchema.safeParse({
    title: fields.title,
    slug: fields.slug,
    description: fields.description,
    date: fields.date,
    published: !fields.draft,
    draft: fields.draft,
    categories: splitList(fields.categories),
    tags: splitList(fields.tags),
  });

  if (result.success) return { data: result.data, issues: [] };
  return { data: null, issues: toContentIssues(result.error.issues) };
}

function fieldsFromPost(frontmatter: PostFrontmatter): FormFields {
  return {
    title: frontmatter.title,
    slug: frontmatter.slug,
    description: frontmatter.description,
    date: frontmatter.date,
    categories: frontmatter.categories.join(", "),
    tags: frontmatter.tags.join(", "),
    draft: frontmatter.draft,
  };
}

type PrepareOutcome =
  | { ok: true; prepared: PreparedPost; warnings: string[] }
  | { ok: false; issues: readonly ContentIssue[] };

function prepareFromText(
  text: string,
  filename: string,
  fallbackDate: string,
): PrepareOutcome {
  try {
    const prepared = preparePost(text, { filename, fallbackDate });
    return { ok: true, prepared, warnings: prepared.warnings };
  } catch (error) {
    if (!(error instanceof ContentValidationError)) throw error;

    // 中文文件名推不出 slug：退化成 post-<日期>，让用户在表单里改
    if (error.issues.some((issue) => issue.field === "slug")) {
      try {
        const prepared = preparePost(text, {
          filename: `post-${fallbackDate}.md`,
          fallbackDate,
        });
        return {
          ok: true,
          prepared,
          warnings: [
            ...prepared.warnings,
            "文件名无法生成 slug，已临时使用 post-<日期>，请确认或修改",
          ],
        };
      } catch (retryError) {
        if (!(retryError instanceof ContentValidationError)) throw retryError;
        return { ok: false, issues: retryError.issues };
      }
    }

    return { ok: false, issues: error.issues };
  }
}

interface ImageItem {
  id: number;
  file: File;
  plan: ImagePlan;
  status: "pending" | "uploading" | "done" | "error";
  message?: string;
}

export function PublishForm() {
  const token = useSyncExternalStore(
    subscribeToken,
    getStoredToken,
    getServerToken,
  );

  const [tokenInput, setTokenInput] = useState("");
  const [fileName, setFileName] = useState("");
  const [body, setBody] = useState("");
  const [fields, setFields] = useState<FormFields | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [needsOverwrite, setNeedsOverwrite] = useState(false);
  const [overwrite, setOverwrite] = useState(false);
  const [images, setImages] = useState<ImageItem[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [draggingImage, setDraggingImage] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const imageSeq = useRef(0);
  const titleId = useId();
  const slugId = useId();
  const descriptionId = useId();
  const dateId = useId();
  const categoriesId = useId();
  const tagsId = useId();
  const draftId = useId();
  const bodyId = useId();

  const preflight = useMemo(() => preflightMarkdown(body), [body]);
  const parsed = useMemo(
    () => (fields === null ? { data: null, issues: [] } : parseFields(fields)),
    [fields],
  );

  const hasBlocking =
    hasBlockingIssue(preflight.issues) || parsed.data === null;
  const canSubmit =
    !busy && token.length > 0 && body.length > 0 && !hasBlocking;

  async function loadFile(file: File): Promise<void> {
    if (!/\.(md|markdown)$/i.test(file.name)) {
      setStatus({ kind: "error", text: "只支持 .md / .markdown 文件" });
      return;
    }

    const text = await file.text();
    const fallbackDate = todayInOffset(siteConfig.timeZoneOffset);
    const outcome = prepareFromText(text, file.name, fallbackDate);

    if (!outcome.ok) {
      setFields(null);
      setStatus({
        kind: "error",
        text: `这个文件还不符合内容规范：${outcome.issues.map((issue) => formatContentIssue(issue)).join("；")}`,
      });
      return;
    }

    setFileName(file.name);
    setBody(outcome.prepared.body);
    setFields(fieldsFromPost(outcome.prepared.frontmatter));
    setWarnings(outcome.warnings);
    setStatus(null);
    setNeedsOverwrite(false);
    setOverwrite(false);
  }

  function addImages(files: FileList | File[]): void {
    if (fields === null || parsed.data === null) {
      setStatus({ kind: "error", text: "先载入文章：图片会按文章 slug 命名" });
      return;
    }

    const slug = parsed.data.slug;
    const added: ImageItem[] = [];
    const errors: string[] = [];

    for (const file of Array.from(files)) {
      const result = buildImagePlan(slug, file);
      if (!result.ok) {
        errors.push(result.error);
        continue;
      }
      imageSeq.current += 1;
      added.push({
        id: imageSeq.current,
        file,
        plan: result.plan,
        status: "pending",
      });
    }

    if (added.length > 0) setImages((prev) => [...prev, ...added]);

    if (errors.length > 0) {
      setStatus({ kind: "error", text: errors.join("；") });
    } else if (added.length > 0) {
      setStatus({
        kind: "info",
        text: `已加入 ${added.length} 张图片，点「上传图片」提交到仓库`,
      });
    }
  }

  async function uploadImages(): Promise<void> {
    if (token.length === 0) {
      setStatus({ kind: "error", text: "先填入并保存 GitHub Token" });
      return;
    }

    const pending = images.filter(
      (item) => item.status === "pending" || item.status === "error",
    );
    if (pending.length === 0) return;

    setUploadingImages(true);
    let uploaded = 0;

    for (const item of pending) {
      setImages((prev) =>
        prev.map((entry) =>
          entry.id === item.id ? { ...entry, status: "uploading" } : entry,
        ),
      );

      try {
        const bytes = new Uint8Array(await item.file.arrayBuffer());
        // 同名图片直接覆盖：替换素材/重新压缩是常态，不需要额外确认
        const remote = await getFile(token, PUBLISH_TARGET, item.plan.repoPath);
        await putBinaryFile(token, PUBLISH_TARGET, {
          path: item.plan.repoPath,
          base64: toBase64Bytes(bytes),
          message: `post(${parsed.data?.slug ?? "post"}): 上传图片 ${item.plan.repoFileName}`,
          sha: remote?.sha,
        });

        uploaded += 1;
        setImages((prev) =>
          prev.map((entry) =>
            entry.id === item.id
              ? {
                  ...entry,
                  status: "done",
                  message: formatBytes(item.file.size),
                }
              : entry,
          ),
        );
      } catch (error) {
        const message =
          error instanceof GithubError
            ? error.message
            : error instanceof Error
              ? error.message
              : String(error);
        setImages((prev) =>
          prev.map((entry) =>
            entry.id === item.id
              ? { ...entry, status: "error", message }
              : entry,
          ),
        );
      }
    }

    setUploadingImages(false);
    setStatus(
      uploaded > 0
        ? {
            kind: "success",
            text: `已上传 ${uploaded} 张图片，可以「插入正文」或复制引用`,
          }
        : { kind: "error", text: "图片上传失败，见下方每张图的提示" },
    );
  }

  async function copyText(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      setStatus({ kind: "info", text: "已复制到剪贴板" });
    } catch {
      setStatus({ kind: "error", text: "复制失败，请手动选中复制" });
    }
  }

  function insertImage(item: ImageItem): void {
    setBody((prev) => appendSnippet(prev, item.plan.snippet));
    setStatus({ kind: "info", text: "已追加到正文末尾，别忘了提交文章" });
  }

  async function handleSubmit(): Promise<void> {
    if (fields === null || parsed.data === null) {
      setStatus({ kind: "error", text: "先修正元信息里的问题" });
      return;
    }
    if (token.length === 0) {
      setStatus({ kind: "error", text: "先填入并保存 GitHub Token" });
      return;
    }
    if (hasBlockingIssue(preflight.issues)) {
      setStatus({
        kind: "error",
        text: "正文还有必须修正的问题（见上方红色条目）",
      });
      return;
    }

    const frontmatter = parsed.data;
    const path = `${PUBLISH_TARGET.postsDir}/${frontmatter.slug}.md`;
    const content = formatPostSource(frontmatter, body);

    setBusy(true);
    setStatus({ kind: "info", text: "正在提交到 GitHub…" });

    try {
      const remote = await getFile(token, PUBLISH_TARGET, path);

      if (remote !== null && !overwrite) {
        setNeedsOverwrite(true);
        setStatus({
          kind: "info",
          text: `仓库里已经有 ${path}。确认要覆盖请勾选下方选项后重新提交。`,
        });
        return;
      }

      const result = await putFile(token, PUBLISH_TARGET, {
        path,
        content,
        sha: remote?.sha,
        message:
          remote === null
            ? `post(${frontmatter.slug}): 添加《${frontmatter.title}》`
            : `post(${frontmatter.slug}): 更新《${frontmatter.title}》`,
      });

      setNeedsOverwrite(false);
      setStatus({
        kind: "success",
        text: `${remote === null ? "已提交" : "已更新"}。GitHub 会自动构建部署，通常 1~3 分钟后上线。`,
        href: result.commitUrl,
      });
    } catch (error) {
      setStatus({
        kind: "error",
        text:
          error instanceof GithubError
            ? error.message
            : `提交失败：${error instanceof Error ? error.message : String(error)}`,
      });
    } finally {
      setBusy(false);
    }
  }

  const statusColor =
    status === null
      ? ""
      : status.kind === "error"
        ? "text-red-600"
        : status.kind === "success"
          ? "text-emerald-700"
          : "text-muted";

  return (
    <div className="flex flex-col gap-6">
      <section className="glass-card px-5 py-5">
        <h2 className="text-sm font-semibold">1. GitHub Token</h2>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          需要 fine-grained token：只选 <code>{PUBLISH_TARGET.repo}</code>
          ，权限只给 Contents: Read and write。 token 只存本浏览器的
          localStorage，不上传、不进仓库。
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            type="password"
            value={tokenInput}
            onChange={(event) => setTokenInput(event.target.value)}
            placeholder={
              token.length > 0
                ? "已保存（粘贴新 token 可覆盖）"
                : "github_pat_…"
            }
            autoComplete="off"
            spellCheck={false}
            aria-label="GitHub Token"
            className="min-w-0 flex-1 rounded-control border border-border bg-surface px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
          />
          <button
            type="button"
            onClick={() => {
              saveToken(tokenInput);
              setTokenInput("");
              setStatus({ kind: "info", text: "token 已保存到本浏览器" });
            }}
            disabled={tokenInput.trim().length === 0}
            className="rounded-control bg-accent-strong px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            保存
          </button>
          <button
            type="button"
            onClick={() => {
              clearStoredToken();
              setTokenInput("");
              setStatus({ kind: "info", text: "已清除本浏览器保存的 token" });
            }}
            disabled={token.length === 0}
            className="rounded-control border border-border px-3 py-2 text-sm text-muted transition-colors hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            清除
          </button>
        </div>
        <p className="mt-2 text-xs text-muted">
          {token.length > 0 ? "状态：已保存" : "状态：未设置"}
        </p>
      </section>

      <section className="glass-card px-5 py-5">
        <h2 className="text-sm font-semibold">2. 选择 Markdown 文件</h2>
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            const file = event.dataTransfer.files[0];
            if (file !== null) void loadFile(file);
          }}
          className={`mt-3 rounded-control border border-dashed px-4 py-8 text-center transition-colors ${
            dragging ? "border-accent bg-surface" : "border-border"
          }`}
        >
          <p className="text-sm text-muted">
            {fileName === "" ? "把 .md 文件拖到这里" : `已载入：${fileName}`}
          </p>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="mt-3 rounded-control border border-border px-3 py-1.5 text-sm text-muted transition-colors hover:text-accent"
          >
            选择文件
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".md,.markdown,text/markdown"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file !== undefined && file !== null) void loadFile(file);
              event.target.value = "";
            }}
          />
        </div>
        {warnings.length === 0 ? null : (
          <ul className="mt-3 flex flex-col gap-1 text-xs text-muted">
            {warnings.map((warning) => (
              <li key={warning}>· {warning}</li>
            ))}
          </ul>
        )}
      </section>

      <section className="glass-card px-5 py-5">
        <h2 className="text-sm font-semibold">3. 文章信息</h2>
        {fields === null ? (
          <p className="mt-2 text-xs text-muted">
            载入文件后会自动填好，可在此修改。
          </p>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label
                htmlFor={titleId}
                className="text-xs font-medium text-muted"
              >
                标题
              </label>
              <input
                id={titleId}
                value={fields.title}
                onChange={(event) =>
                  setFields({ ...fields, title: event.target.value })
                }
                className="mt-1 w-full rounded-control border border-border bg-surface px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
              />
            </div>
            <div>
              <label
                htmlFor={slugId}
                className="text-xs font-medium text-muted"
              >
                slug（URL 段）
              </label>
              <input
                id={slugId}
                value={fields.slug}
                onChange={(event) =>
                  setFields({ ...fields, slug: event.target.value })
                }
                className="mt-1 w-full rounded-control border border-border bg-surface px-3 py-2 font-mono text-sm focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
              />
            </div>
            <div>
              <label
                htmlFor={dateId}
                className="text-xs font-medium text-muted"
              >
                日期
              </label>
              <input
                id={dateId}
                type="date"
                value={fields.date}
                onChange={(event) =>
                  setFields({ ...fields, date: event.target.value })
                }
                className="mt-1 w-full rounded-control border border-border bg-surface px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
              />
            </div>
            <div className="sm:col-span-2">
              <label
                htmlFor={descriptionId}
                className="text-xs font-medium text-muted"
              >
                摘要（最多 200 字）
              </label>
              <textarea
                id={descriptionId}
                value={fields.description}
                rows={2}
                onChange={(event) =>
                  setFields({ ...fields, description: event.target.value })
                }
                className="mt-1 w-full rounded-control border border-border bg-surface px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
              />
            </div>
            <div>
              <label
                htmlFor={categoriesId}
                className="text-xs font-medium text-muted"
              >
                分类（逗号分隔，最多 5 个）
              </label>
              <input
                id={categoriesId}
                value={fields.categories}
                onChange={(event) =>
                  setFields({ ...fields, categories: event.target.value })
                }
                className="mt-1 w-full rounded-control border border-border bg-surface px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
              />
            </div>
            <div>
              <label
                htmlFor={tagsId}
                className="text-xs font-medium text-muted"
              >
                标签（逗号分隔，最多 20 个）
              </label>
              <input
                id={tagsId}
                value={fields.tags}
                onChange={(event) =>
                  setFields({ ...fields, tags: event.target.value })
                }
                className="mt-1 w-full rounded-control border border-border bg-surface px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
              />
            </div>
            <div className="flex items-center gap-2 sm:col-span-2">
              <input
                id={draftId}
                type="checkbox"
                checked={fields.draft}
                onChange={(event) =>
                  setFields({ ...fields, draft: event.target.checked })
                }
                className="size-4 accent-[var(--color-accent)]"
              />
              <label htmlFor={draftId} className="text-xs text-muted">
                存为草稿（不会出现在线上页面、RSS 与 sitemap）
              </label>
            </div>
          </div>
        )}

        {parsed.issues.length === 0 ? null : (
          <ul className="mt-3 flex flex-col gap-1 text-xs text-red-600">
            {parsed.issues.map((issue) => (
              <li key={`${issue.field ?? ""}-${issue.message}`}>
                · {formatContentIssue(issue)}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="glass-card px-5 py-5">
        <h2 className="text-sm font-semibold">4. 正文与图片</h2>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          图片会提交到 <code>public/images/posts/</code>，文件名自动带文章 slug
          前缀； 单张上限 {MAX_IMAGE_LABEL}，同名图片直接覆盖。
        </p>

        {fields === null ? (
          <p className="mt-2 text-xs text-muted">
            载入文章后可编辑正文并上传图片。
          </p>
        ) : (
          <>
            <label
              htmlFor={bodyId}
              className="mt-4 block text-xs font-medium text-muted"
            >
              正文（Markdown）
            </label>
            <textarea
              id={bodyId}
              value={body}
              rows={12}
              spellCheck={false}
              onChange={(event) => setBody(event.target.value)}
              className="mt-1 w-full rounded-control border border-border bg-surface px-3 py-2 font-mono text-xs leading-relaxed focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
            />

            <div
              onDragOver={(event) => {
                event.preventDefault();
                setDraggingImage(true);
              }}
              onDragLeave={() => setDraggingImage(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDraggingImage(false);
                if (event.dataTransfer.files.length > 0)
                  addImages(event.dataTransfer.files);
              }}
              className={`mt-4 rounded-control border border-dashed px-4 py-6 text-center transition-colors ${
                draggingImage ? "border-accent bg-surface" : "border-border"
              }`}
            >
              <p className="text-xs text-muted">把图片拖到这里，或</p>
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                className="mt-2 rounded-control border border-border px-3 py-1.5 text-xs text-muted transition-colors hover:text-accent"
              >
                选择图片
              </button>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(event) => {
                  if (
                    event.target.files !== null &&
                    event.target.files.length > 0
                  ) {
                    addImages(event.target.files);
                  }
                  event.target.value = "";
                }}
              />
            </div>

            {images.length === 0 ? null : (
              <>
                <ul className="mt-4 flex flex-col gap-2">
                  {images.map((item) => (
                    <li
                      key={item.id}
                      className="rounded-control border border-border px-3 py-2 text-xs"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-mono break-all">
                          {item.plan.repoFileName}
                        </span>
                        <span className="text-muted">
                          {formatBytes(item.file.size)}
                        </span>
                      </div>
                      <code className="mt-1 block break-all text-muted">
                        {item.plan.snippet}
                      </code>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => void copyText(item.plan.snippet)}
                          className="rounded-control border border-border px-2 py-1 text-muted transition-colors hover:text-accent"
                        >
                          复制引用
                        </button>
                        <button
                          type="button"
                          onClick={() => insertImage(item)}
                          className="rounded-control border border-border px-2 py-1 text-muted transition-colors hover:text-accent"
                        >
                          插入正文
                        </button>
                        <span
                          className={
                            item.status === "error"
                              ? "text-red-600"
                              : item.status === "done"
                                ? "text-emerald-700"
                                : "text-muted"
                          }
                        >
                          {item.status === "uploading"
                            ? "上传中…"
                            : item.status === "done"
                              ? `已上传（${item.message ?? ""}）`
                              : item.status === "error"
                                ? `失败：${item.message ?? ""}`
                                : "待上传"}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>

                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => void uploadImages()}
                    disabled={uploadingImages || token.length === 0}
                    className="rounded-control bg-accent-strong px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {uploadingImages ? "上传中…" : "上传图片"}
                  </button>
                  {token.length === 0 ? (
                    <span className="text-xs text-muted">
                      需要先保存 token 才能上传图片
                    </span>
                  ) : null}
                </div>
              </>
            )}
          </>
        )}
      </section>

      <section className="glass-card px-5 py-5">
        <h2 className="text-sm font-semibold">5. 正文检查</h2>
        <p className="mt-1 text-xs text-muted">
          {preflight.stats.characters} 字 · {preflight.stats.headings} 个标题 ·{" "}
          {preflight.stats.images} 张图片 · {preflight.stats.links} 个链接 ·{" "}
          {preflight.stats.codeBlocks} 个代码块
        </p>
        {preflight.issues.length === 0 ? (
          <p className="mt-2 text-xs text-emerald-700">
            没有发现明显问题（构建时会再跑一次完整检查）。
          </p>
        ) : (
          <ul className="mt-2 flex flex-col gap-1 text-xs">
            {preflight.issues.map((issue) => (
              <li
                key={`${issue.line ?? 0}-${issue.message}`}
                className={
                  issue.severity === "error" ? "text-red-600" : "text-amber-700"
                }
              >
                · {formatPreflightIssue(issue)}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="glass-card px-5 py-5">
        <h2 className="text-sm font-semibold">6. 提交</h2>
        {needsOverwrite ? (
          <label className="mt-3 flex items-center gap-2 text-xs text-muted">
            <input
              type="checkbox"
              checked={overwrite}
              onChange={(event) => setOverwrite(event.target.checked)}
              className="size-4 accent-[var(--color-accent)]"
            />
            覆盖仓库里的同名文章
          </label>
        ) : null}
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={!canSubmit}
          className="mt-3 rounded-control bg-accent-strong px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "提交中…" : "提交到仓库"}
        </button>
        <p aria-live="polite" className={`mt-3 text-xs ${statusColor}`}>
          {status?.text ?? ""}
          {status?.href === undefined || status.href === "" ? null : (
            <>
              {" "}
              <a
                href={status.href}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                查看提交记录
              </a>
            </>
          )}
        </p>
        {fields === null || parsed.data === null ? null : (
          <p className="mt-1 text-xs text-muted">
            上线地址（约 1~3 分钟后可用）：
            <code className="ml-1">
              {siteConfig.url}/posts/{parsed.data.slug}
            </code>
          </p>
        )}
      </section>
    </div>
  );
}

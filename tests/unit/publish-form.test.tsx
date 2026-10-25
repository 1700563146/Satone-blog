// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PublishForm } from "@/components/publish/publish-form";
import { toBase64Utf8 } from "@/lib/publish/github";
import { TOKEN_STORAGE_KEY } from "@/lib/publish/token-store";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

const PLAIN_MARKDOWN = [
  "# 我的文章",
  "",
  "第一段摘要。",
  "",
  "## 小节",
  "",
  "正文内容。",
].join("\n");

function sha256Like(name: string): File {
  return new File([PLAIN_MARKDOWN], name, { type: "text/markdown" });
}

function getFileInput(container: HTMLElement): HTMLInputElement {
  const input = container.querySelector('input[type="file"]');
  if (input === null) throw new Error("找不到文件输入框");
  return input as HTMLInputElement;
}

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: `status ${status}`,
    json: async () => body,
  } as unknown as Response;
}

function stubFetch(responses: Response[]): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn();
  for (const response of responses) fetchMock.mockResolvedValueOnce(response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

async function uploadMarkdown(
  container: HTMLElement,
  fileName = "my-post.md",
): Promise<void> {
  const user = userEvent.setup();
  await user.upload(getFileInput(container), sha256Like(fileName));
}

describe("PublishForm", () => {
  it("初始状态不能提交", () => {
    render(<PublishForm />);

    expect(screen.getByRole("button", { name: "提交到仓库" })).toBeDisabled();
    expect(screen.getByText("状态：未设置")).toBeInTheDocument();
  });

  it("载入 md 后自动填好标题、slug、日期与统计", async () => {
    const { container } = render(<PublishForm />);

    await uploadMarkdown(container, "my-post.md");

    expect(await screen.findByLabelText("标题")).toHaveValue("我的文章");
    expect(screen.getByLabelText(/slug/)).toHaveValue("my-post");
    expect((screen.getByLabelText("日期") as HTMLInputElement).value).toMatch(
      /^\d{4}-\d{2}-\d{2}$/,
    );
    expect(screen.getByLabelText(/摘要/)).toHaveValue("第一段摘要。");
    expect(screen.getByText(/字 · \d+ 个标题/)).toBeInTheDocument();
  });

  it("中文文件名推不出 slug 时回退为 post-日期并提示", async () => {
    const { container } = render(<PublishForm />);

    await uploadMarkdown(container, "我的文章.md");

    const slugInput = (await screen.findByLabelText(
      /slug/,
    )) as HTMLInputElement;
    expect(slugInput.value).toMatch(/^post-\d{4}-\d{2}-\d{2}$/);
    expect(screen.getByText(/文件名无法生成 slug/)).toBeInTheDocument();
  });

  it("正文有危险链接时阻止提交并列出问题", async () => {
    const { container } = render(<PublishForm />);
    window.localStorage.setItem(TOKEN_STORAGE_KEY, "token");

    const file = new File(
      ["# 危险\n\n[点我](javascript:alert(1))\n"],
      "danger.md",
      { type: "text/markdown" },
    );
    const user = userEvent.setup();
    await user.upload(getFileInput(container), file);

    expect(await screen.findByText(/链接地址不安全/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "提交到仓库" })).toBeDisabled();
  });

  it("保存 token 后显示已保存并写入 localStorage", async () => {
    render(<PublishForm />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("GitHub Token"), "ghp_test");
    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(window.localStorage.getItem(TOKEN_STORAGE_KEY)).toBe("ghp_test");
    expect(screen.getByText("状态：已保存")).toBeInTheDocument();
  });

  it("提交成功：先查文件（404）再 PUT，展示提交链接", async () => {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, "ghp_test");
    const fetchMock = stubFetch([
      jsonResponse({ message: "Not Found" }, 404),
      jsonResponse({
        commit: { html_url: "https://github.com/o/r/commit/abc", sha: "abc" },
      }),
    ]);

    const { container } = render(<PublishForm />);
    await uploadMarkdown(container);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "提交到仓库" }));

    await waitFor(() =>
      expect(
        screen.getByText(/已提交。GitHub 会自动构建部署/),
      ).toBeInTheDocument(),
    );
    expect(screen.getByRole("link", { name: "查看提交记录" })).toHaveAttribute(
      "href",
      "https://github.com/o/r/commit/abc",
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [putUrl, putInit] = fetchMock.mock.calls[1] as [
      string,
      { method: string; body: string },
    ];
    expect(putInit.method).toBe("PUT");
    expect(putUrl.endsWith("/contents/content/posts/my-post.md")).toBe(true);

    const body = JSON.parse(putInit.body) as {
      content: string;
      message: string;
      sha?: string;
    };
    expect(body.sha).toBeUndefined();
    expect(body.message).toBe("post(my-post): 添加《我的文章》");
  });

  it("同名文件已存在时要求确认覆盖，勾选后带上 sha 更新", async () => {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, "ghp_test");
    const fetchMock = stubFetch([
      jsonResponse({ sha: "old-sha", content: toBase64Utf8("old") }),
      jsonResponse({ sha: "old-sha", content: toBase64Utf8("old") }),
      jsonResponse({
        commit: { html_url: "https://github.com/o/r/commit/def", sha: "def" },
      }),
    ]);

    const { container } = render(<PublishForm />);
    await uploadMarkdown(container);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "提交到仓库" }));
    expect(await screen.findByText(/仓库里已经有/)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await user.click(screen.getByLabelText(/覆盖仓库里的同名文章/));
    await user.click(screen.getByRole("button", { name: "提交到仓库" }));

    await waitFor(() =>
      expect(
        screen.getByText(/已更新。GitHub 会自动构建部署/),
      ).toBeInTheDocument(),
    );
    const [, putInit] = fetchMock.mock.calls[2] as [string, { body: string }];
    expect((JSON.parse(putInit.body) as { sha?: string }).sha).toBe("old-sha");
  });

  it("上传图片：先查是否存在，再 PUT 到 public/images/posts", async () => {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, "ghp_test");
    const fetchMock = stubFetch([
      jsonResponse({ message: "Not Found" }, 404),
      jsonResponse({
        commit: { html_url: "https://github.com/o/r/commit/img", sha: "img" },
      }),
    ]);

    const { container } = render(<PublishForm />);
    await uploadMarkdown(container);
    const user = userEvent.setup();

    const png = new File(
      [new Uint8Array([0x89, 0x50, 0x4e, 0x47])],
      "Cover.PNG",
      {
        type: "image/png",
      },
    );
    const imageInput = container.querySelectorAll(
      'input[type="file"]',
    )[1] as HTMLInputElement;
    await user.upload(imageInput, png);

    // 文件名带文章 slug 前缀（my-post）；文件名与片段里都会出现，取第一个即可
    expect(
      (await screen.findAllByText(/my-post-cover\.png/)).length,
    ).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: "上传图片" }));

    await waitFor(() =>
      expect(screen.getByText(/已上传（/)).toBeInTheDocument(),
    );

    const [putUrl, putInit] = fetchMock.mock.calls[1] as [
      string,
      { method: string; body: string },
    ];
    expect(putInit.method).toBe("PUT");
    expect(
      putUrl.endsWith("/contents/public/images/posts/my-post-cover.png"),
    ).toBe(true);

    const body = JSON.parse(putInit.body) as {
      content: string;
      message: string;
    };
    expect(body.message).toContain("上传图片");
    expect(atob(body.content)).toBe(
      String.fromCharCode(0x89, 0x50, 0x4e, 0x47),
    );
  });

  it("插入正文：图片片段追加到 Markdown 末尾", async () => {
    const { container } = render(<PublishForm />);
    await uploadMarkdown(container);
    const user = userEvent.setup();

    const png = new File([new Uint8Array([1, 2, 3])], "shot.png", {
      type: "image/png",
    });
    const imageInput = container.querySelectorAll(
      'input[type="file"]',
    )[1] as HTMLInputElement;
    await user.upload(imageInput, png);

    await user.click(screen.getByRole("button", { name: "插入正文" }));

    const textarea = screen.getByLabelText(
      "正文（Markdown）",
    ) as HTMLTextAreaElement;
    expect(textarea.value).toContain("![shot](/images/posts/my-post-shot.png)");
    expect(textarea.value.startsWith("第一段摘要。")).toBe(true);
  });

  it("不支持的图片格式给出错误并且不入列表", async () => {
    const { container } = render(<PublishForm />);
    await uploadMarkdown(container);
    const user = userEvent.setup();

    // bmp 能满足 accept="image/*"，但不在我们的扩展名白名单里
    const bmp = new File([new Uint8Array([1])], "photo.bmp", {
      type: "image/bmp",
    });
    const imageInput = container.querySelectorAll(
      'input[type="file"]',
    )[1] as HTMLInputElement;
    await user.upload(imageInput, bmp);

    expect(await screen.findByText(/不支持的图片类型/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "上传图片" })).toBeNull();
  });
});

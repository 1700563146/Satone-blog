import { afterEach, describe, expect, it, vi } from "vitest";

import { PUBLISH_TARGET } from "@/lib/publish/config";
import {
  fromBase64Utf8,
  getFile,
  GithubError,
  listFiles,
  putBinaryFile,
  putFile,
  toBase64Utf8,
} from "@/lib/publish/github";

function mockResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: `status ${status}`,
    json: async () => body,
  } as unknown as Response;
}

function stubFetch(response: Response): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn(async () => response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const target = PUBLISH_TARGET;

describe("base64 编解码", () => {
  it("中文内容往返回一致", () => {
    const text = "# 标题\n\n正文 with ASCII.\n";

    expect(fromBase64Utf8(toBase64Utf8(text))).toBe(text);
  });

  it("能解码带换行的 base64（GitHub 返回的格式）", () => {
    const encoded = toBase64Utf8("你好");

    expect(fromBase64Utf8(`${encoded.slice(0, 2)}\n${encoded.slice(2)}`)).toBe(
      "你好",
    );
  });
});

describe("getFile", () => {
  it("404 返回 null", async () => {
    stubFetch(mockResponse({ message: "Not Found" }, 404));

    await expect(
      getFile("t", target, "content/posts/x.md"),
    ).resolves.toBeNull();
  });

  it("返回解码后的内容与 sha", async () => {
    stubFetch(
      mockResponse({
        sha: "abc123",
        content: toBase64Utf8("# 你好\n"),
        encoding: "base64",
      }),
    );

    await expect(getFile("t", target, "content/posts/x.md")).resolves.toEqual({
      sha: "abc123",
      content: "# 你好\n",
    });
  });

  it("其他状态码抛出 GithubError（带 API 的 message）", async () => {
    stubFetch(mockResponse({ message: "Bad credentials" }, 401));

    await expect(
      getFile("t", target, "content/posts/x.md"),
    ).rejects.toBeInstanceOf(GithubError);
    await expect(getFile("t", target, "content/posts/x.md")).rejects.toThrow(
      "Bad credentials",
    );
  });

  it("请求带上分支与鉴权头", async () => {
    const fetchMock = stubFetch(mockResponse({ sha: "s", content: "" }));

    await getFile("token-123", target, "content/posts/x.md");

    const [url, init] = fetchMock.mock.calls[0] as [
      string,
      { headers: Record<string, string> },
    ];
    expect(url).toContain(
      `/repos/${target.owner}/${target.repo}/contents/content/posts/x.md`,
    );
    expect(url).toContain(`ref=${encodeURIComponent(target.branch)}`);
    expect(init.headers.Authorization).toBe("Bearer token-123");
  });
});

describe("listFiles", () => {
  it("只返回文件，不含目录", async () => {
    stubFetch(
      mockResponse([
        { name: "a.md", type: "file" },
        { name: "sub", type: "dir" },
        { name: "b.md", type: "file" },
      ]),
    );

    await expect(listFiles("t", target, "content/posts")).resolves.toEqual([
      "a.md",
      "b.md",
    ]);
  });

  it("目录不存在返回空数组", async () => {
    stubFetch(mockResponse({ message: "Not Found" }, 404));

    await expect(listFiles("t", target, "content/posts")).resolves.toEqual([]);
  });
});

describe("putFile", () => {
  it("创建文件：不带 sha，内容 base64 编码，返回 commit 链接", async () => {
    const fetchMock = stubFetch(
      mockResponse({
        commit: { html_url: "https://github.com/x/y/commit/abc", sha: "abc" },
      }),
    );

    const result = await putFile("t", target, {
      path: "content/posts/x.md",
      content: "# 你好\n",
      message: "post(x): 添加",
    });

    expect(result).toEqual({
      commitUrl: "https://github.com/x/y/commit/abc",
      commitSha: "abc",
    });

    const [url, init] = fetchMock.mock.calls[0] as [
      string,
      { method: string; body: string },
    ];
    expect(url.endsWith("/contents/content/posts/x.md")).toBe(true);
    expect(init.method).toBe("PUT");

    const body = JSON.parse(init.body) as {
      content: string;
      sha?: string;
      branch: string;
      message: string;
    };
    expect(fromBase64Utf8(body.content)).toBe("# 你好\n");
    expect(body.sha).toBeUndefined();
    expect(body.branch).toBe(target.branch);
    expect(body.message).toBe("post(x): 添加");
  });

  it("更新文件：带上 sha", async () => {
    const fetchMock = stubFetch(
      mockResponse({ commit: { html_url: "u", sha: "s" } }),
    );

    await putFile("t", target, {
      path: "content/posts/x.md",
      content: "new",
      message: "post(x): 更新",
      sha: "old-sha",
    });

    const [, init] = fetchMock.mock.calls[0] as [string, { body: string }];
    expect((JSON.parse(init.body) as { sha?: string }).sha).toBe("old-sha");
  });

  it("失败时抛出 GithubError", async () => {
    stubFetch(
      mockResponse(
        { message: "Resource not accessible by personal access token" },
        403,
      ),
    );

    await expect(
      putFile("t", target, {
        path: "content/posts/x.md",
        content: "c",
        message: "m",
      }),
    ).rejects.toThrow("Resource not accessible");
  });
});

describe("mock 调用形态", () => {
  it("fetch 收到的是绝对 https 地址", async () => {
    const fetchMock = stubFetch(mockResponse({ sha: "s", content: "" }));

    await getFile("t", target, "content/posts/x.md");

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url.startsWith("https://api.github.com/repos/")).toBe(true);
  });
});

describe("putBinaryFile", () => {
  it("按 base64 原样提交二进制内容，并在更新时带 sha", async () => {
    const fetchMock = stubFetch(
      mockResponse({ commit: { html_url: "u", sha: "s" } }),
    );

    const result = await putBinaryFile("t", target, {
      path: "public/images/posts/hello-cover.png",
      base64: "iVBORw0KGgo=",
      message: "post(hello): 上传图片",
      sha: "old-sha",
    });

    expect(result).toEqual({ commitUrl: "u", commitSha: "s" });

    const [url, init] = fetchMock.mock.calls[0] as [
      string,
      { method: string; body: string },
    ];
    expect(init.method).toBe("PUT");
    expect(url.endsWith("/contents/public/images/posts/hello-cover.png")).toBe(
      true,
    );

    const body = JSON.parse(init.body) as { content: string; sha?: string };
    expect(body.content).toBe("iVBORw0KGgo=");
    expect(body.sha).toBe("old-sha");
  });
});

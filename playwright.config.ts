import { defineConfig, devices } from "@playwright/test";

/**
 * 端到端测试用的固定端口，避免和本地开发服务器（3000）冲突。
 */
const PORT = 34901;
const baseURL = `http://127.0.0.1:${PORT}`;

/**
 * 浏览器通道覆盖。
 *
 * 默认用 Playwright 自带的 Chromium（需先 `npx playwright install chromium`，
 * CI 里由 workflow 安装）。如果所在网络下不到浏览器二进制，可以临时借用本机
 * 已安装的浏览器：
 *
 * ```bash
 * PLAYWRIGHT_CHANNEL=msedge npm run test:e2e   # Windows 上 Edge 通常已安装
 * ```
 */
const channel = process.env.PLAYWRIGHT_CHANNEL;

/**
 * Playwright 配置。
 *
 * 跑之前需要已有生产构建：`npm run build && npm run test:e2e`。
 * `webServer` 只负责启动 `next start`，不会重复构建（CI 里构建是独立的一步）。
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
    ...(channel === undefined ? {} : { channel }),
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile",
      use: { ...devices["Pixel 7"] },
    },
  ],
  webServer: {
    command: `npm run start -- -p ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});

import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    // 纯逻辑测试与组件测试放在一起；组件测试文件顶部用
    // `// @vitest-environment jsdom` 指定环境，其余默认 node。
    include: ["tests/unit/**/*.test.{ts,tsx}"],
    setupFiles: ["tests/setup.tsx"],
  },
});

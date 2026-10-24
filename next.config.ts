import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 纯静态导出：构建产物是 out/ 下的静态文件，运行时不依赖 Node（见 ADR-027）。
  // 因此不再启用 Cache Components / PPR，也不能部署到需要 Node 运行时的平台。
  output: "export",
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

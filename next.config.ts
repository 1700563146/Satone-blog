import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // 文章与独立页面通过 fs 读取；显式声明需要进入部署产物的内容文件
  outputFileTracingIncludes: {
    "/**": ["./content/posts/**/*.md", "./content/pages/**/*.md"],
  },
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

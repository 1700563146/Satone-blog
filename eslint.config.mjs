import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "coverage/**",
  ]),
  // 页面与组件只能通过带缓存的访问层读取内容，避免绕过草稿隔离
  {
    files: ["src/app/**/*.{ts,tsx}", "src/components/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@/lib/content/read-posts",
                "@/lib/content/parse-frontmatter",
                "**/lib/content/read-posts",
                "**/lib/content/parse-frontmatter",
              ],
              message:
                "页面与组件请通过 @/lib/content 访问内容；直接读写文件会绕过缓存与草稿隔离。",
            },
          ],
        },
      ],
    },
  },
  // 必须放在最后：关闭与 Prettier 冲突的格式规则
  prettier,
]);

export default eslintConfig;

---
title: "DSH 插件工作区"
slug: "readme"
description: "D:\\Code 下的 DSH 插件相关目录都收在这里，根目录只留一个兼容链接。"
date: "2026-10-25"
published: true
draft: false
categories: []
tags: []
featured: false
---

`D:\Code` 下的 DSH 插件相关目录都收在这里，根目录只留一个兼容链接。

| 目录 | 是什么 | 远端 / 发布 |
|---|---|---|
| `rightbar-divider/` | 右栏分割线修复插件（当前开发目录） | https://github.com/1700563146/dsh-plugin-rightbar-divider · npm `dsh-plugin-rightbar-divider` |
| `ui-zoom/` | 整界面缩放插件源码克隆 | https://github.com/1700563146/dsh-plugin-ui-zoom · npm `dsh-plugin-ui-zoom` |
| `starter/` | DSH 官方插件起步工程（hello-badge / ui-zoom 示例） | 本地 |
| `market-submissions/` | 提交到 `awesome-dsh-plugin` 的市场条目 YAML | PR 用 |
| `market-fork/` | `awesome-dsh-plugin` 个人 fork 的 partial clone（blobless，用于推 PR 分支） | https://github.com/1700563146/awesome-dsh-plugin |

## 根目录的 `rightbar-divider`

它现在是一个 **junction**，指向 `dsh-plugins\rightbar-divider`。原因是 profile 里还装着本地开发版：

```
C:\Users\17005\.dsh\profiles\desktop\package.json
  "@local/rightbar-divider": "link:D:/Code/rightbar-divider"
```

保留这个 junction，现有安装就不会因为搬家而断。等你在 **插件** 页卸载 `@local/rightbar-divider`、改装 npm 上的 `dsh-plugin-rightbar-divider` 之后，就可以删掉它：

```powershell
Remove-Item D:\Code\rightbar-divider -Force
```

另外，插件源码的包名已经从 `@local/rightbar-divider` 改成发布名 `dsh-plugin-rightbar-divider`，所以 profile 的 `node_modules` 里补了一个同名别名：

```
C:\Users\17005\.dsh\profiles\desktop\node_modules\dsh-plugin-rightbar-divider
  -> D:\Code\dsh-plugins\rightbar-divider
```

这样 profile 里旧的 bundle `@local/rightbar-divider` 所插入的行（行名现在是 `dsh-plugin-rightbar-divider`）在重启后仍然能解析。切到 npm 版时先删这个别名，再让插件管理器安装，避免它和 pnpm 创建的目录冲突。

## 切到 npm 版的顺序

1. **插件** 页卸载 `@local/rightbar-divider`。
2. 删除 profile 里的两个链接（只删链接，不删源码）：

   ```powershell
   Remove-Item C:\Users\17005\.dsh\profiles\desktop\node_modules\@local\rightbar-divider -Force
   Remove-Item C:\Users\17005\.dsh\profiles\desktop\node_modules\dsh-plugin-rightbar-divider -Force
   ```

3. **插件 → 添加插件** 安装 `dsh-plugin-rightbar-divider`。
4. 删除根目录兼容链接：

   ```powershell
   Remove-Item D:\Code\rightbar-divider -Force
   ```

## 常用命令

```powershell
# rightbar-divider 自检
cd D:\Code\dsh-plugins\rightbar-divider
node test.mjs
npm pack --dry-run

# ui-zoom 自检
cd D:\Code\dsh-plugins\ui-zoom
node test.mjs

# 市场 fork（partial clone，首次取文件时会按需拉 blob）
cd D:\Code\dsh-plugins\market-fork
git fetch origin main
```

## Git 远端备注

沙箱里 Git 自带的 `ssh.exe` 会报 `NtCreateDirectoryObject`，推拉时用 Windows OpenSSH：

```powershell
$env:GIT_SSH="C:\Windows\System32\OpenSSH\ssh.exe"
```

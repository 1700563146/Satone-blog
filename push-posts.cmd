@echo off
rem 双击即可：把 src/content/posts 下的文章与图片提交并推送。
rem 想带参数就在命令行里跑，例如 push-posts.cmd --dry-run
chcp 65001 >nul
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
	echo [x] 找不到 node。
	echo     装 Node.js 22+ 并确认它在 PATH 里，然后再双击。
	pause
	exit /b 1
)

node scripts\push-post.mjs %*
if errorlevel 1 (
	echo.
	echo [x] 没推成功，看上面的提示。
	echo     常见原因：暂存区里有别的文件 / 钩子拦下敏感文件 / 远端有新提交。
) else (
	echo.
	echo [ok] 完成。5~7 分钟后线上更新。
)

echo.
pause

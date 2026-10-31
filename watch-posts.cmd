@echo off
rem 双击即可：开始监听 src/content/posts，文件停止变化 30 秒后自动提交推送。
rem 想改等待时间：watch-posts.cmd --quiet 10
chcp 65001 >nul
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
	echo [x] 找不到 node。
	echo     装 Node.js 22+ 并确认它在 PATH 里，然后再双击。
	pause
	exit /b 1
)

rem 没显式给 --quiet 时用 30 秒（写文章时不容易被每次停顿触发）
set "ARGS=%*"
echo %ARGS% | findstr /c:"--quiet" >nul || set "ARGS=--quiet 30 %ARGS%"

echo 监听中：把 .md 拖进 src\content\posts\、图片拖进 src\content\posts\images\
echo 停止：直接关掉这个窗口，或按 Ctrl+C
echo.

node scripts\watch-post.mjs %ARGS%

echo.
echo 监听已停止。
pause

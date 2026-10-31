@echo off
rem 双击切换「开机自动监听」：
rem   第一次双击 = 加进启动项（登录 Windows 后自动最小化开始监听）
rem   再双击一次  = 取消
chcp 65001 >nul
cd /d "%~dp0"

set "LNK=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\SatoBlog-post-watch.lnk"
set "MODE=install"
if exist "%LNK%" set "MODE=uninstall"

if "%MODE%"=="uninstall" del "%LNK%"
if "%MODE%"=="uninstall" if exist "%LNK%" echo [x] 删除启动项失败：%LNK%
if "%MODE%"=="uninstall" if not exist "%LNK%" echo [ok] 已取消开机自启。

if "%MODE%"=="install" powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws=New-Object -ComObject WScript.Shell; $s=$ws.CreateShortcut('%LNK%'); $s.TargetPath='%~dp0watch-posts.cmd'; $s.WorkingDirectory='%~dp0'; $s.WindowStyle=7; $s.Description='Sato Blog post watch'; $s.Save()"
if "%MODE%"=="install" if exist "%LNK%" echo [ok] 已加入开机启动。再双击本文件可取消。
if "%MODE%"=="install" if not exist "%LNK%" echo [x] 创建启动项失败，可手动放进 shell:startup。

echo.
pause

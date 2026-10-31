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

rem 监听脚本允许叫这两个名字，谁在就用谁（改过名也不会指向空文件）
set "WATCHER=%~dp0监听推送.cmd"
if not exist "%WATCHER%" set "WATCHER=%~dp0watch-posts.cmd"

if "%MODE%"=="install" if not exist "%WATCHER%" echo [x] 找不到监听脚本（监听推送.cmd 或 watch-posts.cmd），先确认它还在仓库根目录。
if "%MODE%"=="install" if not exist "%WATCHER%" pause
if "%MODE%"=="install" if not exist "%WATCHER%" exit /b 1

if "%MODE%"=="install" powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws=New-Object -ComObject WScript.Shell; $s=$ws.CreateShortcut('%LNK%'); $s.TargetPath='%WATCHER%'; $s.WorkingDirectory='%~dp0'; $s.WindowStyle=7; $s.Description='Sato Blog post watch'; $s.Save()"
if "%MODE%"=="install" if exist "%LNK%" echo [ok] 已加入开机启动：%WATCHER%
if "%MODE%"=="install" if exist "%LNK%" echo      再双击本文件可取消。
if "%MODE%"=="install" if not exist "%LNK%" echo [x] 创建启动项失败，可手动放进 shell:startup。

echo.
pause

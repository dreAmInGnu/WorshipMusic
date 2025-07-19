@echo off
chcp 65001 >nul
echo 版本号更新工具
echo ================

:: 获取当前时间戳
for /f "tokens=1-6 delims=/:. " %%a in ('echo %date% %time%') do (
    set year=%%c
    set month=%%a
    set day=%%b
    set hour=%%d
    set minute=%%e
)

:: 格式化月份和日期（补零）
if %month% LSS 10 set month=0%month%
if %day% LSS 10 set day=0%day%
if %hour% LSS 10 set hour=0%hour%
if %minute% LSS 10 set minute=0%minute%

:: 生成版本号
set version=%year%%month%%day%_%hour%%minute%

echo 当前时间: %date% %time%
echo 生成版本号: %version%
echo.

:: 检查index.html是否存在
if not exist "index.html" (
    echo 错误: 找不到 index.html 文件
    pause
    exit /b 1
)

:: 备份原文件
echo 备份原文件...
copy "index.html" "index.html.backup" >nul

:: 更新CSS版本号
echo 更新CSS版本号...
powershell -Command "(Get-Content 'index.html') -replace 'styles\.css\?v=[^\"\s]*', 'styles.css?v=%version%' | Set-Content 'index.html'"

:: 更新JS版本号
echo 更新JS版本号...
powershell -Command "(Get-Content 'index.html') -replace 'scripts\.js\?v=[^\"\s]*', 'scripts.js?v=%version%' | Set-Content 'index.html'"

echo.
echo 版本号更新完成！
echo 新版本号: %version%
echo.
echo 文件已更新:
echo - index.html
echo.
echo 备份文件:
echo - index.html.backup
echo.
echo 下一步操作:
echo 1. 提交代码到Git
echo 2. 推送到远程仓库
echo 3. 等待Cloudflare Pages自动部署
echo 4. 清除CDN缓存（如需要）
echo.
pause 
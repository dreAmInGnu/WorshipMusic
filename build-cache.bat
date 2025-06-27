@echo off
REM 缓存清除构建脚本 - 自动更新版本号解决浏览器缓存问题
echo.
echo 🚀 开始缓存清除构建...

REM 生成时间戳版本号
for /f "tokens=1-5 delims=/: " %%a in ("%date% %time%") do (
    set "timestamp=%%c%%a%%b_%%d%%e"
)
REM 清理时间戳中的空格和点
set "timestamp=%timestamp: =%"
set "timestamp=%timestamp:.=%"
set "timestamp=%timestamp:~0,13%"

echo 📝 生成新版本号: %timestamp%

REM 检查文件是否存在
if not exist "index.html" (
    echo ❌ 错误: index.html 文件不存在
    pause
    exit /b 1
)

REM 备份原文件
copy "index.html" "index.html.backup" >nul
echo 📋 已创建备份文件: index.html.backup

REM 使用PowerShell进行文本替换（避免批处理复杂的正则表达式问题）
powershell -Command "$content = Get-Content 'index.html' -Raw; $content = $content -replace 'href=\"styles\.css(\?v=[^\"]*)?\"', 'href=\"styles.css?v=%timestamp%\"'; $content = $content -replace 'src=\"scripts\.js(\?v=[^\"]*)?\"', 'src=\"scripts.js?v=%timestamp%\"'; Set-Content 'index.html' -Value $content -Encoding UTF8"

if %errorlevel% neq 0 (
    echo ❌ 文件更新失败
    copy "index.html.backup" "index.html" >nul
    echo 🔄 已恢复原始文件
    pause
    exit /b 1
)

echo ✅ HTML文件更新成功
echo.
echo 📋 版本信息:
echo    CSS版本: styles.css?v=%timestamp%
echo    JS版本: scripts.js?v=%timestamp%
echo    更新时间: %date% %time%
echo.
echo 🎉 构建完成！
echo 💡 提示: 现在可以部署到Cloudflare Pages，并清除Cloudflare缓存
echo.
echo 📝 下一步操作:
echo    1. 提交代码到Git仓库
echo    2. 等待Cloudflare Pages自动部署
echo    3. 在Cloudflare控制面板清除缓存
echo    4. 用户访问时将自动获取最新版本
echo.

REM 创建版本配置文件
echo { > version.json
echo   "version": "1.0.0", >> version.json
echo   "timestamp": "%timestamp%", >> version.json
echo   "css": { >> version.json
echo     "styles.css": "%timestamp%" >> version.json
echo   }, >> version.json
echo   "js": { >> version.json
echo     "scripts.js": "%timestamp%" >> version.json
echo   }, >> version.json
echo   "lastUpdated": "%date% %time%" >> version.json
echo } >> version.json

echo 📄 版本配置文件已更新
echo.
pause 
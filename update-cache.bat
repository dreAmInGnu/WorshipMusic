@echo off
chcp 65001 >nul
echo.
echo 🚀 缓存清除构建脚本
echo ================================

REM 手动设置版本号（避免编码问题）
set /p version=请输入新版本号 (格式: YYYYMMDD_HHMM, 回车使用默认): 

if "%version%"=="" (
    REM 生成默认时间戳
    for /f "tokens=2 delims==" %%i in ('wmic os get localdatetime /value') do set dt=%%i
    set version=!dt:~0,8!_!dt:~8,4!
)

echo.
echo 📝 使用版本号: %version%

REM 备份文件
if exist "index.html" (
    copy "index.html" "index.html.backup" >nul 2>&1
    echo 📋 已备份 index.html
) else (
    echo ❌ 找不到 index.html 文件
    pause
    exit /b 1
)

REM 手动修改说明
echo.
echo 📝 请手动完成以下步骤:
echo.
echo 1. 打开 index.html 文件
echo 2. 找到这一行:
echo    ^<link rel="stylesheet" href="styles.css"^>
echo    修改为:
echo    ^<link rel="stylesheet" href="styles.css?v=%version%"^>
echo.
echo 3. 找到这一行:
echo    ^<script src="scripts.js"^>^</script^>
echo    修改为:
echo    ^<script src="scripts.js?v=%version%"^>^</script^>
echo.
echo 4. 保存文件
echo.
echo ✅ 修改完成后，您的网站将使用新版本号: %version%
echo.
echo 📤 下一步: 提交代码到Git并部署到Cloudflare Pages
echo 🗑️  然后在Cloudflare控制面板清除缓存
echo.
pause 
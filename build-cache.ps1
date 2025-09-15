# 缓存清除构建脚本 (PowerShell版本)
# 自动更新版本号，解决浏览器缓存问题

param(
    [switch]$Help
)

if ($Help) {
    Write-Host "缓存清除构建脚本 - 自动更新版本号解决浏览器缓存问题" -ForegroundColor Green
    Write-Host ""
    Write-Host "用法: .\build-cache.ps1" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "功能:"
    Write-Host "  - 自动生成新的版本号时间戳"
    Write-Host "  - 更新 styles.css 和 scripts.js 的引用版本"
    Write-Host "  - 确保用户获取最新的CSS和JS文件"
    Write-Host ""
    Write-Host "示例:"
    Write-Host "  .\build-cache.ps1           # 运行缓存清除构建"
    Write-Host "  .\build-cache.ps1 -Help     # 显示帮助信息"
    exit 0
}

Write-Host "🚀 开始缓存清除构建..." -ForegroundColor Green

# 生成时间戳版本号
$now = Get-Date
$timestamp = "{0:yyyyMMdd}_{1:HHmm}" -f $now, $now

Write-Host "📝 生成新版本号: $timestamp" -ForegroundColor Yellow

# 检查文件是否存在
if (-not (Test-Path "index.html")) {
    Write-Host "❌ 错误: index.html 文件不存在" -ForegroundColor Red
    exit 1
}

# 读取HTML文件
$htmlContent = Get-Content -Path "index.html" -Raw -Encoding UTF8

# 备份原文件
$backupFile = "index.html.backup"
Copy-Item "index.html" $backupFile
Write-Host "📋 已创建备份文件: $backupFile" -ForegroundColor Cyan

try {
    # 替换CSS引用
    $htmlContent = $htmlContent -replace '<link rel="stylesheet" href="styles\.css(\?v=[^"]*)?', "<link rel=""stylesheet"" href=""styles.css?v=$timestamp"
    
    # 替换JS引用  
    $htmlContent = $htmlContent -replace '<script src="scripts\.js(\?v=[^"]*)?', "<script src=""scripts.js?v=$timestamp"
    
    # 保存更新后的HTML
    Set-Content -Path "index.html" -Value $htmlContent -Encoding UTF8
    
    Write-Host "✅ HTML文件更新成功" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 版本信息:" -ForegroundColor Cyan
    Write-Host "   CSS版本: styles.css?v=$timestamp" -ForegroundColor White
    Write-Host "   JS版本: scripts.js?v=$timestamp" -ForegroundColor White
    Write-Host "   更新时间: $($now.ToString('yyyy-MM-dd HH:mm:ss'))" -ForegroundColor White
    Write-Host ""
    Write-Host "🎉 构建完成！" -ForegroundColor Green
    Write-Host "💡 提示: 现在可以部署到Cloudflare Pages，并清除Cloudflare缓存" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "📝 下一步操作:"
    Write-Host "   1. 提交代码到Git仓库"
    Write-Host "   2. 等待Cloudflare Pages自动部署"
    Write-Host "   3. 在Cloudflare控制面板清除缓存"
    Write-Host "   4. 用户访问时将自动获取最新版本"

    # 更新版本配置文件
    $versionConfig = @{
        version = "1.0.0"
        timestamp = $timestamp
        css = @{
            "styles.css" = $timestamp
        }
        js = @{
            "scripts.js" = $timestamp
        }
        lastUpdated = $now.ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    }
    
    $versionJson = $versionConfig | ConvertTo-Json -Depth 3
    Set-Content -Path "version.json" -Value $versionJson -Encoding UTF8
    Write-Host "📄 版本配置文件已更新" -ForegroundColor Cyan
    
} catch {
    Write-Host "❌ 构建失败: $($_.Exception.Message)" -ForegroundColor Red
    
    # 恢复备份文件
    if (Test-Path $backupFile) {
        Copy-Item $backupFile "index.html" -Force
        Write-Host "🔄 已恢复原始文件" -ForegroundColor Yellow
    }
    exit 1
} 
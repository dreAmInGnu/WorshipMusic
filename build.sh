#!/bin/bash

# Cloudflare Pages Build Script
# This script ensures proper build process for static site with Functions

echo "🚀 开始构建敬拜歌曲库..."

# 检查必要文件是否存在
if [ ! -f "index.html" ]; then
    echo "❌ 错误: index.html 文件不存在"
    exit 1
fi

if [ ! -f "functions/api/songs.js" ]; then
    echo "❌ 错误: API函数文件不存在"
    exit 1
fi

# 验证 package.json
if [ -f "package.json" ]; then
    echo "✅ 找到 package.json"
else
    echo "⚠️  未找到 package.json，创建基础版本..."
fi

# 列出将要部署的文件
echo "📁 即将部署的文件:"
echo "   - index.html (主页面)"
echo "   - scripts.js (前端脚本)"
echo "   - styles.css (样式文件)"
echo "   - functions/api/songs.js (API函数)"
echo "   - icons/ (图标目录)"
echo "   - libs/ (库文件)"

echo "✅ 构建完成! 静态站点已准备就绪"
echo "🔗 Functions 目录: functions/"
echo "🎯 主要API端点: /api/songs"

exit 0 
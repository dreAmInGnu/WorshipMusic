#!/usr/bin/env node
/**
 * 缓存清除构建脚本
 * 自动更新版本号，解决浏览器缓存问题
 */

const fs = require('fs');
const path = require('path');

// 生成时间戳版本号
function generateTimestamp() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    
    return `${year}${month}${day}_${hour}${minute}`;
}

// 读取版本配置
function readVersionConfig() {
    try {
        const configPath = path.join(__dirname, 'version.json');
        if (!fs.existsSync(configPath)) {
            return createDefaultConfig();
        }
        return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (error) {
        console.error('读取版本配置失败:', error.message);
        return createDefaultConfig();
    }
}

// 创建默认配置
function createDefaultConfig() {
    return {
        version: "1.0.0",
        timestamp: generateTimestamp(),
        css: {
            "styles.css": generateTimestamp()
        },
        js: {
            "scripts.js": generateTimestamp()
        },
        lastUpdated: new Date().toISOString()
    };
}

// 更新版本配置
function updateVersionConfig(config) {
    const newTimestamp = generateTimestamp();
    
    config.timestamp = newTimestamp;
    config.css["styles.css"] = newTimestamp;
    config.js["scripts.js"] = newTimestamp;
    config.lastUpdated = new Date().toISOString();
    
    // 保存配置
    const configPath = path.join(__dirname, 'version.json');
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
    
    return config;
}

// 更新HTML文件中的资源引用
function updateHtmlFile(config) {
    const htmlPath = path.join(__dirname, 'index.html');
    
    if (!fs.existsSync(htmlPath)) {
        console.error('index.html 文件不存在');
        return false;
    }
    
    let htmlContent = fs.readFileSync(htmlPath, 'utf8');
    
    // 替换CSS引用
    const cssVersion = config.css["styles.css"];
    htmlContent = htmlContent.replace(
        /<link rel="stylesheet" href="styles\.css(\?v=[^"]*)?"/g,
        `<link rel="stylesheet" href="styles.css?v=${cssVersion}"`
    );
    
    // 替换JS引用
    const jsVersion = config.js["scripts.js"];
    htmlContent = htmlContent.replace(
        /<script src="scripts\.js(\?v=[^"]*)?"/g,
        `<script src="scripts.js?v=${jsVersion}"`
    );
    
    // 保存更新后的HTML
    fs.writeFileSync(htmlPath, htmlContent, 'utf8');
    
    return true;
}

// 主构建函数
function build() {
    console.log('🚀 开始构建...');
    
    try {
        // 读取当前配置
        let config = readVersionConfig();
        console.log('📖 当前版本:', config.timestamp);
        
        // 更新版本号
        config = updateVersionConfig(config);
        console.log('📝 更新版本号:', config.timestamp);
        
        // 更新HTML文件
        if (updateHtmlFile(config)) {
            console.log('✅ HTML文件更新成功');
        } else {
            console.error('❌ HTML文件更新失败');
            process.exit(1);
        }
        
        console.log('🎉 构建完成！');
        console.log('📋 版本信息:');
        console.log(`   CSS版本: ${config.css["styles.css"]}`);
        console.log(`   JS版本: ${config.js["scripts.js"]}`);
        console.log(`   更新时间: ${config.lastUpdated}`);
        console.log('');
        console.log('💡 提示: 现在可以部署到Cloudflare Pages，并清除Cloudflare缓存');
        
    } catch (error) {
        console.error('❌ 构建失败:', error.message);
        process.exit(1);
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    build();
}

module.exports = { build, generateTimestamp, updateVersionConfig }; 
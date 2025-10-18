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

// 读取环境变量
function loadEnvVariables() {
    const envPath = path.join(__dirname, '.env');
    const env = {};
    
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        envContent.split('\n').forEach(line => {
            const [key, value] = line.split('=');
            if (key && value) {
                env[key.trim()] = value.trim();
            }
        });
    }
    
    // 回退到系统环境变量
    env.R2_BASE_URL = env.R2_BASE_URL || process.env.R2_BASE_URL || 'https://r2.worshipmusic.windsmaker.com';
    
    return env;
}

// 替换文件中的环境变量
function replaceEnvVariables(content, env) {
    let result = content;
    Object.keys(env).forEach(key => {
        const placeholder = `{{${key}}}`;
        const regex = new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        result = result.replace(regex, env[key]);
    });
    return result;
}

// 主构建函数
function build() {
    try {
        console.log('🚀 开始构建流程...');
        
        // 1. 加载环境变量
        const env = loadEnvVariables();
        console.log('✅ 已加载环境变量');
        
        // 2. 读取版本配置
        let config = readVersionConfig();
        
        // 3. 更新版本配置
        config = updateVersionConfig(config);
        console.log(`✅ 新版本号: ${config.timestamp}`);
        
        // 4. 处理scripts.js
        const scriptsPath = path.join(__dirname, 'scripts.js');
        let scriptsContent = fs.readFileSync(scriptsPath, 'utf8');
        
        // 替换R2_BASE_URL为占位符（如果还没替换）
        if (scriptsContent.includes('https://r2.worshipmusic.windsmaker.com')) {
            scriptsContent = scriptsContent.replace(
                /const R2_BASE_URL = "https:\/\/r2\.worshipmusic\.windsmaker\.com";/,
                'const R2_BASE_URL = "{{R2_BASE_URL}}";'
            );
        } else if (scriptsContent.includes('https://r2.windsmaker.com')) {
            // 兼容旧URL
            scriptsContent = scriptsContent.replace(
                /const R2_BASE_URL = "https:\/\/r2\.windsmaker\.com";/,
                'const R2_BASE_URL = "{{R2_BASE_URL}}";'
            );
        }
        
        // 替换环境变量
        scriptsContent = replaceEnvVariables(scriptsContent, env);
        
        // 写入处理后的scripts.js
        fs.writeFileSync(scriptsPath, scriptsContent, 'utf8');
        console.log('✅ 环境变量已注入scripts.js');
        
        // 5. 更新HTML文件
        if (updateHtmlFile(config)) {
            console.log('✅ index.html版本号已更新');
        }
        
        console.log('🎉 构建完成！');
        console.log(`- CSS版本: ${config.css["styles.css"]}`);
        console.log(`- JS版本: ${config.js["scripts.js"]}`);
        console.log(`- 构建时间: ${config.lastUpdated}`);
        
        return true;
        
    } catch (error) {
        console.error('❌ 构建失败:', error);
        process.exit(1);
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    build();
}

module.exports = { build, loadEnvVariables, replaceEnvVariables }; 
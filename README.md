# 在线敬拜歌曲库播放器

一个基于 Web 的音乐播放器，用于播放敬拜歌曲，支持原唱和伴奏，显示歌谱，以及批量下载功能。

## 功能特性

- 🎵 播放原唱和伴奏音轨
- 🎼 显示歌谱图片
- 📦 批量下载（ZIP 格式）
- 📱 响应式设计，支持移动端和桌面端
- 🔍 歌曲搜索功能
- 🎲 随机播放模式
- 📂 自动从 R2 存储桶加载歌曲列表

## 部署指南

### 前提条件

1. Cloudflare 账户
2. 一个 R2 存储桶，包含按以下结构组织的歌曲文件：
   ```
   R2 存储桶/
   ├── 歌曲名1/
   │   ├── 歌曲名1.mp3          # 原唱
   │   ├── 歌曲名1[伴奏].mp3    # 伴奏（可选）
   │   └── 歌曲名1.jpg          # 歌谱（可选）
   └── 歌曲名2/
       ├── 歌曲名2.mp3
       ├── 歌曲名2[伴奏].mp3
       └── 歌曲名2.jpg
   ```

### 步骤1：部署到 Cloudflare Pages

1. 将代码推送到 Git 仓库（GitHub, GitLab 等）
2. 登录 Cloudflare Dashboard
3. 转到 **Pages** > **Create a project**
4. 连接您的 Git 仓库
5. 设置构建配置：
   - **Build command**: 留空
   - **Build output directory**: `/`
6. 点击 **Save and Deploy**

### 步骤2：配置 R2 存储桶绑定

**重要：这一步是解决 "无法加载歌曲列表" 错误的关键**

1. 在 Cloudflare Dashboard 中，转到您的 Pages 项目
2. 点击 **Settings** 标签
3. 在左侧菜单中选择 **Functions**
4. 滚动到 **R2 bucket bindings** 部分
5. 点击 **Add binding**
6. 填写：
   - **Variable name**: `SONG_BUCKET`
   - **R2 bucket**: 选择您的 R2 存储桶（例如 `worship`）
7. 点击 **Save**

### 步骤3：配置 R2 存储桶公共访问

1. 转到 **R2 Object Storage**
2. 选择您的存储桶
3. 转到 **Settings** 标签
4. 在 **Public access** 部分：
   - 启用 **Allow Access**
   - 设置自定义域名或使用提供的 R2.dev 域名
5. 记录公共访问 URL

### 步骤4：更新前端配置

在 `scripts.js` 中更新 R2 基础 URL：

```javascript
const R2_BASE_URL = "https://你的R2域名/worship";
```

### 步骤5：重新部署

1. 提交更改到 Git 仓库
2. Cloudflare Pages 将自动重新部署
3. 等待部署完成

## 故障排除

### 错误：无法加载歌曲列表

**可能原因和解决方案：**

1. **R2 绑定未配置**
   - 确保已按步骤2配置 R2 存储桶绑定
   - 检查变量名是否为 `SONG_BUCKET`
   - 检查存储桶名称是否正确

2. **R2 存储桶访问权限**
   - 确保 R2 存储桶已启用公共访问
   - 检查 R2 域名配置是否正确

3. **文件结构问题**
   - 确保文件按照要求的目录结构组织
   - 检查文件名和扩展名是否正确

4. **网络或CORS问题**
   - 检查浏览器开发者工具的网络标签
   - 查看是否有CORS错误

### 调试步骤

1. **检查 API 响应**
   ```
   访问: https://你的域名.pages.dev/api/songs
   ```
   应该返回 JSON 格式的歌曲列表

2. **查看 Pages Functions 日志**
   - 转到 Cloudflare Dashboard > Pages > 你的项目
   - 点击 **Functions** 标签
   - 查看 **Real-time Logs**

3. **验证 R2 存储桶内容**
   - 在 R2 Dashboard 中检查文件结构
   - 确保至少有一个正确格式的歌曲文件夹

### 常见错误消息

- `"SONG_BUCKET binding is missing"` → 需要配置 R2 绑定
- `"Could not list songs from R2 bucket"` → 检查存储桶权限和名称
- `"网络连接错误"` → 检查 API 端点和 CORS 配置

## 本地开发

如果需要在本地开发和测试：

1. 安装 Wrangler CLI：
   ```bash
   npm install -g wrangler
   ```

2. 登录 Cloudflare：
   ```bash
   wrangler login
   ```

3. 本地开发服务器：
   ```bash
   wrangler pages dev .
   ```

## 技术栈

- **前端**: HTML5, CSS3, JavaScript (ES6+)
- **音频处理**: HTML5 Audio API
- **下载功能**: JSZip
- **后端**: Cloudflare Pages Functions
- **存储**: Cloudflare R2
- **排序**: pinyin-pro (中文拼音排序)

## 配置文件说明

- `functions/api/songs.js`: Cloudflare Pages Function，自动扫描 R2 存储桶
- `wrangler.toml`: Cloudflare Worker 配置（仅用于独立 Worker 部署）
- `scripts.js`: 前端主要逻辑
- `styles.css`: 样式文件
- `index.html`: 主页面

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

---
*最后更新: 2024-01-XX*
<!-- 触发部署: 修复Cloudflare Pages内部错误 -->

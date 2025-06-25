<<<<<<< HEAD
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
*部署时间: 2024-01-XX*
=======
# 敬拜歌曲库 - 在线播放器

🎵 一个简洁美观的静态网页音乐播放器，专为敬拜团队设计，支持在线播放和批量下载。

## ✨ 功能特色

### 🎧 播放功能
- **双音轨支持**：原唱和伴奏音频独立播放
- **智能播放模式**：支持顺序播放和随机播放
- **自动连播**：歌曲结束后自动播放下一首
- **进度控制**：可拖拽调节播放进度
- **音量调节**：实时音量控制

### 🎼 歌谱展示
- **高清歌谱**：支持 JPG/PNG 格式歌谱图片
- **自适应显示**：根据屏幕尺寸自动调整歌谱大小
- **错误处理**：歌谱加载失败时显示友好提示

### 📦 批量下载
- **一键打包**：将歌曲的所有文件（原唱、伴奏、歌谱）打包成ZIP
- **前端实现**：无需服务器，直接在浏览器中生成ZIP文件
- **智能命名**：ZIP文件以歌曲名称命名

### 🔍 搜索功能
- **实时搜索**：输入即搜，支持歌名和艺术家搜索
- **智能过滤**：根据搜索结果动态更新播放列表

### 📱 响应式设计
- **移动端优化**：完美适配手机和平板设备
- **触摸友好**：大按钮设计，易于触摸操作
- **自适应布局**：桌面端双栏，移动端单栏布局

## 🚀 快速开始

### 1. 准备 Cloudflare R2 存储

1.  **创建存储桶**：在 Cloudflare 创建一个 R2 存储桶（例如，命名为 `worship`）。
2.  **上传文件**：将您的歌曲文件按以下结构上传到桶中。**每次新增歌曲只需上传一个新文件夹即可，列表会自动更新！**

```
your-bucket/
├── 为爱而生/
│   ├── 为爱而生.mp3
│   ├── 为爱而生[伴奏].mp3
│   └── 为爱而生.jpg
├── 奇异恩典/
│   ├── 奇异恩典.mp3
│   └── 奇异恩典.png
└── ...
```

### 2. 部署项目

本项目包含一个前端播放器和一个后端 Cloudflare Worker，推荐使用 Cloudflare Pages 进行一站式部署。

1.  **安装 Wrangler**:
    ```sh
    npm install -g wrangler
    ```
2.  **登录 Cloudflare**:
    ```sh
    wrangler login
    ```
3.  **部署 Worker**:
    *   在部署之前，请确保 `wrangler.toml` 文件中的 `bucket_name` 与您在第一步中创建的 R2 桶名完全一致。
    *   运行部署命令：
    ```sh
    wrangler deploy
    ```
4.  **部署前端**:
    *   将项目（除 `functions` 和 `wrangler.toml` 外的静态文件）上传到 Cloudflare Pages。
    *   将您部署的 Worker 作为一个服务绑定到您的 Pages 项目。

### 3. 配置（可选）

*   **R2 公开地址**: 如果您的 Worker 或前端部署在不同的地方，请确保 `scripts.js` 文件顶部的 `R2_BASE_URL` 常量指向您 R2 桶的正确公开访问地址。
*   **CORS 配置**: 为确保前端能够正常访问 R2 文件，建议在 R2 存储桶中配置 CORS 策略，允许您的播放器域名进行 GET 请求。

## 📁 项目结构

```
worship/
├── index.html              # 主页面
├── styles.css              # 样式文件
├── scripts.js              # 前端交互逻辑
├── libs/
│   └── jszip.min.js        # ZIP打包库
├── functions/
│   └── api/
│       └── songs.js        # 后端Worker：动态生成列表
├── wrangler.toml           # Worker 配置文件
└── README.md               # 项目说明文档
```

## ⚙️ 自动化原理

本播放器使用 Cloudflare Worker 从 R2 存储桶动态加载歌曲列表，实现了**上传即更新**的自动化流程。

1.  前端向 `/api/songs` (Worker 地址) 发起请求。
2.  Worker 扫描绑定的 R2 存储桶内的所有文件。
3.  根据文件夹结构对文件进行分组，并识别文件类型。
4.  Worker 动态生成 JSON 格式的歌曲列表并返回给前端。
5.  前端解析 JSON 并渲染播放列表。

这个架构完全移除了手动维护 `songs.json` 的需要。

## 🎨 界面说明

### 播放控制
- **🔄 顺序播放**：按列表顺序播放歌曲
- **🔀 随机播放**：随机选择下一首歌曲
- **🎤 原唱**：播放原唱音频
- **🎹 伴奏**：播放伴奏音频（如果有）
- **⏸️ 暂停**：暂停当前播放

### 操作流程
1. 在搜索框中输入关键词筛选歌曲
2. 点击歌曲项目选择并自动开始播放
3. 使用播放控制按钮切换音轨或播放模式
4. 点击"📦 打包下载"获取歌曲所有文件

## 🔧 技术栈

- **前端框架**：原生 HTML/CSS/JavaScript
- **后端服务**：Cloudflare Workers
- **数据存储**：Cloudflare R2
- **音频播放**：HTML5 Audio API
- **文件打包**：JSZip 库
- **样式系统**：CSS Grid + Flexbox
- **图标系统**：Unicode Emoji

## 🌐 浏览器兼容性

| 浏览器 | 版本要求 |
|--------|----------|
| Chrome | 60+ |
| Firefox | 55+ |
| Safari | 12+ |
| Edge | 79+ |

## 📝 更新日志

### v1.0.0 (2025-06-24)
- ✅ 基础播放功能
- ✅ 双音轨支持（原唱/伴奏）
- ✅ 播放模式切换（顺序/随机）
- ✅ 歌谱显示功能
- ✅ 批量下载功能
- ✅ 搜索和过滤
- ✅ 响应式设计

## 🤝 使用许可

本项目采用 MIT 许可证，可自由使用、修改和分发。

## 📞 技术支持

如有问题或建议，请通过以下方式联系：

- 📧 邮箱：your-email@example.com
- 🐛 问题反馈：提交 GitHub Issue
- 💡 功能建议：欢迎提交 Pull Request

---

🎵 **愿这个工具能够帮助您的敬拜团队更好地服事！** 🙏
>>>>>>> d2bffa7e018efbef8d2f9e49f696c21be25b9c68

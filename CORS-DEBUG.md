# CORS 问题排查指南

## 重要说明

### middleware 方式的限制

`functions/_middleware.js` **只在 Cloudflare Pages 部署后才会生效**！

**不支持的环境**：
- ❌ 本地开发（使用 `file://` 协议打开 HTML）
- ❌ 本地 HTTP 服务器（如 `python -m http.server`）
- ❌ 任何非 Cloudflare Pages 的托管环境

**支持的环境**：
- ✅ Cloudflare Pages 部署后的生产环境
- ✅ Cloudflare Pages 的预览部署

## 当前问题诊断

如果您看到 CORS 错误，请检查：

### 1. 您在哪里测试？

**本地测试**：
```
file:///path/to/index.html
或
http://localhost:8080/
```
→ ❌ middleware **不会工作**，必须部署到 Cloudflare Pages

**Cloudflare Pages 部署**：
```
https://your-site.pages.dev
或
https://your-custom-domain.com
```
→ ✅ middleware **会工作**

### 2. 如何验证 middleware 是否工作

打开浏览器控制台（F12），查看网络请求：

**如果 middleware 工作**：
```
请求: https://your-site.pages.dev/歌曲文件夹/歌曲.mp3
响应头包含:
  Access-Control-Allow-Origin: *
  Content-Type: audio/mpeg
  Accept-Ranges: bytes
```

**如果 middleware 不工作**：
```
请求: https://your-site.pages.dev/歌曲文件夹/歌曲.mp3
响应: 404 Not Found
或 CORS 错误
```

### 3. 本地开发的临时解决方案

如果需要本地测试，有两个选项：

**选项A：使用 Wrangler 本地预览（推荐）**
```bash
npm install -g wrangler
wrangler pages dev . --port 8787
```
这会在本地模拟 Cloudflare Pages 环境，middleware 会工作。

**选项B：临时恢复直接访问 R2**
在 `scripts.js` 中临时修改：
```javascript
// 临时用于本地开发
const R2_BASE_URL = "https://r2.worshipmusic.windsmaker.com";
const audioUrl = `${R2_BASE_URL}/${song.folder}/${fileName}`;
```
但这需要在 Cloudflare R2 控制台配置自定义域名和 CORS。

## R2 自定义域名配置（如果需要）

如果您想使用直接访问 R2 的方式，需要：

1. **在 Cloudflare R2 控制台**：
   - 打开 R2 存储桶 `worship`
   - 进入 "Settings" → "Public Access"
   - 添加自定义域名：`r2.worshipmusic.windsmaker.com`
   - 启用公共访问

2. **配置 CORS 规则**：
   在 R2 存储桶设置中添加 CORS 规则：
   ```json
   [
     {
       "AllowedOrigins": ["*"],
       "AllowedMethods": ["GET", "HEAD"],
       "AllowedHeaders": ["*"],
       "ExposeHeaders": ["Content-Length", "Content-Range"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```

## 推荐方案

✅ **最佳实践**：
1. 保持当前代码（使用相对路径 + middleware）
2. **部署到 Cloudflare Pages**
3. 在部署后的环境中测试

这样无需配置任何 R2 自定义域名，开箱即用！

## 调试步骤

1. **确认部署成功**：
   - 检查 Cloudflare Pages 控制台
   - 确认构建和部署都成功

2. **打开浏览器控制台**（F12）：
   - 切换到 "Network" 标签
   - 勾选 "Preserve log"
   - 尝试播放歌曲

3. **查看音频文件请求**：
   - 找到 `.mp3` 文件的请求
   - 查看请求URL（应该是相对路径）
   - 查看响应头（应该包含 CORS 头）
   - 查看状态码（应该是 200 或 206）

4. **查看控制台日志**：
   我已添加详细的调试日志：
   ```
   === 音频加载调试信息 ===
   当前域名: https://...
   音频URL: /歌曲文件夹/歌曲.mp3
   是否是相对路径: true
   完整URL: https://.../歌曲文件夹/歌曲.mp3
   ```

## 常见问题

**Q: 我在本地打开 index.html，显示 CORS 错误**
A: 这是正常的！middleware 只在 Cloudflare Pages 上工作。请部署后测试。

**Q: 我已经部署了，还是有 CORS 错误**
A: 检查：
1. 确认 R2 绑定配置正确（Cloudflare Pages 设置 → Functions → R2 Bindings）
2. 确认 `_middleware.js` 文件已包含在部署中
3. 查看浏览器控制台的网络请求详情

**Q: 如何确认 R2 绑定配置正确？**
A: 访问 `/api/songs` 端点，如果能看到歌曲列表，说明 R2 绑定工作正常。

**Q: iPhone 还是无法播放**
A: 确保：
1. 在 Cloudflare Pages 部署后的 URL 上测试（不是本地）
2. 清除 iPhone 浏览器缓存
3. 检查是否使用 HTTPS（不要用 HTTP）


# Cloudflare Pages 部署检查清单

## 问题诊断

根据您提供的 404 错误信息，问题可能是以下之一：

### 1. R2 绑定未配置 ⚠️

**最可能的原因！**

#### 如何检查：
1. 登录 Cloudflare Dashboard
2. 进入 Pages 项目：`worshipmusic`
3. 点击 **Settings** → **Functions**
4. 滚动到 **R2 bucket bindings**

#### 应该看到：
```
Variable name: SONG_BUCKET
R2 bucket: worship
```

#### 如果没有：
请按以下步骤添加：

**生产环境绑定**：
1. 在 **Production** 标签下
2. 点击 **Add binding**
3. 填写：
   - **Variable name**: `SONG_BUCKET`
   - **R2 bucket**: 选择 `worship`
4. 点击 **Save**

**预览环境绑定**（可选但推荐）：
1. 在 **Preview** 标签下
2. 重复上述步骤

### 2. R2 存储桶中的文件路径

检查 R2 存储桶中的文件路径是否正确：

**期望的文件结构**：
```
worship/
  └── 爱，我愿意/
      ├── 爱，我愿意.mp3
      ├── 爱，我愿意[伴奏].mp3
      └── 爱，我愿意.jpg (歌谱，可选)
```

**检查方法**：
1. Cloudflare Dashboard → R2 → `worship` 存储桶
2. 查看文件列表
3. 确认文件路径格式正确

### 3. 中文文件名编码问题（已修复）

我已在 middleware 中添加了 `decodeURIComponent` 来处理中文URL编码。

### 4. Middleware 日志

我已添加详细的调试日志到 `_middleware.js`。

部署后，在 Cloudflare Pages 的 **Functions** → **Logs** 中可以看到：
```
[Middleware] 请求路径: /爱，我愿意/爱，我愿意.mp3
[Middleware] 解码后的key: 爱，我愿意/爱，我愿意.mp3
[Middleware] 尝试从R2获取文件: 爱，我愿意/爱，我愿意.mp3
[Middleware] R2文件找到, size: xxx, contentType: audio/mpeg
```

如果看到：
```
[Middleware] R2 bucket未配置！
```
→ 说明 R2 绑定未配置（见上面第1条）

如果看到：
```
[Middleware] R2中未找到文件: 爱，我愿意/爱，我愿意.mp3
```
→ 说明文件路径不匹配（见上面第2条）

## 部署步骤

### 第1步：提交代码
```bash
git add .
git commit -m "修复CORS问题：使用middleware代理R2访问"
git push origin main
```

### 第2步：等待自动部署
- Cloudflare Pages 会自动检测到 push 并开始构建
- 通常需要 1-3 分钟

### 第3步：配置 R2 绑定
如果尚未配置，请按上述步骤配置 R2 绑定。

**⚠️ 重要：配置后需要重新部署！**

### 第4步：重新部署（如果更改了绑定）
1. Cloudflare Dashboard → Pages → 您的项目
2. 点击 **Deployments** 标签
3. 找到最新的部署
4. 点击 **Retry deployment** 或推送一个新提交

### 第5步：测试
1. 打开 `https://worshipmusic.windsmaker.com`
2. 按 F12 打开开发者工具
3. 切换到 **Console** 标签（查看调试日志）
4. 切换到 **Network** 标签（查看网络请求）
5. 尝试播放一首歌
6. 检查：
   - Console 中的 middleware 日志
   - Network 中 `.mp3` 文件的请求状态（应该是 200，不是 404）

## 预期结果

部署成功后，应该看到：

**Network 标签**：
```
请求: https://worshipmusic.windsmaker.com/爱，我愿意/爱，我愿意.mp3
状态: 200 OK (或 206 Partial Content)
响应头包含:
  Access-Control-Allow-Origin: *
  Content-Type: audio/mpeg
  Accept-Ranges: bytes
```

**Console 标签**：
```
=== 音频加载调试信息 ===
当前域名: https://worshipmusic.windsmaker.com
音频URL: /爱，我愿意/爱，我愿意.mp3
是否是相对路径: true
完整URL: https://worshipmusic.windsmaker.com/爱，我愿意/爱，我愿意.mp3
```

## 常见问题

### Q: 配置了 R2 绑定，还是 404
**A**: 需要重新部署！配置更改后不会自动生效。

### Q: 如何查看 Cloudflare Pages 的日志？
**A**: 
1. Cloudflare Dashboard → Pages → 您的项目
2. 点击 **Functions** 标签
3. 查看实时日志

### Q: 本地如何测试？
**A**: 使用 Wrangler：
```bash
npm install -g wrangler
wrangler pages dev . --binding SONG_BUCKET=worship --port 8787
```
注：需要先配置 Wrangler 的 R2 访问权限

### Q: 还是不行怎么办？
**A**: 提供以下信息：
1. Cloudflare Pages Functions 的日志截图
2. 浏览器控制台的完整错误信息
3. Network 标签中失败请求的详细信息（请求/响应头）

## 更新历史

- **20251018_1525**: 
  - ✅ 修复 middleware 中文文件名解码问题
  - ✅ 添加详细的调试日志
  - ✅ 改用相对路径访问 R2 文件
  - ✅ 移除不必要的超时检测代码


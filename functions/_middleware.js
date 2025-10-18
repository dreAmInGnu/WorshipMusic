/**
 * Cloudflare Pages Function for serving files from R2 bucket with proper CORS and Range support
 * 
 * 这个函数解决以下问题：
 * 1. 移动端音频播放的CORS问题
 * 2. HTTP Range请求支持（断点续传）
 * 3. 正确的Content-Type设置
 * 4. 必要响应头的暴露
 */

export async function onRequest({ request, env, next }) {
  // 从URL路径中提取文件键（移除开头的斜杠）
  const url = new URL(request.url);
  // 解码URL路径以处理中文文件名
  const key = decodeURIComponent(url.pathname.slice(1)); // 移除开头的 '/' 并解码
  
  console.log('[Middleware] 请求路径:', url.pathname);
  console.log('[Middleware] 解码后的key:', key);
  
  // 如果是API请求、根路径或本地静态文件（HTML、CSS、JS、图标），继续处理
  // 只有音频等媒体文件需要通过R2代理
  if (key.startsWith('api/') || key === '' || key === 'index.html' || 
      key.endsWith('.html') || key.endsWith('.css') || key.endsWith('.js') ||
      key.startsWith('libs/') || key.startsWith('icons/') ||
      key.endsWith('.json') || key.endsWith('.md') || key.startsWith('_')) {
    console.log('[Middleware] 跳过静态文件，交给next处理');
    return next();
  }
  
  console.log('[Middleware] 尝试从R2获取文件:', key);
  
  // 处理CORS预检请求
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': 'Range, Content-Type',
        'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Content-Disposition, Accept-Ranges',
        'Access-Control-Max-Age': '86400', // 24小时缓存
      },
    });
  }
  
  // 检查R2绑定
  if (!env.SONG_BUCKET) {
    console.error('[Middleware] R2 bucket未配置！');
    return new Response('R2 bucket not configured', { status: 500 });
  }
  
  try {
    // 获取Range头用于断点续传
    const range = request.headers.get('Range') || undefined;
    
    console.log('[Middleware] 从R2获取对象, key:', key, 'range:', range);
    
    // 从R2获取对象
    const obj = await env.SONG_BUCKET.get(key, { range });
    
    if (!obj) {
      console.error('[Middleware] R2中未找到文件:', key);
      return new Response('File not found in R2: ' + key, { status: 404 });
    }
    
    console.log('[Middleware] R2文件找到, size:', obj.size, 'contentType:', obj.httpMetadata?.contentType);
    
    // 构建响应头
    const headers = new Headers();
    
    // ① 基本内容类型
    const contentType = obj.httpMetadata?.contentType || getContentType(key);
    headers.set('Content-Type', contentType);
    
    // ② CORS 必备头
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Headers', 'Range, Content-Type');
    headers.set('Access-Control-Expose-Headers', 
                'Content-Length, Content-Range, Content-Disposition, Accept-Ranges');
    
    // ③ 断点续传支持
    headers.set('Accept-Ranges', 'bytes');
    
    // ④ 内容长度和范围信息
    if (obj.size !== undefined) {
      headers.set('Content-Length', obj.size.toString());
    }
    
    // 修复 Content-Range 头的设置
    if (obj.range) {
      // obj.range 可能是对象，需要正确处理
      if (typeof obj.range === 'string') {
        headers.set('Content-Range', obj.range);
      } else if (obj.range && obj.range.offset !== undefined && obj.range.length !== undefined) {
        // R2 range 对象格式: {offset: number, length: number}
        const start = obj.range.offset;
        const end = obj.range.offset + obj.range.length - 1;
        const total = obj.size || '*';
        headers.set('Content-Range', `bytes ${start}-${end}/${total}`);
      }
    }
    
    // ⑤ 缓存控制 - 针对不同文件类型设置不同缓存时间
    const cacheControl = getCacheControl(key);
    headers.set('Cache-Control', cacheControl);
    
    // ⑥ 可选：文件下载时的文件名
    if (url.searchParams.get('download') === 'true') {
      const filename = key.split('/').pop() || 'download';
      headers.set('Content-Disposition', `attachment; filename="${filename}"`);
    }
    
    // 返回响应
    return new Response(obj.body, {
      status: obj.range ? 206 : 200, // 206 = Partial Content for range requests
      headers: headers,
    });
    
  } catch (error) {
    console.error('Error serving file from R2:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

/**
 * 根据文件扩展名确定Content-Type
 */
function getContentType(filename) {
  const ext = filename.toLowerCase().split('.').pop();
  
  const mimeTypes = {
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'ogg': 'audio/ogg',
    'flac': 'audio/flac',
    'aac': 'audio/aac',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'pdf': 'application/pdf',
    'txt': 'text/plain',
    'json': 'application/json',
  };
  
  return mimeTypes[ext] || 'application/octet-stream';
}

/**
 * 根据文件类型确定缓存策略
 */
function getCacheControl(filename) {
  const ext = filename.toLowerCase().split('.').pop();
  
  // 音频文件：24小时缓存（移动端友好，避免网络问题时缓存过久）
  if (['mp3', 'wav', 'ogg', 'flac', 'aac'].includes(ext)) {
    return 'public, max-age=86400'; // 24小时
  }
  
  // 图片文件：7天缓存（歌谱可能会更新）
  if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) {
    return 'public, max-age=604800'; // 7天
  }
  
  // 其他文件：1年缓存（静态资源）
  return 'public, max-age=31536000'; // 1年
} 
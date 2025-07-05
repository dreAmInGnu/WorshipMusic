export async function onRequest(context) {
  const { request, env, waitUntil } = context;
  const url = new URL(request.url);

  // 使用完整的请求 URL 作为缓存键，以确保唯一性
  const cacheKey = new Request(url.href, request);
  const cache = caches.default;

  let response = await cache.match(cacheKey);

  if (!response) {
    console.log(`缓存未命中: ${url.pathname}。正在从 R2 源站获取...`);

    // 输入路径是 /api/audio/[[path]]，我们需要提取 [[path]] 部分
    // 例如, /api/audio/folder/file.mp3 -> /folder/file.mp3
    const r2Path = url.pathname.replace(/^\/api\/audio/, '');
    
    // R2_BASE_URL 应该在 Cloudflare Pages 项目的环境变量中设置
    // 例如, https://r2.windsmaker.com
    if (!env.R2_BASE_URL) {
        return new Response('后台 R2_BASE_URL 环境变量未设置。', { status: 500 });
    }
    const originUrl = env.R2_BASE_URL + r2Path;

    const originRequest = new Request(originUrl, {
        headers: { "User-Agent": "cf-worker-cache-proxy" }
    });
    
    response = await fetch(originRequest);

    if (!response.ok) {
        return new Response(`从 R2 获取文件失败: ${response.status} ${response.statusText}`, { status: response.status });
    }

    // 创建一个带有修改后响应头的新响应，以便缓存
    const headers = new Headers(response.headers);
    // 这是关键：删除此响应头，让浏览器认为服务器不支持范围请求，
    // 从而强制它下载整个文件进行本地缓存和seek。
    headers.delete("Accept-Ranges"); 
    // 强制在边缘节点和浏览器中缓存一年
    headers.set("Cache-Control", "public, max-age=31536000, immutable"); 
    
    // 添加调试响应头，方便我们确认代理是否生效
    headers.set("X-Cache-Proxy-Status", "MISS");

    response = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: headers
    });

    // 将修改后的响应存入缓存
    waitUntil(cache.put(cacheKey, response.clone()));
  } else {
    console.log(`缓存命中: ${url.pathname}`);
    // 为了调试，我们给缓存命中的响应也加上标记
    const newHeaders = new Headers(response.headers);
    newHeaders.set("X-Cache-Proxy-Status", "HIT");
    response = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders
    });
  }

  return response;
} 
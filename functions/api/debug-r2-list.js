/**
 * 调试工具：列出R2存储桶中的文件
 * 用于诊断文件路径问题
 * 
 * 访问: /api/debug-r2-list?prefix=爱是不保留
 */

export async function onRequest(context) {
  const { request, env } = context;
  
  try {
    if (!env.SONG_BUCKET) {
      return new Response(JSON.stringify({ 
        error: 'R2 bucket not configured' 
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    const url = new URL(request.url);
    const prefix = url.searchParams.get('prefix') || '';
    const limit = parseInt(url.searchParams.get('limit') || '100');

    console.log('[Debug] 列出R2文件, prefix:', prefix, 'limit:', limit);

    // 列出R2中的文件
    const listOptions = {
      limit: limit
    };
    
    if (prefix) {
      listOptions.prefix = prefix;
    }

    const list = await env.SONG_BUCKET.list(listOptions);
    
    const files = list.objects.map(obj => ({
      key: obj.key,
      size: obj.size,
      uploaded: obj.uploaded,
      httpMetadata: obj.httpMetadata
    }));

    const response = {
      success: true,
      prefix: prefix,
      count: files.length,
      truncated: list.truncated,
      files: files,
      // 提供一些示例
      examples: files.slice(0, 5).map(f => ({
        key: f.key,
        encodedKey: encodeURIComponent(f.key),
        url: `/${f.key}`,
        encodedUrl: `/${encodeURIComponent(f.key)}`
      }))
    };

    return new Response(JSON.stringify(response, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    console.error('[Debug] Error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}




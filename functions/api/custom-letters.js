/**
 * Cloudflare Pages Function for managing custom song index letters.
 * 
 * This API provides endpoints to:
 * - GET: Retrieve all custom letters
 * - POST: Save or update custom letters
 * - DELETE: Delete custom letters
 * 
 * Authentication is required for write operations (POST, DELETE).
 */

export async function onRequest(context) {
  const { request, env } = context;
  const ADMIN_TOKEN = env.ADMIN_TOKEN; // 从环境变量获取管理员令牌

  // CORS 预检请求
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  try {
    // GET 请求：获取所有自定义字母
    if (request.method === 'GET') {
      const { keys } = await env.CUSTOM_LETTERS_KV.list();
      const customLetters = {};
      for (const key of keys) {
        const value = await env.CUSTOM_LETTERS_KV.get(key.name, 'json');
        if (value) {
          customLetters[key.name] = value;
        }
      }
      return new Response(JSON.stringify({ success: true, data: customLetters }), { headers });
    }

    // POST 或 DELETE 请求需要管理员权限
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ success: false, message: 'Unauthorized: Missing or invalid Authorization header' }), { status: 401, headers });
    }
    const token = authHeader.split(' ')[1];
    if (token !== ADMIN_TOKEN) {
      return new Response(JSON.stringify({ success: false, message: 'Unauthorized: Invalid admin token' }), { status: 401, headers });
    }

    // POST 请求：保存自定义字母
    if (request.method === 'POST') {
      const data = await request.json();
      for (const songId in data) {
        await env.CUSTOM_LETTERS_KV.put(songId, JSON.stringify(data[songId]));
      }
      return new Response(JSON.stringify({ success: true, message: 'Custom letters saved' }), { headers });
    }

    // DELETE 请求：删除自定义字母
    if (request.method === 'DELETE') {
      const url = new URL(request.url);
      const songId = url.searchParams.get('songId');
      if (songId) {
        await env.CUSTOM_LETTERS_KV.delete(songId);
        return new Response(JSON.stringify({ success: true, message: `Custom letter for ${songId} deleted` }), { headers });
      } else {
        return new Response(JSON.stringify({ success: false, message: 'Missing songId for DELETE request' }), { status: 400, headers });
      }
    }

    return new Response(JSON.stringify({ success: false, message: 'Method Not Allowed' }), { status: 405, headers });

  } catch (e) {
    console.error('API error:', e);
    return new Response(JSON.stringify({ success: false, message: e.message, stack: e.stack }), { status: 500, headers });
  }
}
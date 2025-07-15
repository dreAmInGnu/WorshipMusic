/**
 * Cloudflare Pages Function for dynamically listing songs from an R2 bucket.
 *
 * How it works:
 * 1. Receives a fetch request.
 * 2. Lists all objects in the bound R2 bucket (`SONG_BUCKET`).
 * 3. Groups files by their parent directory (which represents a song).
 * 4. Identifies file types (original, accompaniment, sheet) based on naming conventions.
 * 5. Constructs a JSON response identical in structure to the previous static `songs.json`.
 * 6. Adds CORS headers to allow access from any origin.
 */

// Pages Functions 导出格式
export async function onRequest(context) {
  const { request, env } = context;
  
  try {
    // 确保 env 对象存在
    if (!env) {
      console.error('Environment context is missing');
      return new Response(JSON.stringify({ 
        error: 'Environment context missing',
        message: 'Cloudflare Pages environment is not properly configured'
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // 添加详细的环境诊断
    const diagnostics = {
      timestamp: new Date().toISOString(),
      hasR2Binding: !!env.SONG_BUCKET,
      environmentKeys: Object.keys(env || {}),
      requestMethod: request.method,
      requestUrl: request.url
    };

    // 检查 R2 bucket 绑定是否存在
    if (!env.SONG_BUCKET) {
      console.error('SONG_BUCKET binding not found in environment');
      return new Response(JSON.stringify({ 
        error: 'R2 bucket not configured', 
        message: 'SONG_BUCKET binding is missing. Please configure R2 binding in Cloudflare Pages settings.',
        troubleshooting: 'Go to Cloudflare Pages dashboard > Your site > Settings > Functions > R2 bucket bindings',
        diagnostics: diagnostics
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    // 处理 CORS 预检请求
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    // 1. List all objects from the R2 bucket
    const list = await env.SONG_BUCKET.list();
    const files = list.objects;

    console.log(`Found ${files.length} files in R2 bucket`);

    // 2. Group files by song folder
    const songsMap = new Map();
    for (const file of files) {
      const parts = file.key.split('/');
      
      // 支持嵌套结构：温州教会/歌曲1/file.mp3 或 直接结构：歌曲1/file.mp3
      let folderName, fileName, playlistName = "默认歌单";
      
      if (parts.length === 3) {
        // 嵌套结构：温州教会/歌曲1/file.mp3
        const parentFolder = parts[0];
        folderName = parts[1];
        fileName = parts[2];
        playlistName = parentFolder + "合集";
      } else if (parts.length === 2) {
        // 直接结构：歌曲1/file.mp3 或 列表丨温州教会/file.mp3
        folderName = parts[0];
        fileName = parts[1];
        
        // 检查是否有"列表丨"前缀
        const playlistMatch = folderName.match(/^列表丨(.+)$/);
        if (playlistMatch) {
          playlistName = playlistMatch[1] + "合集";
          folderName = parts[0]; // 保留原始文件夹名用于访问
        }
      } else {
        continue; // 忽略不符合结构的文件
      }

      // 为嵌套结构创建唯一的歌曲ID
      const songKey = parts.length === 3 ? `${parts[0]}/${parts[1]}` : folderName;
      
      if (!songsMap.has(songKey)) {
        let displayTitle = parts.length === 3 ? parts[1] : folderName;
        
        // 如果是"列表丨"前缀，去除前缀显示
        if (folderName.startsWith('列表丨')) {
          displayTitle = folderName.replace(/^列表丨/, '');
        }

        songsMap.set(songKey, {
          id: songKey.toLowerCase().replace(/\s+/g, '-').replace(/[\/\\]/g, '-'), // Generate a URL-friendly ID
          title: displayTitle, // 显示名称
          artist: "未知艺术家", // Default artist, can be updated if metadata is available
          folder: songKey, // 保留完整路径用于文件访问
          playlist: playlistName, // 添加歌单归属
          hasAccompaniment: false,
          files: {},
        });
      }

      const songData = songsMap.get(songKey);

      // 3. Identify file types
      if (fileName.includes('[伴奏].mp3')) {
        songData.files.accompaniment = fileName;
        songData.hasAccompaniment = true;
      } else if (fileName.endsWith('.mp3')) {
        songData.files.original = fileName;
      } else if (fileName.endsWith('.jpg') || fileName.endsWith('.png') || fileName.endsWith('.jpeg')) {
        songData.files.sheet = fileName;
      }
    }

    // 4. Convert map to array and return as JSON
    const songList = Array.from(songsMap.values());
    
    console.log(`Processed ${songList.length} songs`);
    
    const data = {
      songs: songList,
      metadata: {
        totalSongs: songList.length,
        totalFiles: files.length,
        generatedAt: new Date().toISOString(),
        bucketName: 'worship'
      },
      diagnostics: diagnostics
    };

    const response = new Response(JSON.stringify(data, null, 2), {
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        'Access-Control-Allow-Origin': '*', // Allow all origins (for development)
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'public, max-age=300', // 5分钟缓存
      },
    });

    return response;

  } catch (e) {
    console.error('Pages Function error:', e);
    const errorResponse = new Response(JSON.stringify({ 
      error: 'Could not list songs from R2 bucket.', 
      details: e.message,
      stack: e.stack,
      timestamp: new Date().toISOString(),
      diagnostics: {
        hasR2Binding: !!context.env.SONG_BUCKET,
        environmentKeys: Object.keys(context.env || {})
      }
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
    return errorResponse;
  }
}

// 兼容旧的 Worker 格式（如果直接作为 Worker 部署）
export default {
  async fetch(request, env, ctx) {
    return onRequest({ request, env, ctx });
  },
}; 
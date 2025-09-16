/**
 * Cloudflare Pages Function for dynamically listing songs from an R2 bucket
 * with playlist support.
 */

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

    // 2. Group files by song folder and identify playlists
    const songsMap = new Map();
    const playlistsMap = new Map();
    
    // 默认播放列表
    playlistsMap.set('default', {
      id: 'default',
      name: '默认播放列表',
      songs: []
    });

    for (const file of files) {
      const parts = file.key.split('/');
      
      // 处理不同的文件路径格式
      let folderName, fileName, playlistName;
      
      if (parts.length === 2) {
        // 标准格式: songFolder/file.mp3
        folderName = parts[0];
        fileName = parts[1];
        playlistName = 'default'; // 默认播放列表
      } else if (parts.length >= 3) {
        // 播放列表格式: playlistName/songFolder/file.mp3
        playlistName = parts[0];
        folderName = parts[1];
        fileName = parts[2];
        
        // 确保播放列表存在
        if (!playlistsMap.has(playlistName)) {
          playlistsMap.set(playlistName, {
            id: playlistName.toLowerCase().replace(/\s+/g, '-'),
            name: playlistName,
            songs: []
          });
        }
      } else {
        // 忽略根目录文件或其他不符合格式的文件
        continue;
      }

      // 创建歌曲对象（如果不存在）
      const songId = `${playlistName}-${folderName}`.toLowerCase().replace(/\s+/g, '-');
      if (!songsMap.has(songId)) {
        songsMap.set(songId, {
          id: songId,
          title: folderName,
          artist: "未知艺术家", // 默认艺术家
          folder: parts.length >= 3 ? `${playlistName}/${folderName}` : folderName,
          hasAccompaniment: false,
          files: {},
          playlist: playlistName // 记录歌曲所属的播放列表
        });
        
        // 将歌曲添加到对应的播放列表
        playlistsMap.get(playlistName).songs.push(songId);
      }

      const songData = songsMap.get(songId);

      // 3. 识别文件类型
      if (fileName.includes('[伴奏].mp3')) {
        songData.files.accompaniment = fileName;
        songData.hasAccompaniment = true;
      } else if (fileName.endsWith('.mp3')) {
        songData.files.original = fileName;
      } else if (fileName.endsWith('.jpg') || fileName.endsWith('.png') || fileName.endsWith('.jpeg')) {
        songData.files.sheet = fileName;
      }
    }

    // 4. 转换为数组并返回JSON
    const songList = Array.from(songsMap.values());
    const playlists = Array.from(playlistsMap.values());
    
    console.log(`处理了 ${songList.length} 首歌曲，${playlists.length} 个播放列表`);
    
    const data = {
      songs: songList,
      playlists: playlists,
      metadata: {
        totalSongs: songList.length,
        totalPlaylists: playlists.length,
        totalFiles: files.length,
        generatedAt: new Date().toISOString(),
        bucketName: 'worship'
      },
      diagnostics: diagnostics
    };

    const response = new Response(JSON.stringify(data, null, 2), {
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        'Access-Control-Allow-Origin': '*', // 允许所有来源（开发环境）
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


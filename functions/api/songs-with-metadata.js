/**
 * Cloudflare Pages Function for dynamically listing songs from an R2 bucket
 * with playlist support using a metadata file.
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

    // 检查 R2 bucket 绑定是否存在
    if (!env.SONG_BUCKET) {
      console.error('SONG_BUCKET binding not found in environment');
      return new Response(JSON.stringify({ 
        error: 'R2 bucket not configured', 
        message: 'SONG_BUCKET binding is missing. Please configure R2 binding in Cloudflare Pages settings.'
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

    // 1. 从R2存储桶中获取歌曲列表
    const list = await env.SONG_BUCKET.list();
    const files = list.objects;

    console.log(`Found ${files.length} files in R2 bucket`);

    // 2. 从R2存储桶中获取播放列表元数据文件
    let playlistsData = { playlists: [] };
    try {
      const playlistsFile = await env.SONG_BUCKET.get('playlists.json');
      if (playlistsFile) {
        const playlistsText = await playlistsFile.text();
        playlistsData = JSON.parse(playlistsText);
      }
    } catch (error) {
      console.warn('Could not load playlists.json, using default playlists:', error);
      // 如果无法加载元数据文件，继续使用空的播放列表数据
    }

    // 3. 处理歌曲文件
    const songsMap = new Map();
    for (const file of files) {
      const parts = file.key.split('/');
      if (parts.length < 2) continue; // 忽略根目录文件
      if (parts[0] === 'playlists.json') continue; // 忽略元数据文件

      const folderName = parts[0];
      const fileName = parts[1];

      if (!songsMap.has(folderName)) {
        songsMap.set(folderName, {
          id: folderName.toLowerCase().replace(/\s+/g, '-'), // 生成URL友好的ID
          title: folderName,
          artist: "未知艺术家", // 默认艺术家
          folder: folderName,
          hasAccompaniment: false,
          files: {},
        });
      }

      const songData = songsMap.get(folderName);

      // 4. 识别文件类型
      if (fileName.includes('[伴奏].mp3')) {
        songData.files.accompaniment = fileName;
        songData.hasAccompaniment = true;
      } else if (fileName.endsWith('.mp3')) {
        songData.files.original = fileName;
      } else if (fileName.endsWith('.jpg') || fileName.endsWith('.png') || fileName.endsWith('.jpeg')) {
        songData.files.sheet = fileName;
      }
    }

    // 5. 转换为数组
    const songList = Array.from(songsMap.values());
    
    // 6. 确保所有播放列表中的歌曲ID都有效
    const validSongIds = new Set(songList.map(song => song.id));
    playlistsData.playlists.forEach(playlist => {
      playlist.songs = playlist.songs.filter(songId => validSongIds.has(songId));
    });
    
    // 7. 添加默认播放列表（包含所有歌曲）
    if (!playlistsData.playlists.some(p => p.id === 'default')) {
      playlistsData.playlists.unshift({
        id: 'default',
        name: '全部歌曲',
        songs: songList.map(song => song.id)
      });
    }
    
    console.log(`Processed ${songList.length} songs and ${playlistsData.playlists.length} playlists`);
    
    const data = {
      songs: songList,
      playlists: playlistsData.playlists,
      metadata: {
        totalSongs: songList.length,
        totalPlaylists: playlistsData.playlists.length,
        totalFiles: files.length,
        generatedAt: new Date().toISOString()
      }
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
      timestamp: new Date().toISOString()
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


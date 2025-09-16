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

    // 2. 分析文件结构，识别播放列表和歌曲
    const songsMap = new Map(); // 存储所有歌曲
    const folderStructure = new Map(); // 存储文件夹结构
    const nestedFolders = new Set(); // 存储包含子文件夹的文件夹
    
    // 第一步：分析文件结构，找出所有嵌套文件夹
    for (const file of files) {
      const parts = file.key.split('/');
      if (parts.length < 2) continue; // 忽略根目录文件
      
      if (parts.length > 2) {
        // 这是嵌套结构
        const topFolder = parts[0];
        nestedFolders.add(topFolder);
      }
    }
    
    console.log(`Found ${nestedFolders.size} top-level folders with nested structure`);
    
    // 第二步：处理所有文件
    for (const file of files) {
      const parts = file.key.split('/');
      if (parts.length < 2) continue; // 忽略根目录文件
      
      const topFolder = parts[0];
      
      if (nestedFolders.has(topFolder)) {
        // 这是播放列表文件夹中的文件
        if (parts.length >= 3) {
          // 这是播放列表中的歌曲文件
          const playlistName = topFolder;
          const songFolder = parts[1];
          const fileName = parts[2];
          
          // 生成唯一ID
          const songId = `${playlistName}-${songFolder}`.toLowerCase().replace(/\s+/g, '-');
          
          // 创建或更新歌曲数据
          if (!songsMap.has(songId)) {
            songsMap.set(songId, {
              id: songId,
              title: songFolder, // 使用子文件夹名作为歌曲标题
              artist: "未知艺术家",
              folder: `${playlistName}/${songFolder}`, // 完整路径
              playlist: playlistName, // 归属于播放列表
              hasAccompaniment: false,
              files: {},
              isInNestedFolder: true // 标记为嵌套文件夹中的歌曲
            });
            console.log(`Found song in playlist: ${playlistName}/${songFolder}`);
          }
          
          const songData = songsMap.get(songId);
          
          // 识别文件类型
          if (fileName.includes('[伴奏].mp3')) {
            songData.files.accompaniment = fileName;
            songData.hasAccompaniment = true;
          } else if (fileName.endsWith('.mp3')) {
            songData.files.original = fileName;
          } else if (fileName.endsWith('.jpg') || fileName.endsWith('.png') || fileName.endsWith('.jpeg')) {
            songData.files.sheet = fileName;
          }
        }
      } else {
        // 这是普通歌曲文件夹
        const folderName = parts[0];
        const fileName = parts[1];
        
        if (!songsMap.has(folderName)) {
          // 解析歌单前缀
          let displayTitle = folderName;
          let playlistName = "默认歌单";
          
          // 检查是否有[歌单名]前缀
          const playlistMatch = folderName.match(/^\[([^\]]+)\](.+)$/);
          if (playlistMatch) {
            playlistName = playlistMatch[1] + "合集";
            displayTitle = playlistMatch[2];
            console.log(`Found song with playlist prefix: ${playlistName}, song: ${displayTitle}`);
          }
          
          songsMap.set(folderName, {
            id: folderName.toLowerCase().replace(/\s+/g, '-'),
            title: displayTitle,
            artist: "未知艺术家",
            folder: folderName,
            playlist: playlistName,
            hasAccompaniment: false,
            files: {},
            isInNestedFolder: false // 标记为非嵌套文件夹中的歌曲
          });
        }
        
        const songData = songsMap.get(folderName);
        
        // 识别文件类型
        if (fileName.includes('[伴奏].mp3')) {
          songData.files.accompaniment = fileName;
          songData.hasAccompaniment = true;
        } else if (fileName.endsWith('.mp3')) {
          songData.files.original = fileName;
        } else if (fileName.endsWith('.jpg') || fileName.endsWith('.png') || fileName.endsWith('.jpeg')) {
          songData.files.sheet = fileName;
        }
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
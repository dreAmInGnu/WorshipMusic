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
    
    // 第一步：统计每个文件夹中的MP3文件数量，识别播放列表
    const folderFiles = new Map(); // 存储每个文件夹中的文件
    const folderMp3Count = new Map(); // 存储每个文件夹中的MP3文件数量
    const playlistFolders = new Set(); // 存储被识别为播放列表的文件夹
    
    for (const file of files) {
      const parts = file.key.split('/');
      if (parts.length < 2) continue; // 忽略根目录文件
      
      const folderName = parts[0];
      const fileName = parts[1];
      
      // 初始化文件夹的文件列表
      if (!folderFiles.has(folderName)) {
        folderFiles.set(folderName, []);
        folderMp3Count.set(folderName, 0);
      }
      
      // 添加文件到文件夹的文件列表
      folderFiles.get(folderName).push({
        fileName: fileName,
        isMP3: fileName.endsWith('.mp3')
      });
      
      // 统计MP3文件数量
      if (fileName.endsWith('.mp3')) {
        folderMp3Count.set(folderName, folderMp3Count.get(folderName) + 1);
      }
    }
    
    // 识别播放列表文件夹（包含多个MP3文件的文件夹）
    for (const [folderName, mp3Count] of folderMp3Count.entries()) {
      if (mp3Count > 1) {
        playlistFolders.add(folderName);
        console.log(`Identified playlist folder: ${folderName} with ${mp3Count} MP3 files`);
      }
    }
    
    console.log(`Found ${playlistFolders.size} folders with multiple MP3 files (playlists)`);
    
    // 第二步：处理所有文件，创建歌曲数据
    const songsMap = new Map(); // 存储所有歌曲
    
    for (const file of files) {
      const parts = file.key.split('/');
      if (parts.length < 2) continue; // 忽略根目录文件
      
      const folderName = parts[0];
      const fileName = parts[1];
      
      if (playlistFolders.has(folderName)) {
        // 这是播放列表文件夹中的文件
        if (fileName.endsWith('.mp3')) {
          // 这是播放列表中的歌曲文件
          const isAccompaniment = fileName.includes('[伴奏]');
          
          // 从MP3文件名生成歌曲名（去掉扩展名和可能的[伴奏]标记）
          let songTitle = fileName.replace(/\.mp3$/, '');
          songTitle = songTitle.replace(/\[伴奏\]/, '').trim();
          
          console.log(`Processing MP3 file: ${fileName}, isAccompaniment: ${isAccompaniment}, songTitle: ${songTitle}`);
          
          // 为伴奏和原唱生成相同的ID，这样它们会被识别为同一首歌的不同版本
          const baseId = `${folderName}-${songTitle}`.toLowerCase().replace(/\s+/g, '-');
          
          // 如果是伴奏文件，我们尝试找到对应的原唱条目并更新它
          if (isAccompaniment) {
            // 查找是否已经有对应的原唱条目
            let found = false;
            for (const [id, song] of songsMap.entries()) {
              if (song.folder === folderName && song.title === songTitle) {
                // 找到对应的原唱条目，更新伴奏信息
                song.files.accompaniment = fileName;
                song.hasAccompaniment = true;
                console.log(`Updated accompaniment for song: ${songTitle} in playlist: ${folderName}`);
                found = true;
                break;
              }
            }
            
            // 如果没有找到对应的原唱条目，创建一个新条目
            if (!found) {
              const songId = baseId;
              songsMap.set(songId, {
                id: songId,
                title: songTitle,
                artist: "未知艺术家",
                folder: folderName,
                playlist: folderName,
                hasAccompaniment: true,
                files: {
                  accompaniment: fileName
                },
                isPlaylistItem: true
              });
              console.log(`Created new song entry for accompaniment: ${songTitle} in playlist: ${folderName}`);
            }
          } else {
            // 这是原唱文件，直接创建或更新条目
            const songId = baseId;
            
            if (!songsMap.has(songId)) {
              // 创建新条目
              songsMap.set(songId, {
                id: songId,
                title: songTitle,
                artist: "未知艺术家",
                folder: folderName,
                playlist: folderName,
                hasAccompaniment: false,
                files: {
                  original: fileName
                },
                isPlaylistItem: true
              });
              console.log(`Created new song entry: ${songTitle} in playlist: ${folderName}`);
            } else {
              // 更新现有条目
              const songData = songsMap.get(songId);
              songData.files.original = fileName;
              console.log(`Updated original for song: ${songTitle} in playlist: ${folderName}`);
            }
          }
          
          // 查找对应的歌谱文件
          const sheetFiles = folderFiles.get(folderName).filter(f => 
            (f.fileName.endsWith('.jpg') || f.fileName.endsWith('.png') || f.fileName.endsWith('.jpeg')) &&
            f.fileName.startsWith(songTitle)
          );
          
          if (sheetFiles.length > 0) {
            const songId = baseId;
            if (songsMap.has(songId)) {
              songsMap.get(songId).files.sheet = sheetFiles[0].fileName;
              console.log(`Added sheet music for song: ${songTitle} in playlist: ${folderName}`);
            }
          }
        }
      } else {
        // 这是普通歌曲文件夹（只有一个MP3文件）
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
            isPlaylistItem: false // 标记为非播放列表中的歌曲
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
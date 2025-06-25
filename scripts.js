// 全局变量
let songsData = null;
const R2_BASE_URL = "https://09f20cd563114fb98abd0e725a24a9ed.r2.cloudflarestorage.com/worship";
let currentSong = null;
let currentPlaylist = [];
let currentIndex = 0;
let isRandomMode = false;
let isPlaying = false;
let currentAudioType = 'original'; // 'original' 或 'accompaniment'

// DOM 元素
const elements = {
    appMain: null,
    songsList: null,
    searchInput: null,
    audioPlayer: null,
    originalBtn: null,
    accompanimentBtn: null,
    playPauseBtn: null,
    prevBtn: null,
    nextBtn: null,
    playModeBtn: null,
    progressSlider: null,
    volumeSlider: null,
    currentTime: null,
    duration: null,
    sheetDisplay: null,
    downloadZipBtn: null,
    downloadOriginalBtn: null,
    downloadAccompanimentBtn: null,
    downloadSheetBtn: null,
    loadingOverlay: null,
    errorToast: null,
    errorMessage: null,
    playerSection: null,
    playerToggleBtn: null,
    playerToggleText: null,
    playerToggleIcon: null
};

// 初始化应用
document.addEventListener('DOMContentLoaded', async function() {
    initializeElements();
    setupEventListeners();
    await loadSongsData();
    setupAudioEventListeners();
    setupStagewiseToolbar();
});

// 初始化DOM元素引用
function initializeElements() {
    elements.appMain = document.getElementById('appMain');
    elements.songsList = document.getElementById('songsList');
    elements.searchInput = document.getElementById('searchInput');
    elements.audioPlayer = document.getElementById('audioPlayer');
    elements.originalBtn = document.getElementById('originalBtn');
    elements.accompanimentBtn = document.getElementById('accompanimentBtn');
    elements.playPauseBtn = document.getElementById('playPauseBtn');
    elements.prevBtn = document.getElementById('prevBtn');
    elements.nextBtn = document.getElementById('nextBtn');
    elements.playModeBtn = document.getElementById('playModeBtn');
    elements.progressSlider = document.getElementById('progressSlider');
    elements.volumeSlider = document.getElementById('volumeSlider');
    elements.currentTime = document.getElementById('currentTime');
    elements.duration = document.getElementById('duration');
    elements.sheetDisplay = document.getElementById('sheetDisplay');
    elements.downloadZipBtn = document.getElementById('downloadZipBtn');
    elements.downloadOriginalBtn = document.getElementById('downloadOriginalBtn');
    elements.downloadAccompanimentBtn = document.getElementById('downloadAccompanimentBtn');
    elements.downloadSheetBtn = document.getElementById('downloadSheetBtn');
    elements.loadingOverlay = document.getElementById('loadingOverlay');
    elements.errorToast = document.getElementById('errorToast');
    elements.errorMessage = document.getElementById('errorMessage');
    elements.playerSection = document.getElementById('playerSection');
    elements.playerToggleBtn = document.getElementById('playerToggleBtn');
    elements.playerToggleText = document.getElementById('playerToggleText');
    elements.playerToggleIcon = document.getElementById('playerToggleIcon');
}

// 设置事件监听器
function setupEventListeners() {
    // 搜索功能
    elements.searchInput.addEventListener('input', handleSearch);
    
    // 播放控制按钮
    elements.originalBtn.addEventListener('click', () => switchToAudioType('original'));
    elements.accompanimentBtn.addEventListener('click', () => switchToAudioType('accompaniment'));
    elements.playPauseBtn.addEventListener('click', togglePlayPause);
    elements.prevBtn.addEventListener('click', playPreviousSong);
    elements.nextBtn.addEventListener('click', playNextSong);
    
    // 播放模式切换
    elements.playModeBtn.addEventListener('click', togglePlayMode);
    
    // 进度条和音量控制
    elements.progressSlider.addEventListener('input', handleProgressChange);
    elements.volumeSlider.addEventListener('input', handleVolumeChange);
    
    // 下载按钮
    elements.downloadZipBtn.addEventListener('click', downloadSongZip);
    elements.downloadOriginalBtn.addEventListener('click', () => downloadSingleFile('original'));
    elements.downloadAccompanimentBtn.addEventListener('click', () => downloadSingleFile('accompaniment'));
    elements.downloadSheetBtn.addEventListener('click', () => downloadSingleFile('sheet'));
    
    // 播放器收起/展开
    elements.playerToggleBtn.addEventListener('click', togglePlayerView);
    
    // 设置初始音量
    elements.audioPlayer.volume = elements.volumeSlider.value / 100;
}

// 设置 Stagewise 工具栏
function setupStagewiseToolbar() {
    // 仅在开发环境（localhost 或 127.0.0.1）中加载工具栏
    const devHostnames = ['localhost', '127.0.0.1'];
    if (devHostnames.includes(window.location.hostname)) {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@stagewise/toolbar/dist/browser.js';
        script.async = true;

        script.onload = () => {
            if (window.Stagewise) {
                window.Stagewise.initToolbar({
                    plugins: []
                });
            }
        };

        document.head.appendChild(script);
    }
}

// 设置音频播放器事件监听器
function setupAudioEventListeners() {
    const audio = elements.audioPlayer;
    
    audio.addEventListener('loadstart', () => showLoading(true));
    audio.addEventListener('canplay', () => showLoading(false));
    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleSongEnd);
    audio.addEventListener('error', handleAudioError);
    audio.addEventListener('play', () => {
        isPlaying = true;
        updatePlayButtons();
    });
    audio.addEventListener('pause', () => {
        isPlaying = false;
        updatePlayButtons();
    });
}

// 加载歌曲数据
async function loadSongsData() {
    try {
        showLoading(true);
        console.log('开始加载歌曲数据...');
        
        // The new API endpoint. This path works when deploying to Cloudflare Pages.
        // For local development, you might need to run the worker and adjust the URL.
        const response = await fetch('/api/songs');
        if (!response.ok) {
            throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
        }
        
        console.log('API 响应成功，开始解析数据...');
        const dynamicData = await response.json();
        songsData = dynamicData.songs; // The API returns an object with a "songs" property
        
        console.log(`成功加载 ${songsData.length} 首歌曲`);
        
        // --- 拼音排序逻辑 ---
        try {
            // 检查 pinyin-pro 库是否已加载
            if (typeof pinyinPro === 'undefined') {
                console.warn('pinyin-pro 库未加载，跳过拼音排序');
                // 如果库未加载，使用简单的字符排序
                songsData.forEach((song, index) => {
                    song.sortKey = song.title.toLowerCase();
                    song.indexLetter = song.title.charAt(0).toUpperCase();
                });
            } else {
                console.log('使用拼音排序...');
                const { pinyin } = pinyinPro;
                songsData.forEach(song => {
                    const firstChar = song.title.charAt(0);
                    let sortKey = pinyin(firstChar, { toneType: 'none', nonZh: 'consecutive' }).toLowerCase();
                    if (!/^[a-z]/.test(sortKey)) {
                        sortKey = '~' + sortKey;
                    }
                    song.sortKey = sortKey;
                    song.indexLetter = sortKey.charAt(0).toUpperCase();
                });
            }
            
            songsData.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
            console.log('歌曲排序完成');
        } catch (sortError) {
            console.error('排序处理失败:', sortError);
            // 排序失败时使用原始顺序，但仍然设置基本属性
            songsData.forEach((song, index) => {
                song.sortKey = song.title.toLowerCase();
                song.indexLetter = song.title.charAt(0).toUpperCase();
            });
        }
        // --- 排序结束 ---

        currentPlaylist = [...songsData];
        renderSongsList(currentPlaylist);
        console.log('歌曲列表渲染完成');
        showLoading(false);
    } catch (error) {
        console.error('加载歌曲数据失败:', error);
        
        // 更精确的错误信息
        let errorMessage = '加载失败';
        if (error.message.includes('API请求失败')) {
            errorMessage = 'API服务器连接失败，请稍后重试';
        } else if (error.message.includes('fetch')) {
            errorMessage = '网络连接错误，请检查网络连接';
        } else {
            errorMessage = '数据处理错误：' + error.message;
        }
        
        showError(errorMessage);
        showLoading(false);
    }
}

// 渲染歌曲列表
function renderSongsList(songs) {
    if (!elements.songsList || !songs) return;
    
    elements.songsList.innerHTML = '';
    
    songs.forEach((song, index) => {
        const songItem = document.createElement('div');
        songItem.className = 'song-item';
        songItem.dataset.songId = song.id;
        songItem.dataset.index = index;
        
        songItem.innerHTML = `
            <div class="song-info">
                <div class="song-title">${song.title}</div>
            </div>
            <div class="song-index-letter">${song.indexLetter}</div>
        `;
        
        songItem.addEventListener('click', () => selectSong(song, index));
        elements.songsList.appendChild(songItem);
    });
}

// 选择歌曲
function selectSong(song, index) {
    currentSong = song;
    currentIndex = index;
    
    // 更新UI
    updateActiveSongListItem();
    loadSheetMusic();
    updateSongControls();
    
    // 自动开始播放
    setTimeout(() => {
        playCurrentSong(currentAudioType);
    }, 100);
}

// 更新当前歌曲信息显示
function updateActiveSongListItem() {
    if (!currentSong) return;
    
    // 更新列表中的活跃状态
    document.querySelectorAll('.song-item').forEach(item => {
        item.classList.remove('active');
    });
    
    const activeItem = document.querySelector(`[data-song-id="${currentSong.id}"]`);
    if (activeItem) {
        activeItem.classList.add('active');
        activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

// 更新活跃播放列表
function updateActivePlaylist() {
    // 根据当前搜索结果更新播放列表
    const searchTerm = elements.searchInput.value.toLowerCase().trim();
    if (searchTerm) {
        currentPlaylist = songsData.filter(song => 
            song.title.toLowerCase().includes(searchTerm) ||
            song.artist.toLowerCase().includes(searchTerm)
        );
    } else {
        currentPlaylist = [...songsData];
    }
    
    // 更新当前索引
    currentIndex = currentPlaylist.findIndex(song => song.id === currentSong.id);
}

// 启用/禁用播放和下载控件
function updateSongControls() {
    if (!currentSong) return;
    
    elements.originalBtn.disabled = false;
    elements.accompanimentBtn.disabled = !currentSong.hasAccompaniment;
    elements.playPauseBtn.disabled = false;
    elements.prevBtn.disabled = false;
    elements.nextBtn.disabled = false;
    
    // 下载按钮
    elements.downloadZipBtn.disabled = false;
    elements.downloadOriginalBtn.disabled = !currentSong.files.original;
    elements.downloadAccompanimentBtn.disabled = !currentSong.hasAccompaniment || !currentSong.files.accompaniment;
    elements.downloadSheetBtn.disabled = !currentSong.files.sheet;
    
    // 默认选择原唱
    updateAudioTypeButtons('original');
}

// 播放当前歌曲
async function playCurrentSong(type) {
    if (!currentSong) return;
    
    try {
        currentAudioType = type;
        const audioUrl = buildAudioUrl(currentSong, type);
        
        showLoading(true);
        elements.audioPlayer.src = audioUrl;
        
        await elements.audioPlayer.play();
        updatePlayButtons();
    } catch (error) {
        console.error('播放失败:', error);
        showError(`无法播放${type === 'original' ? '原唱' : '伴奏'}，请检查文件是否存在`);
        showLoading(false);
    }
}

// 构建音频URL
function buildAudioUrl(song, type) {
    const fileName = type === 'original' ? song.files.original : song.files.accompaniment;
    return `${R2_BASE_URL}/${song.folder}/${fileName}`;
}

// 切换播放/暂停
function togglePlayPause() {
    if (!currentSong) return;
    
    if (elements.audioPlayer.paused) {
        // 如果没有音频源，先加载当前选择的音频类型
        if (!elements.audioPlayer.src) {
            playCurrentSong(currentAudioType);
        } else {
            elements.audioPlayer.play();
        }
    } else {
        elements.audioPlayer.pause();
    }
}

// 更新播放按钮状态
function updatePlayButtons() {
    const isCurrentlyPlaying = !elements.audioPlayer.paused;
    
    if (isCurrentlyPlaying) {
        elements.playPauseBtn.innerHTML = '⏸️';
        elements.playPauseBtn.classList.add('playing');
        elements.playPauseBtn.title = '暂停';
    } else {
        elements.playPauseBtn.innerHTML = '▶️';
        elements.playPauseBtn.classList.remove('playing');
        elements.playPauseBtn.title = '播放';
    }
}

// 切换音频类型
function switchToAudioType(type) {
    if (!currentSong) return;
    
    // 如果是伴奏但当前歌曲没有伴奏，直接返回
    if (type === 'accompaniment' && !currentSong.hasAccompaniment) return;
    
    currentAudioType = type;
    updateAudioTypeButtons(type);
    
    // 如果当前正在播放，则切换音频源
    if (!elements.audioPlayer.paused) {
        playCurrentSong(type);
    }
}

// 更新音频类型按钮状态
function updateAudioTypeButtons(type) {
    elements.originalBtn.classList.toggle('active', type === 'original');
    elements.accompanimentBtn.classList.toggle('active', type === 'accompaniment');
}

// 切换播放模式
function togglePlayMode() {
    isRandomMode = !isRandomMode;
    
    if (isRandomMode) {
        elements.playModeBtn.innerHTML = '🔀 随机播放';
        elements.playModeBtn.classList.add('random');
        elements.playModeBtn.title = '当前为随机播放模式';
    } else {
        elements.playModeBtn.innerHTML = '🔄 顺序播放';
        elements.playModeBtn.classList.remove('random');
        elements.playModeBtn.title = '当前为顺序播放模式';
    }
}

// 处理歌曲结束
function handleSongEnd() {
    if (isRandomMode) {
        playRandomSong();
    } else {
        playNextSong();
    }
}

// 播放下一首歌曲
function playNextSong() {
    if (currentPlaylist.length === 0) return;
    
    currentIndex = (currentIndex + 1) % currentPlaylist.length;
    const nextSong = currentPlaylist[currentIndex];
    selectSong(nextSong, currentIndex);
}

// 播放上一首歌曲
function playPreviousSong() {
    if (currentPlaylist.length === 0) return;
    
    currentIndex = (currentIndex - 1 + currentPlaylist.length) % currentPlaylist.length;
    const prevSong = currentPlaylist[currentIndex];
    selectSong(prevSong, currentIndex);
}

// 播放随机歌曲
function playRandomSong() {
    if (currentPlaylist.length === 0) return;
    
    const randomIndex = Math.floor(Math.random() * currentPlaylist.length);
    const randomSong = currentPlaylist[randomIndex];
    currentIndex = randomIndex;
    selectSong(randomSong, currentIndex);
}

// 处理搜索
function handleSearch() {
    const searchTerm = elements.searchInput.value.toLowerCase().trim();
    
    if (!songsData) return;
    
    let filteredSongs;
    if (searchTerm) {
        filteredSongs = songsData.filter(song => 
            song.title.toLowerCase().includes(searchTerm) ||
            song.artist.toLowerCase().includes(searchTerm)
        );
    } else {
        filteredSongs = songsData;
    }
    
    renderSongsList(filteredSongs);
}

// 加载歌谱
function loadSheetMusic() {
    if (!currentSong || !currentSong.files.sheet) {
        elements.sheetDisplay.innerHTML = `
            <div class="sheet-placeholder">
                <p>🎼</p>
                <p>暂无歌谱</p>
            </div>
        `;
        return;
    }
    
    const sheetUrl = `${R2_BASE_URL}/${currentSong.folder}/${currentSong.files.sheet}`;
    elements.sheetDisplay.innerHTML = `
        <img src="${sheetUrl}" alt="${currentSong.title} 歌谱" class="sheet-image" 
             onerror="this.parentElement.innerHTML='<div class=\\'sheet-placeholder\\'><p>🎼</p><p>歌谱加载失败</p></div>'">
    `;
}

// 下载当前歌曲所有文件 (ZIP)
async function downloadSongZip() {
    if (!currentSong) return;
    
    try {
        showLoading(true);
        
        const zip = new JSZip();
        const folder = zip.folder(currentSong.title);
        
        // 下载原唱
        await addFileToZip(folder, currentSong.files.original, `${R2_BASE_URL}/${currentSong.folder}/${currentSong.files.original}`);
        
        // 下载伴奏（如果有）
        if (currentSong.hasAccompaniment && currentSong.files.accompaniment) {
            await addFileToZip(folder, currentSong.files.accompaniment, `${R2_BASE_URL}/${currentSong.folder}/${currentSong.files.accompaniment}`);
        }
        
        // 下载歌谱
        if (currentSong.files.sheet) {
            await addFileToZip(folder, currentSong.files.sheet, `${R2_BASE_URL}/${currentSong.folder}/${currentSong.files.sheet}`);
        }
        
        // 生成ZIP文件并下载
        const content = await zip.generateAsync({type: 'blob'});
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = `${currentSong.title}.zip`;
        link.click();
        
        showLoading(false);
    } catch (error) {
        console.error('下载失败:', error);
        showError('文件打包下载失败，请稍后重试');
        showLoading(false);
    }
}

// 下载单个文件
async function downloadSingleFile(type) {
    if (!currentSong) return;

    let fileUrl, fileName;
    const song = currentSong;
    const baseUrl = R2_BASE_URL;

    switch (type) {
        case 'original':
            if (!song.files.original) { showError('该歌曲没有歌曲文件'); return; }
            fileName = song.files.original;
            fileUrl = `${baseUrl}/${song.folder}/${fileName}`;
            break;
        case 'accompaniment':
            if (!song.hasAccompaniment || !song.files.accompaniment) { showError('该歌曲没有伴奏文件'); return; }
            fileName = song.files.accompaniment;
            fileUrl = `${baseUrl}/${song.folder}/${fileName}`;
            break;
        case 'sheet':
            if (!song.files.sheet) { showError('该歌曲没有歌谱文件'); return; }
            fileName = song.files.sheet;
            fileUrl = `${baseUrl}/${song.folder}/${fileName}`;
            break;
        default:
            return;
    }

    try {
        showLoading(true);
        // 使用 fetch 获取 blob
        const response = await fetch(fileUrl);
        if (!response.ok) {
            throw new Error(`文件下载失败: ${response.status}`);
        }
        const blob = await response.blob();
        
        // 创建下载链接
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
        showLoading(false);
    } catch (error) {
        console.error(`下载文件[${type}]失败:`, error);
        showError(`无法下载文件: ${fileName}`);
        showLoading(false);
    }
}

// 添加文件到ZIP
async function addFileToZip(folder, fileName, url) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const blob = await response.blob();
        folder.file(fileName, blob);
    } catch (error) {
        console.warn(`无法下载文件 ${fileName}:`, error);
    }
}

// 进度条控制
function handleProgressChange() {
    if (elements.audioPlayer.duration) {
        const newTime = (elements.progressSlider.value / 100) * elements.audioPlayer.duration;
        elements.audioPlayer.currentTime = newTime;
    }
}

// 音量控制
function handleVolumeChange() {
    elements.audioPlayer.volume = elements.volumeSlider.value / 100;
}

// 更新播放进度
function updateProgress() {
    if (elements.audioPlayer.duration) {
        const progress = (elements.audioPlayer.currentTime / elements.audioPlayer.duration) * 100;
        elements.progressSlider.value = progress;
        
        elements.currentTime.textContent = formatTime(elements.audioPlayer.currentTime);
    }
}

// 更新时长显示
function updateDuration() {
    elements.duration.textContent = formatTime(elements.audioPlayer.duration);
}

// 格式化时间
function formatTime(seconds) {
    if (isNaN(seconds)) return '00:00';
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// 处理音频错误
function handleAudioError() {
    console.error('音频播放错误');
    showError('音频文件无法播放，请检查文件是否存在');
    showLoading(false);
}

// 显示/隐藏加载状态
function showLoading(show) {
    elements.loadingOverlay.style.display = show ? 'flex' : 'none';
}

// 显示错误消息
function showError(message) {
    elements.errorMessage.textContent = message;
    elements.errorToast.style.display = 'flex';
    
    // 3秒后自动隐藏
    setTimeout(() => {
        hideError();
    }, 3000);
}

// 隐藏错误消息
function hideError() {
    elements.errorToast.style.display = 'none';
}

// 切换播放器视图（收起/展开）
function togglePlayerView() {
    elements.appMain.classList.toggle('player-collapsed');
    elements.playerSection.classList.toggle('collapsed');
    
    const isCollapsed = elements.playerSection.classList.contains('collapsed');
    elements.playerToggleIcon.innerHTML = isCollapsed ? '🔽' : '🔼';
    elements.playerToggleText.textContent = isCollapsed ? '展开' : '折叠';
    elements.playerToggleBtn.title = isCollapsed ? '展开播放器' : '收起播放器';
} 
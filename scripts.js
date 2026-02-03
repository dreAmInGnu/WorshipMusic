// 全局变量
let songsData = null;
const R2_BASE_URL = "https://r2.windsmaker.com";
let currentSong = null;
let currentPlaylist = [];
let currentIndex = 0;
// 播放模式：0=顺序播放, 1=随机播放, 2=单曲循环, 3=列表循环, 4=全部循环
let playMode = 0;
// 歌单管理
let playlistsData = {};
let currentPlaylistName = "全部歌曲";
let isPlaying = false;
let currentAudioType = 'original'; // 'original' 或 'accompaniment'
// 静音状态管理
let isMuted = false;
let volumeBeforeMute = 100;

// DOM 元素
const elements = {
    appMain: null,
    songsList: null,
    searchInput: null,
    clearSearchBtn: null,
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
    playerToggleIcon: null,
    playerCollapsibleContent: null,
    sheetModal: null,
    modalSheetImage: null,
    closeSheetModal: null,
    progressSongTitle: null,
    collapsedSongTitle: null,
    // 播放列表相关元素
    addToPlaylistBtn: null,
    showPlaylistBtn: null,
    playlistModal: null,
    closePlaylistModal: null,
    playlistSelector: null,
    playlistItems: null,
    createPlaylistBtn: null,
    renamePlaylistBtn: null,
    deletePlaylistBtn: null,
    clearPlaylistBtn: null,
    playAllBtn: null,
    playlistPrevBtn: null,
    playlistNextBtn: null
};

// 测试API连接
function testApiConnection() {
    console.log('开始测试API连接...');
    
    // 测试custom-letters API
    fetch('/api/custom-letters')
        .then(response => {
            console.log('API响应状态:', response.status, response.statusText);
            return response.text();
        })
        .then(text => {
            console.log('API响应内容长度:', text.length);
            console.log('API响应内容前100个字符:', text.substring(0, 100));
            
            try {
                const data = JSON.parse(text);
                console.log('API响应解析成功:', data);
                showMessage('API连接测试成功');
            } catch (e) {
                console.error('解析API响应失败:', e);
                showError('API响应解析失败');
            }
        })
        .catch(error => {
            console.error('API连接测试失败:', error);
            showError(`API连接测试失败: ${error.message}`);
        });
}

// 检测是否是iOS Safari
function isIOSSafari() {
    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
    const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
    return isIOS || isSafari;
}

// iOS Safari音频预加载
function initIOSAudio() {
    if (isIOSSafari()) {
        console.log('🍎 检测到iOS Safari，初始化音频播放器...');
        // 在iOS上，需要用户交互才能初始化音频
        const audioElement = document.getElementById('audioPlayer');
        if (audioElement) {
            // 设置音频属性以提高兼容性
            audioElement.setAttribute('playsinline', '');
            audioElement.setAttribute('webkit-playsinline', '');
            console.log('✅ iOS Safari音频播放器已配置');
        }
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', async function() {
    initializeElements();
    setupEventListeners();
    
    // iOS Safari特殊处理
    initIOSAudio();
    
    // 加载自定义字母（异步）
    const customLetters = await loadCustomLetters();
    console.log('加载的自定义字母总数:', Object.keys(customLetters).length);
    
    // 初始化自定义字母模态框
    initCustomLetterModal();
    
    await loadSongsData();
    setupAudioEventListeners();
    setupStagewiseToolbar();
    setupCoverImage();
    
    // 初始化折叠图标
    updateToggleIcon();
    
    // 检查URL参数，自动播放指定歌曲
    checkUrlParameters();
    
    // 在开发环境中添加测试按钮
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        const testButton = document.createElement('button');
        testButton.textContent = '测试API连接';
        testButton.style.position = 'fixed';
        testButton.style.bottom = '10px';
        testButton.style.right = '10px';
        testButton.style.zIndex = '9999';
        testButton.style.padding = '5px 10px';
        testButton.style.backgroundColor = '#007bff';
        testButton.style.color = 'white';
        testButton.style.border = 'none';
        testButton.style.borderRadius = '4px';
        testButton.style.cursor = 'pointer';
        
        testButton.addEventListener('click', testApiConnection);
        
        document.body.appendChild(testButton);
    }
});

// 初始化DOM元素引用
function initializeElements() {
    elements.appMain = document.getElementById('appMain');
    elements.songsList = document.getElementById('songsList');
    elements.searchInput = document.getElementById('searchInput');
    elements.clearSearchBtn = document.getElementById('clearSearchBtn');
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
    elements.playerCollapsibleContent = document.getElementById('playerCollapsibleContent');
    elements.sheetModal = document.getElementById('sheetModal');
    elements.modalSheetImage = document.getElementById('modalSheetImage');
    elements.closeSheetModal = document.getElementById('closeSheetModal');
    elements.progressSongTitle = document.getElementById('progressSongTitle');
    elements.collapsedSongTitle = document.getElementById('collapsedSongTitle');
    elements.volumeBtn = document.getElementById('volumeBtn');
    elements.collapsedPlayerControls = document.getElementById('collapsedPlayerControls');
    elements.collapsedPrevBtn = document.getElementById('collapsedPrevBtn');
    elements.collapsedPlayPauseBtn = document.getElementById('collapsedPlayPauseBtn');
    elements.collapsedNextBtn = document.getElementById('collapsedNextBtn');
    elements.collapsedSearchBox = document.getElementById('collapsedSearchBox');
    elements.collapsedSearchInput = document.getElementById('collapsedSearchInput');
    elements.collapsedClearSearchBtn = document.getElementById('collapsedClearSearchBtn');
    elements.worshipResourceBtn = document.getElementById('worshipResourceBtn');
    
    // 初始化播放列表相关元素
    elements.addToPlaylistBtn = document.getElementById('addToPlaylistBtn');
    elements.showPlaylistBtn = document.getElementById('showPlaylistBtn');
    elements.playlistModal = document.getElementById('playlistModal');
    elements.closePlaylistModal = document.getElementById('closePlaylistModal');
    elements.playlistSelector = document.getElementById('playlistSelector');
    elements.playlistItems = document.getElementById('playlistItems');
    elements.createPlaylistBtn = document.getElementById('createPlaylistBtn');
    elements.renamePlaylistBtn = document.getElementById('renamePlaylistBtn');
    elements.deletePlaylistBtn = document.getElementById('deletePlaylistBtn');
    elements.clearPlaylistBtn = document.getElementById('clearPlaylistBtn');
    elements.playAllBtn = document.getElementById('playAllBtn');
    elements.playlistPrevBtn = document.getElementById('playlistPrevBtn');
    elements.playlistNextBtn = document.getElementById('playlistNextBtn');
    
    // 初始化播放列表按钮容器
    elements.playlistButtonsContainer = document.getElementById('playlistButtonsContainer');
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
    elements.volumeBtn.addEventListener('click', toggleMute);
    
    // 下载按钮
    elements.downloadZipBtn.addEventListener('click', downloadSongZip);
    elements.downloadOriginalBtn.addEventListener('click', () => downloadSingleFile('original'));
    elements.downloadAccompanimentBtn.addEventListener('click', () => downloadSingleFile('accompaniment'));
    elements.downloadSheetBtn.addEventListener('click', () => downloadSingleFile('sheet'));
    
    // 播放器收起/展开
    elements.playerToggleBtn.addEventListener('click', togglePlayerView);
    
    // 折叠状态播放控制按钮
    elements.collapsedPrevBtn.addEventListener('click', playPreviousSong);
    elements.collapsedPlayPauseBtn.addEventListener('click', togglePlayPause);
    elements.collapsedNextBtn.addEventListener('click', playNextSong);
    
    // 折叠状态搜索功能
    elements.collapsedSearchInput.addEventListener('input', handleCollapsedSearch);
    elements.collapsedClearSearchBtn.addEventListener('click', clearCollapsedSearch);
    
    // Sheet music modal
    elements.sheetDisplay.addEventListener('click', openSheetModal);
    elements.closeSheetModal.addEventListener('click', closeSheetModal);
    elements.sheetModal.addEventListener('click', (e) => {
        if (e.target === elements.sheetModal) {
            closeSheetModal();
        }
    });
    
    // 设置初始音量
    elements.audioPlayer.volume = 1.0; // 默认最大音量

    // 清除搜索按钮
    elements.clearSearchBtn.addEventListener('click', () => {
        elements.searchInput.value = '';
        elements.collapsedSearchInput.value = '';
        performSearch('');
    });
    
    // 播放列表相关事件监听器
    if (elements.addToPlaylistBtn) {
        elements.addToPlaylistBtn.addEventListener('click', () => {
            if (currentSong) {
                addSongToPlaylist(currentSong);
            }
        });
    }
    
    if (elements.showPlaylistBtn) {
        elements.showPlaylistBtn.addEventListener('click', openPlaylistModal);
    }
    
    if (elements.closePlaylistModal) {
        elements.closePlaylistModal.addEventListener('click', closePlaylistModal);
    }
    
    if (elements.playlistModal) {
        elements.playlistModal.addEventListener('click', (e) => {
            if (e.target === elements.playlistModal) {
                closePlaylistModal();
            }
        });
    }
    
    if (elements.createPlaylistBtn) {
        elements.createPlaylistBtn.addEventListener('click', createNewPlaylist);
    }
    
    if (elements.renamePlaylistBtn) {
        elements.renamePlaylistBtn.addEventListener('click', renameCurrentPlaylist);
    }
    
    if (elements.deletePlaylistBtn) {
        elements.deletePlaylistBtn.addEventListener('click', deleteCurrentPlaylist);
    }
    
    if (elements.clearPlaylistBtn) {
        elements.clearPlaylistBtn.addEventListener('click', clearCurrentPlaylist);
    }
    
    if (elements.playAllBtn) {
        elements.playAllBtn.addEventListener('click', playAllFromPlaylist);
    }
    
    if (elements.playlistSelector) {
        elements.playlistSelector.addEventListener('change', loadSelectedPlaylist);
    }
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
    
    // 移除loadstart的自动加载状态，改为手动控制
    // audio.addEventListener('loadstart', () => showLoading(true));
    
    audio.addEventListener('loadstart', () => {
        console.log('🔄 loadstart: 开始加载音频');
    });
    
    audio.addEventListener('loadeddata', () => {
        console.log('📦 loadeddata: 音频数据已加载');
    });
    
    audio.addEventListener('canplay', () => {
        console.log('✅ canplay: 音频可以播放');
        showLoading(false);
    });
    
    audio.addEventListener('canplaythrough', () => {
        console.log('✅ canplaythrough: 音频可以流畅播放');
    });
    
    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleSongEnd);
    audio.addEventListener('error', handleAudioError);
    
    audio.addEventListener('play', () => {
        console.log('▶️ play: 音频开始播放');
        isPlaying = true;
        updatePlayButtons();
    });
    
    audio.addEventListener('pause', () => {
        console.log('⏸️ pause: 音频暂停');
        isPlaying = false;
        updatePlayButtons();
    });
    
    audio.addEventListener('waiting', () => {
        console.log('⏳ waiting: 等待数据');
    });
    
    audio.addEventListener('stalled', () => {
        console.log('⚠️ stalled: 数据加载停滞');
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
        
        const responseText = await response.text();
        
        try {
            const dynamicData = JSON.parse(responseText);
            
            if (!dynamicData.songs || !Array.isArray(dynamicData.songs)) {
                console.error('API响应中没有songs数组');
                throw new Error('API响应格式不正确，缺少songs数组');
            }
            
            songsData = dynamicData.songs; // The API returns an object with a "songs" property
            console.log(`成功加载 ${songsData.length} 首歌曲`);
        } catch (jsonError) {
            console.error('JSON解析失败:', jsonError.message);
            throw new Error('API响应格式不正确，无法解析JSON');
        }
        
        // --- 拼音排序逻辑 ---
        try {
            // 获取用户自定义的字母
            const customLetters = getCustomLetters();
            
            songsData.forEach((song, index) => {
                const firstChar = song.title.charAt(0);
                
                // 优先使用用户自定义的字母
                let indexLetter;
                if (customLetters[song.id] && customLetters[song.id].letter) {
                    indexLetter = customLetters[song.id].letter;
                } else {
                    // 使用整个歌曲名作为上下文进行更准确的拼音识别
                    indexLetter = getPinyinLetter(firstChar, song.title);
                }
                
                // 排序键只包含索引字母和歌曲名
                song.sortKey = indexLetter.toLowerCase() + song.title.toLowerCase();
                song.indexLetter = indexLetter;
            });
            
            // 简单按照索引字母和歌曲名排序
            songsData.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
            console.log('歌曲排序完成');
        } catch (sortError) {
            console.error('排序处理失败:', sortError);
            // 排序失败时使用原始顺序，但仍然设置基本属性
            songsData.forEach((song, index) => {
                const firstChar = song.title.charAt(0);
                let indexLetter = getPinyinLetter(firstChar);
                song.sortKey = indexLetter.toLowerCase() + song.title.toLowerCase();
                song.indexLetter = indexLetter;
            });
        }
        // --- 排序结束 ---

        // --- 构建歌单数据结构 ---
        playlistsData = { "默认歌单": [] };
        songsData.forEach(song => {
            const playlistName = song.playlist || "默认歌单";
            if (!playlistsData[playlistName]) {
                playlistsData[playlistName] = [];
            }
            playlistsData[playlistName].push(song);
        });
        
        console.log('歌单构建完成:', Object.keys(playlistsData));
        // --- 歌单构建结束 ---

        currentPlaylist = [...songsData];
        renderSongsList(currentPlaylist);
        renderPlaylistButtons(); // 渲染播放列表快速切换按钮
        updatePlaybackControls(true); // 关键修复：加载完成后启用播放控件
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
        updatePlaybackControls(false); // 确保在加载失败时禁用控件
    }
}

// 渲染歌曲列表
function renderSongsList(songs) {
    if (!elements.songsList || !songs) return;
    
    elements.songsList.innerHTML = '';
    
    // 如果在歌单内，显示返回按钮
    if (currentPlaylistName !== "全部歌曲") {
        const backItem = document.createElement('div');
        backItem.className = 'song-item back-item';
        backItem.innerHTML = `
            <div class="song-info">
                <div class="song-title">← 返回全部歌曲</div>
            </div>
            <div class="song-actions">
                <div class="song-index-letter">🔙</div>
            </div>
        `;
        
        const songInfo = backItem.querySelector('.song-info');
        songInfo.addEventListener('click', () => {
            currentPlaylistName = "全部歌曲";
            currentPlaylist = [...songsData];
            renderSongsList(currentPlaylist);
        });
        
        elements.songsList.appendChild(backItem);
    }
    
    // 渲染服务器端歌单（只在显示全部歌曲时显示）
    if (currentPlaylistName === "全部歌曲" && playlistsData) {
        console.log('渲染歌单列表:', Object.keys(playlistsData));
        
        // 获取所有播放列表名称并排序（确保"默认歌单"排在最后）
        const playlistNames = Object.keys(playlistsData).sort((a, b) => {
            if (a === "默认歌单") return 1;
            if (b === "默认歌单") return -1;
            return a.localeCompare(b);
        });
        
        // 首先渲染服务器端歌单（基于文件夹结构）
        playlistNames.forEach(playlistName => {
            if (playlistName !== "默认歌单" && playlistsData[playlistName].length > 0) {
                console.log(`渲染歌单: ${playlistName}, 歌曲数量: ${playlistsData[playlistName].length}`);
                const playlistItem = document.createElement('div');
                playlistItem.className = 'song-item playlist-item server-playlist';
                playlistItem.dataset.playlistName = playlistName;
                
                playlistItem.innerHTML = `
                    <div class="song-info">
                        <div class="song-title">📁 ${playlistName} (${playlistsData[playlistName].length}首)</div>
                    </div>
                    <div class="song-actions">
                        <div class="song-index-letter">♪</div>
                    </div>
                `;
                
                // 为歌单添加点击事件
                const songInfo = playlistItem.querySelector('.song-info');
                songInfo.addEventListener('click', () => selectPlaylist(playlistName));
                
                elements.songsList.appendChild(playlistItem);
                console.log(`歌单 ${playlistName} 渲染完成，class: ${playlistItem.className}`);
            }
        });
        
        // 添加分隔线
        if (playlistNames.filter(name => name !== "默认歌单").length > 0) {
            const separator = document.createElement('div');
            separator.className = 'playlist-separator';
            separator.innerHTML = '<div class="separator-line"></div><div class="separator-text">所有歌曲</div><div class="separator-line"></div>';
            elements.songsList.appendChild(separator);
        }
    }
    
    // 过滤掉在全部歌曲视图中不应该显示的歌曲（播放列表内的歌曲）
    const filteredSongs = currentPlaylistName === "全部歌曲" ? 
        songs.filter(song => !song.isPlaylistItem) : songs;
    
    // 渲染歌曲
    filteredSongs.forEach((song, index) => {
        const songItem = document.createElement('div');
        songItem.className = 'song-item';
        songItem.dataset.songId = song.id;
        songItem.dataset.index = index;
        
        // 检查是否是自定义字母
        const customLetters = getCustomLetters();
        const isCustom = customLetters[song.id] ? 'custom' : '';
        
        songItem.innerHTML = `
            <div class="song-info">
                <div class="song-title">${song.title}</div>
            </div>
            <div class="song-actions">
                <button class="share-btn" onclick="copyShareLink(${JSON.stringify(song).replace(/"/g, '&quot;')});" title="分享歌曲链接">
                    🔗
                </button>
                <div class="song-index-letter ${isCustom}" onclick="editSongLetter('${song.id}', '${song.title}', '${song.indexLetter}')" title="${isCustom ? '自定义字母 - 点击编辑' : '自动识别字母 - 点击编辑'}">${song.indexLetter}</div>
            </div>
        `;
        
        // 为歌曲信息区域添加点击事件（排除分享按钮）
        const songInfo = songItem.querySelector('.song-info');
        songInfo.addEventListener('click', () => selectSong(song, index, true)); // 用户点击时自动播放
        
        elements.songsList.appendChild(songItem);
    });
}

// 选择歌曲
function selectSong(song, index, autoPlay = false) {
    currentSong = song;
    currentIndex = index;
    
    // 先清理音频播放器状态
    resetAudioPlayer();
    
    // 更新UI
    updateActiveSongListItem();
    loadSheetMusic();
    updateSongControls();
    updateSongTitles();
    
    // 更新URL以包含当前歌曲
    updateUrlWithSong(song);
    
    // 🍎 iOS Safari修复：点击歌曲是用户交互，可以自动播放
    const isIOSDevice = isIOSSafari();
    
    console.log(`📱 设备检测: iOS=${isIOSDevice}, autoPlay请求=${autoPlay}`);

    // 根据autoPlay参数决定是否自动播放
    if (autoPlay) {
        console.log('▶️ 用户点击歌曲，开始播放');
        playCurrentSong(currentAudioType);
    } else {
        // 不自动播放，但预加载音频
        console.log(`✋ 歌曲已选中: ${currentSong.title}，等待手动播放`);
        
        // 预加载音频源但不播放
        const audioUrl = buildAudioUrl(currentSong, currentAudioType);
        if (audioUrl) {
            // 🔧 修复：先重置，再设置新的src，最后调用load()
            elements.audioPlayer.pause();
            elements.audioPlayer.currentTime = 0;
            elements.audioPlayer.src = audioUrl;
            // 显式调用load()以开始加载音频
            elements.audioPlayer.load();
            console.log('🔊 音频源已设置并开始加载，请点击播放按钮');
        }
        
        // 确保停止任何可能的加载状态
        showLoading(false);
    }
}

// 重置音频播放器状态
function resetAudioPlayer() {
    if (elements.audioPlayer) {
        elements.audioPlayer.pause();
        elements.audioPlayer.currentTime = 0;
        // 不清空src，避免触发不必要的事件
        
        // 🔧 修复：立即更新播放按钮状态
        updatePlayButtons();
        
        console.log('音频播放器状态已重置');
    }
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

// 渲染播放列表快速切换按钮
function renderPlaylistButtons() {
    if (!elements.playlistButtonsContainer) return;
    
    // 清空容器
    elements.playlistButtonsContainer.innerHTML = '';
    
    if (!playlistsData) return;
    
    // 添加"全部歌曲"按钮
    const allSongsButton = document.createElement('div');
    allSongsButton.className = `playlist-button ${currentPlaylistName === "全部歌曲" ? 'active' : ''}`;
    allSongsButton.innerHTML = `
        <span class="playlist-icon">🎵</span>
        <span>全部歌曲</span>
        <span class="playlist-count">${songsData.length}</span>
    `;
    allSongsButton.addEventListener('click', () => {
        if (currentPlaylistName !== "全部歌曲") {
            currentPlaylistName = "全部歌曲";
            currentPlaylist = [...songsData];
            renderSongsList(currentPlaylist);
            updatePlaylistButtons();
        }
    });
    elements.playlistButtonsContainer.appendChild(allSongsButton);
    
    // 获取所有播放列表名称并排序（确保"默认歌单"排在最后）
    const playlistNames = Object.keys(playlistsData).sort((a, b) => {
        if (a === "默认歌单") return 1;
        if (b === "默认歌单") return -1;
        return a.localeCompare(b);
    });
    
    // 添加其他播放列表按钮
    playlistNames.forEach(playlistName => {
        if (playlistName !== "默认歌单" && playlistsData[playlistName].length > 0) {
            const button = document.createElement('div');
            button.className = `playlist-button ${currentPlaylistName === playlistName ? 'active' : ''}`;
            button.innerHTML = `
                <span class="playlist-icon">📁</span>
                <span>${playlistName}</span>
                <span class="playlist-count">${playlistsData[playlistName].length}</span>
            `;
            button.addEventListener('click', () => {
                if (currentPlaylistName !== playlistName) {
                    selectPlaylist(playlistName);
                }
            });
            elements.playlistButtonsContainer.appendChild(button);
        }
    });
}

// 更新播放列表按钮状态
function updatePlaylistButtons() {
    if (!elements.playlistButtonsContainer) return;
    
    // 更新按钮激活状态
    const buttons = elements.playlistButtonsContainer.querySelectorAll('.playlist-button');
    buttons.forEach(button => {
        const isAllSongs = button.querySelector('span:nth-child(2)').textContent === '全部歌曲';
        const playlistName = isAllSongs ? '全部歌曲' : button.querySelector('span:nth-child(2)').textContent;
        
        if (currentPlaylistName === playlistName) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });
}

// 选择歌单
function selectPlaylist(playlistName) {
    console.log(`选择歌单: ${playlistName}`);
    currentPlaylistName = playlistName;
    
    // 获取歌单中的歌曲
    const playlistSongs = playlistsData[playlistName] || [];
    currentPlaylist = [...playlistSongs];
    
    // 对播放列表内的歌曲进行排序
    currentPlaylist.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
    
    // 渲染歌单中的歌曲
    renderSongsList(currentPlaylist);
    
    // 更新播放列表按钮状态
    updatePlaylistButtons();
    
    // 如果有歌曲，默认选择第一首但不自动播放
    if (currentPlaylist.length > 0) {
        selectSong(currentPlaylist[0], 0, false);
    }
    
    console.log(`切换到歌单: ${playlistName}，包含 ${currentPlaylist.length} 首歌曲`);
}

// 更新活跃播放列表
function updateActivePlaylist() {
    if (!currentSong) return;
    // 列表已在 handleSearch 中更新，这里只负责找到当前索引
    currentIndex = currentPlaylist.findIndex(song => song.id === currentSong.id);
    if (currentIndex === -1) {
        // 如果当前歌曲不在播放列表中（例如，清空搜索后），则重置播放列表
        currentPlaylist = [...songsData];
        currentIndex = currentPlaylist.findIndex(song => song.id === currentSong.id);
    }
}

// 启用/禁用播放和下载控件
function updateSongControls() {
    if (currentSong) {
        // Reset states
        elements.originalBtn.classList.remove('missing');
        elements.accompanimentBtn.classList.remove('missing');

        // Check for original track
        if (!currentSong.files.original) {
            elements.originalBtn.disabled = true;
            elements.originalBtn.classList.add('missing');
        } else {
            elements.originalBtn.disabled = false;
        }

        // Check for accompaniment track
        if (!currentSong.hasAccompaniment || !currentSong.files.accompaniment) {
            elements.accompanimentBtn.disabled = true;
            elements.accompanimentBtn.classList.add('missing');
        } else {
            elements.accompanimentBtn.disabled = false;
        }

        elements.downloadZipBtn.disabled = false;
        elements.downloadOriginalBtn.disabled = !currentSong.files.original;
        elements.downloadAccompanimentBtn.disabled = !currentSong.files.accompaniment;
        // 根据伴奏可用性设置样式
        if (!currentSong.files.accompaniment) {
            elements.downloadAccompanimentBtn.classList.add('missing');
        } else {
            elements.downloadAccompanimentBtn.classList.remove('missing');
        }
        const hasSheet = !!currentSong.files.sheet || (currentSong.files.sheetExtras && currentSong.files.sheetExtras.length > 0);
        elements.downloadSheetBtn.disabled = !hasSheet;
        
        // 启用播放列表按钮
        if (elements.addToPlaylistBtn) {
            elements.addToPlaylistBtn.disabled = false;
        }

        // 启用核心播放控件
        updatePlaybackControls(true);

    } else {
        // Disable all if no song is selected
        const allButtons = [
            elements.originalBtn, elements.accompanimentBtn,
            elements.downloadZipBtn, elements.downloadOriginalBtn,
            elements.downloadAccompanimentBtn, elements.downloadSheetBtn
        ];
        allButtons.forEach(btn => btn.disabled = true);
        
        // 禁用播放列表按钮
        if (elements.addToPlaylistBtn) {
            elements.addToPlaylistBtn.disabled = true;
        }
        
        // 禁用核心播放控件
        updatePlaybackControls(false);
    }
}

// 统一更新核心播放控件的状态
function updatePlaybackControls(isEnabled) {
    elements.playPauseBtn.disabled = !isEnabled;
    elements.prevBtn.disabled = !isEnabled;
    elements.nextBtn.disabled = !isEnabled;
    
    // 同时更新折叠状态的播放控件
    elements.collapsedPlayPauseBtn.disabled = !isEnabled;
    elements.collapsedPrevBtn.disabled = !isEnabled;
    elements.collapsedNextBtn.disabled = !isEnabled;
}

// 播放当前歌曲
async function playCurrentSong(type) {
    if (!currentSong) {
        console.error('❌ 无法播放：currentSong为空');
        return;
    }
    
    console.log(`\n🎵 ========= 开始播放歌曲 =========`);
    console.log(`📝 歌曲: ${currentSong.title}`);
    console.log(`🎤 类型: ${type}`);
    console.log(`🍎 iOS Safari: ${isIOSSafari()}`);
    
    // 先暂停并重置音频播放器状态
    elements.audioPlayer.pause();
    
    currentAudioType = type;
    const audioUrl = buildAudioUrl(currentSong, type);
    
    // 检查URL是否有效
    if (!audioUrl || audioUrl === '/undefined/undefined' || audioUrl === '//') {
        console.error('❌ 音频URL无效:', audioUrl);
        showError('无法加载音频：文件路径错误');
        return;
    }
    
    console.log('\n=== 音频加载调试信息 ===');
    console.log('🌐 当前域名:', window.location.origin);
    console.log('🔗 音频URL:', audioUrl);
    console.log('📍 是否是相对路径:', audioUrl.startsWith('/'));
    if (audioUrl.startsWith('/')) {
        console.log('🔗 完整URL:', new URL(audioUrl, window.location.origin).href);
    }
    
    // 设置新的音频源并立即重置播放位置
    console.log('⚙️ 设置audio.src...');
    elements.audioPlayer.src = audioUrl;
    elements.audioPlayer.currentTime = 0; // 立即重置，避免竞态条件
    console.log(`✅ 音频源已设置: ${audioUrl}`);

    try {
        console.log('⚙️ 尝试播放音频...');
        showLoading(true); // 开始播放时显示加载状态
        
        // 🍎 iOS Safari优化：减少等待时间，直接尝试播放
        const isIOS = isIOSSafari();
        
        if (isIOS) {
            console.log('🍎 iOS设备：直接尝试播放（不等待canplay）');
            // iOS Safari在用户交互后可以直接播放
            await elements.audioPlayer.play();
            console.log('✅ iOS音频播放成功');
        } else {
            // 非iOS设备：等待音频准备就绪
            if (elements.audioPlayer.readyState < 2) {
                console.log('⏳ 等待音频准备就绪...');
                await new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => {
                        elements.audioPlayer.removeEventListener('canplay', onCanPlay);
                        elements.audioPlayer.removeEventListener('error', onError);
                        reject(new Error('音频加载超时'));
                    }, 30000); // 30秒超时
                    
                    const onCanPlay = () => {
                        clearTimeout(timeout);
                        elements.audioPlayer.removeEventListener('canplay', onCanPlay);
                        elements.audioPlayer.removeEventListener('error', onError);
                        resolve();
                    };
                    const onError = (e) => {
                        clearTimeout(timeout);
                        elements.audioPlayer.removeEventListener('canplay', onCanPlay);
                        elements.audioPlayer.removeEventListener('error', onError);
                        reject(e);
                    };
                    elements.audioPlayer.addEventListener('canplay', onCanPlay, { once: true });
                    elements.audioPlayer.addEventListener('error', onError, { once: true });
                });
            }
            
            await elements.audioPlayer.play();
            console.log('✅ 音频播放成功');
        }
        
        showLoading(false); // 播放成功后隐藏加载状态
        updateAudioTypeButtons(type);
    } catch (error) {
        console.error(`❌ 播放错误: ${error.name}: ${error.message}`);
        console.error('错误详情:', error);
        
        // 确保在任何错误情况下都隐藏加载状态
        showLoading(false);
        
        // 简化错误处理，统一显示错误消息
        if (error.name === 'NotAllowedError') {
            console.log('⚠️ 自动播放被浏览器阻止');
            console.log('💡 这通常不会发生在点击歌曲后，可能是页面刚加载时');
            // 不显示错误提示，让用户自然地点击播放按钮
            // 确保按钮状态正确
            updatePlayButtons();
        } else if (error.name === 'AbortError') {
            console.log('⏸️ 播放被中断，可能是因为快速切换歌曲');
            // AbortError通常不需要显示给用户，因为它是正常的中断行为
        } else if (error.message === '音频加载超时') {
            console.error('⏱️ 音频加载超时');
            showError('音频加载超时，请检查网络连接');
        } else {
            // 将其他播放错误传递给统一的错误处理器
            handleAudioError(error);
        }
    }
}

// 编辑歌曲字母
function editSongLetter(songId, songTitle, currentLetter) {
    // 创建编辑对话框
    const dialog = document.createElement('div');
    dialog.className = 'letter-edit-dialog';
    dialog.innerHTML = `
        <div class="letter-edit-content" data-song-id="${songId}">
            <h3>编辑歌曲字母</h3>
            <p class="song-title-display">${songTitle}</p>
            <div class="letter-input-group">
                <label for="letterInput">字母 (A-Z):</label>
                <input type="text" id="letterInput" value="${currentLetter}" maxlength="1" placeholder="输入A-Z">
                <div class="letter-buttons">
                    ${'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(letter => 
                        `<button class="letter-btn ${letter === currentLetter ? 'active' : ''}" onclick="selectLetter('${letter}')">${letter}</button>`
                    ).join('')}
                </div>
            </div>
            <div class="dialog-buttons">
                <button onclick="saveCustomLetter('${songId}', '${songTitle}')" class="save-btn">保存</button>
                <button onclick="closeLetterDialog()" class="cancel-btn">取消</button>
                <button onclick="resetSongLetter('${songId}', '${songTitle}')" class="reset-btn">重置为自动识别</button>
            </div>
        </div>
    `;
    
    // 添加样式
    dialog.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    `;
    
    document.body.appendChild(dialog);
    
    // 聚焦到输入框
    const input = document.getElementById('letterInput');
    if (input) {
        input.focus();
        input.select();
    }
    
    // 添加键盘事件
    document.addEventListener('keydown', handleLetterEditKeydown);
}

// 选择字母按钮
function selectLetter(letter) {
    const input = document.getElementById('letterInput');
    if (input) {
        input.value = letter;
        input.focus();
        
        // 更新按钮状态
        document.querySelectorAll('.letter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        event.target.classList.add('active');
    }
}

// 处理字母编辑键盘事件
function handleLetterEditKeydown(event) {
    if (event.key === 'Enter') {
        const content = document.querySelector('.letter-edit-content');
        const songId = content ? content.getAttribute('data-song-id') : null;
        const songTitle = document.querySelector('.song-title-display')?.textContent;
        if (songId && songTitle) {
            saveCustomLetter(songId, songTitle);
        }
    } else if (event.key === 'Escape') {
        closeLetterDialog();
    } else if (event.key.match(/^[A-Za-z]$/)) {
        const input = document.getElementById('letterInput');
        if (input) {
            input.value = event.key.toUpperCase();
            
            // 更新按钮状态
            document.querySelectorAll('.letter-btn').forEach(btn => {
                btn.classList.remove('active');
                if (btn.textContent === event.key.toUpperCase()) {
                    btn.classList.add('active');
                }
            });
        }
    }
}

// 关闭字母编辑对话框
function closeLetterDialog() {
    const dialog = document.querySelector('.letter-edit-dialog');
    if (dialog) {
        document.removeEventListener('keydown', handleLetterEditKeydown);
        dialog.remove();
    }
}

// 保存自定义字母
function saveCustomLetter(songId, songTitle) {
    const input = document.getElementById('letterInput');
    if (!input) return;
    
    let newLetter = input.value.trim().toUpperCase();
    
    // 验证输入
    if (!newLetter.match(/^[A-Z]$/)) {
        alert('请输入A-Z之间的单个字母');
        input.focus();
        return;
    }
    
    // 获取当前保存的自定义字母
    const customLetters = getCustomLetters();
    
    // 保存新的字母
    customLetters[songId] = {
        letter: newLetter,
        songTitle: songTitle,
        timestamp: Date.now()
    };
    
    // 保存到 localStorage
    localStorage.setItem('worshipMusic_customLetters', JSON.stringify(customLetters));
    
    // 更新歌曲对象的字母
    const song = songsData.find(s => s.id === songId);
    if (song) {
        song.indexLetter = newLetter;
        song.sortKey = newLetter.toLowerCase() + song.title.toLowerCase();
    }
    
    // 重新排序和渲染
    songsData.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
    renderSongsList(currentPlaylist);
    
    // 关闭对话框
    closeLetterDialog();
    
    // 显示成功消息
    showSuccessMessage(`已为"${songTitle}"设置字母: ${newLetter}`);
    
    console.log(`已保存自定义字母: ${songTitle} -> ${newLetter}`);
}

// 重置歌曲字母为自动识别
function resetSongLetter(songId, songTitle) {
    // 获取当前保存的自定义字母
    const customLetters = getCustomLetters();
    
    // 删除自定义字母
    delete customLetters[songId];
    
    // 保存到 localStorage
    localStorage.setItem('worshipMusic_customLetters', JSON.stringify(customLetters));
    
    // 重新计算字母
    const song = songsData.find(s => s.id === songId);
    if (song) {
        const firstChar = song.title.charAt(0);
        // 使用歌曲标题作为上下文参数
        const autoLetter = getPinyinLetter(firstChar, song.title);
        song.indexLetter = autoLetter;
        song.sortKey = autoLetter.toLowerCase() + song.title.toLowerCase();
    }
    
    // 重新排序和渲染
    songsData.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
    renderSongsList(currentPlaylist);
    
    // 关闭对话框
    closeLetterDialog();
    
    // 显示成功消息
    showSuccessMessage(`已重置"${songTitle}"为自动识别字母`);
    
    console.log(`已重置字母: ${songTitle} -> 自动识别`);
}

// 显示成功消息
function showSuccessMessage(message) {
    const toast = document.createElement('div');
    toast.className = 'success-toast';
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #4CAF50;
        color: white;
        padding: 12px 20px;
        border-radius: 4px;
        z-index: 10001;
        font-size: 14px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    
    // 3秒后自动消失
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

// 获取自定义字母
function getCustomLetters() {
    try {
        const saved = localStorage.getItem('worshipMusic_customLetters');
        return saved ? JSON.parse(saved) : {};
    } catch (error) {
        console.warn('读取自定义字母失败:', error);
        return {};
    }
}

// 加载自定义字母
async function loadCustomLetters() {
    try {
        // 只从localStorage加载自定义字母
        const localLetters = getCustomLetters();
        console.log('从本地加载的自定义字母:', Object.keys(localLetters).length);
        return localLetters;
    } catch (e) {
        console.error('加载自定义字母失败:', e);
        return {};
    }
}

// 重置所有自定义字母
function resetAllCustomLetters() {
    if (confirm('确定要重置所有自定义字母吗？这将恢复所有歌曲的自动识别字母。')) {
        localStorage.removeItem('worshipMusic_customLetters');
        
        // 重新加载歌曲数据
        loadSongsData();
        
        showSuccessMessage('已重置所有自定义字母');
        
        console.log('已重置所有自定义字母');
    }
}

// 显示自定义字母管理面板
function showCustomLettersPanel() {
    const customLetters = getCustomLetters();
    const customCount = Object.keys(customLetters).length;
    
    const panel = document.createElement('div');
    panel.className = 'custom-letters-panel';
    panel.innerHTML = `
        <div class="panel-content">
            <h3>自定义字母管理</h3>
            <p>当前有 ${customCount} 首歌曲使用自定义字母</p>
            ${customCount > 0 ? `
                <div class="custom-list">
                    ${Object.entries(customLetters).map(([songId, data]) => `
                        <div class="custom-item">
                            <span class="song-title">${data.songTitle}</span>
                            <span class="custom-letter">${data.letter}</span>
                            <button onclick="resetSongLetterById('${songId}')" class="reset-single-btn">重置</button>
                        </div>
                    `).join('')}
                </div>
            ` : '<p>暂无自定义字母</p>'}
            <div class="panel-buttons">
                <button onclick="closeCustomLettersPanel()" class="close-btn">关闭</button>
                ${customCount > 0 ? '<button onclick="resetAllCustomLetters()" class="reset-all-btn">重置全部</button>' : ''}
            </div>
        </div>
    `;
    
    // 添加样式
    panel.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    `;
    
    document.body.appendChild(panel);
}

// 关闭自定义字母管理面板
function closeCustomLettersPanel() {
    const panel = document.querySelector('.custom-letters-panel');
    if (panel) {
        panel.remove();
    }
}

// 根据ID重置单个歌曲字母
function resetSongLetterById(songId) {
    const customLetters = getCustomLetters();
    const songData = customLetters[songId];
    
    if (songData) {
        delete customLetters[songId];
        localStorage.setItem('worshipMusic_customLetters', JSON.stringify(customLetters));
        
        // 重新计算字母
        const song = songsData.find(s => s.id === songId);
        if (song) {
            const firstChar = song.title.charAt(0);
            // 使用歌曲标题作为上下文参数
            const autoLetter = getPinyinLetter(firstChar, song.title);
            song.indexLetter = autoLetter;
            song.sortKey = autoLetter.toLowerCase() + song.title.toLowerCase();
        }
        
        // 重新排序和渲染
        songsData.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
        renderSongsList(currentPlaylist);
        
        showSuccessMessage(`已重置"${songData.songTitle}"为自动识别字母`);
        
        // 刷新面板
        closeCustomLettersPanel();
        showCustomLettersPanel();
    }
}

// 智能拼音字母转换函数
function getPinyinLetter(char, context = '') {
    // 如果是英文字符，直接返回大写
    if (/^[a-zA-Z]/.test(char)) {
        return char.toUpperCase();
    }
    
    // 如果是数字开头，尝试提取数字后面的实际歌曲名首字母
    if (/^[0-9]/.test(char)) {
        // 提取数字后面的第一个非数字字符
        const match = char.match(/^[0-9\s.、-]+(.)/);
        if (match && match[1]) {
            console.log(`数字前缀歌曲: "${char}" -> 提取首字母: "${match[1]}"`);
            // 递归调用自身处理提取出的字符
            return getPinyinLetter(match[1], context);
        }
        // 如果无法提取，返回#
        return '#';
    }
    
    // 特殊处理常见敬拜歌曲词汇
    const specialTerms = {
        '主': 'Z',
        '神': 'S',
        '耶稣': 'Y',
        '基督': 'J',
        '圣灵': 'S',
        '哈利路亚': 'H',
        '阿们': 'A',
        '荣耀': 'R',
        '赞美': 'Z',
        '敬拜': 'J',
        '感谢': 'G',
        '祷告': 'D',
        '信心': 'X',
        '恩典': 'E',
        '慈爱': 'C',
        '怜悯': 'L',
        '救恩': 'J',
        '十架': 'S',
        '永生': 'Y',
        '天国': 'T',
        '弥赛亚': 'M'
    };
    
    // 检查上下文中是否包含特殊词汇
    for (const term in specialTerms) {
        if (context.includes(term) && term.includes(char)) {
            console.log(`特殊词汇处理: "${context}" 中的 "${char}" -> "${specialTerms[term]}"`);
            return specialTerms[term];
        }
    }
    
    // 多音字特殊处理
    const multiPronounceMap = {
        '长': { default: 'C', context: { '成长': 'Z', '长大': 'Z', '长辈': 'Z' } },
        '乐': { default: 'L', context: { '快乐': 'Y', '音乐': 'Y' } },
        '行': { default: 'X', context: { '行走': 'H', '行为': 'X' } },
        '藏': { default: 'C', context: { '收藏': 'Z', '藏宝': 'Z' } },
        '曾': { default: 'C', context: { '曾经': 'Z' } },
        '传': { default: 'C', context: { '传道': 'Z', '传扬': 'Z' } },
        '重': { default: 'Z', context: { '重要': 'Z', '重生': 'C' } },
        '朝': { default: 'C', context: { '朝见': 'Z', '朝拜': 'Z' } },
        '得': { default: 'D', context: { '得胜': 'D' } },
        '都': { default: 'D', context: { '首都': 'D' } },
        '发': { default: 'F', context: { '发现': 'F', '头发': 'F' } },
        '分': { default: 'F', context: { '分享': 'F', '分钟': 'F' } },
        '更': { default: 'G', context: { '更新': 'G' } },
        '给': { default: 'G', context: { '给予': 'G' } },
        '好': { default: 'H', context: { '好的': 'H', '美好': 'H' } },
        '和': { default: 'H', context: { '和平': 'H', '和谐': 'H' } },
        '间': { default: 'J', context: { '中间': 'J', '空间': 'J' } },
        '将': { default: 'J', context: { '将来': 'J', '将军': 'J' } },
        '觉': { default: 'J', context: { '感觉': 'J', '觉得': 'J' } },
        '空': { default: 'K', context: { '空中': 'K', '空虚': 'K' } },
        '乐': { default: 'Y', context: { '音乐': 'Y', '快乐': 'L' } },
        '落': { default: 'L', context: { '降落': 'L', '落下': 'L' } },
        '没': { default: 'M', context: { '没有': 'M' } },
        '难': { default: 'N', context: { '困难': 'N', '难过': 'N' } },
        '平': { default: 'P', context: { '平安': 'P', '和平': 'P' } },
        '强': { default: 'Q', context: { '坚强': 'Q', '强壮': 'Q' } },
        '且': { default: 'Q', context: { '并且': 'Q' } },
        '亲': { default: 'Q', context: { '亲爱': 'Q', '亲近': 'Q' } },
        '少': { default: 'S', context: { '少年': 'S', '多少': 'S' } },
        '省': { default: 'S', context: { '省份': 'X' } },
        '数': { default: 'S', context: { '数字': 'S', '数目': 'S' } },
        '天': { default: 'T', context: { '天堂': 'T', '天国': 'T' } },
        '为': { default: 'W', context: { '因为': 'W', '为了': 'W' } },
        '系': { default: 'X', context: { '关系': 'X', '系统': 'X' } },
        '相': { default: 'X', context: { '相信': 'X', '相爱': 'X' } },
        '血': { default: 'X', context: { '宝血': 'X', '血液': 'X' } },
        '一': { default: 'Y', context: { '一切': 'Y', '一生': 'Y' } },
        '应': { default: 'Y', context: { '应当': 'Y', '回应': 'Y' } },
        '着': { default: 'Z', context: { '穿着': 'Z', '看着': 'Z' } },
        '种': { default: 'Z', context: { '种子': 'Z', '种类': 'Z' } },
        '中': { default: 'Z', context: { '中间': 'Z', '中心': 'Z' } },
        '只': { default: 'Z', context: { '只有': 'Z', '只是': 'Z' } },
        '转': { default: 'Z', context: { '转变': 'Z', '旋转': 'Z' } },
        '装': { default: 'Z', context: { '装饰': 'Z', '打扮': 'Z' } },
        '子': { default: 'Z', context: { '儿子': 'Z', '种子': 'Z' } }
    };
    
    // 检查是否是多音字，并根据上下文判断读音
    if (multiPronounceMap[char]) {
        const multiChar = multiPronounceMap[char];
        for (const ctx in multiChar.context) {
            if (context.includes(ctx)) {
                console.log(`多音字处理: "${context}" 中的 "${char}" -> "${multiChar.context[ctx]}"`);
                return multiChar.context[ctx];
            }
        }
        console.log(`多音字处理(默认): "${char}" -> "${multiChar.default}"`);
        return multiChar.default;
    }
    
    // 优先使用 pinyin-pro 库进行转换
    if (typeof pinyinPro !== 'undefined') {
        try {
            const { pinyin } = pinyinPro;
            // 使用整个上下文进行转换，以便更准确地处理多音字
            const pinyinResult = pinyin(char, { 
                toneType: 'none',
                nonZh: 'consecutive',
                v: true, // 使用v表示ü
                multiple: false // 不返回多音字的所有拼音
            });
            
            const firstLetter = pinyinResult.charAt(0).toUpperCase();
            // 确保返回的是有效的字母
            if (/^[A-Z]$/.test(firstLetter)) {
                console.log(`pinyin-pro 成功转换: "${char}" -> "${pinyinResult}" -> "${firstLetter}"`);
                return firstLetter;
            } else {
                console.warn(`pinyin-pro 返回无效字母: "${char}" -> "${pinyinResult}" -> "${firstLetter}"`);
            }
        } catch (error) {
            console.warn(`pinyin-pro 转换失败: "${char}", 错误:`, error);
        }
    } else {
        console.warn('pinyin-pro 库未加载，使用回退方案');
    }
    // 回退方案：使用扩展的汉字映射表
    const fallbackMap = {
        // 原有的映射表
        '愿': 'Y', '一': 'Y', '义': 'Y', '有': 'Y', '要': 'Y', '耶': 'Y', '与': 'Y', '以': 'Y', '因': 'Y', '永': 'Y', '用': 'Y', '又': 'Y', '医': 'Y', '应': 'Y', '牺': 'Y', '也': 'Y', '已': 'Y', '样': 'Y', '音': 'Y', '野': 'Y',
        '阿': 'A', '爱': 'A', '安': 'A', '按': 'A', '啊': 'A',
        '不': 'B', '白': 'B', '宝': 'B', '贝': 'B', '比': 'B', '被': 'B', '本': 'B', '别': 'B', '帮': 'B', '保': 'B',
        '超': 'C', '出': 'C', '充': 'C', '除': 'C', '从': 'C', '常': 'C', '成': 'C', '创': 'C', '唱': 'C',
        '大': 'D', '打': 'D', '的': 'D', '到': 'D', '得': 'D', '都': 'D', '但': 'D', '道': 'D', '等': 'D', '对': 'D',
        '恩': 'E', '而': 'E', '二': 'E', '儿': 'E',
        '复': 'F', '付': 'F', '父': 'F', '放': 'F', '飞': 'F', '分': 'F', '风': 'F', '丰': 'F',
        '光': 'G', '感': 'G', '歌': 'G', '给': 'G', '高': 'G', '国': 'G', '过': 'G', '跟': 'G', '更': 'G',
        '和': 'H', '何': 'H', '活': 'H', '好': 'H', '还': 'H', '很': 'H', '会': 'H', '后': 'H', '华': 'H', '火': 'H',
        '基': 'J', '寄': 'J', '进': 'J', '君': 'J', '叫': 'J', '救': 'J', '就': 'J', '见': 'J', '今': 'J', '家': 'J', '加': 'J', '将': 'J', '教': 'J',
        '可': 'K', '看': 'K', '开': 'K', '快': 'K', '旷': 'K',
        '来': 'L', '立': 'L', '灵': 'L', '力': 'L', '炼': 'L', '了': 'L', '里': 'L', '离': 'L', '老': 'L', '路': 'L', '流': 'L',
        '美': 'M', '满': 'M', '名': 'M', '们': 'M', '没': 'M', '每': 'M', '面': 'M', '门': 'M',
        '你': 'N', '那': 'N', '能': 'N', '年': 'N', '内': 'N', '难': 'N',
        '平': 'P', '朋': 'P', '破': 'P', '普': 'P',
        '奇': 'Q', '全': 'Q', '求': 'Q', '起': 'Q', '去': 'Q', '前': 'Q', '清': 'Q', '情': 'Q',
        '人': 'R', '如': 'R', '让': 'R', '然': 'R', '日': 'R', '热': 'R', '荣': 'R', '任': 'R',
        '神': 'S', '圣': 'S', '生': 'S', '是': 'S', '什': 'S', '诗': 'S', '十': 'S', '时': 'S', '世': 'S', '手': 'S', '寻': 'S', '说': 'S', '水': 'S', '所': 'S', '死': 'S', '三': 'S', '上': 'S', '声': 'S',
        '天': 'T', '太': 'T', '听': 'T', '他': 'T', '她': 'T', '它': 'T', '同': 'T', '团': 'T', '这': 'T', '通': 'T', '头': 'T', '投': 'T',
        '我': 'W', '为': 'W', '万': 'W', '王': 'W', '无': 'W', '唯': 'W', '文': 'W', '问': 'W', '忘': 'W', '望': 'W', '完': 'W', '外': 'W',
        '新': 'X', '心': 'X', '行': 'X', '信': 'X', '喜': 'X', '想': 'X', '希': 'X', '幸': 'X', '献': 'X', '向': 'X', '下': 'X', '小': 'X', '像': 'X', '先': 'X',
        '在': 'Z', '主': 'Z', '真': 'Z', '只': 'Z', '知': 'Z', '中': 'Z', '住': 'Z', '最': 'Z', '自': 'Z', '尊': 'Z', '着': 'Z', '这': 'Z', '正': 'Z', '之': 'Z', '总': 'Z', '走': 'Z', '赞': 'Z', '找': 'Z',
        
        // 新增的敬拜相关词汇
        '颂': 'S', '诵': 'S', '颂赞': 'S', '颂扬': 'S',
        '赞': 'Z', '赞美': 'Z', '赞颂': 'Z', '赞扬': 'Z',
        '敬': 'J', '敬拜': 'J', '敬畏': 'J', '敬仰': 'J',
        '拜': 'B', '礼拜': 'B', '朝拜': 'B', '跪拜': 'B',
        '祷': 'D', '祷告': 'D', '祈祷': 'D', '代祷': 'D',
        '祈': 'Q', '祈求': 'Q', '祈祷': 'Q', '祈盼': 'Q',
        '福': 'F', '福音': 'F', '祝福': 'F', '福气': 'F',
        '恩': 'E', '恩典': 'E', '恩惠': 'E', '恩赐': 'E',
        '怜': 'L', '怜悯': 'L', '慈怜': 'L',
        '慈': 'C', '慈爱': 'C', '慈悲': 'C', '慈善': 'C',
        '爱': 'A', '慈爱': 'A', '博爱': 'A', '大爱': 'A',
        '信': 'X', '信心': 'X', '相信': 'X', '信靠': 'X',
        '望': 'W', '盼望': 'W', '希望': 'W', '期望': 'W',
        '义': 'Y', '公义': 'Y', '义人': 'Y', '义行': 'Y',
        '圣': 'S', '圣洁': 'S', '圣灵': 'S', '圣徒': 'S',
        '灵': 'L', '圣灵': 'L', '灵魂': 'L', '灵性': 'L',
        '救': 'J', '救主': 'J', '救恩': 'J', '救赎': 'J',
        '恩': 'E', '恩典': 'E', '恩惠': 'E', '恩赐': 'E',
        '赎': 'S', '救赎': 'S', '赎罪': 'S', '赎回': 'S',
        '罪': 'Z', '罪恶': 'Z', '罪人': 'Z', '赦罪': 'Z',
        '赦': 'S', '赦免': 'S', '饶赦': 'S', '赦罪': 'S',
        '悔': 'H', '悔改': 'H', '后悔': 'H', '忏悔': 'H',
        '改': 'G', '悔改': 'G', '改变': 'G', '改正': 'G',
        '光': 'G', '光明': 'G', '荣光': 'G', '光辉': 'G',
        '荣': 'R', '荣耀': 'R', '荣光': 'R', '荣美': 'R',
        '耀': 'Y', '荣耀': 'Y', '辉耀': 'Y', '光耀': 'Y',
        '美': 'M', '美好': 'M', '美丽': 'M', '荣美': 'M',
        '善': 'S', '善良': 'S', '善行': 'S', '善意': 'S',
        '仁': 'R', '仁爱': 'R', '仁慈': 'R', '仁义': 'R',
        '诚': 'C', '诚实': 'C', '真诚': 'C', '诚信': 'C',
        '谦': 'Q', '谦卑': 'Q', '谦和': 'Q', '谦逊': 'Q',
        '卑': 'B', '谦卑': 'B', '卑微': 'B',
        '忍': 'R', '忍耐': 'R', '忍受': 'R', '容忍': 'R',
        '耐': 'N', '忍耐': 'N', '耐心': 'N', '耐性': 'N',
        '盼': 'P', '盼望': 'P', '期盼': 'P', '盼顾': 'P',
        '喜': 'X', '喜乐': 'X', '欢喜': 'X', '喜悦': 'X',
        '乐': 'L', '喜乐': 'L', '快乐': 'L', '欢乐': 'L',
        '欢': 'H', '欢喜': 'H', '欢乐': 'H', '欢呼': 'H',
        '呼': 'H', '呼求': 'H', '呼喊': 'H', '欢呼': 'H',
        '求': 'Q', '祈求': 'Q', '恳求': 'Q', '呼求': 'Q',
        '恳': 'K', '恳求': 'K', '恳切': 'K', '诚恳': 'K',
        '切': 'Q', '恳切': 'Q', '切实': 'Q', '亲切': 'Q',
        '亲': 'Q', '亲近': 'Q', '亲爱': 'Q', '亲密': 'Q',
        '近': 'J', '亲近': 'J', '接近': 'J', '靠近': 'J',
        '靠': 'K', '依靠': 'K', '靠近': 'K', '倚靠': 'K',
        '倚': 'Y', '倚靠': 'Y', '依倚': 'Y', '凭倚': 'Y',
        '依': 'Y', '依靠': 'Y', '依赖': 'Y', '依附': 'Y',
        '赖': 'L', '依赖': 'L', '赖以': 'L', '信赖': 'L',
        '附': 'F', '依附': 'F', '附加': 'F', '附近': 'F',
        '凭': 'P', '凭借': 'P', '凭依': 'P', '凭倚': 'P',
        '借': 'J', '借助': 'J', '凭借': 'J', '借用': 'J',
        '助': 'Z', '帮助': 'Z', '援助': 'Z', '助力': 'Z',
        '援': 'Y', '援助': 'Y', '支援': 'Y', '救援': 'Y',
        '力': 'L', '力量': 'L', '能力': 'L', '助力': 'L',
        '能': 'N', '能力': 'N', '才能': 'N', '可能': 'N',
        '才': 'C', '才能': 'C', '才华': 'C', '才干': 'C'
    };
    // 查找回退映射
    if (fallbackMap[char]) {
        return fallbackMap[char];
    }
    // 对于未映射的汉字，使用Unicode编码范围判断
    const code = char.charCodeAt(0);
    if (code >= 0x4e00 && code <= 0x9fff) {
        // 是汉字但不在映射表中，根据Unicode编码进行简单分组
        const group = Math.floor((code - 0x4e00) / 800) % 26;
        const fallbackLetter = String.fromCharCode(65 + group); // A-Z
        console.warn(`汉字 "${char}" 不在映射表中，使用Unicode回退: ${code} -> ${fallbackLetter}`);
        return fallbackLetter;
    }
    // 其他字符返回#
    console.warn(`未知字符 "${char}" (Unicode: ${code})，返回 #`);
    return '#';
}

// 构建音频URL - 使用相对路径通过middleware代理访问R2
function buildAudioUrl(song, type) {
    const fileName = type === 'original' ? song.files.original : song.files.accompaniment;
    
    // 检查文件名是否存在
    if (!fileName) {
        console.error(`❌ 文件名不存在！type: ${type}, files:`, song.files);
        return '';
    }
    
    // 使用相对路径，让_middleware.js代理R2访问（内置CORS支持）
    const audioUrl = `/${song.folder}/${fileName}`;
    
    // 详细的调试日志
    console.log(`🎵 构建音频URL`);
    console.log(`  - 歌曲: ${song.title}`);
    console.log(`  - 文件夹: ${song.folder}`);
    console.log(`  - 文件名: ${fileName}`);
    console.log(`  - 类型: ${type}`);
    console.log(`  - 完整URL: ${audioUrl}`);
    console.log(`  - 绝对URL: ${window.location.origin}${audioUrl}`);
    console.log(`  - 用户代理: ${navigator.userAgent.substring(0, 100)}...`);
    console.log(`  - 是否iOS: ${isIOSSafari()}`);
    
    return audioUrl;
}

// 切换播放/暂停
function togglePlayPause() {
    console.log('togglePlayPause被调用');
    console.log('音频状态:', {
        paused: elements.audioPlayer.paused,
        readyState: elements.audioPlayer.readyState,
        currentTime: elements.audioPlayer.currentTime,
        src: elements.audioPlayer.src
    });
    
    if (elements.audioPlayer.paused) {
        if (!currentSong) {
            showError('请先选择一首歌曲');
            return;
        }
        
        // 🍎 iOS优化：如果没有src或src为空，重新加载
        if (!elements.audioPlayer.src || elements.audioPlayer.src === '') {
            console.log('⚠️ 音频源为空，调用playCurrentSong加载');
            playCurrentSong(currentAudioType);
            return;
        }
        
        // 检查音频是否已准备好播放
        if (elements.audioPlayer.readyState >= 2) { // HAVE_CURRENT_DATA or higher
            console.log('✅ 音频已准备好，直接播放');
            elements.audioPlayer.play().catch(e => handleAudioError(e));
        } else {
            console.log(`⏳ 音频未准备好(readyState=${elements.audioPlayer.readyState})，等待加载完成`);
            showLoading(true);
            
            // 🔧 iOS修复：添加超时机制
            let timeoutId;
            let canplayTriggered = false;
            
            // 等待音频准备好再播放
            const playWhenReady = () => {
                if (canplayTriggered) return; // 防止重复触发
                canplayTriggered = true;
                clearTimeout(timeoutId);
                console.log('✅ 音频准备完成(canplay)，开始播放');
                showLoading(false);
                elements.audioPlayer.play().catch(e => handleAudioError(e));
            };
            
            // 错误处理函数
            const handleLoadError = (e) => {
                canplayTriggered = true;
                clearTimeout(timeoutId);
                console.error('❌ 音频加载失败:', e);
                showLoading(false);
                showError('音频加载失败，请检查网络连接或重试');
            };
            
            // 🔧 超时处理：10秒后如果还没加载完成，尝试重新加载
            timeoutId = setTimeout(() => {
                if (!canplayTriggered) {
                    console.warn('⚠️ 音频加载超时(10秒)，尝试重新加载');
                    elements.audioPlayer.removeEventListener('canplay', playWhenReady);
                    elements.audioPlayer.removeEventListener('error', handleLoadError);
                    showLoading(false);
                    
                    // 重新加载音频
                    if (isIOSSafari()) {
                        console.log('🍎 iOS: 重新调用load()');
                        elements.audioPlayer.load();
                        // 再等待一次
                        elements.audioPlayer.addEventListener('canplay', playWhenReady, { once: true });
                    } else {
                        showError('音频加载超时，请重试');
                    }
                }
            }, 10000);
            
            // 添加事件监听器
            elements.audioPlayer.addEventListener('canplay', playWhenReady, { once: true });
            elements.audioPlayer.addEventListener('error', handleLoadError, { once: true });
            
            // 如果音频源为空，重新播放当前歌曲
            if (!elements.audioPlayer.src || !currentSong) {
                console.log('音频源为空或无当前歌曲，重新播放当前歌曲');
                if (currentSong) {
                    playCurrentSong(currentAudioType);
                }
            }
        }
    } else {
        elements.audioPlayer.pause();
    }
}

// 更新播放按钮状态
function updatePlayButtons() {
    const isCurrentlyPlaying = !elements.audioPlayer.paused;
    
    const playIcon = elements.playPauseBtn.querySelector('.nav-icon');
    const collapsedPlayIcon = elements.collapsedPlayPauseBtn.querySelector('.nav-icon');
    
    if (isCurrentlyPlaying) {
        playIcon.src = 'icons/pause.png';
        playIcon.alt = '暂停';
        elements.playPauseBtn.classList.add('playing');
        elements.playPauseBtn.title = '暂停';
        
        // 同时更新折叠状态的播放按钮
        collapsedPlayIcon.src = 'icons/pause.png';
        collapsedPlayIcon.alt = '暂停';
        elements.collapsedPlayPauseBtn.classList.add('playing');
        elements.collapsedPlayPauseBtn.title = '暂停';
    } else {
        playIcon.src = 'icons/play.png';
        playIcon.alt = '播放';
        elements.playPauseBtn.classList.remove('playing');
        elements.playPauseBtn.title = '播放';
        
        // 同时更新折叠状态的播放按钮
        collapsedPlayIcon.src = 'icons/play.png';
        collapsedPlayIcon.alt = '播放';
        elements.collapsedPlayPauseBtn.classList.remove('playing');
        elements.collapsedPlayPauseBtn.title = '播放';
    }
}

// 切换音频类型
function switchToAudioType(type) {
    // 如果没有选择歌曲或重复点击当前类型，直接返回
    if (!currentSong || type === currentAudioType) return;

    // 当所需音频文件不存在时，直接返回
    if ((type === 'accompaniment' && !currentSong.files.accompaniment) ||
        (type === 'original' && !currentSong.files.original)) {
        return;
    }

    // 更新当前音频类型并刷新按钮状态
    currentAudioType = type;
    updateAudioTypeButtons(type);

    // 直接调用统一的播放函数，与原唱使用相同逻辑
    playCurrentSong(type);

    // 如果是伴奏，添加一次性错误监听器，失败时自动回退
    if (type === 'accompaniment') {
        const audio = elements.audioPlayer;
        const fallbackHandler = () => {
            audio.removeEventListener('error', fallbackHandler);
            showError('缺少伴奏，已为你播放原唱');
            // 自动切换到原唱
            switchToAudioType('original');
        };
        audio.addEventListener('error', fallbackHandler, { once: true });
    }
}

// 更新音频类型按钮状态
function updateAudioTypeButtons(type) {
    // 先移除所有active类，确保状态清洁
    elements.originalBtn.classList.remove('active');
    elements.accompanimentBtn.classList.remove('active');
    
    // 然后添加对应的active类
    if (type === 'original') {
        elements.originalBtn.classList.add('active');
    } else if (type === 'accompaniment') {
        elements.accompanimentBtn.classList.add('active');
    }
}

// 切换播放模式
function togglePlayMode() {
    playMode = (playMode + 1) % 5; // 循环：0->1->2->3->4->0
    
    const modeIcon = elements.playModeBtn.querySelector('.mode-icon');
    const modeText = elements.playModeBtn.querySelector('span');
    
    // 移除所有模式类
    elements.playModeBtn.classList.remove('random', 'repeat-one', 'repeat-all');
    
    switch(playMode) {
        case 0: // 顺序播放
            modeIcon.src = 'icons/mode-sequence.png';
            modeIcon.alt = '顺序播放';
            modeText.textContent = '顺序播放';
            elements.playModeBtn.title = '当前为顺序播放模式';
            break;
        case 1: // 随机播放
            modeIcon.src = 'icons/mode-random.png';
            modeIcon.alt = '随机播放';
            modeText.textContent = '随机播放';
            elements.playModeBtn.classList.add('random');
            elements.playModeBtn.title = '当前为随机播放模式';
            break;
        case 2: // 单曲循环
            modeIcon.src = 'icons/mode-repeat-one.png';
            modeIcon.alt = '单曲循环';
            modeText.textContent = '单曲循环';
            elements.playModeBtn.classList.add('repeat-one');
            elements.playModeBtn.title = '当前为单曲循环模式';
            break;
        case 3: // 列表循环
            modeIcon.src = 'icons/mode-sequence.png';
            modeIcon.alt = '列表循环';
            modeText.textContent = '列表循环';
            elements.playModeBtn.classList.add('repeat-all');
            elements.playModeBtn.title = '当前为列表循环模式';
            break;
        case 4: // 全部循环
            modeIcon.src = 'icons/mode-sequence.png';
            modeIcon.alt = '全部循环';
            modeText.textContent = '全部循环';
            elements.playModeBtn.classList.add('repeat-all');
            elements.playModeBtn.title = '当前为全部循环模式';
            break;
    }
}

// 处理歌曲结束
function handleSongEnd() {
    console.log('歌曲播放结束，当前播放模式:', playMode);
    
    // 检查是否正在从自定义播放列表播放
    if (playingPlaylistInfo.isPlayingFromPlaylist) {
        console.log('当前正在从自定义播放列表播放，播放列表ID:', playingPlaylistInfo.playlistId);
        
        // 获取当前播放列表
        const currentCustomPlaylist = playlists[playingPlaylistInfo.playlistId];
        if (!currentCustomPlaylist || !currentCustomPlaylist.songs || currentCustomPlaylist.songs.length === 0) {
            console.log('自定义播放列表为空或不存在，切换到普通模式');
            playingPlaylistInfo.isPlayingFromPlaylist = false;
        } else {
            // 在自定义播放列表中播放下一首
            const nextIndex = (playingPlaylistInfo.currentIndex + 1) % currentCustomPlaylist.songs.length;
            const nextSong = currentCustomPlaylist.songs[nextIndex];
            
            console.log(`从自定义播放列表播放下一首: ${nextSong.title}`);
            
            // 更新播放列表信息
            playingPlaylistInfo.currentIndex = nextIndex;
            
            // 在全局歌曲列表中查找该歌曲的索引
            const globalIndex = songsData.findIndex(s => s.id === nextSong.id);
            if (globalIndex !== -1) {
                // 选择并播放歌曲
                selectSong(nextSong, globalIndex, true);
                
                // 如果播放列表模态框是打开的，更新高亮
                if (playlistModalVisible && currentPlaylistId === playingPlaylistInfo.playlistId) {
                    renderPlaylistItems();
                }
                
                // 已经处理了歌曲结束事件，直接返回
                return;
            }
        }
    }
    
    // 如果不是从自定义播放列表播放，或者自定义播放列表处理失败，使用正常的播放模式逻辑
    switch(playMode) {
        case 0: // 顺序播放
            // 歌曲自然结束时切换到下一首并自动播放
            if (currentPlaylist.length > 1) {
                currentIndex = (currentIndex + 1) % currentPlaylist.length;
                const nextSong = currentPlaylist[currentIndex];
                console.log(`顺序播放：切换到下一首 ${nextSong.title}，自动播放`);
                selectSong(nextSong, currentIndex, true); // 自动播放下一首
            }
            break;
        case 1: // 随机播放
            // 随机切换到下一首并自动播放
            if (currentPlaylist.length > 1) {
                let randomIndex;
                do {
                    randomIndex = Math.floor(Math.random() * currentPlaylist.length);
                } while (randomIndex === currentIndex);
                const randomSong = currentPlaylist[randomIndex];
                currentIndex = randomIndex;
                console.log(`随机播放：切换到 ${randomSong.title}，自动播放`);
                selectSong(randomSong, currentIndex, true); // 自动播放下一首
            }
            break;
        case 2: // 单曲循环
            // 重新播放当前歌曲
            console.log('单曲循环：重新播放当前歌曲');
            elements.audioPlayer.currentTime = 0;
            elements.audioPlayer.play().catch(e => {
                console.error('单曲循环播放失败:', e);
                handleAudioError(e);
            });
            break;
        case 3: // 列表循环
            // 播放当前列表的下一首，到最后一首时循环到第一首
            if (currentPlaylist.length > 0) {
                currentIndex = (currentIndex + 1) % currentPlaylist.length;
                const nextSong = currentPlaylist[currentIndex];
                console.log(`列表循环：切换到 ${nextSong.title}，自动播放`);
                selectSong(nextSong, currentIndex, true); // 自动播放下一首
            }
            break;
        case 4: // 全部循环
            // 如果是在歌单中，先完成歌单播放，然后切换到全部歌曲
            if (currentPlaylistName !== "全部歌曲") {
                // 歌单内循环
                currentIndex = (currentIndex + 1) % currentPlaylist.length;
                const nextSong = currentPlaylist[currentIndex];
                console.log(`全部循环（歌单内）：切换到 ${nextSong.title}，自动播放`);
                selectSong(nextSong, currentIndex, true);
            } else {
                // 全部歌曲循环
                currentIndex = (currentIndex + 1) % currentPlaylist.length;
                const nextSong = currentPlaylist[currentIndex];
                console.log(`全部循环：切换到 ${nextSong.title}，自动播放`);
                selectSong(nextSong, currentIndex, true);
            }
            break;
    }
}

// 播放下一首歌曲
function playNextSong() {
    // 在随机模式下，下一首应该是随机选择
    if (playMode === 1) {
        playRandomSong();
        return;
    }
    
    if (!currentSong || currentPlaylist.length === 0) {
        if (currentPlaylist.length > 0) {
            selectSong(currentPlaylist[0], 0, true); // 用户点击下一首时直接播放
        } else {
            showError('歌曲列表为空');
        }
        return;
    }
    
    currentIndex = (currentIndex + 1) % currentPlaylist.length;
    const nextSong = currentPlaylist[currentIndex];
    selectSong(nextSong, currentIndex, true); // 用户点击下一首时直接播放
}

// 播放上一首歌曲
function playPreviousSong() {
    // 在随机模式下，上一首应该是随机选择
    if (playMode === 1) {
        playRandomSong();
        return;
    }
    
    if (!currentSong || currentPlaylist.length === 0) {
        if (currentPlaylist.length > 0) {
            selectSong(currentPlaylist[0], 0, true); // 用户点击上一首时直接播放
        } else {
            showError('歌曲列表为空');
        }
        return;
    }
    
    currentIndex = (currentIndex - 1 + currentPlaylist.length) % currentPlaylist.length;
    const prevSong = currentPlaylist[currentIndex];
    selectSong(prevSong, currentIndex, true); // 用户点击上一首时直接播放
}

// 播放随机歌曲
function playRandomSong() {
    if (currentPlaylist.length <= 1) {
        // 如果列表为空或只有一首歌，没必要随机播放
        if (currentPlaylist.length === 1 && elements.audioPlayer.paused) {
            selectSong(currentPlaylist[0], 0, true); // 用户触发的随机播放直接播放
        }
        return;
    }
    
    let randomIndex;
    do {
        randomIndex = Math.floor(Math.random() * currentPlaylist.length);
    } while (randomIndex === currentIndex); // 确保不会连续随机到同一首歌

    const randomSong = currentPlaylist[randomIndex];
    currentIndex = randomIndex;
    selectSong(randomSong, currentIndex, true); // 用户触发的随机播放直接播放
}

// 处理搜索
function handleSearch() {
    const searchTerm = elements.searchInput.value.toLowerCase().trim();
    performSearch(searchTerm);
    // 同步折叠搜索框的值
    if (elements.collapsedSearchInput.value.toLowerCase().trim() !== searchTerm) {
        elements.collapsedSearchInput.value = elements.searchInput.value;
    }
}

// 处理折叠状态的搜索
function handleCollapsedSearch() {
    const searchTerm = elements.collapsedSearchInput.value.toLowerCase().trim();
    performSearch(searchTerm);
    // 同步主搜索框的值
    if (elements.searchInput.value.toLowerCase().trim() !== searchTerm) {
        elements.searchInput.value = elements.collapsedSearchInput.value;
    }
}

// 统一的搜索逻辑
function performSearch(searchTerm) {
    if (!songsData) return;
    
    let filteredSongs;
    if (searchTerm) {
        filteredSongs = songsData.filter(song => 
            song.title.toLowerCase().includes(searchTerm) ||
            song.artist.toLowerCase().includes(searchTerm)
        );
    } else {
        filteredSongs = [...songsData];
    }
    
    currentPlaylist = filteredSongs; // 关键修复：搜索后立即更新播放列表
    renderSongsList(filteredSongs);
}

// 清除折叠状态的搜索
function clearCollapsedSearch() {
    elements.collapsedSearchInput.value = '';
    elements.searchInput.value = '';
    performSearch('');
}

// 加载歌谱
function loadSheetMusic() {
    if (!currentSong) {
        elements.sheetDisplay.innerHTML = `
            <div class="sheet-placeholder">
                <p>🎼</p>
                <p>暂无歌谱</p>
            </div>
        `;
        return;
    }
    
    const sheetFiles = [];
    if (currentSong.files.sheet) {
        sheetFiles.push({
            fileName: currentSong.files.sheet,
            label: ''
        });
    }
    
    if (currentSong.files.sheetExtras && currentSong.files.sheetExtras.length > 0) {
        currentSong.files.sheetExtras.forEach(fileName => {
            sheetFiles.push({
                fileName,
                label: '（编）'
            });
        });
    }
    
    if (sheetFiles.length === 0) {
        elements.sheetDisplay.innerHTML = `
            <div class="sheet-placeholder">
                <p>🎼</p>
                <p>暂无歌谱</p>
            </div>
        `;
        return;
    }
    
    // 使用相对路径通过middleware代理访问
    elements.sheetDisplay.innerHTML = sheetFiles.map((sheet, index) => {
        const sheetUrl = `/${currentSong.folder}/${sheet.fileName}`;
        const label = sheet.label ? ` ${sheet.label}` : '';
        return `
            <img src="${sheetUrl}" alt="${currentSong.title} 歌谱${label}" class="sheet-image" 
                 onerror="this.parentElement.innerHTML='<div class=\\'sheet-placeholder\\'><p>🎼</p><p>歌谱加载失败</p></div>'">
        `;
    }).join('');
}

// 下载当前歌曲所有文件 (ZIP)
async function downloadSongZip() {
    if (!currentSong) return;
    
    try {
        showLoading(true);
        
        const zip = new JSZip();
        const folder = zip.folder(currentSong.title);
        
        // 下载原唱（使用相对路径）
        await addFileToZip(folder, currentSong.files.original, `/${currentSong.folder}/${currentSong.files.original}`);
        
        // 下载伴奏（如果有）
        if (currentSong.hasAccompaniment && currentSong.files.accompaniment) {
            await addFileToZip(folder, currentSong.files.accompaniment, `/${currentSong.folder}/${currentSong.files.accompaniment}`);
        }
        
        // 下载歌谱（含标注版）
        if (currentSong.files.sheet) {
            await addFileToZip(folder, currentSong.files.sheet, `/${currentSong.folder}/${currentSong.files.sheet}`);
        }
        if (currentSong.files.sheetExtras && currentSong.files.sheetExtras.length > 0) {
            for (const sheetFile of currentSong.files.sheetExtras) {
                await addFileToZip(folder, sheetFile, `/${currentSong.folder}/${sheetFile}`);
            }
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
    // 使用相对路径通过middleware代理

    switch (type) {
        case 'original':
            if (!song.files.original) { showError('该歌曲没有歌曲文件'); return; }
            fileName = song.files.original;
            fileUrl = `/${song.folder}/${fileName}`;
            break;
        case 'accompaniment':
            if (!song.hasAccompaniment || !song.files.accompaniment) { showError('该歌曲没有伴奏文件'); return; }
            fileName = song.files.accompaniment;
            fileUrl = `/${song.folder}/${fileName}`;
            break;
        case 'sheet':
            if (!song.files.sheet && !(song.files.sheetExtras && song.files.sheetExtras.length > 0)) {
                showError('该歌曲没有歌谱文件');
                return;
            }
            fileName = song.files.sheet || song.files.sheetExtras[0];
            fileUrl = `/${song.folder}/${fileName}`;

            try {
                showLoading(true);
                const resp = await fetch(fileUrl, { mode: 'cors' });
                if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
                const blob = await resp.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = fileName;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                showLoading(false);
            } catch (err) {
                console.warn('歌谱fetch失败，回退到直接打开', err);
                showLoading(false);
                const a = document.createElement('a');
                a.href = fileUrl;
                a.target = '_blank';
                a.rel = 'noopener';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            }
            return;
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
    const volume = elements.volumeSlider.value / 100;
    elements.audioPlayer.volume = volume;
    
    // 更新静音状态和图标
    if (volume === 0) {
        isMuted = true;
        elements.volumeBtn.textContent = '🔇';
        elements.volumeBtn.title = '点击取消静音';
    } else {
        isMuted = false;
        elements.volumeBtn.textContent = '🔊';
        elements.volumeBtn.title = '点击静音/取消静音';
        if (volume > 0) {
            volumeBeforeMute = elements.volumeSlider.value;
        }
    }
}

// 切换静音状态
function toggleMute() {
    if (isMuted) {
        // 取消静音，恢复之前的音量
        elements.volumeSlider.value = volumeBeforeMute;
        elements.audioPlayer.volume = volumeBeforeMute / 100;
        isMuted = false;
        elements.volumeBtn.textContent = '🔊';
        elements.volumeBtn.title = '点击静音/取消静音';
        console.log(`取消静音，恢复音量到 ${volumeBeforeMute}%`);
    } else {
        // 静音，保存当前音量
        volumeBeforeMute = elements.volumeSlider.value;
        elements.volumeSlider.value = 0;
        elements.audioPlayer.volume = 0;
        isMuted = true;
        elements.volumeBtn.textContent = '🔇';
        elements.volumeBtn.title = '点击取消静音';
        console.log(`静音，保存音量 ${volumeBeforeMute}%`);
    }
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
function handleAudioError(e) {
    const audio = elements.audioPlayer;
    let errorMessage = '音频文件无法播放。';
    
    console.error('\n❌ ========= 音频错误详细信息 =========');
    console.error('❌ 错误事件:', e);
    console.error('🔗 音频URL:', audio.src);
    console.error('📊 readyState:', audio.readyState, '(0=未加载,1=元数据,2=当前数据,3=未来数据,4=足够数据)');
    console.error('🌐 networkState:', audio.networkState, '(0=空,1=空闲,2=加载中,3=无数据源)');
    console.error('🍎 是否iOS Safari:', isIOSSafari());
    console.error('🎵 当前歌曲:', currentSong ? currentSong.title : '无');
    console.error('📁 文件夹:', currentSong ? currentSong.folder : '无');
    console.error('📝 当前类型:', currentAudioType);
    console.error('🔧 User Agent:', navigator.userAgent.substring(0, 150));
    
    if (audio.error) {
        console.error('❌ 音频错误对象:', audio.error);
        console.error('❌ 错误代码:', audio.error.code);
        console.error('❌ 错误消息:', audio.error.message);
        
        switch (audio.error.code) {
            case audio.error.MEDIA_ERR_ABORTED:
                errorMessage = '音频加载被用户中止。';
                console.error('   → MEDIA_ERR_ABORTED (1): 用户中止');
                break;
            case audio.error.MEDIA_ERR_NETWORK:
                errorMessage = '网络错误，无法加载音频文件。请检查网络连接。';
                console.error('   → MEDIA_ERR_NETWORK (2): 网络错误');
                break;
            case audio.error.MEDIA_ERR_DECODE:
                errorMessage = '音频文件解码失败，可能已损坏。';
                console.error('   → MEDIA_ERR_DECODE (3): 解码失败');
                break;
            case audio.error.MEDIA_ERR_SRC_NOT_SUPPORTED:
                errorMessage = '音频格式不支持或文件不存在。';
                console.error('   → MEDIA_ERR_SRC_NOT_SUPPORTED (4): 格式不支持或文件不存在');
                console.error('   提示: 检查文件路径是否正确');
                console.error('   提示: 检查R2存储桶是否有该文件');
                console.error('   提示: 检查CORS配置');
                break;
            default:
                errorMessage = `发生未知音频错误。代码: ${audio.error.code}`;
                console.error('   → 未知错误代码:', audio.error.code);
        }
    } else if (e && e.name) {
        // 处理来自 play() promise 的拒绝
        console.error('❌ 播放Promise错误:', e);
        console.error('❌ 错误名称:', e.name);
        console.error('❌ 错误消息:', e.message);
        
        if (e.name === 'NotSupportedError') {
             errorMessage = '音频格式不支持或文件不存在。';
        } else {
            errorMessage = `播放时发生错误: ${e.name}`;
        }
    }
    
    console.error('\n💡 最终错误信息:', errorMessage);
    console.error('💡 完整URL:', audio.src);
    console.error('==========================================\n');
    showError(errorMessage);
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
}

// 隐藏错误消息
function hideError() {
    elements.errorToast.style.display = 'none';
}

// 更新折叠/展开图标
function updateToggleIcon() {
    const isCollapsed = elements.playerSection.classList.contains('collapsed');
    const isMobile = window.innerWidth <= 768;
    
    if (isCollapsed) {
        if (isMobile) {
            elements.playerToggleIcon.src = 'icons/expand.png';
            elements.playerToggleIcon.alt = '展开';
        } else {
            elements.playerToggleIcon.src = 'icons/expand.png';
            elements.playerToggleIcon.alt = '展开';
        }
    } else {
        if (isMobile) {
            elements.playerToggleIcon.src = 'icons/collapse.png';
            elements.playerToggleIcon.alt = '折叠';
        } else {
            elements.playerToggleIcon.src = 'icons/collapse.png';
            elements.playerToggleIcon.alt = '折叠';
        }
    }
}

// 切换播放器视图（收起/展开）
function togglePlayerView() {
    elements.appMain.classList.toggle('player-collapsed'); // 关键修复：恢复主容器的class切换
    elements.playerSection.classList.toggle('collapsed');
    
    const isCollapsed = elements.playerSection.classList.contains('collapsed');
    
    updateToggleIcon();
    
    elements.playerToggleText.textContent = isCollapsed ? '展开' : '折叠';
    elements.playerToggleBtn.title = isCollapsed ? '展开播放器' : '收起播放器';
    updateSongTitles();
}

// 监听窗口大小变化，调整折叠图标
window.addEventListener('resize', function() {
    updateToggleIcon();
});

// 设置封面图片
function setupCoverImage() {
    const coverImage = document.getElementById('coverImage');
    if (!coverImage) return;
    
    // 处理图片加载失败
    coverImage.addEventListener('error', function() {
        console.log('封面图片加载失败，显示占位符');
        this.style.display = 'none';
        
        // 创建占位符
        const placeholder = document.createElement('div');
        placeholder.className = 'cover-placeholder';
        placeholder.innerHTML = '🎼<br>敬拜歌曲库';
        
        // 替换图片
        this.parentNode.appendChild(placeholder);
    });
    
    // 图片成功加载时的处理
    coverImage.addEventListener('load', function() {
        console.log('封面图片加载成功');
        this.style.display = 'block';
        this.style.opacity = '1';
    });
}

// --- Sheet Music Modal Functions ---
function openSheetModal(event) {
    // Only open if an actual image is clicked
    if (event.target.tagName === 'IMG') {
        elements.modalSheetImage.src = event.target.src;
        elements.sheetModal.style.display = 'flex';
    }
}

function closeSheetModal() {
    elements.sheetModal.style.animation = 'fadeOut 0.3s ease';
    setTimeout(() => {
        elements.sheetModal.style.display = 'none';
        elements.sheetModal.style.animation = 'fadeIn 0.3s ease'; // Reset for next time
    }, 280);
}

function updateSongTitles() {
    if (!elements.progressSongTitle || !elements.collapsedSongTitle) return;
    if (currentSong) {
        elements.progressSongTitle.innerHTML = `<span>${currentSong.title}</span>`;
        elements.collapsedSongTitle.innerHTML = `<span>${currentSong.title}</span>`;
    } else {
        elements.progressSongTitle.textContent = '';
        elements.collapsedSongTitle.textContent = '';
    }
    // 应用滚动效果
    applyMarquee(elements.progressSongTitle);
}

// 计算并应用跑马灯动画
function applyMarquee(el){
    if(!el) return;
    const containerWidth = el.offsetWidth;
    const textWidth = el.scrollWidth;
    if(textWidth<=containerWidth){
        el.style.animation='none';
        return;
    }
    const distance = textWidth - containerWidth;
    const speed = 40; // px per second
    const duration = (distance+containerWidth)/speed;
    el.style.setProperty('--translate',`${-distance}px`);
    el.style.animation = `marquee ${duration}s linear infinite`;    
}

// 在窗口改变大小时重新计算
window.addEventListener('resize',()=>{
    applyMarquee(elements.progressSongTitle);
}); 

// URL参数处理相关函数


// 检测是否为移动端设备
function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           (navigator.maxTouchPoints && navigator.maxTouchPoints > 2 && /MacIntel/.test(navigator.platform));
}

// 检测是否支持自动播放
async function canAutoplay() {
    try {
        console.log('开始检测自动播放支持...');
        const audio = new Audio();
        audio.muted = true; // 静音测试
        audio.volume = 0; // 确保静音
        
        // 使用一个短的空音频进行测试
        audio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEcBj2c3vPJdSMFl';
        
        const playPromise = audio.play();
        if (playPromise !== undefined) {
            await playPromise;
            audio.pause();
            console.log('自动播放检测：支持');
            return true;
        }
        console.log('自动播放检测：不支持（无Promise）');
        return false;
    } catch (error) {
        console.log(`自动播放检测：不支持（${error.name}: ${error.message}）`);
        return false;
    }
}


// 检查URL参数并处理指定歌曲
async function checkUrlParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    const songParam = urlParams.get('song');
    
    if (songParam && songsData) {
        // 尝试通过ID或标题查找歌曲
        let targetSong = null;
        let targetIndex = -1;
        
        // 首先尝试通过ID查找
        targetIndex = songsData.findIndex(song => song.id === songParam);
        
        if (targetIndex === -1) {
            // 如果ID查找失败，尝试通过标题查找（支持模糊匹配）
            targetIndex = songsData.findIndex(song => 
                song.title.toLowerCase().includes(songParam.toLowerCase()) ||
                songParam.toLowerCase().includes(song.title.toLowerCase())
            );
        }
        
        if (targetIndex !== -1) {
            targetSong = songsData[targetIndex];
            console.log(`找到URL指定的歌曲: ${targetSong.title}`);
            
            // 设置当前播放列表为完整列表（如果有搜索过滤，需要重置）
            currentPlaylist = [...songsData];
            
            // 检查是否为移动端
            const isMobile = isMobileDevice();
            
            if (isMobile) {
                // 移动端：只选择歌曲，不自动播放，显示播放提示
                selectSongWithoutAutoplay(targetSong, targetIndex);
                showMobilePlayPrompt(targetSong.title);
            } else {
                // 桌面端：直接播放（按用户要求）
                selectSong(targetSong, targetIndex, true); // 分享链接自动播放
            }

        } else {
            console.log(`未找到URL指定的歌曲: ${songParam}`);
            showError(`未找到歌曲: ${songParam}`);
        }
    }
}

// 选择歌曲但不自动播放（用于移动端URL分享）

function selectSongWithoutAutoplay(song, index) {
    currentSong = song;
    currentIndex = index;
    
    // 更新UI（不包含自动播放）
    updateActiveSongListItem();
    loadSheetMusic();
    updateSongControls();
    updateSongTitles();
    
    // 更新URL以包含当前歌曲
    updateUrlWithSong(song);
    
    // 不自动播放，等待用户手动点击
}

// 显示移动端播放提示
function showMobilePlayPrompt(songTitle) {
    // 移除可能存在的旧提示
    const existingPrompt = document.querySelector('.mobile-play-prompt');
    if (existingPrompt) {
        existingPrompt.remove();
    }
    
    // 创建提示元素
    const prompt = document.createElement('div');
    prompt.className = 'mobile-play-prompt';
    prompt.innerHTML = `
        <div class="prompt-content">
            <div class="prompt-icon">🎵</div>
            <div class="prompt-text">
                <h3>已选择歌曲</h3>
                <p>《${songTitle}》</p>
                <p class="prompt-note">请点击播放按钮开始播放</p>
            </div>
            <button class="prompt-close" onclick="this.parentElement.parentElement.remove()">✕</button>
        </div>
    `;
    
    // 添加到页面
    document.body.appendChild(prompt);
    
    // 3秒后自动消失
    setTimeout(() => {
        if (prompt.parentNode) {
            prompt.remove();
        }
    }, 3000);
}


// 更新URL以包含当前播放的歌曲
function updateUrlWithSong(song) {
    if (song && song.id) {
        const newUrl = new URL(window.location);
        newUrl.searchParams.set('song', song.id);
        
        // 使用pushState更新URL，不会刷新页面
        window.history.pushState({songId: song.id}, '', newUrl);
    }
}

// 生成歌曲分享链接
function generateShareLink(song) {
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}?song=${encodeURIComponent(song.id)}`;
}

// 复制分享链接到剪贴板
async function copyShareLink(song) {
    try {
        const shareLink = generateShareLink(song);
        await navigator.clipboard.writeText(shareLink);
        
        // 显示成功提示
        showShareSuccess(song.title);
    } catch (error) {
        console.error('复制链接失败:', error);
        
        // 降级处理：创建临时输入框
        const tempInput = document.createElement('input');
        tempInput.value = generateShareLink(song);
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);
        
        showShareSuccess(song.title);
    }
}

// 显示分享成功提示
function showShareSuccess(songTitle) {
    // 创建提示元素
    const toast = document.createElement('div');
    toast.className = 'share-success-toast';
    toast.innerHTML = `
        <span>✅ 已复制《${songTitle}》的分享链接</span>
    `;
    
    // 添加到页面
    document.body.appendChild(toast);
    
    // 3秒后自动消失
    setTimeout(() => {
        if (toast.parentNode) {
            toast.remove();
        }
    }, 3000);
}

// 自定义索引字母相关变量
let customLetterModal = null;
let currentEditingSong = null;
let originalLetter = '';

// 初始化自定义字母模态框
function initCustomLetterModal() {
    customLetterModal = document.getElementById('customLetterModal');
    const closeBtn = document.getElementById('closeCustomLetterModal');
    const saveBtn = document.getElementById('saveCustomLetterBtn');
    const cancelBtn = document.getElementById('cancelCustomLetterBtn');
    const letterButtons = document.querySelectorAll('.letter-btn');
    const customLetterInput = document.getElementById('customLetterInput');
    
    // 关闭模态框
    closeBtn.addEventListener('click', closeCustomLetterModal);
    
    // 取消按钮
    cancelBtn.addEventListener('click', closeCustomLetterModal);
    
    // 保存按钮
    saveBtn.addEventListener('click', saveCustomLetter);
    
    // 字母按钮点击事件
    letterButtons.forEach(button => {
        button.addEventListener('click', function() {
            const letter = this.dataset.letter;
            if (letter === 'reset') {
                customLetterInput.value = originalLetter;
            } else {
                customLetterInput.value = letter;
            }
        });
    });
    
    // 输入框限制为单个字母
    customLetterInput.addEventListener('input', function() {
        this.value = this.value.slice(0, 1).toUpperCase();
    });
}

// 打开自定义字母模态框
function editSongLetter(songId, songTitle, currentLetter) {
    if (!customLetterModal) {
        initCustomLetterModal();
    }
    
    // 设置当前编辑的歌曲
    currentEditingSong = songsData.find(song => song.id === songId);
    originalLetter = currentLetter;
    
    // 更新模态框内容
    document.getElementById('songTitleDisplay').textContent = songTitle;
    document.getElementById('currentLetterDisplay').textContent = currentLetter;
    document.getElementById('customLetterInput').value = currentLetter;
    
    // 显示模态框
    customLetterModal.style.display = 'block';
}

// 关闭自定义字母模态框
function closeCustomLetterModal() {
    if (customLetterModal) {
        customLetterModal.style.display = 'none';
    }
    currentEditingSong = null;
}

// 保存自定义字母
function saveCustomLetter() {
    if (!currentEditingSong) return;
    
    const newLetter = document.getElementById('customLetterInput').value.toUpperCase();
    if (!newLetter) return;
    
    // 获取现有的自定义字母
    const customLetters = getCustomLetters();
    
    // 更新或添加自定义字母
    customLetters[currentEditingSong.id] = {
        letter: newLetter,
        title: currentEditingSong.title,
        timestamp: Date.now()
    };
    
    // 保存到本地存储
    localStorage.setItem('worshipMusic_customLetters', JSON.stringify(customLetters));
    
    // 更新歌曲的索引字母
    currentEditingSong.indexLetter = newLetter;
    currentEditingSong.sortKey = newLetter.toLowerCase() + currentEditingSong.title.toLowerCase();
    
    // 重新排序和渲染歌曲列表
    reorderAndRenderSongs();
    
    // 关闭模态框
    closeCustomLetterModal();
    
    // 显示成功消息
    showMessage(`已将歌曲 "${currentEditingSong.title}" 的索引字母设置为 "${newLetter}"`);
}

// 保存自定义字母到服务器功能已移除

// 重新排序和渲染歌曲列表
function reorderAndRenderSongs() {
    // 重新排序songsData
    songsData.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
    
    // 重新构建播放列表数据
    playlistsData = { "默认歌单": [] };
    songsData.forEach(song => {
        const playlistName = song.playlist || "默认歌单";
        if (!playlistsData[playlistName]) {
            playlistsData[playlistName] = [];
        }
        playlistsData[playlistName].push(song);
    });
    
    // 如果当前在播放列表中，需要重新排序当前播放列表
    if (currentPlaylistName !== "全部歌曲") {
        currentPlaylist = [...playlistsData[currentPlaylistName] || []];
        currentPlaylist.sort((a, b) => {
            // 如果两首歌都有数字前缀，按数字排序
            if (a.orderNumber !== 9999 && b.orderNumber !== 9999) {
                return a.orderNumber - b.orderNumber;
            }
            // 否则按字母和歌曲名排序
            return a.sortKey.localeCompare(b.sortKey);
        });
    } else {
        currentPlaylist = [...songsData];
    }
    
    // 重新渲染歌曲列表
    renderSongsList(currentPlaylist);
}
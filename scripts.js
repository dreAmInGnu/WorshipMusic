// 全局变量
let songsData = null;
// const R2_BASE_URL = "https://r2.windsmaker.com"; // 不再需要，音频通过 Worker 代理
let currentSong = null;
let currentPlaylist = [];
let currentIndex = 0;
// 播放模式：0=顺序播放, 1=随机播放, 2=单曲循环
let playMode = 0;
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
    collapsedSongTitle: null
};

// 初始化应用
document.addEventListener('DOMContentLoaded', async function() {
    initializeElements();
    setupEventListeners();
    await loadSongsData();
    setupAudioEventListeners();
    setupStagewiseToolbar();
    setupCoverImage();
    
    // 初始化折叠图标
    updateToggleIcon();
    
    // 检查URL参数，自动播放指定歌曲
    checkUrlParameters();
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
                console.warn('pinyin-pro 库未加载，使用简单排序');
                // 如果库未加载，使用简单的拼音映射
                songsData.forEach((song, index) => {
                    const firstChar = song.title.charAt(0);
                    // 简单的中文字符到拼音字母映射
                    let indexLetter = getSimplePinyinLetter(firstChar);
                    song.sortKey = indexLetter.toLowerCase() + song.title.toLowerCase();
                    song.indexLetter = indexLetter;
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
                const firstChar = song.title.charAt(0);
                let indexLetter = getSimplePinyinLetter(firstChar);
                song.sortKey = indexLetter.toLowerCase() + song.title.toLowerCase();
                song.indexLetter = indexLetter;
            });
        }
        // --- 排序结束 ---

        currentPlaylist = [...songsData];
        renderSongsList(currentPlaylist);
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
    
    songs.forEach((song, index) => {
        const songItem = document.createElement('div');
        songItem.className = 'song-item';
        songItem.dataset.songId = song.id;
        songItem.dataset.index = index;
        
        songItem.innerHTML = `
            <div class="song-info">
                <div class="song-title">${song.title}</div>
            </div>
            <div class="song-actions">
                <button class="share-btn" onclick="copyShareLink(${JSON.stringify(song).replace(/"/g, '&quot;')});" title="分享歌曲链接">
                    🔗
                </button>
                <div class="song-index-letter">${song.indexLetter}</div>
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
    
    // 根据autoPlay参数决定是否自动播放
    if (autoPlay) {
        playCurrentSong(currentAudioType);
    } else {
        // 不自动播放，不设置音频源，避免触发loadstart事件
        console.log(`歌曲已选中: ${currentSong.title}，等待手动播放`);
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
        elements.downloadSheetBtn.disabled = !currentSong.files.sheet;

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
    if (!currentSong) return;
    
    console.log(`开始播放歌曲: ${currentSong.title}, 类型: ${type}`);
    
    // 先暂停并重置音频播放器状态
    elements.audioPlayer.pause();
    
    currentAudioType = type;
    const audioUrl = buildAudioUrl(currentSong, type);
    
    // 设置新的音频源并立即重置播放位置
    elements.audioPlayer.src = audioUrl;
    elements.audioPlayer.currentTime = 0; // 立即重置，避免竞态条件
    console.log(`设置音频源: ${audioUrl}，播放位置已重置`);

    try {
        console.log('尝试播放音频...');
        showLoading(true); // 开始播放时显示加载状态
        
        // 等待音频准备就绪
        if (elements.audioPlayer.readyState < 2) {
            console.log('等待音频准备就绪...');
            await new Promise((resolve, reject) => {
                const onCanPlay = () => {
                    elements.audioPlayer.removeEventListener('canplay', onCanPlay);
                    elements.audioPlayer.removeEventListener('error', onError);
                    resolve();
                };
                const onError = (e) => {
                    elements.audioPlayer.removeEventListener('canplay', onCanPlay);
                    elements.audioPlayer.removeEventListener('error', onError);
                    reject(e);
                };
                elements.audioPlayer.addEventListener('canplay', onCanPlay, { once: true });
                elements.audioPlayer.addEventListener('error', onError, { once: true });
            });
        }
        
        await elements.audioPlayer.play();
        console.log('音频播放成功');
        showLoading(false); // 播放成功后隐藏加载状态
        updateAudioTypeButtons(type);
    } catch (error) {
        console.error(`播放错误: ${error.name}: ${error.message}`);
        console.error('错误详情:', error);
        
        // 确保在任何错误情况下都隐藏加载状态
        showLoading(false);
        
        // 简化错误处理，统一显示错误消息
        if (error.name === 'NotAllowedError') {
            console.log('自动播放被浏览器阻止，这是正常现象');
            // 不显示错误提示，让用户自然地点击播放按钮
        } else if (error.name === 'AbortError') {
            console.log('播放被中断，可能是因为快速切换歌曲');
            // AbortError通常不需要显示给用户，因为它是正常的中断行为
        } else {
            // 将其他播放错误传递给统一的错误处理器
            handleAudioError(error);
        }
    }
}

// 简单的中文字符到拼音字母映射
function getSimplePinyinLetter(char) {
    // 完整的中文字符拼音首字母映射表
    const pinyinMap = {
        // A开头
        '阿': 'A', '爱': 'A', '安': 'A', '按': 'A', '啊': 'A',
        // B开头
        '不': 'B', '白': 'B', '宝': 'B', '贝': 'B', '比': 'B', '被': 'B', '本': 'B', '别': 'B', '帮': 'B', '保': 'B',
        // C开头
        '超': 'C', '出': 'C', '充': 'C', '除': 'C', '从': 'C', '常': 'C', '成': 'C', '创': 'C', '唱': 'C',
        // D开头
        '大': 'D', '打': 'D', '的': 'D', '到': 'D', '得': 'D', '都': 'D', '但': 'D', '道': 'D', '等': 'D', '对': 'D',
        // E开头
        '恩': 'E', '而': 'E', '二': 'E', '儿': 'E',
        // F开头
        '复': 'F', '付': 'F', '父': 'F', '放': 'F', '飞': 'F', '分': 'F', '风': 'F', '丰': 'F',
        // G开头
        '光': 'G', '感': 'G', '歌': 'G', '给': 'G', '高': 'G', '国': 'G', '过': 'G', '跟': 'G', '更': 'G',
        // H开头
        '和': 'H', '何': 'H', '活': 'H', '荣': 'H', '好': 'H', '还': 'H', '很': 'H', '会': 'H', '后': 'H', '华': 'H',
        // J开头
        '基': 'J', '寄': 'J', '进': 'J', '君': 'J', '叫': 'J', '救': 'J', '就': 'J', '见': 'J', '今': 'J', '家': 'J', '加': 'J', '将': 'J', '教': 'J',
        // K开头
        '可': 'K', '看': 'K', '开': 'K', '快': 'K',
        // L开头
        '来': 'L', '立': 'L', '灵': 'L', '力': 'L', '炼': 'L', '了': 'L', '里': 'L', '离': 'L', '老': 'L', '路': 'L', '流': 'L',
        // M开头
        '美': 'M', '满': 'M', '名': 'M', '们': 'M', '没': 'M', '每': 'M', '面': 'M', '门': 'M',
        // N开头
        '你': 'N', '那': 'N', '能': 'N', '年': 'N', '内': 'N', '难': 'N',
        // P开头
        '平': 'P', '朋': 'P', '破': 'P', '普': 'P',
        // Q开头
        '奇': 'Q', '全': 'Q', '求': 'Q', '起': 'Q', '去': 'Q', '前': 'Q', '清': 'Q', '情': 'Q',
        // R开头
        '人': 'R', '如': 'R', '让': 'R', '然': 'R', '日': 'R', '热': 'R',
        // S开头
        '神': 'S', '圣': 'S', '生': 'S', '是': 'S', '什': 'S', '诗': 'S', '十': 'S', '时': 'S', '世': 'S', '手': 'S', '寻': 'S', '说': 'S', '水': 'S', '所': 'S', '死': 'S', '三': 'S', '上': 'S', '声': 'S',
        // T开头
        '天': 'T', '太': 'T', '听': 'T', '他': 'T', '她': 'T', '它': 'T', '同': 'T', '团': 'T', '这': 'T', '通': 'T', '头': 'T', '投': 'T',
        // W开头
        '我': 'W', '为': 'W', '万': 'W', '王': 'W', '无': 'W', '唯': 'W', '文': 'W', '问': 'W', '忘': 'W', '望': 'W', '完': 'W', '外': 'W',
        // X开头
        '新': 'X', '心': 'X', '行': 'X', '信': 'X', '喜': 'X', '想': 'X', '希': 'X', '幸': 'X', '献': 'X', '向': 'X', '下': 'X', '小': 'X', '像': 'X', '先': 'X',
        // Y开头
        '一': 'Y', '义': 'Y', '有': 'Y', '要': 'Y', '耶': 'Y', '与': 'Y', '以': 'Y', '因': 'Y', '永': 'Y', '用': 'Y', '又': 'Y', '医': 'Y', '应': 'Y', '牺': 'Y', '也': 'Y', '已': 'Y', '样': 'Y', '音': 'Y',
        // Z开头
        '在': 'Z', '主': 'Z', '真': 'Z', '只': 'Z', '知': 'Z', '中': 'Z', '住': 'Z', '最': 'Z', '自': 'Z', '尊': 'Z', '着': 'Z', '这': 'Z', '正': 'Z', '之': 'Z', '总': 'Z', '走': 'Z'
    };
    
    // 如果是英文字符，直接返回大写
    if (/^[a-zA-Z]/.test(char)) {
        return char.toUpperCase();
    }
    
    // 如果是数字，返回#
    if (/^[0-9]/.test(char)) {
        return '#';
    }
    
    // 查找中文字符映射
    if (pinyinMap[char]) {
        return pinyinMap[char];
    }
    
    // 对于未映射的汉字，使用Unicode编码范围判断
    const code = char.charCodeAt(0);
    if (code >= 0x4e00 && code <= 0x9fff) {
        // 是汉字但不在映射表中，根据Unicode编码进行简单分组
        const group = Math.floor((code - 0x4e00) / 800) % 26;
        return String.fromCharCode(65 + group); // A-Z
    }
    
    // 其他字符返回#
    return '#';
}

// 构建音频URL
function buildAudioUrl(song, type) {
    const fileName = type === 'original' ? song.files.original : song.files.accompaniment;
    // 使用新的 Worker 代理路径
    const audioUrl = `/api/audio/${song.folder}/${fileName}`;
    console.log(`构建音频URL (通过代理): ${audioUrl}`);
    console.log(`歌曲信息:`, {
        songTitle: song.title,
        type: type,
        folder: song.folder,
        fileName: fileName
    });
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
        
        // 检查音频是否已准备好播放
        if (elements.audioPlayer.readyState >= 2) { // HAVE_CURRENT_DATA or higher
            console.log('音频已准备好，直接播放');
            elements.audioPlayer.play().catch(e => handleAudioError(e));
        } else {
            console.log('音频未准备好，等待加载完成');
            showLoading(true);
            
            // 等待音频准备好再播放
            const playWhenReady = () => {
                console.log('音频准备完成，开始播放');
                showLoading(false);
                elements.audioPlayer.play().catch(e => handleAudioError(e));
            };
            
            // 错误处理函数
            const handleLoadError = () => {
                console.log('音频加载失败');
                showLoading(false);
                showError('音频加载失败，请检查网络连接或重试');
            };
            
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
    playMode = (playMode + 1) % 3; // 循环：0->1->2->0
    
    const modeIcon = elements.playModeBtn.querySelector('.mode-icon');
    const modeText = elements.playModeBtn.querySelector('span');
    
    // 移除所有模式类
    elements.playModeBtn.classList.remove('random', 'repeat-one');
    
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
    }
}

// 处理歌曲结束
function handleSongEnd() {
    console.log('歌曲播放结束，当前播放模式:', playMode);
    
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
    if (!currentSong || !currentSong.files.sheet) {
        elements.sheetDisplay.innerHTML = `
            <div class="sheet-placeholder">
                <p>🎼</p>
                <p>暂无歌谱</p>
            </div>
        `;
        return;
    }
    
    const sheetUrl = `/api/audio/${currentSong.folder}/${currentSong.files.sheet}`;
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
        await addFileToZip(folder, currentSong.files.original, `/api/audio/${currentSong.folder}/${currentSong.files.original}`);
        
        // 下载伴奏（如果有）
        if (currentSong.hasAccompaniment && currentSong.files.accompaniment) {
            await addFileToZip(folder, currentSong.files.accompaniment, `/api/audio/${currentSong.folder}/${currentSong.files.accompaniment}`);
        }
        
        // 下载歌谱
        if (currentSong.files.sheet) {
            await addFileToZip(folder, currentSong.files.sheet, `/api/audio/${currentSong.folder}/${currentSong.files.sheet}`);
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
    const baseUrl = `/api/audio/${song.folder}/`;

    switch (type) {
        case 'original':
            if (!song.files.original) { showError('该歌曲没有歌曲文件'); return; }
            fileName = song.files.original;
            fileUrl = `${baseUrl}${fileName}`;
            break;
        case 'accompaniment':
            if (!song.hasAccompaniment || !song.files.accompaniment) { showError('该歌曲没有伴奏文件'); return; }
            fileName = song.files.accompaniment;
            fileUrl = `${baseUrl}${fileName}`;
            break;
        case 'sheet':
            if (!song.files.sheet) { showError('该歌曲没有歌谱文件'); return; }
            fileName = song.files.sheet;
            fileUrl = `${baseUrl}${fileName}`;

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
    
    if (audio.error) {
        console.error('音频播放错误对象:', audio.error);
        switch (audio.error.code) {
            case audio.error.MEDIA_ERR_ABORTED:
                errorMessage = '音频加载被用户中止。';
                break;
            case audio.error.MEDIA_ERR_NETWORK:
                errorMessage = '网络错误，无法加载音频文件。';
                break;
            case audio.error.MEDIA_ERR_DECODE:
                errorMessage = '音频文件解码失败，可能已损坏。';
                break;
            case audio.error.MEDIA_ERR_SRC_NOT_SUPPORTED:
                errorMessage = '音频格式不支持或跨域访问被拒绝 (CORS)。请确认R2存储桶配置。';
                break;

            default:
                errorMessage = `发生未知音频错误。代码: ${audio.error.code}`;
        }
    } else if (e && e.name) {
        // 处理来自 play() promise 的拒绝
        console.error('播放Promise错误:', e);
        if (e.name === 'NotSupportedError') {
             errorMessage = '音频格式不支持或跨域访问被拒绝 (CORS)。请确认R2存储桶配置。';
        } else {
            errorMessage = `播放时发生错误: ${e.name}`;
        }
    }
    
    console.error('最终错误信息:', errorMessage, 'URL:', audio.src);
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
    
    // 3秒后自动隐藏
    setTimeout(() => {
        hideError();
    }, 3000);
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
        this.style.opacity = '0';
        this.style.display = 'block';
        
        // 淡入效果
        setTimeout(() => {
            this.style.transition = 'opacity 0.5s ease';
            this.style.opacity = '1';
        }, 100);
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
    
    // 5秒后自动消失
    setTimeout(() => {
        if (prompt.parentNode) {
            prompt.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => prompt.remove(), 300);
        }
    }, 5000);
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
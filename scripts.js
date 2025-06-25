// 全局变量
let songsData = null;
const R2_BASE_URL = "https://pub-6cbcd0cfdd0646f1af28394522f92bcf.r2.dev";
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
    closeSheetModal: null
};

// 初始化应用
document.addEventListener('DOMContentLoaded', async function() {
    initializeElements();
    setupEventListeners();
    await loadSongsData();
    setupAudioEventListeners();
    setupStagewiseToolbar();
    
    // 初始化折叠图标
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
        elements.playerToggleIcon.innerHTML = '🔽';
    } else {
        elements.playerToggleIcon.innerHTML = '🔼';
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
        handleSearch();
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
}

// 播放当前歌曲
async function playCurrentSong(type) {
    if (!currentSong) return;
    
    currentAudioType = type;
    const audioUrl = buildAudioUrl(currentSong, type);
    elements.audioPlayer.src = audioUrl;

    try {
        await elements.audioPlayer.play();
        updateAudioTypeButtons(type);
    } catch (error) {
        // 将播放错误传递给统一的错误处理器
        handleAudioError(error);
        console.error(`播放失败: ${error.name}: ${error.message}`);
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
    const audioUrl = `${R2_BASE_URL}/${song.folder}/${fileName}`;
    console.log(`构建音频URL: ${audioUrl}`);
    console.log(`歌曲信息:`, {
        title: song.title,
        folder: song.folder,
        fileName: fileName,
        type: type,
        files: song.files
    });
    return audioUrl;
}

// 切换播放/暂停
function togglePlayPause() {
    if (elements.audioPlayer.paused) {
        if (!currentSong) {
            playRandomSong();
            return;
        }
        elements.audioPlayer.play().catch(e => handleAudioError(e));
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
    // 在随机模式下，下一首应该是随机选择
    if (isRandomMode) {
        playRandomSong();
        return;
    }
    
    if (!currentSong || currentPlaylist.length === 0) {
        if (currentPlaylist.length > 0) {
            selectSong(currentPlaylist[0], 0);
        } else {
            showError('歌曲列表为空');
        }
        return;
    }
    
    currentIndex = (currentIndex + 1) % currentPlaylist.length;
    const nextSong = currentPlaylist[currentIndex];
    selectSong(nextSong, currentIndex);
}

// 播放上一首歌曲
function playPreviousSong() {
    // 在随机模式下，上一首应该是随机选择
    if (isRandomMode) {
        playRandomSong();
        return;
    }
    
    if (!currentSong || currentPlaylist.length === 0) {
        if (currentPlaylist.length > 0) {
            selectSong(currentPlaylist[0], 0);
        } else {
            showError('歌曲列表为空');
        }
        return;
    }
    
    currentIndex = (currentIndex - 1 + currentPlaylist.length) % currentPlaylist.length;
    const prevSong = currentPlaylist[currentIndex];
    selectSong(prevSong, currentIndex);
}

// 播放随机歌曲
function playRandomSong() {
    if (currentPlaylist.length <= 1) {
        // 如果列表为空或只有一首歌，没必要随机播放
        if (currentPlaylist.length === 1 && elements.audioPlayer.paused) {
            selectSong(currentPlaylist[0], 0);
        }
        return;
    }
    
    let randomIndex;
    do {
        randomIndex = Math.floor(Math.random() * currentPlaylist.length);
    } while (randomIndex === currentIndex); // 确保不会连续随机到同一首歌

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
        filteredSongs = [...songsData];
    }
    
    currentPlaylist = filteredSongs; // 关键修复：搜索后立即更新播放列表
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

// 切换播放器视图（收起/展开）
function togglePlayerView() {
    elements.appMain.classList.toggle('player-collapsed'); // 关键修复：恢复主容器的class切换
    elements.playerSection.classList.toggle('collapsed');
    
    const isCollapsed = elements.playerSection.classList.contains('collapsed');
    
    // 根据屏幕宽度决定图标方向
    const isMobile = window.innerWidth <= 768;
    if (isCollapsed) {
        if (isMobile) {
            elements.playerToggleIcon.innerHTML = '🔼';
        } else {
            elements.playerToggleIcon.innerHTML = '🔽';
        }
    } else {
        if (isMobile) {
            elements.playerToggleIcon.innerHTML = '🔽';
        } else {
            elements.playerToggleIcon.innerHTML = '🔼';
        }
    }
    
    elements.playerToggleText.textContent = isCollapsed ? '展开' : '折叠';
    elements.playerToggleBtn.title = isCollapsed ? '展开播放器' : '收起播放器';
}

// 监听窗口大小变化，调整折叠图标
window.addEventListener('resize', function() {
    const isCollapsed = elements.playerSection.classList.contains('collapsed');
    const isMobile = window.innerWidth <= 768;
    
    if (isCollapsed) {
        if (isMobile) {
            elements.playerToggleIcon.innerHTML = '🔼';
        } else {
            elements.playerToggleIcon.innerHTML = '🔽';
        }
    } else {
        if (isMobile) {
            elements.playerToggleIcon.innerHTML = '🔽';
        } else {
            elements.playerToggleIcon.innerHTML = '🔼';
        }
    }
});

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
/**
 * 播放列表功能模块
 * 实现播放列表的创建、管理和播放功能
 */

// 播放列表数据结构
let playlists = {
    default: {
        name: "默认播放列表",
        songs: []
    }
};

// 当前选中的播放列表
let currentPlaylistId = 'default';

// 播放列表模态框状态
let playlistModalVisible = false;

// 当前播放的播放列表信息
let playingPlaylistInfo = {
    playlistId: null,       // 当前播放的播放列表ID
    currentIndex: -1,       // 当前播放的歌曲索引
    isPlayingFromPlaylist: false  // 是否正在从播放列表播放
};

/**
 * 初始化播放列表功能
 * 在页面加载完成后自动调用
 */
document.addEventListener('DOMContentLoaded', function() {
    loadPlaylistsFromStorage();
    updatePlaylistSelector();
    setupPlaylistControls();
});

/**
 * 设置播放列表控制按钮的事件监听器
 */
function setupPlaylistControls() {
    // 上一首按钮
    if (elements.playlistPrevBtn) {
        elements.playlistPrevBtn.addEventListener('click', playPreviousFromPlaylist);
    }
    
    // 下一首按钮
    if (elements.playlistNextBtn) {
        elements.playlistNextBtn.addEventListener('click', playNextFromPlaylist);
    }
}

/**
 * 从localStorage加载播放列表数据
 */
function loadPlaylistsFromStorage() {
    try {
        const savedPlaylists = localStorage.getItem('worshipMusic_playlists');
        if (savedPlaylists) {
            playlists = JSON.parse(savedPlaylists);
            
            // 确保默认播放列表存在
            if (!playlists.default) {
                playlists.default = {
                    name: "默认播放列表",
                    songs: []
                };
            }
        }
        
        // 加载上次选择的播放列表ID
        const savedPlaylistId = localStorage.getItem('worshipMusic_currentPlaylistId');
        if (savedPlaylistId && playlists[savedPlaylistId]) {
            currentPlaylistId = savedPlaylistId;
        } else {
            currentPlaylistId = 'default';
        }
        
        console.log('播放列表加载成功:', Object.keys(playlists).length, '个播放列表');
    } catch (error) {
        console.error('加载播放列表失败:', error);
        // 重置为默认状态
        playlists = {
            default: {
                name: "默认播放列表",
                songs: []
            }
        };
        currentPlaylistId = 'default';
    }
}

/**
 * 保存播放列表数据到localStorage
 */
function savePlaylistsToStorage() {
    try {
        localStorage.setItem('worshipMusic_playlists', JSON.stringify(playlists));
        localStorage.setItem('worshipMusic_currentPlaylistId', currentPlaylistId);
        console.log('播放列表保存成功');
    } catch (error) {
        console.error('保存播放列表失败:', error);
        showError('保存播放列表失败，请检查浏览器存储空间');
    }
}

/**
 * 更新播放列表选择器
 */
function updatePlaylistSelector() {
    if (!elements.playlistSelector) return;
    
    // 清空现有选项
    elements.playlistSelector.innerHTML = '';
    
    // 添加播放列表选项
    Object.keys(playlists).forEach(playlistId => {
        const option = document.createElement('option');
        option.value = playlistId;
        option.textContent = playlists[playlistId].name;
        option.selected = (playlistId === currentPlaylistId);
        elements.playlistSelector.appendChild(option);
    });
}

/**
 * 加载选中的播放列表
 */
function loadSelectedPlaylist() {
    if (!elements.playlistSelector) return;
    
    const selectedPlaylistId = elements.playlistSelector.value;
    if (selectedPlaylistId && playlists[selectedPlaylistId]) {
        currentPlaylistId = selectedPlaylistId;
        renderPlaylistItems();
        savePlaylistsToStorage();
    }
}

/**
 * 渲染播放列表项目
 */
function renderPlaylistItems() {
    if (!elements.playlistItems) return;
    
    // 清空现有项目
    elements.playlistItems.innerHTML = '';
    
    const currentPlaylist = playlists[currentPlaylistId];
    if (!currentPlaylist || !currentPlaylist.songs || currentPlaylist.songs.length === 0) {
        // 显示空播放列表提示
        const emptyMessage = document.createElement('div');
        emptyMessage.className = 'playlist-empty-message';
        emptyMessage.textContent = '播放列表为空，请添加歌曲';
        elements.playlistItems.appendChild(emptyMessage);
        
        // 禁用播放控制按钮
        updatePlaylistControlButtons(false);
        return;
    }
    
    // 启用播放控制按钮
    updatePlaylistControlButtons(true);
    
    // 添加播放列表项目
    currentPlaylist.songs.forEach((song, index) => {
        const playlistItem = document.createElement('div');
        playlistItem.className = 'playlist-item';
        
        // 如果当前正在播放这首歌曲，添加高亮样式
        if (playingPlaylistInfo.isPlayingFromPlaylist && 
            playingPlaylistInfo.playlistId === currentPlaylistId && 
            playingPlaylistInfo.currentIndex === index) {
            playlistItem.classList.add('now-playing');
        }
        
        playlistItem.dataset.songId = song.id;
        playlistItem.dataset.index = index;
        
        playlistItem.innerHTML = `
            <div class="playlist-item-info">
                <div class="playlist-item-title">${song.title}</div>
                ${playingPlaylistInfo.currentIndex === index && playingPlaylistInfo.playlistId === currentPlaylistId ? 
                    '<div class="now-playing-indicator">▶ 正在播放</div>' : ''}
            </div>
            <div class="playlist-item-actions">
                <button class="playlist-item-play-btn" title="播放">▶</button>
                <button class="playlist-item-remove-btn" title="从播放列表中移除">✕</button>
            </div>
        `;
        
        // 添加播放按钮点击事件
        const playBtn = playlistItem.querySelector('.playlist-item-play-btn');
        if (playBtn) {
            playBtn.addEventListener('click', () => {
                playFromPlaylist(index);
            });
        }
        
        // 添加移除按钮点击事件
        const removeBtn = playlistItem.querySelector('.playlist-item-remove-btn');
        if (removeBtn) {
            removeBtn.addEventListener('click', () => {
                removeSongFromPlaylist(index);
            });
        }
        
        // 点击整个项目也可以播放
        playlistItem.addEventListener('dblclick', () => {
            playFromPlaylist(index);
        });
        
        elements.playlistItems.appendChild(playlistItem);
    });
}

/**
 * 更新播放列表控制按钮状态
 * @param {boolean} enabled 是否启用按钮
 */
function updatePlaylistControlButtons(enabled) {
    if (elements.playAllBtn) {
        elements.playAllBtn.disabled = !enabled;
    }
    
    if (elements.playlistPrevBtn) {
        elements.playlistPrevBtn.disabled = !enabled;
    }
    
    if (elements.playlistNextBtn) {
        elements.playlistNextBtn.disabled = !enabled;
    }
}

/**
 * 打开播放列表模态框
 */
function openPlaylistModal() {
    if (!elements.playlistModal) return;
    
    renderPlaylistItems();
    elements.playlistModal.style.display = 'flex';
    playlistModalVisible = true;
}

/**
 * 关闭播放列表模态框
 */
function closePlaylistModal() {
    if (!elements.playlistModal) return;
    
    elements.playlistModal.style.display = 'none';
    playlistModalVisible = false;
}

/**
 * 添加歌曲到当前播放列表
 * @param {Object} song 要添加的歌曲对象
 */
function addSongToPlaylist(song) {
    if (!song || !song.id) {
        showError('无效的歌曲，无法添加到播放列表');
        return;
    }
    
    // 获取当前播放列表
    const currentPlaylist = playlists[currentPlaylistId];
    if (!currentPlaylist) {
        showError('播放列表不存在');
        return;
    }
    
    // 检查歌曲是否已存在于播放列表中
    const songExists = currentPlaylist.songs.some(s => s.id === song.id);
    if (songExists) {
        showPlaylistMessage(`《${song.title}》已在播放列表中`);
        return;
    }
    
    // 添加歌曲到播放列表
    currentPlaylist.songs.push(song);
    savePlaylistsToStorage();
    
    // 如果播放列表模态框可见，更新显示
    if (playlistModalVisible) {
        renderPlaylistItems();
    }
    
    showPlaylistMessage(`已将《${song.title}》添加到播放列表`);
}

/**
 * 从播放列表中移除歌曲
 * @param {number} index 要移除的歌曲索引
 */
function removeSongFromPlaylist(index) {
    // 获取当前播放列表
    const currentPlaylist = playlists[currentPlaylistId];
    if (!currentPlaylist || !currentPlaylist.songs || index < 0 || index >= currentPlaylist.songs.length) {
        return;
    }
    
    // 获取歌曲标题用于提示
    const songTitle = currentPlaylist.songs[index].title;
    
    // 移除歌曲
    currentPlaylist.songs.splice(index, 1);
    savePlaylistsToStorage();
    
    // 更新播放列表显示
    renderPlaylistItems();
    
    showPlaylistMessage(`已从播放列表中移除《${songTitle}》`);
}

/**
 * 从播放列表中播放指定索引的歌曲
 * @param {number} index 要播放的歌曲索引
 */
function playFromPlaylist(index) {
    // 获取当前播放列表
    const currentPlaylist = playlists[currentPlaylistId];
    if (!currentPlaylist || !currentPlaylist.songs || index < 0 || index >= currentPlaylist.songs.length) {
        return;
    }
    
    // 获取要播放的歌曲
    const song = currentPlaylist.songs[index];
    
    // 在全局歌曲列表中查找该歌曲的索引
    const globalIndex = songsData.findIndex(s => s.id === song.id);
    if (globalIndex !== -1) {
        // 更新播放列表信息
        playingPlaylistInfo.playlistId = currentPlaylistId;
        playingPlaylistInfo.currentIndex = index;
        playingPlaylistInfo.isPlayingFromPlaylist = true;
        
        // 选择并播放歌曲
        selectSong(song, globalIndex, true);
        
        // 更新播放列表项目高亮
        renderPlaylistItems();
        
        // 不关闭播放列表模态框，让用户可以继续操作
        // closePlaylistModal();
    } else {
        showError(`无法播放《${song.title}》，歌曲不存在于数据库中`);
    }
}

/**
 * 播放播放列表中的上一首歌曲
 */
function playPreviousFromPlaylist() {
    if (!playingPlaylistInfo.isPlayingFromPlaylist) {
        // 如果当前不是从播放列表播放，则从当前播放列表的最后一首开始
        playFromPlaylist(playlists[currentPlaylistId].songs.length - 1);
        return;
    }
    
    const currentPlaylist = playlists[playingPlaylistInfo.playlistId];
    if (!currentPlaylist || !currentPlaylist.songs || currentPlaylist.songs.length === 0) {
        return;
    }
    
    // 计算上一首索引（循环到最后一首）
    const prevIndex = (playingPlaylistInfo.currentIndex - 1 + currentPlaylist.songs.length) % currentPlaylist.songs.length;
    
    // 播放上一首
    if (currentPlaylistId === playingPlaylistInfo.playlistId) {
        // 如果当前显示的就是正在播放的播放列表，直接播放
        playFromPlaylist(prevIndex);
    } else {
        // 否则，先切换到正在播放的播放列表，再播放
        currentPlaylistId = playingPlaylistInfo.playlistId;
        updatePlaylistSelector();
        renderPlaylistItems();
        playFromPlaylist(prevIndex);
    }
}

/**
 * 播放播放列表中的下一首歌曲
 */
function playNextFromPlaylist() {
    if (!playingPlaylistInfo.isPlayingFromPlaylist) {
        // 如果当前不是从播放列表播放，则从当前播放列表的第一首开始
        playFromPlaylist(0);
        return;
    }
    
    const currentPlaylist = playlists[playingPlaylistInfo.playlistId];
    if (!currentPlaylist || !currentPlaylist.songs || currentPlaylist.songs.length === 0) {
        return;
    }
    
    // 计算下一首索引（循环到第一首）
    const nextIndex = (playingPlaylistInfo.currentIndex + 1) % currentPlaylist.songs.length;
    
    // 播放下一首
    if (currentPlaylistId === playingPlaylistInfo.playlistId) {
        // 如果当前显示的就是正在播放的播放列表，直接播放
        playFromPlaylist(nextIndex);
    } else {
        // 否则，先切换到正在播放的播放列表，再播放
        currentPlaylistId = playingPlaylistInfo.playlistId;
        updatePlaylistSelector();
        renderPlaylistItems();
        playFromPlaylist(nextIndex);
    }
}

/**
 * 播放当前播放列表中的所有歌曲
 */
function playAllFromPlaylist() {
    // 获取当前播放列表
    const currentPlaylist = playlists[currentPlaylistId];
    if (!currentPlaylist || !currentPlaylist.songs || currentPlaylist.songs.length === 0) {
        showError('播放列表为空，无法播放');
        return;
    }
    
    // 设置播放模式为列表循环（模式3）
    // 注意：这会影响全局播放模式，但用户可以随时切换回去
    playMode = 3; // 列表循环
    updatePlayModeUI(); // 更新播放模式UI
    
    // 播放第一首歌曲
    playFromPlaylist(0);
    
    showPlaylistMessage(`正在播放"${currentPlaylist.name}"，列表循环模式`);
}

/**
 * 更新播放模式UI
 * 这个函数需要与scripts.js中的togglePlayMode函数保持同步
 */
function updatePlayModeUI() {
    if (!elements.playModeBtn) return;
    
    const modeIcon = elements.playModeBtn.querySelector('.mode-icon');
    const modeText = elements.playModeBtn.querySelector('span');
    
    if (!modeIcon || !modeText) return;
    
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

/**
 * 清空当前播放列表
 */
function clearCurrentPlaylist() {
    // 获取当前播放列表
    const currentPlaylist = playlists[currentPlaylistId];
    if (!currentPlaylist) {
        return;
    }
    
    // 确认是否清空
    if (confirm(`确定要清空"${currentPlaylist.name}"播放列表吗？`)) {
        // 清空歌曲列表
        currentPlaylist.songs = [];
        savePlaylistsToStorage();
        
        // 更新播放列表显示
        renderPlaylistItems();
        
        showPlaylistMessage(`已清空"${currentPlaylist.name}"播放列表`);
    }
}

/**
 * 创建新的播放列表
 */
function createNewPlaylist() {
    const playlistName = prompt('请输入新播放列表名称:');
    if (!playlistName || playlistName.trim() === '') {
        return;
    }
    
    // 创建唯一ID
    const playlistId = 'playlist_' + Date.now();
    
    // 创建新播放列表
    playlists[playlistId] = {
        name: playlistName.trim(),
        songs: []
    };
    
    // 切换到新播放列表
    currentPlaylistId = playlistId;
    
    // 保存并更新UI
    savePlaylistsToStorage();
    updatePlaylistSelector();
    renderPlaylistItems();
    
    showPlaylistMessage(`已创建"${playlistName.trim()}"播放列表`);
}

/**
 * 重命名当前播放列表
 */
function renameCurrentPlaylist() {
    // 不允许重命名默认播放列表
    if (currentPlaylistId === 'default') {
        showError('默认播放列表不能重命名');
        return;
    }
    
    const currentPlaylist = playlists[currentPlaylistId];
    if (!currentPlaylist) {
        return;
    }
    
    const newName = prompt('请输入新的播放列表名称:', currentPlaylist.name);
    if (!newName || newName.trim() === '') {
        return;
    }
    
    // 更新播放列表名称
    currentPlaylist.name = newName.trim();
    
    // 保存并更新UI
    savePlaylistsToStorage();
    updatePlaylistSelector();
    
    showPlaylistMessage(`播放列表已重命名为"${newName.trim()}"`);
}

/**
 * 删除当前播放列表
 */
function deleteCurrentPlaylist() {
    // 不允许删除默认播放列表
    if (currentPlaylistId === 'default') {
        showError('默认播放列表不能删除');
        return;
    }
    
    const currentPlaylist = playlists[currentPlaylistId];
    if (!currentPlaylist) {
        return;
    }
    
    // 确认是否删除
    if (confirm(`确定要删除"${currentPlaylist.name}"播放列表吗？`)) {
        // 记住播放列表名称用于提示
        const playlistName = currentPlaylist.name;
        
        // 删除播放列表
        delete playlists[currentPlaylistId];
        
        // 切换到默认播放列表
        currentPlaylistId = 'default';
        
        // 保存并更新UI
        savePlaylistsToStorage();
        updatePlaylistSelector();
        renderPlaylistItems();
        
        showPlaylistMessage(`已删除"${playlistName}"播放列表`);
    }
}

/**
 * 显示播放列表相关的消息提示
 * @param {string} message 要显示的消息
 */
function showPlaylistMessage(message) {
    // 创建提示元素
    const toast = document.createElement('div');
    toast.className = 'playlist-message-toast';
    toast.textContent = message;
    
    // 添加到页面
    document.body.appendChild(toast);
    
    // 3秒后自动消失
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 3000);
}


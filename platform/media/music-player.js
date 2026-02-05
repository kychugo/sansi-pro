/**
 * Music Player Module
 * Manages the background music player with lazy loading
 */

// Music playlist data
const musicPlaylist = [
    { name: "The Abysswalker", url: "https://youfulca.com/wp-content/uploads/2022/08/Battle-Abysswalker.mp3" },
    { name: "死せる都の戰乙女", url: "https://youfulca.com/wp-content/uploads/2022/08/Battle-Rosemoon.mp3" },
    { name: "五大罪", url: "https://youfulca.com/wp-content/uploads/2022/08/Battle-deadly.mp3" },
    { name: "繼承劍的少女", url: "https://youfulca.com/wp-content/uploads/2022/08/Battle-rapier.mp3" },
    { name: "不屈意志之刃", url: "https://youfulca.com/wp-content/uploads/2022/08/Ariadne-Battle.mp3" },
    { name: "西部戰鬥", url: "https://youfulca.com/wp-content/uploads/2022/08/battle-arms.mp3" },
    { name: "Battle Theme", url: "https://youfulca.com/wp-content/uploads/2022/08/Battle.mp3" },
    { name: "流浪城鎮", url: "https://youfulca.com/wp-content/uploads/2022/08/Wanderers-City.mp3" },
    { name: "沉睡的記憶", url: "https://youfulca.com/wp-content/uploads/2022/08/Remotest-Liblary.mp3" },
    { name: "麥田懷舊", url: "https://youfulca.com/wp-content/uploads/2022/08/Nostalgia.mp3" },
    { name: "放學後", url: "https://youfulca.com/wp-content/uploads/2022/08/sunbeams.mp3" },
    { name: "鄉村生活", url: "https://youfulca.com/wp-content/uploads/2022/08/village.mp3" },
    { name: "休息一下", url: "https://youfulca.com/wp-content/uploads/2022/08/Take-a-Rest.mp3" },
    { name: "雪鄉", url: "https://youfulca.com/wp-content/uploads/2022/08/winter-snow.mp3" },
    { name: "被遺忘的地方", url: "https://youfulca.com/wp-content/uploads/2022/08/Forgotten-Place.mp3" },
    { name: "安息", url: "https://youfulca.com/wp-content/uploads/2022/08/Rest-in-Peace.mp3" },
    { name: "告別", url: "https://youfulca.com/wp-content/uploads/2022/08/Farewell.mp3" },
    { name: "回憶", url: "https://youfulca.com/wp-content/uploads/2022/08/reminiscence.mp3" },
    { name: "星夜", url: "https://youfulca.com/wp-content/uploads/2022/08/starry-night.mp3" },
    { name: "當思念傳到某人耳畔", url: "https://youfulca.com/wp-content/uploads/2022/08/last-wish.mp3" },
    { name: "超越悲傷", url: "https://youfulca.com/wp-content/uploads/2022/08/sorrow.mp3" },
    { name: "螢火蟲之路", url: "https://youfulca.com/wp-content/uploads/2022/08/hotarumichi.mp3" },
    { name: "飛艇", url: "https://youfulca.com/wp-content/uploads/2022/08/Sky-Airship.mp3" },
    { name: "跨越神秘之海", url: "https://youfulca.com/wp-content/uploads/2022/08/Voyage_SE.mp3" },
    { name: "盼望", url: "https://youfulca.com/wp-content/uploads/2022/08/main-theme01.mp3" },
    { name: "約定之地", url: "https://youfulca.com/wp-content/uploads/2022/08/saikai637.mp3" }
];

let musicPlayerInitialized = false;
let isPlaying = false;
let currentMusic = '';

// Initialize music player (lazy load - only on first open)
function initMusicPlayer() {
    if (musicPlayerInitialized) return;

    const audio = document.getElementById('audio');
    const playPauseBtn = document.getElementById('play-pause');
    const musicSelect = document.getElementById('music-select');
    const progressBarMusic = document.getElementById('progress-bar-music');
    const playMode = document.getElementById('play-mode');
    const hidePlayerBtn = document.getElementById('hide-player');
    const musicPlayer = document.getElementById('music-player');

    if (!audio || !playPauseBtn || !musicSelect || !progressBarMusic || !playMode || !hidePlayerBtn) {
        console.error('Music player elements not found');
        return;
    }

    // Generate music options dynamically
    const fragment = document.createDocumentFragment();
    musicPlaylist.forEach(song => {
        const option = document.createElement('option');
        option.value = song.url;
        option.textContent = song.name;
        fragment.appendChild(option);
    });
    musicSelect.appendChild(fragment);

    // Music selection handler
    musicSelect.addEventListener('change', function() {
        const selectedMusic = this.value;
        if (selectedMusic) {
            audio.src = selectedMusic;
            audio.load();
            currentMusic = selectedMusic;
            audio.play().then(() => {
                isPlaying = true;
                playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
            }).catch(error => console.error('自動播放失敗:', error));
        }
    });

    // Auto-play when audio can play
    audio.addEventListener('canplay', function() {
        if (isPlaying) audio.play();
    });

    // Play/pause button
    playPauseBtn.addEventListener('click', function() {
        if (isPlaying) {
            audio.pause();
            playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
        } else {
            if (currentMusic) {
                audio.play();
                playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
            } else {
                alert('請先選擇音樂');
            }
        }
        isPlaying = !isPlaying;
    });

    // Progress bar update
    audio.addEventListener('timeupdate', function() {
        if (!audio.duration) return;
        const progress = (audio.currentTime / audio.duration) * 100;
        progressBarMusic.value = progress;
    });

    progressBarMusic.addEventListener('input', function() {
        const time = (this.value / 100) * audio.duration;
        audio.currentTime = time;
    });

    // Auto-play next song logic
    audio.addEventListener('ended', function() {
        if (playMode.value === 'loop') {
            audio.currentTime = 0;
            audio.play();
        } else if (playMode.value === 'next') {
            const options = musicSelect.options;
            for (let i = 0; i < options.length; i++) {
                if (options[i].value === currentMusic) {
                    let nextIndex = (i + 1) % options.length;
                    if (nextIndex === 0) nextIndex = 1;
                    currentMusic = options[nextIndex].value;
                    musicSelect.value = currentMusic;
                    audio.src = currentMusic;
                    audio.load();
                    audio.play();
                    break;
                }
            }
        }
    });

    // Hide player button
    hidePlayerBtn.addEventListener('click', function() {
        musicPlayer.style.display = 'none';
    });

    musicPlayerInitialized = true;
    console.log("音樂播放器已初始化 (Lazy Load)");
}

// Toggle music player display
window.toggleMusicPlayer = function() {
    if (typeof initMusicPlayer === 'function') {
        initMusicPlayer();
    }

    const musicPlayer = document.getElementById('music-player');
    if (!musicPlayer) return;
    
    if (musicPlayer.style.display === 'none' || musicPlayer.style.display === '') {
        musicPlayer.style.display = 'flex';
    } else {
        musicPlayer.style.display = 'none';
    }
    
    // Close side menu
    const sideMenu = document.getElementById('sideMenu');
    if (sideMenu) {
        sideMenu.classList.remove('active');
        const sideMenuToggle = document.getElementById('sideMenuToggle');
        if (sideMenuToggle) sideMenuToggle.classList.remove('active');
    }
};

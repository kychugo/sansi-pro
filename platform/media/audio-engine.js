// ==========================================
// === [核心] 神思音效引擎 (V6 - iOS 持久授權版) ===
// ==========================================
const SansiAudio = {
    context: null,
    buffers: {},
    activeSources: {},
    silentNode: null,

    sounds: {
        'sleep_warning': '閉眼警告.mp3',
        'leave_warning': '離開警告.mp3'
    },

    init: async function() {
        if (this.context) return;
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.context = new AudioContext();
        
        for (const [name, url] of Object.entries(this.sounds)) {
            await this.load(name, url);
        }
    },

    async load(name, url) {
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            this.buffers[name] = await this.context.decodeAudioData(arrayBuffer);
        } catch (e) {
            console.error(`音效載入失敗 [${name}]:`, e);
        }
    },

    unlock: function() {
        if (!this.context) this.init();
        
        if (this.context.state === 'suspended') {
            this.context.resume().then(() => {
                console.log("🔊 [Audio] iOS 音訊軌道已成功恢復運行");
            });
        }

        if (!this.silentNode) {
            const buffer = this.context.createBuffer(1, 1, 22050);
            this.silentNode = this.context.createBufferSource();
            this.silentNode.buffer = buffer;
            this.silentNode.loop = true;
            this.silentNode.connect(this.context.destination);
            this.silentNode.start(0);
            console.log("🔊 [Audio] 靜默循環節點已掛載");
        }
    },

    play: function(name, loop = false) {
        if (!this.context || !this.buffers[name]) return;
        
        this.stop(name);

        const source = this.context.createBufferSource();
        const gainNode = this.context.createGain();
        source.buffer = this.buffers[name];
        source.loop = loop;
        
        source.connect(gainNode);
        gainNode.connect(this.context.destination);
        
        source.start(0);
        this.activeSources[name] = { source, gain: gainNode };
        console.log(`🎵 [Audio] 正在播放: ${name}`);
    },

    stop: function(name) {
        const active = this.activeSources[name];
        if (active) {
            try {
                active.source.stop();
                active.source.disconnect();
                active.gain.disconnect();
            } catch(e){}
            this.activeSources[name] = null;
        }
    }
};
 
// 自動初始化
document.addEventListener('DOMContentLoaded', () => {
    const unlockHandler = () => {
        SansiAudio.unlock();
        document.removeEventListener('touchstart', unlockHandler);
        document.removeEventListener('click', unlockHandler);
    };
    document.addEventListener('touchstart', unlockHandler, {passive: true});
    document.addEventListener('click', unlockHandler, {passive: true});
    SansiAudio.init();
});

/**
 * ======================================
 * Live2D 模型管理模組
 * ======================================
 * 負責 Live2D 模型的載入、顯示、互動與動畫管理
 * 包含：模型初始化、貓咪選擇、拖曳、縮放、點擊互動
 */

// PIXI.js 與 Live2D 插件由外部載入
// 需要在 HTML 中引入相關的 script 標籤

// === Live2D 模型路徑配置 ===
const MODEL_PATH_HIJIKI = 'live2d/hijiki/runtime/hijiki.model3.json';
const MODEL_PATH_TORORO = 'live2d/tororo/runtime/tororo.model3.json';

// === 貓叫聲效庫 ===
const CAT_SOUNDS = [
    '貓叫一.mp3', 
    '貓叫二.mp3', 
    '貓叫三.mp3'
];

// === 全域變數 ===
let app;
let modelContainer; 
const CANVAS_ID = 'live2d-canvas';

// === 互動狀態 ===
let isDragging = false;
let isPinching = false;
let isLongPress = false; 
let isCatLoading = false; // 載入鎖定旗標

// 座標相關
let startX = 0, startY = 0;
let containerStartX = 0, containerStartY = 0;

// 縮放相關
let initialPinchDist = 0;
let initialScale = 1;

// 雙擊相關
let lastTapTime = 0;

// 長按相關
let pressTimer = null;
const LONG_PRESS_DURATION = 800; // 800ms 觸發

// 對話氣泡元素
let speechBubble = null;
let bubbleTimer = null;

/**
 * 初始化 Live2D 應用
 * 創建 PIXI 應用並設定畫布
 */
async function initLive2DApp() {
    const canvas = document.getElementById(CANVAS_ID);
    if (app) return;

    // ★★★ 優化：手機端防滾動關鍵設定 ★★★
    // 這行 CSS 會告訴瀏覽器：在這個畫布上禁止預設的滑動/縮放行為
    canvas.style.touchAction = 'none'; 

    app = new PIXI.Application({
        view: canvas,
        autoStart: true,
        backgroundAlpha: 0,
        resizeTo: window, 
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
    });

    modelContainer = new PIXI.Container();
    app.stage.addChild(modelContainer);
    
    modelContainer.visible = false;
    modelContainer.alpha = 0;
}

/**
 * 載入帶快取的 Live2D 模型
 * 使用 Base64 內嵌版避免跨域問題
 * @param {string} modelUrl - 模型 JSON 檔案的 URL
 * @returns {Promise<PIXI.live2d.Live2DModel>} Live2D 模型實例
 */
async function loadCachedLive2DModel(modelUrl) {
    // A. 下載並解析 model3.json
    const jsonBlob = await fetchWithCache(modelUrl);
    const jsonText = await jsonBlob.text();
    const modelData = JSON.parse(jsonText);

    // B. 計算基礎路徑
    const basePath = modelUrl.substring(0, modelUrl.lastIndexOf('/') + 1);

    // C. 建立 Promise 陣列
    const promises = [];

    // 輔助：將路徑替換為 Base64 Data URI
    const replacePathWithBase64 = async (obj, key) => {
        const relativePath = obj[key];
        if (!relativePath) return;

        const fullUrl = basePath + relativePath;
        const blob = await fetchWithCache(fullUrl);
        
        // ★ 關鍵改變：轉成 Base64 字串，而不是 Blob URL
        const dataUrl = await blobToDataURL(blob);
        obj[key] = dataUrl;
    };

    // D. 掃描並替換所有資源
    if (modelData.FileReferences) {
        // 1. Moc 檔 (核心模型)
        if (modelData.FileReferences.Moc) {
            promises.push(replacePathWithBase64(modelData.FileReferences, 'Moc'));
        }
        // 2. Physics 檔 (物理)
        if (modelData.FileReferences.Physics) {
            promises.push(replacePathWithBase64(modelData.FileReferences, 'Physics'));
        }
        // 3. Textures (貼圖陣列)
        if (modelData.FileReferences.Textures) {
            modelData.FileReferences.Textures.forEach((tex, index) => {
                const fullUrl = basePath + tex;
                promises.push((async () => {
                    const blob = await fetchWithCache(fullUrl);
                    const dataUrl = await blobToDataURL(blob);
                    modelData.FileReferences.Textures[index] = dataUrl;
                })());
            });
        }
        // 4. Motions (動作)
        if (modelData.FileReferences.Motions) {
            const groups = modelData.FileReferences.Motions;
            for (const groupName in groups) {
                groups[groupName].forEach(motion => {
                    if (motion.File) {
                        const fullUrl = basePath + motion.File;
                        promises.push((async () => {
                            const blob = await fetchWithCache(fullUrl);
                            const dataUrl = await blobToDataURL(blob);
                            motion.File = dataUrl;
                        })());
                    }
                });
            }
        }
    }

    // 等待所有檔案都轉成 Base64 字串
    await Promise.all(promises);

    // E. 設定必要屬性以滿足插件檢查
    // 雖然現在所有資源都是 Data URI，插件仍需要一個 url 欄位來通過格式驗證
    modelData.url = modelUrl;

    // F. 載入模型
    // 由於所有路徑都變成了 "data:image/png;base64,..." 這種格式，
    // 插件會直接解析字串數據，完全不會發出網絡請求。
    return await PIXI.live2d.Live2DModel.from(modelData);
}

/**
 * 選擇貓咪模式
 * @param {string} mode - 模式：'hijiki' (黑貓)、'tororo' (白貓)、'both' (雙貓)、'none' (無)
 * @param {boolean} save - 是否儲存選擇
 */
async function selectCatMode(mode, save = true) {
    if (isCatLoading) return; // 防止重複點擊
    isCatLoading = true;

    if (save) {
        localStorage.setItem('sansi_cat_mode', mode);
        const modal = document.getElementById('catSelectionModal');
        if(modal) modal.style.display = 'none';
    }

    const canvas = document.getElementById(CANVAS_ID);
    if (mode === 'none') {
        canvas.style.display = 'none';
        if (modelContainer) modelContainer.removeChildren();
        hideBubble(); 
        isCatLoading = false;
        return;
    }

    await initLive2DApp();
    canvas.style.display = 'block';
    
    modelContainer.removeChildren();
    modelContainer.scale.set(1);
    modelContainer.alpha = 0; 

    try {
        // ★★★ 修改開始：三段式大小判斷 ★★★
        const screenW = window.innerWidth;
        let baseScale;

        if (screenW < 600) {
            baseScale = 0.10; // 手機 (不變)
        } else if (screenW <= 1024) {
            baseScale = 0.15; // 平板 (不變)
        } else {
            baseScale = 0.15; // 電腦 (放大一倍)
        }
        // ★★★ 修改結束 ★★★

        if (mode === 'hijiki') {
            await loadModelToContainer(MODEL_PATH_HIJIKI, baseScale, 0); 
        } else if (mode === 'tororo') {
            await loadModelToContainer(MODEL_PATH_TORORO, baseScale, 0);
        } else if (mode === 'both') {
            // 雙貓模式時，位置偏移量也要根據裝置調整，避免重疊或太開
            let offset = screenW < 600 ? 30 : (screenW <= 1024 ? 50 : 80);
            
            await loadModelToContainer(MODEL_PATH_HIJIKI, baseScale * 0.9, -offset);
            await loadModelToContainer(MODEL_PATH_TORORO, baseScale * 0.9, offset);
        }
        
        setTimeout(() => {
            forceInitialPosition();
            
            let fadeTicker = setInterval(() => {
                modelContainer.visible = true;
                modelContainer.alpha += 0.1;
                if (modelContainer.alpha >= 1) {
                    modelContainer.alpha = 1;
                    clearInterval(fadeTicker);
                }
            }, 30);
        }, 300);
        
    } catch (err) {
        console.error("模型載入失敗:", err);
    } finally {
        isCatLoading = false;
    }
}

/**
 * 載入模型到容器
 * @param {string} path - 模型路徑
 * @param {number} scale - 縮放比例
 * @param {number} xOffset - X 軸偏移
 */
async function loadModelToContainer(path, scale, xOffset) {
    try {
        // 1. 使用快取加載器 (這會回傳已經組裝好的 Model 物件)
        const model = await loadCachedLive2DModel(path);
        
        // 2. 設定模型參數
        model.scale.set(scale);
        model._baseOffsetX = xOffset;
        model.x = xOffset; 
        model.y = 0;
        
        // 3. 加入舞台
        modelContainer.addChild(model);
        
    } catch (e) {
        console.error("快取載入失敗，嘗試直接載入...", e);
        // Fallback: 如果快取邏輯失敗，退回原本的直接網絡載入
        const model = await PIXI.live2d.Live2DModel.from(path);
        model.scale.set(scale);
        model.x = xOffset;
        modelContainer.addChild(model);
    }
}

/**
 * 強制設定初始位置
 * 將模型容器定位到畫面右下角
 */
function forceInitialPosition() {
    if (!modelContainer) return;
    const bounds = modelContainer.getBounds();
    const screenW = window.innerWidth;
    const screenH = window.innerHeight;

    let targetX = screenW - bounds.width - 20;
    let targetY = screenH - bounds.height - 40;

    if (targetX < 0) targetX = 0;
    if (targetY < 0) targetY = 0;

    modelContainer.x = targetX;
    modelContainer.y = targetY;
}

/**
 * 重新定位貓咪
 * 邊界限制 (允許移出一半)
 */
function repositionCats() {
    if (!modelContainer || modelContainer.children.length === 0) return;

    const bounds = modelContainer.getBounds();
    const screenW = window.innerWidth;
    const screenH = window.innerHeight;
    
    // 允許移出一半
    const allowOverflowX = bounds.width * 0.5;
    const allowOverflowY = bounds.height * 0.5;

    let newX = modelContainer.x;
    let newY = modelContainer.y;

    // 右邊界
    if (newX + bounds.width > screenW + allowOverflowX) {
        newX = screenW + allowOverflowX - bounds.width;
    }
    // 下邊界
    if (newY + bounds.height > screenH + allowOverflowY) {
        newY = screenH + allowOverflowY - bounds.height;
    }
    // 左邊界
    if (newX < -allowOverflowX) {
        newX = -allowOverflowX;
    }
    // 上邊界
    if (newY < -allowOverflowY) {
        newY = -allowOverflowY;
    }

    modelContainer.position.set(newX, newY);
    
    if (speechBubble.style.display === 'block') {
        updateBubblePosition();
    }
}

/**
 * 創建對話氣泡
 */
function createSpeechBubble() {
    if (document.getElementById('catSpeechBubble')) return;
    speechBubble = document.createElement('div');
    speechBubble.id = 'catSpeechBubble';
    speechBubble.className = 'cat-speech-bubble';
    speechBubble.style.display = 'none'; 
    document.body.appendChild(speechBubble);
}

/**
 * 初始化全域互動邏輯
 * 處理觸控與滑鼠事件
 */
function initGlobalInteraction() {
    const canvas = document.getElementById(CANVAS_ID);
    
    function hitTest(x, y) {
        if (!modelContainer || modelContainer.children.length === 0) return false;
        const bounds = modelContainer.getBounds();
 
        // 1. 頂部設定 (您覺得理想，維持不變)
        // 忽略頂部 15% 的高度
        const topOffset = bounds.height * 0.15;
 
        // 2. ★★★ 新增：左右縮減值 (Side Shrink) ★★★
        // 數值越大，左右兩邊越難點到 (向內縮)
        // 建議設定：bounds.width * 0.15 (代表左右各縮減 15% 的寬度)
        const sideShrink = bounds.width * 0.3;
 
        // 3. ★★★ 新增：底部縮減值 (Bottom Shrink) ★★★
        // 數值越大，腳下判定區越短
        // 建議設定：20 (代表底部向上縮 20px)
        const bottomShrink = 40;
 
        // 計算有效範圍：
        return (
            x >= bounds.x + sideShrink &&                // 左邊界：向右縮
            x <= bounds.x + bounds.width - sideShrink && // 右邊界：向左縮
            y >= bounds.y + topOffset &&                 // 頂部：維持原樣
            y <= bounds.y + bounds.height - bottomShrink // 底部：向上縮
        );
    }

    function getPinchDistance(touches) {
        return Math.hypot(
            touches[0].clientX - touches[1].clientX,
            touches[0].clientY - touches[1].clientY
        );
    }

    // --- 長按邏輯 ---
    function startLongPressTimer() {
        isLongPress = false;
        if (pressTimer) clearTimeout(pressTimer);
        
        pressTimer = setTimeout(() => {
            isLongPress = true;
            isDragging = false; 
            triggerCatChat(); 
            if (navigator.vibrate) navigator.vibrate(80);
        }, LONG_PRESS_DURATION);
    }

    function cancelLongPressTimer() {
        if (pressTimer) {
            clearTimeout(pressTimer);
            pressTimer = null;
        }
    }

    // --- 觸控事件 (Touch Events) ---
    window.addEventListener('touchstart', (e) => {
        if (canvas.style.display === 'none') return;

        // 雙指縮放
        if (e.touches.length === 2) {
            cancelLongPressTimer();
            if (hitTest(e.touches[0].clientX, e.touches[0].clientY) || 
                hitTest(e.touches[1].clientX, e.touches[1].clientY)) {
                // ★ 防止縮放時觸發瀏覽器縮放
                if (e.cancelable) e.preventDefault();
                isPinching = true;
                isDragging = false;
                initialPinchDist = getPinchDistance(e.touches);
                initialScale = modelContainer.scale.x;
                canvas.setAttribute('data-interacting', 'true');
                return;
            }
        }

        // 單指拖曳/點擊
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            if (hitTest(touch.clientX, touch.clientY)) {
                // ★ 關鍵優化：一旦確認點到貓，立刻禁止預設事件（防止頁面滾動）
                if (e.cancelable) e.preventDefault();
                
                isDragging = false;
                startX = touch.clientX;
                startY = touch.clientY;
                containerStartX = modelContainer.x;
                containerStartY = modelContainer.y;
                
                canvas.setAttribute('data-interacting', 'true');
                startLongPressTimer();
            } else {
                canvas.removeAttribute('data-interacting');
            }
        }
    }, { passive: false }); // passive: false 允許我們使用 preventDefault

    window.addEventListener('touchmove', (e) => {
        // ★ 核心優化：如果正在與貓互動，無條件、立即阻止頁面滾動
        if (canvas.getAttribute('data-interacting') === 'true') {
            if (e.cancelable) e.preventDefault();
        } else {
            return;
        }

        // 移動容錯 (15px)
        if (!isPinching && Math.hypot(e.touches[0].clientX - startX, e.touches[0].clientY - startY) > 15) {
            cancelLongPressTimer();
            if (!isDragging) isDragging = true;
        }

        // 縮放邏輯
        if (isPinching && e.touches.length === 2) {
            const currentDist = getPinchDistance(e.touches);
            if (initialPinchDist > 0) {
                const scaleFactor = currentDist / initialPinchDist;
                let newScale = initialScale * scaleFactor;
                // 無限縮放：0.01 ~ 10.0
                newScale = Math.max(0.01, Math.min(newScale, 10.0));
                modelContainer.scale.set(newScale);
                updateBubblePosition(); 
            }
            return;
        }

        // 拖曳邏輯
        if (!isPinching && e.touches.length === 1) {
            if (isLongPress) return;

            const touch = e.touches[0];
            const dx = touch.clientX - startX;
            const dy = touch.clientY - startY;

            if (isDragging) {
                modelContainer.x = containerStartX + dx;
                modelContainer.y = containerStartY + dy;
                updateBubblePosition();
            }
        }
    }, { passive: false });

    window.addEventListener('touchend', (e) => {
        cancelLongPressTimer();

        if (isPinching && e.touches.length < 2) {
            isPinching = false;
            repositionCats(); 
            return;
        }

        if (canvas.getAttribute('data-interacting') === 'true') {
            if (!isDragging && !isLongPress) {
                handleDoubleTap(); 
            }
            
            isDragging = false;
            canvas.removeAttribute('data-interacting');
            repositionCats();
        }
        isLongPress = false;
    });

    // --- 滑鼠事件 (Mouse Events) ---
    window.addEventListener('mousedown', (e) => {
        if (canvas.style.display === 'none') return;
        if (e.button !== 0) return;

        if (hitTest(e.clientX, e.clientY)) {
            e.preventDefault();
            isDragging = false;
            startX = e.clientX;
            startY = e.clientY;
            containerStartX = modelContainer.x;
            containerStartY = modelContainer.y;
            canvas.setAttribute('data-interacting', 'true');
            document.body.classList.add('cat-dragging');
            startLongPressTimer();
        }
    });

    window.addEventListener('mousemove', (e) => {
        if (hitTest(e.clientX, e.clientY)) {
            document.body.classList.add('cat-hovering');
        } else {
            document.body.classList.remove('cat-hovering');
        }

        if (canvas.getAttribute('data-interacting') !== 'true') return;

        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        if (Math.hypot(dx, dy) > 10) {
            cancelLongPressTimer();
            if (!isDragging) isDragging = true;
        }

        if (isDragging && !isLongPress) {
            modelContainer.x = containerStartX + dx;
            modelContainer.y = containerStartY + dy;
            updateBubblePosition();
        }
    });

    window.addEventListener('mouseup', () => {
        cancelLongPressTimer();

        if (canvas.getAttribute('data-interacting') === 'true') {
            if (!isDragging && !isLongPress) {
                handleDoubleTap(); 
            }
            repositionCats(); 
        }
        isDragging = false;
        isLongPress = false;
        canvas.removeAttribute('data-interacting');
        document.body.classList.remove('cat-dragging');
    });
    
    window.addEventListener('wheel', (e) => {
        if (canvas.style.display === 'none') return;
        if (hitTest(e.clientX, e.clientY)) {
            e.preventDefault();
            const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
            let newScale = modelContainer.scale.x * zoomFactor;
            newScale = Math.max(0.01, Math.min(newScale, 10.0));
            modelContainer.scale.set(newScale);
            repositionCats();
            updateBubblePosition();
        }
    }, { passive: false });
}

/**
 * 雙擊處理邏輯
 * 播放隨機音效並隱藏氣泡
 */
function handleDoubleTap() {
    const currentTime = new Date().getTime();
    const tapLength = currentTime - lastTapTime;
    
    if (tapLength < 500 && tapLength > 50) {
        // ★ 觸發雙擊事件 ★
        hideBubble(); // 隱藏氣泡
        triggerCatReaction(); // 觸發動作
        triggerVisualEffect(); // 觸發視覺
        
        // ★ 隨機播放貓叫聲 ★
        playRandomCatSound();
        
        lastTapTime = 0; 
    } else {
        lastTapTime = currentTime;
    }
}

/**
 * 隨機播放貓叫聲
 */
function playRandomCatSound() {
    // 隨機選取一個音效
    const randomSoundUrl = CAT_SOUNDS[Math.floor(Math.random() * CAT_SOUNDS.length)];
    const audio = new Audio(randomSoundUrl);
    audio.volume = 0.6;
    audio.play().catch(e => console.log("音效播放受阻:", e));
}

/**
 * 觸發貓咪反應
 * 播放隨機動作並震動
 */
function triggerCatReaction() {
    if (!modelContainer) return;
    modelContainer.children.forEach(cat => { playRandomMotion(cat); });
    if (navigator.vibrate) navigator.vibrate([50, 50, 50]); 
}

/**
 * 觸發視覺效果
 */
function triggerVisualEffect() {
    const canvas = document.getElementById(CANVAS_ID);
    canvas.classList.remove('cat-active-click');
    void canvas.offsetWidth; 
    canvas.classList.add('cat-active-click');
    setTimeout(() => { canvas.classList.remove('cat-active-click'); }, 400);
}

/**
 * 播放隨機動作
 * @param {PIXI.live2d.Live2DModel} model - Live2D 模型實例
 */
function playRandomMotion(model) {
    if (!model || !model.internalModel || !model.internalModel.motionManager) return;
    const motionMgr = model.internalModel.motionManager;
    
    const groups = Object.keys(motionMgr.definitions);
    if (groups.length === 0) return;

    let targetGroups = groups.filter(g => !g.toLowerCase().includes('idle') && !g.toLowerCase().includes('loop'));
    
    if (targetGroups.length === 0) targetGroups = groups;
    
    const randomGroup = targetGroups[Math.floor(Math.random() * targetGroups.length)];
    motionMgr.startRandomMotion(randomGroup, 3); 
}

/**
 * 長按對話邏輯
 * 使用貓咪 API 產生文學知識對話
 */
async function triggerCatChat() {
    // 強制重置/顯示氣泡
    showBubble("喵... 讓我想想... <span class='cat-loading-dots'></span>", 0); 
    triggerCatReaction();

    // 1. 海量分類庫 (專注於作家、作品、軼事 - 數量充足)
    const categories = [
        // --- 魯迅與現代文學 ---
        '魯迅的《狂人日記》', '魯迅的《孔乙己》', '魯迅的《阿Q正傳》', '魯迅棄醫從文的原因', '魯迅與朱安的關係',
        '魯迅的百草園', '張愛玲的《傾城之戀》', '張愛玲的《金鎖記》', '張愛玲與胡蘭成的糾葛', '張愛玲晚年的孤獨',
        '張愛玲的旗袍癖好', '徐志摩的《再別康橋》', '徐志摩與林徽因', '徐志摩與陸小曼', '沈從文的《邊城》',
        '沈從文與張兆和的情書', '錢鍾書的《圍城》', '錢鍾書的驚人記憶力', '楊絳的《我們仨》', '巴金的《家》',
        '巴金的筆名由來', '老舍的《駱駝祥子》', '老舍的《茶館》', '老舍的幽默感', '蕭紅的《呼蘭河傳》',
        '蕭紅坎坷的情路', '茅盾的《子夜》', '郁達夫的《沉淪》', '聞一多的愛國詩', '戴望舒的《雨巷》',
        '朱自清的《背影》', '朱自清不吃美國麵粉', '冰心的《繁星》', '冰心的《寄小讀者》', '林海音的《城南舊事》',
        
        // --- 港台與當代文學 ---
        '金庸的《射鵰英雄傳》', '金庸的《神鵰俠侶》', '金庸的《天龍八部》', '金庸筆名的由來', '金庸小說中的歷史人物',
        '古龍的嗜酒如命', '古龍筆下的浪子形象', '倪匡的衛斯理系列', '倪匡幫金庸代筆的趣事', '三毛的撒哈拉故事',
        '三毛與荷西的愛情', '瓊瑤的言情世界', '余光中的《鄉愁》', '白先勇的《臺北人》', '白先勇的《遊園驚夢》',
        '西西的《我城》', '西西的《像我這樣的一個女子》', '劉以鬯的《對倒》', '劉以鬯的《酒徒》意識流', '也斯的飲食文學',
        '董啟章的《天工開物》', '莫言的《紅高粱》', '莫言的魔幻現實主義', '余華的《活著》', '余華的《許三觀賣血記》',
        '蘇童的《妻妾成群》', '阿城的《棋王》', '王安憶的《長恨歌》', '陳之藩的《失根的蘭花》', '梁實秋的《雅舍小品》',
        '林語堂的幽默哲學', '胡適的《嘗試集》', '蔡元培的教育思想', '梁啟超的《新民說》', '王國維的人間詞話',

        // --- 唐詩宋詞與詩人 ---
        '李白的醉酒詩', '李白的《靜夜思》', '李白與杜甫的友誼', '李白「鐵杵磨成針」的傳說', '李白撈月而死的故事',
        '杜甫的《春望》', '杜甫的成都茅屋', '杜甫的流亡生活', '杜甫與李龜年', '王維的隱居生活',
        '王維詩中有畫畫中有詩', '白居易的《長恨歌》', '白居易的《琵琶行》', '白居易與元稹的交情', '韓愈的《師說》',
        '韓愈諫迎佛骨被貶', '柳宗元的《永州八記》', '柳宗元的《江雪》', '劉禹錫的《陋室銘》', '李商隱的無題詩',
        '杜牧的《清明》', '杜牧的揚州夢', '蘇軾的《赤壁賦》', '蘇軾的《定風波》', '蘇軾與東坡肉',
        '蘇軾與佛印的趣事', '蘇軾的貶謫生涯', '歐陽修的《醉翁亭記》', '范仲淹的《岳陽樓記》', '王安石的變法與詩文',
        '曾鞏的散文', '柳永的婉約詞', '柳永與歌妓', '李清照的《聲聲慢》', '李清照與趙明誠',
        '李清照晚年再嫁的風波', '辛棄疾的豪放詞', '辛棄疾的軍旅生涯', '陸游的《示兒》', '陸游與唐婉的《釵頭鳳》',
        '姜夔的《揚州慢》', '孟浩然的田園詩', '王昌齡的邊塞詩', '高適的軍旅詩', '賀知章的回鄉偶書',

        // --- 古典名著與小說 ---
        '施耐庵的《水滸傳》', '武松打虎的細節', '魯智深倒拔垂楊柳', '羅貫中的《三國演義》', '諸葛亮空城計',
        '關羽溫酒斬華雄', '曹操煮酒論英雄', '吳承恩的《西遊記》', '孫悟空大鬧天宮', '豬八戒的身世',
        '曹雪芹的《紅樓夢》', '賈寶玉與林黛玉', '紅樓夢的結局之謎', '王熙鳳的潑辣性格', '劉姥姥進大觀園',
        '蒲松齡的《聊齋誌異》', '蒲松齡的路邊茶攤', '吳敬梓的《儒林外史》', '范進中舉的諷刺', '劉鶚的《老殘遊記》',
        '李寶嘉的《官場現形記》', '袁枚的《隨園食單》', '納蘭性德的詞', '龔自珍的己亥雜詩', '關漢卿的《竇娥冤》',
        '王實甫的《西廂記》', '湯顯祖的《牡丹亭》', '孔尚任的《桃花扇》', '洪昇的《長生殿》', '三言二拍的故事',

        // --- 先秦漢魏六朝 ---
        '陶淵明的《桃花源記》', '陶淵明不為五斗米折腰', '屈原的《離騷》', '屈原投江的傳說', '曹操的《短歌行》',
        '曹植的《七步詩》', '竹林七賢的故事', '嵇康的《廣陵散》', '王羲之的《蘭亭集序》', '謝靈運的山水詩',
        '司馬遷的《史記》', '司馬遷受宮刑忍辱負重', '項羽的《垓下歌》', '諸葛亮的《出師表》', '李密的《陳情表》',
        '王勃的《滕王閣序》', '陳子昂的《登幽州臺歌》', '木蘭辭的故事', '孔雀東南飛', '古詩十九首',
        '莊子的逍遙遊', '莊周夢蝶', '惠子與莊子的辯論', '孟母三遷的故事', '蘇秦懸梁刺股'
    ];

    const randomCategory = categories[Math.floor(Math.random() * categories.length)];
    const randomSeed = Math.floor(Math.random() * 999999);

    const prompt = `
    (RandomSeed: ${randomSeed})
    你是我的貓咪助手。請告訴我一個關於【${randomCategory}】的文學冷知識、趣事或作品深意。
    要求：
    1. 內容要有趣、獨特，或者是教科書沒教的細節。
    2. 字數嚴格限制在 60 字以內。
    3. 語氣可愛、請務必使用粵語回答，例如使用「係」、「嘅」、「咁」、「㗎」。
    4. 不要用列點，不要像教科書，直接像朋友聊天一樣說出來，不可說髒話，語氣要自然。
    5. 絕對不要講「你好」、「你知道嗎」這類廢話，直接講重點知識。
    `;

    try {
        // ★★★ 修改處：改為呼叫 callCatAPI，鎖定 gemini-fast ★★★
        const text = await callCatAPI(prompt, 0.99); 
        showBubble(text, 0); 
    } catch (e) {
        console.error("API Error", e);
        showBubble("喵嗚... 腦袋打結了... 再試一次？", 0);
    }
}

/**
 * 開啟貓咪選單
 */
function openCatMenu() {
    const sideMenu = document.getElementById('sideMenu');
    if(sideMenu) { sideMenu.classList.remove('active'); document.getElementById('sideMenuToggle').classList.remove('active'); }
    document.getElementById('catSelectionModal').style.display = 'flex';
}

/**
 * 關閉貓咪選單
 * @param {Event} e - 點擊事件
 */
function closeCatMenu(e) { 
    if(e.target.id === 'catSelectionModal') e.target.style.display = 'none'; 
}

// === DOMContentLoaded 初始化 ===
document.addEventListener('DOMContentLoaded', () => {
    let savedMode = localStorage.getItem('sansi_cat_mode');
    
    // ★ 修改：如果沒有紀錄 (第一次進入)，預設為白貓 (tororo)
    if (!savedMode) {
        savedMode = 'tororo';
    }

    if (savedMode && savedMode !== 'none') {
        setTimeout(() => selectCatMode(savedMode, false), 500);
    }
    
    createSpeechBubble();
    initGlobalInteraction();
    
    window.addEventListener('resize', () => {
        if (modelContainer && document.getElementById(CANVAS_ID).style.display !== 'none') {
            setTimeout(repositionCats, 100);
        }
    });

    // 靜默預載 (頁面載入 1.5 秒後執行，不影響當前操作)
    setTimeout(() => {
        // 檢查快取函數是否存在，避免報錯
        if (typeof fetchWithCache === 'function') {
            console.log("🐈 [Live2D] 開始背景靜默預載...");
            fetchWithCache(MODEL_PATH_HIJIKI); // 預載黑貓
            fetchWithCache(MODEL_PATH_TORORO); // 預載白貓
        }
    }, 1500);
});

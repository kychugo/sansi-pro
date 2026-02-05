// Post-Body Scripts 7


// =======================================================
// === [新增] 慢讀功能核心邏輯 (整合版) ===
// =======================================================

let readerState = {
    segments: [],
    currentIndex: 0,
    timerSeconds: 7, // 預設 7 秒
    timerInterval: null,
    isReading: false,
    pressTimer: null,
    visualPauseTimer: null,
    lastTouchTime: 0
};

// 1. 初始化慢讀設定 (頁面載入時執行一次)
document.addEventListener('DOMContentLoaded', () => {
    initSlowReaderEvents();
});


// =======================================================
// === [修訂版] 慢讀專用防睡管理器 (1分鐘/1分半鐘版) ===
// =======================================================
const SlowReaderFocusManager = {
    checkTimer: null,
    warningTimer: null,
    isPrompting: false,
    
    // 時間設定：
    // 60,000ms = 1分鐘 (變橙色)
    // 30,000ms = 再過30秒即總共1分半鐘 (變紅色 + 響鈴)
    INTERVAL_MS: 60 * 1000, 
    WARNING_MS: 30 * 1000,
    
    initUI: function() {
        let indicator = document.getElementById('slowReaderFocusIndicator');
        if (!indicator) {
            indicator = document.createElement('button');
            indicator.id = 'slowReaderFocusIndicator';
            indicator.innerHTML = '';
            
            // 點擊燈號邏輯：慢讀時點擊即翻頁並重置防睡
            indicator.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                if (readerState.isReading) {
                    this.handleUserActivity(); // 重置防睡
                    if (typeof goToNextReaderPage === 'function') goToNextReaderPage();
                    if (typeof startReaderAutoPage === 'function') startReaderAutoPage();
                    return;
                }
                
                // 非慢讀狀態下的點擊處理
                if (this.isPrompting) {
                    this.handleUserActivity();
                } else {
                    this.toggle();
                }
            };
            document.body.appendChild(indicator);
        }
    },

    // 啟動監察
    start: function() {
        this.initUI();
        const indicator = document.getElementById('slowReaderFocusIndicator');
        
        if (typeof focusMonitorState !== 'undefined' && focusMonitorState.isActive) {
            console.log("🔊 慢讀防睡：啟動監察 (60s Check)");
            indicator.style.display = 'block';
            this.resetMainTimer();
            
            // 關閉一般模式的計時器，避免互相衝突
            if (focusMonitorState.checkInterval) {
                clearInterval(focusMonitorState.checkInterval);
                focusMonitorState.checkInterval = null;
            }
        } else {
            indicator.style.display = 'none';
            this.stop();
        }
    },

    // 停止監察
    stop: function() {
        clearTimeout(this.checkTimer);
        clearTimeout(this.warningTimer);
        this.isPrompting = false;
        
        const indicator = document.getElementById('slowReaderFocusIndicator');
        if(indicator) indicator.style.display = 'none';

        // 停止所有警報音
        if (typeof SansiAudio !== 'undefined') {
            SansiAudio.stop('sleep_warning');
        }
        
        // 恢復一般模式的背景監測 (如果防睡總開關仍是開啟的)
        if (typeof focusMonitorState !== 'undefined' && focusMonitorState.isActive) {
            focusMonitorState.checkInterval = setInterval(checkFocusStatus, 1000);
            focusMonitorState.lastActivityTime = Date.now();
        }
    },

    // 重置計時器 (使用者操作後呼叫)
    resetMainTimer: function() {
        clearTimeout(this.checkTimer);
        clearTimeout(this.warningTimer);
        this.isPrompting = false;
        
        // 停止可能正在播放的聲音
        if (typeof SansiAudio !== 'undefined') {
            SansiAudio.stop('sleep_warning');
        }
        
        const indicator = document.getElementById('slowReaderFocusIndicator');
        if(indicator) {
            indicator.className = 'status-green';
            indicator.innerHTML = '';
        }

        // 啟動第一階段計時 (1分鐘)
        this.checkTimer = setTimeout(() => {
            this.showPrompt();
        }, this.INTERVAL_MS);
    },

    // 顯示橙色提示 (進入1分鐘閒置)
    showPrompt: function() {
        this.isPrompting = true;
        const indicator = document.getElementById('slowReaderFocusIndicator');
        if(indicator) {
            indicator.className = 'status-prompt';
        }
        console.log("📍 慢讀防睡：1分鐘已到，轉橙燈");

        // 啟動第二階段計時 (再過30秒，總共1分半)
        this.warningTimer = setTimeout(() => {
            this.triggerAlarm();
        }, this.WARNING_MS);
    },

    // 觸發紅色警報 (進入1分半閒置)
    triggerAlarm: function() {
        const indicator = document.getElementById('slowReaderFocusIndicator');
        if(indicator) {
            indicator.className = 'status-red';
        }
        console.log("🚨 慢讀防睡：1分半已到，觸發警報");
        
        // 播放警告音 (使用 iOS 友善的新引擎)
        if (typeof SansiAudio !== 'undefined') {
            SansiAudio.play('sleep_warning', true);
        }
        
        // 執行震動懲罰
        if (navigator.vibrate) {
            navigator.vibrate([400, 200, 400, 200, 400]);
        }
    },
    
    // 統一的使用者活動回饋
    handleUserActivity: function() {
        this.resetMainTimer();
    },

    // 總開關切換
    toggle: function() {
        if (focusMonitorState.isActive) {
            focusMonitorState.isActive = false;
            this.stop();
            const globalBtn = document.getElementById('focusMonitorBtn');
            if(globalBtn) {
                globalBtn.className = "detail-float-btn scroll-hide-target";
                globalBtn.innerHTML = '<i class="fas fa-eye-slash"></i>';
            }
            alert("防睡監察已關閉");
        } else {
            // 開啟時先解鎖音軌管道 (iOS 必要)
            if (typeof SansiAudio !== 'undefined') {
                SansiAudio.unlock();
            }
            focusMonitorState.isActive = true;
            this.start();
        }
    }
};

	
function initSlowReaderEvents() {
    const overlay = document.getElementById('slowReaderOverlay');
    if (!overlay) return;

    // 綁定觸控/滑鼠互動
    overlay.addEventListener('mousedown', handleReaderInteractStart);
    overlay.addEventListener('mouseup', handleReaderInteractEnd);
    overlay.addEventListener('touchstart', handleReaderInteractStart, {passive: false});
    overlay.addEventListener('touchend', handleReaderInteractEnd, {passive: false});
    
    // 防止右鍵選單
    overlay.addEventListener('contextmenu', (e) => { e.preventDefault(); e.stopPropagation(); return false; });
}

// 2. 啟動慢讀 (修復版：清除 HTML 標籤)
function startSlowRead(encodedContent) {
    let rawContent = decodeURIComponent(encodedContent);
    
    // === [新增] 清洗 HTML 標籤邏輯 ===
    
    // 1. 移除開頭的詩歌標記 <br> (不分大小寫)
    rawContent = rawContent.replace(/^\s*<br\s*\/?>/i, '');

    // 2. 將文中其餘的 <br> 轉換為換行符號 \n
    // 這樣慢讀系統會將其視為段落分隔，讀起來會停頓，符合詩歌節奏
    rawContent = rawContent.replace(/<br\s*\/?>/gi, '\n');

    // 3. 移除粗體標籤 <b>, </b>, <strong>, </strong>
    // 慢讀強調文字本身，直接移除標籤碼以免顯示出來
    rawContent = rawContent.replace(/<\/?b>/gi, '').replace(/<\/?strong>/gi, '');

    // === [清洗結束] ===

    // A. 斷句處理 (參考 Slow Reader 邏輯)
    // 統一引號並加入段落標記
    const correctedText = rawContent.replace(/“/g, '「').replace(/”/g, '」');
    const textWithMarkers = '__NEW_PARA__' + correctedText.replace(/\n\s*/g, '__NEW_PARA__');
    
    // 執行切分
    segmentTextForReader(textWithMarkers);
    
    if (readerState.segments.length === 0) {
        alert("文章內容過短，無法慢讀。");
        return;
    }

    // B. 重置狀態
    readerState.currentIndex = 0;
    readerState.isReading = true;
    
    // C. 顯示介面
    const overlay = document.getElementById('slowReaderOverlay');
    overlay.style.display = 'flex';
    
    // D. 開始播放
    displayReaderSegment(0);
    startReaderAutoPage();

   // ★★★ [新增] 啟動防睡管理器 ★★★
    SlowReaderFocusManager.start();

	
}

// 3. 關閉慢讀
function closeSlowRead() {
    stopReaderAutoPage();
	    // ★★★ [新增] 停止防睡管理器 ★★★
    SlowReaderFocusManager.stop();
    document.getElementById('slowReaderOverlay').style.display = 'none';
    
    // 重置 pointer-events (為了下次開啟正常運作)
    const displayWrapper = document.getElementById('reader-display-wrapper');
    if(displayWrapper) displayWrapper.style.pointerEvents = "none";

    // ★★★ 新增：判斷是否讀完，讀完則滾動到賞析 ★★★
    // 邏輯：如果目前索引已到達最後一段
    if (readerState.segments.length > 0 && readerState.currentIndex >= readerState.segments.length - 1) {
        
        const analysisSec = document.getElementById('articleAnalysisSection');
        if (analysisSec) {
            // 給予一點延遲，讓慢讀遮罩完全消失後再滾動，體驗更順暢
            setTimeout(() => {
                analysisSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        }
    }

    readerState.isReading = false;
}

// 4. 設定視窗控制
function openReaderSettings() {
    document.getElementById('readerSettingsModal').style.display = 'flex';
    document.getElementById('readerSettingDisplay').innerText = readerState.timerSeconds;
}

function adjustReaderTimer(delta) {
    let newSec = readerState.timerSeconds + delta;
    if (newSec < 3) newSec = 3; // 最小 3 秒
    if (newSec > 60) newSec = 60;
    readerState.timerSeconds = newSec;
    document.getElementById('readerSettingDisplay').innerText = newSec;
}

// 5. 斷句核心邏輯 (移植自 Slow Reader)
function segmentTextForReader(text) {
    const segments = [];
    const paragraphs = text.split('__NEW_PARA__');
    let pCounter = 1;

    paragraphs.forEach(para => {
        if (!para) return;
        
        // 符號分割
        let temp = para.replace(/([。？！\.])/g, "$1|SPLIT|");
        let sentences = temp.split('|SPLIT|');
        let currentParaSentences = [];

        // 合併孤兒引號
        for (let i = 0; i < sentences.length; i++) {
            let s = sentences[i];
            if (!s || s.trim() === '') continue;
            
            const badStartRegex = /^(["”'』」\)。？！\.]+)(.*)/s;
            const match = s.match(badStartRegex);
            
            if (match && currentParaSentences.length > 0) {
                currentParaSentences[currentParaSentences.length - 1] += match[1];
                if (match[2] && match[2].trim()) {
                    currentParaSentences.push(match[2]);
                }
            } else {
                currentParaSentences.push(s);
            }
        }

        // 逗號過多分割 (每頁最多 5 個逗號)
        currentParaSentences.forEach((sentence, idx) => {
            const commaCount = (sentence.match(/[，,]/g) || []).length;
            if (commaCount <= 4) {
                segments.push({
                    text: sentence,
                    paraNumber: idx === 0 ? pCounter++ : null
                });
            } else {
                const parts = splitReaderSentenceByCommas(sentence, 5);
                parts.forEach((part, partIdx) => {
                    segments.push({
                        text: part,
                        paraNumber: (idx === 0 && partIdx === 0) ? pCounter++ : null
                    });
                });
            }
        });
    });
    readerState.segments = segments;
}

function splitReaderSentenceByCommas(sentence, max) {
    const result = [];
    let currentPart = '';
    let commaCount = 0;
    let quoteStack = [];

    for (let i = 0; i < sentence.length; i++) {
        const char = sentence[i];
        currentPart += char;

        if (['「','『','（','[','{'].includes(char)) quoteStack.push(char);
        else if (['」','』','）',']','}'].includes(char)) quoteStack.pop();
        else if (['，',','].includes(char) && quoteStack.length === 0) {
            commaCount++;
            if (commaCount >= max) {
                result.push(currentPart);
                currentPart = '';
                commaCount = 0;
            }
        }
    }
    if (currentPart.trim()) result.push(currentPart);
    return result;
}

// 6. 顯示邏輯
function displayReaderSegment(index) {
    const displayWrapper = document.getElementById('reader-display-wrapper');
    const paraNum = document.getElementById('reader-para-num');
    const textDisplay = document.getElementById('reader-text');
    const progressBar = document.getElementById('reader-progress-bar');

    if (index >= 0 && index < readerState.segments.length) {
        const seg = readerState.segments[index];
        
        displayWrapper.classList.add('fade-out');
        
        setTimeout(() => {
            paraNum.textContent = seg.paraNumber !== null ? seg.paraNumber : '';
            textDisplay.textContent = seg.text;
            displayWrapper.classList.remove('fade-out');
            
            // 更新進度條
            const perc = ((index + 1) / readerState.segments.length) * 100;
            progressBar.style.width = `${perc}%`;
        }, 600);
    }
}

// 7. 自動翻頁控制
function startReaderAutoPage() {
    stopReaderAutoPage();
    readerState.timerInterval = setInterval(() => {
        if (readerState.isReading) {
            goToNextReaderPage();
        }
    }, readerState.timerSeconds * 1000);
}

function stopReaderAutoPage() {
    if (readerState.timerInterval) {
        clearInterval(readerState.timerInterval);
        readerState.timerInterval = null;
    }
}

function goToNextReaderPage() {
    // 這裡移除了 SlowReaderFocusManager.handleUserActivity();
    // 這樣自動翻頁就不會被視為用戶活躍

    if (readerState.currentIndex < readerState.segments.length - 1) {
        readerState.currentIndex++;
        displayReaderSegment(readerState.currentIndex);
    } else {
        stopReaderAutoPage();
        
        const displayWrapper = document.getElementById('reader-display-wrapper');
        const paraNum = document.getElementById('reader-para-num');
        const textDisplay = document.getElementById('reader-text');
        
        displayWrapper.classList.add('fade-out');
        
        setTimeout(() => {
            paraNum.textContent = '';
            textDisplay.innerHTML = `
                <div style="text-align: center; width: 100%; margin-top: 20px;">
                    <span style="font-family: 'Noto Serif TC', serif; color: #a1887f; font-size: 1.2rem; letter-spacing: 0.5em; opacity: 0.8; display: block; margin-bottom: 20px;">
                        — 完 —
                    </span>
                    <button onclick="closeSlowRead()" style="pointer-events: auto; background-color: transparent; border: 1px solid #a1887f; color: #a1887f; padding: 8px 20px; border-radius: 20px; font-family: 'Noto Serif TC', serif; cursor: pointer; transition: all 0.3s;">
                        結束閱讀
                    </button>
                </div>
            `;
            
            displayWrapper.style.pointerEvents = "auto";
            displayWrapper.classList.remove('fade-out');
            document.getElementById('reader-progress-bar').style.width = '100%';
        }, 600);
    }
}

function goToPrevReaderPage() {
    // 手動點擊上一頁，視為活躍
    if (typeof SlowReaderFocusManager !== 'undefined') {
        SlowReaderFocusManager.handleUserActivity();
    }

    if (readerState.currentIndex > 0) {
        readerState.currentIndex--;
        displayReaderSegment(readerState.currentIndex);
    }
}

	
function handleReaderInteractStart(e) {
    if (e.target.closest('button')) return;
    if (e.type === 'touchstart') e.preventDefault();
    if (!readerState.isReading) return;

    // 手指按下，視為活躍
    if (typeof SlowReaderFocusManager !== 'undefined') {
        SlowReaderFocusManager.handleUserActivity();
    }

    stopReaderAutoPage();
    readerState.pressTimer = Date.now();
    
    readerState.visualPauseTimer = setTimeout(() => {
        document.getElementById('reader-pause-indicator').style.opacity = '1';
    }, 250); 
}

// 9. 互動控制 (長按暫停、點擊翻頁)
function handleReaderInteractStart(e) {
    // 忽略按鈕點擊
    if (e.target.closest('button')) return;
    
    if (e.type === 'touchstart') e.preventDefault();
    if (!readerState.isReading) return;

    stopReaderAutoPage();
    readerState.pressTimer = Date.now();
    
    readerState.visualPauseTimer = setTimeout(() => {
        document.getElementById('reader-pause-indicator').style.opacity = '1';
    }, 250); // 長按閾值
}

function handleReaderInteractEnd(e) {
    if (e.target.closest('button')) return;
    if (e.type === 'touchend') e.preventDefault();
    if (!readerState.isReading || !readerState.pressTimer) return;

    // 手指放開，視為活躍
    if (typeof SlowReaderFocusManager !== 'undefined') {
        SlowReaderFocusManager.handleUserActivity();
    }

    if (readerState.visualPauseTimer) {
        clearTimeout(readerState.visualPauseTimer);
        readerState.visualPauseTimer = null;
    }
    document.getElementById('reader-pause-indicator').style.opacity = '0';

    const duration = Date.now() - readerState.pressTimer;
    readerState.pressTimer = null;

    // 短按：翻頁
    if (duration < 250) {
        const clientX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
        const screenWidth = window.innerWidth;
        
        if (clientX < screenWidth / 2) {
            goToPrevReaderPage();
        } else {
            // 手動點擊下一頁
            goToNextReaderPage(); 
            startReaderAutoPage(); 
        }
    } 
}

	

/**
 * 自動縮放文字大小函數 (修正版：縮小 -> 換行，不顯示省略號)
 * @param {HTMLElement} element - 要調整的 DOM 元素
 * @param {number} minSize - 最小字體大小 (px)
 * @param {number} maxSize - 最大(原始)字體大小 (px)
 */
function fitTextToContainer(element, minSize, maxSize) {
    // 1. 重置為初始狀態：單行、最大字體
    element.style.fontSize = maxSize + "px";
    element.classList.remove('auto-fit-wrap');
    
    // 2. 獲取容器寬度 (clientWidth) 與 內容實際寬度 (scrollWidth)
    // 稍微減去 2px 緩衝，避免邊緣誤差導致換行
    let containerWidth = element.clientWidth;
    let currentSize = maxSize;

    // 3. 迴圈縮小字體 (當 內容寬度 > 容器寬度 且 字體 > 最小值)
    while (element.scrollWidth > containerWidth && currentSize > minSize) {
        currentSize--; 
        element.style.fontSize = currentSize + "px";
    }

    // 4. 最終判斷
    // 如果縮到最小字體了，內容還是比容器寬，那就允許換行
    if (element.scrollWidth > containerWidth) {
        element.style.fontSize = minSize + "px"; // 鎖定在最小字體
        element.classList.add('auto-fit-wrap');  // 加入換行樣式
    } else {
        // 如果縮小後塞得下，確保文字可見 (雖然預設 overflow:hidden 但為了保險)
        element.style.overflow = "visible";
    }
}

	
</script>

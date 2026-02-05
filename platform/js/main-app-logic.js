// Main Application Logic
let globalAbortController = null;

// === 新增：權限與額度控制 ===

// Base64 編碼的電郵
// kenchan20131@gmail.com (扮學生)
const STUDENT_ADDITION_B64 = "a2VuY2hhbjIwMTMxQGdtYWlsLmNvbQ=="; 
// kenchan20151@gmail.com (特許用家)
const SPECIAL_USER_B64 = "a2VuY2hhbjIwMTUxQGdtYWlsLmNvbQ==";

/**
 * 檢查訪客每日使用額度
 * @returns {boolean} true=允許繼續, false=阻止
 */
function checkGuestUsage() {
    // 1. 檢查是否已登入 (學生、老師、特許用家)
    const s = JSON.parse(localStorage.getItem('studentProfile'));
    if (s) {
        console.log(`[權限檢查] 用戶已登入 (${s.name})，不設限制。`);
        return true; 
    }

    // 2. 未登入訪客：檢查 LocalStorage 計數
    const today = new Date().toLocaleDateString('zh-HK'); // 格式如 2025/1/15
    const storageKey = `sansi_guest_usage_${today}`;
    
    // 取得目前次數 (預設為 0)
    let currentCount = parseInt(localStorage.getItem(storageKey) || "0");
    
    console.log(`[權限檢查] 訪客狀態 | 日期: ${today} | 已用次數: ${currentCount} | 上限: 1`);

    if (currentCount >= 1) {
        alert("⚠️ 訪客每日體驗額度已用完。\n\n請登入學校帳號或註冊以無限使用所有功能。");
        console.warn("[權限檢查] 攔截：超過每日額度。");
        return false;
    }

    // 3. 增加計數 (在 API 呼叫成功前先扣除，防止併發)
    localStorage.setItem(storageKey, currentCount + 1);
    return true;
}




	
	// === [新增] 中斷生成控制邏輯 ===
 
// 打開確認視窗
function openCancelModal() {
    const modal = document.getElementById('cancelConfirmModal');
    if (modal) modal.style.display = 'flex';
}
 
// 關閉確認視窗 (繼續等待)
function closeCancelModal() {
    const modal = document.getElementById('cancelConfirmModal');
    if (modal) modal.style.display = 'none';
}
 
// 確認取消 (執行中斷)
function confirmCancel() {
    closeCancelModal(); // 關閉確認窗
    
    // 1. 中斷 API 連線
    if (globalAbortController) {
        globalAbortController.abort(); // 發送中斷訊號
        globalAbortController = null;
        console.log("使用者手動取消生成");
    }
 
    // 2. 隱藏加載畫面
    hideLoading();
 
    // 3. 重新啟用所有被鎖定的提交按鈕
    enableSubmitButtons();
}
 
// 輔助：重新啟用按鈕
function enableSubmitButtons() {
    const ids = [
        'submitWritingBtn', 'submitReadingBtn', 'submitExpandBtn', 'submitExpandGuideBtn',
        'submitArgumentOutlineBtn', 'submitArgumentWritingBtn', 'submitArgumentGuideBtn',
        'submitWritingGuideBtn', 'startDiscussionBtn', 'continueBtn',
        'continueWritingBtn', 'continueWritingGuideBtn', 'continueArgumentBtn',
        'canvasChatSendBtn'
    ];
    ids.forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.disabled = false;
    });
}
	


// === 分頁控制變數 ===
let allAssignmentTasks = []; // 暫存該班級所有功課的 Metadata (不含內容，很小)
let currentLoadedCount = 0;  // 目前已顯示的數量
const BATCH_SIZE = 5;        // 每次載入幾份 (預設 5)

	

	// === 神思通知系統邏輯 ===

// === 神思通知系統邏輯 (高效能修正版) ===

// 讀取已讀紀錄
let notifiedIds = JSON.parse(localStorage.getItem('sansi_read_notifications') || '[]');

// 用來管理監聽器，避免重複綁定
let activeListeners = {
    assignments: null,
    submissions: {} // 儲存個別作業的提交狀態監聽器
};
let isNotificationInitialized = false; // 防止重複執行

function initNotificationListeners() {
    // 1. 防止重複啟動
    if (isNotificationInitialized) return;
    
    const s = JSON.parse(localStorage.getItem('studentProfile'));
    if (!s) return; // 未登入則不執行

    // 建立通知容器 (如果不存在)
    if (!document.getElementById('notifContainer')) {
        const div = document.createElement('div');
        div.id = 'notifContainer';
        div.className = 'sansi-notification-container';
        document.body.appendChild(div);
    }

    isNotificationInitialized = true;
    console.log("通知監聽系統已啟動 (高效能模式)");

    // --- 1. 監聽班級課業列表 (主監聽器) ---
    const assignmentPath = `assignments/${s.grade}/${s.class}`;
    
    // 如果之前有監聽，先移除
    if (activeListeners.assignments) {
        database.ref(assignmentPath).off();
    }

    activeListeners.assignments = database.ref(assignmentPath);
    activeListeners.assignments.on('value', (snapshot) => {
        const assignmentsData = snapshot.val() || {};
        const assignmentKeys = Object.keys(assignmentsData);

        // A. 處理新課業通知
        assignmentKeys.forEach(key => {
            // 如果不在已讀列表中，發送通知
            if (!notifiedIds.includes(key)) {
                showSansiNotif('new', assignmentsData[key].topic, key);
            }

            // B. [關鍵優化] 為每一份存在的作業，精準監聽「該學生的提交狀態」
            // 這樣就不用下載全校的資料庫，大幅提升速度
            monitorSubmissionStatus(key, s.name, assignmentsData[key].topic);
        });

        // C. 清理舊監聽器 (如果作業被老師刪除了，就不再監聽該作業的提交狀態)
        Object.keys(activeListeners.submissions).forEach(monitoredKey => {
            if (!assignmentKeys.includes(monitoredKey)) {
                // 作業已不存在，移除監聽
                database.ref(`assignments_submissions/${monitoredKey}/${s.name}`).off();
                delete activeListeners.submissions[monitoredKey];
            }
        });

        // D. 同步移除畫面上已失效的通知卡片 (例如老師刪除了作業)
        const activeNotifs = document.querySelectorAll('.sansi-notification[data-type="new"]');
        activeNotifs.forEach(node => {
            const id = node.getAttribute('data-notif-id');
            if (!assignmentKeys.includes(id)) {
                node.classList.add('fade-out');
                setTimeout(() => { node.remove(); updateNotifBadge(); }, 500);
            }
        });

        updateNotifBadge();
    });
}

// 輔助函式：針對單份作業監聽「已發還」狀態
function monitorSubmissionStatus(assignmentId, studentName, topicTitle) {
    // 如果已經在監聽這份作業，就跳過
    if (activeListeners.submissions[assignmentId]) return;

    const submissionPath = `assignments_submissions/${assignmentId}/${studentName}`;
    const subRef = database.ref(submissionPath);

    // 儲存參照以便稍後可以移除
    activeListeners.submissions[assignmentId] = subRef;

    subRef.on('value', (snapshot) => {
        const myWork = snapshot.val();
        
        // 檢查是否有「已發還」標記
        if (myWork && myWork.teacherFeedback && myWork.teacherFeedback.status === 'returned') {
            // 產生唯一的評語 ID (利用時間戳)
            const feedbackId = "fb_" + assignmentId + "_" + myWork.teacherFeedback.timestamp;
            
            // 如果這個評語還沒被讀過，顯示通知
            if (!notifiedIds.includes(feedbackId)) {
                showSansiNotif('returned', myWork.title || topicTitle || "課業", feedbackId);
            }
        }
        
        // 如果狀態變成不是 returned (例如老師撤回)，可以在這裡處理通知撤回 (選用)
        // 目前保留簡單邏輯即可
    });
}

/**
 * 顯示通知卡片 (維持原本的 UI 邏輯)
 */
function showSansiNotif(type, topic, uniqueId) {
    if (document.querySelector(`[data-notif-id="${uniqueId}"]`)) return; // 防重複

    const container = document.getElementById('notifContainer');
    if (!container) return;

    // === 新增：莫蘭迪色系 ===
    const morandiPalette = ['#8fa398', '#94a7b5', '#b6a6ca', '#d69a92', '#c7b299'];
    // 隨機選取顏色
    const randomThemeColor = morandiPalette[Math.floor(Math.random() * morandiPalette.length)];

    const notif = document.createElement('div');
    notif.setAttribute('data-notif-id', uniqueId);
    notif.setAttribute('data-type', type); 
    
    // === 新增：設定色條顏色 ===
    notif.style.setProperty('--theme-color', randomThemeColor);
    
    const isNew = type === 'new';
    notif.className = `sansi-notification ${isNew ? 'notif-new' : 'notif-returned'}`;
    
    const badgeText = isNew ? '新課業發佈' : '批改已發還';
    const descText = isNew 
        ? '老師為你的班級指派了新任務，請適時進入系統完成練習。' 
        : '你提交的課業已有新的老師評語及評分，請即時檢閱。';

    notif.innerHTML = `
        <div class="notif-badge">${badgeText}</div>
        <div class="notif-header">
            <div class="notif-topic">《${topic}》</div>
        </div>
        <div class="notif-desc">${descText}</div>
        <div class="notif-footer">
            <span>點擊前往查看詳情</span>
            <i class="fas fa-chevron-right" style="font-size: 0.7rem;"></i>
        </div>
    `;

    notif.onclick = () => {
        // 記錄已讀
        if (!notifiedIds.includes(uniqueId)) {
            notifiedIds.push(uniqueId);
            localStorage.setItem('sansi_read_notifications', JSON.stringify(notifiedIds));
        }
        // 移除卡片
        notif.classList.add('fade-out');
        setTimeout(() => {
            notif.remove();
            updateNotifBadge();
        }, 500);
        // 打開雲端中心
        openStudentLoginModal();
    };

    container.appendChild(notif);
    updateNotifBadge();
}

// 更新側邊欄紅點
function updateNotifBadge() {
    const container = document.getElementById('notifContainer');
    const badge = document.getElementById('notifBadge');
    // 如果全域有未交功課變數 (window.hasPendingWork)，也要考慮進去
    const hasVisibleNotifs = (container && container.querySelectorAll('.sansi-notification').length > 0);
    const hasPending = window.hasPendingWork || false;

    if (badge) {
        badge.style.display = (hasVisibleNotifs || hasPending) ? 'block' : 'none';
    }
}



	
	
// 啟動點：頁面載入後執行
document.addEventListener('DOMContentLoaded', () => {
    // 只保留這一個啟動點，移除其他的 setTimeout
    setTimeout(initNotificationListeners, 1500);
});

// 修改原有的登入檢查，登入後立即啟動監聽
const originalCheckLoginForNotif = window.checkStudentLogin;
window.checkStudentLogin = async function() {
    await originalCheckLoginForNotif();
    // 登入成功後，立即初始化通知監聽 (如果尚未初始化)
    initNotificationListeners();
};


// 顯示或隱藏側邊選單紅點
function showRedBadge(show) {
    const cloudBtn = document.getElementById('sideMenuCloudBtn');
    if (!cloudBtn) return;

    let badge = cloudBtn.querySelector('.notification-badge');
    if (!badge) {
        badge = document.createElement('div');
        badge.className = 'notification-badge';
        cloudBtn.appendChild(badge);
    }
    badge.style.display = show ? 'block' : 'none';
}

// 在頁面載入及登入成功後啟動
document.addEventListener('DOMContentLoaded', () => {
    // 延遲一點點啟動，避開初次載入的數據洪流
    setTimeout(initNotificationListeners, 2000);
});

// 修改你原有的 checkStudentLogin，在切換到雲端面板時清除紅點
const originalCheckLogin = window.checkStudentLogin;
window.checkStudentLogin = async function() {
    await originalCheckLogin();
    showRedBadge(false); // 打開雲端中心就視為已讀
};

	// 打開結果畫布
function openResultCanvas(title) {
    const canvas = document.getElementById('resultCanvas');
    const body = document.getElementById('resultCanvasBody');
    document.getElementById('resultCanvasTitle').innerText = title || "生成結果";
    
    body.innerHTML = ''; // 清空舊內容
    canvas.style.display = 'block';
    document.body.style.overflow = 'hidden'; // 鎖定主頁面捲動
}

// 關閉結果畫布
function closeResultCanvas() {
    const canvas = document.getElementById('resultCanvas');
    canvas.style.display = 'none';
    document.body.style.overflow = 'auto'; // 恢復主頁面捲動
    
    // 如果有雷達圖實例，關閉時銷毀以防衝突 (選用)
    // if (window.narrative_radarChartInstance) window.narrative_radarChartInstance.destroy();
}


	// === 顯示加載動畫 ===
// === 顯示加載動畫 (隨機 GIF 版) ===
function showLoading(text) {
    const overlay = document.getElementById('loadingOverlay');
    const textEl = document.getElementById('loadingText');
    const imgEl = document.getElementById('loadingImage'); // 獲取圖片元素

    // ★★★ 在這裡設定你的 GIF 清單 ★★★
    // 請確保這些檔案都已經上傳到你的網站目錄中
    const gifList = [
        '生成中.gif',
        '生成中2.gif',
        '生成中3.gif',
        '生成中4.gif',
        '生成中5.gif',
        '生成中6.gif'
        // 如果有更多，可以繼續加： '生成中3.gif',
    ];

    if (overlay && textEl) {
        // 1. 隨機抽取一張 GIF
        if (imgEl) {
            const randomIndex = Math.floor(Math.random() * gifList.length);
            const selectedGif = gifList[randomIndex];
            imgEl.src = selectedGif; //更換圖片來源
        }

        // 2. 設定文字並顯示
        textEl.innerText = text || "正在運算中..."; 
        overlay.style.display = 'flex';
    }
}

// === 隱藏加載動畫 ===
function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}


	// === 動畫觸發輔助函數 ===
function playEntryAnimation(elementId) {
    const el = document.getElementById(elementId);
    if (el) {
        // 1. 移除動畫 class (如果有的話)
        el.classList.remove('fade-in-up');
        
        // 2. 強制瀏覽器重繪 (Reflow) - 這是關鍵，否則瀏覽器會忽略重新添加 class 的動作
        void el.offsetWidth;
        
        // 3. 重新加入動畫 class
        el.classList.add('fade-in-up');
    }
}

document.addEventListener('DOMContentLoaded', function() {
	   // ★ 加入這一行：啟動背景快取載入
    loadAndCacheBackground();
const converter = OpenCC.Converter({ from: 'cn', to: 'tw' });
const hitokotoElement = document.getElementById('hitokoto');
const hitokotoFromElement = document.getElementById('hitokoto-from');
const refreshBtn = document.getElementById('refresh-btn');


function initDSECalendar() {
    // === 1. 設定日期 ===
    const config = {
        s6: '2026-04-09', 
        s5: '2027-04-02',
        offsets: { s4: 1, s3: 2, s2: 3, s1: 4 }
    };

    // === 2. 自動建立/獲取煙花畫布 ===
    let fireworksCanvas = document.getElementById('fireworksCanvas');
    if (!fireworksCanvas) {
        fireworksCanvas = document.createElement('canvas');
        fireworksCanvas.id = 'fireworksCanvas';
        fireworksCanvas.style.position = 'fixed';
        fireworksCanvas.style.top = '0';
        fireworksCanvas.style.left = '0';
        fireworksCanvas.style.width = '100%';
        fireworksCanvas.style.height = '100%';
        fireworksCanvas.style.pointerEvents = 'none'; 
        fireworksCanvas.style.zIndex = '2147483647';
        fireworksCanvas.style.display = 'none';
        document.body.appendChild(fireworksCanvas);
    }

    const gradeButtons = document.querySelectorAll('.grade-btn');
    const unit0 = document.getElementById('unit-0');
    const approxLabel = document.getElementById('approx-label');
    
    let currentGrade = localStorage.getItem('dse_grade') || 's6';

    // === 3. 煙花特效邏輯 (保持不變) ===
    let fireworksInterval;
    let autoStopTimer; 
    let cleanupTimer;  
    let fireworksActive = false;
    const ctx = fireworksCanvas.getContext('2d');
    let particles = [];

    function resizeCanvas() {
        fireworksCanvas.width = window.innerWidth;
        fireworksCanvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    function createParticle(x, y) {
        const particleCount = 35; 
        for (let i = 0; i < particleCount; i++) {
            particles.push({
                x: x,
                y: y,
                colors: ['#1A7595', '#D87C7C', '#E6D0A6', '#8FB2C9', '#A8D8B9'],
                color: '',
                radius: Math.random() * 2 + 0.8, 
                velocity: {
                    x: (Math.random() - 0.5) * 6,
                    y: (Math.random() - 0.5) * 6
                },
                alpha: 0.9,
                decay: Math.random() * 0.01 + 0.005
            });
            particles[particles.length - 1].color = particles[particles.length - 1].colors[Math.floor(Math.random() * 5)];
        }
    }

    function animateFireworks() {
        if (particles.length === 0 && !fireworksActive) return;
        requestAnimationFrame(animateFireworks);
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.fillRect(0, 0, fireworksCanvas.width, fireworksCanvas.height);
        ctx.globalCompositeOperation = 'lighter';
        for (let i = particles.length - 1; i >= 0; i--) {
            let p = particles[i];
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.alpha;
            ctx.fill();
            p.x += p.velocity.x;
            p.y += p.velocity.y;
            p.velocity.y += 0.03;
            p.velocity.x *= 0.98;
            p.velocity.y *= 0.98;
            p.alpha -= p.decay;
            if (p.alpha <= 0) particles.splice(i, 1);
        }
    }

    function startFireworks() {
        if (fireworksActive) return;
        fireworksActive = true;
        fireworksCanvas.style.display = 'block';
        animateFireworks();
        createParticle(window.innerWidth / 2, window.innerHeight / 3);
        fireworksInterval = setInterval(() => {
            const x = Math.random() * (fireworksCanvas.width * 0.6) + (fireworksCanvas.width * 0.2);
            const y = Math.random() * (fireworksCanvas.height / 2); 
            createParticle(x, y);
        }, 700);
        clearTimeout(autoStopTimer);
        clearTimeout(cleanupTimer);
        autoStopTimer = setTimeout(() => stopLaunching(), 3000);
    }

    function stopLaunching() {
        clearInterval(fireworksInterval);
        fireworksActive = false;
        cleanupTimer = setTimeout(() => {
            fireworksCanvas.style.display = 'none';
            ctx.clearRect(0, 0, fireworksCanvas.width, fireworksCanvas.height);
            particles = [];
        }, 3000);
    }

    function forceStopFireworks() {
        clearInterval(fireworksInterval);
        clearTimeout(autoStopTimer);
        clearTimeout(cleanupTimer);
        fireworksActive = false;
        fireworksCanvas.style.display = 'none';
        ctx.clearRect(0, 0, fireworksCanvas.width, fireworksCanvas.height);
        particles = [];
    }

    // === 4. 按鈕監聽 (修改處：傳入較短延遲) ===
    gradeButtons.forEach(btn => {
        if (btn.dataset.val === currentGrade) btn.classList.add('active');

        btn.addEventListener('click', function() {
            gradeButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            currentGrade = this.dataset.val;
            localStorage.setItem('dse_grade', currentGrade);
            
            // ★★★ 這裡改成 250ms (0.25秒)，切換時更快速 ★★★
            updateCountdown(true, 250); 
        });
    });

    // === 5. 倒數更新 (修改處：接收 delay 參數) ===
    function updateCountdown(animate = true, delay = 800) {
        // 使用傳入的 delay 參數，預設為 800ms
        const flipDelay = delay; 

        let targetDate;
        const isApprox = ['s1', 's2', 's3', 's4'].includes(currentGrade);
        if (approxLabel) approxLabel.classList.toggle('hidden', !isApprox);
        
        if (currentGrade === 's6' || currentGrade === 's5') {
            targetDate = new Date(config[currentGrade]);
        } else {
            const baseDate = new Date(config.s5);
            const yearsToAdd = config.offsets[currentGrade];
            targetDate = new Date(baseDate.getTime() + (yearsToAdd * 365 * 24 * 60 * 60 * 1000));
        }
        
        const now = new Date();
        targetDate.setHours(0, 0, 0, 0);
        now.setHours(0, 0, 0, 0);
        const diff = targetDate.getTime() - now.getTime();
        let days = Math.ceil(diff / (1000 * 60 * 60 * 24));
        
        const daysLabel = document.querySelector('.countdown-container .days-label, .days-label');
        
        // 處理負數天數
        if (days < 0) {
            forceStopFireworks();
            if (unit0) unit0.classList.remove('hidden');
            const fullStr = "已分手";
            for (let i = 0; i < 3; i++) {
                const unit = document.getElementById(`unit-${i}`);
                if (unit) {
                    unit.classList.remove('flipping');
                    document.getElementById(`t${i}-next`).innerText = fullStr[i] || '';
                    document.getElementById(`b${i}-old`).innerText = fullStr[i] || '';
                    const flap = document.getElementById(`f${i}`);
                    flap.setAttribute('data-old', fullStr[i] || '');
                    flap.setAttribute('data-new', fullStr[i] || '');
                }
            }
            const unit3 = document.getElementById('unit-3');
            if (unit3) unit3.classList.add('hidden');
            if (approxLabel) approxLabel.classList.add('hidden');
            if (daysLabel) daysLabel.style.display = 'none';
            const footer = document.querySelector('.dse-footer');
            if (footer) footer.textContent = "WE ARE FREE";
            return;
        }

        // 正常顯示
        if (daysLabel) daysLabel.style.display = '';
        if (unit0) unit0.classList.toggle('hidden', days < 1000);
        
        const fullStr = days.toString().padStart(4, '0');      // 新數字
        const prevDays = days + 1;                             // 舊數字
        const oldFullStr = prevDays.toString().padStart(4, '0'); 
        
        // 煙花邏輯
        if (days <= 0) {
            days = 0;
            if (!fireworksActive) startFireworks();
        } else {
            forceStopFireworks();
        }
        
        // ★★★ 第一階段：無動畫、瞬間重置為「舊數字」 (防閃爍邏輯) ★★★
        for (let i = 0; i <= 3; i++) {
            const unit = document.getElementById(`unit-${i}`);
            if (unit) {
                const oldVal = oldFullStr[i];
                const flap = document.getElementById(`f${i}`);

                // 關閉過渡，防閃爍
                flap.style.transition = 'none';
                unit.classList.remove('flipping');
                
                // 設為舊數字
                document.getElementById(`t${i}-next`).innerText = oldVal;
                document.getElementById(`b${i}-old`).innerText = oldVal;
                flap.setAttribute('data-old', oldVal);
                flap.setAttribute('data-new', oldVal);

                // 強制重繪
                void unit.offsetWidth; 

                // 恢復過渡
                flap.style.transition = ''; 
            }
        }

        // ★★★ 第二階段：根據 delay 時間翻頁 ★★★
        if (animate) {
            setTimeout(() => {
                const sound = document.getElementById('flip-sound');
                if (sound) {
                    sound.currentTime = 0;
					sound.volume = 1.0; // <--- 加入這行，強制設定為最大聲 (100%)
                    sound.play().catch(() => {});
                }

                for (let i = 0; i <= 3; i++) {
                    const unit = document.getElementById(`unit-${i}`);
                    if (unit) {
                        const newVal = fullStr[i];
                        const oldVal = oldFullStr[i];
                        
                        if (oldVal !== newVal) {
                            const flap = document.getElementById(`f${i}`);
                            document.getElementById(`t${i}-next`).innerText = newVal;
                            flap.setAttribute('data-new', newVal);
                            unit.classList.add('flipping');
                        }
                    }
                }
            }, flipDelay); // 使用動態傳入的 delay
        } else {
             for (let i = 0; i <= 3; i++) {
                const unit = document.getElementById(`unit-${i}`);
                if (unit) {
                    const newVal = fullStr[i];
                    document.getElementById(`t${i}-next`).innerText = newVal;
                    document.getElementById(`b${i}-old`).innerText = newVal;
                    const flap = document.getElementById(`f${i}`);
                    flap.setAttribute('data-old', newVal);
                    flap.setAttribute('data-new', newVal);
                }
            }
        }
    }
    
    // 首次執行 (保持較長延遲，這裡設為 800ms)
    setTimeout(() => {
        updateCountdown(true, 800);
    }, 100); 
}

// 確保腳本執行
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    initDSECalendar();
} else {
    document.addEventListener('DOMContentLoaded', initDSECalendar);
}

	
function fetchHitokoto() {
fetch('https://v1.hitokoto.cn/?c=d&c=i&c=k&encode=json')
.then(response => response.json())
.then(data => {
if (data.from.includes('魔道祖師')) {
fetchHitokoto(); // 如果來源是「魔道祖師」，重新獲取名言
} else {
// 使用 textContent 可以自動處理特殊字元，是顯示純文字的最佳選擇
hitokotoElement.textContent = converter(data.hitokoto);
hitokotoFromElement.textContent = `—— ${converter(data.from_who || '佚名')} 《${converter(data.from)}》`;
}
})
.catch(error => {
console.error('獲取名言失敗:', error);
hitokotoElement.innerHTML = '<p>獲取名言失敗，請稍後再試。</p>';
hitokotoFromElement.innerHTML = '';
});
}

fetchHitokoto();
refreshBtn.addEventListener('click', fetchHitokoto);
});
</script>

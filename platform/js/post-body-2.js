// Post-Body Scripts 2
document.addEventListener('DOMContentLoaded', function() {
    let totalSeconds = 0;
    let timerInterval = null;

    // 1. 獲取日期路徑
    function getDateParts() {
        const now = new Date();
        const y = String(now.getFullYear());
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        return { y, m, d };
    }

    // 2. 獲取身份
   // 1. 獲取標準化身份 (確保路徑絕對正確)
function getIdentity() {
    const rawProfile = localStorage.getItem('studentProfile');
    let s = null;
    try { if(rawProfile) s = JSON.parse(rawProfile); } catch (e) {}

    if (s && s.grade && s.class) {
        // ★ 強制過濾特殊字符，確保路徑合法 (與管理端邏輯一致)
        const safeName = s.name.replace(/[.#$/[\]]/g, '_'); 
        return { 
            type: 'student', 
            id: s.uid || `stu_${s.grade}${s.class}_${safeName}`, // UID
            nameKey: safeName, // 用於路徑的學生名字
            grade: s.grade, 
            class: s.class 
        };
    } else {
        let guestID = localStorage.getItem('sansi_guest_uuid');
        if (!guestID) {
            guestID = 'guest_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('sansi_guest_uuid', guestID);
        }
        return { type: 'guest', id: guestID, grade: 'Guest', class: 'Visitor', nameKey: 'Guest' };
    }
}

// === 3. 記錄訪問 (Log Visit) - 高效分流版 ===
// 2. 記錄訪問 (Log Visit) - 容錯版
async function logVisitOnce() {
    if (typeof firebase === 'undefined' || !database) return;
    
    // 獲取日期與身份
    const now = new Date();
    const y = String(now.getFullYear());
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    
    const identity = getIdentity();
    const uid = identity.id;

    // Session 鎖 (防止刷新頁面重複計數)
    const sessionKey = `sansi_visit_logged_${y}${m}${d}_${uid}`;
    if (sessionStorage.getItem(sessionKey)) return; 

    // --- 查重邏輯 (獨立包裹，失敗不影響後續) ---
    let isFirstTimeToday = false;
    try {
        const trackingRef = database.ref(`stats_tracking/${y}/${m}/${d}/unique_users/${uid}`);
        const snap = await trackingRef.once('value');
        // 如果不存在，代表是今日首次
        isFirstTimeToday = !snap.exists();
    } catch (e) {
        // ★ 關鍵修正：如果查重失敗 (權限或網絡)，默認為 false (寧可少計 Unique 也不要報錯崩潰)
        // 但我們依然會執行下面的 visits 寫入
        console.warn("[Stats] 查重失敗，將跳過 Unique 統計，但繼續記錄 Visits。", e);
        isFirstTimeToday = false; 
    }

    // --- 準備寫入數據 ---
    const updates = {};
    const increment1 = firebase.database.ServerValue.increment(1);
    
    // 路徑變數
    const classKey = `${identity.grade}${identity.class}`;
    const studentNameKey = identity.nameKey; 

    // 1. 全域總覽 (Global)
    const globalPath = `stats_global/${y}/${m}/${d}`;
    updates[`${globalPath}/visits`] = increment1;
    if (isFirstTimeToday) updates[`${globalPath}/unique`] = increment1;

    // 2. 學生詳細數據 (僅學生)
    if (identity.type === 'student') {
        // A. 學校總覽 (School)
        const schoolPath = `stats_school/${y}/${m}/${d}`;
        updates[`${schoolPath}/visits`] = increment1;
        if (isFirstTimeToday) updates[`${schoolPath}/unique`] = increment1;

        // B. 班級 (Classes)
        const classPath = `stats_classes/${classKey}/${y}/${m}/${d}`;
        updates[`${classPath}/visits`] = increment1;
        if (isFirstTimeToday) updates[`${classPath}/unique`] = increment1;

        // C. 個人 (Students)
        const studentPath = `stats_students/${classKey}/${studentNameKey}/${y}/${m}/${d}`;
        updates[`${studentPath}/visits`] = increment1;
        if (isFirstTimeToday) updates[`${studentPath}/unique`] = increment1;
        
        // D. 寫入追蹤標記 (防止重複)
        if (isFirstTimeToday) {
            updates[`stats_tracking/${y}/${m}/${d}/unique_users/${uid}`] = true;
        }
    }

    // --- 執行寫入 ---
    try {
        await database.ref().update(updates);
        sessionStorage.setItem(sessionKey, 'true'); // 標記 Session 已記錄
        console.log(`📍 [Stats] 訪問記錄成功 (FirstTime: ${isFirstTimeToday})`);
    } catch (e) {
        console.error("❌ [Stats] 訪問寫入失敗:", e);
    }
}

// 4. 上傳 1 分鐘 (分流版)
// 3. 上傳 1 分鐘 (Upload Duration) - 容錯版
function uploadOneMinute() {
    if (typeof firebase === 'undefined' || !database) return;
    
    // 確保訪問記錄已執行
    logVisitOnce(); 

    const now = new Date();
    const y = String(now.getFullYear());
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    
    const identity = getIdentity();
    const classKey = `${identity.grade}${identity.class}`;
    const studentNameKey = identity.nameKey; 

    const updates = {};
    const increment60 = firebase.database.ServerValue.increment(60); // 增加 60 秒

    // 1. 全域 (Global)
    updates[`stats_global/${y}/${m}/${d}/duration`] = increment60;

    // 2. 學生詳細數據
    if (identity.type === 'student') {
        // A. 全校
        updates[`stats_school/${y}/${m}/${d}/duration`] = increment60;
        // B. 班級
        updates[`stats_classes/${classKey}/${y}/${m}/${d}/duration`] = increment60;
        // C. 個人
        updates[`stats_students/${classKey}/${studentNameKey}/${y}/${m}/${d}/duration`] = increment60;
    }

    // 執行寫入 (不等待結果，背景執行)
    database.ref().update(updates)
        .then(() => {
            // ★★★ 加回這行，方便您測試時確認 ★★★
            console.log("✅ [Stats] 時長上傳成功 (+60s)");
        })
        .catch(e => {
            console.error("❌ [Stats] 時長上傳失敗 (權限或網絡問題):", e);
        });
}
    // 5. 計時器啟動 (還原你的邏輯)
    function startTimer() {
        if (timerInterval) return;
        console.log("▶️ [Stats] 計時器啟動");
        
        timerInterval = setInterval(() => {
            totalSeconds++;
            
            // ★★★ 你的原始邏輯 ★★★
            // 30秒 -> 傳送 (算1分鐘)
            // 90秒 (1分30秒) -> 傳送 (算2分鐘)
            // 150秒 (2分30秒) -> 傳送 (算3分鐘)
            if (totalSeconds === 30 || (totalSeconds > 30 && (totalSeconds - 30) % 60 === 0)) {
                uploadOneMinute();
            }
        }, 1000);
    }

    function pauseTimer() {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
            console.log("⏸️ [Stats] 暫停計時 (當前累計: " + totalSeconds + "s)");
            // 注意：這裡不再有 uploadDuration(unsaved)，未滿的部分直接捨棄
        }
    }

    // 延遲啟動
    setTimeout(() => {
        logVisitOnce();
        startTimer();
    }, 3000);

    // 偵測頁面狀態
    document.addEventListener('visibilitychange', function() {
        if (document.visibilityState === 'hidden') pauseTimer();
        else startTimer();
    });
    
    window.forceLogVisit = logVisitOnce;
});
</script>

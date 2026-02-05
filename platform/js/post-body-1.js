// Post-Body Scripts 1
// ==========================================
// === 紅點邏輯修復補丁 (Fix Badge Logic) ===
// ==========================================

// 1. 定義一個全域變數來記住是否有未交功課
window.hasPendingWork = false;

// 2. 建立一個「統一」的紅點更新函式
// 邏輯：只要 (有未繳交功課 OR 有推播通知卡片)，紅點就應該亮起
function refreshGlobalBadge() {
    const badge = document.getElementById('notifBadge');
    const notifContainer = document.getElementById('notifContainer');
    
    if (!badge) return;

    // 檢查 A: 畫面上是否有推播通知卡片
    const hasVisibleNotifs = notifContainer && notifContainer.querySelectorAll('.sansi-notification').length > 0;

    // 檢查 B: 是否有未繳交功課 (由 monitorPendingAssignments 更新 window.hasPendingWork)
    const shouldShow = window.hasPendingWork || hasVisibleNotifs;

    if (shouldShow) {
        badge.style.display = 'block';
        
        // 優化提示文字 (Tooltip)
        if (window.hasPendingWork && hasVisibleNotifs) {
            badge.title = "您有新通知及未繳交的課業！";
        } else if (window.hasPendingWork) {
            badge.title = "您有未繳交的課業！";
        } else {
            badge.title = "您有新通知！";
        }
    } else {
        badge.style.display = 'none';
    }
}

// 3. 覆寫原有的 updateNotifBadge 函式
// 讓推播系統不再直接關閉紅點，而是透過統一函式檢查
window.updateNotifBadge = function() {
    refreshGlobalBadge();
};

// 4. 覆寫原有的 monitorPendingAssignments 函式
// 改為更新全域狀態變數，然後呼叫統一函式
if (typeof pendingMonitorRef !== 'undefined' && pendingMonitorRef) {
    pendingMonitorRef.off(); // 先移除舊的監聽器防止重複
}

window.monitorPendingAssignments = function() {
    const s = JSON.parse(localStorage.getItem('studentProfile'));
    
    // 如果沒有登入資料，就不監聽
    if (!s) return;

    // 移除舊的監聽 (如果存在)
    if (typeof pendingMonitorRef !== 'undefined' && pendingMonitorRef) {
        pendingMonitorRef.off();
    }

    // 設定監聽路徑
    pendingMonitorRef = database.ref(`assignments/${s.grade}/${s.class}`);

    pendingMonitorRef.on('value', async (snapshot) => {
        const assignments = snapshot.val();
        
        // 如果完全沒有功課資料
        if (!assignments) {
            window.hasPendingWork = false;
            refreshGlobalBadge();
            return;
        }

        const assignmentKeys = Object.keys(assignments);
        
        // 並行檢查每一份功課的繳交狀態
        const checkPromises = assignmentKeys.map(async (key) => {
            const subSnap = await database.ref(`assignments_submissions/${key}/${s.name}`).once('value');
            return subSnap.exists(); // true = 已交, false = 未交
        });

        const results = await Promise.all(checkPromises);

        // 更新全域狀態：只要有一個是 false，就代表有待辦事項
        window.hasPendingWork = results.includes(false);

        // 觸發 UI 更新
        refreshGlobalBadge();
    });
};

// 5. 確保在頁面重新整理或登入後立即重新啟動監聽
// (延遲執行以確保 Firebase 已就緒)
setTimeout(() => {
    const s = JSON.parse(localStorage.getItem('studentProfile'));
    if (s) {
        monitorPendingAssignments();
    }
}, 1500);

</script>

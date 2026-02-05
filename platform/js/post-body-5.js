// Post-Body Scripts 5
// ==========================================
// === [修訂版] 權限攔截器 & 錯誤訊息靜音 ===
// ==========================================
(function() {
    // 1. 定義一個全域旗標，用來標記「剛剛是否觸發了會員阻擋」
    window._isGuestBlockActive = false;

    // 2. 升級 window.alert (攔截冗餘錯誤)
    // 我們保存目前頁面上已經存在的 Alert 函式 (包含莫蘭迪樣式)
    const existingAlert = window.alert;

    window.alert = function(msg) {
        // ★ 核心邏輯：如果處於「靜音模式」，直接忽略這次報錯
        // 這樣就不會蓋在「會員限定」視窗上面
        if (window._isGuestBlockActive) {
            console.log("已自動過濾冗餘的錯誤提示:", msg);
            return; 
        }
        // 否則，正常執行原本的 Alert
        existingAlert(msg);
    };

    // 3. 覆寫權限檢查函式
    window.checkGuestUsage = function() {
        // A. 檢查是否已登入
        const s = JSON.parse(localStorage.getItem('studentProfile'));
        
        // B. 如果有資料 -> 放行 (return true)
        if (s) {
            return true; 
        }

        // C. 如果沒資料 -> 執行阻擋
        console.warn("[Permission] 未登入用戶嘗試使用，已攔截。");
        
        // --- 步驟 1：開啟靜音模式 ---
        // 設定為 true，持續 1.5 秒。這段時間內的「生成失敗」、「請重試」Alert 都會被吃掉。
        window._isGuestBlockActive = true;
        
        // 1.5秒後自動恢復 Alert 功能
        setTimeout(() => { window._isGuestBlockActive = false; }, 1500);

        // --- 步驟 2：優化 UI 體驗 ---
        // 嘗試收起側邊選單，避免遮擋
        const sideMenu = document.getElementById('sideMenu');
        if (sideMenu) sideMenu.classList.remove('active');
        const sideMenuToggle = document.getElementById('sideMenuToggle');
        if (sideMenuToggle) sideMenuToggle.classList.remove('active');

        // 手機震動回饋
        if (navigator.vibrate) navigator.vibrate(50);

        // --- 步驟 3：顯示漂亮的會員限定視窗 ---
        const modal = document.getElementById('loginRequiredModal');
        
        if (modal) {
            modal.style.display = 'flex';
        } else {
            // 防呆：萬一找不到視窗，才勉強用 Alert (需暫時解除靜音才能顯示)
            let tempState = window._isGuestBlockActive;
            window._isGuestBlockActive = false; 
            existingAlert("⚠️ 此功能僅限登入用戶使用。\n請先登入學校帳號。");
            window._isGuestBlockActive = tempState;
            
            if (typeof openStudentLoginModal === 'function') openStudentLoginModal();
        }

        // 回傳 false 以中斷 API 連線 (這會觸發 catch block，但 alert 會被上面的邏輯吃掉)
        return false; 
    };
})();;



// ★★★★★ 請將代碼貼在這裡 (原本的內容之下，script 結束標籤之上) ★★★★★

    // =======================================================
    // === [新增] 在線狀態自動報到系統 (Presence System) ===
    // =======================================================
    function initPresenceSystem() {
        // 延遲執行，確保 Firebase 已初始化且本地存儲已讀取
        setTimeout(() => {
            if (typeof database === 'undefined') return;

            // 1. 監聽連線狀態
            const connectedRef = database.ref('.info/connected');

            connectedRef.on('value', (snap) => {
                if (snap.val() === true) {
                    // === 連線成功，準備資料 ===
                    
                    // 獲取用戶資料
                    const s = JSON.parse(localStorage.getItem('studentProfile'));
                    let myUid = "";
                    let userData = {};

                    // A. 判斷身分
                    if (s && s.name) {
                        // --- 已登入用戶 (學生/老師/特許) ---
                        const user = firebase.auth().currentUser;
                        myUid = user ? user.uid : `stu_${s.grade}${s.class}_${s.name}`;
                        
                        // 準備寫入的資料
                        userData = {
                            name: s.name,
                            grade: s.grade,
                            class: s.class,
                            timestamp: firebase.database.ServerValue.TIMESTAMP,
                            device: /Mobile|Android/i.test(navigator.userAgent) ? 'Mobile' : 'Desktop'
                        };
                    } else {
                        // --- 訪客 ---
                        let guestId = localStorage.getItem('sansi_guest_uuid');
                        if (!guestId) {
                            guestId = 'guest_' + Math.random().toString(36).substr(2, 9);
                            localStorage.setItem('sansi_guest_uuid', guestId);
                        }
                        myUid = guestId;

                        userData = {
                            name: "訪客",
                            grade: "Guest",
                            class: "Visitor",
                            timestamp: firebase.database.ServerValue.TIMESTAMP
                        };
                    }

                    // B. 執行 Firebase 動作
                    const myPresenceRef = database.ref(`online_users/${myUid}`);

                    // 關鍵指令：當客戶端斷線時，自動刪除這筆資料
                    myPresenceRef.onDisconnect().remove().then(() => {
                        // 斷線指令設定成功後，寫入當前狀態
                        myPresenceRef.set(userData);
                    });
                }
            });
        }, 2000); // 延遲 2 秒啟動
    }

    // 啟動報到系統
    document.addEventListener('DOMContentLoaded', initPresenceSystem);





		
</script>

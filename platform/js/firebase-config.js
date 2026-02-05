// ==========================================
// Firebase 配置與初始化模組
// ==========================================

// 全域變數宣告
let lastGeneratedTimestamp = null; // 用於追蹤當前正在操作的紀錄時間戳

// =======================================================
// 全域安全網：攔截權限錯誤並保護紀錄
// =======================================================
window.addEventListener('unhandledrejection', function(event) {
    // 偵測錯誤訊息中是否包含關鍵字
    if (event.reason && (
        (event.reason.code === 'PERMISSION_DENIED') || 
        (event.reason.message && event.reason.message.includes('permission_denied'))
    )) {
        console.warn("🚨 偵測到暫時性權限訊號 (已忽略，等待系統自動刷新 Token)");
        event.preventDefault(); // 阻止錯誤繼續擴散
        
        // 註解掉下面這一行，防止電腦喚醒時自動登出
        // forceLogoutAndKeepHistory();  
    }
});

// 專門處理強制登出的函式
function forceLogoutAndKeepHistory() {
    // 1. 防止短時間內重複觸發
    if (sessionStorage.getItem('is_force_logging_out')) return;
    sessionStorage.setItem('is_force_logging_out', 'true');

    // 2. 停止所有 Firebase 監聽 (停止報錯)
    if (typeof database !== 'undefined') {
        try { database.ref().off(); } catch(e){}
    }

    // 3. 關鍵：只清除身份資料，不碰歷史紀錄
    localStorage.removeItem('studentProfile'); 
    localStorage.removeItem('sansi_read_notifications'); 
    
    // 注意：我們【沒有】執行 indexedDB.deleteDatabase()
    // 所以生成紀錄 (IndexedDB) 會完整保留在瀏覽器中

    // 4. 強制 Firebase 登出
    if (typeof auth !== 'undefined') auth.signOut();

    // 5. 提示使用者並重整
    alert("⚠️ 連線憑證已過期。\n\n系統已自動為您登出以修復連線。\n您的歷史紀錄已安全保留，請重新登入即可。");
    
    // 6. 釋放鎖定並重整頁面
    sessionStorage.removeItem('is_force_logging_out');
    window.location.reload();
}

// Firebase 配置
const firebaseConfig = {
    apiKey: "AIzaSyBgwrgn2m343mRJb0WjzUhteiospegXhvI",
    authDomain: "sansidata.firebaseapp.com",
    projectId: "sansidata",
    storageBucket: "sansidata.firebasestorage.app",
    messagingSenderId: "580288358575",
    appId: "1:580288358575:web:35dcf4e79bcef530de4c5a",
    databaseURL: "https://sansidata-default-rtdb.firebaseio.com" 
};

// 宣告全域變數
let database, auth;

// 初始化 Firebase
function initializeFirebase() {
    if (typeof firebase !== 'undefined' && !firebase.apps.length) {
        try {
            firebase.initializeApp(firebaseConfig);
            console.log("Firebase 初始化成功！");
            database = firebase.database();
            auth = firebase.auth();
        } catch (e) {
            console.error("Firebase 初始化失敗：", e);
        }
    } else if (typeof firebase !== 'undefined' && firebase.apps.length) {
        database = firebase.database();
        auth = firebase.auth();
    }
}

// 自動執行初始化
initializeFirebase();

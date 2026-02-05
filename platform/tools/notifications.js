/**
 * ======================================
 * OneSignal 通知服務初始化模組
 * ======================================
 * 負責初始化 OneSignal 推送通知服務
 * 並根據使用者資料設定標籤
 */

// OneSignal SDK 已通過 HTML 中的 script 標籤載入
// <script src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js" defer></script>

window.OneSignalDeferred = window.OneSignalDeferred || [];

window.addEventListener('load', async function() {
    OneSignalDeferred.push(async function(OneSignal) {
        try {
            await OneSignal.init({
                appId: "f85da4b8-abae-4c5e-8db9-c9f463fc9815",
                
                // === 關鍵修正：移除動態時間戳，避免每次產生新的 Worker ===
                serviceWorkerPath: "OneSignalSDKWorker.js",
                
                // 確保 Scope 正確
                serviceWorkerParam: { scope: "/AIChinese/" },

                allowLocalhostAsSecureOrigin: true,
                notifyButton: { enable: false } 
            });
            
            console.log("OneSignal 初始化成功 (修正版)！");

            // === 標籤設定 (保留你的邏輯) ===
            const s = JSON.parse(localStorage.getItem('studentProfile'));
            if (s) {
                // 延遲一點點確保 User ID 已建立
                setTimeout(() => {
                    OneSignal.User.addTags({ 
                        grade: String(s.grade), 
                        class: String(s.class), 
                        userType: 'student' 
                    });
                    console.log("標籤已更新");
                }, 1000);
            }

        } catch (err) {
            console.error("OneSignal 初始化失敗:", err);
        }
    });
});

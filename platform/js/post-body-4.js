// Post-Body Scripts 4
document.addEventListener('DOMContentLoaded', function() {
    
    // 定義震動函數
    function triggerVibration() {
        // 檢查瀏覽器支援
        if (!navigator.vibrate) {
            console.log("此設備/瀏覽器不支援震動 API (如: iPhone)");
            return;
        }
        
        // 嘗試震動 50 毫秒 (比 10ms 更明顯)
        // 有些手機需要用戶曾經點擊過頁面至少一次才會開啟震動權限
        try {
            navigator.vibrate(35);
            console.log("觸發震動指令");
        } catch (e) {
            console.error("震動失敗", e);
        }
    }
 
    // 定義目標元素
  const interactiveSelectors = [
     
        '.anime-card',             // 主頁動漫卡片
        '.side-menu-item',         // 側邊選單項目
        '#homeBtn',                // 懸浮返回主頁鍵
        '.btn',                    // 生成/自訂題目按鈕
        '.btn-action',             // 提交/執行按鈕
        '.btn-icon-action',        // 圖示操作按鈕 (儲存/清空等)
        '.btn-icon-confirm',       // 圓形確認按鈕
        '.btn-save-html',          // 下載 HTML 按鈕
        '.history-folder-btn',     // 歷史紀錄資料夾
        '.history-card',           // 歷史紀錄卡片
        '.task-card',              // 雲端課業卡片
        '.logout-icon-btn',        // 登出按鈕
        'select'                   // 下拉選單
    ];

 
    // 使用 'touchstart' (手指按下瞬間) 而不是 'click'，反應會更快
    // 同時監聽 'mousedown' 以相容電腦滑鼠測試
    const triggerEvents = ['touchstart', 'mousedown'];
 
    triggerEvents.forEach(eventType => {
        document.body.addEventListener(eventType, function(e) {
            // 檢查點擊目標
            for (let selector of interactiveSelectors) {
                if (e.target.closest(selector)) {
                    triggerVibration();
                    // 不使用 break，確保複合元素也能觸發
                    return;
                }
            }
        }, { passive: true }); // passive: true 優化滾動效能
    });
});
</script>

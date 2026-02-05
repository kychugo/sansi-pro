// Custom Alert Override
// ==========================================
// === 覆寫原生 alert 為莫蘭迪 UI ===
// ==========================================
(function() {
    // 保存原始 alert 以防萬一需要使用 (雖然這裡我們選擇完全覆蓋)
    const originalAlert = window.alert;

    window.alert = function(message) {
        // 1. 移除頁面上可能已存在的 Alert (防止堆疊)
        const existingAlert = document.getElementById('sansi-custom-alert');
        if (existingAlert) existingAlert.remove();

        // 2. 建立 DOM 結構
        const overlay = document.createElement('div');
        overlay.id = 'sansi-custom-alert';
        overlay.className = 'sansi-alert-overlay';

        // 判斷是否為錯誤訊息 (簡單判斷關鍵字)
        const isError = String(message).includes('失敗') || String(message).includes('錯誤') || String(message).includes('請先');
        const iconClass = isError ? 'fa-exclamation-circle' : 'fa-info-circle';
        const iconColor = isError ? '#d69a92' : '#8fa398'; // 錯誤用豆沙紅，普通用灰綠

        overlay.innerHTML = `
            <div class="sansi-alert-box">
                <div class="sansi-alert-icon">
                    <i class="fas ${iconClass}" style="color: ${iconColor};"></i>
                </div>
                <div class="sansi-alert-message">${String(message)}</div>
                <button class="sansi-alert-btn" onclick="closeSansiAlert()">
                    明白
                </button>
            </div>
        `;

        // 3. 加入頁面
        document.body.appendChild(overlay);

        // 4. 觸發進場動畫 (需要一點延遲讓 DOM 渲染)
        requestAnimationFrame(() => {
            overlay.classList.add('sansi-alert-show');
        });

        // 5. 綁定鍵盤事件 (按 Enter 關閉)
        const handleEnter = (e) => {
            if (e.key === 'Enter' || e.key === 'Escape') {
                closeSansiAlert();
                document.removeEventListener('keydown', handleEnter);
            }
        };
        document.addEventListener('keydown', handleEnter);
    };

    // 全域關閉函式
    window.closeSansiAlert = function() {
        const overlay = document.getElementById('sansi-custom-alert');
        if (overlay) {
            // 退場動畫
            overlay.classList.remove('sansi-alert-show');
            setTimeout(() => {
                if (overlay) overlay.remove();
            }, 300); // 等待 CSS transition 結束
        }
    };
})();

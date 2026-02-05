// Post-Body Scripts 11
(function() {
    const STORAGE_PREFIX = 'sansi_autosave_';
    const TRACKING_KEY = 'sansi_current_editing_id'; // 用來記住當前正在編輯哪個 ID

    // 1. 【核心修正】攔截點擊事件，記住「原本的格子是誰」
    // 使用 capture: true (捕獲階段)，確保在原本的視窗打開前先抓到 ID
    document.body.addEventListener('click', function(e) {
        const t = e.target;
        // 判斷是否為輸入框 (Textarea 或 Input Text)
        const isInput = (t.tagName === 'TEXTAREA' || (t.tagName === 'INPUT' && t.type === 'text'));
        // 排除懸浮視窗本身，只抓背後的格子
        const isNotModal = t.id !== 'modal-textarea';
        
        if (isInput && isNotModal && t.id) {
            // 立即記住這個 ID 到瀏覽器暫存，誰也拿不走
            sessionStorage.setItem(TRACKING_KEY, t.id);
            // console.log('鎖定編輯對象:', t.id);
        }
    }, true); 

    // 2. 儲存邏輯：監聽打字動作
    document.body.addEventListener('input', function(e) {
        const target = e.target;
        let idToSave = target.id;
        let valueToSave = target.value;

        // 如果正在懸浮視窗打字
        if (target.id === 'modal-textarea') {
            // 從暫存中取出「原本格子」的 ID
            const originalId = sessionStorage.getItem(TRACKING_KEY);
            if (originalId) {
                idToSave = originalId; // 偷天換日，把存檔目標改成原本的格子
                
                // 順便嘗試更新背後的 DOM 元素 (如果它還在畫面上的話)
                const originalEl = document.getElementById(originalId);
                if (originalEl) originalEl.value = valueToSave;
            }
        }

        // 執行儲存 (0秒延遲)
        if (idToSave && idToSave !== 'modal-textarea') {
            sessionStorage.setItem(STORAGE_PREFIX + idToSave, valueToSave);
        }
    });

    // 3. 恢復邏輯 (通用函式)
    function restoreValue(element) {
        if (!element.id || element.id === 'modal-textarea') return;

        const savedValue = sessionStorage.getItem(STORAGE_PREFIX + element.id);
        // 只有當格子是空的，且有存檔時才恢復 (避免覆蓋預設值)
        if (savedValue !== null && element.value === '') {
            element.value = savedValue;
            // 觸發輸入事件，讓字數統計等功能知道字回來了
            element.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }

    // 4. 初始化恢復：頁面剛載入時
    // 延遲 500ms 執行，等待您的主程式建立好介面
    setTimeout(() => {
        document.querySelectorAll('textarea, input[type="text"]').forEach(restoreValue);
    }, 500);

    // 5. 動態元素恢復：監測 DOM 變動 (針對生成的大綱表格)
    // 當您切換到「大綱」或點擊「生成」時，表格是新長出來的，這裡負責填字
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            mutation.addedNodes.forEach(function(node) {
                if (node.nodeType === 1) { // 元素節點
                    if (node.tagName === 'TEXTAREA' || (node.tagName === 'INPUT' && node.type === 'text')) {
                        restoreValue(node);
                    } else {
                        // 檢查子元素 (例如表格行裡的 textarea)
                        const inputs = node.querySelectorAll('textarea, input[type="text"]');
                        inputs.forEach(restoreValue);
                    }
                }
            });
        });
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // 6. 清除邏輯：按垃圾桶時同步清除暫存
    document.body.addEventListener('click', function(e) {
        const clearBtn = e.target.closest('.btn-clear-icon');
        if (clearBtn) {
            setTimeout(() => {
                Object.keys(sessionStorage).forEach(key => {
                    if (key.startsWith(STORAGE_PREFIX)) {
                        sessionStorage.removeItem(key);
                    }
                });
                console.log('已清除所有自動暫存');
            }, 100);
        }
    });
})();
</script>

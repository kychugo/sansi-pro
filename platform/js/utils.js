/**
 * ======================================
 * 通用工具函式模組
 * ======================================
 * 提供各種實用工具函式
 * 包含：氣泡顯示、位置更新等
 */

/**
 * 顯示對話氣泡
 * @param {string} htmlContent - 氣泡內容 (支援 HTML)
 * @param {number} autoHideMs - 自動隱藏時間 (毫秒)，0 代表常駐
 */
function showBubble(htmlContent, autoHideMs = 0) {
    if (!speechBubble) return;
    
    speechBubble.innerHTML = htmlContent;
    speechBubble.style.display = 'block';
    void speechBubble.offsetWidth; 
    speechBubble.classList.add('show');
    
    updateBubblePosition();
}

/**
 * 隱藏對話氣泡
 */
function hideBubble() {
    if (!speechBubble) return;
    speechBubble.classList.remove('show');
    setTimeout(() => {
        speechBubble.style.display = 'none';
    }, 300);
}

/**
 * 更新氣泡位置
 * 根據模型容器位置自動調整氣泡位置
 */
function updateBubblePosition() {
    if (!modelContainer || !speechBubble || speechBubble.style.display === 'none') return;

    const bounds = modelContainer.getBounds();
    const bubbleRect = speechBubble.getBoundingClientRect();
    const screenW = window.innerWidth;
    const padding = 10;

    let left = bounds.x + (bounds.width / 2) - (bubbleRect.width / 2);
    let top = bounds.y - bubbleRect.height - 15;

    if (top < padding) {
        top = bounds.y + bounds.height + 15;
    }
    if (left < padding) left = padding;
    if (left + bubbleRect.width > screenW - padding) {
        left = screenW - bubbleRect.width - padding;
    }

    speechBubble.style.left = `${left}px`;
    speechBubble.style.top = `${top}px`;
}

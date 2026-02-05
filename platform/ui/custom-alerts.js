/**
 * ============================================================================
 * CUSTOM ALERTS & DIALOGS SYSTEM
 * ============================================================================
 * Manages custom alert dialogs, modals, and loading overlays
 * 
 * Features:
 * - Native alert() override for expired credentials
 * - Modal dialog management (preview, video, feedback)
 * - Loading overlay system
 * - Custom notification cards
 * 
 * Dependencies:
 * - Firebase (for notifications)
 * - DOM elements with specific IDs
 * ============================================================================
 */

// ============================================================================
// NOTIFICATION SYSTEM
// ============================================================================

/**
 * Display custom notification card
 * Shows assignment notifications with Morandi color scheme
 */
function showSansiNotif(type, topic, uniqueId) {
    if (document.querySelector(`[data-notif-id="${uniqueId}"]`)) return; // Prevent duplicates

    const container = document.getElementById('notifContainer');
    if (!container) return;

    // Morandi color palette for visual variety
    const morandiPalette = ['#8fa398', '#94a7b5', '#b6a6ca', '#d69a92', '#c7b299'];
    const randomThemeColor = morandiPalette[Math.floor(Math.random() * morandiPalette.length)];

    const notif = document.createElement('div');
    notif.setAttribute('data-notif-id', uniqueId);
    notif.className = 'sansi-notif-card';
    notif.style.backgroundColor = randomThemeColor;

    let icon = '';
    let title = '';
    let message = '';

    if (type === 'new') {
        icon = '<i class="fas fa-book-open"></i>';
        title = '新課業通知';
        message = `老師派發了「${topic}」`;
    } else if (type === 'returned') {
        icon = '<i class="fas fa-envelope-open-text"></i>';
        title = '已發還評語';
        message = `「${topic}」已批改完成`;
    }

    notif.innerHTML = `
        <div class="notif-icon">${icon}</div>
        <div class="notif-content">
            <div class="notif-title">${title}</div>
            <div class="notif-message">${message}</div>
        </div>
        <button class="notif-close" onclick="this.parentElement.remove()">×</button>
    `;

    // Add slide-in animation
    notif.style.animation = 'slideInRight 0.3s ease';
    container.appendChild(notif);

    // Auto-remove after 8 seconds
    setTimeout(() => {
        if (notif.parentElement) {
            notif.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => notif.remove(), 300);
        }
    }, 8000);

    // Mark as notified
    if (!notifiedIds.includes(uniqueId)) {
        notifiedIds.push(uniqueId);
    }
}

// ============================================================================
// MODAL DIALOG HELPERS
// ============================================================================

/**
 * Close modal when clicking on overlay background
 */
function closeModalOnOverlayClick(event, modalId) {
    if (event.target.id === modalId) {
        document.getElementById(modalId).style.display = 'none';
    }
}

/**
 * Open a modal dialog by ID
 */
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
    }
}

/**
 * Close a modal dialog by ID
 */
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

// ============================================================================
// LOADING OVERLAY SYSTEM
// ============================================================================

/**
 * Show loading overlay with optional message
 */
function showLoading(message = '載入中...') {
    let overlay = document.getElementById('loadingOverlay');
    
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'loadingOverlay';
        overlay.className = 'loading-overlay';
        overlay.innerHTML = `
            <div class="loading-spinner">
                <i class="fas fa-circle-notch fa-spin fa-3x"></i>
                <p id="loadingMessage">${message}</p>
            </div>
        `;
        document.body.appendChild(overlay);
    } else {
        document.getElementById('loadingMessage').textContent = message;
        overlay.style.display = 'flex';
    }
}

/**
 * Hide loading overlay
 */
function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

/**
 * Update loading message without hiding overlay
 */
function updateLoadingMessage(message) {
    const messageEl = document.getElementById('loadingMessage');
    if (messageEl) {
        messageEl.textContent = message;
    }
}

// ============================================================================
// ALERT OVERRIDE (for credential expiration)
// ============================================================================

/**
 * Note: The main app uses native alert() for credential expiration:
 * alert("⚠️ 連線憑證已過期。\n\n系統已自動為您登出以修復連線。\n您的歷史紀錄已安全保留，請重新登入即可。");
 * 
 * This could be replaced with a custom alert function if needed.
 */

// ============================================================================
// EXPORT (if using modules)
// ============================================================================

// If using ES6 modules, export functions:
// export { showSansiNotif, openModal, closeModal, showLoading, hideLoading, updateLoadingMessage };

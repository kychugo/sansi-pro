/**
 * ============================================================================
 * SIDE MENU SYSTEM
 * ============================================================================
 * Manages the hamburger side menu with navigation and context-aware buttons
 * 
 * Features:
 * - Toggle hamburger menu with animation
 * - Context-aware button visibility (cloud, home buttons)
 * - Auto-close on item click or outside click
 * - Responsive menu items with icons
 * 
 * Dependencies:
 * - DOM elements: sideMenuToggle, sideMenu, sideMenuClose
 * - Various page containers for context detection
 * ============================================================================
 */

// ============================================================================
// SIDE MENU INITIALIZATION
// ============================================================================

/**
 * Initialize side menu event listeners
 * Called on DOMContentLoaded
 */
function initializeSideMenu() {
    const sideMenuToggle = document.getElementById('sideMenuToggle');
    const sideMenu = document.getElementById('sideMenu');
    const sideMenuHomeBtn = document.getElementById('sideMenuHomeBtn');
    const sideMenuCloudBtn = document.getElementById('sideMenuCloudBtn');

    // 1. Hamburger menu toggle logic
    sideMenuToggle.onclick = function(e) {
        e.stopPropagation();
        if (sideMenu.classList.contains('active')) {
            closeSideMenu();
        } else {
            openSideMenu();
        }
    };

    // 2. Auto-close menu when clicking menu items
    const menuItems = document.querySelectorAll('.side-menu-item');
    menuItems.forEach(item => {
        item.addEventListener('click', function() {
            closeSideMenu();
        });
    });

    // 3. Close menu when clicking outside
    document.addEventListener('click', function(e) {
        if (sideMenu.classList.contains('active') && 
            !sideMenu.contains(e.target) && 
            e.target !== sideMenuToggle) {
            closeSideMenu();
        }
    });

    // 4. Close button handler
    const sideMenuClose = document.getElementById('sideMenuClose');
    if (sideMenuClose) {
        sideMenuClose.onclick = function() {
            closeSideMenu();
        };
    }
}

// ============================================================================
// SIDE MENU OPEN/CLOSE
// ============================================================================

/**
 * Open side menu with context-aware button visibility
 */
function openSideMenu() {
    const sideMenu = document.getElementById('sideMenu');
    const sideMenuToggle = document.getElementById('sideMenuToggle');
    const sideMenuHomeBtn = document.getElementById('sideMenuHomeBtn');
    const sideMenuCloudBtn = document.getElementById('sideMenuCloudBtn');

    sideMenu.classList.add('active');
    sideMenuToggle.classList.add('active');
    
    // === Determine current page state to show appropriate buttons ===
    const isOnMainPage = document.querySelector('.title-container').style.display !== 'none';
    const isOnToolsPage = document.getElementById('toolsContainer2').style.display === 'flex';
    const isOnCloudPage = document.getElementById('studentCloudModal').style.display === 'block';
    
    // Logic for button visibility
    if (isOnCloudPage) {
        // On "Cloud Status" page
        if (sideMenuHomeBtn) sideMenuHomeBtn.style.display = 'flex';  // Show home button
        if (sideMenuCloudBtn) sideMenuCloudBtn.style.display = 'none'; // Hide cloud button
    } 
    else if (isOnToolsPage) {
        // On "Tools Overview" page
        if (sideMenuHomeBtn) sideMenuHomeBtn.style.display = 'flex';
        if (sideMenuCloudBtn) sideMenuCloudBtn.style.display = 'flex'; 
    }
    else if (isOnMainPage) {
        // On main page
        if (sideMenuHomeBtn) sideMenuHomeBtn.style.display = 'none'; 
        if (sideMenuCloudBtn) sideMenuCloudBtn.style.display = 'flex'; 
    } 
    else {
        // Other feature pages (writing, reading, etc.)
        if (sideMenuHomeBtn) sideMenuHomeBtn.style.display = 'flex';
        if (sideMenuCloudBtn) sideMenuCloudBtn.style.display = 'flex';
    }
}

/**
 * Close side menu
 */
function closeSideMenu() {
    const sideMenu = document.getElementById('sideMenu');
    const sideMenuToggle = document.getElementById('sideMenuToggle');
    
    sideMenu.classList.remove('active');
    sideMenuToggle.classList.remove('active');
}

/**
 * Check if side menu is currently open
 */
function isSideMenuOpen() {
    const sideMenu = document.getElementById('sideMenu');
    return sideMenu && sideMenu.classList.contains('active');
}

// ============================================================================
// SIDE MENU ITEM HANDLERS
// ============================================================================

/**
 * Open tools overview from side menu
 * Closes menu and triggers tools page
 */
function openToolsFromSideMenu() {
    closeSideMenu();
    const expandToolsBtn = document.getElementById('expandToolsBtn2');
    if (expandToolsBtn) {
        expandToolsBtn.click(); // Trigger existing tools overview logic
    }
}

/**
 * Open history container from side menu
 */
function openHistoryFromSideMenu() {
    closeSideMenu();
    openHistoryContainer(); // Defined in history system
}

/**
 * Open student login modal from side menu
 */
function openStudentLoginFromSideMenu() {
    closeSideMenu();
    openStudentLoginModal(); // Defined in auth system
}

/**
 * Open book resource menu from side menu
 */
function openBookResourceFromSideMenu() {
    closeSideMenu();
    openBookResourceMenu(); // Defined in book resource system
}

/**
 * Toggle music player from side menu
 */
function toggleMusicFromSideMenu() {
    closeSideMenu();
    toggleMusicPlayer(); // Defined in music system
}

/**
 * Return to home from side menu
 * Shows main page and hides all other containers
 */
function returnToHomeFromSideMenu() {
    closeSideMenu();
    returnToHome(); // Defined in navigation system
}

// ============================================================================
// SIDE MENU STATE MANAGEMENT
// ============================================================================

/**
 * Update side menu button visibility based on context
 * Called when navigating between pages
 */
function updateSideMenuContext() {
    // Only update if menu is currently open
    if (!isSideMenuOpen()) return;

    const sideMenuHomeBtn = document.getElementById('sideMenuHomeBtn');
    const sideMenuCloudBtn = document.getElementById('sideMenuCloudBtn');

    const isOnMainPage = document.querySelector('.title-container').style.display !== 'none';
    const isOnToolsPage = document.getElementById('toolsContainer2').style.display === 'flex';
    const isOnCloudPage = document.getElementById('studentCloudModal').style.display === 'block';
    
    if (isOnCloudPage) {
        if (sideMenuHomeBtn) sideMenuHomeBtn.style.display = 'flex';
        if (sideMenuCloudBtn) sideMenuCloudBtn.style.display = 'none';
    } 
    else if (isOnToolsPage) {
        if (sideMenuHomeBtn) sideMenuHomeBtn.style.display = 'flex';
        if (sideMenuCloudBtn) sideMenuCloudBtn.style.display = 'flex'; 
    }
    else if (isOnMainPage) {
        if (sideMenuHomeBtn) sideMenuHomeBtn.style.display = 'none';
        if (sideMenuCloudBtn) sideMenuCloudBtn.style.display = 'flex'; 
    } 
    else {
        if (sideMenuHomeBtn) sideMenuHomeBtn.style.display = 'flex';
        if (sideMenuCloudBtn) sideMenuCloudBtn.style.display = 'flex';
    }
}

/**
 * Close side menu when opening certain modals
 * Prevents menu from overlapping with modals
 */
function closeSideMenuForModal() {
    const sideMenu = document.getElementById('sideMenu');
    if (sideMenu && sideMenu.classList.contains('active')) {
        closeSideMenu();
    }
}

// ============================================================================
// SIDE MENU STYLING HELPERS
// ============================================================================

/**
 * Add temporary highlight to menu item
 * Used for visual feedback on click
 */
function highlightMenuItem(itemId) {
    const item = document.getElementById(itemId);
    if (!item) return;

    item.style.transition = 'all 0.2s ease';
    item.style.background = 'rgba(255, 255, 255, 0.2)';
    
    setTimeout(() => {
        item.style.background = '';
    }, 200);
}

/**
 * Show/hide specific menu item
 */
function toggleMenuItem(itemId, show) {
    const item = document.getElementById(itemId);
    if (item) {
        item.style.display = show ? 'flex' : 'none';
    }
}

// ============================================================================
// AUTO-INITIALIZATION
// ============================================================================

/**
 * Auto-initialize side menu on page load
 * Uncomment if not using manual initialization
 */
// document.addEventListener('DOMContentLoaded', initializeSideMenu);

// ============================================================================
// EXPORT (if using modules)
// ============================================================================

// If using ES6 modules, export functions:
// export { 
//     initializeSideMenu,
//     openSideMenu,
//     closeSideMenu,
//     isSideMenuOpen,
//     openToolsFromSideMenu,
//     updateSideMenuContext,
//     closeSideMenuForModal,
//     highlightMenuItem,
//     toggleMenuItem
// };

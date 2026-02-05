/**
 * Tools Manager Module
 * Manages the tools overview interface (語薈/toolsContainer2)
 */

// Open tools from side menu
window.openToolsFromSideMenu = function() {
    document.getElementById('sideMenu').classList.remove('active');
    document.getElementById('expandToolsBtn2').click();
};

// Initialize tools container when expand button is clicked
document.addEventListener('DOMContentLoaded', function() {
    const expandToolsBtn = document.getElementById('expandToolsBtn2');
    if (!expandToolsBtn) return;

    expandToolsBtn.addEventListener('click', function() {
        // 1. Close other fullscreen interfaces
        document.getElementById('historyContainer').style.display = 'none';
        document.getElementById('studentCloudModal').style.display = 'none';
        const featuredContainer = document.getElementById('featuredContainer');
        if (featuredContainer) featuredContainer.style.display = 'none';

        // 2. Hide homepage elements
        document.querySelector('.title-container').style.display = 'none';
        document.getElementById('hitokoto-container').style.display = 'none';
        document.getElementById('mainMenuBox').style.display = 'none';
        document.getElementById('toolsBox').style.display = 'none';
        const dseBox = document.getElementById('dse-countdown-box');
        if (dseBox) dseBox.style.display = 'none';

        // 3. Show tools container
        const container = document.getElementById('toolsContainer2');
        container.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        document.querySelector('#toolsContainer2 .main-container').classList.add('loaded');
        
        // 4. Update button states
        document.getElementById('homeBtn').style.display = 'none';
        document.getElementById('sideMenuHomeBtn').style.display = 'flex';
        
        const cloudBtn = document.getElementById('sideMenuCloudBtn');
        if (cloudBtn) cloudBtn.style.display = 'flex';
        
        // Close side menu
        document.getElementById('sideMenu').classList.remove('active');
        document.getElementById('sideMenuToggle').classList.remove('active');

        // Redraw connectors if available
        if (typeof debounceTimer !== 'undefined' && typeof drawConnectors === 'function') {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(drawConnectors, 100);
        }
    });

    // Close tools button
    const closeToolsBtn = document.getElementById('closeToolsBtn2');
    if (closeToolsBtn) {
        closeToolsBtn.addEventListener('click', function() {
            if (typeof returnToHome === 'function') {
                returnToHome();
            }
        });
    }

    // '語弈錄' Interactivity for Tool 2
    const yuyiluToggleTool2 = document.getElementById('yuyilu-toggle');
    const yuyiluGradesTool2 = document.getElementById('yuyilu-grades');

    if (yuyiluToggleTool2 && yuyiluGradesTool2) {
        yuyiluToggleTool2.addEventListener('click', function(event) {
            event.preventDefault();
            yuyiluGradesTool2.classList.toggle('collapsed');
            if (typeof debounceTimer !== 'undefined' && typeof drawConnectors === 'function') {
                setTimeout(drawConnectors, 500);
            }
        });
    }

    // Redraw connectors on resize
    window.addEventListener('resize', () => {
        if (typeof debounceTimer !== 'undefined' && typeof drawConnectors === 'function') {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(drawConnectors, 100);
        }
    });
});

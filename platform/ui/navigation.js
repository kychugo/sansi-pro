/**
 * Navigation Module
 * Handles navigation functions including returning to home
 */

// Return to home function - restores main page state
window.returnToHome = function() {
    // 1. Restore homepage background
    if (typeof scenes !== 'undefined' && scenes['home']) {
        document.body.style.backgroundImage = `url('${scenes['home']}')`;
    }

    // 2. Close outline editor modal
    const outlineModal = document.getElementById('outline-editor-modal');
    if (outlineModal) {
        outlineModal.style.display = 'none';
    }
    if (typeof currentEditingElement !== 'undefined') {
        currentEditingElement = null;
    }

    // 3. Hide all content containers
    const containers = [
        'writingContainer', 'readingContainer', 'booksContainer', 
        'expandContainer', 'argumentContainer', 'historyContainer'
    ];
    containers.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = "none";
    });

    // 4. Close history modal
    const historyModal = document.getElementById('historyModal');
    if (historyModal) {
        historyModal.style.display = 'none';
    }

    // 5. Reset history container to first level
    const histL1 = document.getElementById('historyLevel1Wrapper');
    const histL2 = document.getElementById('historyLevel2');
    const histL3 = document.getElementById('historyLevel3');
    const histBread = document.getElementById('historyBreadcrumb');
    
    if (histL1) histL1.style.display = 'flex';
    if (histL2) histL2.style.display = 'none';
    if (histL3) histL3.style.display = 'none';
    if (histBread) histBread.style.display = 'none';

    // 6. Show homepage elements
    const titleContainer = document.querySelector('.title-container');
    if (titleContainer) titleContainer.style.display = 'block';
    
    const hitokoto = document.getElementById('hitokoto-container');
    if (hitokoto) hitokoto.style.display = 'block';
    
    const mainMenu = document.getElementById('mainMenuBox');
    if (mainMenu) mainMenu.style.display = 'block';
    
    const toolsBox = document.getElementById('toolsBox');
    if (toolsBox) toolsBox.style.display = 'block';

    // 7. Show DSE countdown
    const dseBox = document.getElementById('dse-countdown-box');
    if (dseBox) dseBox.style.display = 'flex';

    // 8. Hide return buttons
    const sideMenuHomeBtn = document.getElementById('sideMenuHomeBtn');
    if (sideMenuHomeBtn) sideMenuHomeBtn.style.display = 'none';
    
    const homeBtn = document.getElementById('homeBtn');
    if (homeBtn) homeBtn.style.display = 'none';

    // 9. Remove active state from all cards
    document.querySelectorAll('.anime-card').forEach(card => card.classList.remove('active'));

    // 10. Hide tools container
    const toolsContainer2 = document.getElementById('toolsContainer2');
    if (toolsContainer2) {
        toolsContainer2.style.display = 'none';
        document.body.style.overflow = 'auto';
    }

    // 11. Close side menu
    const sideMenu = document.getElementById('sideMenu');
    if (sideMenu && sideMenu.classList.contains('active')) {
        sideMenu.classList.remove('active');
        const sideMenuToggle = document.getElementById('sideMenuToggle');
        if (sideMenuToggle) sideMenuToggle.classList.remove('active');
    }

    // 12. Hide all save buttons
    if (typeof hideAllSaveHtmlButtons === 'function') {
        hideAllSaveHtmlButtons();
    }

    // 13. Scroll to top
    window.scrollTo({ top: 0, behavior: 'instant' });
    
    // 14. Hide student cloud modal
    const studentCloudModal = document.getElementById('studentCloudModal');
    if (studentCloudModal) {
        studentCloudModal.style.display = 'none';
    }

    // 15. Hide featured container
    const featuredContainer = document.getElementById('featuredContainer');
    if (featuredContainer) {
        featuredContainer.style.display = 'none';
    }
};

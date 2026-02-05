/**
 * ============================================================================
 * CAT MENU SYSTEM
 * ============================================================================
 * Manages cat character selection and display
 * 
 * Features:
 * - Cat selection modal (Hijiki, Tororo, Both, None)
 * - Live2D model loading with caching
 * - Cat positioning and animations
 * - Cat mode persistence in localStorage
 * 
 * Dependencies:
 * - PIXI.js and PIXI.live2d for Live2D rendering
 * - IndexedDB for model caching
 * - DOM elements: catSelectionModal, sideMenu
 * ============================================================================
 */

// ============================================================================
// CAT MENU UI CONTROLS
// ============================================================================

/**
 * Open the cat selection menu
 * Closes side menu if open and displays cat modal
 */
function openCatMenu() {
    const sideMenu = document.getElementById('sideMenu');
    if(sideMenu) { 
        sideMenu.classList.remove('active'); 
        document.getElementById('sideMenuToggle').classList.remove('active'); 
    }
    document.getElementById('catSelectionModal').style.display = 'flex';
}

/**
 * Close cat menu when clicking on modal overlay
 */
function closeCatMenu(e) { 
    if(e.target.id === 'catSelectionModal') {
        e.target.style.display = 'none'; 
    }
}

// ============================================================================
// CAT MODE SELECTION
// ============================================================================

/**
 * Select and load cat mode
 * @param {string} mode - Cat mode: 'none', 'hijiki', 'tororo', 'both'
 * @param {boolean} save - Whether to save selection to localStorage
 */
async function selectCatMode(mode, save = true) {
    if (isCatLoading) return; // Prevent double-click
    isCatLoading = true;

    if (save) {
        localStorage.setItem('sansi_cat_mode', mode);
        const modal = document.getElementById('catSelectionModal');
        if(modal) modal.style.display = 'none';
    }

    const canvas = document.getElementById(CANVAS_ID);
    if (mode === 'none') {
        canvas.style.display = 'none';
        if (modelContainer) modelContainer.removeChildren();
        hideBubble(); 
        isCatLoading = false;
        return;
    }

    await initLive2DApp();
    canvas.style.display = 'block';
    
    modelContainer.removeChildren();
    modelContainer.scale.set(1);
    modelContainer.alpha = 0; 

    try {
        // Responsive scaling based on screen size
        const screenW = window.innerWidth;
        let baseScale;

        if (screenW < 600) {
            baseScale = 0.10; // Mobile
        } else if (screenW <= 1024) {
            baseScale = 0.15; // Tablet
        } else {
            baseScale = 0.15; // Desktop
        }

        if (mode === 'hijiki') {
            await loadModelToContainer(MODEL_PATH_HIJIKI, baseScale, 0); 
        } else if (mode === 'tororo') {
            await loadModelToContainer(MODEL_PATH_TORORO, baseScale, 0);
        } else if (mode === 'both') {
            // Dual cat mode with offset based on device size
            let offset = screenW < 600 ? 30 : (screenW <= 1024 ? 50 : 80);
            
            await loadModelToContainer(MODEL_PATH_HIJIKI, baseScale * 0.9, -offset);
            await loadModelToContainer(MODEL_PATH_TORORO, baseScale * 0.9, offset);
        }
        
        // Fade in animation
        setTimeout(() => {
            forceInitialPosition();
            
            let fadeTicker = setInterval(() => {
                modelContainer.visible = true;
                modelContainer.alpha += 0.1;
                if (modelContainer.alpha >= 1) {
                    modelContainer.alpha = 1;
                    clearInterval(fadeTicker);
                }
            }, 30);
        }, 300);
        
    } catch (err) {
        console.error("模型載入失敗:", err);
    } finally {
        isCatLoading = false;
    }
}

// ============================================================================
// MODEL LOADING WITH CACHE
// ============================================================================

/**
 * Load Live2D model with IndexedDB caching support
 * @param {string} path - Model path
 * @param {number} scale - Model scale
 * @param {number} xOffset - Horizontal offset position
 */
async function loadModelToContainer(path, scale, xOffset) {
    try {
        // Load using cached loader (returns assembled Model object)
        const model = await loadCachedLive2DModel(path);
        
        // Set model parameters
        model.scale.set(scale);
        model._baseOffsetX = xOffset;
        model.x = xOffset; 
        model.y = 0;
        
        // Add to stage
        modelContainer.addChild(model);
        
    } catch (e) {
        console.error("快取載入失敗，嘗試直接載入...", e);
        // Fallback: Direct network load if cache fails
        const model = await PIXI.live2d.Live2DModel.from(path);
        model.scale.set(scale);
        model.x = xOffset;
        modelContainer.addChild(model);
    }
}

// ============================================================================
// CAT POSITIONING
// ============================================================================

/**
 * Force cats to initial position (bottom-right corner)
 */
function forceInitialPosition() {
    if (!modelContainer) return;
    const bounds = modelContainer.getBounds();
    const screenW = window.innerWidth;
    const screenH = window.innerHeight;

    let targetX = screenW - bounds.width - 20;
    let targetY = screenH - bounds.height - 40;

    if (targetX < 0) targetX = 0;
    if (targetY < 0) targetY = 0;

    modelContainer.x = targetX;
    modelContainer.y = targetY;
}

/**
 * Keep cats within screen bounds (allows half-out positioning)
 */
function repositionCats() {
    if (!modelContainer || modelContainer.children.length === 0) return;
    
    const bounds = modelContainer.getBounds();
    const screenW = window.innerWidth;
    const screenH = window.innerHeight;
    
    const halfWidth = bounds.width / 2;
    const halfHeight = bounds.height / 2;
    
    // Allow cats to move half-way out of screen
    if (modelContainer.x < -halfWidth) modelContainer.x = -halfWidth;
    if (modelContainer.x > screenW - halfWidth) modelContainer.x = screenW - halfWidth;
    if (modelContainer.y < -halfHeight) modelContainer.y = -halfHeight;
    if (modelContainer.y > screenH - halfHeight) modelContainer.y = screenH - halfHeight;
}

// ============================================================================
// CAT MODE RESTORATION
// ============================================================================

/**
 * Restore saved cat mode from localStorage on page load
 * Called automatically during app initialization
 */
function restoreCatMode() {
    const savedMode = localStorage.getItem('sansi_cat_mode');
    if (savedMode) {
        setTimeout(() => selectCatMode(savedMode, false), 500);
    }
}

// ============================================================================
// EXPORT (if using modules)
// ============================================================================

// If using ES6 modules, export functions:
// export { openCatMenu, closeCatMenu, selectCatMode, loadModelToContainer, forceInitialPosition, repositionCats, restoreCatMode };

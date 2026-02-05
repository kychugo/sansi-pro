/**
 * ==========================================
 * SANSI History Manager Module
 * ==========================================
 * Handles all history-related functionality including:
 * - IndexedDB operations (save, load, delete, update)
 * - History UI rendering (categories, subfolders, list view)
 * - History detail viewing and editing
 * - Cloud synchronization with Firebase
 * - Export to HTML functionality
 * ==========================================
 */

// ==========================================
// IndexedDB Configuration
// ==========================================
const DB_NAME = 'SANSI_History';
const DB_VERSION = 3;
const STORE_NAME = 'writings';

// History Structure Definition
const HISTORY_STRUCTURE = {
    "閱讀": ["文章點評", "大綱點評"],
    "敘事抒情": ["指引", "點評"],
    "議論": ["指引", "點評"],
    "整合拓展": ["敘事物象", "解題指引"],
    "課外書籍": ["點評"],
    "學習報告": ["點評"]
};

// Category Assets Mapping
const CATEGORY_ASSETS = {
    "閱讀": { img: '郵筒.png', en: 'READING' },
    "敘事抒情": { img: '相機.png', en: 'NARRATIVE' },
    "議論": { img: '筆.png', en: 'ARGUMENT' },
    "整合拓展": { img: '火車.png', en: 'EXPAND' },
    "課外書籍": { img: '書.png', en: 'LIBRARY' },
    "學習報告": { img: '書.png', en: 'REPORT' }
};

// Global Variables
let currentCategoryFilter = '';
let currentSubFunctionFilter = '';
let currentThemeIndex = 1;
let lastGeneratedTimestamp = null;

// ==========================================
// IndexedDB Initialization
// ==========================================
function openHistoryDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
                store.createIndex('timestamp', 'timestamp', { unique: false });
                store.createIndex('category', 'category', { unique: false });
                store.createIndex('subFunction', 'subFunction', { unique: false });
            }
        };
    });
}

// ==========================================
// Save to History
// ==========================================
async function saveToHistory(category, subFunction, title, userContent, aiContent, scoreData = null) {
    try {
        const cleanUserContent = userContent ? sanitizeHTML(userContent) : '';
        const cleanAiContent = aiContent ? sanitizeHTML(aiContent) : '';
        
        const timestamp = Date.now();
        const record = {
            category,
            subFunction,
            title,
            userContent: cleanUserContent,
            aiContent: cleanAiContent,
            timestamp,
            dateStr: new Date(timestamp).toLocaleString('zh-HK', {
                year: 'numeric', month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit'
            }),
            scoreData
        };
        
        const db = await openHistoryDB();
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.add(record);
        
        request.onsuccess = async () => {
            console.log('History saved with ID:', request.result);
            lastGeneratedTimestamp = timestamp;
            
            // Cloud sync
            const s = JSON.parse(localStorage.getItem('studentProfile'));
            if (s) {
                const cloudKey = timestamp.toString();
                const path = `students/${s.grade}/${s.class}/${s.name}/history/${cloudKey}`;
                await database.ref(path).set(record);
            }
        };
        
        request.onerror = () => console.error('Save failed:', request.error);
        
    } catch (e) {
        console.error('Save to history error:', e);
    }
}

// ==========================================
// Smart Cloud Synchronization
// ==========================================
async function smartSyncHistory() {
    const s = JSON.parse(localStorage.getItem('studentProfile'));
    const user = firebase.auth().currentUser;
    
    if (!s || !user) return;
    
    try {
        const db = await openHistoryDB();
        const token = await user.getIdToken();
        const basePath = `students/${s.grade}/${s.class}/${s.name}/history`;
        
        // Get local records
        const localTx = db.transaction([STORE_NAME], 'readonly');
        const localStore = localTx.objectStore(STORE_NAME);
        const localRequest = localStore.getAll();
        
        const localRecords = await new Promise((resolve, reject) => {
            localRequest.onsuccess = () => resolve(localRequest.result);
            localRequest.onerror = () => reject(localRequest.error);
        });
        
        // Get cloud records
        const cloudSnapshot = await database.ref(basePath).once('value');
        const cloudData = cloudSnapshot.val() || {};
        const cloudRecords = Object.values(cloudData);
        
        // Merge
        const mergedRecords = mergeHistoryRecords(localRecords, cloudRecords);
        
        // Update local
        await updateLocalHistoryWithMergedData(mergedRecords, db);
        
        // Update cloud
        const cloudUpdate = {};
        mergedRecords.forEach(rec => {
            cloudUpdate[rec.timestamp.toString()] = rec;
        });
        await database.ref(basePath).set(cloudUpdate);
        
        console.log('Smart sync completed');
        
    } catch (e) {
        console.error('Smart sync error:', e);
    }
}

// ==========================================
// Merge Algorithm
// ==========================================
function mergeHistoryRecords(localRecords, cloudRecords) {
    const mergedMap = new Map();
    
    localRecords.forEach(rec => {
        if (rec.timestamp) {
            mergedMap.set(rec.timestamp, rec);
        }
    });
    
    cloudRecords.forEach(rec => {
        if (rec.timestamp) {
            const existing = mergedMap.get(rec.timestamp);
            if (!existing) {
                mergedMap.set(rec.timestamp, rec);
            }
        }
    });
    
    return Array.from(mergedMap.values());
}

// ==========================================
// Update Local History
// ==========================================
async function updateLocalHistoryWithMergedData(mergedRecords, db) {
    let localDb = db;
    if (!localDb) {
        localDb = await openHistoryDB();
    }
    
    const tx = localDb.transaction([STORE_NAME], 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    
    await store.clear();
    
    for (const record of mergedRecords) {
        await store.add(record);
    }
}

// ==========================================
// UI: Open History Container
// ==========================================
function openHistoryContainer() {
    const containers = [
        'writingContainer', 'readingContainer', 'booksContainer', 
        'expandContainer', 'argumentContainer', 'mainMenuBox', 
        'hitokoto-container', 'dse-countdown-box', 'toolsBox',
        'toolsContainer2', 'studentCloudModal', 'featuredContainer'
    ];
    
    containers.forEach(id => {
        const el = document.getElementById(id);
        if(el) el.style.display = 'none';
    });
    document.querySelector('.title-container').style.display = 'none';
    
    document.body.style.overflow = 'auto';
    
    const historyContainer = document.getElementById('historyContainer');
    historyContainer.style.display = 'block';
    
    const homeBtn = document.getElementById('sideMenuHomeBtn');
    if (homeBtn) homeBtn.style.display = 'flex';
    
    const cloudBtn = document.getElementById('sideMenuCloudBtn');
    if (cloudBtn) cloudBtn.style.display = 'flex';
    
    document.getElementById('sideMenu').classList.remove('active');
    document.getElementById('sideMenuToggle').classList.remove('active');
    
    renderHistoryCategories();
    
    window.scrollTo({ top: 0, behavior: 'instant' });
}

// ==========================================
// UI: Render Categories (Level 1)
// ==========================================
function renderHistoryCategories() {
    const searchContainer = document.getElementById('historyDateSearchContainer');
    if (searchContainer) searchContainer.style.display = 'none';
    
    document.getElementById('historyLevel1Wrapper').style.display = 'flex';
    document.getElementById('historyLevel2').style.display = 'none';
    document.getElementById('historyLevel3').style.display = 'none';
    
    playEntryAnimation('historyLevel1Wrapper');
    
    document.getElementById('historyBreadcrumb').style.display = 'none';
    
    const container = document.getElementById('historyLevel1');
    const categories = Object.keys(HISTORY_STRUCTURE);
    
    let html = '';
    
    categories.forEach(cat => {
        const asset = CATEGORY_ASSETS[cat] || { img: '背景.png', en: 'RECORD' };
        
        html += `
            <div class="anime-card" style="--bg-img: url('${asset.img}');" onclick="enterHistoryCategory('${cat}')">
                <div class="card-overlay"></div>
                <div class="card-border-effect"></div>
                <div class="card-content">
                    <div class="card-text">
                        <span class="card-zh">${cat}</span>
                        <span class="card-en">${asset.en}</span>
                    </div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// ==========================================
// UI: Enter Category (Level 2)
// ==========================================
function enterHistoryCategory(category) {
    const searchContainer = document.getElementById('historyDateSearchContainer');
    if (searchContainer) searchContainer.style.display = 'none';
    
    currentCategoryFilter = category;
    
    document.getElementById('historyLevel1Wrapper').style.display = 'none';
    document.getElementById('historyLevel2').style.display = 'grid';
    document.getElementById('historyLevel3').style.display = 'none';
    
    playEntryAnimation('historyLevel2');
    
    const breadcrumb = document.getElementById('historyBreadcrumb');
    breadcrumb.style.display = 'flex';
    document.getElementById('breadcrumb-sep-1').style.display = 'inline';
    const catSpan = document.getElementById('breadcrumb-category');
    catSpan.textContent = category;
    catSpan.style.display = 'inline';
    document.getElementById('breadcrumb-sep-2').style.display = 'none';
    document.getElementById('breadcrumb-sub').style.display = 'none';
    
    const container = document.getElementById('historyLevel2');
    const subFunctions = HISTORY_STRUCTURE[category] || [];
    
    let html = '';
    
    const subIcons = {
        "文章點評": "fa-file-alt",
        "大綱點評": "fa-list-ol",
        "敘事物象": "fa-tree",
        "解題指引": "fa-compass",
        "指引": "fa-lightbulb",
        "點評": "fa-comment-dots"
    };
    
    subFunctions.forEach((sub, index) => {
        const themeIndex = (index % 5) + 1;
        
        html += `
            <div class="history-folder-btn history-theme-${themeIndex}" onclick="enterHistoryList('${sub}', ${themeIndex})">
                <i class="fas ${subIcons[sub] || 'fa-file'}"></i>
                <span>${sub}</span>
            </div>
        `;
    });
    
    if (subFunctions.length === 0) {
        html = '<p style="grid-column: 1/-1; text-align:center; color: #666;">此範疇暫無子功能定義。</p>';
    }
    
    container.innerHTML = html;
}

// ==========================================
// UI: Enter History List (Level 3)
// ==========================================
async function enterHistoryList(subFunction, themeIndex) {
    currentSubFunctionFilter = subFunction;
    currentThemeIndex = themeIndex;
    
    document.getElementById('historyLevel1Wrapper').style.display = 'none';
    document.getElementById('historyLevel2').style.display = 'none';
    document.getElementById('historyLevel3').style.display = 'grid';
    
    playEntryAnimation('historyLevel3');
    
    const searchContainer = document.getElementById('historyDateSearchContainer');
    if (searchContainer) searchContainer.style.display = 'flex';
    
    const breadcrumb = document.getElementById('historyBreadcrumb');
    breadcrumb.style.display = 'flex';
    
    const homeSpan = breadcrumb.querySelector('span[onclick="renderHistoryCategories()"]');
    homeSpan.innerHTML = '<i class="fas fa-home"></i> 主範疇';
    
    document.getElementById('breadcrumb-sep-2').style.display = 'inline';
    const subSpan = document.getElementById('breadcrumb-sub');
    subSpan.textContent = subFunction;
    subSpan.style.display = 'inline';
    
    const listContainer = document.getElementById('historyLevel3');
    listContainer.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:30px; color:#999;"><i class="fas fa-circle-notch fa-spin"></i> 載入中...</div>';
    
    try {
        const db = await openHistoryDB();
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();
        
        request.onsuccess = function() {
            const allRecords = request.result;
            const filtered = allRecords.filter(r => 
                r.category === currentCategoryFilter && 
                r.subFunction === subFunction
            );
            
            filtered.sort((a, b) => b.timestamp - a.timestamp);
            
            listContainer.innerHTML = '';
            
            if (filtered.length === 0) {
                listContainer.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:30px; color:#999;">此分類尚無紀錄。</div>';
                return;
            }
            
            const accentColors = ['morandi-red', 'morandi-purple', 'morandi-blue', 'morandi-green', 'morandi-brown'];
            const accentClass = accentColors[themeIndex - 1] || 'morandi-red';
            
            filtered.forEach(record => {
                const dateStr = new Date(record.timestamp).toLocaleString('zh-HK', {
                    year: 'numeric', month: '2-digit', day: '2-digit'
                }).replace(/\//g, '-');
                
                const card = document.createElement('div');
                card.className = `history-card ${accentClass}`;
                card.setAttribute('data-timestamp', record.timestamp);
                card.setAttribute('onclick', `viewHistoryDetail(${record.id})`);
                
                card.innerHTML = `
                    <div style="flex-grow: 1;">
                        <div class="history-meta">
                            <span class="history-tag">${record.subFunction}</span>
                            <span class="history-date">${dateStr}</span>
                        </div>
                        
                        <h4 class="history-title" 
                            onclick="handleTitleClick(event, ${record.id})"
                            ondblclick="handleTitleDblClick(this, ${record.id})"
                            title="單擊查看詳情，雙擊直接修改標題">
                            ${record.title}
                        </h4>
                    </div>
                    
                    <div class="history-actions">
                        <button class="btn-download-history" onclick="event.stopPropagation(); downloadHistoryHTML(${record.id})" title="下載 HTML 檔案">
                            <i class="fas fa-file-code"></i>
                        </button>
                        <button class="btn-delete-history" onclick="event.stopPropagation(); deleteHistoryItem(${record.id})" title="刪除此紀錄">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                `;
                
                listContainer.appendChild(card);
            });
        };
        
    } catch (e) {
        console.error('Load history error:', e);
        listContainer.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:30px; color:#d69a92;">載入失敗</div>';
    }
}

// ==========================================
// Delete History Item
// ==========================================
async function deleteHistoryItem(id) {
    if (!confirm("確定要刪除這條紀錄嗎？\n(注意：雲端備份也會同步刪除)")) return;
    
    const s = JSON.parse(localStorage.getItem('studentProfile'));
    
    try {
        const db = await openHistoryDB();
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        
        const getReq = store.get(id);
        
        getReq.onsuccess = async function(e) {
            const record = e.target.result;
            
            store.delete(id);
            
            if (s && record && record.timestamp) {
                const cloudKey = record.timestamp.toString();
                const path = `students/${s.grade}/${s.class}/${s.name}/history/${cloudKey}`;
                
                await database.ref(path).remove();
                console.log(`Cloud key [${cloudKey}] removed`);
            }
            
            setTimeout(() => {
                if (document.getElementById('historyLevel3').style.display !== 'none' && typeof currentSubFunctionFilter !== 'undefined') {
                    const themeIndex = typeof currentThemeIndex !== 'undefined' ? currentThemeIndex : 1;
                    enterHistoryList(currentSubFunctionFilter, themeIndex);
                }
            }, 100);
        };
        
    } catch (e) {
        console.error('Delete failed:', e);
        alert('刪除失敗，請重試。');
    }
}

// ==========================================
// Clear All History
// ==========================================
async function clearAllHistory() {
    if (!confirm("確定要清空所有歷史紀錄嗎？")) return;
    
    const s = JSON.parse(localStorage.getItem('studentProfile'));
    const level3 = document.getElementById('historyLevel3');
    
    if (level3 && level3.style.display !== 'none') {
        level3.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:40px; color:#999;"><i class="fas fa-circle-notch fa-spin"></i> 正在清空...</div>';
    }
    
    try {
        const db = await openHistoryDB();
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        store.clear();
        
        if (s) {
            const path = `students/${s.grade}/${s.class}/${s.name}/history`;
            await database.ref(path).remove();
            console.log('Cloud history cleared');
        }
        
        setTimeout(() => {
            if (document.getElementById('historyLevel3').style.display !== 'none') {
                const themeIndex = typeof currentThemeIndex !== 'undefined' ? currentThemeIndex : 1;
                if (typeof currentSubFunctionFilter !== 'undefined') {
                    enterHistoryList(currentSubFunctionFilter, themeIndex);
                } else {
                    renderHistoryCategories();
                }
            } else {
                renderHistoryCategories();
            }
            alert('✅ 所有紀錄已清空');
        }, 200);
        
    } catch (e) {
        console.error('Clear error:', e);
        alert('清空失敗，請重試。');
    }
}

// ==========================================
// View History Detail
// ==========================================
async function viewHistoryDetail(id) {
    try {
        const db = await openHistoryDB();
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(id);
        
        request.onsuccess = function(event) {
            const record = event.target.result;
            if (record) {
                lastGeneratedTimestamp = record.timestamp;
                
                let themeIndex = 1;
                if (HISTORY_STRUCTURE[record.category]) {
                    const subIndex = HISTORY_STRUCTURE[record.category].indexOf(record.subFunction);
                    if (subIndex !== -1) {
                        themeIndex = (subIndex % 5) + 1;
                    }
                }
                const themeClass = `history-theme-context-${themeIndex}`;
                const colorVar = `var(--m-color-${themeIndex})`;
                
                document.getElementById('historyModalTitle').innerHTML =
                    `<i class="fas fa-book-open" style="color:${colorVar}"></i>
                     <span style="color:#333">${record.category}</span>
                     <span style="font-size:0.8em; color:#bbb; margin: 0 5px;">/</span>
                     <span style="color:${colorVar}; font-weight:bold;">${record.subFunction}</span>`;
                
                const dateElement = document.getElementById('historyModalDate');
                if (dateElement) dateElement.style.display = "none";
                
                let contentHTML = '';
                
                if (record.category !== "學習報告" && record.userContent) {
                    const rawText = record.userContent;
                    const lines = rawText.split('\n');
                    
                    let specificLayoutClass = "";
                    if (record.category === "議論" && record.subFunction === "指引") {
                        specificLayoutClass = "argument-guide-layout";
                    }
                    
                    let parsedHTML = `<div class="history-parsed-container ${themeClass} ${specificLayoutClass}">`;
                    
                    let currentLabel = '輸入內容';
                    let currentContent = [];
                    const labelRegex = /^(.{2,10}?)[：:](.*)$/;
                    
                    lines.forEach((line) => {
                        const match = line.match(labelRegex);
                        if (match) {
                            if (currentContent.length > 0) {
                                parsedHTML += `<div class="history-item-block"><div class="history-item-label">${currentLabel}</div><div class="history-item-content">${currentContent.join('\n')}</div></div>`;
                            }
                            currentLabel = match[1].trim();
                            const restOfLine = match[2].trim();
                            currentContent = restOfLine ? [restOfLine] : [];
                        } else {
                            if (line.trim() !== "") currentContent.push(line);
                        }
                    });
                    
                    if (currentContent.length > 0 || lines.length === 0) {
                        const finalContent = currentContent.length > 0 ? currentContent.join('\n') : rawText;
                        parsedHTML += `<div class="history-item-block"><div class="history-item-label">${currentLabel}</div><div class="history-item-content">${finalContent}</div></div>`;
                    }
                    parsedHTML += '</div>';
                    
                    contentHTML += `
                        <div id="edit-user-content-${record.id}"
                             ondblclick="enableHistoryEdit(this)"
                             title="雙擊即可修訂內容"
                             style="background:#fff; padding:20px; border-radius:12px; margin-bottom:25px; border:1px solid #eee; box-shadow: 0 4px 20px rgba(0,0,0,0.04);">
                            ${parsedHTML}
                        </div>`;
                }
                
                if (record.aiContent) {
                    contentHTML += `
                        <div id="edit-ai-content-${record.id}"
                             ondblclick="enableHistoryEdit(this)"
                             title="雙擊即可修訂內容"
                             class="ai-output-area"
                             style="margin-top: 15px;">
                            ${record.aiContent}
                        </div>`;
                }
                
                const s = JSON.parse(localStorage.getItem('studentProfile'));
                if (s && record.category !== "學習報告") {
                    contentHTML += `
                        <div style="margin-top: 40px; padding-top: 20px; border-top: 2px dashed #eee; text-align: right; display: flex; justify-content: flex-end; align-items: center; gap: 10px;">
                            <button class="btn-action btn-morandi"
                                    onclick="openSubmitSelector(${record.id})">
                                <i class="fas fa-paper-plane"></i> 繳交
                            </button>
                        </div>
                    `;
                }
                
                contentHTML += `
                    <button id="history-save-btn-${record.id}"
                            class="morandi-save-float-btn"
                            onclick="saveHistoryEdits(${record.id})">
                        <i class="fas fa-save"></i>
                    </button>
                `;
                
                const modalContent = document.getElementById('historyModalContent');
                modalContent.innerHTML = contentHTML;
                document.getElementById('historyModal').style.display = 'flex';
            }
        };
        
    } catch (e) {
        console.error('View detail error:', e);
    }
}

// ==========================================
// Export: Download History as HTML
// ==========================================
async function downloadHistoryHTML(id) {
    const btn = document.getElementById(`download-btn-${id}`);
    if (!btn) return;
    
    const originalContent = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    btn.disabled = true;
    
    const resetBtn = () => {
        btn.innerHTML = originalContent;
        btn.disabled = false;
    };
    
    try {
        const db = await openHistoryDB();
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(id);
        
        request.onsuccess = async function(event) {
            const record = event.target.result;
            if (!record) { 
                alert("找不到紀錄"); 
                resetBtn(); 
                return; 
            }
            
            // Create shadow container
            const shadowContainer = document.createElement('div');
            shadowContainer.style.cssText = `
                position: absolute; left: -9999px; top: 0; 
                width: 900px; background-color: #fff; 
                visibility: hidden; box-sizing: border-box;
            `;
            document.body.appendChild(shadowContainer);
            
            // Build HTML structure
            let themeIndex = 1;
            if (record.category && typeof HISTORY_STRUCTURE !== 'undefined') {
                const subIndex = HISTORY_STRUCTURE[record.category]?.indexOf(record.subFunction);
                if (subIndex !== -1 && subIndex !== undefined) themeIndex = (subIndex % 5) + 1;
            }
            const colorVar = `var(--m-color-${themeIndex})`;
            
            let contentHTML = `
                <div style="padding: 40px 40px 30px 40px; border-bottom: 1px solid #eee; margin-bottom: 20px;">
                    <h2 style="margin: 0; color: #2A9689; font-size: 28px; font-family: 'Noto Serif TC', serif; text-align: left;">
                        ${record.title}
                    </h2>
                    <div style="color: #888; font-size: 14px; margin-top: 15px; text-align: center;">
                        <span style="background-color:${colorVar}; color:white; padding: 2px 8px; border-radius: 4px; font-weight:bold;">${record.category}</span>
                        <span style="margin: 0 5px;">/</span>
                        <span>${record.subFunction}</span>
                        <span style="margin-left: 15px;">📅 ${record.dateStr}</span>
                    </div>
                </div>
                <div style="padding: 0 40px 40px 40px;">
            `;
            
            if (record.userContent) {
                contentHTML += `<div style="background:#fff; padding:25px; border-radius:12px; margin-bottom:30px; border:1px solid #e0ddd7;">${record.userContent}</div>`;
            }
            
            if (record.aiContent) {
                contentHTML += `<div class="ai-output-area">${record.aiContent}</div>`;
            }
            
            contentHTML += `</div>`;
            shadowContainer.innerHTML = contentHTML;
            
            // Extract CSS
            let cssRules = "";
            Array.from(document.querySelectorAll('style')).forEach(style => { 
                cssRules += style.innerHTML + "\n"; 
            });
            let externalLinks = "";
            Array.from(document.querySelectorAll('link[rel="stylesheet"]')).forEach(link => { 
                externalLinks += link.outerHTML + "\n"; 
            });
            
            // Build final HTML
            const finalHtmlSource = `
<!DOCTYPE html>
<html lang="zh-HK">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${record.title} - 神思紀錄</title>
    ${externalLinks}
    <style>
        ${cssRules}
        body { 
            max-width: 100% !important; 
            width: 100% !important;
            margin: 0 !important;
            padding: 40px 0 !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            background-color: #f2f4f7 !important;
            min-height: 100vh !important;
        }
        .export-wrapper {
            width: 900px !important;
            max-width: 95% !important;
            background-color: #ffffff !important;
            box-shadow: 0 10px 40px rgba(0,0,0,0.08) !important;
            border-radius: 12px !important;
            overflow: hidden !important;
        }
        button { display: none !important; }
    </style>
</head>
<body>
    <div class="export-wrapper">
        ${shadowContainer.innerHTML}
    </div>
    <div style="text-align: center; color: #aaa; font-size: 12px; margin-top: 30px;">
        Generated by 神思 SANSI AI System
    </div>
</body>
</html>`;
            
            // Download
            document.body.removeChild(shadowContainer);
            
            const blob = new Blob([finalHtmlSource], { type: 'text/html;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            
            const safeTitle = record.title.replace(/[\\/:*?"<>|]/g, '_').substring(0, 15);
            const dateSuffix = new Date().toISOString().slice(0, 10);
            a.href = url;
            a.download = `神思紀錄_${safeTitle}_${dateSuffix}.html`;
            
            document.body.appendChild(a);
            a.click();
            
            setTimeout(() => {
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
                resetBtn();
            }, 100);
        };
        
        request.onerror = function() { 
            alert("讀取紀錄失敗"); 
            resetBtn(); 
        };
        
    } catch (e) {
        console.error('Download error:', e);
        alert('下載失敗，請重試');
        resetBtn();
    }
}

// ==========================================
// Update History Chat
// ==========================================
async function updateHistoryChat() {
    if (!lastGeneratedTimestamp) {
        console.warn('No timestamp set');
        return;
    }
    
    try {
        const db = await openHistoryDB();
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const index = store.index('timestamp');
        const request = index.get(lastGeneratedTimestamp);
        
        request.onsuccess = async function(e) {
            const record = e.target.result;
            if (record) {
                const chatContainer = document.getElementById('canvas-chat-history');
                if (chatContainer) {
                    record.aiContent = chatContainer.innerHTML;
                }
                
                if (record.id) {
                    const updateTx = db.transaction([STORE_NAME], 'readwrite');
                    const updateStore = updateTx.objectStore(STORE_NAME);
                    updateStore.put(record);
                    
                    // Cloud sync
                    const s = JSON.parse(localStorage.getItem('studentProfile'));
                    if (s) {
                        const cloudKey = record.timestamp.toString();
                        const path = `students/${s.grade}/${s.class}/${s.name}/history/${cloudKey}`;
                        await database.ref(path).update({ aiContent: record.aiContent });
                    }
                }
            }
        };
        
    } catch (e) {
        console.error('Update chat error:', e);
    }
}

// Export functions for global access
if (typeof window !== 'undefined') {
    window.openHistoryContainer = openHistoryContainer;
    window.renderHistoryCategories = renderHistoryCategories;
    window.enterHistoryCategory = enterHistoryCategory;
    window.enterHistoryList = enterHistoryList;
    window.viewHistoryDetail = viewHistoryDetail;
    window.deleteHistoryItem = deleteHistoryItem;
    window.clearAllHistory = clearAllHistory;
    window.downloadHistoryHTML = downloadHistoryHTML;
    window.saveToHistory = saveToHistory;
    window.smartSyncHistory = smartSyncHistory;
    window.updateHistoryChat = updateHistoryChat;
    window.openHistoryDB = openHistoryDB;
}

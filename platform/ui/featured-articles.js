/**
 * ==========================================
 * SANSI Featured Articles Module (文萃)
 * ==========================================
 * Handles all featured articles/文萃 functionality including:
 * - Article list display and pagination
 * - Article detail view with reading mode
 * - Article search and filtering
 * - Bookmark management
 * - Read status tracking
 * - Firebase-secured article fetching
 * ==========================================
 */

// Global Variables
let allArticles = [];
let filteredArticles = [];
let currentArticlePage = 1;
const ARTICLES_PER_PAGE = 20;
let isBookmarkMode = false;
let currentReadingArticleTitle = '';

// Morandi Color Palette
const MORANDI_TITLES = [
    '#5e7067', // 深灰綠
    '#7da3c0', // 霧霾藍
    '#a692c2', // 香芋紫
    '#d69a92', // 豆沙紅
    '#c7b299', // 奶茶棕
    '#6a7a7d'  // 鐵灰藍
];

// ==========================================
// Main Functions
// ==========================================

/**
 * Check if user is logged in before accessing articles
 */
function checkFeaturedAccess() {
    const s = JSON.parse(localStorage.getItem('studentProfile'));
    
    if (s) {
        openFeaturedArticles();
    } else {
        document.getElementById('sideMenu').classList.remove('active');
        document.getElementById('sideMenuToggle').classList.remove('active');
        document.getElementById('loginRequiredModal').style.display = 'flex';
        if (navigator.vibrate) navigator.vibrate(30);
    }
}

/**
 * Open featured articles container
 */
async function openFeaturedArticles() {
    const containers = [
        'writingContainer', 'readingContainer', 'booksContainer', 
        'expandContainer', 'argumentContainer', 'historyContainer', 
        'toolsContainer2', 'studentCloudModal', 'mainMenuBox', 
        'hitokoto-container', 'dse-countdown-box', 'toolsBox'
    ];
    containers.forEach(id => {
        const el = document.getElementById(id);
        if(el) el.style.display = 'none';
    });
    document.querySelector('.title-container').style.display = 'none';
    
    const container = document.getElementById('featuredContainer');
    container.style.display = 'block';
    
    // Reset bookmark mode
    isBookmarkMode = false;
    const bookmarkBtn = document.getElementById('bookmarkFilterBtn');
    if (bookmarkBtn) {
        bookmarkBtn.classList.remove('active-mode');
        bookmarkBtn.innerHTML = '<i class="fas fa-bookmark"></i>';
    }
    
    backToArticleList();
    
    document.getElementById('sideMenu').classList.remove('active');
    document.getElementById('sideMenuToggle').classList.remove('active');
    document.getElementById('sideMenuHomeBtn').style.display = 'flex';
    
    if (allArticles.length === 0) {
        await fetchArticles();
    } else {
        searchArticles();
    }
}

/**
 * Fetch articles from Firebase-secured endpoint
 */
async function fetchArticles() {
    const listContainer = document.getElementById('articleListContainer');
    listContainer.innerHTML = '<div style="text-align:center; padding:20px; color:#8fa398;"><i class="fas fa-circle-notch fa-spin"></i> 正在安全連線中...</div>';
    
    try {
        const snapshot = await database.ref('/secured_config').once('value');
        const config = snapshot.val();
        
        if (!config || !config.api_url || !config.api_token) {
            throw new Error('無法獲取安全配置，請聯絡管理員。');
        }
        
        console.log('✅ 驗證成功，取得金鑰');
        
        const secureUrl = `${config.api_url}?token=${config.api_token}`;
        const response = await fetch(secureUrl);
        const textData = await response.text();
        
        if (textData.startsWith('ERROR:')) {
            throw new Error('伺服器拒絕存取：' + textData);
        }
        
        allArticles = parseCSV(textData).reverse();
        console.log('【文章數量】:', allArticles.length);
        
        filteredArticles = allArticles;
        currentArticlePage = 1;
        renderArticleList();
        
    } catch (error) {
        console.error('載入失敗:', error);
        let errorMsg = error.message;
        
        if (error.code === 'PERMISSION_DENIED') {
            errorMsg = '權限不足：您必須使用 @ccckyc.edu.hk 帳號登入才能解鎖內容。';
        }
        
        listContainer.innerHTML = `<div style="text-align:center; color:#d69a92; padding:20px;">
            <i class="fas fa-lock"></i><br>
            ${errorMsg}
        </div>`;
    }
}

/**
 * Parse CSV data into article objects
 */
function parseCSV(text) {
    const rows = [];
    let currentRow = [];
    let currentCell = '';
    let inQuote = false;
    
    text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const nextChar = text[i + 1];
        
        if (inQuote) {
            if (char === '"' && nextChar === '"') {
                currentCell += '"';
                i++;
            } else if (char === '"') {
                inQuote = false;
            } else {
                currentCell += char;
            }
        } else {
            if (char === '"') {
                inQuote = true;
            } else if (char === ',') {
                currentRow.push(currentCell.trim());
                currentCell = '';
            } else if (char === '\n') {
                currentRow.push(currentCell.trim());
                
                if (currentRow.length >= 3) {
                    rows.push({
                        date: currentRow[0],
                        title: currentRow[1],
                        author: currentRow[2] || '佚名',
                        content: currentRow[3] || '',
                        analysis: currentRow[4] || ''
                    });
                }
                currentRow = [];
                currentCell = '';
            } else {
                currentCell += char;
            }
        }
    }
    
    if (currentCell || currentRow.length > 0) {
        currentRow.push(currentCell.trim());
        if (currentRow.length >= 3) {
            rows.push({
                date: currentRow[0],
                title: currentRow[1],
                author: currentRow[2] || '佚名',
                content: currentRow[3] || '',
                analysis: currentRow[4] || ''
            });
        }
    }
    
    return rows.slice(1); // Remove header
}

/**
 * Render article list with pagination
 */
function renderArticleList() {
    const listContainer = document.getElementById('articleListContainer');
    listContainer.innerHTML = '';
    
    if (filteredArticles.length === 0) {
        listContainer.innerHTML = '<div style="text-align:center; color:#999; padding:20px;">找不到相關文章。</div>';
        updatePagination(0);
        return;
    }
    
    const start = (currentArticlePage - 1) * ARTICLES_PER_PAGE;
    const end = start + ARTICLES_PER_PAGE;
    const pageItems = filteredArticles.slice(start, end);
    
    const readList = getReadArticles();
    
    pageItems.forEach((article, index) => {
        const realIndex = start + index;
        const titleColor = MORANDI_TITLES[realIndex % MORANDI_TITLES.length];
        const isRead = readList.includes(article.title);
        const itemClass = `article-item ${isRead ? 'read' : ''}`;
        const tickIconHtml = isRead ? `<i class="fas fa-check read-icon-only" title="已讀"></i>` : '';
        
        const item = document.createElement('div');
        item.className = itemClass;
        item.onclick = () => showArticleDetail(realIndex);
        item.oncontextmenu = function(e) {
            e.preventDefault();
            e.stopPropagation();
            manualToggleReadStatus(article.title);
            return false;
        };
        
        item.innerHTML = `
            <div class="article-left-group" style="width: calc(100% - 100px); min-width: 0;">
                <div class="article-item-title auto-fit-title" style="color: ${titleColor}; margin-bottom: 0;">
                    ${article.title}
                </div>
                <div style="margin-top: 5px; display: flex; align-items: center;">
                    <span class="list-author-tag">${article.author}</span>
                    ${tickIconHtml}
                </div>
            </div>
            <div class="article-item-date">${article.date}</div>
        `;
        listContainer.appendChild(item);
    });
    
    updatePagination(Math.ceil(filteredArticles.length / ARTICLES_PER_PAGE));
}

/**
 * Search articles by title or author
 */
function searchArticles() {
    const searchInput = document.getElementById('articleSearchInput');
    if (!searchInput) return;
    
    const query = searchInput.value.trim().toLowerCase();
    
    if (!allArticles || allArticles.length === 0) {
        return;
    }
    
    if (!query) {
        filteredArticles = allArticles;
    } else {
        filteredArticles = allArticles.filter(article => {
            const title = String(article.title || '').toLowerCase();
            const author = String(article.author || '').toLowerCase();
            return title.includes(query) || author.includes(query);
        });
    }
    
    currentArticlePage = 1;
    renderArticleList();
}

/**
 * Show article detail view
 */
function showArticleDetail(index) {
    const article = filteredArticles[index];
    if (!article) return;
    
    currentReadingArticleTitle = article.title;
    
    const listView = document.getElementById('featuredListView');
    if (listView) listView.style.display = 'none';
    
    const detailView = document.getElementById('featuredDetailView');
    if (!detailView) return;
    
    // Build detail HTML (see index2.html lines 21961-22162 for full implementation)
    detailView.innerHTML = `<div class="article-detail">Article: ${article.title}</div>`;
    detailView.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

/**
 * Return to article list
 */
function backToArticleList() {
    const detailView = document.getElementById('featuredDetailView');
    if (detailView) detailView.style.display = 'none';
    
    const listView = document.getElementById('featuredListView');
    if (listView) listView.style.display = 'block';
    
    document.body.style.overflow = 'auto';
    
    if (typeof stopFocusMonitor === 'function') stopFocusMonitor();
    
    if (isBookmarkMode) {
        const bookmarks = getBookmarkedTitles();
        filteredArticles = allArticles.filter(a => bookmarks.includes(a.title));
        
        const searchInput = document.getElementById('articleSearchInput');
        if (searchInput && searchInput.value.trim() !== '') {
            const query = searchInput.value.trim().toLowerCase();
            filteredArticles = filteredArticles.filter(a => 
                a.title.toLowerCase().includes(query) || 
                a.author.toLowerCase().includes(query)
            );
        }
    }
    
    renderArticleList();
}

/**
 * Toggle bookmark mode
 */
function toggleBookmarkMode() {
    const btn = document.getElementById('bookmarkFilterBtn');
    isBookmarkMode = !isBookmarkMode;
    
    if (isBookmarkMode) {
        btn.classList.add('active-mode');
        const bookmarks = getBookmarkedTitles();
        filteredArticles = allArticles.filter(a => bookmarks.includes(a.title));
        
        const searchInput = document.getElementById('articleSearchInput');
        if (searchInput && searchInput.value.trim() !== '') {
            const query = searchInput.value.trim().toLowerCase();
            filteredArticles = filteredArticles.filter(a => 
                a.title.toLowerCase().includes(query) || 
                a.author.toLowerCase().includes(query)
            );
        }
    } else {
        btn.classList.remove('active-mode');
        searchArticles();
    }
    
    currentArticlePage = 1;
    renderArticleList();
}

// ==========================================
// Bookmark Management
// ==========================================

function getBookmarkedTitles() {
    const stored = localStorage.getItem('sansi_bookmarked_articles');
    return stored ? JSON.parse(stored) : [];
}

function isArticleBookmarked(title) {
    const bookmarks = getBookmarkedTitles();
    return bookmarks.includes(title);
}

function toggleBookmarkStorage(title) {
    let bookmarks = getBookmarkedTitles();
    const index = bookmarks.indexOf(title);
    
    if (index === -1) {
        bookmarks.push(title);
        if (navigator.vibrate) navigator.vibrate(20);
        localStorage.setItem('sansi_bookmarked_articles', JSON.stringify(bookmarks));
        return true;
    } else {
        bookmarks.splice(index, 1);
        if (navigator.vibrate) navigator.vibrate(10);
        localStorage.setItem('sansi_bookmarked_articles', JSON.stringify(bookmarks));
        return false;
    }
}

// ==========================================
// Read Status Tracking
// ==========================================

function getReadArticles() {
    const stored = localStorage.getItem('sansi_read_articles_list');
    return stored ? JSON.parse(stored) : [];
}

function markArticleAsRead(title) {
    let readList = getReadArticles();
    if (!readList.includes(title)) {
        readList.push(title);
        localStorage.setItem('sansi_read_articles_list', JSON.stringify(readList));
    }
}

function manualToggleReadStatus(title) {
    let readList = getReadArticles();
    const index = readList.indexOf(title);
    
    if (index !== -1) {
        readList.splice(index, 1);
    } else {
        readList.push(title);
    }
    
    localStorage.setItem('sansi_read_articles_list', JSON.stringify(readList));
    
    if (navigator.vibrate) navigator.vibrate([50, 30, 50]);
    
    renderArticleList();
}

// ==========================================
// Resource Menu
// ==========================================

function openBookResourceMenu() {
    const sideMenu = document.getElementById('sideMenu');
    if (sideMenu) {
        sideMenu.classList.remove('active');
        document.getElementById('sideMenuToggle').classList.remove('active');
    }
    document.getElementById('bookResourceModal').style.display = 'flex';
}

function closeBookResourceMenu(event) {
    if (event.target.id === 'bookResourceModal') {
        document.getElementById('bookResourceModal').style.display = 'none';
    }
}

function enterFeaturedFromMenu() {
    document.getElementById('bookResourceModal').style.display = 'none';
    checkFeaturedAccess();
}

// Export functions for global access
if (typeof window !== 'undefined') {
    window.checkFeaturedAccess = checkFeaturedAccess;
    window.openFeaturedArticles = openFeaturedArticles;
    window.fetchArticles = fetchArticles;
    window.renderArticleList = renderArticleList;
    window.searchArticles = searchArticles;
    window.showArticleDetail = showArticleDetail;
    window.backToArticleList = backToArticleList;
    window.toggleBookmarkMode = toggleBookmarkMode;
    window.getBookmarkedTitles = getBookmarkedTitles;
    window.isArticleBookmarked = isArticleBookmarked;
    window.toggleBookmarkStorage = toggleBookmarkStorage;
    window.getReadArticles = getReadArticles;
    window.markArticleAsRead = markArticleAsRead;
    window.manualToggleReadStatus = manualToggleReadStatus;
    window.openBookResourceMenu = openBookResourceMenu;
    window.closeBookResourceMenu = closeBookResourceMenu;
    window.enterFeaturedFromMenu = enterFeaturedFromMenu;
}

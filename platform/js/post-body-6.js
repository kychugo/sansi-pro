// Post-Body Scripts 6




let allArticles = [];       // 儲存所有文章
let filteredArticles = [];  // 儲存搜尋後的文章
let currentArticlePage = 1;
const ARTICLES_PER_PAGE = 10;


// 1. 全域變數
let isBookmarkMode = false;

// 2. 基礎存取功能
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
    
    // 如果不在清單中 -> 加入 (return true 代表現在是收藏狀態)
    if (index === -1) {
        bookmarks.push(title);
        if (navigator.vibrate) navigator.vibrate(20); // 輕微震動
        localStorage.setItem('sansi_bookmarked_articles', JSON.stringify(bookmarks));
        return true; 
    } 
    // 如果已在清單中 -> 移除 (return false 代表現在是未收藏狀態)
    else {
        bookmarks.splice(index, 1);
        if (navigator.vibrate) navigator.vibrate(10);
        localStorage.setItem('sansi_bookmarked_articles', JSON.stringify(bookmarks));
        return false;
    }
}


// === [新增] 檢查登入狀態才能進入文萃 ===
function checkFeaturedAccess() {
    // 檢查是否有學生資料
    const s = JSON.parse(localStorage.getItem('studentProfile'));
    
    if (s) {
        // 已登入，正常開啟
        openFeaturedArticles();
    } else {
        // 未登入，顯示莫蘭迪風格提示窗
        // 收起側邊選單
        document.getElementById('sideMenu').classList.remove('active');
        document.getElementById('sideMenuToggle').classList.remove('active');
        
        // 顯示提示
        document.getElementById('loginRequiredModal').style.display = 'flex';
        if (navigator.vibrate) navigator.vibrate(30); // 輕微震動回饋
    }
}



	// 1. 打開精選文章頁面 (修訂版：重置書籤模式)
async function openFeaturedArticles() {
    // 隱藏其他容器
    const containers = ['writingContainer', 'readingContainer', 'booksContainer', 'expandContainer', 'argumentContainer', 'historyContainer', 'toolsContainer2', 'studentCloudModal', 'mainMenuBox', 'hitokoto-container', 'dse-countdown-box', 'toolsBox'];
    containers.forEach(id => {
        const el = document.getElementById(id);
        if(el) el.style.display = 'none';
    });
    document.querySelector('.title-container').style.display = 'none';
    
    // 顯示本容器
    const container = document.getElementById('featuredContainer');
    container.style.display = 'block';
    
    // 重置書籤模式為關閉
    isBookmarkMode = false;
    const bookmarkBtn = document.getElementById('bookmarkFilterBtn');
    if (bookmarkBtn) {
        bookmarkBtn.classList.remove('active-mode');
        bookmarkBtn.innerHTML = '<i class="fas fa-bookmark"></i>'; // 實心圖示但灰色
    }

    // 恢復列表視圖
    backToArticleList();
    
    // 收起側邊欄
    document.getElementById('sideMenu').classList.remove('active');
    document.getElementById('sideMenuToggle').classList.remove('active');
    
    // 顯示返回主頁按鈕
    document.getElementById('sideMenuHomeBtn').style.display = 'flex';

    // 載入資料 (如果尚未載入)
    if (allArticles.length === 0) {
        await fetchArticles();
    } else {
        // 如果已有資料，確保顯示全部文章
        searchArticles(); 
    }
}


// 3. 主頁列表：切換「只看書籤」模式
function toggleBookmarkMode() {
    const btn = document.getElementById('bookmarkFilterBtn');
    isBookmarkMode = !isBookmarkMode; // 切換開關

    if (isBookmarkMode) {
        // --- 點亮按鈕 (琥珀色) ---
        btn.classList.add('active-mode');
        
        // 執行篩選：只顯示已收藏的文章
        const bookmarks = getBookmarkedTitles();
        
        // 為了讓搜尋功能和書籤過濾能共存，我們基於 allArticles 進行過濾
        filteredArticles = allArticles.filter(a => bookmarks.includes(a.title));
        
        // 如果同時有搜尋文字，再疊加搜尋條件
        const searchInput = document.getElementById('articleSearchInput');
        if (searchInput && searchInput.value.trim() !== "") {
            const query = searchInput.value.trim().toLowerCase();
            filteredArticles = filteredArticles.filter(a => 
                a.title.toLowerCase().includes(query) || 
                a.author.toLowerCase().includes(query)
            );
        }
    } else {
        // --- 熄滅按鈕 (變回原色) ---
        btn.classList.remove('active-mode');
        
        // 恢復正常顯示 (執行一次搜尋邏輯即可重置 filteredArticles)
        searchArticles(); 
    }

    // 重置頁碼並重新渲染列表
    currentArticlePage = 1;
    renderArticleList();
}

// 注意：請確保你已經引入了 Firebase SDK 並執行了 firebase.initializeApp()
// 這段程式碼應該放在 firebase.auth().onAuthStateChanged 監聽器內，或確認使用者已登入後執行
 
// ✅【請貼上這一段 (Firebase 安全版)】✅
 
// 2. 從 Firebase 獲取安全連結並下載資料
async function fetchArticles() {
    const listContainer = document.getElementById('articleListContainer');
    listContainer.innerHTML = '<div style="text-align:center; padding:20px; color:#8fa398;"><i class="fas fa-circle-notch fa-spin"></i> 正在安全連線中...</div>';
 
    try {
        // 1. 從 Firebase 獲取「API 網址」和「通關密碼」
        // (只有 @ccckyc 登入者才能讀取這一步)
        const snapshot = await database.ref('/secured_config').once('value');
        const config = snapshot.val();
 
        if (!config || !config.api_url || !config.api_token) {
            throw new Error("無法獲取安全配置，請聯絡管理員。");
        }
 
        console.log("✅ 驗證成功，取得金鑰");
 
        // 2. 組合帶密碼的網址
        // 格式： 網址 + ?token=密碼
        const secureUrl = `${config.api_url}?token=${config.api_token}`;
 
        // 3. 發送請求 (GAS 設為 Anyone，所以這裡不會有 CORS 錯誤)
        const response = await fetch(secureUrl);
        const textData = await response.text();
 
        // 4. 檢查 GAS 是否回傳了錯誤訊息
        if (textData.startsWith("ERROR:")) {
            throw new Error("伺服器拒絕存取：" + textData);
        }
 
        // 5. 解析 CSV
        allArticles = parseCSV(textData).reverse();
        console.log("【文章數量】:", allArticles.length);
 
        filteredArticles = allArticles;
        currentArticlePage = 1;
        renderArticleList();
 
    } catch (error) {
        console.error("載入失敗:", error);
        let errorMsg = error.message;
        
        if (error.code === 'PERMISSION_DENIED') {
             errorMsg = "權限不足：您必須使用 @ccckyc.edu.hk 帳號登入才能解鎖內容。";
        }
 
        listContainer.innerHTML = `<div style="text-align:center; color:#d69a92; padding:20px;">
            <i class="fas fa-lock"></i><br>
            ${errorMsg}
        </div>`;
    }
}
 
/**
* (範例) 簡單的 CSV 解析與顯示函數
* 請替換成你原本專案裡的邏輯
*/
function parseAndDisplayCSV(text) {
  // 這裡放你原本處理 CSV 轉 JSON 或 HTML 的代碼
  // 例如 PapaParse 或者你自己寫的 split 邏輯
  console.log("CSV 內容預覽:", text.substring(0, 100));
  
  // 範例：簡單顯示在 console
  // 你應該把這裡接回你的 UI 渲染函數 (例如 renderFeaturedArticles)
}

	
// 3. 修正版 CSV 解析器 (新增讀取第 5 欄：賞析)
function parseCSV(text) {
    const rows = [];
    let currentRow = [];
    let currentCell = '';
    let inQuote = false;

    // 統一換行符號
    text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const nextChar = text[i + 1];

        if (inQuote) {
            if (char === '"' && nextChar === '"') {
                currentCell += '"';
                i++; // 跳過下一個引號
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
                
                // ★★★ 修改處：新增讀取第 5 欄 (Index 4) 為賞析 ★★★
                if (currentRow.length >= 3) {
                    rows.push({
                        date: currentRow[0],        // 第一欄：日期
                        title: currentRow[1],       // 第二欄：標題
                        author: currentRow[2] || '佚名', // 第三欄：作者
                        content: currentRow[3] || '',    // 第四欄：正文
                        analysis: currentRow[4] || ''    // 第五欄：賞析 (新增)
                    });
                }
                currentRow = [];
                currentCell = '';
            } else {
                currentCell += char;
            }
        }
    }

    // 處理最後一行
    if (currentCell || currentRow.length > 0) {
        currentRow.push(currentCell.trim());
        if (currentRow.length >= 3) {
            rows.push({
                date: currentRow[0],
                title: currentRow[1],
                author: currentRow[2] || '佚名',
                content: currentRow[3] || '',
                analysis: currentRow[4] || '' // 確保最後一行也讀取
            });
        }
    }

    // 移除標題列 (Header)
    return rows.slice(1);
}

// === 莫蘭迪色系定義 (用於標題輪替) ===
const MORANDI_TITLES = [
    '#5e7067', // 深灰綠
    '#7da3c0', // 霧霾藍
    '#a692c2', // 香芋紫
    '#d69a92', // 豆沙紅
    '#c7b299', // 奶茶棕
    '#6a7a7d'  // 鐵灰藍
];

// 4. 渲染文章列表 (視覺化已讀版 - 背景變色 + 純勾號)
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
 
    // 獲取最新的已讀列表
    const readList = getReadArticles();
 
    pageItems.forEach((article, index) => {
        const realIndex = start + index;
        const titleColor = MORANDI_TITLES[realIndex % MORANDI_TITLES.length];
        
        // ★★★ 檢查是否已讀 ★★★
        const isRead = readList.includes(article.title);
        
        // 1. 如果已讀，加入 'read' class (這會觸發 CSS 變更背景色)
        const itemClass = `article-item ${isRead ? 'read' : ''}`;
        
        // 2. 如果已讀，只顯示勾號圖示，不顯示文字
        const tickIconHtml = isRead
            ? `<i class="fas fa-check read-icon-only" title="已讀"></i>`
            : '';
 
        const item = document.createElement('div');
        item.className = itemClass;
        item.onclick = () => showArticleDetail(realIndex);

		// ★★★ 新增：右鍵/長按 切換已讀狀態 ★★★
item.oncontextmenu = function(e) {
    e.preventDefault(); // 阻止瀏覽器預設選單
    e.stopPropagation();
    manualToggleReadStatus(article.title);
    return false;
};
        
        // 注意：padding-left 在 CSS 中針對 .read 有額外 border-left 設定
        item.innerHTML = `
            <div class="article-left-group" style="width: calc(100% - 100px); min-width: 0;">
                <div class="article-item-title auto-fit-title" style="color: ${titleColor}; margin-bottom: 0;">
                    ${article.title}
                </div>
                
                <div style="margin-top: 5px; display: flex; align-items: center;">
                    <span class="list-author-tag">
                        ${article.author}
                    </span>
                    
                    <!-- ★★★ 插入純勾號 ★★★ -->
                    ${tickIconHtml}
                </div>
            </div>
 
            <div class="article-item-date">
                ${article.date}
            </div>
        `;
        listContainer.appendChild(item);
    });
 
    updatePagination(Math.ceil(filteredArticles.length / ARTICLES_PER_PAGE));
 
    setTimeout(() => {
        const titles = document.querySelectorAll('#articleListContainer .auto-fit-title');
        titles.forEach(el => {
            fitTextToContainer(el, 16, 22);
        });
    }, 50);
}



	// 1. 切換已讀狀態的邏輯函式
function manualToggleReadStatus(title) {
    let readList = getReadArticles();
    const index = readList.indexOf(title);
    
    let msg = "";
    if (index !== -1) {
        // 已讀 -> 未讀 (移除)
        readList.splice(index, 1);
        msg = "已標記為未讀";
    } else {
        // 未讀 -> 已讀 (加入)
        readList.push(title);
        msg = "已標記為已讀";
    }
    
    localStorage.setItem('sansi_read_articles_list', JSON.stringify(readList));
    
// 觸發震動回饋
    if (navigator.vibrate) navigator.vibrate([50, 30, 50]);
    
    // 顯示一個極短的提示 (使用您現有的 Alert 系統)
    // alert(msg);  <-- 將此行刪除或註解掉即可取消彈窗
    
    // 重新渲染列表以更新顏色和勾號
    renderArticleList();
}


// === [新增] 觸發頁碼輸入模式 ===
function triggerPageJump() {
    const indicator = document.getElementById('pageIndicator');
    const totalPages = Math.ceil(filteredArticles.length / ARTICLES_PER_PAGE) || 1;
    
    // 避免重複點擊生成多個輸入框
    if (indicator.querySelector('input')) return;

    // 暫存目前的顯示文字，以便取消時恢復
    const originalText = indicator.innerText;

    // 替換為輸入框
    indicator.innerHTML = `<input type="number" id="jumpInput" class="page-jump-input" min="1" max="${totalPages}" value="${currentArticlePage}"> <span style="font-size:0.9em; color:#aaa;">/ ${totalPages}</span>`;
    
    const input = document.getElementById('jumpInput');
    input.focus();
    input.select(); // 自動全選數字，方便直接輸入

    // 綁定事件：按下 Enter 跳轉，失去焦點(Blur) 則取消
    input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            executePageJump(this.value, totalPages);
        } else if (e.key === 'Escape') {
            indicator.innerText = originalText; // 取消
        }
    });

    // 失去焦點時自動恢復原狀 (延遲一點點以免與 Enter 衝突)
    input.addEventListener('blur', function() {
        setTimeout(() => {
            // 如果還沒跳轉 (頁面沒刷新)，就恢復文字
            if (document.getElementById('jumpInput')) {
                indicator.innerText = originalText;
            }
        }, 100);
    });
}


/**
 * === [新增] 頁面切換視覺控制器 ===
 * @param {Function} updateLogic - 實際更新頁碼的邏輯函式
 */
async function performPageTransition(updateLogic) {
    const listContainer = document.getElementById('articleListContainer');
    const containerTop = document.getElementById('featuredContainer');

    // 1. 【退場】列表淡出並下沉
    listContainer.classList.add('list-fade-out');

    // 2. 等待退場動畫完成 (300ms)
    await new Promise(resolve => setTimeout(resolve, 300));

    // 3. 【滾動】平滑滾動回頂部 (趁畫面空白時滾動，體驗最好)
    if (containerTop) {
        containerTop.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // 4. 【顯示 Loading】清空列表並顯示轉圈圈 (給予視覺回饋)
    listContainer.innerHTML = `
        <div class="pagination-loading">
            <i class="fas fa-circle-notch pagination-spinner"></i>
            <span>正在翻頁...</span>
        </div>
    `;
    
    // 5. 【執行邏輯】更新頁碼變數 (這是傳入的 callback)
    updateLogic();

    // 6. 【延遲渲染】給予一點點 "思考時間" (400ms)，讓使用者看清楚轉圈，增加儀式感
    setTimeout(() => {
        // 渲染新列表 (這會覆蓋掉 Loading)
        renderArticleList();

        // 7. 【進場】移除退場 class，觸發 CSS transition 回復原狀
        // 強制瀏覽器重繪 (Reflow) 以確保動畫觸發
        void listContainer.offsetWidth; 
        
        listContainer.classList.remove('list-fade-out');
    }, 400);
}

// ==========================================
// === 下方是您原本的函式，請用這些新版本替換 ===
// ==========================================

// 6. 換頁邏輯 (更新版：加入視覺過渡)
function changeArticlePage(delta) {
    performPageTransition(() => {
        currentArticlePage += delta;
    });
}

// [新增] 一鍵回到第 1 頁 (更新版：加入視覺過渡)
function goToFirstPage() {
    if (currentArticlePage === 1) return;
    
    performPageTransition(() => {
        currentArticlePage = 1;
    });
}

// [新增] 執行跳轉邏輯 (更新版：加入視覺過渡)
function executePageJump(val, maxPage) {
    let pageNum = parseInt(val);
    
    if (isNaN(pageNum)) return; 
    if (pageNum < 1) pageNum = 1;
    if (pageNum > maxPage) pageNum = maxPage;

    if (pageNum !== currentArticlePage) {
        performPageTransition(() => {
            currentArticlePage = pageNum;
        });
    } else {
        // 如果頁碼沒變，只恢復文字顯示，不執行動畫
        updatePagination(maxPage);
    }
}

	
	
// [修訂版] 更新分頁按鈕狀態 (控制回首頁按鈕的顯示)
function updatePagination(totalPages) {
    const indicator = document.getElementById('pageIndicator');
    if (indicator) {
        indicator.innerText = `${currentArticlePage} / ${totalPages || 1}`;
    }

    document.getElementById('prevPageBtn').disabled = (currentArticlePage <= 1);
    document.getElementById('nextPageBtn').disabled = (currentArticlePage >= totalPages || totalPages === 0);

    // ★★★ 新增控制：只有當頁數 > 1 時，才顯示「回首頁」按鈕 ★★★
    const firstPageBtn = document.getElementById('firstPageBtn');
    if (firstPageBtn) {
        if (currentArticlePage > 1) {
            firstPageBtn.style.display = 'inline-flex'; // 顯示雙箭頭
            // 加入淡入動畫
            firstPageBtn.style.opacity = '0';
            setTimeout(() => firstPageBtn.style.opacity = '0.7', 10);
        } else {
            firstPageBtn.style.display = 'none'; // 隱藏
        }
    }
}



// 7. 搜尋邏輯 (修訂：同時搜尋標題與作者)
// 7. 搜尋邏輯 (修訂：防止彈窗干擾 + 同時搜尋標題與作者)
function searchArticles() {
    // 1. 獲取輸入框
    const searchInput = document.getElementById('articleSearchInput');
    if (!searchInput) return;

    // 2. 獲取輸入值 (轉小寫)
    const query = searchInput.value.trim().toLowerCase();
    
    // 3. 確保有資料可搜
    if (!allArticles || allArticles.length === 0) {
        return;
    }

    // 4. 執行搜尋
    if (!query) {
        // 如果清空了搜尋框，顯示全部
        filteredArticles = allArticles;
    } else {
        // 同時比對標題 OR 作者
        filteredArticles = allArticles.filter(article => {
            const title = String(article.title || "").toLowerCase();
            const author = String(article.author || "").toLowerCase();
            
            // 只要標題或作者其中一個包含關鍵字，就保留
            return title.includes(query) || author.includes(query);
        });
    }
    
    // 5. 重置回第一頁並渲染
    currentArticlePage = 1; 
    renderArticleList();
}


// 4. 詳情頁：處理點擊書籤按鈕
function handleDetailBookmarkClick(encodedTitle) {
    const title = decodeURIComponent(encodedTitle);
    
    // 執行存取動作，並獲取最新狀態 (true=已收藏, false=未收藏)
    const isNowBookmarked = toggleBookmarkStorage(title);
    
    const btn = document.getElementById('detailBookmarkBtn');
    // 如果是實心圖示，切換 class 即可；如果是 FontAwesome 5，建議保持 fas fa-bookmark
    const icon = btn.querySelector('i'); 
    
    if (isNowBookmarked) {
        // --- 點亮 (變琥珀色實心) ---
        btn.classList.add('bookmarked');
        // 加入一個輕微的彈跳動畫效果
        btn.style.transform = "scale(1.2)";
        setTimeout(() => btn.style.transform = "scale(1.1)", 200);
    } else {
        // --- 熄滅 (變回半透明白色) ---
        btn.classList.remove('bookmarked');
        btn.style.transform = "scale(1)";
    }
}



// === [更新] 懸空落款動畫邏輯 (含蓋章音效 + 消失效果) ===
function toggleFeaturedChat() {
    const btn = document.getElementById('showFeaturedChatBtn');
    const chatArea = document.getElementById('featuredChatArea');
    const toggleContainer = document.getElementById('chatToggleButtonContainer');
    const hintText = toggleContainer.querySelector('div');
    
    if (btn && chatArea && toggleContainer) {
        
        // --- 0. 播放落款音效 ---
        const stampSound = new Audio('落款.mp3');
        stampSound.volume = 1.0; 
        // 嘗試播放 (使用者有點擊動作，通常不會被瀏覽器阻擋)
        stampSound.play().catch(e => console.log("音效播放失敗 (請檢查 CSP 設定):", e));

        // 1. 隱藏下方的提示文字
        if(hintText) hintText.style.opacity = '0';

        // 2. 初始化按鈕狀態 (準備落下)
        btn.style.transition = 'none'; 
        btn.style.opacity = '0'; // 先隱藏，配合 keyframe 的起始狀態
        
        // 3. 執行「落款」動畫
        setTimeout(() => {
            // 套用 CSS 動畫 (0.5秒完成)
            btn.style.animation = 'stamp-slam 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards';
            
            // 同步改變樣式：變成實心紅底
            btn.style.backgroundColor = '#d69a92';
            btn.style.color = '#fff';
            btn.style.borderColor = '#d69a92';
            btn.style.boxShadow = '0 0 0 2px rgba(255,255,255,0.3), 0 0 15px rgba(214, 154, 146, 0.6)'; 
            
            // 手機震動回饋 (配合音效更有感)
            if (navigator.vibrate) navigator.vibrate(50);
        }, 50);

        // 4. 動畫結束後，讓印章消失並顯示內容
        // 50ms (啟動) + 500ms (動畫) + 250ms (定格停留) = 800ms
        setTimeout(() => {
            // A. 印章容器淡出
            toggleContainer.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
            toggleContainer.style.opacity = '0';
            toggleContainer.style.transform = 'scale(0.9)'; 

            // B. 等待淡出完成後，移除按鈕並顯示對話
            setTimeout(() => {
                toggleContainer.style.display = 'none'; 
                chatArea.style.display = 'block'; 
                
                // 自動捲動
                chatArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 400);

        }, 800); 
    }
}


// === [終極修復] 文萃詳情頁置頂功能 (原地重生法) ===
// === [修訂] 文萃詳情頁置頂功能 (延遲重生法) ===
function scrollToArticleTop() {
    const detailView = document.getElementById('featuredDetailView');
    if (detailView) {
        detailView.scrollTo({ top: 0, behavior: 'smooth' });
    }

    const btn = document.getElementById('detailTopBtn');
    if (btn) {
        // 1. 為了確保您看得到綠色回饋，我們先什麼都不做，讓 CSS 的 :active/:hover 生效
        // 並主動移除焦點，避免邊框殘留
        btn.blur();

        // 2. 設定 300 毫秒的延遲
        // 這段時間足夠讓您看到按鈕變綠（視覺回饋）
        setTimeout(() => {
            // 3. 延遲結束後，執行「原地重生」
            // 這會強制瀏覽器忘記原本卡住的綠色 hover 狀態
            const newBtn = btn.cloneNode(true);
            if (btn.parentNode) {
                btn.parentNode.replaceChild(newBtn, btn);
            }
        }, 300); // 0.3秒後執行重置
    }
}

// === [修改] 自動滾動至賞析區塊 (加入防誤判邏輯) ===
function scrollToAnalysis() {
    const analysisSection = document.getElementById('articleAnalysisSection');
    
    if (analysisSection) {
        // ★★★ 步驟 A: 開啟鎖定，告訴系統這是「自動滾動」 ★★★
        // 這樣 onscroll 事件偵測到時，就不會觸發「已讀」
        isAutoScrollingToAnalysis = true;
 
        analysisSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        // ★★★ 步驟 B: 1秒後解鎖 (給予足夠時間等待滾動動畫結束) ★★★
        setTimeout(() => {
            isAutoScrollingToAnalysis = false;
        }, 1000);
    } else {
        alert("此文章暫無賞析內容。");
    }
}

// === [修訂 V10] 顯示文章詳情 (修復底部殘留問題) ===
function showArticleDetail(index) {
    try {
        const article = filteredArticles[index];
        if (!article) return;
    
        currentReadingArticleTitle = article.title;
        
        // 1. 隱藏列表頁 (關鍵修正)
        const listView = document.getElementById('featuredListView');
        if (listView) listView.style.display = 'none';

        // 2. 顯示詳情頁容器
        const detailView = document.getElementById('featuredDetailView');
        if (!detailView) return;

        // ... (以下是原本的內容生成邏輯，為了節省篇幅，保留您的核心變數) ...
        const isSaved = isArticleBookmarked(article.title);
        const bookmarkClass = isSaved ? 'bookmarked' : '';
        const titleColor = MORANDI_TITLES[index % MORANDI_TITLES.length];
        
        currentContextContent = `【文章標題】${article.title}\n【作者】${article.author}\n\n【文章正文】\n${article.content}\n\n【文章賞析】\n${article.analysis || "（無賞析資料）"}`;
        currentContextType = 'featured_discussion';
        currentContextReview = "（這是精選文章的閱讀討論）";
        
        // 處理正文 (詩歌/散文)
        const isPoetry = /^\s*<br\s*\/?>/i.test(article.content);
        let contentHtml = '';
        if (isPoetry) {
            let cleanContent = article.content.replace(/^\s*<br\s*\/?>/i, '').trim().replace(/\\n/g, '\n');
            contentHtml = `<div style="width: 100%; display: flex; justify-content: center;"><div id="poetryContent" style="white-space: pre; word-wrap: normal; display: inline-block; text-align: left; line-height: 1.7; font-family: 'Noto Serif TC', serif; margin-top: 0px;">${cleanContent}</div></div>`;
        } else {
            contentHtml = article.content.split('\n').filter(p => p.trim()).map((p, i) => {
                return `<p style="margin-bottom: 1.5em; ${i === 0 ? 'margin-top:0;' : ''}">${p}</p>`;
            }).join('');
        }
    
        // 處理賞析
        let analysisHtmlBlock = '';
        const hasAnalysis = article.analysis && article.analysis.trim() !== '';
        if (hasAnalysis) {
            const analysisText = article.analysis.split('\n').filter(p => p.trim()).map((p, i) => {
                return `<p style="margin-bottom: 1.5em; ${i === 0 ? 'margin-top:0;' : ''}">${p}</p>`;
            }).join('');
            analysisHtmlBlock = `
            <div id="articleAnalysisSection" class="analysis-container" style="margin-top: 50px !important; padding-top: 40px !important; border-top: 1px dashed #d1cdc5;">
                <div class="analysis-header" style="text-align: center; font-size: 1.4rem; font-weight: bold; color: #8d6e63; margin-bottom: 20px !important; line-height: 1.2; letter-spacing: 2px;">文章賞析</div>
                <div class="analysis-body" style="margin-top: 0 !important; font-size: 1.05rem !important;">${analysisText}</div>
            </div>`;
        }
    
        // 按鈕區
        const analysisBtnHtml = hasAnalysis ? `<button class="detail-float-btn scroll-hide-target" onclick="scrollToAnalysis()" title="跳至賞析"><i class="fas fa-comment-dots"></i></button>` : '';
        const disclaimerHtml = `<div style="margin-top: 60px; padding-top: 20px; border-top: 1px solid #eee; color: #aaa; font-size: 0.85rem; text-align: center; font-family: 'Noto Serif TC', serif;">本文僅供校內教學研習之用。<br>原文版權歸原作者/出版社所有。</div>`;
        const safeContent = encodeURIComponent(article.content);
        const safeTitle = encodeURIComponent(article.title);
    
        // 防睡按鈕邏輯
        const isFocusUnlocked = localStorage.getItem('sansi_focus_permission') === 'true';
        let focusBtnHTML = '';
        if (isFocusUnlocked) {
            focusBtnHTML = `<button id="focusMonitorBtn" class="detail-float-btn scroll-hide-target" onclick="toggleFocusMonitor()" title="開啟防睡監察"><i class="fas fa-eye-slash"></i></button>`;
            if (typeof focusMonitorState !== 'undefined') {
                focusMonitorState.isActive = false;
                if (focusMonitorState.checkInterval) clearInterval(focusMonitorState.checkInterval);
            }
        } else {
            focusBtnHTML = `<button id="focusMonitorBtn" class="detail-float-btn scroll-hide-target focus-status-green" onclick="toggleFocusMonitor()" title="防睡監察中 (點擊關閉)"><i class="fas fa-eye"></i></button>`;
            if (typeof activateFocusMonitor === 'function') {
                setTimeout(() => { const btn = document.getElementById('focusMonitorBtn'); if(btn) activateFocusMonitor(btn); }, 500);
            }
        }
    
        let chatHTML = getCanvasChatHTML('featured_discussion');
        chatHTML = chatHTML.replace('閱卷員追問區', '與陳SIR討論').replace('對於剛才的點評或改寫，有甚麼想進一步了解的嗎？', '看完這篇文章，有甚麼想和我討論嗎？');

        // 注入 HTML
        detailView.innerHTML = `
            <style>
                @keyframes stamp-slam { 0% { opacity: 0; transform: scale(3) rotate(-5deg); } 60% { opacity: 1; transform: scale(0.9) rotate(-3deg); } 80% { transform: scale(1.05) rotate(-3deg); } 100% { opacity: 1; transform: scale(1) rotate(-3deg); } }
                #fullArticleBody b, #fullArticleBody strong, #poetryContent b, #poetryContent strong { font-weight: bold !important; color: #2c3e50 !important; text-shadow: none !important; font-family: 'Noto Serif TC', serif; }
            </style>
            <div id="readingProgressBarContainer"><div id="readingProgressBar"></div></div>
            <div class="detail-action-group">
                <button id="detailBookmarkBtn" class="detail-float-btn scroll-hide-target ${bookmarkClass}" onclick="handleDetailBookmarkClick('${safeTitle}')" title="加入/移除書籤"><i class="fas fa-bookmark"></i></button>
                ${analysisBtnHtml}
                <button class="detail-float-btn scroll-hide-target" onclick="startSlowRead('${safeContent}')" title="開始慢讀"><i class="fas fa-book-reader"></i></button>
                <button class="detail-float-btn scroll-hide-target" onclick="openReaderSettings()" title="慢讀設定"><i class="fas fa-cog"></i></button>
                ${focusBtnHTML}
                <button id="detailTopBtn" class="detail-float-btn" onclick="scrollToArticleTop()" title="返回頂部" style="display: none;"><i class="fas fa-arrow-up"></i></button>
                <button class="detail-float-btn close-mode" onclick="backToArticleList()" title="返回列表"><i class="fas fa-times"></i></button>
            </div>
            <div class="read-mode-container">
                <div class="detail-header-group" style="display: flex; flex-direction: column; align-items: center; border-bottom: 2px dashed #e0ddd7; margin-bottom: 25px !important; padding-bottom: 15px !important;">
                    <div class="detail-title-text auto-fit-title" id="detailTitleText" style="color: ${titleColor}; font-weight: bold; margin-bottom: 20px; text-align: center; width: 100%;">
                        ${article.title}
                    </div>
                    <div class="detail-author-box" style="display: inline-block; padding: 6px 20px; background-color: #f5f5f5; border-radius: 4px; margin-bottom: 10px;">
                        <span class="detail-author-text" style="color: #5d4037; font-weight: bold;">${article.author}</span>
                    </div>
                    <div class="detail-date" style="color: #9e9e9e; font-family: 'Courier New', monospace; font-size: 0.9rem;">${article.date}</div>
                </div>
                <div class="article-body" id="fullArticleBody" style="font-size: 1.15rem; color: #4a4a4a; text-align: justify; line-height: 1.8;">
                    ${contentHtml}
                </div>
                ${analysisHtmlBlock}
                ${disclaimerHtml}
                <div style="margin-top: 80px; margin-bottom: 30px;">
                    <div id="chatToggleButtonContainer" style="text-align: center;">
                        <div style="height: 1px; background: linear-gradient(to right, transparent, #e0ddd7, transparent); width: 50%; margin: 0 auto 30px auto;"></div>
                        <button id="showFeaturedChatBtn" onclick="toggleFeaturedChat()"
                            style="width: 60px; height: 60px; background-color: transparent; color: #d69a92; border: 3px solid #d69a92; border-radius: 8px; font-family: 'Noto Serif TC', serif; font-size: 1.1rem; font-weight: 900; line-height: 1; padding: 0; transform: rotate(-3deg); cursor: pointer; transition: all 0.3s ease; display: inline-flex; align-items: center; justify-content: center;"
                            title="點擊落款">討論</button>
                        <div style="margin-top: 15px; color: #a1887f; font-size: 0.8rem; font-family: 'Noto Serif TC', serif; opacity: 0.6; letter-spacing: 2px; transform: scale(0.9); transition: opacity 0.5s;">[ 點 擊 落 款 ]</div>
                    </div>
                    <div id="featuredChatArea" style="display: none; text-align: left; animation: fadeIn 1s ease; margin-top: 30px;">
                        <div style="height: 1px; background: linear-gradient(to right, transparent, #e0ddd7, transparent); width: 80%; margin: 0 auto 30px auto;"></div>
                        ${chatHTML}
                    </div>
                </div>
            </div>
        `;
    
        // 顯示
        detailView.style.display = 'block';
        void detailView.offsetWidth; 
        document.body.style.overflow = 'hidden';
    
        // 文字縮放
        setTimeout(() => {
            const titleEl = document.getElementById('detailTitleText');
            if (titleEl) fitTextToContainer(titleEl, 24, 38);
            if (isPoetry) {
                const poetryEl = document.getElementById('poetryContent');
                if (poetryEl) {
                    let fontSize = 1.25 * 16;
                    poetryEl.style.fontSize = fontSize + 'px';
                    const containerWidth = poetryEl.parentElement.clientWidth;
                    let safety = 0;
                    while (poetryEl.scrollWidth > containerWidth && fontSize > 11 && safety < 100) {
                        fontSize -= 0.5;
                        poetryEl.style.fontSize = fontSize + 'px';
                        safety++;
                    }
                }
            }
        }, 50);
    
        // 滾動與防睡 UI 控制
        detailView.onscroll = function() {
            const scrollTop = detailView.scrollTop;
            const docHeight = detailView.scrollHeight;
            const winHeight = detailView.clientHeight;
            const scrollPercent = (scrollTop / (docHeight - winHeight)) * 100;
            
            const progressBar = document.getElementById('readingProgressBar');
            const progressContainer = document.getElementById('readingProgressBarContainer');
            if(progressBar) progressBar.style.width = scrollPercent + "%";
            if(progressContainer) progressContainer.style.opacity = scrollTop > 10 ? '1' : '0';
     
            const hideTargets = document.querySelectorAll('.scroll-hide-target');
            const topBtn = document.getElementById('detailTopBtn');
            
            if (scrollTop > 100) {
                if (topBtn) topBtn.style.display = 'flex';
                hideTargets.forEach(btn => {
                    if (btn.id === 'focusMonitorBtn') {
                        if (focusMonitorState && focusMonitorState.isActive) {
                            btn.style.display = 'flex';
                            btn.classList.add('minimized');
                        } else {
                            btn.style.display = 'none';
                            btn.classList.remove('minimized');
                        }
                    } else {
                        btn.style.display = 'none';
                    }
                });
            } else {
                if (topBtn) topBtn.style.display = 'none';
                hideTargets.forEach(btn => {
                    btn.style.display = 'flex';
                    if (btn.id === 'focusMonitorBtn') {
                        btn.classList.remove('minimized');
                    }
                });
            }
     
            // 已讀標記
            const analysisSection = document.getElementById('articleAnalysisSection');
            if (analysisSection && !isAutoScrollingToAnalysis) {
                const rect = analysisSection.getBoundingClientRect();
                if (rect.top <= winHeight * 0.8 && rect.bottom >= 0) {
                    markArticleAsRead(currentReadingArticleTitle);
                }
            }
        };

    } catch (err) {
        console.error("開啟文章詳情失敗:", err);
        alert("無法開啟文章，請重新整理頁面試試。");
    }
}

// === [修訂 V2] 返回列表 (修復：恢復列表顯示) ===
function backToArticleList() {
    // 1. 隱藏詳情頁
    const detailView = document.getElementById('featuredDetailView');
    if (detailView) detailView.style.display = 'none';
    
    // 2. 顯示列表頁 (關鍵)
    const listView = document.getElementById('featuredListView');
    if (listView) listView.style.display = 'block';

    // 恢復 Body 捲動
    document.body.style.overflow = 'auto';
    
    // 停止防睡
    if (typeof stopFocusMonitor === 'function') stopFocusMonitor();

    // 重新過濾列表
    if (isBookmarkMode) {
        const bookmarks = getBookmarkedTitles();
        filteredArticles = allArticles.filter(a => bookmarks.includes(a.title));
        
        const searchInput = document.getElementById('articleSearchInput');
        if (searchInput && searchInput.value.trim() !== "") {
            const query = searchInput.value.trim().toLowerCase();
            filteredArticles = filteredArticles.filter(a => 
                a.title.toLowerCase().includes(query) || 
                a.author.toLowerCase().includes(query)
            );
        }
    }
    
    // 重新渲染列表以更新「已讀」狀態
    renderArticleList();
}
// =======================================================
// === [修訂 V5] 防入睡失神監察系統 (400ms 輕震版) ===
// =======================================================
 
// =======================================================
// === [修訂 V6] 防入睡失神監察系統 (Web Audio API 版) ===
// =======================================================
// 監察系統全域狀態 (移除 audio 物件，改用 SansiAudio)
let focusMonitorState = {
    isActive: false,        
    lastActivityTime: 0,    
    checkInterval: null,    
    currentState: 'green'
};
// 檢查本地是否已經解鎖過權限
let isFocusPermissionUnlocked = localStorage.getItem('sansi_focus_permission') === 'true';
function toggleFocusMonitor() {
    const btn = document.getElementById('focusMonitorBtn');
    if (!btn) return;
    if (!focusMonitorState.isActive) {
        // === [開啟] ===
        // ★ 關鍵：在這裡解鎖 iOS 音訊
        SansiAudio.unlock();
        activateFocusMonitor(btn);
    } else {
        // === [關閉] ===
        if (isFocusPermissionUnlocked) {
            stopFocusMonitor();
            if (navigator.vibrate) navigator.vibrate([30]);
            console.log("防睡監察已關閉 (已授權)");
        } else {
            openFocusUnlockModal();
        }
    }
}
 
function activateFocusMonitor(btn) {
    // 1. 重要：由點擊事件直接觸發解鎖
    SansiAudio.init();
    SansiAudio.unlock();
    
    focusMonitorState.isActive = true;
    focusMonitorState.lastActivityTime = Date.now();
    focusMonitorState.currentState = 'green';
    
    btn.innerHTML = '<i class="fas fa-eye"></i>';
    btn.classList.remove('minimized');
    btn.classList.add('focus-status-green');
    btn.title = "防睡監察中 (點擊關閉)";
    
    // 啟動監聽邏輯
    startFocusListeners();
    if (focusMonitorState.checkInterval) clearInterval(focusMonitorState.checkInterval);
    focusMonitorState.checkInterval = setInterval(checkFocusStatus, 1000);
    
    if(navigator.vibrate) navigator.vibrate([50]);
    console.log("✅ 防睡監察已啟動，音訊管道已掛載");
}

 
// === [新增] 密碼視窗控制函式 ===
 
function openFocusUnlockModal() {
    const modal = document.getElementById('focusUnlockModal');
    const input = document.getElementById('focusUnlockInput');
    
    if (modal) {
        modal.style.display = 'flex';
        input.value = ''; // 清空舊輸入
        setTimeout(() => input.focus(), 100); // 自動聚焦
    }
}
 
function closeFocusUnlockModal() {
    document.getElementById('focusUnlockModal').style.display = 'none';
}
 
// ==========================================
// === [雲端讀取版] 密碼驗證 ===
// ==========================================
async function verifyFocusPassword() {
    const input = document.getElementById('focusUnlockInput');
    const pwd = input.value.trim();
    const btn = event.target.closest('button');
    const user = firebase.auth().currentUser;
    
    if (!user) return alert("請先登入");

    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    btn.disabled = true;

    try {
        const token = await user.getIdToken();
        
        // 發送請求到 GAS 後端進行驗證
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({
                token: token,
                action: 'verify_focus_password',
                data: { password: pwd }
            })
        });

        const result = await response.json();

        if (result.success) {
            // --- 驗證成功 ---
            isFocusPermissionUnlocked = true;
            // 關鍵：這行保證了永久不需要再輸入（除非清除瀏覽器緩存）
            localStorage.setItem('sansi_focus_permission', 'true');
            
            alert("✅ 驗證成功！權限已開通。");
            closeFocusUnlockModal();
            stopFocusMonitor(); 
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error("驗證失敗:", error);
        input.style.border = "1px solid #d69a92";
        input.value = "";
        input.placeholder = "密碼錯誤";
        input.focus();
        setTimeout(() => { input.style.border = "1px solid #e0ddd7"; }, 2000);
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}
 
// 停止並重置監察系統
function stopFocusMonitor() {
    focusMonitorState.isActive = false;
    
    if (focusMonitorState.checkInterval) {
        clearInterval(focusMonitorState.checkInterval);
        focusMonitorState.checkInterval = null;
    }
    
    removeFocusListeners();
    stopAlarm(); // 停止 Web Audio
    if (typeof LeaveWarningSystem !== 'undefined') {
        LeaveWarningSystem.resetSystem();
    }
    
    const btn = document.getElementById('focusMonitorBtn');
    if (btn) {
        btn.className = "detail-float-btn scroll-hide-target";
        btn.innerHTML = '<i class="fas fa-eye-slash"></i>';   
        btn.title = "開啟防睡監察";
        btn.style.transform = "";
        btn.style.display = 'flex';
    }
}
 
// ==========================================
// === [修訂] 一般模式狀態檢查 (接通新音效引擎) ===
// ==========================================
function checkFocusStatus() {
    if (!focusMonitorState.isActive) return;
    const now = Date.now();
    const idleTime = now - focusMonitorState.lastActivityTime;
    const btn = document.getElementById('focusMonitorBtn');
    
    const isMobile = window.innerWidth < 768;
    const LIMIT_ORANGE = isMobile ? 30000 : 60000;
    const LIMIT_RED    = isMobile ? 80000 : 100000;

    if (idleTime >= LIMIT_RED) {
        if (focusMonitorState.currentState !== 'red') {
            focusMonitorState.currentState = 'red';
            if (btn) {
                btn.classList.remove('focus-status-green', 'focus-status-orange');
                btn.classList.add('focus-status-red');
                if (!btn.classList.contains('minimized')) btn.innerHTML = '<i class="fas fa-bell"></i>';
            }
            // ★ 核心修改：呼叫新引擎播放
            console.log("🚨 [一般警報] 觸發聲音播放");
            SansiAudio.play('sleep_warning', true);
        }
        if (navigator.vibrate) navigator.vibrate(400);
        
    } else if (idleTime >= LIMIT_ORANGE) {
        if (focusMonitorState.currentState !== 'orange') {
            focusMonitorState.currentState = 'orange';
            if (btn) {
                btn.classList.remove('focus-status-green', 'focus-status-red');
                btn.classList.add('focus-status-orange');
                if (!btn.classList.contains('minimized')) btn.innerHTML = '<i class="fas fa-exclamation"></i>';
            }
            SansiAudio.stop('sleep_warning'); // 橙燈不響
        }
    } else {
        if (focusMonitorState.currentState !== 'green') {
            focusMonitorState.currentState = 'green';
            if (btn) {
                btn.classList.remove('focus-status-orange', 'focus-status-red');
                btn.classList.add('focus-status-green');
                if (!btn.classList.contains('minimized')) btn.innerHTML = '<i class="fas fa-eye"></i>';
            }
            SansiAudio.stop('sleep_warning'); // 綠燈不響
        }
    }
}
 
// 3. 用戶活動監聽 (重置計時器)
function resetFocusTimer() {
    if (!focusMonitorState.isActive) return;
    
    // 更新最後活動時間
    focusMonitorState.lastActivityTime = Date.now();
    
    // 如果處於紅燈警報狀態，任何操作應立即停止警報並恢復綠燈
    if (focusMonitorState.currentState === 'red') {
        stopAlarm();
        checkFocusStatus(); // 強制立即執行一次檢查，將 UI 變回綠色
    }
}
 
function startFocusListeners() {
    // 監聽各種用戶操作
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'touchmove', 'click'];
    events.forEach(evt => {
        document.addEventListener(evt, resetFocusTimer, { passive: true });
    });
    
    // 針對閱讀容器的內部滾動
    const detailView = document.getElementById('featuredDetailView');
    if (detailView) {
        detailView.addEventListener('scroll', resetFocusTimer, { passive: true });
    }
}
 
function removeFocusListeners() {
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'touchmove', 'click'];
    events.forEach(evt => {
        document.removeEventListener(evt, resetFocusTimer);
    });
    
    const detailView = document.getElementById('featuredDetailView');
    if (detailView) {
        detailView.removeEventListener('scroll', resetFocusTimer);
    }
}
 
// ==========================================
// === [修訂] 全局停止警報 (確保徹底斷開音訊) ===
// ==========================================
function stopAlarm() {
    // ★ 修改：同時停止兩類警報
    SansiAudio.stop('sleep_warning');
    SansiAudio.stop('leave_warning');
    
    if (navigator.vibrate) navigator.vibrate(0);
}
 
// === [重要] 返回文章列表時，強制停止監察 ===
const originalBackToArticleList = window.backToArticleList;
window.backToArticleList = function() {
    stopFocusMonitor(); 
    
    if (typeof originalBackToArticleList === 'function') {
        originalBackToArticleList();
    } else {
        const detailView = document.getElementById('featuredDetailView');
        if(detailView) detailView.style.display = 'none';
        document.body.style.overflow = 'auto';
        if (typeof renderArticleList === 'function') renderArticleList();
        const listView = document.getElementById('featuredListView');
        if(listView) listView.style.display = 'block';
    }
};
 
 
 

	
// 6. 修訂：返回列表時刷新 (確保已讀狀態立即更新)
function backToArticleList() {
    const detailView = document.getElementById('featuredDetailView');
    detailView.style.display = 'none';
    
    // ★★★ 關鍵：恢復 Body 捲動 ★★★
    document.body.style.overflow = 'auto';
    
    // 停止防睡功能 (如果是自動開啟的)
    if (typeof stopFocusMonitor === 'function') stopFocusMonitor();
 
    // 重新過濾並渲染列表 (保持原有邏輯)
    if (isBookmarkMode) {
        const bookmarks = getBookmarkedTitles();
        filteredArticles = allArticles.filter(a => bookmarks.includes(a.title));
        
        const searchInput = document.getElementById('articleSearchInput');
        if (searchInput && searchInput.value.trim() !== "") {
            const query = searchInput.value.trim().toLowerCase();
            filteredArticles = filteredArticles.filter(a =>
                a.title.toLowerCase().includes(query) ||
                a.author.toLowerCase().includes(query)
            );
        }
    }
    
    renderArticleList();
    document.getElementById('featuredListView').style.display = 'block';
}
 
// 更新：在全域的 returnToHome 函式中加入隱藏 featuredContainer
// 請記得在你的 window.returnToHome = function() {...} 裡面的 containers 陣列加入 'featuredContainer'

	
</script>

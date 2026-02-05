/**
 * books-mode.js
 * 課外書籍討論功能模組
 * 
 * 包含所有與課外書籍討論相關的函數，包括：
 * - 聊天記錄的保存/載入/清除
 * - 討論的開始和繼續
 * - 訊息的渲染和管理
 * - 書籍資源選單的操作
 */

// =============================================================================
// 全域變數 (Global Variables)
// =============================================================================

/**
 * 課外書籍討論功能的全域變數
 * 這些變數在 index2.html 中宣告，此處僅作為參考說明
 */
// let chatHistory = [];        // 聊天記錄陣列
// let bookTitle = "";           // 書名
// let author = "";              // 作者
// let discussionQuestion = "";  // 討論問題
// let booksTone = "";           // 語氣設定 (serious/casual)


// =============================================================================
// 訊息渲染函數 (Message Rendering Functions)
// =============================================================================

/**
 * 將訊息渲染到畫面上
 * @param {string} sender - 訊息發送者: "info"(資訊卡), "user"(使用者), "ai"(AI)
 * @param {string} message - 訊息內容 (支援 HTML)
 */
function renderMessage(sender, message) {
    const chatHistoryDiv = document.getElementById("chatHistory");
    const element = document.createElement("div");
    
    if (sender === "info") {
        element.className = "discussion-info";
        element.innerHTML = message;
    } else {
        element.className = `message-bubble ${sender}-message`;
        element.innerHTML = message; // innerHTML to render formatted text
        if (sender === "ai" && message === "陳SIR正在回應...") {
            element.id = "ai-loading";
        }
    }
    chatHistoryDiv.appendChild(element);
    chatHistoryDiv.scrollTop = chatHistoryDiv.scrollHeight;
}

/**
 * 將訊息加入歷史紀錄並渲染到畫面
 * @param {string} sender - 訊息發送者
 * @param {string} message - 訊息內容
 */
function addMessageToHistory(sender, message) {
    chatHistory.push({ sender, message });
    renderMessage(sender, message);
}

/**
 * 更新最後一條 AI 訊息的內容（從 "正在回應..." 到實際的回應）
 * 這個新版本能處理帶有頭像和氣泡的複雜 HTML 結構
 * @param {string} newMessage - 從 API 獲取到的新訊息內容
 */
function updateLastAIMessage(newMessage) {
    // 現在 ai-loading 這個 ID 直接在 message-bubble 元素上
    const loadingBubble = document.getElementById("ai-loading"); 
    
    if (loadingBubble) {
        // 直接更新氣泡的內容
        loadingBubble.innerHTML = newMessage;
        // 移除 ID
        loadingBubble.id = ""; 
        
        // 同步數據
        if (chatHistory.length > 0) {
            chatHistory[chatHistory.length - 1].message = newMessage;
        }
    } else {
        addMessageToHistory("ai", newMessage);
    }
}


// =============================================================================
// 本地儲存管理函數 (LocalStorage Management Functions)
// =============================================================================

/**
 * 保存課外書籍對話到 localStorage
 * 包含聊天記錄和當前狀態（書名、作者、討論問題、語氣）
 */
function saveBooksChat() {
    // 只在有聊天記錄時才儲存
    if (chatHistory.length > 0) {
        const booksTone = document.getElementById("booksTone").value;
        const currentState = {
            // 從 chatHistory 中找到最新的書籍資訊來儲存
            bookTitle: bookTitle, 
            author: author,
            discussionQuestion: discussionQuestion,
            booksTone: booksTone
        };
        localStorage.setItem("booksChatHistory", JSON.stringify(chatHistory));
        localStorage.setItem("booksChatState", JSON.stringify(currentState));
        alert("對話已儲存");
    } else {
        alert("沒有對話紀錄可儲存。");
    }
}

/**
 * 清空課外書籍對話及紀錄
 * 清除 UI、表單欄位、localStorage 和 JS 變數
 */
function clearBooksChat() {
    if (confirm("確定要清空對話及紀錄嗎？")) {
        // 清空 UI
        document.getElementById("chatHistory").innerHTML = "";
        document.getElementById("chatHistory").style.display = "none";
        document.getElementById("chatInputContainer").style.display = "none";
        document.getElementById("initialDiscussionForm").style.display = "block"; // 顯示初始表單
        document.getElementById("booksButtons").style.display = "none"; // <-- 新增這一行
        
        
        // 清空表單欄位
        document.getElementById("bookTitle").value = "";
        document.getElementById("author").value = "";
        document.getElementById("discussionQuestion").value = "";
        document.getElementById("userInput").value = "";
        
        // 清空 localStorage
        localStorage.removeItem("booksChatHistory");
        localStorage.removeItem("booksChatState");
        
        // 重置 JS 變數
        chatHistory = [];
        bookTitle = "";
        author = "";
        discussionQuestion = "";
        booksTone = "";
    }
}

/**
 * 從 localStorage 載入課外書籍對話
 * 如果有儲存的紀錄，則恢復對話狀態和歷史訊息
 * 如果沒有，則顯示初始表單
 */
function loadBooksChat() {
    const savedChatJSON = localStorage.getItem("booksChatHistory");
    const savedStateJSON = localStorage.getItem("booksChatState");
    const initialForm = document.getElementById("initialDiscussionForm");
    const chatInterface = document.getElementById("chatInputContainer");
    const chatHistoryDiv = document.getElementById("chatHistory");
    const saveBtn = document.getElementById('save-books-html-btn');
    
    if (savedChatJSON && savedStateJSON) {
        // --- 有儲存紀錄的模式 ---
        initialForm.style.display = "none"; // 隱藏初始表單
        chatInterface.style.display = "flex"; // 顯示聊天輸入介面
        chatHistoryDiv.style.display = "flex"; // 顯示聊天紀錄
        document.getElementById("booksButtons").style.display = "flex"; // <-- 新增這一行
        saveBtn.style.display = 'flex'; // 顯示儲存按鈕
        
        chatHistoryDiv.innerHTML = '';
        chatHistory = JSON.parse(savedChatJSON);
        const state = JSON.parse(savedStateJSON);
        
        // 從 state 恢復全域變數
        bookTitle = state.bookTitle || "";
        author = state.author || "";
        discussionQuestion = state.discussionQuestion || "";
        booksTone = state.booksTone || "serious";
        
        // 恢復語氣選擇
        document.getElementById("booksTone").value = booksTone;
        
        // 重新渲染聊天紀錄
        chatHistory.forEach(item => {
            renderMessage(item.sender, item.message);
        });
        
    } else {
        // --- 沒有儲存紀錄的模式 (初始狀態) ---
        initialForm.style.display = "block"; // 顯示初始表單
        chatInterface.style.display = "none"; // 隱藏聊天輸入介面
        chatHistoryDiv.style.display = "none"; // 隱藏聊天紀錄
        saveBtn.style.display = 'none'; // 隱藏儲存按鈕
    }
}


// =============================================================================
// 討論開始與繼續函數 (Discussion Start and Continue Functions)
// =============================================================================

/**
 * 開始新的書籍討論
 * 讀取表單輸入、驗證資料、初始化 UI，並發送初始訊息給 API
 */
async function startDiscussion() {
    const startBtn = document.getElementById('startDiscussionBtn');
    startBtn.disabled = true;
    
    try {
        bookTitle = sanitizeHTML(document.getElementById("bookTitle").value.trim());
        author = sanitizeHTML(document.getElementById("author").value.trim());
        discussionQuestion = sanitizeHTML(document.getElementById("discussionQuestion").value.trim());
        booksTone = document.getElementById("booksTone").value;
        
        if (!bookTitle || !author || !discussionQuestion) {
            alert("請填寫書名、作者和討論問題");
            return;
        }
        
        // 隱藏初始表單，顯示聊天介面
        document.getElementById("initialDiscussionForm").style.display = "none";
        document.getElementById("chatHistory").style.display = "flex";
        document.getElementById("chatInputContainer").style.display = "flex";
        document.getElementById("booksButtons").style.display = "flex";
        
        
        
        chatHistory = []; // 開始新討論時清空歷史紀錄
        
        const initialMessage = `<table><tr><td>書名：</td><td>${bookTitle}</td></tr><tr><td>作者：</td><td>${author}</td></tr><tr><td>討論：</td><td>${discussionQuestion}</td></tr></table>`;
        addMessageToHistory("info", initialMessage);
        
        await sendInitialMessage();
        
    } catch (error) {
        console.error("開始討論時出錯:", error);
    } finally {
        startBtn.disabled = false;
    }
}

/**
 * 發送初始訊息給 API
 * 使用書名、作者、討論問題和語氣作為參數
 */
async function sendInitialMessage() {
    const payload = {
        action: "chat_books",
        data: {
            bookTitle: bookTitle,
            author: author,
            discussionQuestion: discussionQuestion,
            tone: booksTone
        }
    };
    
    addMessageToHistory("ai", "陳SIR正在回應...");
    try {
        const aiResponse = await callReadingAPI(payload);
        updateLastAIMessage(aiResponse);
    } catch (error) {
        console.error("API call failed:", error);
        updateLastAIMessage("抱歉，陳SIR暫時無法回應，請稍後再試。");
    }
}

/**
 * 繼續書籍討論
 * 讀取使用者輸入，發送給 API，並顯示回應
 */
async function continueDiscussion() {
    const continueBtn = document.getElementById('continueBtn');
    continueBtn.disabled = true;
    const userInputText = sanitizeHTML(document.getElementById("userInput").value.trim());
    if (!userInputText) { alert("請輸入您的回應"); continueBtn.disabled = false; return; }

    addMessageToHistory("user", userInputText);
    document.getElementById("userInput").value = "";
    addMessageToHistory("ai", "陳SIR正在回應...");

    const payload = {
        action: "chat_books",
        data: {
            bookTitle: bookTitle,
            author: author,
            discussionQuestion: discussionQuestion,
            tone: booksTone,
            userInput: userInputText
        }
    };

    try {
        const aiResponse = await callReadingAPI(payload);
        updateLastAIMessage(aiResponse);
    } catch (error) {
        console.error("繼續討論時出錯:", error);
        updateLastAIMessage("抱歉，陳SIR無法回應。");
    } finally {
        continueBtn.disabled = false;
    }
}


// =============================================================================
// 書籍資源選單函數 (Book Resource Menu Functions)
// =============================================================================

/**
 * 打開閱讀資源選單
 * 先收起側邊欄，然後顯示選擇視窗
 */
function openBookResourceMenu() {
    // 先收起側邊欄
    const sideMenu = document.getElementById('sideMenu');
    if (sideMenu) {
        sideMenu.classList.remove('active');
        document.getElementById('sideMenuToggle').classList.remove('active');
    }
    // 顯示選擇視窗
    document.getElementById('bookResourceModal').style.display = 'flex';
}

/**
 * 關閉閱讀資源選單 (點擊背景關閉)
 * @param {Event} event - 點擊事件
 */
function closeBookResourceMenu(event) {
    if (event.target.id === 'bookResourceModal') {
        document.getElementById('bookResourceModal').style.display = 'none';
    }
}

/**
 * 從選單進入課外書籍討論
 * 關閉選單並顯示書籍討論容器
 */
function enterBooksChatFromMenu() {
    document.getElementById('bookResourceModal').style.display = 'none';
    
    // 直接呼叫原本的容器顯示函式
    showContainer('booksContainer');
}


// =============================================================================
// 新話題彈出視窗處理 (New Topic Modal Handling)
// =============================================================================

/**
 * 初始化新話題彈出視窗的事件監聽器
 * 此函數應在 DOM 載入完成後執行
 */
function initializeNewTopicModal() {
    const newTopicModal = document.getElementById('newTopicModal');
    const newTopicBtn = document.getElementById('newTopicBtn');
    const closeNewTopicModal = document.getElementById('closeNewTopicModal');
    const modalStartDiscussionBtn = document.getElementById('modalStartDiscussionBtn');
    
    // 打開彈出視窗
    newTopicBtn.addEventListener('click', () => {
        newTopicModal.style.display = 'flex';
    });
    
    // 關閉彈出視窗（點擊關閉按鈕）
    closeNewTopicModal.addEventListener('click', () => {
        newTopicModal.style.display = 'none';
    });
    
    // 關閉彈出視窗（點擊背景）
    window.addEventListener('click', (event) => {
        if (event.target == newTopicModal) {
            newTopicModal.style.display = 'none';
        }
    });
    
    // 開始新討論
    modalStartDiscussionBtn.addEventListener('click', async () => {
        const newBookTitle = document.getElementById("modalBookTitle").value.trim();
        const newAuthor = document.getElementById("modalAuthor").value.trim();
        const newDiscussionQuestion = document.getElementById("modalDiscussionQuestion").value.trim();
        
        if (!newBookTitle || !newAuthor || !newDiscussionQuestion) {
            alert("請填寫所有欄位");
            return;
        }
        
        // 更新全域變數
        bookTitle = newBookTitle;
        author = newAuthor;
        discussionQuestion = newDiscussionQuestion;
        
        // 清空舊的聊天歷史和 UI
        document.getElementById("chatHistory").innerHTML = '';
        chatHistory = [];
        
        // 添加新的書籍資訊卡片
        const initialMessage = `<table><tr><td>書名：</td><td>${bookTitle}</td></tr><tr><td>作者：</td><td>${author}</td></tr><tr><td>討論：</td><td>${discussionQuestion}</td></tr></table>`;
        addMessageToHistory("info", initialMessage);
        
        // 關閉彈出視窗
        newTopicModal.style.display = 'none';
        
        // 清空彈出視窗的輸入
        document.getElementById("modalBookTitle").value = '';
        document.getElementById("modalAuthor").value = '';
        document.getElementById("modalDiscussionQuestion").value = '';
        
        // 發送初始訊息
        await sendInitialMessage();
    });
}


// =============================================================================
// 輔助函數依賴說明 (Helper Functions Dependencies)
// =============================================================================

/**
 * 以下函數在本模組中被使用，但定義在 index2.html 的其他位置：
 * 
 * - sanitizeHTML(str): 清理 HTML 特殊字元，防止 XSS 攻擊
 *   位置: index2.html 第 11243 行
 * 
 * - callReadingAPI(input, temperature): 呼叫閱讀 API
 *   位置: index2.html 第 13111 行
 * 
 * - showContainer(containerId): 顯示指定的容器並隱藏其他容器
 *   位置: index2.html 的其他位置
 * 
 * 若要將此模組完全獨立，需要將這些函數也一併提取或重新實作。
 */


// =============================================================================
// 模組導出 (Module Exports)
// =============================================================================

/**
 * 如果需要使用 ES6 模組語法，可以解除下方註解：
 * 
 * export {
 *     // 訊息相關
 *     renderMessage,
 *     addMessageToHistory,
 *     updateLastAIMessage,
 *     
 *     // 本地儲存
 *     saveBooksChat,
 *     clearBooksChat,
 *     loadBooksChat,
 *     
 *     // 討論功能
 *     startDiscussion,
 *     sendInitialMessage,
 *     continueDiscussion,
 *     
 *     // 選單功能
 *     openBookResourceMenu,
 *     closeBookResourceMenu,
 *     enterBooksChatFromMenu,
 *     
 *     // 初始化
 *     initializeNewTopicModal
 * };
 */

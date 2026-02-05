// Core Application Functions


// === 監聽未繳交功課並控制紅點 (核心邏輯) ===
let pendingMonitorRef = null; // 用於儲存監聽器，方便登出時移除

function monitorPendingAssignments() {
    const s = JSON.parse(localStorage.getItem('studentProfile'));
    const badge = document.getElementById('notifBadge');
    
    // 如果沒有登入資料或找不到紅點元素，直接退出
    if (!s || !badge) return;

    // 如果之前有監聽器，先移除，避免重複疊加
    if (pendingMonitorRef) {
        pendingMonitorRef.off();
    }

    // 設定監聽路徑：該年級班別的所有功課
    pendingMonitorRef = database.ref(`assignments/${s.grade}/${s.class}`);

    pendingMonitorRef.on('value', async (snapshot) => {
        const assignments = snapshot.val();
        
        // 如果老師根本沒派發過功課，隱藏紅點
        if (!assignments) {
            badge.style.display = 'none';
            return;
        }

        const assignmentKeys = Object.keys(assignments);
        let hasPending = false;

        // 使用 Promise.all 並行檢查每一份功課的繳交狀態
        const checkPromises = assignmentKeys.map(async (key) => {
            // 檢查 assignments_submissions 路徑下是否有該學生的紀錄
            const subSnap = await database.ref(`assignments_submissions/${key}/${s.name}`).once('value');
            
            // 如果 subSnap.exists() 為 false，代表還沒交
            return subSnap.exists(); 
        });

        const results = await Promise.all(checkPromises);

        // 檢查結果：只要結果陣列中有任何一個 false (未交)，就標記為有待辦
        if (results.includes(false)) {
            hasPending = true;
        }

        // 更新 UI
        if (hasPending) {
            badge.style.display = 'block';
            badge.title = "您有未繳交的課業！"; // 滑鼠懸停提示
        } else {
            badge.style.display = 'none';
        }
    });
}
	

// --- 【全新修訂】儲存頁面為 HTML 的功能 (已整合雷達圖轉換) ---
function savePageAsHTML(filename = '神思-存檔.html') {
    // 1. 建立當前文檔的深度複製品，我們將在這個複製品上操作
    const clonedDocElement = document.documentElement.cloneNode(true);

    // --- 【核心新增邏輯：處理雷達圖】 ---
    // a. 找出當前頁面上所有可見的雷達圖畫布 (canvas)
    const visibleCanvases = document.querySelectorAll('.radar-chart-container canvas');
    
    visibleCanvases.forEach(originalCanvas => {
        // b. 檢查畫布是否真的可見，避免處理隱藏的圖表
        if (originalCanvas.offsetParent !== null) {
            try {
                // c. 將畫布內容轉換為 Base64 格式的圖片數據 (PNG)
                const imageDataUrl = originalCanvas.toDataURL('image/png');
                
                // d. 在 "複製品" 中找到對應的畫布
                const clonedCanvas = clonedDocElement.querySelector(`#${originalCanvas.id}`);
                
                if (clonedCanvas) {
                    // e. 建立一個新的 <img> 元素
                    const img = document.createElement('img');
                    img.src = imageDataUrl; // 將圖片數據設置為來源
                    img.style.width = '100%'; // 保持與原畫布容器寬度一致
                    img.style.height = 'auto'; // 高度自動調整
                    
                    // f. 在複製品中，用這張靜態圖片 <img> 取代原本的 <canvas>
                    clonedCanvas.parentNode.replaceChild(img, clonedCanvas);
                }
            } catch (e) {
                console.error('轉換雷達圖為圖片時發生錯誤:', e);
            }
        }
    });
    // --- 【雷達圖處理邏輯結束】 ---

    // 2. 在複製品上同步所有表單元素的當前狀態 (此部分邏輯不變)
    const originalTextareas = document.getElementsByTagName('textarea');
    const clonedTextareas = clonedDocElement.getElementsByTagName('textarea');
    for (let i = 0; i < originalTextareas.length; i++) {
        clonedTextareas[i].textContent = originalTextareas[i].value;
    }

    const originalInputs = document.querySelectorAll('input');
    const clonedInputs = clonedDocElement.querySelectorAll('input');
    for (let i = 0; i < originalInputs.length; i++) {
        clonedInputs[i].setAttribute('value', originalInputs[i].value);
        if (originalInputs[i].type === 'radio' || originalInputs[i].type === 'checkbox') {
             if (originalInputs[i].checked) {
                clonedInputs[i].setAttribute('checked', 'checked');
            } else {
                clonedInputs[i].removeAttribute('checked');
            }
        }
    }

    const originalSelects = document.getElementsByTagName('select');
    const clonedSelects = clonedDocElement.getElementsByTagName('select');
    for (let i = 0; i < originalSelects.length; i++) {
        const selectedIndex = originalSelects[i].selectedIndex;
        if (selectedIndex > -1) {
            Array.from(clonedSelects[i].options).forEach(opt => opt.removeAttribute('selected'));
            clonedSelects[i].options[selectedIndex].setAttribute('selected', 'selected');
        }
    }

    // 3. 在複製品中移除所有「儲存HTML」按鈕及其他不需保存的互動按鈕
    const clonedSaveButtons = clonedDocElement.querySelectorAll('.btn-save-html');
    clonedSaveButtons.forEach(btn => btn.remove());
    
    const clonedShowPlayerBtn = clonedDocElement.querySelector('#show-player');
    if (clonedShowPlayerBtn) clonedShowPlayerBtn.remove();
    
    const clonedExpandToolsBtn2 = clonedDocElement.querySelector('#expandToolsBtn2');
    if (clonedExpandToolsBtn2) clonedExpandToolsBtn2.remove();


    // 4. 生成完整的 HTML 字串
    const finalHtml = '<!DOCTYPE html>\n' + clonedDocElement.outerHTML;

    // 5. 創建 Blob 並觸發下載
    const blob = new Blob([finalHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// --- 【新增】隱藏所有「儲存HTML」按鈕的專用函式 ---
function hideAllSaveHtmlButtons() {
    const saveButtons = document.querySelectorAll('.btn-save-html');
    saveButtons.forEach(button => {
        button.style.display = 'none';
    });
}

// 【安全修訂】防止 XSS 攻擊的核心函式
function sanitizeHTML(str) {
// 若傳入的不是字串，直接返回原值
if (typeof str !== 'string') return str;
// 將特殊字元轉換為 HTML 實體
return str.replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// 【核心修訂】建立一個清除所有題目狀態的專用函式
function clearAllTopicStates() {
// 1. 清除所有題目顯示區塊的內容並隱藏它們
document.getElementById('topicResult').innerHTML = '';
document.getElementById('topicResult').style.display = 'none';
document.getElementById('argumentTopicResult').innerHTML = '';
document.getElementById('argumentTopicResult').style.display = 'none';
document.getElementById('expandTopicResult').innerHTML = '';
document.getElementById('expandTopicResult').style.display = 'none';

// 2. 清除所有儲存在 localStorage 的題目相關資料
// 「敘事抒情」相關
localStorage.removeItem("currentTopic");
localStorage.removeItem("currentFocus");
localStorage.removeItem("currentPlot");
localStorage.removeItem("lastTopic");

// 「議論」相關
localStorage.removeItem("argumentCurrentTopic");
localStorage.removeItem("lastArgumentTopic");

// 「整合拓展」相關
localStorage.removeItem("expandCurrentTitle");
localStorage.removeItem("expandCurrentTheme");
localStorage.removeItem("expandCurrentData");

// 3. 清除自訂題目的輸入區
const customTopicArea = document.getElementById("customTopicArea");
if (customTopicArea) {
customTopicArea.innerHTML = '';
customTopicArea.style.display = 'none';
}
const argumentCustomTopicArea = document.getElementById("argumentCustomTopicArea");
if (argumentCustomTopicArea) {
argumentCustomTopicArea.innerHTML = '';
argumentCustomTopicArea.style.display = 'none';
}
}



/**
* 更新按鈕的 활성화 (active) 狀態。
* @param {HTMLElement} clickedButton - 被點擊的按鈕元素。
*/
function updateButtonActiveState(clickedButton) {
// 找到按鈕所在的容器
const container = clickedButton.closest('.topic-buttons-container');
if (!container) return;

// 獲取容器內的所有按鈕
const buttons = container.querySelectorAll('.btn');

// 首先，移除所有按鈕的 'active' class
buttons.forEach(button => {
button.classList.remove('active');
});

// 然後，只為被點擊的按鈕添加 'active' class
clickedButton.classList.add('active');
}


// ★ 設定 Worker 後端網址 ★
const CLOUDFLARE_WORKER_URL = "https://script.google.com/macros/s/AKfycbw3GLUM12ls3PhST5TkimLZvZwQx2H4RG8g2SbZiMJmuxg3HqsO_d13kPU4AnKpxi2P6A/exec";
 
// 以下維持不變，它們都會自動使用上面這條新路徑
const API_URL = CLOUDFLARE_WORKER_URL;         
const READING_API_URL = CLOUDFLARE_WORKER_URL;
const LLAMA3_API_URL = CLOUDFLARE_WORKER_URL;  
 
// 模型設定保持不變
const MODEL = "gemini";
const READING_MODEL = "deepseek";
const LLAMA3_MODEL = "gemini";


// =======================================================
// === [新增] 畫布聊天室核心邏輯 ===
// =======================================================

let canvasChatHistory = []; 
let currentContextType = ""; 
let currentContextContent = ""; 
let currentContextReview = ""; 

// =======================================================
// === [修訂版] 畫布聊天室 HTML 生成 (移除 ID，改用相對定位) ===
// =======================================================
function getCanvasChatHTML(type) {
    currentContextType = type;
    canvasChatHistory = [];
    
    // 修改重點：
    // 1. 移除了 textarea 的 id="canvasChatInput"
    // 2. 移除了 button 的 id="canvasChatSendBtn"
    // 3. onclick 加入 'this' 參數，精確傳遞點擊的按鈕
    return `
    <div class="canvas-chat-container">
        <div class="canvas-chat-header">
            <i class="fas fa-comments"></i> 閱卷員追問區
        </div>
        <div class="canvas-chat-history">
            <div class="message-bubble ai-message">你好！對於剛才的點評或改寫，有甚麼想進一步了解的嗎？歡迎追問！🤌</div>
        </div>
        <div class="canvas-input-area">
            <textarea class="no-modal-editor" placeholder="在此輸入你的問題... "></textarea>
            <button class="canvas-send-btn" onclick="sendCanvasMessage(this)" title="發送">
                <i class="fas fa-paper-plane"></i>
            </button>
        </div>
    </div>`;
}
 
// ==========================================
// === [修訂版] 畫布聊天室發送邏輯 (相對定位查找) ===
// ==========================================
// ==========================================
// === [修訂版] 畫布聊天室發送邏輯 (繁體化 + 引號修正) ===
// ==========================================
async function sendCanvasMessage(btnElement) {
    // 1. 鎖定觸發按鈕：優先使用傳入的 this (btnElement)
    let sendBtn = btnElement;
    
    // 如果沒有傳入參數 (舊版 HTML 相容)，嘗試從 window.event 獲取
    if (!sendBtn && window.event) {
        sendBtn = window.event.target.closest('button');
    }
    
    // 如果還是找不到，嘗試尋找頁面上「可見」的發送按鈕 (最後防線)
    if (!sendBtn) {
        const visibleBtn = Array.from(document.querySelectorAll('.canvas-send-btn')).find(btn => btn.offsetParent !== null);
        if (visibleBtn) sendBtn = visibleBtn;
    }
 
    if (!sendBtn) {
        console.error("找不到發送按鈕");
        return;
    }
    // 2. 基於按鈕位置，往上尋找最近的容器 (Context)
    const container = sendBtn.closest('.canvas-chat-container');
    if (!container) return;
    // 3. 在該容器內尋找輸入框與歷史區 (使用 Class 選擇器，而非 ID)
    const inputEl = container.querySelector('textarea');
    const historyBox = container.querySelector('.canvas-chat-history');
    
    if (!inputEl || !historyBox) return;
    const userText = sanitizeHTML(inputEl.value.trim());
    if (!userText) {
        // 提示用戶輸入
        inputEl.style.borderColor = "#d69a92";
        setTimeout(() => inputEl.style.borderColor = "#ccc", 500);
        return;
    }
    // --- 以下為發送邏輯 ---
 
    // 1. 顯示用戶訊息
    const userBubble = document.createElement("div");
    userBubble.className = "message-bubble user-message";
    userBubble.innerHTML = userText.replace(/\n/g, '<br>');
    historyBox.appendChild(userBubble);
    
    inputEl.value = "";
    sendBtn.disabled = true; // 暫時禁用按鈕
    historyBox.scrollTop = historyBox.scrollHeight;
    // 2. 顯示 AI 思考中
    const aiBubble = document.createElement("div");
    aiBubble.className = "message-bubble ai-message";
    aiBubble.innerHTML = `<i class="fas fa-spinner fa-spin"></i> 正在思考...`;
    historyBox.appendChild(aiBubble);
    historyBox.scrollTop = historyBox.scrollHeight;
    // 3. 抓取之前的對話紀錄 (作為 Context)
    const bubbles = Array.from(historyBox.querySelectorAll('.message-bubble'));
    let historyText = "";
    // 取最近 5 則對話，避免 Token 過長
    bubbles.slice(-6, -1).forEach(b => {
        const role = b.classList.contains('ai-message') ? "陳SIR" : "學生";
        historyText += `${role}: ${b.innerText}\n`;
    });
    
    // --- 全方位偵測語氣與閱卷員 ---
    let toneNote = "請用日常、親切的語氣回應，多用例子說明。";
    let activeReviewer = "中文老師";
    let currentToneVal = "serious";
 
    // 嘗試從所有可能的 ID 中抓取目前「可見」的語氣設定
    const possibleToneIds = [
        "writingTone", "argumentWritingTone", "argumentOutlineTone",
        "readingTone", "expandTone", "booksTone"
    ];
 
    for (const id of possibleToneIds) {
        const el = document.getElementById(id);
        if (el && el.offsetParent !== null) {
            currentToneVal = el.value;
            break;
        }
    }
 
    // 嘗試找出目前「可見」的閱卷員
    const possibleReviewerIds = ["writingReviewer", "argumentReviewer"];
    for (const id of possibleReviewerIds) {
        const el = document.getElementById(id);
        if (el && el.offsetParent !== null) {
            activeReviewer = el.options[el.selectedIndex].text.replace(/\s*\(預設\)\s*/, '');
            break;
        }
    }
 
    // 根據情境設定 Prompt
    if (typeof currentContextType !== 'undefined' && currentContextType === 'featured_discussion') {
        toneNote = "你現在是陳SIR。請用書面語回應，輕鬆又見認真，用語適合高中生，**必須使用大量Emoji** 🤌✨。";
        activeReviewer = "陳SIR";
    } else {
        if (currentToneVal === "chen") {
            toneNote = "你現在是陳SIR。請用幽默詼諧、適時揶揄的語氣回應，**必須使用大量Emoji** 🤪✨，表示揶揄時會用🤌這個EMOJI。";
            activeReviewer = "陳SIR";
        } else if (currentToneVal === "casual") {
            toneNote = "請用輕鬆活潑的語氣回應。";
        }
    }
    // 4. 構建 Prompt
    let promptContext = "";
    // 嘗試讀取全域變數中的上下文，若無則使用預設值
    let readableContent = (typeof currentContextContent !== 'undefined' ? currentContextContent : "") || "學生提交的作業";
    if (typeof readableContent === 'object') {
        try { readableContent = JSON.stringify(readableContent); } catch(e){}
    }
 
    if (typeof currentContextType !== 'undefined' && currentContextType === 'featured_discussion') {
        promptContext = readableContent;
    } else {
        // 限制長度以防 Token 爆掉
        promptContext = `【背景資料】\n${readableContent.substring(0, 1500)}\n\n【之前的點評】\n${(typeof currentContextReview !== 'undefined' ? currentContextReview : "").substring(0, 800)}...`;
    }
    
    // ★★★ 修改處：加入【負面約束】指令 ★★★
    const fullPrompt = `你是一位${activeReviewer}。${promptContext}
【對話紀錄】
${historyText}
【學生最新問題】
${userText}

【回應要求】
1. 針對問題具體舉例說明。
2. 語氣要求：${toneNote}，不要過份拘謹，要輕鬆幽默。
3. 字數200字內。
4. 【重要】請必須使用繁體中文(Traditional Chinese)回答，並使用香港用語。
5. 【重要】**嚴禁**在回應中包含任何括號註釋（例如：「（語氣親切）」、「（字數：150字）」等），請直接以對話形式回應學生，不要輸出多餘的系統資訊。`;
    
    try {
        // 統一使用 Reading API (DeepSeek)
        let response = await callReadingAPI(fullPrompt);

        // ★★★ 強制繁體化 (OpenCC) ★★★
        if (typeof OpenCC !== 'undefined') {
            const converter = OpenCC.Converter({ from: 'cn', to: 'tw' });
            response = converter(response);
        }

        // ★★★ 強制替換引號 (將 "" 或 “” 轉為 「」) ★★★
        response = response.replace(/["“](.*?)["”]/g, '「$1」');
        
        let formattedResponse = response.replace(/\n/g, '<br>');
        formattedResponse = formattedResponse.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        // 更新 UI
        aiBubble.innerHTML = formattedResponse;
        
        // 只有非精選文章討論才儲存到歷史紀錄
        if (typeof currentContextType === 'undefined' || currentContextType !== 'featured_discussion') {
            setTimeout(async () => {
                if (typeof updateHistoryChat === 'function') {
                    await updateHistoryChat();
                }
            }, 100);
        }
    } catch (error) {
        aiBubble.innerHTML = "抱歉，連線發生錯誤，請重試。";
        console.error(error);
    } finally {
        sendBtn.disabled = false; // 解鎖按鈕
        historyBox.scrollTop = historyBox.scrollHeight;
    }
}
	



// 注意：打開播放器的功能現在完全由側邊選單的 toggleMusicPlayer() 負責

// 預設寫作題目列表
const topics = [
"旁觀", "舞台", "這件物件很是輕巧，卻讓我明白『但求無愧於心』的道理。", "山頂", "種子", "根", "疤痕",
"今天，我不能參賽，只能坐在觀眾席上，但當時的所見所聞卻給予我嶄新的體會。", "從今以後，我不會再輕言放棄。",
"等候", "我曾經努力嘗試，但最終仍是事與願違", "回憶", "徹夜難眠", "彩虹",
"星空下，眼前的景象讓我想起那段往事，令我不禁歎了一口氣……", "路牌", "今學年最後悔的一件事",
"最令我感動的一句話", "再試一次", "今天再次在台上演奏，我已經脫胎換骨，不再是從前那個驕傲自滿的我了。",
"每次經過這條街，看着街上的景物，我便感觸不已……", "意外", "鑰匙", "錯過了的機會",
"那句話，我實在不該說……", "色彩", "煙火", "藥", "放下", "追逐", "原來，這只是一場誤會",
"缺憾", "無悔的抉擇", "勇氣", "傘", "自此之後，我明白到原來父母的愛總是體現在小事上。",
"一件令我後悔不已的事", "一次尷尬的經歷", "沿途有你", "這一次，我實在感到無地自容。",
"這一次，我明白到，原來幫助他人的同時，也幫助了自己。",
"我的鄰居張先生是一位很苛刻的人，經常會為些『小事』而投訴他人。但今天我發現，他這樣做是有原因的……",
"獨處的一天", "這一刻，我終於舒了一口氣。", "記一次被誤解的經歷", "一次與別人言歸于好的經歷",
"自此之後，我感到自己真的長大了。", "自此之後，我明白到幸福原來可以很簡單。", "記一次苦盡甘來的經歷。",
"這件事讓我體會到喜出望外的滋味。", "路標", "足印", "遺憾", "鎖", "面具", "心結", "門",
"影子", "禁區", "等待", "根", "最後，我選擇了放棄", "自那一刻，我解開了心結",
"自此之後，我明白猶豫會使人一事無成。", "原來我沒有忘記那一頓飯。", "我在大自然之中找到快樂。",
"熱鬧過後，我卻感到失落。", "看著逐漸遠去的背影，我感到很內疚。", "今天我流淚了，但我並非感到難過。",
"自此之後，我找到了動力", "經歷了這次風波，我長大了。",
"經過這件事，我才明白到一心是我的知己，是真正了解我的人。", "自此之後，我學會放下無謂的面子。",
"這一次，我再沒有遺憾", "重遊舊地所見有感", "失而復得", "這條街雖然老舊，但卻充滿人情味。",
"這句話，我會記上一輩子。", "門", "來日方長", "得不償失", "隱藏", "微笑以對",
"熱鬧過後，我卻感到失落。", "夢想看似不切實際，但其實很有意義", "夢想看似很有意義，其實不切實際",
"今天我沒有帶手提電話外出，因而有不一樣的經歷和體會。",
"今天發生了一件事情，當時我曾經想力陳己見，最後選擇了沉默。我認為沉默是必要的。",
"矛盾", "未兌現的諾言", "未寄出的信", "距離", "一場沒有失敗者的比賽", "一件發人深省的事",
"我最想保留的一本相簿", "我最想尋回的一件玩具", "無愧的抉擇", "不能掉下的眼淚", "無畏的探索",
"一次令我百感交集的聚餐", "如願以償"
];

// 預設議論題目列表（請在此處輸入您的題庫）
const argumentTopics = [
'所謂「天行有常，立身有本。」意思是大自然運行有既定的規律，人立身處世有一定的原則。試談談你對「立身有本」的看法。',
'旁觀',
'有人認為「人生在世，必須講究儀式。」你同意嗎？試撰文一篇，論述你的看法。',
'舞台',
'根',
'古人說：「君子不以人廢言。」意思是：君子不會因為某人的德行不好而不採納他的善意規勸。在現今社會，你是否同意「君子不以人廢言」？試談談你的看法。',
'計算',
'有人說：「在現今社會中，我們難以活出真我。」你同意嗎。談談你的看法。',
'俗語說「有競爭才有進步」，也有人說「競爭無用」。試寫作文章一篇，談談你對「競爭無用」的看法。',
'山頂',
'「種子」雖是平常事物，卻可以引起聯想，或牽動思緒，又或啟發思考。試以「種子」為題，就個人體會寫作文章一篇。',
'有人認為「挫敗更有利孩子成長。」你同意嗎？試撰文一篇，論述你的看法。',
'疤痕',
'試以「談玩物喪志」或「談玩物養志」為題，寫作文章一篇。',
'泰然處之',
'古語有云「天下皆知取之為取，而莫知與之為取。」意思是世人都知道索取可以獲得，而不知道給予也可以獲得。試談談你對這句話的看法。',
'談嚴苛',
'談寬容',
'談憤怒',
'待候',
'有人認為：「與其追求成功，不如追求幸福。」你同意嗎？試撰寫文章一篇，論述你的看法。',
'矛盾',
'有人認為：「保持距離能令關係長久。」你同意嗎？試撰文一篇，論述你的看法。',
'有人說：「近朱者赤，近墨者黑。」你同意嗎？為甚麼？',
'試以「當科技文明消失後」為題，寫一篇評論，反思科技發展帶來的影響。',
'成功路上無捷徑，試談談你的看法。',
'個人電子產品的普及化，有人認為是生活的進步，有人認為是生活的倒退。你較認同哪一種觀點？試談談你的看法。',
'有人認為即使心中不快，亦要以笑面對人；有人認為應以真性情對人，不應掩飾心中的感受，你較贊同哪一方？試談談你的看法。',
'鑰匙',
'貧乏與富足',
'論意外',
'試談談你對「聽天由命」這種處世態度的看法。',
'「天賜食於鳥，卻不投食於巢。」上天賜予鳥類覓食的本能，而不把食物投到鳥巢。意思是人需要通過努力，才能有所得。你認同嗎?試談談你的看法。',
'色彩',
'談藝術的價值',
'藥',
'有人說：「每次付出應該先計算回報。」你同意這種處事態度嗎？',
'論公德心的重要性',
'有人認為中學生應多參與課外活動，發展興趣；有人則認為應專注學業，爭取好成績。你較認同哪種說法？試談談你的看法。',
'你同意「品德比學問更重要」嗎？試寫一篇議論文，談談你的看法。',
'談競爭',
'談缺憾',
'談得失',
'談勇氣',
'得不償失',
'爺爺：「我當鐘錶匠超過50年，畢生專注這門手藝，能做到分毫不差。」允行：「我是品味生活的咖啡師，亦是書寫人生的作家，更是培育後進的武術教練。」各人對人生有不同追求。有人認為：「與其一生專精一事，不如發展多元人生。」你同意嗎？試撰文一篇，論述你的看法。',
'微笑以對',
'有人認為「傳統往往是創新的包袱」。試談談你對這句話的看法。',
'足印',
'古人說：「獨學而無友，則孤陋而寡聞。」意思是獨自學習，沒有朋友互相切磋解難，人便會淺陋而見識不廣。在現今的學習生活中，你是否同意「獨學而無友，則孤陋而寡聞」？試試談你的看法。',
'「不做第一，也不做最後。」試談談你對這種處世態度的看法。',
'試以「陽光與陰影」為題，寫作一篇文章。',
'「孩子不是等待被填滿的瓶子，而是盼望化作燃燒的火焰。」試就個人對這句話的體會 ，以「成長」為題，寫作一篇文章。',
'「今早媽媽打掃的時候，瞄一瞄玻璃窗外鄰居晾曬的衣服，便批評道：『看，那新鄰居真馬虎！衣服還是污漬斑斑，洗得一點也不乾淨。』女兒聽後，一言不發，走到窗前仔細打量，隨即抹掉窗上的灰塵，說道：『這不就乾淨了嗎？』媽媽恍然大悟，不乾淨的不是別人的衣服，而是自己的窗子。」試就這個故事對你的啓發，寫作一篇文章，談談如何消除偏見。',
'「一個寒冷的冬天，幾隻刺蝟擠在一起取暖。由於牠們身上長滿了短刺，彼此戳痛了對方，所以不得不散開。可是，寒冷的天氣又驅使牠們擠在一起，同樣的事情重複發生，牠們終於明白；不要太近，也不要太遠，最好彼此保持一定的距離。」這個故事的道理仍然貫穿在我們的現實生活中，試就此寫一篇文章。',
'個人私隱比公眾知情權更重要，你同意嗎？談談你的看法。',
'香港是一個物質生活十分富庶的地方，可是在多個國際性的調查中，「快樂指數」的排名並不高。有人認為富庶的物質生活反令人難以快樂；也有人認為富庶的物質生活是快樂的基礎。這兩種看法，你比較認同哪一種？試談談你的看法。',
'面對不同意見，有人認為應據理力爭，堅守立場；有人認為應彼此包容，求同存異。上述兩種態度，哪一種較為理想？試談談你的看法。',
'有人認為父母教養子女，應該給予空間，讓子女自由發展；有人認為應該給予明確的指導，讓子女依從。上述教養子女的方法，哪一種較為理想？試談談你的看法。',
'有人說：「與其追隨潮流，不如展現個人風格。」你對這句話有什麼看法？',
'有人說：「棒下出孝子，嚴師出高徒。」也有人說：「獎賞是教育的恩物。」你對這兩種說法有什麼意見？',
'現今社會，許多人認為財富與社會地位成正比，財富愈多，社會地位愈高。你的看法如何？',
'有人認為讚賞是成功的最大推動力，你同意嗎？試作文一篇，談談你的看法。',
'有人說：「豐裕的物質生活就是最美好的生活。」你同意嗎？試談談你的看法。',
'獲取知識是通往成功的唯一途徑，你同意嗎？試談談你的看法。',
'談談青年人應如何克服困難',
'「律己以嚴，待人以寬。」談談你對這話的看法。',
'「成功是恆心的基石」談談你對這話的看法。',
'論「家有一老，如有一寶」',
'送禮之我見',
'鄉村發展為工業區，原來的天然景物受到破壞。有人說：「有破壞才有建設。」也有人說：「這種建設破壞了人們生活的情趣。」你的看法又怎樣？試說出你個人的意見。'
];

let lastTopic = localStorage.getItem("lastTopic") || "";
let lastArgumentTopic = localStorage.getItem("lastArgumentTopic") || "";


// === 修訂：動漫卡片選擇邏輯 (包含音效) ===

// === 修訂：動漫卡片選擇邏輯 (包含音效 + 延遲動畫) ===

// === 修訂：動漫卡片選擇邏輯 (包含音效 + 延遲動畫) ===

// 1. 選取所有新的卡片元素
const categoryCards = document.querySelectorAll('.anime-card');
const clickSound = document.getElementById('ui-click-sound');

// 2. 為每個卡片添加點擊事件
categoryCards.forEach(card => {
    card.addEventListener('click', function(e) {
        // ★★★ 核心修復：使用 e.currentTarget 鎖定當前點擊的元素 ★★★
        const targetCard = e.currentTarget;

        // A. 播放清脆音效
        if (clickSound) {
            clickSound.currentTime = 0; 
            clickSound.volume = 1.0;    
            clickSound.play().catch(err => console.log("音效播放被瀏覽器阻擋:", err));
        }

        // B. 立即添加視覺效果 (讓卡片變色/發光)
        // 先移除所有動漫卡片的 active 樣式
        document.querySelectorAll('.anime-card').forEach(c => c.classList.remove('active'));
        
        // 只為當前點擊的這張卡片加上 active
        targetCard.classList.add('active');

        // C. 獲取目標 Container ID (確保有點擊到有 ID 的卡片)
        if (targetCard.id) {
            const containerId = targetCard.id.replace('Btn', 'Container');
            
            // D. 設置延遲，讓動畫跑完 500ms 後才切換畫面
            setTimeout(() => {
                showContainer(containerId, targetCard);
            }, 500); 
        }
    });
});


// === 沉浸式場景設定 ===
const scenes = {
    'home': 'https://i.ibb.co/xtsrPW6M/image.png', // 原本的主頁背景
    'writingContainer': '範疇一.png', // 寫作：書桌與筆
    'readingContainer': '範疇二.png', // 閱讀：圖書館
    'argumentContainer': '範疇三.png', // 議論：法院/木槌
    'expandContainer': '範疇四.png', // 拓展：協作/網絡
    'booksContainer': '範疇五.png' // 書籍：舒適閱讀角
};

// === 更新版：進入功能容器 (含自動置頂) ===
// === 更新版：進入功能容器 (含自動置頂 + 隱藏歷史紀錄) ===
function showContainer(containerId, clickedButton) {
    hideAllSaveHtmlButtons(); 
    
    // 1. 切換背景圖片 (支援圖片或純色)
    const bg = scenes[containerId];
    if (bg) {
        if (bg.startsWith('#') || bg.startsWith('rgb')) {
            document.body.style.backgroundImage = 'none';
            document.body.style.backgroundColor = bg;
        } else {
            document.body.style.backgroundImage = `url('${bg}')`;
            document.body.style.backgroundColor = ''; 
        }
    }

    // 2. 隱藏主選單元素
    document.querySelector('.title-container').style.display = 'none';
    document.getElementById('hitokoto-container').style.display = 'none';
    document.getElementById('mainMenuBox').style.display = 'none'; 
    document.getElementById('toolsBox').style.display = 'none';    
    
    // === 【新增】隱藏 DSE 倒數 ===
    const dseBox = document.getElementById('dse-countdown-box');
    if (dseBox) dseBox.style.display = 'none';
    // ===========================

    // 3. 修改這部分：隱藏左上角的圓形返回按鈕
    document.getElementById('homeBtn').style.display = 'none'; 
    document.getElementById('sideMenuHomeBtn').style.display = 'flex';

    // 4. 清除狀態與隱藏其他容器
    const allCards = document.querySelectorAll('.anime-card');
    allCards.forEach(card => card.classList.remove('active'));
    if (clickedButton) clickedButton.classList.add('active');

    clearAllTopicStates();

    const containers = ['writingContainer', 'readingContainer', 'booksContainer', 'expandContainer', 'argumentContainer'];
    containers.forEach(id => document.getElementById(id).style.display = "none");

    // ★★★ 新增：確保歷史紀錄隱藏 ★★★
    const historyContainer = document.getElementById('historyContainer');
    if (historyContainer) historyContainer.style.display = 'none';

    // 5. 強制滾動到頁面最頂端
    window.scrollTo({ top: 0, behavior: 'instant' });

    // 6. 顯示目標容器 (淡入動畫)
    const targetContainer = document.getElementById(containerId);
    if (targetContainer) {
        targetContainer.style.display = "block";
        targetContainer.style.opacity = '0';
        targetContainer.style.transform = 'translateY(20px)';
        
        // 觸發重繪 (Reflow) 確保 transition 生效
        void targetContainer.offsetWidth; 

        targetContainer.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        targetContainer.style.opacity = '1';
        targetContainer.style.transform = 'translateY(0)';
    }

    // 7. 初始化特定功能
    if (containerId === "writingContainer") { toggleWritingType(); loadOutline(); }
    else if (containerId === "readingContainer") { toggleReadingFunction(); }
    else if (containerId === "expandContainer") { toggleExpandFunction(); }
    else if (containerId === "booksContainer") { loadBooksChat(); }
    else if (containerId === "argumentContainer") { toggleArgumentType(); }
}


// === 更新版：返回主頁函式 ===
function returnToHome() {
    // 1. 恢復主頁背景
    document.body.style.backgroundImage = `url('${scenes['home']}')`;

    // 2. 確保懸浮編輯視窗被關閉
    const outlineModal = document.getElementById('outline-editor-modal');
    if (outlineModal) {
        outlineModal.style.display = 'none';
    }
    if (typeof currentEditingElement !== 'undefined') {
        currentEditingElement = null;
    }

    // 3. ★★★ 關鍵修正：加入 'historyContainer' 到隱藏列表 ★★★
    const containers = ['writingContainer', 'readingContainer', 'booksContainer', 'expandContainer', 'argumentContainer', 'historyContainer'];
    containers.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = "none";
    });

    // 4. ★★★ 額外修正：強制關閉歷史詳情模態視窗 ★★★
    const historyModal = document.getElementById('historyModal');
    if (historyModal) {
        historyModal.style.display = 'none';
    }

    // 5. ★★★ 額外修正：重置歷史紀錄介面至第一層 (範疇選擇)，避免下次打開時停留在舊紀錄 ★★★
    const histL1 = document.getElementById('historyLevel1Wrapper');
    const histL2 = document.getElementById('historyLevel2');
    const histL3 = document.getElementById('historyLevel3');
    const histBread = document.getElementById('historyBreadcrumb');
    
    if (histL1) histL1.style.display = 'flex'; // 恢復顯示第一層
    if (histL2) histL2.style.display = 'none';
    if (histL3) histL3.style.display = 'none';
    if (histBread) histBread.style.display = 'none'; // 隱藏麵包屑

    // 6. 顯示主頁元素
    document.querySelector('.title-container').style.display = 'block';
    document.getElementById('hitokoto-container').style.display = 'block';
    document.getElementById('mainMenuBox').style.display = 'block';
    document.getElementById('toolsBox').style.display = 'block';

    // 7. 重新顯示 DSE 倒數
    const dseBox = document.getElementById('dse-countdown-box');
    if (dseBox) dseBox.style.display = 'flex';

    // 8. 隱藏返回按鈕
    document.getElementById('sideMenuHomeBtn').style.display = 'none';
    document.getElementById('homeBtn').style.display = 'none';

    // 9. 移除所有卡片 active 狀態
    document.querySelectorAll('.anime-card').forEach(card => card.classList.remove('active'));

    // 10. 強制隱藏「工具一覽」
    const toolsContainer2 = document.getElementById('toolsContainer2');
    if (toolsContainer2) {
        toolsContainer2.style.display = 'none';
        document.body.style.overflow = 'auto';
    }

    // 11. 收起側邊選單
    const sideMenu = document.getElementById('sideMenu');
    if (sideMenu && sideMenu.classList.contains('active')) {
        sideMenu.classList.remove('active');
        document.getElementById('sideMenuToggle').classList.remove('active');
    }

    // 12. 隱藏所有儲存按鈕
    hideAllSaveHtmlButtons();

    // 13. 強制滾動到頂部
    window.scrollTo({ top: 0, behavior: 'instant' });
    
    // 14. 確保舊版工具箱隱藏
    const toolsBox = document.getElementById('toolsBox');
    if (toolsBox) {
        toolsBox.style.display = 'none'; 
    }
}
// 新增此函式：用於顯示議論的自訂題目介面
// 新增此函式：用於顯示議論的自訂題目介面 (已修訂：加入 Toggle 開關邏輯)
function showArgumentCustomTopicInput(buttonElement) { 
    // --- 1. Toggle 邏輯 ---
    if (buttonElement && buttonElement.classList.contains('active')) {
        buttonElement.classList.remove('active');
        
        const customTopicArea = document.getElementById("argumentCustomTopicArea");
        customTopicArea.style.display = "none";
        customTopicArea.innerHTML = "";
        
        const topicResult = document.getElementById("argumentTopicResult");
        topicResult.style.display = "none";
        topicResult.innerHTML = "";
        
        localStorage.removeItem("argumentCurrentTopic");
        return;
    }

    // --- 2. 正常開啟邏輯 ---
    if (buttonElement) {
        updateButtonActiveState(buttonElement);
    }

    const customTopicArea = document.getElementById("argumentCustomTopicArea");
    const topicResult = document.getElementById("argumentTopicResult");

    topicResult.innerHTML = "";
    topicResult.style.display = "none";
    localStorage.removeItem("argumentCurrentTopic");

    customTopicArea.innerHTML = `
    <input type="text" id="argumentCustomTopic" class="no-modal-editor" placeholder="請輸入自訂題目">
    <button class="btn-icon-confirm" onclick="setArgumentCustomTopic()" title="確認題目">
    <i class="fas fa-check"></i>
    </button>
    `;
    customTopicArea.style.display = "block";
}

// 切換寫作類型
function toggleWritingType() {
    hideAllSaveHtmlButtons();
    clearAllTopicStates();
    const writingType = document.getElementById("writingType").value;
    const contentContainer = document.getElementById("writingContentContainer");

    // 獲取所有相關區域
    const writingGuideArea = document.getElementById("writingGuideArea");
    const outlineStructureArea = document.getElementById("outlineStructureArea");
    const narrativeElementsArea = document.getElementById("narrativeElementsArea");
    const topicSelectionArea = document.getElementById("topicSelectionArea");
    const writingArea = document.getElementById("writingArea");
    const submitWritingBtn = document.getElementById("submitWritingBtn");

    // 重置狀態
    document.getElementById("writingGradingResult").innerHTML = "";
    document.getElementById("writingChatHistory").style.display = "none";

    if (writingType) {
        contentContainer.style.display = "block";
    } else {
        contentContainer.style.display = "none";
        return;
    }

    // 預設隱藏所有特定區域
    writingGuideArea.style.display = "none";
    outlineStructureArea.style.display = "none";
    narrativeElementsArea.style.display = "none";
    topicSelectionArea.style.display = "none"; 
    writingArea.style.display = "none"; 

    if (writingType === "guide") {
        writingGuideArea.style.display = "block";
        // 解題指引不使用通用的寫作區域
    } 
    else if (writingType === "大綱") {
        writingArea.style.display = "block";
        topicSelectionArea.style.display = "block";
        outlineStructureArea.style.display = "block";
        document.getElementById("outlineTableArea").style.display = "block";
        generateOutlineTable();
        loadOutline();
        
        document.getElementById("writingContent").style.display = "none";
        document.getElementById("writingToneLabel").style.display = "block";
        document.getElementById("writingTone").style.display = "block";
        document.getElementById("outlineButtons").style.display = "flex"; 
        document.getElementById("writingReviewerLabel").style.display = "none";
        document.getElementById("writingReviewer").style.display = "none";
        document.getElementById("reviewScopeArea").style.display = "none";
        submitWritingBtn.style.display = "block";
    } 
    else if (writingType === "敘事物象") {
        writingArea.style.display = "block";
        topicSelectionArea.style.display = "block";
        narrativeElementsArea.style.display = "block";
        
        document.getElementById("writingContent").style.display = "none";
        document.getElementById("outlineTableArea").style.display = "none";
        document.getElementById("writingToneLabel").style.display = "none";
        document.getElementById("writingTone").style.display = "none";
        document.getElementById("outlineButtons").style.display = "none";
        document.getElementById("writingReviewerLabel").style.display = "none";
        document.getElementById("writingReviewer").style.display = "none";
        document.getElementById("reviewScopeArea").style.display = "none";
        submitWritingBtn.style.display = "block";
    } 
    else { // 片段描寫
        writingArea.style.display = "block";
        topicSelectionArea.style.display = "block";
        document.getElementById("writingContent").style.display = "block";
        
        document.getElementById("outlineTableArea").style.display = "none";
        document.getElementById("writingToneLabel").style.display = "block";
        document.getElementById("writingTone").style.display = "block";
        document.getElementById("outlineButtons").style.display = "none";
        document.getElementById("writingReviewerLabel").style.display = "block";
        document.getElementById("writingReviewer").style.display = "block";
        document.getElementById("reviewScopeArea").style.display = "block";
        submitWritingBtn.style.display = "block";
    }
}


// 原 showCustomTopicInput() 函式
// 原 showCustomTopicInput() 函式 (已修訂：加入 Toggle 開關邏輯)
function showCustomTopicInput(buttonElement) {
    // --- 1. Toggle 邏輯：如果按鈕已經是 Active 狀態，則關閉它 ---
    if (buttonElement && buttonElement.classList.contains('active')) {
        // 移除 Active 狀態
        buttonElement.classList.remove('active');
        
        // 隱藏輸入區
        const customTopicArea = document.getElementById("customTopicArea");
        customTopicArea.style.display = "none";
        customTopicArea.innerHTML = ""; // 清空內容
        
        // 隱藏結果區 (因為取消了選擇)
        const topicResult = document.getElementById("topicResult");
        topicResult.style.display = "none";
        topicResult.innerHTML = "";
        
        // 清除相關 LocalStorage
        localStorage.removeItem("currentTopic");
        localStorage.removeItem("currentFocus");
        localStorage.removeItem("currentPlot");
        
        return; // 結束函式
    }

    // --- 2. 正常開啟邏輯 ---
    if (buttonElement) {
        updateButtonActiveState(buttonElement);
    }

    const writingType = document.getElementById("writingType").value;
    const customTopicArea = document.getElementById("customTopicArea");
    const topicResult = document.getElementById("topicResult");

    topicResult.innerHTML = "";
    topicResult.style.display = "none";
    localStorage.removeItem("currentTopic");
    localStorage.removeItem("currentFocus");
    localStorage.removeItem("currentPlot");

    if (writingType === "片段描寫") {
        customTopicArea.innerHTML = `
        <table>
        <tr><th colspan="2">自訂題目與重點</th></tr>
        <tr><td colspan="2"><input type="text" id="customTitle" class="no-modal-editor" placeholder="請輸入自訂題目"></td></tr>
        <tr><td>扣題方向</td><td>情節大要</td></tr>
        <tr><td><textarea id="customFocus" class="no-modal-editor" rows="3" placeholder="請輸入扣題方向"></textarea></td>
        <td><textarea id="customPlot" class="no-modal-editor" rows="3" placeholder="請輸入情節大要"></textarea></td></tr>
        </table>
        <button class="btn-icon-confirm" onclick="setCustomTopic()" title="確認題目">
        <i class="fas fa-check"></i>
        </button>
        `;
    } else { 
        customTopicArea.innerHTML = `
        <input type="text" id="customTopic" class="no-modal-editor" placeholder="請輸入自訂題目">
        <button class="btn-icon-confirm" onclick="setCustomTopic()" title="確認題目">
        <i class="fas fa-check"></i>
        </button>
        `;
    }
    customTopicArea.style.display = "block";
}

// 保存大綱
function saveOutline() {
const structure = document.getElementById("structure").value;
const parts = structure === "fourPart" ? ["起", "承", "轉", "合"] : ["起", "一線", "二線", "三線", "合"];
const outlineData = parts.map((part, index) => {
const focusId = structure + "Focus" + (index + 1);
const plotId = structure + "Plot" + (index + 1);
const focus = document.getElementById(focusId)?.value.trim() || "";
const plot = document.getElementById(plotId)?.value.trim() || "";
return { part, focus, plot };
});
localStorage.setItem("outlineData", JSON.stringify(outlineData));
localStorage.setItem("outlineStructure", structure);
alert("大綱已儲存");
}

// 清空大綱
function clearOutline() {
if (confirm("確定要清空大綱嗎？")) {
const structure = document.getElementById("structure").value;
const parts = structure === "fourPart" ? ["起", "承", "轉", "合"] : ["起", "一線", "二線", "三線", "合"];
parts.forEach((part, index) => {
const focusId = structure + "Focus" + (index + 1);
const plotId = structure + "Plot" + (index + 1);
if (document.getElementById(focusId)) document.getElementById(focusId).value = "";
if (document.getElementById(plotId)) document.getElementById(plotId).value = "";
});
localStorage.removeItem("outlineData");
localStorage.removeItem("outlineStructure");
}
}

// 加載大綱
function loadOutline() {
const savedStructure = localStorage.getItem("outlineStructure");
const savedData = localStorage.getItem("outlineData");
if (savedStructure && savedData) {
document.getElementById("structure").value = savedStructure;
generateOutlineTable();
try {
const parsedData = JSON.parse(savedData);
parsedData.forEach((item, index) => {
const focusId = savedStructure + "Focus" + (index + 1);
const plotId = savedStructure + "Plot" + (index + 1);
const focusElement = document.getElementById(focusId);
const plotElement = document.getElementById(plotId);
if (focusElement) focusElement.value = item.focus;
if (plotElement) plotElement.value = item.plot;
});
} catch (e) {
console.error("Error parsing outlineData:", e);
}
}
}

// 保存課外書籍對話
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


/**
* 更新最後一條 AI 訊息的內容（從 "正在回應..." 到實際的回應）。
* 這個新版本能處理帶有頭像和氣泡的複雜 HTML 結構。
* @param {string} newMessage - 從 API 獲取到的新訊息內容。
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


// 切換閱讀功能
function toggleReadingFunction() {
    hideAllSaveHtmlButtons(); // <-- 在這裡加入函式呼叫
    clearAllTopicStates();
    const readingFunction = document.getElementById("readingFunction").value;
    
    // 新增：處理「訓練」選項，直接跳轉
    if (readingFunction === "training") {
        window.location.href = "toolbox/interpretation.html";
        return;  // 立即返回，避免執行後續邏輯
    }
    
    const contentContainer = document.getElementById("readingInputArea");
    if (readingFunction) {
        contentContainer.style.display = "block";
    } else {
        contentContainer.style.display = "none";
        return; // 如果沒有選擇，則停止執行
    }
    
    const studentAnswerArea = document.getElementById("studentAnswerArea");
    const readingToneLabel = document.getElementById("readingToneLabel");
    const readingTone = document.getElementById("readingTone");
    if (readingFunction === "comment") {
        studentAnswerArea.style.display = "block";
        readingToneLabel.style.display = "block";
        readingTone.style.display = "block";
    } else {
        studentAnswerArea.style.display = "none";
        readingToneLabel.style.display = "none";
        readingTone.style.display = "none";
    }
}


// 請用這個新版本的函式，替換掉您原本的 toggleExpandFunction
function toggleExpandFunction() {
hideAllSaveHtmlButtons(); // <-- 在這裡加入函式呼叫
clearAllTopicStates(); // 這行很好，保持不變

const expandFunction = document.getElementById("expandFunction").value;
const contentContainer = document.getElementById("expandContentContainer");

if (expandFunction) {
contentContainer.style.display = "block";
} else {
contentContainer.style.display = "none";
return;
}

const expandWritingArea = document.getElementById("expandWritingArea");
const expandGuideArea = document.getElementById("expandGuideArea");
const expandTopicSelectionArea = document.getElementById("expandTopicSelectionArea");
const expandToneLabel = document.getElementById("expandToneLabel");
const expandTone = document.getElementById("expandTone");

// 根據選擇的功能，顯示或隱藏對應的區塊
if (expandFunction === "comment") {
expandWritingArea.style.display = "block";
expandGuideArea.style.display = "none";
expandTopicSelectionArea.style.display = "block"; // 顯示我們新的按鈕區塊
expandToneLabel.style.display = "block";
expandTone.style.display = "block";

// 確保自訂題目輸入區預設是隱藏的
const customInputArea = document.getElementById("expandCustomTopicInputArea");
if(customInputArea) {
customInputArea.style.display = 'none';
customInputArea.innerHTML = '';
}

} else { // "guide"
expandWritingArea.style.display = "none";
expandGuideArea.style.display = "block";
expandTopicSelectionArea.style.display = "none";
expandToneLabel.style.display = "none";
expandTone.style.display = "none";
}
}
// 新增此函式：用於顯示整合拓展的自訂題目介面
// 新增此函式：用於顯示整合拓展的自訂題目介面 (已修訂：加入 Toggle 開關邏輯)
function showExpandCustomTopicInput(buttonElement) {
    // --- 1. Toggle 邏輯 ---
    if (buttonElement && buttonElement.classList.contains('active')) {
        buttonElement.classList.remove('active');
        
        const customTopicArea = document.getElementById("expandCustomTopicInputArea");
        customTopicArea.style.display = "none";
        customTopicArea.innerHTML = "";
        
        const topicResult = document.getElementById("expandTopicResult");
        topicResult.style.display = "none";
        topicResult.innerHTML = "";
        
        localStorage.removeItem("expandCurrentTitle");
        localStorage.removeItem("expandCurrentTheme");
        localStorage.removeItem("expandCurrentData");
        
        return;
    }

    // --- 2. 正常開啟邏輯 ---
    if (buttonElement) {
        updateButtonActiveState(buttonElement);
    }

    const customTopicArea = document.getElementById("expandCustomTopicInputArea");
    const topicResult = document.getElementById("expandTopicResult");

    topicResult.innerHTML = "";
    topicResult.style.display = "none";
    localStorage.removeItem("expandCurrentTitle");
    localStorage.removeItem("expandCurrentTheme");
    localStorage.removeItem("expandCurrentData");

    // 動態生成自訂題目的輸入表格和確認按鈕
    customTopicArea.innerHTML = `
    <table>
    <tr><th>題目</th><td><input type="text" id="expandCustomTitle" class="no-modal-editor" placeholder="請輸入題目"></td></tr>
    <tr><th>主題句</th><td><textarea id="expandCustomTheme" class="no-modal-editor" rows="2" placeholder="請輸入主題句"></textarea></td></tr>
    <tr><th>抄錄資料</th><td><textarea id="expandCustomData" class="no-modal-editor" rows="3" placeholder="請輸入抄錄資料"></textarea></td></tr>
    </table>
    <button class="btn-icon-confirm" onclick="setExpandCustomTopic()" title="確認題目">
    <i class="fas fa-check"></i>
    </button>
    `;
    customTopicArea.style.display = "block";
}


// 切換議論功能
function toggleArgumentType() {
    hideAllSaveHtmlButtons();
    clearAllTopicStates();

    const argumentType = document.getElementById("argumentType").value;
    const contentContainer = document.getElementById("argumentContentContainer");

    // ======= 【核心修訂】獲取所有新增的元素 =======
    const reviewScopeArea = document.getElementById("argumentReviewScopeArea");
    const gradingResultDiv = document.getElementById("argumentGradingResult");
    const chatHistoryDiv = document.getElementById("argumentChatHistory");
    const chatInputContainer = document.getElementById("argumentChatInputContainer");

    // 在切換時，重置並隱藏所有結果與聊天介面
    gradingResultDiv.innerHTML = "";
    chatHistoryDiv.innerHTML = "";
    chatHistoryDiv.style.display = "none";
    chatInputContainer.style.display = "none";
    reviewScopeArea.style.display = "none";
    // ==========================================

    if (argumentType) {
        contentContainer.style.display = "block";
    } else {
        contentContainer.style.display = "none";
        return;
    }

    const outlineArea = document.getElementById("argumentOutlineArea");
    const writingArea = document.getElementById("argumentWritingArea");
    const guideArea = document.getElementById("argumentGuideArea");
    const topicSelectionArea = document.getElementById("argumentTopicSelectionArea");

    if (argumentType === "outline") {
        outlineArea.style.display = "block";
        writingArea.style.display = "none";
        guideArea.style.display = "none";
        topicSelectionArea.style.display = "block";
        generateArgumentOutlineTable();
    } else if (argumentType === "writing") {
        outlineArea.style.display = "none";
        writingArea.style.display = "block";
        guideArea.style.display = "none";
        topicSelectionArea.style.display = "block";
        reviewScopeArea.style.display = "block"; // 【修訂】在文章點評模式下顯示範疇選擇
    } else if (argumentType === "guide") {
        outlineArea.style.display = "none";
        writingArea.style.display = "none";
        guideArea.style.display = "block";
        topicSelectionArea.style.display = "none";
    }
}

// 生成議論題目
async function generateArgumentTopic(buttonElement) { 
if (buttonElement) {
updateButtonActiveState(buttonElement);
}

const customTopicArea = document.getElementById("argumentCustomTopicArea");
customTopicArea.style.display = "none";
customTopicArea.innerHTML = "";

const topicResult = document.getElementById("argumentTopicResult");
topicResult.style.display = 'block';

let selectedTopic;
do {
selectedTopic = argumentTopics[Math.floor(Math.random() * argumentTopics.length)];
} while (selectedTopic === lastArgumentTopic && argumentTopics.length > 1);
lastArgumentTopic = selectedTopic;

localStorage.setItem("lastArgumentTopic", lastArgumentTopic);
topicResult.innerHTML = "<strong>" + selectedTopic + "</strong>";
localStorage.setItem("argumentCurrentTopic", selectedTopic);
}




// 設定自訂題目（議論）
function setArgumentCustomTopic() {
// 【主要修改】在這裡使用 sanitizeHTML 函式
const customTopic = sanitizeHTML(document.getElementById("argumentCustomTopic").value.trim());
if (!customTopic) {
alert("請輸入自訂題目");
return;
}

const topicResult = document.getElementById("argumentTopicResult");
topicResult.innerHTML = "<strong>" + customTopic + "</strong>"; // <- 現在安全了
localStorage.setItem("argumentCurrentTopic", customTopic);

// 【核心修訂】強制讓題目結果區塊顯示出來
topicResult.style.display = "block"; 

// 隱藏並清空輸入區域
const customTopicArea = document.getElementById("argumentCustomTopicArea");
customTopicArea.style.display = "none";
customTopicArea.innerHTML = "";
}
// 生成議論大綱表格
function generateArgumentOutlineTable() {
const savedData = localStorage.getItem("argumentOutlineData");
let outlineData = [];
if (savedData) {
try {
outlineData = JSON.parse(savedData);
} catch (e) {
console.error("Error parsing argumentOutlineData:", e);
}
}
if (outlineData.length === 0) {
outlineData = [
{ part: "起", point: "", evidence: "" },
{ part: "結構段一", point: "", evidence: "" },
{ part: "結構段二", point: "", evidence: "" },
{ part: "結構段三", point: "", evidence: "" },
{ part: "合", point: "", evidence: "" }
];
}
let tableHTML = "<div class='table-container'><table id='argumentOutlineTable'><tr><th>部份</th><th>論點</th><th>論據及論證</th></tr>";
outlineData.forEach((item, index) => {
tableHTML += `<tr><td>${item.part}</td><td><textarea id="argumentPoint${index}" rows="3">${item.point}</textarea></td><td><textarea id="argumentEvidence${index}" rows="3">${item.evidence}</textarea></td></tr>`;
});
tableHTML += "</table></div>";
document.getElementById("argumentOutlineTableArea").innerHTML = tableHTML;
}

function addArgumentStructureSegment() {
const table = document.getElementById("argumentOutlineTable");
const rows = table.rows;
let structureSegmentCount = 0;
for (let i = 1; i < rows.length - 1; i++) { // 跳過表頭和「合」
if (rows[i].cells[0].innerText.startsWith("結構段")) {
structureSegmentCount++;
}
}
const newSegmentNumber = structureSegmentCount + 1;
const chineseNumbers = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];
const segmentName = `結構段${chineseNumbers[newSegmentNumber - 1] || newSegmentNumber}`;
const newRowIndex = rows.length - 1; // 在「合」之前插入
const newRow = table.insertRow(newRowIndex);
const cell1 = newRow.insertCell(0);
const cell2 = newRow.insertCell(1);
const cell3 = newRow.insertCell(2);
cell1.innerText = segmentName;
cell2.innerHTML = `<textarea id="argumentPoint${newRowIndex - 1}" rows="3"></textarea>`;
cell3.innerHTML = `<textarea id="argumentEvidence${newRowIndex - 1}" rows="3"></textarea>`;
}

// 保存議論大綱
function saveArgumentOutline() {
const table = document.getElementById("argumentOutlineTable");
const rows = table.rows;
const outlineData = [];
for (let i = 1; i < rows.length; i++) { // 跳過表頭
const part = rows[i].cells[0].innerText;
const pointTextarea = rows[i].cells[1].querySelector("textarea");
const evidenceTextarea = rows[i].cells[2].querySelector("textarea");
const point = pointTextarea ? pointTextarea.value.trim() : "";
const evidence = evidenceTextarea ? evidenceTextarea.value.trim() : "";
outlineData.push({ part, point, evidence });
}
localStorage.setItem("argumentOutlineData", JSON.stringify(outlineData));
alert("大綱已儲存");
}

// 清空議論大綱
function clearArgumentOutline() {
if (confirm("確定要清空大綱嗎？")) {
const table = document.getElementById("argumentOutlineTable");
const rows = table.rows;
for (let i = 1; i < rows.length; i++) {
document.getElementById(`argumentPoint${i - 1}`).value = "";
document.getElementById(`argumentEvidence${i - 1}`).value = "";
}
localStorage.removeItem("argumentOutlineData");
}
}

// === 修正版：提交議論指引 (移除前端不存在的 categories 引用) ===
async function submitArgumentGuide() {
    const submitBtn = document.getElementById('submitArgumentGuideBtn');
    if (!submitBtn) return;
    
    submitBtn.disabled = true;
    hideAllSaveHtmlButtons();
 
    try {
        const topic = document.getElementById("argumentGuideTopic").value.trim();
        const point = document.getElementById("argumentGuidePoint").value.trim();
        const evidence = document.getElementById("argumentGuideEvidence").value.trim();
        const argument = document.getElementById("argumentGuideArgument").value.trim();
        
        if (!topic) {
            alert("請輸入題目");
            submitBtn.disabled = false;
            return;
        }
 
        showLoading("陳SIR 正在編寫指引...");
        
        // 傳送數據至後端 (已移除 categories 引用)
        const payload = {
            action: "grade_argument",
            data: {
                subType: "guide",
                topic: topic,
                point: point || "無",
                evidence: evidence || "無",
                argument: argument || "無"
            }
        };
 
        const guide = await callReadingAPI(payload);
        
        currentContextContent = `題目：${topic}\n論點：${point}\n論據：${evidence}\n論證：${argument}`;
        currentContextReview = guide;
 
        // --- 組裝 HTML ---
        const guideParts = guide.split("###").map(part => part.trim()).filter(part => part);
        
        let guideHTML = `
            <div class="morandi-guide-container">
                <div style="margin-bottom: 20px; border-bottom: 1px solid #e0ddd7; padding-bottom: 10px;">
                    <h2 style="color: #5e7067; font-size: 1.4rem; letter-spacing: 2px; margin: 0;">${topic}</h2>
                </div>
        `;
 
        guideParts.forEach(part => {
            const lines = part.split("\n").filter(line => line.trim());
            const title = lines.shift() || "指引內容";
            // 處理換行，讓段落分明但不過寬
            const content = lines.join("<br>");
 
            guideHTML += `
                <div class="guide-section-card">
                    <div class="guide-card-header">${title}</div>
                    <div class="guide-card-body">${content}</div>
                </div>
            `;
        });
 
        guideHTML += `</div>`;
 
        // 加入追問聊天室
        guideHTML += getCanvasChatHTML('argument_guide');
 
        // 開啟結果畫布
        openResultCanvas("議論文寫作指引");
        document.getElementById("resultCanvasBody").innerHTML = guideHTML;
 
        // 儲存至歷史紀錄
        await saveToHistory("議論", "指引", topic, `題目：${topic}\n論點：${point}\n論據：${evidence}\n論證：${argument}`, guideHTML);
        
    } catch (error) {
        console.error("提交指引時出錯:", error);
        alert("指引生成失敗，請重試");
    } finally {
        submitBtn.disabled = false;
        hideLoading();
    }
}

// ==========================================
// === 議論文提交函式 (單系統) ===
// ==========================================

// ==========================================
// === 議論文提交函式 (單系統) ===
// ==========================================

// ==========================================
// === 議論文提交函式 (單系統) ===
// ==========================================

async function submitArgumentWriting() {
    const submitBtn = document.getElementById('submitArgumentWritingBtn');
    submitBtn.disabled = true;
    hideAllSaveHtmlButtons();

    const gradingResultDiv = document.getElementById("argumentGradingResult");
    const chatHistoryDiv = document.getElementById("argumentChatHistory");
    const chatInputContainer = document.getElementById("argumentChatInputContainer");
    if(gradingResultDiv) gradingResultDiv.innerHTML = "";
    if(chatHistoryDiv) chatHistoryDiv.style.display = "none";
    if(chatInputContainer) chatInputContainer.style.display = "none";
    argumentChatHistoryData = [];

    try {
        const reviewerSelect = document.getElementById('argumentReviewer');
        const selectedReviewerText = reviewerSelect.options[reviewerSelect.selectedIndex].text;
        currentReviewerName = selectedReviewerText.replace(/\s*\(預設\)\s*/, '');

        const topic = localStorage.getItem("argumentCurrentTopic");
        if (!topic) { alert("請先設定題目"); submitBtn.disabled = false; return; }
        const content = document.getElementById("argumentWritingContent").value.trim();
        if (!content) { alert("請輸入您的文章"); submitBtn.disabled = false; return; }
        
        currentArgumentArticle = content;
        const tone = document.getElementById("argumentWritingTone").value;
        const selectedScopes = Array.from(document.querySelectorAll('input[name="argumentReviewScope"]:checked')).map(cb => cb.value);
        const isFullReview = selectedScopes.includes("全部") || selectedScopes.length === 0;

        showLoading(`${currentReviewerName} 正在點評...`); // 更新提示

        // ★★★ RAG 邏輯 (已更新) ★★★
        const ragReference = await searchSimilarEssays(content, 'argument');

        // ★★★ 修正處：已移除 argumentReviewerPreferences 的讀取 ★★★
        // 因為此變數已移至後端 Code.gs

        // ★★★ 關鍵修改：Prompt 結構重組 (移除前端注入的偏好) ★★★
        const finalPromptContent = `
【系統強制指令 (System Instruction)】
1. **必須使用繁體中文 (Traditional Chinese)**：無論參考資料是簡體或繁體，你的所有輸出都必須是繁體中文。
2. **專業術語**：請使用香港高中中文科議論文術語（如：論點、論據、論證、語例、設例等）。
3. **區分參考與正文**：下方的【參考資料】僅供參考，請只對【待評核學生文章】進行評分。
4. **格式嚴格**：嚴格遵守 JSON/XML 輸出格式，不要輸出其他文字。
5. **閱卷員風格**：請嚴格根據後端系統指示的【閱卷員特定評分取向】進行評分及撰寫點評，務必體現該閱卷員重視的特點。

${ragReference ? ragReference : "(本次未檢索到參考範文)"}

=== 📝 待評核學生文章 (Target Student Essay) ===
${content}
`;

        // ★ 建構 Payload
        const payload = {
            action: "grade_argument",
            data: {
                subType: "writing", 
                isFullReview: isFullReview,
                topic: topic,
                content: finalPromptContent, // 傳送組合好的 Prompt
                reviewer: document.getElementById('argumentReviewer').value, // 後端會根據此 ID 讀取設定
                tone: tone,
                selectedScopes: selectedScopes
            }
        };
        
        // 議論文通常使用 Reading API (DeepSeek) 處理複雜邏輯
        const response = await callReadingAPI(payload, 0); 
        
        currentContextContent = content;
        currentContextReview = response;

        if (isFullReview) {
            await displayFullCommentWithGrading('argumentGradingResult', response, null, 'argument', content);
        } else {
            // 聚焦點評處理
            const critiqueMatch = response.match(/<critique>([\s\S]*?)<\/critique>/);
            const suggestionsMatch = response.match(/<suggestions>([\s\S]*?)<\/suggestions>/);
            let initialReviewHTML = `<h3>${currentReviewerName}聚焦點評：</h3>`;
            if (critiqueMatch?.[1]) initialReviewHTML += createBulletedListHTML("點評", critiqueMatch[1].trim());
            if (suggestionsMatch?.[1]) initialReviewHTML += createBulletedListHTML("建議", suggestionsMatch[1].trim());
            if (!critiqueMatch && !suggestionsMatch) initialReviewHTML += "<p>抱歉，無法生成點評。</p>";
            
            initialReviewHTML += getCanvasChatHTML('argument_writing');
            openResultCanvas("聚焦點評結果");
            document.getElementById("resultCanvasBody").innerHTML = initialReviewHTML;
            
            const htmlToSave = captureContainerHTML('resultCanvasBody'); 
            saveToHistory("議論", "文章點評", topic || "無題目", `題目：${topic}\n\n文章：${content}\n(聚焦點評：${selectedScopes.join("、")})`, htmlToSave);
        }

    } catch (error) {
        console.error("提交文章時出錯:", error);
        alert("點評生成失敗，請重試");
    } finally {
        submitBtn.disabled = false;
        hideLoading();
    }
}

// =========================================
// === [修復] 議論文大綱提交 (歷史紀錄只顯示題目) ===
// =========================================
async function submitArgumentOutline() {
    const submitBtn = document.getElementById('submitArgumentOutlineBtn');
    submitBtn.disabled = true;
    hideAllSaveHtmlButtons();

    try {
        const topic = localStorage.getItem("argumentCurrentTopic");
        if (!topic) { alert("請先設定題目"); submitBtn.disabled = false; return; }

        // 收集用戶輸入的大綱數據
        const table = document.getElementById("argumentOutlineTable");
        const rows = table.rows;
        const outlineData = [];
        
        // 構建給 AI 讀的上下文 (包含詳細內容)
        let readableContext = `題目：${topic}\n\n`;
        
        // 從第二行開始 (跳過表頭)
        for (let i = 1; i < rows.length; i++) {
            const part = rows[i].cells[0].innerText.trim();
            const point = rows[i].cells[1].querySelector("textarea")?.value.trim() || "";
            const evidence = rows[i].cells[2].querySelector("textarea")?.value.trim() || "";
            
            outlineData.push({ part, point, evidence });
            
            // 累加到上下文文字 (給聊天室用)
            if(point || evidence) {
                readableContext += `【${part}】\n論點：${point}\n論據：${evidence}\n\n`;
            }
        }

        showLoading("陳SIR 正在審視大綱...");

        const payload = {
            action: "grade_argument",
            data: {
                subType: "outline",
                topic: topic,
                outlineData: outlineData, 
                tone: document.getElementById("argumentOutlineTone").value
            }
        };
        
        const response = await callAPI(payload, 0);
        
        // 設定聊天室上下文 (這是詳細版，給 AI 看的)
        currentContextContent = readableContext;
        currentContextReview = response;

        // 顯示結果
        displayArgumentOutlineComment(response, outlineData);
        
        // 儲存到歷史紀錄
        const htmlToSave = document.getElementById("resultCanvasBody").innerHTML;
        
        // ★★★ 關鍵修改：存入歷史紀錄的 User Content 只包含題目 ★★★
        // 這裡傳入 `題目：${topic}`，而不是 `readableContext`
        await saveToHistory("議論", "大綱點評", topic, `題目：${topic}`, htmlToSave);

    } catch (error) {
        console.error("提交大綱失敗", error);
        alert("生成失敗，請重試");
    } finally {
        submitBtn.disabled = false;
        hideLoading();
    }
}

// 2. [核心修復] 議論文大綱解析與顯示函式
// 2. [核心修復] 議論文大綱解析與顯示函式 (已移除紅綠色樣式)
function displayArgumentOutlineComment(response, inputData) {
    console.log("[Argument Outline] Raw Response:", response);

    // --- A. 切割回應區塊 ---
    // 使用正則表達式尋找分隔線，容許前後有空格
    const sections = response.split(/===\s*(.+?)\s*===/).filter(s => s.trim());
    
    let commentPart = "";
    let rewritePart = "";
    let explanationPart = "";

    // 尋找對應的內容區塊
    for (let i = 0; i < sections.length; i++) {
        if (sections[i].includes("點評及建議")) commentPart = sections[i + 1] || "";
        if (sections[i].includes("改寫後的大綱")) rewritePart = sections[i + 1] || "";
        if (sections[i].includes("改寫說明")) explanationPart = sections[i + 1] || "";
    }

    // --- B. 解析「點評及建議」 ---
    const comments = {};
    const commentRegex = /\[(.+?)\][\s\S]*?點評\s*[：:]\s*([\s\S]+?)(?=\s*建議\s*[：:]|\s*\[|$)/g;
    const suggestionRegex = /\[(.+?)\][\s\S]*?建議\s*[：:]\s*([\s\S]+?)(?=\s*\[|$)/g;
    
    let match;
    while ((match = commentRegex.exec(commentPart)) !== null) {
        const part = match[1].trim();
        comments[part] = comments[part] || {};
        comments[part].comment = match[2].trim();
    }
    while ((match = suggestionRegex.exec(commentPart)) !== null) {
        const part = match[1].trim();
        comments[part] = comments[part] || {};
        comments[part].suggestion = match[2].trim();
    }

    // --- C. 解析「改寫後的大綱」 ---
    const rewrites = {};
    const pointRegex = /\[(.+?)\][\s\S]*?論點\s*[：:]\s*([\s\S]+?)(?=\s*論據及論證\s*[：:]|\s*\[|$)/g;
    const evidenceRegex = /\[(.+?)\][\s\S]*?論據及論證\s*[：:]\s*([\s\S]+?)(?=\s*\[|$)/g;
    
    while ((match = pointRegex.exec(rewritePart)) !== null) {
        const part = match[1].trim();
        rewrites[part] = rewrites[part] || {};
        rewrites[part].point = match[2].trim();
    }
    while ((match = evidenceRegex.exec(rewritePart)) !== null) {
        const part = match[1].trim();
        rewrites[part] = rewrites[part] || {};
        rewrites[part].evidence = match[2].trim();
    }

    // --- D. 生成 HTML 表格 1 (原稿 + 點評) ---
    // [修改點] 這裡移除了顏色樣式，並統一加上邊框樣式，確保表格整齊
    const cellStyle = "border:1px solid #ccc; padding:10px; vertical-align:top; line-height:1.6;";
    
    let commentTableHTML = `
        <h3>陳SIR點評及建議：</h3>
        <div class="table-container">
            <table id="argumentCommentTable" style="width:100%; border-collapse: collapse;">
                <tr>
                    <th style="width:10%; border:1px solid #ccc; padding:8px; background:#2A9689; color:white;">部份</th>
                    <th style="width:20%; border:1px solid #ccc; padding:8px; background:#2A9689; color:white;">原有論點</th>
                    <th style="width:20%; border:1px solid #ccc; padding:8px; background:#2A9689; color:white;">原有論據</th>
                    <th style="width:25%; border:1px solid #ccc; padding:8px; background:#2A9689; color:white;">點評</th>
                    <th style="width:25%; border:1px solid #ccc; padding:8px; background:#2A9689; color:white;">建議</th>
                </tr>`;
                
    inputData.forEach(item => {
        const partKey = Object.keys(comments).find(k => k.includes(item.part) || item.part.includes(k)) || item.part;
        const data = comments[partKey] || {};
        
        commentTableHTML += `
            <tr>
                <td style="${cellStyle} background-color:#f9f9f9;"><strong>${item.part}</strong></td>
                <td style="${cellStyle}">${item.point || "(無)"}</td>
                <td style="${cellStyle}">${item.evidence || "(無)"}</td>
                <td style="${cellStyle}">${(data.comment || "無點評").replace(/\n/g, '<br>')}</td>
                <td style="${cellStyle}">${(data.suggestion || "無建議").replace(/\n/g, '<br>')}</td>
            </tr>`;
    });
    commentTableHTML += "</table></div>";

    // --- E. 生成 HTML 表格 2 (改寫參考) ---
    let rewriteTableHTML = `
        <h3 style="margin-top:30px;">改寫後的大綱參考：</h3>
        <div class="table-container">
            <table id="argumentRewriteTable" style="width:100%; border-collapse: collapse;">
                <tr>
                    <th style="width:10%; border:1px solid #ccc; padding:8px; background:#2A9689; color:white;">部份</th>
                    <th style="width:45%; border:1px solid #ccc; padding:8px; background:#2A9689; color:white;">改寫論點</th>
                    <th style="width:45%; border:1px solid #ccc; padding:8px; background:#2A9689; color:white;">改寫論據及論證</th>
                </tr>`;
                
    inputData.forEach(item => {
        const partKey = Object.keys(rewrites).find(k => k.includes(item.part) || item.part.includes(k)) || item.part;
        const data = rewrites[partKey] || {};
        
        rewriteTableHTML += `
            <tr>
                <td style="${cellStyle} background-color:#f9f9f9;"><strong>${item.part}</strong></td>
                <td style="${cellStyle}">${(data.point || "...").replace(/\n/g, '<br>')}</td>
                <td style="${cellStyle}">${(data.evidence || "...").replace(/\n/g, '<br>')}</td>
            </tr>`;
    });
    rewriteTableHTML += "</table></div>";

    // --- F. 生成改寫說明 ---
    let explanationHTML = '';
    if (explanationPart.trim()) {
        explanationHTML = createBulletedListHTML("改寫說明", explanationPart.trim());
    }

    // --- G. 組合並顯示 ---
    const finalHTML = commentTableHTML + rewriteTableHTML + explanationHTML + getCanvasChatHTML('argument_outline');
    
    openResultCanvas("議論文大綱點評");
    document.getElementById("resultCanvasBody").innerHTML = finalHTML;
}


	

// 【新增】用於儲存解題指引對話的上下文
let currentGuideTopic = '';
let currentGuideAnalysis = '';
let writingGuideChatHistoryData = [];
	
// 【新增】用於儲存文章點評對話的上下文

// 【新增】用於儲存文章點評對話的上下文
let currentWritingArticle = '';
let currentWritingReview = '';
let writingChatHistoryData = [];

// ======= 請在這裡加入以下程式碼 =======
// 【新增】用於儲存議論文點評對話的上下文
let currentArgumentArticle = '';
let currentArgumentReview = '';
let argumentChatHistoryData = [];





// 【新增】處理議論文「點評範疇」中「全部」複選框的邏輯
function handleArgumentAllScopeChange(checkbox) {
    const container = checkbox.closest('div');
    const otherCheckboxes = container.querySelectorAll('input[name="argumentReviewScope"]:not([value="全部"])');
    if (checkbox.checked) {
        otherCheckboxes.forEach(cb => {
            cb.checked = false;
            cb.disabled = true;
        });
    } else {
        otherCheckboxes.forEach(cb => {
            cb.disabled = false;
        });
    }
}
// ======= 加入結束 =======

// 【新增】用於儲存當前閱卷員的姓名
let currentReviewerName = "陳SIR"; // 預設為陳SIR

// 【新增】處理「點評範疇」中「全部」複選框的邏輯
function handleAllScopeChange(checkbox) {
    const container = checkbox.closest('div');
    const otherCheckboxes = container.querySelectorAll('input[name="reviewScope"]:not([value="全部"])');
    if (checkbox.checked) {
        otherCheckboxes.forEach(cb => {
            cb.checked = false;
            cb.disabled = true;
        });
    } else {
        otherCheckboxes.forEach(cb => {
            cb.disabled = false;
        });
    }
}



// ★★★ 新增：統一處理 Log 顏色的輔助函數 ★★★
// ★★★ 修改後的 Log 函式 (支援 GAS 回傳格式) ★★★
function logProviderInfo(dataOrResponse, apiName) {
    let provider = null;
    let debugTraceStr = null;

    // 判斷傳入的是 Response 物件(舊版/Worker) 還是 Data 物件(新版/GAS)
    if (dataOrResponse.headers && typeof dataOrResponse.headers.get === 'function') {
        // 舊版邏輯 (保留以防萬一)
        provider = dataOrResponse.headers.get('X-Provider-Log');
        debugTraceStr = dataOrResponse.headers.get('X-Debug-Trace');
    } else if (dataOrResponse._provider_log) {
        // ★ 新版 GAS 邏輯：從 JSON 內容讀取 ★
        provider = dataOrResponse._provider_log;
        // 如果你有傳回 trace 也可以在這裡讀取
    }

    // 1. 顯示失敗的嘗試 (如果有)
    if (debugTraceStr) {
        try {
            const traces = JSON.parse(debugTraceStr);
            traces.forEach(trace => {
                console.log(`%c[${apiName} Fail] ${trace}`, "color: #ffeb3b; background: #333; padding: 2px 5px;");
            });
        } catch(e) {}
    }

    // 2. 顯示成功的調用 (顏色設定與原版一致)
    if (provider) {
        if (provider.includes("OFFICIAL DEEPSEEK")) {
            // 官方 DeepSeek：橙紅風格
            console.log(`%c🚀 [${apiName}] SUCCESS via ${provider}`, "color: #fff; background: #e64a19; padding: 4px 8px; border-radius: 4px; font-weight: bold;");
        } else {
            // Pollinations：藍綠風格
            console.log(`%c🌿 [${apiName}] SUCCESS via ${provider}`, "color: #fff; background: #009688; padding: 4px 8px; border-radius: 4px; font-weight: bold;");
        }
    }
}

// ------------------------------------------------------------------

// ==========================================
// === API 呼叫核心函式 (修訂版：支援 Action) ===
// ==========================================

// 1. 通用 API (Gemini) - 安全版
async function callAPI(input, temperature = null) {
    // 獲取當前登入使用者
    const user = firebase.auth().currentUser;
    
    // 如果未登入，直接拋出錯誤，完全不發送請求
    if (!user) {
        // 觸發登入視窗
        document.getElementById('loginRequiredModal').style.display = 'flex';
        throw new Error("請先登入學校帳號 (Client blocked)");
    }

    // 獲取最新的 ID Token
    const token = await user.getIdToken();

    const TIMEOUT_MS = 100000;
    const controller = new AbortController();
    globalAbortController = controller;
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
 
    try {
        let requestBody = {};
 
        if (typeof input === 'string') {
            requestBody = {
                token: token, // ★ 加入 Token
                model: MODEL,
                messages: [{ role: "user", content: input }],
                max_tokens: 8000
            };
        } else if (typeof input === 'object' && input.action) {
            requestBody = {
                token: token, // ★ 加入 Token
                model: MODEL,
                action: input.action,
                data: input.data,
                max_tokens: 8000
            };
        }
 
        if (temperature !== null) {
            requestBody.temperature = temperature;
        }
 
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify(requestBody),
            signal: controller.signal
        });
 
        clearTimeout(timeoutId);
 
        if (!response.ok) {
            throw new Error(`API 調用失敗: ${response.status}`);
        }
 
        const data = await response.json();

        // 如果後端驗證失敗回傳錯誤
        if (data.error && data.error.includes("Unauthorized")) {
            throw new Error(data.error);
        }

        logProviderInfo(data, "Gemini API");

        if (!data.choices || data.choices.length === 0) {
             throw new Error("API 回傳格式異常");
        }
 
        let content = data.choices[0].message.content.trim();
        return content.replace(/<think\s*>.*?<\/think\s*>|<think\s*\/>|<think\s*>|<\/think\s*>/gis, '').trim();
 
    } catch (error) {
        clearTimeout(timeoutId);
        console.error("callAPI Error:", error);
        throw error;
    }
}
 
// 2. 閱讀專用 API (DeepSeek) - 安全版
async function callReadingAPI(input, temperature = null) {
    const user = firebase.auth().currentUser;
    if (!user) {
        document.getElementById('loginRequiredModal').style.display = 'flex';
        throw new Error("請先登入學校帳號 (Client blocked)");
    }
    const token = await user.getIdToken();
 
    const TIMEOUT_MS = 100000;
    const controller = new AbortController();
    globalAbortController = controller;
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
 
    try {
        let requestBody = {};
 
        if (typeof input === 'string') {
            requestBody = {
                token: token, // ★ 加入 Token
                model: READING_MODEL,
                messages: [{ role: "user", content: input }],
                max_tokens: 4000
            };
        } else if (typeof input === 'object' && input.action) {
            requestBody = {
                token: token, // ★ 加入 Token
                model: READING_MODEL,
                action: input.action,
                data: input.data,
                max_tokens: 4000
            };
        }
 
        if (temperature !== null) {
            requestBody.temperature = temperature;
        }
 
        const response = await fetch(READING_API_URL, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify(requestBody),
            signal: controller.signal
        });
 
        clearTimeout(timeoutId);
 
        if (!response.ok) {
            throw new Error(`閱讀 API 調用失敗: ${response.status}`);
        }
 
        const data = await response.json();

        if (data.error && data.error.includes("Unauthorized")) {
            throw new Error(data.error);
        }

        logProviderInfo(data, "Reading API");

        let content = data.choices[0].message.content.trim();
        return content.replace(/<think\s*>.*?<\/think\s*>|<think\s*\/>|<think\s*>|<\/think\s*>/gis, '').trim();
 
    } catch (error) {
        clearTimeout(timeoutId);
        console.error("callReadingAPI Error:", error);
        throw error;
    }
}
 
// 3. 驗證專用 API (Llama3) - 安全版
async function callLlama3API(input, temperature = null) {
    const user = firebase.auth().currentUser;
    if (!user) {
        // Llama3 通常是背景調用，這裡直接拋錯即可
        throw new Error("請先登入學校帳號 (Client blocked)");
    }
    const token = await user.getIdToken();

    const TIMEOUT_MS = 100000;
    const controller = new AbortController();
    globalAbortController = controller;
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
 
    try {
        let requestBody = {};
 
        if (typeof input === 'object' && input.action) {
            requestBody = {
                token: token, // ★ 加入 Token
                model: LLAMA3_MODEL,
                action: input.action,
                data: input.data,     
                max_tokens: 8000
            };
        } else if (typeof input === 'string') {
             requestBody = {
                token: token, // ★ 加入 Token
                model: LLAMA3_MODEL,
                messages: [{ role: "user", content: input }],
                max_tokens: 8000
            };
        }
 
        if (temperature !== null) {
            requestBody.temperature = temperature;
        }
 
        const response = await fetch(LLAMA3_API_URL, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify(requestBody),
            signal: controller.signal
        });
 
        clearTimeout(timeoutId);
 
        if (!response.ok) {
            throw new Error(`驗證 API 調用失敗: ${response.status}`);
        }
 
        const data = await response.json();

        if (data.error && data.error.includes("Unauthorized")) {
            throw new Error(data.error);
        }

        logProviderInfo(data, "Llama3 API");

        let content = data.choices[0].message.content.trim();
        return content.replace(/<think\s*>.*?<\/think\s*>|<think\s*\/>|<think\s*>|<\/think\s*>/gis, '').trim();
 
    } catch (error) {
        clearTimeout(timeoutId);
        console.error("callLlama3API Error:", error);
        throw error;
    }
}



// ==========================================
// === [新增] 貓咪對話專用 API (Gemini Fast) ===
// ==========================================
async function callCatAPI(input, temperature = null) {
    const user = firebase.auth().currentUser;
    // 如果未登入，不阻擋貓咪賣萌，但後端可能會擋，這裡保留基本檢查
    if (!user) {
        // 如果你希望訪客也能玩貓，可以註解掉下面這行；如果要強制登入則保留
        // document.getElementById('loginRequiredModal').style.display = 'flex';
        // throw new Error("請先登入學校帳號 (Client blocked)");
    }
    
    const token = user ? await user.getIdToken() : null;

    const TIMEOUT_MS = 60000; // 貓咪對話可以快一點，設 60 秒超時
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
 
    try {
        let requestBody = {};
 
        // ★★★ 核心修改：強制鎖定模型為 gemini-fast ★★★
        if (typeof input === 'string') {
            requestBody = {
                token: token,
                model: "grok", // 指定名稱，絕對不改
                messages: [{ role: "user", content: input }],
                max_tokens: 1000 // 貓咪說話短，不需要太大
            };
        }
 
        if (temperature !== null) {
            requestBody.temperature = temperature;
        }
 
        // 使用與原本相同的 API_URL (Worker 網址)
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify(requestBody),
            signal: controller.signal
        });
 
        clearTimeout(timeoutId);
 
        if (!response.ok) {
            throw new Error(`Cat API 調用失敗: ${response.status}`);
        }
 
        const data = await response.json();

        if (data.error && data.error.includes("Unauthorized")) {
            throw new Error(data.error);
        }

        // 這裡不呼叫 logProviderInfo 以免洗版 Console
        // logProviderInfo(data, "Cat API");

        if (!data.choices || data.choices.length === 0) {
             throw new Error("API 回傳格式異常");
        }
 
        let content = data.choices[0].message.content.trim();
        // 清理可能出現的思維鏈標籤
        return content.replace(/<think\s*>.*?<\/think\s*>|<think\s*\/>|<think\s*>|<\/think\s*>/gis, '').trim();
 
    } catch (error) {
        clearTimeout(timeoutId);
        console.error("callCatAPI Error:", error);
        throw error;
    }
}


	

/**
 * 【全新函式】應用 Llama-3 驗證模型的內容與結構分數差距規則。
 * 規則：內容分和結構分的分差值不能高於1分。
 * 執行方式：如果分差大於1，則將較高的分數下調至「較低分+1」。
 * @param {object} scores - 從 Llama-3 模型解析出的原始評分物件。
 * @returns {object} - 經過規則調整後的評分物件。
 */
const applyContentStructureRule = (scores) => {
    // 建立一個分數物件的深層複本，避免影響原始數據
    let s = JSON.parse(JSON.stringify(scores));

    // 檢查 content 和 structure 分數是否存在
    if (s.content !== undefined && s.structure !== undefined) {
        const contentScore = s.content;
        const structureScore = s.structure;
        const difference = Math.abs(contentScore - structureScore);

        // 如果分數差距大於 1，則觸發調整機制
        if (difference > 1) {
            console.log(`觸發 Llama-3 內容/結構分差值規則：內容=${contentScore}, 結構=${structureScore}, 差值=${difference}`);
            
            // 判斷哪個分數較高，並將其下調
            if (contentScore > structureScore) {
                s.content = structureScore + 1; // 將內容分下調至「結構分+1」
                console.log(`調整後內容分數: ${s.content}`);
            } else { // structureScore > contentScore
                s.structure = contentScore + 1; // 將結構分下調至「內容分+1」
                console.log(`調整後結構分數: ${s.structure}`);
            }
        }
    }
    // 返回調整後（或無需調整）的分數物件
    return s;
};




/**
* Creates a beautiful bulleted list HTML from raw text content.
* @param {string} title - The title for the card (e.g., '點評', '建議').
* @param {string} rawContent - The raw text content.
* @returns {string} - The formatted HTML string.
*/
function createBulletedListHTML(title, rawContent) {
    // ★★★ 修改 1：強制簡轉繁 (使用 OpenCC) ★★★
    if (typeof OpenCC !== 'undefined') {
        try {
            const converter = OpenCC.Converter({ from: 'cn', to: 'tw' });
            rawContent = converter(rawContent);
        } catch (e) {
            console.error("[OpenCC] 轉換失敗:", e);
        }
    }

    // ★★★ 修改 2：移除 Markdown 星號 (*) ★★★
    rawContent = rawContent.replace(/\*/g, '');

    // ★★★ 修改 3 (新)：將英文引號 "" 或 “” 轉為中文 「」 ★★★
    // 使用正則表達式捕捉引號內的內容並替換
    rawContent = rawContent.replace(/["“](.*?)["”]/g, '「$1」');

    // 嘗試分割列點
    let points = rawContent.split(/\s*(?=\d+\.\s*)/).map(p => p.trim()).filter(p => p);

    // 如果沒有數字編號，嘗試用換行符號分割
    if (points.length <= 1 && rawContent.includes('\n')) {
        const newlinePoints = rawContent.split('\n').map(p => p.trim()).filter(p => p);
        if (newlinePoints.length > 1) {
            points = newlinePoints;
        }
    }

    // 如果完全無法分割，直接顯示
    if (points.length === 0) {
        // 清理單段文字的冒號前綴
        let cleanSingleText = rawContent.replace(/^[^：:\n]*[：:]\s*/, '');
        
        return `<div class="rewrite-explanation-container">
            <div class="rewrite-explanation-card">
            <h3>${title}</h3>
            <div class="explanation-text">${cleanSingleText.replace(/\n/g, '<br>')}</div>
            </div>
            </div>`;
    }

    let explanationHTML = `<div class="rewrite-explanation-container">
    <div class="rewrite-explanation-card">
    <h3>${title}</h3>`;

    points.forEach((point, index) => {
        let number = index + 1;
        let text = point;

        // 檢查是否包含數字開頭 (例如 "1. ")
        const match = point.match(/^(\d+)\.?\s*(.*)$/s);
        if (match) {
            number = match[1]; 
            text = match[2]; 
        }

        // ★★★ 修改 4：移除內容中的標題/前綴 ★★★
        // 刪除開頭直到冒號為止的字元 (例如 "優點：文筆流暢" -> "文筆流暢")
        text = text.replace(/^[^：:\n]*[：:]\s*/, '');

        explanationHTML += `<div class="explanation-point">
            <div class="explanation-number">${number}</div>
            <div class="explanation-text">${text.replace(/\n/g, '<br>')}</div>
            </div>`;
    });

    explanationHTML += `</div></div>`;
    return explanationHTML;
}


// 原 generateTopic() 函式
// 原 generateTopic() 函式 (已修訂：只生成題目，不調用 LLM)
function generateTopic(buttonElement) { 
    if (buttonElement) {
        updateButtonActiveState(buttonElement);
    }

    // 隱藏自訂題目輸入區，確保介面乾淨
    const customTopicArea = document.getElementById("customTopicArea");
    customTopicArea.style.display = "none";
    customTopicArea.innerHTML = "";

    const topicResult = document.getElementById("topicResult");
    topicResult.style.display = 'block';

    // 隨機抽選題目
    let selectedTopic;
    do {
        selectedTopic = topics[Math.floor(Math.random() * topics.length)];
    } while (selectedTopic === lastTopic && topics.length > 1);
    
    lastTopic = selectedTopic;
    localStorage.setItem("lastTopic", lastTopic);

    // 直接顯示題目 (不區分寫作類型，統一處理)
    topicResult.innerHTML = "<strong>" + selectedTopic + "</strong>";
    
    // 儲存狀態
    localStorage.setItem("currentTopic", selectedTopic);
    
    // 關鍵：清空之前的重點和情節設定，以免影響這次的評分
    localStorage.setItem("currentFocus", "");
    localStorage.setItem("currentPlot", "");
}

	
// 設定自訂題目（寫作）
function setCustomTopic() {
const writingType = document.getElementById("writingType").value;
const topicResult = document.getElementById("topicResult");

if (writingType === "片段描寫") {
// 【核心修訂】只檢查題目是否已輸入
const title = sanitizeHTML(document.getElementById("customTitle").value.trim());
if (!title) {
alert("請至少輸入自訂題目");
return;
}

// 獲取（可能是空的）重點和情節
const focus = document.getElementById("customFocus").value.trim();
const plot = document.getElementById("customPlot").value.trim();

// 即使 focus 和 plot 是空的，也正常生成顯示表格
// 這樣使用者可以清楚地看到他們輸入了什麼，沒輸入什麼
topicResult.innerHTML = `
<strong>${title}</strong>
<table>
<tr><th>結構段重點</th><th>情節大要</th></tr>
<tr><td>${focus || '<i>（未提供）</i>'}</td><td>${plot || '<i>（未提供）</i>'}</td></tr>
</table>
`;

// 儲存到 localStorage，空值也一併儲存
localStorage.setItem("currentTopic", title);
localStorage.setItem("currentFocus", focus);
localStorage.setItem("currentPlot", plot);

} else { 
const customTopic = sanitizeHTML(document.getElementById("customTopic").value.trim());
if (!customTopic) {
alert("請輸入自訂題目");
return;
}
topicResult.innerHTML = "<strong>" + customTopic + "</strong>";
localStorage.setItem("currentTopic", customTopic);
}

topicResult.style.display = 'block';

const customTopicArea = document.getElementById("customTopicArea");
customTopicArea.style.display = "none";
customTopicArea.innerHTML = "";
}
// 生成大綱表格
function generateOutlineTable() {
const structure = document.getElementById("structure").value;
let parts = structure === "fourPart" ? ["起", "承", "轉", "合"] : ["起", "一線", "二線", "三線", "合"];
let tableHTML = "<div class='table-container'><table><tr><th>部份</th><th>結構段重點</th><th>情節大要</th></tr>";
parts.forEach((part, index) => {
const focusId = structure + "Focus" + (index + 1);
const plotId = structure + "Plot" + (index + 1);
tableHTML += `<tr><td>${part}</td><td><textarea id="${focusId}" rows="3"></textarea></td><td><textarea id="${plotId}" rows="3"></textarea></td></tr>`;
});
tableHTML += "</table></div>";
document.getElementById("outlineTableArea").innerHTML = tableHTML;
}





async function continueWritingGuideDiscussion() {
    const continueBtn = document.getElementById('continueWritingGuideBtn');
    continueBtn.disabled = true;

    const userInputText = sanitizeHTML(document.getElementById("writingGuideUserInput").value.trim());
    if (!userInputText) {
        alert("請輸入您的回應");
        continueBtn.disabled = false;
        return;
    }
    
    const chatHistoryDiv = document.getElementById('writingGuideChatHistory');
    
    // 1. 顯示使用者訊息
    const userMessageBubble = document.createElement('div');
    userMessageBubble.className = 'message-bubble user-message';
    userMessageBubble.textContent = userInputText;
    chatHistoryDiv.appendChild(userMessageBubble);
    
    writingGuideChatHistoryData.push({ sender: 'user', message: userInputText });
    document.getElementById("writingGuideUserInput").value = "";
    chatHistoryDiv.scrollTop = chatHistoryDiv.scrollHeight;

    // 2. 顯示 AI 正在回應
    const aiMessageBubble = document.createElement('div');
    aiMessageBubble.className = 'message-bubble ai-message';
    aiMessageBubble.textContent = `陳SIR正在回應...`;
    chatHistoryDiv.appendChild(aiMessageBubble);
    chatHistoryDiv.scrollTop = chatHistoryDiv.scrollHeight;

    // 3. 準備 Prompt
    const conversationHistoryForPrompt = writingGuideChatHistoryData.map(item => {
        const role = item.sender === 'user' ? '學生' : '陳SIR';
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = item.message;
        const cleanMessage = tempDiv.textContent || tempDiv.innerText || "";
        return `${role}: ${cleanMessage}`;
    }).join('\n');

    // 建構一般對話的 Prompt
    const prompt = `
    【角色設定】你是一位高中中文科老師「陳SIR」。
    【背景資料】解題指引內容：${currentGuideAnalysis}
    【對話紀錄】${conversationHistoryForPrompt}
    【學生追問】${userInputText}
    【任務】請針對學生追問回應，緊扣剛才的指引，字數200字以內。\n【重要】請必須使用繁體中文(Traditional Chinese)回答。
    `;

   try {
        // 使用通用 API (Gemini)
        let aiResponse = await callAPI(prompt);
        if (!aiResponse) throw new Error('API 傳回無效回應');
        
        // ★★★ 強制繁體化 (OpenCC) ★★★
        if (typeof OpenCC !== 'undefined') {
            const converter = OpenCC.Converter({ from: 'cn', to: 'tw' });
            aiResponse = converter(aiResponse);
        }

        // ★★★ 強制替換引號 (將 "" 或 “” 轉為 「」) ★★★
        aiResponse = aiResponse.replace(/["“](.*?)["”]/g, '「$1」');

        let formattedResponse = aiResponse.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        formattedResponse = formattedResponse.replace(/\n/g, '<br>');
        aiMessageBubble.innerHTML = formattedResponse;
        
        writingGuideChatHistoryData.push({ sender: 'ai', message: aiResponse });

        // 更新歷史紀錄
        await updateHistoryChat();

    } catch (error) {
        console.error("繼續指引討論時出錯:", error);
        aiMessageBubble.textContent = "抱歉，回應失敗。";
    } finally {
        chatHistoryDiv.scrollTop = chatHistoryDiv.scrollHeight;
        continueBtn.disabled = false;
    }
}
// ==========================================
// === 修訂：解題指引提交函數 (含追問聊天室功能) ===
// ==========================================
async function submitWritingGuide() {
    const submitBtn = document.getElementById('submitWritingGuideBtn');
    const inputTopic = document.getElementById('writingGuideTopicInput').value.trim();
    
    // 隱藏頁面上的舊元素，以免混亂
    const resultContainerOnPage = document.getElementById('writingGuideResultContainer');
    if (resultContainerOnPage) resultContainerOnPage.style.display = "none";

    if (!inputTopic) {
        alert("請輸入題目！");
        return;
    }

    submitBtn.disabled = true;
    showLoading("陳SIR 正在拆解題目...");
    
    const prompt = `你是一位深諳中國文學的寫作顧問。使用者輸入題目：「${inputTopic}」。

請模仿以下【示例】的風格、深度和語氣，為這個題目撰寫「題眼分析」及「寫作方向」。
在「題眼分析」，用語要求準確、理性、非文學化，而在「寫作方向」，你的輸出必須文學化、感性。
**嚴禁**使用「你好」、「我們來看看」等開場白，直接輸出內容。
**嚴禁**使用 1. 2. 3. 等數字列表，請嚴格遵守下方的【輸出格式】標籤。

【任務要求】
1. **題眼分析**：
   - 分析題眼的意思，做非文學性、貼近日常生活的釋義，約150-200字。
2. **寫作方向**：
   - 提供 3 個具體的「故事種子」。
   - 每個種子包含：標題、情境（具體畫面）、張力（為何扣連題目）。

【輸出格式 (請嚴格遵守分隔符)】
[INTRO]
(這裡填寫題眼分析與詞語關係分析...)
[SEED]
(故事種子標題 1)
情境：(具體畫面描述...)
張力：(解釋為何扣題...)
[SEED]
(故事種子標題 2)
情境：(具體畫面描述...)
張力：(解釋為何扣題...)
[SEED]
(故事種子標題 3)
情境：(具體畫面描述...)
張力：(解釋為何扣題...)
`;

    try {
        // 使用閱讀專用 API (通常較穩定) 或通用 API
        const response = await callReadingAPI(prompt);
        
        // ★★★ 關鍵：設定全域變數，供畫布聊天室的 AI 讀取 ★★★
        currentContextContent = `題目：${inputTopic}`; 
        currentContextReview = response; // 讓 AI 知道它剛剛分析了什麼

        // === 解析邏輯 ===
        // 1. 解析 Intro
        let introContent = "";
        const introSplit = response.split('[INTRO]');
        if (introSplit.length > 1) {
            introContent = introSplit[1].split('[SEED]')[0].trim();
        }

        // 2. 解析 Seeds
        const seedParts = response.split('[SEED]').slice(1).map(p => p.trim());

        // === 組裝 HTML ===
        let finalHTML = `<h3>陳SIR 解題指引：${inputTopic}</h3>`;

        // 加入題眼分析區塊
        finalHTML += `
        <div class="guide-section-header" style="border-left: 5px solid #4A90E2; color: #4A90E2;">
            <h3><i class="fas fa-search"></i> 題眼分析</h3>
        </div>`;
        
        if (introContent) {
            finalHTML += `<div class="guide-intro-card"><p>${introContent.replace(/\n/g, '<br>')}</p></div>`;
        }

        // 加入寫作方向區塊
        finalHTML += `
        <div class="guide-section-header" style="border-left: 5px solid #28a745; color: #28a745; margin-top: 30px;">
            <h3><i class="fas fa-compass"></i> 寫作方向</h3>
        </div>`;

        if (seedParts.length > 0) {
            finalHTML += `<div class="guide-grid-3">`; // 開始 Grid 容器
            
            seedParts.forEach(part => {
                const lines = part.split('\n').filter(l => l.trim());
                const title = (lines[0] || "故事種子").replace(/\*\*/g, '');
                const contentText = lines.slice(1).join('\n');
                let situation = "內容解析中...";
                let contradiction = "內容解析中...";
                const cleanContent = contentText.replace(/\*\*/g, ''); 
                
                const parts = cleanContent.split(/(?:張力|矛盾)[:：]/);
                if (parts.length > 1) {
                    situation = parts[0].replace(/^(?:情境|情景)[:：]\s*/, '').trim();
                    contradiction = parts[1].trim();
                } else {
                    situation = cleanContent;
                    contradiction = "";
                }

                finalHTML += `
                <div class="guide-card seed-card">
                    <div class="seed-header">${title}</div>
                    <div class="seed-body">
                        <p><strong><i class="fas fa-image"></i> 情境：</strong></p>
                        <p>${situation.replace(/\n/g, '<br>')}</p>
                        <hr style="border:0; border-top:1px dashed #ddd; margin: 10px 0;">
                        <p><strong><i class="fas fa-bolt"></i> 張力：</strong></p>
                        <p>${contradiction.replace(/\n/g, '<br>')}</p>
                    </div>
                </div>`;
            });
            
            finalHTML += `</div>`; // 結束 Grid 容器
        }

        // ★★★ 關鍵：加入畫布聊天室介面 ★★★
        // 這會自動生成對話框，並且 sendCanvasMessage 會讀取上面的 currentContext 變數
        finalHTML += getCanvasChatHTML('narrative_guide');

        // === 打開畫布並寫入內容 ===
        openResultCanvas("解題指引");
        const resultContainer = document.getElementById("resultCanvasBody");
        resultContainer.innerHTML = finalHTML;

        // === 儲存歷史紀錄 ===
        // 新的邏輯：完整儲存 (包含聊天室介面)
await saveToHistory("敘事抒情", "解題指引", inputTopic, `題目：${inputTopic}`, finalHTML);
        
        // 顯示儲存按鈕 (如果有的話)
        hideAllSaveHtmlButtons();
   


    } catch (error) {
        console.error("解題指引生成失敗:", error);
        alert("生成失敗，請稍後再試。");
    } finally {
        submitBtn.disabled = false;
        hideLoading();
    }
}



	
// ==========================================
// === 敘事抒情提交函式 (大綱模式只存題目) ===
// ==========================================
async function submitWriting() {
    console.log("🖱️ [系統] 提交按鈕被點擊了！");
    const submitBtn = document.getElementById('submitWritingBtn');
    submitBtn.disabled = true;
    hideAllSaveHtmlButtons();

    const writingGradingResultDiv = document.getElementById("writingGradingResult");
    const writingChatHistoryDiv = document.getElementById("writingChatHistory");
    const writingChatInputContainerDiv = document.getElementById("writingChatInputContainer");
    if(writingGradingResultDiv) writingGradingResultDiv.innerHTML = "";
    if(writingChatHistoryDiv) writingChatHistoryDiv.style.display = "none";
    if(writingChatInputContainerDiv) writingChatInputContainerDiv.style.display = "none";
    writingChatHistoryData = [];

    try {
        const reviewerSelect = document.getElementById('writingReviewer');
        if (reviewerSelect) {
            const selectedReviewerText = reviewerSelect.options[reviewerSelect.selectedIndex].text;
            currentReviewerName = selectedReviewerText.replace(/\s*\(預設\)\s*/, '');
        } else {
            currentReviewerName = "陳SIR";
        }

        const writingType = document.getElementById("writingType").value;
        const topic = localStorage.getItem("currentTopic");
        if (!topic) { alert("請先設定題目"); submitBtn.disabled = false; return; }

        const tone = document.getElementById("writingTone").value;
        let content = "";

        // === 模式一：大綱點評 ===
        if (writingType === "大綱") {
            const structure = document.getElementById("structure").value;
            const parts = structure === "fourPart" ? ["起", "承", "轉", "合"] : ["起", "一線", "二線", "三線", "合"];
            
            let outlineRawText = ""; 
            const outlineData = parts.map((part, index) => {
                const focusId = structure + "Focus" + (index + 1);
                const plotId = structure + "Plot" + (index + 1);
                const focus = document.getElementById(focusId)?.value.trim() || "";
                const plot = document.getElementById(plotId)?.value.trim() || "";
                if (!focus || !plot) throw new Error("請填寫所有大綱表格");
                outlineRawText += `[${part}] 重點：${focus} \n 情節：${plot}\n`;
                return { part, focus, plot };
            });

            showLoading("陳SIR 正在點評大綱..."); 
            
            const payload = {
                action: "grade_narrative",
                data: {
                    subType: "大綱",
                    topic: topic,
                    outlineData: outlineData,
                    structure: structure,
                    tone: tone
                }
            };
            
            const response = await callAPI(payload, 0);
            
            currentContextContent = outlineRawText;
            currentContextReview = response;
            displayOutlineComment(response, outlineData);
            
            saveToHistory("敘事抒情", "大綱點評", topic, `題目：${topic}`, document.getElementById("resultCanvasBody").innerHTML);

        } 
        // === 模式二：敘事物象 ===
        else if (writingType === "敘事物象") {
            content = document.getElementById("narrativeElements").value.trim();
            showLoading("陳SIR 正在生成物象...");
            
            const payload = {
                action: "grade_narrative",
                data: {
                    subType: "敘事物象",
                    topic: topic,
                    content: content
                }
            };

            const response = await callAPI(payload, 0);
            
            currentContextContent = `題目：${topic}\n背景：${content}`;
            currentContextReview = response;

            const elements = response.split("\n").map(item => item.replace(/^\d+\.|^-\s*/, '').trim()).filter(item => item);
            let elementsHTML = `<div class="rewrite-explanation-container"><div class="rewrite-explanation-card"><h3>生成的物象（${elements.length}項）：</h3><div class="vocab-grid">`;
            elements.forEach(element => { elementsHTML += `<div class="vocab-item">${element}</div>`; });
            elementsHTML += `</div></div></div>`; 
            elementsHTML += getCanvasChatHTML('narrative_elements');

            openResultCanvas("生成的敘事物象");
            document.getElementById("resultCanvasBody").innerHTML = elementsHTML;
            await saveToHistory("敘事抒情", "敘事物象", topic, `題目：${topic}\n取材：${content}`, elementsHTML);

        } 
        // === 模式三：片段描寫 ===
        else { 
            console.log("📝 [系統] 進入敘事抒情全文模式，準備呼叫 RAG...");

            content = document.getElementById("writingContent").value.trim();
            if (!content) { alert("請先輸入寫作內容"); submitBtn.disabled = false; return; }
            
            const selectedScopes = Array.from(document.querySelectorAll('input[name="reviewScope"]:checked')).map(cb => cb.value);
            const isFullReview = selectedScopes.includes("全部") || selectedScopes.length === 0;

            showLoading(`${currentReviewerName} 正在點評...`);

            // RAG 邏輯
            const ragReference = await searchSimilarEssays(content, 'narrative');
            
            // ★★★ 修正處：移除了前端獲取 narrativeReviewerPreferences 的邏輯 ★★★
            // 因為這些資料現在位於後端，我們只需要傳送 reviewer ID 即可。

            // ★★★ 修正處：移除了 ${specificPreference} 變數 ★★★
            const finalPromptContent = `
【系統強制指令 (System Instruction)】
1. **必須使用繁體中文 (Traditional Chinese)**：無論參考資料是簡體或繁體，你的所有輸出（點評、建議、改寫）都必須轉換為繁體中文（香港習慣）。
2. **區分角色**：下方的【參考資料】是用來幫助你建立評分標準的「範文」，下方的【待評核學生文章】才是你需要評改的對象。千萬不要評改參考資料。
3. **格式嚴格**：嚴格遵守原本設定的 XML/JSON 輸出格式，不要輸出額外的「改寫說明」或閒聊文字。
4. **閱卷員風格**：請嚴格根據後端系統指示的【閱卷員特定評分取向】進行評分及撰寫點評，務必體現該閱卷員重視的特點。

${ragReference ? ragReference : "(本次未檢索到參考範文)"}

=== 📝 待評核學生文章 (Target Student Essay) ===
(請針對以下文章進行評分與點評)
${content}
`;

            // 建構 Payload
            const payload = {
                action: "grade_narrative",
                data: {
                    subType: "片段描寫",
                    isFullReview: isFullReview,
                    topic: topic,
                    focus: localStorage.getItem("currentFocus"), 
                    plot: localStorage.getItem("currentPlot"),   
                    content: finalPromptContent, 
                    reviewer: document.getElementById('writingReviewer').value, // 後端會根據此 ID 讀取對應的 Preference
                    tone: tone,
                    selectedScopes: selectedScopes
                }
            };

            if (isFullReview) {
                const [originalApiResponse, llama3ApiResponse] = await Promise.all([
                    callAPI(payload, 0),
                    callLlama3API(payload, 0)
                ]);

                currentContextContent = content;
                currentContextReview = originalApiResponse;

                await displayFullCommentWithGrading('writingGradingResult', originalApiResponse, llama3ApiResponse, 'narrative', content);
            
            } else {
                const response = await callAPI(payload, 0);
                
                currentContextContent = content;
                currentContextReview = response;

                const critiqueMatch = response.match(/<critique>([\s\S]*?)<\/critique>/);
                const suggestionsMatch = response.match(/<suggestions>([\s\S]*?)<\/suggestions>/);
                let initialReviewHTML = `<h3>${currentReviewerName}聚焦點評：</h3>`;
                if (critiqueMatch?.[1]) initialReviewHTML += createBulletedListHTML("點評", critiqueMatch[1].trim());
                if (suggestionsMatch?.[1]) initialReviewHTML += createBulletedListHTML("建議", suggestionsMatch[1].trim());
                if (!critiqueMatch && !suggestionsMatch) initialReviewHTML += "<p>抱歉，無法生成點評。</p>";
                
                initialReviewHTML += getCanvasChatHTML('narrative_writing');
                openResultCanvas("聚焦點評結果");
                document.getElementById("resultCanvasBody").innerHTML = initialReviewHTML;
                
                const htmlToSave = captureContainerHTML('resultCanvasBody'); 
                saveToHistory("敘事抒情", "文章點評", topic || "無題目", `題目：${topic}\n\n文章：${content}\n(聚焦點評：${selectedScopes.join("、")})`, htmlToSave);
            }
        }
    } catch (error) {
        console.error("提交寫作時出錯:", error);
        alert("點評生成失敗，請重試");
    } finally {
        submitBtn.disabled = false;
        hideLoading();
    }
}


// 輔助函式，用於顯示大綱的評論 (從 submitWriting 中提取出來)
// 輔助函式，用於顯示大綱的評論 (敘事抒情 - V3 修復版)
function displayOutlineComment(response, content) {
    console.log("[Narrative Outline] Raw Response:", response); // LOG raw response

    const sections = response.split(/=== (.+?) ===/).filter(s => s.trim());
    const commentIndex = sections.indexOf("點評及建議");
    const rewriteIndex = sections.indexOf("改寫後的大綱");
    const explanationIndex = sections.indexOf("改寫說明");
    const commentPart = commentIndex !== -1 ? sections[commentIndex + 1] : "";
    const rewritePart = rewriteIndex !== -1 ? sections[rewriteIndex + 1] : "";
    const explanationPart = explanationIndex !== -1 ? sections[explanationIndex + 1].trim() : "";

    function parseCommentPart(commentPart) {
        const comments = {};
        // 增強 Regex：容許 Markdown 加粗 (**), 容許英文冒號 (:)
        const regex = /\[(.+?)\]\s*(?:\*\*|)\s*點評\s*(?:\*\*|)\s*[：:]\s*(.+?)(?=\s*(?:\*\*|)\s*建議\s*(?:\*\*|)\s*[：:]|\s*\[|$)/gs;
        const suggestionRegex = /\[(.+?)\]\s*.*?\s*(?:\*\*|)\s*建議\s*(?:\*\*|)\s*[：:]\s*(.+?)(?=\s*\[|$)/gs;
        let match;
        while ((match = regex.exec(commentPart)) !== null) {
            const part = match[1];
            comments[part] = comments[part] || {};
            comments[part].comment = match[2].trim();
        }
        while ((match = suggestionRegex.exec(commentPart)) !== null) {
            const part = match[1];
            comments[part] = comments[part] || {};
            comments[part].suggestion = match[2].trim();
        }
        return comments;
    }

    function parseRewritePart(rewritePart) {
        const rewrites = {};
        const regex = /\[(.+?)\]\s*(?:\*\*|)\s*結構段重點\s*(?:\*\*|)\s*[：:]\s*(.+?)(?=\s*(?:\*\*|)\s*情節大要\s*(?:\*\*|)\s*[：:]|\s*\[|$)/gs;
        const plotRegex = /\[(.+?)\]\s*.*?\s*(?:\*\*|)\s*情節大要\s*(?:\*\*|)\s*[：:]\s*(.+?)(?=\s*\[|$)/gs;
        let match;
        while ((match = regex.exec(rewritePart)) !== null) {
            const part = match[1];
            rewrites[part] = rewrites[part] || {};
            rewrites[part].focus = match[2].trim();
        }
        while ((match = plotRegex.exec(rewritePart)) !== null) {
            const part = match[1];
            rewrites[part] = rewrites[part] || {};
            rewrites[part].plot = match[2].trim();
        }
        return rewrites;
    }
    
    const comments = parseCommentPart(commentPart);
    const rewrites = parseRewritePart(rewritePart);

    // LOG 解析結果以便除錯
    console.log("[Narrative Outline] Parsed Comments:", comments);
    console.log("[Narrative Outline] Parsed Rewrites:", rewrites);

    let commentTableHTML = `<h3>陳SIR點評及建議：</h3><div class="table-container"><table id="commentTable"><tr><th style="width:10%;">部份</th><th style="width:15%;">結構段重點</th><th style="width:20%;">情節大要</th><th style="width:27.5%;">點評</th><th style="width:27.5%;">建議</th></tr>`;
    
    // ★★★ 修復：將 inputData 改為 content ★★★
    content.forEach(item => {
        // 嘗試模糊匹配 Key (防止 AI 輸出 "結構段1" 而本地是 "結構段一")
        const partKey = Object.keys(comments).find(k => k.includes(item.part) || item.part.includes(k)) || item.part;

        const comment = comments[partKey]?.comment || "<span style='color:red;'>未能解析 (請查看Console)</span>";
        const suggestion = comments[partKey]?.suggestion || "-";
        
        commentTableHTML += `<tr><td>${item.part}</td><td>${item.focus}</td><td>${item.plot}</td><td>${comment}</td><td>${suggestion}</td></tr>`;
    });
    commentTableHTML += "</table></div>";

    let rewriteTableHTML = `<h3>改寫後的大綱：</h3><div class="table-container"><table id="rewriteTable"><tr><th style="width:15%;">部份</th><th style="width:42.5%;">結構段重點</th><th style="width:42.5%;">情節大要</th></tr>`;
    
    // ★★★ 修復：將 inputData 改為 content ★★★
    content.forEach(item => {
        const partKey = Object.keys(rewrites).find(k => k.includes(item.part) || item.part.includes(k)) || item.part;
        const rewrite = rewrites[partKey] || { focus: "...", plot: "..." };
        rewriteTableHTML += `<tr><td>${item.part}</td><td>${rewrite.focus || "..."}</td><td>${rewrite.plot || "..."}</td></tr>`;
    });
    rewriteTableHTML += "</table></div>";

    let explanationHTML = '';
    if (explanationPart) {
        const points = explanationPart.split(/\s*(?=\d\.\s*)/).filter(p => p.trim());
        explanationHTML = `<div class="rewrite-explanation-container"><div class="rewrite-explanation-card"><h3>改寫說明</h3>`;
        points.forEach(point => {
            const match = point.match(/^(\d)\.\s*(.*)$/s);
            if (match) {
                const number = match[1];
                const text = match[2];
                explanationHTML += `<div class="explanation-point"><div class="explanation-number">${number}</div><div class="explanation-text">${text}</div></div>`;
            } else {
                 explanationHTML += `<div class="explanation-text">${point}</div>`;
            }
        });
        explanationHTML += `</div></div>`;
    }
    
    openResultCanvas("敘事大綱點評結果");
    const resultContainer = document.getElementById("resultCanvasBody");
    resultContainer.innerHTML = commentTableHTML + rewriteTableHTML + explanationHTML + getCanvasChatHTML('narrative_outline');
}

// 替換舊的 submitReading 函式 (修正歷史紀錄儲存問題)
// 替換舊的 submitReading 函式 (修正歷史紀錄儲存變數錯誤)
async function submitReading() {
    const submitBtn = document.getElementById('submitReadingBtn');
    submitBtn.disabled = true; 
    hideAllSaveHtmlButtons();

    try {
        const readingFunction = document.getElementById("readingFunction").value;
        const passage = document.getElementById("readingPassage").value.trim();
        const question = document.getElementById("readingQuestion").value.trim();
        let studentAnswer = "";

        if (readingFunction === "comment") {
            studentAnswer = document.getElementById("studentAnswer").value.trim();
            if (!passage || !question || !studentAnswer) { alert("請填寫所有閱讀輸入"); return; }
            currentContextContent = `篇章：${passage.substring(0, 100)}...\n題目：${question}\n答案：${studentAnswer}`;
        } else {
            if (!passage || !question) { alert("請填寫閱讀篇章和題目"); return; }
            currentContextContent = `篇章：${passage.substring(0, 100)}...\n題目：${question}`;
        }

        showLoading("陳SIR 正在分析篇章...");

        // ★ 建構 Payload
        const payload = {
            action: "grade_reading",
            data: {
                subType: readingFunction, // "comment" 或 "guide"
                passage: passage,
                question: question,
                answer: studentAnswer,
                tone: document.getElementById("readingTone").value 
            }
        };

        const result = await callReadingAPI(payload);
        currentContextReview = result;

        // === 以下保留原有的 HTML 生成與渲染邏輯 ===
        let finalHTML = "";
        let guideHTML = "";

        if (readingFunction === "comment") {
            const parts = result.split("###").map(part => part.trim()).filter(part => part);
            finalHTML = "<h3>陳SIR點評：</h3>";

            parts.forEach(part => {
                const lines = part.split("\n").filter(line => line.trim());
                const title = lines.shift() || "";
                const content = lines.join("\n");

                if (title.includes("點評")) {
                    finalHTML += createBulletedListHTML(title, content);
                } 
                else if (title.includes("答題步驟及思路")) {
                    finalHTML += `<div class="rewrite-explanation-container">
                    <div class="rewrite-explanation-card">
                    <h3>${title}</h3>
                    <div class="steps-container">`;
                    const steps = content.split(/\s*(?=【.*?】)/).filter(s => s.trim());
                    steps.forEach(stepText => {
                        const match = stepText.match(/^(【.*?】)(.*)$/s);
                        if (match) {
                            const stepTitle = match[1].trim();
                            const stepContent = match[2].trim().replace(/\n/g, '<br>');
                            finalHTML += `<div class="step-card">
                            <div class="step-title">${stepTitle}</div>
                            <div class="step-content">${stepContent}</div>
                            </div>`;
                        }
                    });
                    finalHTML += `</div></div></div>`;
                }
                else if (title.includes("改寫")) {
                    const cleanContent = content.replace(/\*/g, '');
                    finalHTML += `<div class="rewrite-explanation-container">
                        <div class="rewrite-explanation-card">
                            <h3>${title}</h3>
                            <div class="rewrite-content">${cleanContent.replace(/\n/g, '<br>')}</div>
                        </div>
                    </div>`;
                }
                else {
                    finalHTML += `<div class="rewrite-explanation-container">
                    <div class="rewrite-explanation-card">
                    <h3>${title}</h3>
                    <div class="explanation-text">${content.replace(/\n/g, '<br>')}</div>
                    </div>
                    </div>`;
                }
            });
            
            finalHTML += getCanvasChatHTML('reading_comment');
            openResultCanvas("閱讀理解點評");
            document.getElementById("resultCanvasBody").innerHTML = finalHTML;
            saveToHistory("閱讀", "點評", question || "閱讀練習", `篇章：${passage}\n題目：${question}\n答案：${studentAnswer}`, finalHTML);

        } else { // guide
            const guideParts = result.split("###").map(part => part.trim()).filter(part => part);
            guideHTML = "<h3>陳SIR指引：</h3>";

            guideParts.forEach(part => {
                const lines = part.split("\n").filter(line => line.trim());
                const title = lines.shift() || "";
                
                guideHTML += `<div class="rewrite-explanation-container">
                <div class="rewrite-explanation-card">
                <h3>${title}</h3>`;

                if (title.includes("答題指引")) {
                    lines.forEach((item, index) => {
                        const match = item.match(/^(\d+)\.?\s*(.*)$/);
                        const number = match ? match[1] : index + 1;
                        const text = match ? match[2].trim() : item;
                        guideHTML += `<div class="explanation-point">
                        <div class="explanation-number">${number}</div>
                        <div class="explanation-text">${text}</div>
                        </div>`;
                    });
                    guideHTML += `</div></div>`;
                } 
                else if (title.includes("答題詞匯")) {
                    guideHTML += `<div class="vocab-grid">`;
                    lines.forEach(item => {
                        const cleanItem = item.replace(/^\d+\.|^-\s*/, '').trim();
                        if (cleanItem) {
                            guideHTML += `<div class="vocab-item">${cleanItem}</div>`;
                        }
                    });
                    guideHTML += `</div></div></div>`;
                } else {
                    guideHTML += `<p class="explanation-text">${lines.join('<br>')}</p></div></div>`;
                }
            });
            
            guideHTML += getCanvasChatHTML('reading_guide');
            openResultCanvas("閱讀理解指引");
            document.getElementById("resultCanvasBody").innerHTML = guideHTML;
            await saveToHistory("閱讀", "指引", question || "閱讀指引", `篇章：${passage}\n題目：${question}`, guideHTML);
        }

    } catch (error) {
        console.error("提交閱讀時出錯:", error);
        alert("生成失敗，請重試");
    } finally {
        submitBtn.disabled = false;
        hideLoading();
    }
}


// 課外書籍討論功能
let chatHistory = [];
let bookTitle = "";
let author = "";
let discussionQuestion = "";
let booksTone = "";

// 將訊息渲染到畫面上
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

// 將訊息加入歷史紀錄並渲染
function addMessageToHistory(sender, message) {
chatHistory.push({ sender, message });
renderMessage(sender, message);
}


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

// ==========================================
// === 課外書籍討論與聊天室函式 ===
// ==========================================

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


// =================================================================================
// === 請複製此處開始的完整函數 ===
// =================================================================================
async function continueArgumentDiscussion() {
    const continueBtn = document.getElementById('continueArgumentBtn');
    continueBtn.disabled = true;

    const userInputText = sanitizeHTML(document.getElementById("argumentUserInput").value.trim());
    if (!userInputText) {
        alert("請輸入您的回應");
        continueBtn.disabled = false;
        return;
    }
    
    const chatHistoryDiv = document.getElementById('argumentChatHistory');
    
    const userMessageBubble = document.createElement('div');
    userMessageBubble.className = 'message-bubble user-message';
    userMessageBubble.textContent = userInputText;
    chatHistoryDiv.appendChild(userMessageBubble);
    
    argumentChatHistoryData.push({ sender: 'user', message: userInputText });
    document.getElementById("argumentUserInput").value = "";
    chatHistoryDiv.scrollTop = chatHistoryDiv.scrollHeight;

    const aiLoadingBubble = document.createElement('div');
    aiLoadingBubble.className = 'message-bubble ai-message';
    aiLoadingBubble.textContent = `${currentReviewerName}正在回應...`;
    chatHistoryDiv.appendChild(aiLoadingBubble);
    chatHistoryDiv.scrollTop = chatHistoryDiv.scrollHeight;

    const conversationHistoryForPrompt = argumentChatHistoryData.map(item => {
        const speaker = item.sender === 'user' ? '我的追問' : '你的上一輪回應';
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = item.message;
        const cleanMessage = tempDiv.textContent || tempDiv.innerText || "";
        return `${speaker}: ${cleanMessage}`;
    }).join('\n---\n');

    // 取得當前語氣設定
    const tone = document.getElementById("argumentWritingTone").value;
    let toneNote = "";
    if (tone === "chen") {
        toneNote = "請用幽默詼諧、適時揶揄的語氣回應，**必須使用大量Emoji** 🤪✨，表示揶揄時會用🤌這個EMOJI，偶爾用網絡用語。";
    } else {
        toneNote = "請用日常的語言回應我，不要過於理論化。";
    }
    
    // 建構一般對話的 Prompt
    const prompt = `我是一位高中生，你正在點評我的議論文。\n原文：${currentArgumentArticle}\n對話紀錄：${conversationHistoryForPrompt}\n請針對最新追問回應。${toneNote}\n\n【重要】請必須使用繁體中文(Traditional Chinese)回答。`;
    
    try {
        // 使用 callReadingAPI (議論文通常用 DeepSeek)
        let aiResponse = await callReadingAPI(prompt);
        
        // ★★★ 強制繁體化 (OpenCC) ★★★
        if (typeof OpenCC !== 'undefined') {
            const converter = OpenCC.Converter({ from: 'cn', to: 'tw' });
            aiResponse = converter(aiResponse);
        }

        // ★★★ 強制替換引號 (將 "" 或 “” 轉為 「」) ★★★
        aiResponse = aiResponse.replace(/["“](.*?)["”]/g, '「$1」');
        
        let formattedResponse = aiResponse.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        formattedResponse = formattedResponse.replace(/\n/g, '<br>');
        aiLoadingBubble.innerHTML = formattedResponse;
        
        argumentChatHistoryData.push({ sender: 'ai', message: aiResponse });

        // 更新歷史紀錄
        await updateHistoryChat();

    } catch (error) {
        console.error("繼續議論文討論時出錯:", error);
        aiLoadingBubble.textContent = "抱歉，回應失敗。";
    } finally {
        chatHistoryDiv.scrollTop = chatHistoryDiv.scrollHeight;
        continueBtn.disabled = false;
    }
}
// =================================================================================
// === 請複製到此處結束 ===
// =================================================================================


async function continueWritingDiscussion() {
    // 這裡我們仍然需要構建 Prompt，因為 chat_general action 需要 raw prompt
    const continueBtn = document.getElementById('continueWritingBtn');
    continueBtn.disabled = true;
    const userInputText = sanitizeHTML(document.getElementById("writingUserInput").value.trim());
    
    const writingChatHistoryDiv = document.getElementById('writingChatHistory');
    const userMessageBubble = document.createElement('div');
    userMessageBubble.className = 'message-bubble user-message';
    userMessageBubble.textContent = userInputText;
    writingChatHistoryDiv.appendChild(userMessageBubble);
    
    document.getElementById("writingUserInput").value = "";
    writingChatHistoryDiv.scrollTop = writingChatHistoryDiv.scrollHeight;

    const tone = document.getElementById("writingTone").value;
    let toneNote = tone === "chen" ? "請用幽默詼諧的語氣，就像陳SIR一樣。" : "請用日常語言，不要過於理論。";
    
    const prompt = `我是一位高中生，你剛剛點評了我的文章。\n原文：${currentWritingArticle}\n點評：${currentWritingReview}\n追問：${userInputText}\n請用日常語言回應，詳細分析並舉例。${toneNote}\n\n【重要】請必須使用繁體中文(Traditional Chinese)回答。`;
    
    const aiMessageBubble = document.createElement('div');
    aiMessageBubble.className = 'message-bubble ai-message';
    aiMessageBubble.textContent = `${currentReviewerName}正在回應...`;
    writingChatHistoryDiv.appendChild(aiMessageBubble);

    try {
        // 使用字串模式呼叫，自動觸發 chat_general
        let aiResponse = await callReadingAPI(prompt);

        // ★★★ 強制繁體化 (OpenCC) ★★★
        if (typeof OpenCC !== 'undefined') {
            const converter = OpenCC.Converter({ from: 'cn', to: 'tw' });
            aiResponse = converter(aiResponse);
        }

        // ★★★ 強制替換引號 (將 "" 或 “” 轉為 「」) ★★★
        aiResponse = aiResponse.replace(/["“](.*?)["”]/g, '「$1」');

        aiMessageBubble.innerHTML = aiResponse.replace(/\n/g, '<br>');
        await updateHistoryChat();
    } catch (error) {
        aiMessageBubble.textContent = "抱歉，回應失敗。";
    } finally {
        continueBtn.disabled = false;
    }
}


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

// --- 新增：處理彈出視窗的邏輯 ---
const newTopicModal = document.getElementById('newTopicModal');
const newTopicBtn = document.getElementById('newTopicBtn');
const closeNewTopicModal = document.getElementById('closeNewTopicModal');
const modalStartDiscussionBtn = document.getElementById('modalStartDiscussionBtn');

newTopicBtn.addEventListener('click', () => {
newTopicModal.style.display = 'flex';
});

closeNewTopicModal.addEventListener('click', () => {
newTopicModal.style.display = 'none';
});

window.addEventListener('click', (event) => {
if (event.target == newTopicModal) {
newTopicModal.style.display = 'none';
}
});

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


// =================================================================================
// === 【全新】點評範疇 UI/UX 互動邏輯 ===
// =================================================================================
function setupScopeUI(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const allCheckbox = container.querySelector('input[value="全部"]');
    const otherCheckboxes = container.querySelectorAll('input:not([value="全部"])');

    // 負責更新所有標籤樣式的核心函數
    const updateUI = () => {
        // 更新 "全部" 標籤的樣式
        const allLabel = allCheckbox.parentElement;
        if (allCheckbox.checked) {
            allLabel.classList.add('active');
        } else {
            allLabel.classList.remove('active');
        }

        // 更新其他所有標籤的樣式
        otherCheckboxes.forEach(cb => {
            const label = cb.parentElement;
            if (cb.checked) {
                label.classList.add('active');
            } else {
                label.classList.remove('active');
            }

            if (cb.disabled) {
                label.classList.add('disabled');
            } else {
                label.classList.remove('disabled');
            }
        });
    };

    // 為 "全部" 複選框添加事件監聽
    allCheckbox.addEventListener('change', () => {
        if (allCheckbox.checked) {
            // 如果 "全部" 被選中，取消選中並禁用其他所有選項
            otherCheckboxes.forEach(cb => {
                cb.checked = false;
                cb.disabled = true;
            });
        } else {
            // 如果 "全部" 被取消選中，啟用其他所有選項
            otherCheckboxes.forEach(cb => {
                cb.disabled = false;
            });
        }
        updateUI(); // 更新介面
    });

    // 為其他複選框添加事件監聽
    otherCheckboxes.forEach(cb => {
        cb.addEventListener('change', () => {
            // 如果任何一個其他選項被選中，則取消選中 "全部"
            if (cb.checked) {
                allCheckbox.checked = false;
            }
            updateUI(); // 更新介面
        });
    });
    
    // 頁面加載時，立即根據初始狀態更新一次UI
    updateUI();
}

// 在 DOM 加載完成後，為兩個點評範疇區塊初始化 UI 邏輯
document.addEventListener('DOMContentLoaded', () => {
    setupScopeUI('reviewScopeArea');
    setupScopeUI('argumentReviewScopeArea');
});
	

// 替換舊的 generateExpandTopic 函式
async function generateExpandTopic(buttonElement) {
    if (buttonElement) {
        updateButtonActiveState(buttonElement);
    }

    // 隱藏自訂題目輸入區，確保介面乾淨
    const customTopicArea = document.getElementById("expandCustomTopicInputArea");
    customTopicArea.style.display = "none";
    customTopicArea.innerHTML = "";

    const topicResult = document.getElementById("expandTopicResult");
    
    topicResult.innerHTML = "陳SIR正在出題...";
    topicResult.style.display = 'block';

    try {
        // ★★★ 建構 Payload 傳給後端 (取代本地 Prompt) ★★★
        // 注意：這裡不需要傳送任何額外資料，只需要告訴後端要做 "topic_generation"
        const payload = {
            action: "grade_expand",
            data: {
                subType: "topic_generation" 
            }
        };
        
        const topic = await callAPI(payload);
        
        // === 以下保持原有的解析與渲染邏輯 ===
        const lines = topic.split("\n").map(line => line.trim()).filter(line => line);
        const themeMatch = lines.find(line => line.startsWith("主題句："));
        const dataMatch = lines.find(line => line.startsWith("抄錄資料："));
        
        if (!themeMatch || !dataMatch) throw new Error("API 回應格式不正確");
        
        const theme = themeMatch.replace("主題句：", "").trim();
        const data = dataMatch.replace("抄錄資料：", "").trim();
        
        if (!theme || !data) throw new Error("生成內容不完整");

        topicResult.innerHTML = `
        <div class="table-container">
        <table>
        <tr><th>主題句</th><th>抄錄資料</th></tr>
        <tr><td>${theme}</td><td>${data}</td></tr>
        </table>
        </div>
        `;
        
        localStorage.setItem("expandCurrentTheme", theme);
        localStorage.setItem("expandCurrentData", data);
        // 清除可能存在的自訂題目 Title
        localStorage.removeItem("expandCurrentTitle");

    } catch (error) {
        console.error("生成整合拓展題目時出錯:", error);
        if (error.message === "所有 API 密鑰均無法使用") {
            alert("今日 API 調用次數已用完或API無法連接，請明天再試");
        } else {
            alert("生成題目時出錯，請重試");
        }
        topicResult.innerHTML = "";
        topicResult.style.display = 'none';
    }
}


// 替換舊的 setExpandCustomTopic 函式
function setExpandCustomTopic() {
const title = sanitizeHTML(document.getElementById("expandCustomTitle").value.trim());
const theme = sanitizeHTML(document.getElementById("expandCustomTheme").value.trim());
const data = sanitizeHTML(document.getElementById("expandCustomData").value.trim());
if (!title || !theme || !data) {
alert("請輸入所有內容（題目、主題句、抄錄資料）");
return;
}

const topicResult = document.getElementById("expandTopicResult");
topicResult.innerHTML = `
<strong>題目：${title}</strong>
<div class="table-container">
<table>
<tr><th>主題句</th><th>抄錄資料</th></tr>
<tr><td>${theme}</td><td>${data}</td></tr>
</table>
</div>
`;

topicResult.style.display = 'block';

localStorage.setItem("expandCurrentTitle", title);
localStorage.setItem("expandCurrentTheme", theme);
localStorage.setItem("expandCurrentData", data);

// 確認後，隱藏並清空輸入區域
const customTopicArea = document.getElementById("expandCustomTopicInputArea");
customTopicArea.style.display = 'none';
customTopicArea.innerHTML = '';
}

// 更新字數計數
function updateCharCount() {
const content = document.getElementById("expandContent").value;
const remaining = 180 - content.length;
document.getElementById("charCount").textContent = `剩餘字數：${remaining >= 0 ? remaining : 0}`;
if (remaining < 0) {
document.getElementById("expandContent").value = content.substring(0, 180);
}
}

// ★★★ 請將補回的代碼貼在這裡 ★★★
async function submitExpand() {
    const expandFunction = document.getElementById("expandFunction").value;
    if (expandFunction === "comment") {
        await submitExpandComment();
    } else {
        await submitExpandGuide();
    }
}


// 提交整合拓展內容
async function submitExpandComment() {
    const submitBtn = document.getElementById('submitExpandBtn');
    submitBtn.disabled = true;
    hideAllSaveHtmlButtons();

    try {
        const title = localStorage.getItem("expandCurrentTitle");
        const theme = localStorage.getItem("expandCurrentTheme");
        const data = localStorage.getItem("expandCurrentData");
        
        // 獲取用戶輸入的內容
        const content = document.getElementById("expandContent").value.trim();
        
        if (!theme || !data || !content) {
            alert("請先設定題目並輸入整合拓展內容");
            return;
        }

        const tone = document.getElementById("expandTone").value;

        showLoading("陳SIR 正在審視拓展方向...");
        
        // ★★★ 建構 Payload 傳給後端 (取代本地 Prompt) ★★★
        const payload = {
            action: "grade_expand",
            data: {
                subType: "comment", // 告訴後端這是點評
                title: title || "無",
                theme: theme,
                data: data,
                content: content,
                tone: tone
            }
        };
        
        // 呼叫通用 API
        const comment = await callAPI(payload);
        
        // 設定聊天室上下文
        currentContextContent = `題目：${title}\n主題句：${theme}\n抄錄資料：${data}\n內容：${content}`;
        currentContextReview = comment;

        // === 以下保持原有的 HTML 解析與渲染邏輯 ===
        const commentParts = comment.split("###").map(part => part.trim()).filter(part => part);
        
        let finalHTML = "<h3>陳SIR點評：</h3>";
        
        commentParts.forEach(part => {
            const lines = part.split("\n").filter(line => line.trim());
            const sectionTitle = lines.shift() || "";
            const sectionContent = lines.join("\n");

            if (sectionTitle.includes("點評") || sectionTitle.includes("建議")) {
                finalHTML += createBulletedListHTML(sectionTitle, sectionContent);
            } else {
                const cleanContent = sectionContent.replace(/\*/g, '');
                finalHTML += `<div class="rewrite-explanation-container">
                    <div class="rewrite-explanation-card">
                        <h3>${sectionTitle}</h3>
                        <div class="rewrite-content">${cleanContent.replace(/\n/g, '<br>')}</div>
                    </div>
                </div>`;
            }
        });

        // 加入聊天室
        finalHTML += getCanvasChatHTML('expand_comment');

        openResultCanvas("整合拓展點評");
        document.getElementById("resultCanvasBody").innerHTML = finalHTML;
        
        // 儲存時移除聊天室 HTML 結構以保持乾淨
        // 或者直接儲存 finalHTML，saveToHistory 內部會處理輸入框移除
        const historyHTML = finalHTML; 
        
        await saveToHistory(
            "整合拓展", 
            "點評", 
            title || "無題目", 
            `題目：${title}\n主題句：${theme}\n抄錄資料：${data}\n內容：${content}`, 
            historyHTML
        );

    } catch (error) {
        console.error("提交整合拓展點評時出錯:", error);
        alert("點評生成失敗，請重試");
    } finally {
        submitBtn.disabled = false;
        hideLoading();
    }
}

	
// 【修訂後】提交整合拓展指引
async function submitExpandGuide() {
    const submitBtn = document.getElementById('submitExpandGuideBtn');
    submitBtn.disabled = true;
    hideAllSaveHtmlButtons();

    try {
        const title = document.getElementById("expandGuideTitle").value.trim();
        const theme = document.getElementById("expandGuideTheme").value.trim();
        const data = document.getElementById("expandGuideData").value.trim();
        const expand = document.getElementById("expandGuideExpand").value.trim();
        
        if (!title || !theme || !data || !expand) {
            alert("請填寫所有輸入");
            return; 
        }

        showLoading("陳SIR 正在思考指引...");
        
        // ★★★ 建構 Payload 傳給後端 (取代本地 Prompt) ★★★
        const payload = {
            action: "grade_expand",
            data: {
                subType: "guide", // 告訴後端這是指引
                title: title,
                theme: theme,
                data: data,
                content: expand
            }
        };
        
        // 呼叫通用 API
        const guide = await callAPI(payload);
        
        // 設定聊天室上下文
        currentContextContent = `題目：${title}\n主題句：${theme}\n抄錄資料：${data}\n內容：${expand}`;
        currentContextReview = guide;

        // === 以下保持原有的 HTML 解析與渲染邏輯 ===
        const guideParts = guide.split("###").map(part => part.trim()).filter(part => part);
        let guideHTML = "<h3>陳SIR指引：</h3>";

        guideParts.forEach(part => {
            const lines = part.split("\n").filter(line => line.trim());
            const sectionTitle = lines.shift() || "指引問題";
            const questions = lines;

            guideHTML += `<div class="rewrite-explanation-container">
            <div class="rewrite-explanation-card">
            <h3>${sectionTitle}</h3>`;

            questions.slice(0, 3).forEach((question, index) => {
                const match = question.match(/^(\d+)\.?\s*(.*)$/);
                const number = match ? match[1] : index + 1;
                const text = match ? match[2].trim() : question;

                guideHTML += `<div class="explanation-point">
                <div class="explanation-number">${number}</div>
                <div class="explanation-text">${text}</div>
                </div>`;
            });

            guideHTML += `</div></div>`;
        });

        // 加入聊天室
        guideHTML += getCanvasChatHTML('expand_guide');

        openResultCanvas("整合拓展指引");
        document.getElementById("resultCanvasBody").innerHTML = guideHTML;
        
        // 儲存歷史紀錄 (移除聊天室)
        const historyHTML = guideHTML.split('<div class="canvas-chat-container">')[0];
        saveToHistory("整合拓展", "指引", title, `題目：${title}\n主題句：${theme}\n抄錄資料：${data}\n內容：${expand}`, historyHTML);

    } catch (error) {
        console.error("提交整合拓展指引時出錯:", error);
        alert("指引生成失敗，請重試");
    } finally {
        submitBtn.disabled = false; 
        hideLoading();
    }
}


// --- JavaScript for Tool 2 (語薈) & Modals ---
let debounceTimer;

const toolDescriptions = {
'sansi': '本工具旨在協助同學練習寫作卷和閱讀卷，並提供課外書籍討論。',
'sansi-v3': '「神思」備用版本，功能與主版本相同。',
'tizi': '由AI擬設閱讀卷及寫作卷的題目，為同學提供源源不絕的應試練習。',
'reading-pieces': '提供AI生成的文學片段，培養同學鑑賞文學的能力。',
'study': '具有根據探究問題生成圖解與文字分析的功能，培養同學深入研討專題的能力。',
'mensyu': '具有AI尋找文言篇章的功能，並輔以語譯及詞解，培養同學鑑賞文言文的能力。',
'wabisabi': '根據同學上傳的圖片，創作具有意境的句子。',
'book-overview': '提供大量書籍的內容概覽，助你快速了解書籍大意，選擇感興趣的讀物。',
'fanshui-narrative': '由AI生成敘事範文，可根據題目創作高質素的敘事文章以供參考。',
'fanshui-argument': '由AI生成議論範文，可根據題目創作結構嚴謹的議論文以供參考。',
'manuscript': '提供電子原稿紙，模擬真實寫作情境，並設有AI答惑功能。',
'words': '設有查考詞義、文章潤色及測驗功能，有助同學累積詞彙，斟字酌句。',
'slideshow': '將同學的文章轉換為幻燈片，以藝術方式展示同學作品。',
'yuyilu': '語弈錄是一款問答遊戲，題目範圍涵蓋課文。此為中一版本。',
'timer': '設有倒計時功能，程式檢測到人聲會重置時計，是專心背書溫習的好幫手。',
'mensyu-2': '文言文翻譯及分析工具，助同學克服古文閱讀的障礙。',
'zhiyun': '以Google Drive建設的雲端平臺，可供用家繳交課業、檢閱繳交紀錄及瀏覽個人課業文件夾，設有自動生成繳交課業紀錄、歸類文件及追收功課的功能。',
'zhuoyu': '可在PDF及圖片檔案右邊作旁批或備註，方便批閱作文或做筆記。',
'quizbuzzer': '一個簡單易用的線上搶答器，適合課堂或活動中使用。',
'ocr': 'i2OCR 是免費的線上光學字元辨識 (OCR) 軟體，可從圖像或PDF文件中提取文字，方便將手寫稿轉為電子檔。',
'epub': '線上電子書(ePub)閱讀器，方便閱讀電子書，無需安裝任何軟件。',
'decibelmeter': '具有量度分貝的功能，專為課堂秩序管理設計。',
'chitutor': 'AI中文聊天室，專為中文學習而設，可以與AI討論各種中文問題。',
'histutor': 'AI歷史聊天室，專為歷史學習而設，可以與AI討論歷史事件和人物。',
'counseling': 'AI輔導聊天室，當同學感到困惑或需要傾訴時，可以在這裡找到慰藉。',
'self-learning': '提供大量自學中文的資源，包括教學影片、佳作及各卷筆記等。',
'lyrics': '一款結合節奏遊戲與歌詞測驗的中文語文工具，透過音樂互動培養同學的詞彙積累、文學鑑賞及語感能力，並支援線上對戰與排行榜，增添樂趣與競爭的學習體驗。',
	'friends': '【僅供創作社成員使用】允許用戶建立群組、匿名交友、投稿作品、留言討論，並透過遊戲互動增進語文學習的樂趣，培養同學的表達與社交能力。',
	'slowreading': '一款專注深度閱讀的工具，使用者可貼上文本並自訂翻頁秒數，系統將自動逐句播放，幫助讀者聚焦內容，提升閱讀的專注力。',
	'pulseqa': '一個簡潔高效的課堂問答計時工具。主持人可創建房間、設置問題與計時，學生則需要按時作答。'
};


function drawConnectors() {
const svg = document.getElementById('connector-svg');
const container = document.getElementById('mind-map');
if (!svg || !container) {
return;
}
svg.innerHTML = '';

if (window.getComputedStyle(container).display === 'none') {
return;
}

const getElementEdge = (el, side = 'top') => {
const rect = el.getBoundingClientRect();
const containerRect = container.getBoundingClientRect();
const center_x = rect.left - containerRect.left + rect.width / 2;
const center_y = rect.top - containerRect.top + rect.height / 2;

switch(side) {
case 'top': return { x: center_x, y: rect.top - containerRect.top };
case 'bottom': return { x: center_x, y: rect.bottom - containerRect.top };
case 'left': return { x: rect.left - containerRect.left, y: center_y };
case 'right': return { x: rect.right - containerRect.left, y: center_y };
default: return {x: center_x, y: center_y};
}
}

const connections = [
{ from: '[data-id="core-ai-node"]', to: '[data-id="foundation-tizi"]', fromSide: 'bottom', toSide: 'top' },
{ from: '[data-id="core-ai-node"]', to: '[data-id="foundation-explore"]', fromSide: 'bottom', toSide: 'top' },
{ from: '[data-id="foundation-tizi"]', to: '#writing .category-title', fromSide: 'bottom', toSide: 'top' },
{ from: '[data-id="foundation-tizi"]', to: '#reading .category-title', fromSide: 'bottom', toSide: 'top' },
{ from: '[data-id="core-ai-node"]', to: '#assignments .category-title', fromSide: 'bottom', toSide: 'top' },
{ from: '[data-id="core-ai-node"]', to: '#support .category-title', fromSide: 'bottom', toSide: 'top' }
];

connections.forEach(conn => {
const fromEl = document.querySelector(conn.from);
const toEl = document.querySelector(conn.to);

if (fromEl && toEl) {
const fromPoint = getElementEdge(fromEl, conn.fromSide);
const toPoint = getElementEdge(toEl, conn.toSide);

const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
line.setAttribute('x1', fromPoint.x);
line.setAttribute('y1', fromPoint.y);
line.setAttribute('x2', toPoint.x);
line.setAttribute('y2', toPoint.y);
svg.appendChild(line);
}
});
}

// Listeners for Tool 2 (工具一覽展開邏輯 - 已修復背景殘留)
document.getElementById('expandToolsBtn2').addEventListener('click', function() {
    // 1. ★★★ 強制關閉其他全螢幕介面 ★★★
    document.getElementById('historyContainer').style.display = 'none';
    document.getElementById('studentCloudModal').style.display = 'none';
    document.getElementById('featuredContainer').style.display = 'none'; // <--- ★★★ 關鍵新增 ★★★

    // 2. 隱藏主頁元素 (解決打開語薈後關閉時看到主頁殘留的問題)
    document.querySelector('.title-container').style.display = 'none';
    document.getElementById('hitokoto-container').style.display = 'none';
    document.getElementById('mainMenuBox').style.display = 'none';
    document.getElementById('toolsBox').style.display = 'none';
    const dseBox = document.getElementById('dse-countdown-box');
    if (dseBox) dseBox.style.display = 'none';

    // 3. 顯示語薈
    const container = document.getElementById('toolsContainer2');
    container.style.display = 'flex';
    document.body.style.overflow = 'hidden'; // 鎖定捲動
    document.querySelector('#toolsContainer2 .main-container').classList.add('loaded');
    
    // 4. 按鈕狀態調整
    document.getElementById('homeBtn').style.display = 'none';
    document.getElementById('sideMenuHomeBtn').style.display = 'flex';
    
    // 確保雲端按鈕顯示
    const cloudBtn = document.getElementById('sideMenuCloudBtn');
    if (cloudBtn) cloudBtn.style.display = 'flex';
    
    // 收起側邊選單
    document.getElementById('sideMenu').classList.remove('active');
    document.getElementById('sideMenuToggle').classList.remove('active');

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(drawConnectors, 100);
});

// 工具一覽關閉邏輯
// 工具一覽關閉邏輯
document.getElementById('closeToolsBtn2').addEventListener('click', function() {
    // 同樣直接呼叫 returnToHome() 以確保主頁被正確還原，不會顯示白畫面
    returnToHome();
});

// '語弈錄' Interactivity for Tool 2
const yuyiluToggleTool2 = document.getElementById('yuyilu-toggle');
const yuyiluGradesTool2 = document.getElementById('yuyilu-grades');

if (yuyiluToggleTool2 && yuyiluGradesTool2) {
yuyiluToggleTool2.addEventListener('click', function(event) {
event.preventDefault();
yuyiluGradesTool2.classList.toggle('collapsed');
setTimeout(drawConnectors, 500);
});
}

// --- Preview Modal & Video Modal Logic ---
const previewModal = document.getElementById('previewModal');
const previewIframe = document.getElementById('previewIframe');
const previewCloseBtn = document.getElementById('previewCloseBtn');
const previewGoToPageBtn = document.getElementById('previewGoToPageBtn');
const previewDescription = document.getElementById('previewDescription');

const videoModal = document.getElementById('videoModal');
const videoIframe = document.getElementById('videoIframe');
const videoTourBtn = document.getElementById('video-tour-btn');

const chartLinks = document.querySelectorAll('#toolsContainer2 .node a:not([href="#"])');

chartLinks.forEach(link => {
link.addEventListener('click', function(event) {
event.preventDefault();
const url = this.getAttribute('href');
const toolId = this.getAttribute('data-tool-id');
const description = toolDescriptions[toolId] || "暫無介紹。";

previewIframe.setAttribute('src', url);
previewGoToPageBtn.setAttribute('href', url);
previewDescription.textContent = description;

previewModal.style.display = 'flex';
});
});

function closePreviewModal() {
previewModal.style.display = 'none';
previewIframe.setAttribute('src', 'about:blank');
}

previewCloseBtn.addEventListener('click', closePreviewModal);


videoTourBtn.addEventListener('click', () => {
videoIframe.src = "https://streamable.com/e/jzhzr1?loop=0&autoplay=1&muted=0";
videoModal.style.display = 'flex';
});

function closeVideoModal() {
videoModal.style.display = 'none';
videoIframe.src = '';
}

videoModal.addEventListener('click', closeVideoModal);


// Redraw connectors on resize
window.addEventListener('resize', () => {
clearTimeout(debounceTimer);
debounceTimer = setTimeout(drawConnectors, 100);
});



/// =======================================================
// === 通用懸浮視窗編輯器 (最終版 - 標題修正) ===
// =======================================================
document.addEventListener('DOMContentLoaded', function() {

// --- 為動態生成的「自訂題目」輸入框加上排除標記 (保持不變) ---

const originalShowCustomTopicInput = window.showCustomTopicInput;
window.showCustomTopicInput = function(buttonElement) {
originalShowCustomTopicInput(buttonElement);
const customTopicInput = document.getElementById('customTopic');
if (customTopicInput) {
customTopicInput.classList.add('no-modal-editor');
}
};

const originalShowArgumentCustomTopicInput = window.showArgumentCustomTopicInput;
window.showArgumentCustomTopicInput = function(buttonElement) {
originalShowArgumentCustomTopicInput(buttonElement);
const argumentCustomTopicInput = document.getElementById('argumentCustomTopic');
if (argumentCustomTopicInput) {
argumentCustomTopicInput.classList.add('no-modal-editor');
}
};

const originalShowExpandCustomTopicInput = window.showExpandCustomTopicInput;
window.showExpandCustomTopicInput = function(buttonElement) {
originalShowExpandCustomTopicInput(buttonElement);
const container = document.getElementById('expandCustomTopicInputArea');
if (container) {
container.querySelectorAll('input[type="text"], textarea').forEach(el => el.classList.add('no-modal-editor'));
}
};

// --- 懸浮視窗核心邏輯 (標題生成部分已重寫) ---

const modal = document.getElementById('outline-editor-modal');
const modalTextarea = document.getElementById('modal-textarea');
const modalTitle = document.getElementById('modal-title');
const modalSaveBtn = document.getElementById('modal-save-btn');
const modalCloseBtn = document.getElementById('modal-close-btn');

if (!modal || !modalTextarea || !modalSaveBtn || !modalCloseBtn) {
console.error("懸浮視窗的 HTML 結構不完整或未找到！");
return;
}

let currentEditingElement = null;


// 範文庫資料 (放在這裡以便全域存取)
const textLibrary = {
    "version": "1.0",
    "texts": [
        { "title": "廉頗藺相如列傳", "content": "廉頗者，趙之良將也。趙惠文王十六年 ，廉頗為趙將伐齊 ，大破之，取陽晉，拜為上卿 ，以勇氣聞於諸侯。藺相如者，趙人也，為趙宦者令繆賢舍人 。\n\n趙惠文王時，得楚和氏璧 。秦昭王聞之，使人遺 趙王書，願以十五城請易璧。趙王與大將軍廉頗諸大臣謀：欲予秦，秦城恐不可得，徒見欺 ；欲勿予，即患秦兵之來。計未定，求人可使報秦者 ，未得。\n\n　　宦者令繆賢曰：「臣舍人藺相如可使 。」王問：「何以知之？」對曰：「臣嘗有罪，竊計欲亡走燕 ，臣舍人相如止臣，曰：『君何以知燕王？』臣語 曰：『臣嘗從大王與燕王會境上 ，燕王私握臣手，曰「願結友。」以此知之，故欲往。』相如謂臣曰：『夫趙彊而燕弱，而君幸於趙王 ，故燕王欲結於君。今君乃亡趙走燕，燕畏趙，其勢必不敢留君，而束君歸趙矣 。君不如肉袒伏斧質請罪 ，則幸得脫矣。』臣從其計，大王亦幸赦臣。臣竊以為其人勇士，有智謀，宜可使。」\n\n　　於是王召見，問藺相如曰：「秦王以十五城請易寡人之璧，可予不 ？」相如曰：「秦彊而趙弱，不可不許。」王曰：「取吾璧，不予我城，奈何？」相如曰：「秦以城求璧而趙不許，曲 在趙；趙予璧而秦不予趙城，曲在秦。均之二策 ，寧許以負秦曲 。」王曰：「誰可使者？」相如曰：「王必無人 ，臣願奉璧往使 。城入趙而璧留秦；城不入，臣請完璧歸趙 。」趙王於是遂遣相如奉璧西入秦。\n\n　　秦王坐章台見相如 ，相如奉璧奏秦王 。秦王大喜，傳以示美人及左右 ，左右皆呼萬歲。相如視秦王無意償趙城，乃前曰：「璧有瑕 ，請指示王。」王授璧，相如因持璧，卻立 ，倚柱，怒髮上衝冠 ，謂秦王曰：「大王欲得璧，使人發書至趙王，趙王悉召羣臣議，皆曰：『秦貪，負其彊 ，以空言求璧，償城恐不可得』。議不欲予秦璧。臣以為布衣之交尚不相欺 ，況大國乎！且以一璧之故逆彊秦之驩 ，不可。於是趙王乃齋戒 五日，使臣奉璧，拜送書於庭 。何者？嚴大國之威以修敬也 。今臣至，大王見臣列觀 ，禮節甚倨 ；得璧，傳之美人，以戲弄臣。臣觀大王無意償趙王城邑，故臣復取璧。大王必欲急 臣，臣頭今與璧俱碎於柱矣！」\n\n　　相如持其璧睨 柱，欲以擊柱。秦王恐其破璧，乃辭謝固請 ，召有司案圖 ，指從此以往十五都予趙 。\n\n　　相如度秦王特以詐佯為予趙城 ，實不可得，乃謂秦王曰：「和氏璧，天下所共傳寶也 。趙王恐，不敢不獻。趙王送璧時，齋戒五日，今大王亦宜齋戒五日，設九賓於廷 ，臣乃敢上璧。」秦王度之，終不可彊奪 ，遂許齋五日，舍相如廣成傳 。\n\n　　相如度秦王雖齋，決負約不償城，乃使其從者衣褐 ，懷其璧，從徑道 亡 ，歸璧於趙。\n\n　　秦王齋五日後，乃設九賓禮於廷，引趙使者藺相如。相如至，謂秦王曰：「秦自繆公 以來二十餘君，未嘗有堅明約束者也 。臣誠恐見欺於王而負趙，故令人持璧歸，間至趙矣 。且秦彊而趙弱，大王遣一介 之使至趙，趙立奉璧來；今以秦之彊而先割十五都予趙，趙豈敢留璧而得罪於大王乎？臣知欺大王之罪當誅，臣請就湯鑊 。唯大王與羣臣孰計議之 ！」\n\n　　秦王與羣臣相視而嘻 。左右或欲引相如去 ，秦王因 曰：「今殺相如，終不能得璧也，而絕秦趙之驩，不如因而厚遇之 ，使歸趙，趙王豈以一璧之故欺秦邪 ！」卒廷見相如 ，畢禮而歸之。\n\n　　相如既歸，趙王以為賢大夫，使不辱於諸侯 ，拜相如為上大夫 。\n\n　　秦亦不以城予趙，趙亦終不予秦璧。\n\n　　其後秦伐趙，拔石城。明年，復攻趙，殺二萬人。\n\n　　秦王使使者告趙王，欲與王為好會於西河外澠池 。趙王畏秦，欲毋行 。廉頗、藺相如計曰：「王不行，示趙弱且怯也。」趙王遂行，相如從。廉頗送至境，與王訣曰 ：「王行，度道里會遇之禮畢 ，還，不過三十日。三十日不還，則請立太子為王，以絕秦望。」王許之，遂與秦王會澠池。\n\n　　秦王飲酒酣 ，曰：「寡人竊聞趙王好音，請奏瑟 。」趙王鼓瑟。秦御史前書曰 ：「某年月日，秦王與趙王會飲，令趙王鼓瑟。」藺相如前曰：「趙王竊聞秦王善為秦聲，請奏盆缻秦王 ，以相娛樂。」秦王怒，不許。於是相如前進缻，因跪請秦王。秦王不肯擊缻。相如曰：「五步之內，相如請得以頸血濺大王矣 ！」左右欲刃相如 ，相如張目叱之，左右皆靡 。於是秦王不懌 ，為一擊缻。相如顧 召趙御史書曰：「某年月日，秦王為趙王擊缻。」秦之羣臣曰：「請以趙十五城為秦王壽 。」藺相如亦曰：「請以秦之咸陽 為趙王壽。」\n\n　　秦王竟酒 ，終不能加勝於趙。趙亦盛設兵以待秦，秦不敢動。\n\n　　既罷歸國，以相如功大，拜為上卿，位在廉頗之右。\n\n　　廉頗曰：「我為趙將，有攻城野戰之大功，而藺相如徒以口舌為勞 ，而位居我上，且相如素賤人 ，吾羞，不忍為之下 。」宣言曰：「我見相如，必辱之。」相如聞，不肯與會。相如每朝時，常稱病，不欲與廉頗爭列 。已而 相如出，望見廉頗，相如引車避匿 。\n\n　　於是舍人相與諫曰：「臣所以去親戚而事君者 ，徒慕君之高義也 。今君與廉頗同列，廉君宣惡言而君畏匿之，恐懼殊甚，且庸人尚羞之，況於將相乎！臣等不肖 ，請辭去。」藺相如固止之，曰：「公之視廉將軍孰與秦王 ？」曰：「不若也 。」相如曰：「夫以秦王之威，而相如廷叱之，辱其羣臣，相如雖駑 ，獨畏廉將軍哉？顧 吾念之，彊秦之所以不敢加兵於趙者，徒以吾兩人在也。今兩虎共鬥，其勢不俱生 。吾所以為此者，以先國家之急而後私讎也 。」\n\n　　廉頗聞之，肉袒 負荊 ，因賓客至藺相如門謝罪 。曰：「鄙賤之人，不知將軍寬之至此也 。」\n\n　　卒相與驩，為刎頸之交 。" },
        { "title": "山居秋暝", "content": "空山新雨後 ，天氣晚來秋。\n明月松間照，清泉石上流。\n竹喧歸浣女，蓮動下漁舟。 \n隨意春芳歇 ，王孫自可留 。" },
        { "title": "月下獨酌", "content": "花間一壺酒，獨酌無相親 。 \n舉杯邀明月，對影成三人 。\n月既不解 飲，影徒隨我身。\n暫伴月將 影，行樂須及春 。 \n我歌月徘徊 ，我舞影零亂 。 \n醒時同交歡 ，醉後各分散 。\n永結無情遊 ，相期邈雲漢 。" },
        { "title": "登樓", "content": "花近高樓傷客心， 萬方多難此登臨。 \n錦江春色來天地， 玉壘浮雲變古今。 \n北極朝廷終不改， 西山寇盜莫相侵。 \n可憐後主還祠廟， 日暮聊為〈梁甫吟〉。" },
        { "title": "師說", "content": "古之學者必有師。師者，所以傳道、受業 、解惑也。人非生而知之者 ，孰能無惑？惑而不從師，其為惑也終不解矣。\n\n生乎吾前，其聞道 也固 先乎吾，吾從而師之；生乎吾後，其聞道也亦先乎吾，吾從而師之。吾師道也，夫庸知 其年之先後生於吾乎？是故無貴無賤，無長無少，道之所存，師之所存也。\n\n嗟乎！師道之不傳也久矣！欲人之無惑也難矣！古之聖人，其出人也遠矣，猶且從師而問焉；今之眾人，其下聖人也亦遠矣，而恥學於師；是故聖益聖，愚益愚，聖人之所以為聖，愚人之所以為愚，其 皆出於此乎？\n\n愛其子，擇師而教之，於其身也，則恥師焉，惑矣！彼童子之師，授之書而習其句讀 者也，非吾所謂傳其道，解其惑者也。句讀之不知，惑之不解，或師焉，或不焉，小學而大遺，吾未見其明也。\n\n巫醫 、樂師，百工之人，不恥相師；士大夫之族，曰師、曰弟子云者，則群聚而笑之，問之，則曰：「彼與彼年相若也，道相似也。位卑則足羞，官盛則近諛 。」嗚呼！師道之不復可知矣。巫、醫、樂師、百工之人，君子 不齒 ，今其智乃反不能及，其可怪也歟！\n\n聖人無常師 ，孔子師郯子 、萇弘 、師襄 、老聃 。郯子之徒，其賢不及孔子。孔子曰：「三人行，則必有我師。」 是故弟子不必不如師，師不必賢於弟子，聞道有先後，術業有專攻，如是而已。\n\n李氏子蟠 ，年十七，好古文，六藝 經傳，皆通習之；不拘於時，學於余，余嘉其能行古道，作〈師說〉以貽 之。" },
        { "title": "岳陽樓記", "content": "慶曆四年春 ，滕子京 謫守巴陵郡 。越明年，政通人和，百廢具 興。乃重修岳陽樓，增其舊制，刻唐賢、今人詩賦於其上；屬 予作文以記之。\n\n予觀夫巴陵勝狀 ，在洞庭一湖。銜遠山，吞長江，浩浩湯湯 ，橫無際涯；朝暉夕陰，氣象萬千。此則岳陽樓之大觀也，前人之述備 矣。然則北通巫峽 ，南極瀟湘 ，遷客騷人 ，多會於此，覽物之情，得無異乎？\n\n若夫霪雨霏霏 ，連月不開；陰風怒號 ，濁浪排空；日星隱耀，山岳潛形；商旅不行，檣傾楫摧 ；薄暮冥冥 ，虎嘯猿啼。登斯樓也，則有去國 懷鄉，憂讒畏譏，滿目蕭然 ，感極而悲者矣。\n\n至若春和景明 ，波瀾不驚 ，上下天光，一碧萬頃；沙鷗翔集 ，錦鱗游泳，岸芷汀蘭 ，郁郁青青 。而或長煙一空 ，皓月千里，浮光躍金 ，靜影沉璧 ；漁歌互答，此樂何極！登斯樓也，則有心曠神怡 ，寵辱 皆忘，把酒臨風 ，其喜洋洋 者矣。\n\n嗟夫！予嘗求古仁人之心，或異二者之為 。何哉？不以物喜，不以己悲 。居廟堂之高 ，則憂其民；處江湖之遠 ，則憂其君。是進亦憂，退亦憂，然則何時而樂耶？其必曰：「先天下之憂而憂，後天下之樂而樂」歟！噫！微斯人 ，吾誰與歸 ！" },
        { "title": "始得西山宴遊記", "content": "自余為僇人 ，居是州，恒惴慄 。其隙也 ，則施施 而行，漫漫 而遊。日與其徒 上高山，入深林，窮迴溪 ，幽泉 怪石，無遠不到。到則披草 而坐，傾壺而醉。醉則更相枕 以臥，臥而夢。意有所極 ，夢亦同趣 。覺 而起，起而歸。以為凡是州之山有異態者，皆我有也，而未始知西山之怪特。\n\n今年九月二十八日，因坐法華西亭 ，望西山，始指異之 。遂命僕過湘江 ，緣染溪 ，斫榛莽 。焚茅茷 ，窮 山之高而止。\n\n攀援而登，箕踞而遨 ，則凡數州之土壤 ，皆在衽席 之下。其高下之勢，岈然窪然 ，若垤 若穴，尺寸千里 ，攢蹙累積 ，莫得遯隱 。縈青繚白 ，外與天際 ，四望如一。然後知是山之特出，不與培塿 為類。悠悠乎與顥氣 俱，而莫得其涯；洋洋 乎與造物者遊 ，而不知其所窮。\n\n引 觴滿酌，頹然 就醉，不知日之入。蒼然暮色 ，自遠而至，至無所見，而猶不欲歸。心凝形釋 ，與萬化冥合 。然後知吾嚮 之未始 遊，遊於是乎始，故為之文以志 。是歲元和四年 也。" },
        { "title": "念奴嬌‧赤壁懷古", "content": "大江東去，浪淘盡、千古風流人物。故壘西邊，人道是、三國周郎 赤壁。亂石穿空，驚濤拍岸，捲起千堆雪。江山如畫，一時多少豪傑！\n\n遙想公瑾當年，小喬 初嫁了，雄姿英發。羽扇綸巾 ，談笑間、檣櫓 灰飛煙滅。故國 神遊，多情應笑我，早生華髮 。人間如夢，一尊 還酹 江月。" },
        { "title": "青玉案", "content": "東風夜放花千樹，更吹落，星如雨。寶馬雕車香滿路。鳳簫聲動，玉壺光轉，一夜魚龍舞。 \n\n蛾兒雪柳黃金縷，笑語盈盈暗香去。眾裏尋他千百度；驀然迴首，那人卻在，燈火闌珊處。" },
        { "title": "聲聲慢", "content": "尋尋覓覓，冷冷清清，悽悽慘慘戚戚。乍暖還寒時候， 最難將息。 三杯兩盞淡酒，怎敵他，晚來風急？雁過也，正傷心，卻是舊時相識。\n\n滿地黃花堆積， 憔悴損，如今有誰堪摘？守著窗兒，獨自怎生得黑！梧桐更兼細雨，到黃昏、點點滴滴。這次第，怎一箇愁字了得！" },
        { "title": "逍遙遊", "content": "惠子 謂莊子曰：「魏王貽我大瓠之種 ，我樹之成而實五石 。以盛水漿，其堅不能自舉也 。剖之以為瓢 ，則瓠落無所容 。非不呺然 大也，吾為其無用而掊之 。」莊子曰：「夫子固拙於 用大矣！宋人有善為不龜手之藥者 ，世世以洴澼絖為事 。客聞之，請買其方百金。聚族而謀曰：『我世世為洴澼絖，不過數金；今一朝而鬻技百金 ，請與之。』客得之，以說 吳王。越有難 ，吳王使之將 ，冬與越人水戰，大敗越人，裂地 而封之。能不龜手一也 ；或以封，或不免於洴澼絖，則所用之異也 。今子有五石之瓠，何不慮以為大樽而浮於江湖 ，而憂其瓠落無所容，則夫子猶有蓬之心也夫 ！」\n\n惠子謂莊子曰：「吾有大樹，人謂之樗 ；其大本擁腫而不中繩墨 ，其小枝卷曲而不中規矩 。立之塗 ，匠者不顧。今子之言，大而無用，衆所同去也 。」莊子曰：「子獨不見狸狌乎 ？卑身而伏，以候敖者 ；東西跳梁，不辟高下 ，中於機辟，死於罔罟 。今夫斄牛，其大若垂天之雲 ；此能為大矣，而不能執鼠 。今子有大樹，患其無用，何不樹之於無何有之鄉 ，廣莫之野 ，彷徨乎無為其側，逍遙乎寢臥其下 ；不夭斤斧，物無害者 。無所可用，安所困苦哉 ？」" },
        { "title": "出師表", "content": "先帝創業未半 ，而中道崩殂 ；今天下三分 ，益州疲弊 ，此誠危急存亡之秋也﹗然侍衞之臣，不懈於內；忠志之士，忘身於外者 ，蓋追先帝之殊遇，欲報之於陛下也 。誠宜開張聖聽 ，以光先帝遺德 ，恢弘志士之氣 ﹔不宜妄自菲薄 ，引喻失義 ，以塞忠諫之路也 。\n\n宮中、府中，俱為一體 ；陟罰臧否 ，不宜異同。若有作姦、犯科，及為忠善者 ，宜付有司，論其刑賞 ，以昭陛下平明之治 ；不宜偏私，使內外異法也 。\n\n侍中、侍郎郭攸之、費禕、董允等 ，此皆良實，志慮忠純 ，是以先帝簡拔以遺陛下 。愚以為宮中之事，事無大小，悉以咨之 ，然後施行，必能裨補闕漏，有所廣益 。\n\n將軍向寵，性行淑均 ，曉暢軍事，試用於昔日，先帝稱之曰「能」，是以眾議舉寵為督 。愚以為營中之事，悉以咨之，必能使行陣和睦，優劣得所 。\n\n親賢臣，遠小人 ，此先漢所以興隆也﹔親小人，遠賢臣，此後漢所以傾頹也。先帝在時，每與臣論此事，未嘗不歎息痛恨於桓、靈也 ！侍中、尚書、長史、參軍 ，此悉貞良死節之臣，願陛下親之、信之，則漢室之隆，可計日而待也。\n\n臣本布衣，躬耕於南陽 ，苟全性命於亂世，不求聞達於諸侯 。先帝不以臣卑鄙，猥自枉屈 ，三顧臣於草廬之中，諮臣以當世之事；由是感激，遂許先帝以驅馳 。後值傾覆 ，受任於敗軍之際，奉命於危難之間，爾來二十有一年矣 。先帝知臣謹慎，故臨崩寄臣以大事也 。受命以來，夙夜憂歎，恐託付不效，以傷先帝之明 。故五月渡瀘，深入不毛 。今南方已定，兵甲已足，當獎率三軍，北定中原，庶竭駑鈍，攘除姦凶 ，興復漢室，還於舊都 。此臣所以報先帝而忠陛下之職分也。至於斟酌損益，進盡忠言，則攸之、禕、允之任也 。\n\n願陛下託臣以討賊興復之效；不效，則治臣之罪，以告先帝之靈。若無興德之言，則責攸之、禕、允等之慢，以彰其咎 。陛下亦宜自謀，以諮諏善道，察納雅言 ，深追先帝遺詔。臣不勝受恩感激。今當遠離，臨表涕零 ，不知所言 ！" },
        { "title": "六國論", "content": "六國破滅 ，非兵不利 ，戰不善 ，弊在賂秦 。賂秦而力虧 ，破滅之道 也。或曰：「六國互喪 ，率 賂秦耶？」曰：「不賂者以賂者喪。」蓋失強援 ，不能獨完 ，故曰「弊在賂秦」也。\n\n秦以攻取 之外，小則獲邑 ，大則得城，較秦之所得 與戰勝而得者，其實百倍；諸侯之所亡 與戰敗而亡者，其實亦百倍。則秦之所大欲，諸侯之所大患，固不在戰矣。思厥先祖父 ，暴霜露，斬荊棘 ，以有尺寸之地 。子孫視之不甚惜，舉以予人 ，如棄草芥 。今日割五城，明日割十城，然後得一夕安寢；起視四境，而秦兵又至矣。然則諸侯之地有限，暴秦之欲無厭 ，奉之彌 繁，侵之愈急，故不戰而強弱勝負已判 矣。至於顛覆 ，理固宜然。古人 云：「以地事秦，猶抱薪救火，薪不盡，火不滅。」 此言得之。 \n\n齊人未嘗賂秦，終繼五國遷滅 ，何哉？與嬴 而不助五國也。五國既喪，齊亦不免矣。燕趙之君，始有遠略 ，能守其土，義不賂秦 。是故燕雖小國而後亡，斯用兵之效 也。至丹以荊卿為計 ，始速禍 焉。趙嘗五戰于秦 ，二敗而三勝 ；後秦擊趙者再，李牧 連卻 之；洎牧以讒誅 ，邯鄲為郡 ，惜其用武而不終 也。\n\n且燕趙處秦革滅 殆盡之際，可謂智力孤危 ，戰敗而亡，誠不得已。向使三國各愛其地 ，齊人勿附於秦，刺客不行 ，良將 猶在，則勝負之數 ，存亡之理，當 與秦相較，或未易量 。\n\n嗚呼！以賂秦之地，封天下之謀臣；以事秦之心，禮 天下之奇才；幷力西嚮 ，則吾恐秦人食之不得下嚥 也。悲夫！有如此之勢，而為秦人積威 之所劫，日削月割，以趨於亡！為國者無使為積威之所劫哉！\n\n夫六國與秦皆諸侯，其勢弱於秦，而猶有可以不賂而勝之之勢；茍以天下之大，而從六國破亡之故事 ，是又在六國下矣！" },
        { "title": "勸學", "content": "君子曰：學不可以已 。青，取之於藍 ，而青於藍 ；冰，水為之，而寒於水。木直中繩 ，輮 以為輪，其曲中規 ；雖有槁暴 、不復挺 者，輮使之然也。故木受繩則直 ，金就礪 則利，君子博學而日參省 乎己，則知 明而行 無過矣。\n\n吾嘗終日而思矣，不如須臾 之所學也；吾嘗跂 而望矣，不如登高之博見也。登高而招，臂非加長也，而見者遠。順風而呼，聲非加疾 也，而聞者彰 。假輿馬者 ，非利足 也，而致 千里；假舟楫 者，非能水 也，而絕江河 。君子生非異 也，善假於物 也。\n\n積土成山，風雨興焉；積水成淵 ，蛟龍 生焉；積善成德，而神明 自得，聖心 備焉。故不積跬步 ，無以至千里；不積小流，無以成江海。騏驥 一躍，不能十步；駑馬十駕 ，功在不舍 。鍥 而舍之，朽木不折；鍥而不舍，金石可鏤 。螾 無爪牙之利，筋骨之強，上食埃土 ，下飲黃泉，用心一也。蟹六跪而二螯 ，非蛇蟺 之穴無可寄託者，用心躁 也。" },
        { "title": "論仁、論孝、論君子", "content": "論仁\n(1)子曰：「不仁者，不可以久處約 ，不可以長處樂。仁者安仁，知者利仁 。」（《里仁》第四）\n(2)子曰：「富與貴，是人之所欲也；不以其道得之，不處也 。貧與賤，是人之所惡也；不以其道得之 ，不去 也。君子去仁，惡乎成名 ？君子無終食之間違仁 ，造次必於是 ，顛沛必於是。」（《里仁》第四）\n(3)顏淵問仁。\n子曰：「克己復禮為仁 。一日克己復禮，天下歸仁焉。為仁由己，而由人乎哉 ？」\n顏淵曰：「請問其目 。」子曰：「非禮勿視，非禮勿聽，非禮勿言，非禮勿動 。」\n顏淵曰：「回雖不敏，請事斯語矣 。」（《顏淵》第十二）\n(4)子曰：「志士仁人，無求生以害仁，有殺身以成仁 。」（《衛靈公》第十五）\n\n論孝\n(5)孟懿子 問孝。子曰：「無違 。」\n樊遲御 ，子告之曰：「孟孫問孝於我，我對曰，無違。」\n樊遲曰：「何謂也？」子曰：「生事之以禮 ；死葬之以禮，祭之以禮 。」（《為政》第二）\n(6)子游 問孝。子曰：「今之孝者，是謂能養 。至於犬馬，皆能有養 ；不敬，何以別乎 ！」（《為政》第二）\n\n(7)子曰：「事父母幾諫 ，見志不從，又敬不違，勞而不怨 。」（《里仁》第四）\n(8)子曰：「父母之年，不可不知也。一則以喜，一則以懼 。」（《里仁》第四）\n\n論君子\n(9)子曰：「君子不重則不威 ；學則不固 。主忠信 。無友不如己者 。過則勿憚改 。」（《學而》第一）\n(10)子曰：「君子坦蕩蕩，小人長戚戚 。」（《述而》第七）\n(11)司馬牛 問君子。子曰：「君子不憂不懼。」曰：「不憂不懼，斯謂之君子已乎 ？」子曰：「內省不疚，夫何憂何懼 ？」（《顏淵》第十二）\n(12)子曰：「君子成人之美，不成人之惡 。小人反是 。」（《顏淵》第十二）\n(13)子曰：「君子恥其言而過其行 。」（《憲問》第十四）\n(14)子曰：「君子義以為質 ，禮以行之，孫以出之，信以成之 。君子哉！」（《衛靈公》第十五）\n(15)子曰：「君子病無能焉，不病人之不己知也 。」（《衛靈公》第十五）\n(16)子曰：「君子求諸己，小人求諸人 。」（《衛靈公》第十五）" },
        { "title": "魚我所欲也", "content": "孟子曰：「魚，我所欲也，熊掌，亦我所欲也；二者不可得兼，舍魚而取熊掌 者也。生亦我所欲也，義亦我所欲也；二者不可得兼，舍生而取義者也。\n\n「生亦我所欲，所欲有甚於生者，故不為苟得 也；死亦我所惡 ，所惡有甚於死者，故患有所不辟 也。如使人之所欲莫甚於生，則凡可以得生者，何不用也？使人之所惡莫甚於死者，則凡可以辟患者，何不為也？由是則生而有不用也，由是則可以辟患而有不為也，是故所欲有甚於生者，所惡有甚於死者。非獨賢者有是心也，人皆有之，賢者能勿喪耳 。\n\n一簞食 ，一豆羹 ，得之則生，弗 得則死。嘑爾而與之 ，行道之人弗受 ；蹴爾而與之 ，乞人不屑也 ；萬鍾 則不辯 禮義而受之。萬鍾於我何加 焉？為宮室之美、妻妾之奉 、所識窮乏者得我與 ？鄉 為身死而不受，今為宮室之美為之；鄉為身死而不受，今為妻妾之奉為之；鄉為身死而不受，今為所識窮乏者得我而為之，是亦不可以已 乎？此之謂失其本心 。」" }
    ]
};



	
/* === 修改後的 openModalEditor (手機版不自動彈出鍵盤) === */
function openModalEditor(element) {
    currentEditingElement = element;
    modalTextarea.value = currentEditingElement.value;

    let titleText = '編輯內容'; 

    // === 標題生成邏輯 (保持不變) ===
    if (element.id === 'writingContent' || element.id === 'argumentWritingContent') {
        titleText = '輸入您的文章';
    } else {
        const parentTableCell = element.closest('td');
        if (parentTableCell) {
            const parentRow = parentTableCell.closest('tr');
            if (parentRow) {
                const headerCell = parentRow.cells[0];
                const table = parentRow.closest('table');
                if (table && table.rows.length > 0) {
                    const columnHeaderCell = table.rows[0].cells[parentTableCell.cellIndex];
                    const rowTitle = headerCell ? headerCell.textContent.trim().replace(/[:：]/g, '') : '';
                    const colTitle = columnHeaderCell ? columnHeaderCell.textContent.trim().replace(/[:：]/g, '') : '';
                    if (rowTitle && colTitle && rowTitle !== colTitle) {
                        titleText = `編輯「${rowTitle}」的「${colTitle}」`;
                    } else if (rowTitle) {
                        titleText = `編輯「${rowTitle}」`;
                    } else if (colTitle) {
                        titleText = `編輯「${colTitle}」`;
                    }
                }
            }
        } else {
            let associatedLabel = null;
            if (element.id) {
                associatedLabel = document.querySelector(`label[for="${element.id}"]`);
            }
            if (!associatedLabel) {
                const parentContainer = element.closest('div');
                if (parentContainer) {
                    associatedLabel = parentContainer.querySelector('label');
                }
            }
            if (associatedLabel) {
                titleText = `編輯「${associatedLabel.textContent.trim().replace(/[:：]/g, '')}」`;
            }
        }
    }

    modalTitle.textContent = titleText;

    // === 範文選擇器邏輯 (修正版) ===
    const templateSelect = document.getElementById('modal-template-select');
    
    if (element.id === 'readingPassage') {
        templateSelect.style.display = 'block';
        
        // 1. 如果選項還沒建立，先建立選項 (只執行一次)
        if (templateSelect.options.length <= 1) { 
            textLibrary.texts.forEach(text => {
                const option = document.createElement('option');
                option.value = text.content;
                option.textContent = text.title;
                templateSelect.appendChild(option);
            });
        }

        // 2. ★★★ 關鍵修正：將 onchange 監聽器移到 if 外面 ★★★
        // 這樣每次打開視窗時，都會確保監聽器是運作中的
        templateSelect.onchange = function() {
            if (this.value) {
                modalTextarea.value = this.value;
            }
        };

        // 3. 重置選單回到「指定範文」預設選項
        templateSelect.value = ""; 

    } else {
        templateSelect.style.display = 'none';
        templateSelect.onchange = null; // 其他輸入框不需要此功能
    }

    // 顯示視窗
    modal.style.display = 'flex';

    // === 鍵盤控制邏輯 (保持不變) ===
    modalTextarea.blur();
    if (window.innerWidth > 1024) {
        setTimeout(() => {
            modalTextarea.focus();
        }, 50);
    } 
}

function closeModalEditor() {
modal.style.display = 'none';
currentEditingElement = null;
}

function saveAndCloseEditor() {
if (currentEditingElement) {
currentEditingElement.value = modalTextarea.value;
if (currentEditingElement.id === 'expandContent') {
updateCharCount();
}
}
closeModalEditor();
}




// 主事件監聽器 (保持不變)
document.body.addEventListener('click', function(event) {
    const target = event.target;

    const isTextInput = target.tagName === 'INPUT' && target.type === 'text';
    const isTextarea = target.tagName === 'TEXTAREA';

    // 檢查是否為需要觸發懸浮視窗的輸入框
    if ((isTextInput || isTextarea) && !target.classList.contains('no-modal-editor') && target.id !== 'modal-textarea') {
        event.preventDefault(); // 阻止瀏覽器預設的聚焦行為
        target.blur();          // ★ 關鍵：讓原本點擊的框立刻失焦，防止手機鍵盤閃現
        openModalEditor(target);
    }
});

// 為懸浮視窗的按鈕和外部區域綁定事件 (保持不變)
modalSaveBtn.addEventListener('click', saveAndCloseEditor);
modalCloseBtn.addEventListener('click', closeModalEditor);

});



// =======================================================
// === 全新評等系統邏輯 (Grading System Logic) ===
// =======================================================

let radarChartInstance = null; // 全域變數，用於存放雷達圖實例

/**
* 建立評等系統的完整 HTML 結構 (修訂版)
* @param {string} uniqueIdPrefix - 用於區分不同功能區塊的唯一前綴
* @returns {string} HTML 字符串
*/
/**
* 建立評等系統的完整 HTML 結構 (修訂版：直接注入分數)
* @param {string} uniqueIdPrefix - 用於區分不同功能區塊的唯一前綴
* @param {object} scores - (新) AI 評分結果物件，若無則為 null
* @param {string} grade - (新) 最終等級
* @returns {string} HTML 字符串
*/
function createGradingSystemHTML(uniqueIdPrefix, scores = null, grade = "3") {
    // 1. 獲取分數 (如果 scores 存在就用 scores，否則用預設值 5)
    // 透過 || 運算符處理可能的 undefined，確保有數值
    const c = scores ? (scores.content || 0) : 5;
    const e = scores ? (scores.expression || 0) : 5;
    const s = scores ? (scores.structure || 0) : 5;
    
    // 標點和錯別字目前 AI 沒評分，維持固定值
    const p = 5; 
    const t = 1; // 錯別字預設 1 分 (3分滿分)

    // 2. 計算顯示用的總分與百分比寬度
    const c_disp = c * 4;
    const e_disp = e * 3;
    const s_disp = s * 2;
    const p_disp = p * 1;
    const t_disp = t;
    
    const totalScore = c_disp + e_disp + s_disp + p_disp + t_disp;
    const cappedTotal = Math.min(totalScore, 100);

    // 3. 生成 HTML (直接將 width 和 value 寫死在 HTML 裡)
    return `
    <div class="grading-container">
        <div class="grading-grid">
            <div class="grading-scores">
                <h3>評等</h3>
                
                <!-- 內容 -->
                <div class="score-item">
                    <label>內容 (40)</label>
                    <div class="slider-container">
                        <div class="progress-bar-container">
                            <div id="${uniqueIdPrefix}ContentScoreFill" class="progress-bar-fill" style="width: ${c * 10}%"></div>
                        </div>
                        <span id="${uniqueIdPrefix}ContentScoreDisplay" class="score-display">${c_disp}</span>
                    </div>
                </div>

                <!-- 表達 -->
                <div class="score-item">
                    <label>表達 (30)</label>
                    <div class="slider-container">
                        <div class="progress-bar-container">
                            <div id="${uniqueIdPrefix}ExpressionScoreFill" class="progress-bar-fill" style="width: ${e * 10}%"></div>
                        </div>
                        <span id="${uniqueIdPrefix}ExpressionScoreDisplay" class="score-display">${e_disp}</span>
                    </div>
                </div>

                <!-- 結構 -->
                <div class="score-item">
                    <label>結構 (20)</label>
                    <div class="slider-container">
                        <div class="progress-bar-container">
                            <div id="${uniqueIdPrefix}StructureScoreFill" class="progress-bar-fill" style="width: ${s * 10}%"></div>
                        </div>
                        <span id="${uniqueIdPrefix}StructureScoreDisplay" class="score-display">${s_disp}</span>
                    </div>
                </div>

                <!-- 標點 -->
                <div class="score-item">
                    <label>標點字體 (10)</label>
                    <div class="slider-container">
                        <div class="progress-bar-container">
                            <div id="${uniqueIdPrefix}PunctuationScoreFill" class="progress-bar-fill" style="width: ${p * 10}%"></div>
                        </div>
                        <span id="${uniqueIdPrefix}PunctuationScoreDisplay" class="score-display">${p_disp}</span>
                    </div>
                </div>

                <!-- 錯別字 -->
                <div class="score-item">
                    <label>錯別字 (+3)</label>
                    <div class="slider-container">
                        <div class="progress-bar-container">
                            <!-- 錯別字滿分是3，所以寬度計算不同 -->
                            <div id="${uniqueIdPrefix}TypoScoreFill" class="progress-bar-fill" style="width: ${(t / 3) * 100}%"></div>
                        </div>
                        <span id="${uniqueIdPrefix}TypoScoreDisplay" class="score-display">${t_disp}</span>
                    </div>
                </div>

                <!-- 隱藏的 input 用於數值儲存 (確保 value 是真實分數) -->
                <input type="hidden" id="${uniqueIdPrefix}ContentScore" value="${c}">
                <input type="hidden" id="${uniqueIdPrefix}ExpressionScore" value="${e}">
                <input type="hidden" id="${uniqueIdPrefix}StructureScore" value="${s}">
                <input type="hidden" id="${uniqueIdPrefix}PunctuationScore" value="${p}">
                <input type="hidden" id="${uniqueIdPrefix}TypoScore" value="${t}">

                <div class="total-score-container">
                    <span id="${uniqueIdPrefix}TotalScoreDisplay">總分: ${cappedTotal} / 100</span>
                    <span id="${uniqueIdPrefix}FinalGrade">等級: ${grade}</span>
                </div>
            </div>
            
            <div class="grading-radar">
                <h3>能力雷達圖</h3>
                <div class="radar-chart-container">
                    <canvas id="${uniqueIdPrefix}RadarChart"></canvas>
                </div>
            </div>
        </div>
    </div>
    `;
}

/**
* 初始化評等系統，包括設定分數和繪製初始圖表
* @param {string} uniqueIdPrefix - 用於區分不同功能區塊的唯一前綴
* @param {object} initialScores - 包含初始分數的物件
* @param {string} finalGrade - 【新】直接傳入最終計算好的等級
*/
function initializeGradingSystem(uniqueIdPrefix, initialScores = {}, finalGrade) {
    // 確保 initialScores 和 initialScores.radar 存在
    if (!initialScores || !initialScores.radar) {
        console.error("初始化評分系統時缺少必要的分數數據。");
        return;
    }

    // 將最終計算出的分數設定到隱藏的 input 中，這些 input 是後續計算的基礎
    document.getElementById(`${uniqueIdPrefix}ContentScore`).value = initialScores.content;
    document.getElementById(`${uniqueIdPrefix}ExpressionScore`).value = initialScores.expression;
    document.getElementById(`${uniqueIdPrefix}StructureScore`).value = initialScores.structure;
    
    // 標點和錯別字分數使用固定的預設值
    document.getElementById(`${uniqueIdPrefix}PunctuationScore`).value = 5;
    document.getElementById(`${uniqueIdPrefix}TypoScore`).value = 1;

    // 呼叫更新函式，它會處理所有介面元素的更新，包括顯示分數、進度條和雷達圖
    updateScoresAndGrade(uniqueIdPrefix, finalGrade, initialScores.radar);
}




/**
* 根據分數計算總分，上限為 100
* @param {string} uniqueIdPrefix - 功能區塊的唯一前綴
* @returns {number} 計算後且不超過 100 的總分
*/
function calculateTotalScore(uniqueIdPrefix) {
// 【修訂二】從隱藏的 input 中獲取原始分數 (0-10)
const content = parseInt(document.getElementById(`${uniqueIdPrefix}ContentScore`).value) * 4;
const expression = parseInt(document.getElementById(`${uniqueIdPrefix}ExpressionScore`).value) * 3;
const structure = parseInt(document.getElementById(`${uniqueIdPrefix}StructureScore`).value) * 2;
const punctuation = parseInt(document.getElementById(`${uniqueIdPrefix}PunctuationScore`).value) * 1;
const typo = parseInt(document.getElementById(`${uniqueIdPrefix}TypoScore`).value);

const totalScore = content + expression + structure + punctuation + typo;

// 返回分數，但最高不超過 100
return Math.min(totalScore, 100);
}

/**
* 根據總分決定 DSE 等級
* @param {number} score - 總分 (0-103)
* @returns {string} DSE 等級
*/
function determineGrade(score) {
if (score >= 72) return "5**";
if (score >= 69) return "5*";
if (score >= 64) return "5";
if (score >= 57) return "4";
if (score >= 50) return "3";
if (score >= 45) return "2";
return "1";
}

/**
* 更新所有分數顯示、總分、等級、進度條和雷達圖
* @param {string} uniqueIdPrefix - 功能區塊的唯一前綴
* @param {string} finalGrade - 【新】直接傳入最終計算好的等級
* @param {object} radarData - 雷達圖的數據 (可選)
*/
function updateScoresAndGrade(uniqueIdPrefix, finalGrade, radarData = null) {
    // 從隱藏的 input 獲取原始分數 (0-10 或 0-3)
    const contentVal = parseInt(document.getElementById(`${uniqueIdPrefix}ContentScore`).value);
    const expressionVal = parseInt(document.getElementById(`${uniqueIdPrefix}ExpressionScore`).value);
    const structureVal = parseInt(document.getElementById(`${uniqueIdPrefix}StructureScore`).value);
    const punctuationVal = parseInt(document.getElementById(`${uniqueIdPrefix}PunctuationScore`).value);
    const typoVal = parseInt(document.getElementById(`${uniqueIdPrefix}TypoScore`).value);

    // 更新各分項顯示（乘以權重後的分數）
    document.getElementById(`${uniqueIdPrefix}ContentScoreDisplay`).textContent = contentVal * 4;
    document.getElementById(`${uniqueIdPrefix}ExpressionScoreDisplay`).textContent = expressionVal * 3;
    document.getElementById(`${uniqueIdPrefix}StructureScoreDisplay`).textContent = structureVal * 2;
    document.getElementById(`${uniqueIdPrefix}PunctuationScoreDisplay`).textContent = punctuationVal * 1;
    document.getElementById(`${uniqueIdPrefix}TypoScoreDisplay`).textContent = typoVal;

    // 更新進度條寬度
    document.getElementById(`${uniqueIdPrefix}ContentScoreFill`).style.width = `${contentVal * 10}%`;
    document.getElementById(`${uniqueIdPrefix}ExpressionScoreFill`).style.width = `${expressionVal * 10}%`;
    document.getElementById(`${uniqueIdPrefix}StructureScoreFill`).style.width = `${structureVal * 10}%`;
    document.getElementById(`${uniqueIdPrefix}PunctuationScoreFill`).style.width = `${punctuationVal * 10}%`;
    document.getElementById(`${uniqueIdPrefix}TypoScoreFill`).style.width = `${(typoVal / 3) * 100}%`;

    // 計算並更新總分
    const totalScore = calculateTotalScore(uniqueIdPrefix);
    document.getElementById(`${uniqueIdPrefix}TotalScoreDisplay`).textContent = `總分: ${totalScore} / 100`;
    // 【修訂】直接使用傳入的 finalGrade
    document.getElementById(`${uniqueIdPrefix}FinalGrade`).textContent = `等級: ${finalGrade}`;

    // 準備並更新雷達圖數據
    let currentRadarData;
    if (radarData) {
        currentRadarData = [
            radarData.立意 || 5,
            radarData.取材 || 5,
            radarData.扣題 || 5,
            radarData.詳略 || 5,
            radarData.詞彙 || 5,
            radarData.文學性 || 5
        ];
    } else {
        // 若 AI 未提供雷達圖數據，則根據分數估算 (此為備用邏輯)
        currentRadarData = [
            Math.round((contentVal * 0.6 + structureVal * 0.4)), 
            Math.round((contentVal * 0.8 + expressionVal * 0.2)),
            Math.round((contentVal * 0.7 + structureVal * 0.3)),
            Math.round((structureVal * 0.7 + contentVal * 0.3)),
            expressionVal,
            expressionVal
        ];
    }
    createOrUpdateRadarChart(uniqueIdPrefix, currentRadarData);
}


/**
* 創建或更新雷達圖
* @param {string} uniqueIdPrefix - 功能區塊的唯一前綴
* @param {array} data - 包含五個能力值的數組
*/
function createOrUpdateRadarChart(uniqueIdPrefix, data) {
const ctx = document.getElementById(`${uniqueIdPrefix}RadarChart`).getContext('2d');

if (window[`${uniqueIdPrefix}_radarChartInstance`]) {
window[`${uniqueIdPrefix}_radarChartInstance`].data.datasets[0].data = data;
window[`${uniqueIdPrefix}_radarChartInstance`].update();
} else {
window[`${uniqueIdPrefix}_radarChartInstance`] = new Chart(ctx, {
type: 'radar',
data: {
labels: ['立意', '取材', '扣題', '詳略', '詞彙', '文學性'],
datasets: [{
label: '能力分佈',
data: data,
backgroundColor: 'rgba(54, 162, 235, 0.2)',
borderColor: 'rgba(54, 162, 235, 1)',
borderWidth: 2,
pointBackgroundColor: 'rgba(54, 162, 235, 1)',
pointBorderColor: '#fff',
pointHoverBackgroundColor: '#fff',
pointHoverBorderColor: 'rgba(54, 162, 235, 1)'
}]
},
options: {
responsive: true,
maintainAspectRatio: false,
scales: {
r: {
angleLines: {
display: true
},
suggestedMin: 0,
suggestedMax: 10,
pointLabels: {
font: {
size: 14,
family: "'Noto Serif TC', serif"
}
},
ticks: {
stepSize: 2
}
}
},
plugins: {
legend: {
display: false
}
}
}
});
}
}

/**
* 構建帶有評等指令的 API Prompt (V15 - 條件式加分)
* 此版本嚴格規定「內容」和「結構」分數必須以「扣題」分數為基礎，
* 但允許在這基礎上有條件地加一分，以獎勵表現出色的部分。
*/
function buildGradingPrompt(type, topic, content, toneNote, focus = null, plot = null) {
    const dsePrinciples = document.getElementById('dse-grading-principles').innerText;
    
   // ★★★ 核心修改：不再從 HTML 讀取範文，直接使用傳入的 RAG 結果 ★★★
    // 如果 ragReference 是空的，就顯示提示文字
    const referenceMaterials = ragReference && ragReference.trim() !== "" 
        ? ragReference 
        : "(本次未檢索到資料庫中的參考範文，請依據 DSE 標準自行評分)";

    let basePrompt = "";
    let specificInstructions = "";

    if (type === 'narrative') {
        basePrompt = `
題目：《${topic}》
${focus ? `結構段重點：${focus}` : ''}
${plot ? `情節大要：${plot}` : ''}
文章：\n${content}`;



        specificInstructions = `
### 敘事抒情專用評核指引
- 扣題判斷：文章必須在字面上緊扣題目關鍵詞，並透過具體情節體現主題
- 詳略剪裁：重點情節需詳寫，次要內容需略寫，體現層次感
- 物象運用：適當運用小物件、動作、對話和內心獨白，提高文句密度`;

        return `你將扮演一個絕對理性的AI評卷員，你的核心任務是完成一份計分工作紙，然後根據工作紙的結果生成報告。

### 你的工作流程 (必須嚴格依序執行)

1. **填寫工作紙**: 這是你的首要且最重要的任務。在 <scoring_worksheet> 標籤內，完成所有計算。
2. **分發分數到JSON**: **絕對禁止重新思考分數**。你將扮演一個數據錄入員，將 <scoring_worksheet> 中計算出的分數，精確地分發到 <grading_json> 的對應欄位。
3. **撰寫報告**: 根據 <grading_json> 的最終分數，撰寫 <critique> 等文字報告，確保文字與數字完全對應。

${specificInstructions}

---

### 你的輸出格式 (必須嚴格遵守此結構與順序)

<scoring_worksheet>
[**計分工作紙**：你必須像執行程式碼一樣，完成以下所有步驟。]
<step_1_independent_evaluation>
[對以下各項進行獨立評分，互不影響。]
<eval_item name="扣題分數評估">
規則：嚴格按照以下標尺評分，並必須引用文章中的具體內容來佐證你的評分。文章必須在*字面*及邏輯上扣連題目，所謂「字面」扣題，是指文章要反覆出現題眼或題眼的近義詞，例如題目是《勇氣》，則文中須反覆出現「勇氣」或「勇敢」等字眼。

- **7-10分 (緊扣主旨 / 5**水平):** 
能在*字面*及情節上直接呼應題目，完全能在字面上扣連題目，例如題目為《成長》，全文有較多「成長」或「成長」的近義詞，且意象連貫、深刻，絕對不接受任何只以隱喻扣題的間接形式。
令人信服地體現主旨。
多關鍵詞題目中能準確把握最重要的關鍵詞，水平與5**範文相當。

- **6分 (扣題良好 / 略遜於5**):** 
基本能扣緊題目要求，在主要情節、主旨及*字面*上與題目有明確關聯，能在字面上扣連題目，例如題目為《成長》，全文有一定數量「成長」或「成長」的近義詞，但在深度或完整性上
稍遜於頂尖水平，表現仍屬出色。絕對不接受任何只以隱喻扣題的間接形式。

- **5分 (扣題合格 / 中等水平):** 
能夠扣題，文章內容與題目有清晰關聯，但較少在字面上扣連題目，例如題目為《成長》，全文很少有「成長」或「成長」的近義詞，雖未能充分發揮題目的深層意涵，
但已達合格應試水平 (約3-4級)，絕對不接受任何只以隱喻扣題的間接形式。

- **1-4分 (偏離主題):** 
與題目關聯牽強，未能準確理解題意，或僅在表面文字上有所呼應，
實際內容偏離主題，扣題效果不佳。或沒有在字面上扣連題目，例如題目為《成長》，但全文卻沒有「成長」或「成長」的近義詞。絕對不接受任何只以隱喻扣題的間接形式。

評分 (0-10): [在此給出「扣題」的獨立分數]
</eval_item>

<eval_item name="立意分數評估">
規則：嚴格按照以下標尺評分，並必須引用文章中的句子或主旨句來佐證你的評分。
- **7-10分 (深刻新穎 / 5**水平):** 能將個人經歷 **昇華** 至普遍的人生哲理或人性反思。主題層次豐富，能探討觀點的 **矛盾或轉變**。立意新穎，能給讀者帶來深刻啟發，水平與5**範文相當。
- **6分 (見解不凡 / 略遜於5**):** 立意有一定深度，能提出個人見解，而非複述道理。思想內容雖未及頂尖水平，但已超越一般考生的層次，表現出色。
- **5分 (清晰合理 / 中等水平):** 主題清晰，緊扣個人感受，能完整表達一次經歷後的體會。立意真誠、合理，是合格的應試文章水平 (約3-4級)。
- **1-4分 (膚淺陳腐):** 立意流於表面，多為 **陳腔濫調** (例如「努力便會成功」)，或僅是 **說教式** 的口號，與文章情節缺乏有機結合。

評分 (0-10): [在此給出「立意」的獨立分數]
</eval_item>
<eval_item name="取材分數評估">
規則：嚴格按照以下標尺評分，評分時需明確指出取材的優點（如某個具體的細節）或缺點（如情節過於概括）。
- **7-10分 (新穎生動 / 5**水平):** 選取的材料 **典型** 且具 **獨特性**，能有力地支撐立意。描寫 **具體入微**，包含豐富的感官細節、動作、對話和內心獨白，能營造強烈的情感張力，水平與5**範文相當。
- **6分 (細膩具體 / 略遜於5**):** 選材恰當，頗具獨特性，能有效支撐立意。描寫具體，包含不少細節，但整體新穎性或情感張力略遜於最高水平，但遠超於3等文章水平。
- **5分 (內容恰當 / 中等水平):** 選材合理，與主旨相關。情節有基本細節，但描寫較為普遍化，缺乏令人印象深刻的亮點 (約3-4級)。
- **1-4分 (空泛籠統):** 取材流於 **流水帳**，僅概括事件而無細節描寫。內容空泛，與主旨關係薄弱，無法有效支撐觀點。

評分 (0-10): [在此給出「取材」的獨立分數]
</eval_item>
<eval_item name="詳略安排評估">
規則：嚴格按照以下標尺評分。此項評估的是文章的「敘事節奏」與「焦點分配」。
- **7-10分 (卓越 / 5**水平):** **詳略得當，重心突出**。能將最多筆墨用於高潮、轉捩點或最能體現主旨的核心情節，並以豐富的細節（感官、心理）進行刻劃。次要的過渡性內容則簡潔交代。敘事節奏控制自如，張弛有度。
- **6分 (良好 / 略遜於5**):** **主次分明**。能意識到並詳寫核心事件，但詳寫的細膩度或略寫的簡練度未及頂尖水平。文章的焦點清晰，能引導讀者關注重點。
- **5分 (中等 / 合格水平):** **平均用力**。文章能完整敘述事件，但缺乏詳略意識，從頭到尾的細節密度相近，導致核心情節不夠突出，缺乏記憶點。
- **1-4分 (失衡 / 有待改善):** **詳略嚴重失衡**。常見問題如「頭重腳輕」（開頭冗長）、「虎頭蛇尾」（結尾倉促），或將大量筆墨用於無關緊要的細節上，導致主題模糊。
特別注意：必須評論文章的重心是否放在了最關鍵的情節上。

評分 (0-10): [在此給出「詳略安排」的獨立分數]
</eval_item>

<eval_item name="結構佈局評估">
規則：嚴格按照以下標尺評分。此項評估的是文章的「組織架構」與「段落邏輯」。
- **7-10分 (精巧嚴謹 / 5**水平):** 佈局精巧，**層層推進**，而非單純的順序記述。段落劃分清晰且邏輯性強，過渡自然無痕。開頭與結尾**巧妙呼應**，使文章渾然一體。
- **6分 (良好 / 略遜於5**):** **結構穩妥，脈絡清晰**。文章組織有序，段落職能分明（如開頭、發展、結尾），起承轉合流暢。整體表現穩健，無明顯結構缺陷。
- **5分 (中等 / 合格水平):** **結構完整，尚算清晰**。文章有頭有尾，段落劃分基本合理。但段落間的聯繫可能較弱，或過渡略顯生硬（例如頻繁使用「然後」、「接著」）。
- **1-4分 (鬆散混亂 / 有待改善):** **結構鬆散，脈絡不清**。段落劃分混亂，或思想跳躍，讓讀者難以跟隨。文章可能缺乏清晰的開頭或結尾。
特別注意：此項不評估內容詳略，只評估組織架構。

評分 (0-10): [在此給出「結構佈局」的獨立分數]
</eval_item>

<eval_item name="詞彙豐富度評估">
規則：嚴格按照以下標尺評分，並必須引用文章中的詞語來佐證你的評分。
**【容錯原則】**：錯別字（例如將「得失」誤寫為「我失」）已有獨立扣分機制。在此項目評分時，請**完全忽略所有筆誤**，自動腦補為正確字詞，只評估其原本意圖使用的詞彙水平。
**【強制獨立評分】**：此項評分必須與文章內容切割。即使文章完全離題、立意膚淺或邏輯混亂，只要考生文句通順，便不應給3分或以下。

- **7-10分 (優良 / 5**水平):** 用詞精準、豐富且多樣化，能根據語境選擇最貼切的詞。善用成語、典故或富含意象的詞彙，且自然不堆砌。幾乎沒有重複用詞。水平與5**範文相當。
- **6分 (良好 / 略遜於5**):** 用詞準確，具備變化，能嘗試運用較豐富的詞彙（較少重複同一個詞彙），偶有佳句，整體表現穩健，屬良好水平。
- **4-5分 (中等 / 合格水平):** 用詞基本準確，但變化不大，偶爾出現不夠貼切或陳腔濫調的情況。能夠清晰達意，是合格的應試文章水平，經常運用虛詞（例如「的」、「了」、「呢」、「嗎」、「地」）及對話，用詞重複。
- **1-3分 (基礎 / 有待改善):** 語法不通，甚至出現詞不達意的情況，但只要考生文句基本通順，便不應給3分或以下。
特別注意：不要輕易給予高分，必須有充分理據。

評分 (0-10): [在此給出「詞彙豐富度」的獨立分數]
</eval_item>

<eval_item name="文句文學性評估">
規則：嚴格按照以下標尺評分。此項評估的是「句子工藝」，而非單純的詞彙。
**【容錯原則】**：錯別字（例如將「得失」誤寫為「我失」）已有獨立扣分機制。在此項目評分時，請**完全忽略所有筆誤**，自動腦補為正確字詞，只評估其原本意圖表達的句式與修辭效果。
**【強制獨立評分】**：此項評分必須與文章內容切割。即使文章完全離題、立意膚淺或邏輯混亂，只要考生文句通順，便不應給3分或以下。

- **7-10分 (卓越 / 5**水平):** 句式靈活多變，長短句交錯，富有節奏感。善於運用**感官描寫**和**示現手法**（Show, not Tell），能巧妙地融情入景，運用物象營造意境氛圍。文句精煉，文字具有**畫面感**和感染力。水平與5**範文相當。
- **6分 (良好 / 略遜於5**):** 句式有一定變化，能避免單調。能運用基本的描寫技巧，但細節刻劃或意境營造未及頂尖水平。整體文句流暢，但偶有冗贅之處。屬良好水平，表現穩健。
- **4-5分 (中等 / 合格水平):** 句式有基本變化，但整體**平鋪直敘**，僅能清晰交代事件，缺少深入刻劃。能使用簡單修辭，但效果不突出。常使用虛詞（的、了、地）使文句略嫌鬆散。是合格的應試文章水平，能夠清晰達意。
- **1-3分 (基礎 / 有待改善):** 語法不通，甚至出現詞不達意的情況，但只要考生文句基本通順，便不應給3分或以下。
特別注意：不要輕易給予高分，必須有充分理據。

評分 (0-10): [在此給出「文句文學性」的獨立分數]
</eval_item>

</step_1_independent_evaluation>

<step_2_high_score_validation>
[**高分驗證機制**：這是一個強制執行的覆核步驟。]
IF '扣題分數評估' >= 9 THEN
<re-evaluation name="立意分數覆核">
質疑：文章的主題思想是否真的深刻新穎，或僅僅是一個完美切題的「陳腔濫調」？（例如：《等待》寫等待母親，立意僅停留在「要珍惜親人」，這就是切題但膚淺）。
規則：完美切題但立意陳腐或淺白的文章，其「立意」分數**絕不能超過6分**。請將其與5**範文的哲理深度進行比較，然後給出最終修正分數。
修正後的立意分數 (0-10): [在此填寫修正後的分數]
</re-evaluation>
<re-evaluation name="取材分數覆核">
質疑：文章的材料是否真的獨特生動，或僅僅是一個符合題目的「公式化故事」？（例如：寫挫折，就是考試失敗，然後努力，最後成功）。
規則：切題但取材普通、缺乏亮點的故事，其「取材」分數**絕不能超過6分**。請評估其細節描寫是否達到5**範文的水平，然後給出最終修正分數。
修正後的取材分數 (0-10): [在此填寫修正後的分數]
</re-evaluation>
ELSE
[扣題分數低於9分，跳過此驗證，直接使用原始分數。]
修正後的立意分數: [複製 '立意分數評估' 的分數]
修正後的取材分數: [複製 '取材分數評估' 的分數]
END IF
</step_2_high_score_validation>

<step_3_composite_calculation>
[根據獨立評估的分數，計算最終的總項分數。]
<calc_item name="內容總分計算">
規則：「內容」總分由「立意」和「取材」的分數獨立決定，**不受「扣題」分數直接影響**。對於「扣題」分數不佳的懲罰，將由後續的JavaScript邏輯處理，AI在此階段不需考慮。
計算公式：round((立意分數 + 取材分數) / 2)
最終內容分數 (0-10): [根據上述簡化公式計算出最終分數]
</calc_item>
<calc_item name="結構總分計算">
規則：「結構」總分由「詳略安排」和「結構佈局」的平均值決定。
計算公式: round(("詳略安排評估"分數 + "結構佈-局評估"分數) / 2)
最終結構分數 (0-10): [根據上述公式計算出最終分數]
</calc_item>
<calc_item name="表達總分計算">
規則：表達總分由「詞彙豐富度」和「文句文學性」的平均值決定。
計算公式: round(("詞彙豐富度評估"分數 + "文句文學性評估"分數) / 2)
最終表達分數 (0-10): [根據上述公式計算出最終分數]
</calc_item>
</step_3_composite_calculation>
</scoring_worksheet>

<grading_json>
[**分數分發步驟**：**這是一條絕對的、機械的指令。** 你的任務是將 <scoring_worksheet> 的計算結果填入下方。]
{
"content": [複製'內容分數'的'最終分數'],
"expression": [複製'表達分數'的'最終分數'],
"structure": [複製'結構分數'的'最終分數'],
"radar": {
"立意": [複製'扣題分數'的'扣題基準分數'],
"取材": [複製'內容分數'的'最終分數'],
"扣題": [複製'扣題分數'的'扣題基準分數'],
"詳略": [複製'結構分數'的'最終分數'],
"文筆": [複製'表達分數'的'最終分數']
}
}
</grading_json>

<critique>
[根據「教學筆記」對文章進行點評，可從立意、取材、扣題、詳略、文筆等不同角度點評。必須以數字編號列點方式呈現2-3點核心評論。]
</critique>

<suggestions>
[基於 <critique> 的內容，提出改善建議。]
</suggestions>

<rewrite_example>
[提供一段約150-200字的改寫範例。]
</rewrite_example>

---
### 待評核文章資訊
${basePrompt}

### 語境參考資料
[DSE 評核準則]: ${dsePrinciples}
[5** 級數範文]: ${referenceMaterials}

### 語氣要求
<critique> 和 <suggestions> 的語氣：${toneNote}
<rewrite_example> 的語氣：請使用嚴肅正經的語氣。
`;

    } else { // argument - 保持原有的複雜邏輯，但加入容錯原則
        basePrompt = `
題目：《${topic}》
文章：\n${content}`;



        specificInstructions = `
### 議論文專用評核指引
**核心原則1：絕對嚴謹的扣題判斷**
**核心原則2：表達評分的容錯機制**

**立意評核標準**：
- 立意取決於觀點是否深入成熟
- 觀點深度層次：表面現象 → 深層原因 → 人生哲理
- 成熟度判斷：是否具備成年人的思辨深度

**取材評核標準**：
- 取材取決於論據是否充實，涵蓋古今中外
- 論據適用性：論據是否切合這道具體題目
- 覆蓋範圍：古代、現代、中外例證的平衡性

**表達評分特別指引**：
- **容錯原則**：錯別字（如將「得失」誤寫為「我失」）已有獨立扣分項目（錯別字分）。評核表達、文筆時，請**自動修正筆誤**，只評價修正後的文句流暢度與修辭技巧。絕對不可因筆誤而扣減表達分。

**內容與結構分數限制規則**：
- 即使扣題分數很高，但如果立意和取材分數低，其「內容」和「結構」分最高只能得5分
- 計算方式：內容分數 = min(5, 原計算分數) if (立意分數 ≤ 4 OR 取材分數 ≤ 4)
- 計算方式：結構分數 = min(5, 原計算分數) if (立意分數 ≤ 4 OR 取材分數 ≤ 4)

- **形式化扣題檢測流程**：
* 步驟1：提取題目核心關鍵詞（去除「論」、「談」等前綴詞）
* 步驟2：識別文章主要論述對象的關鍵詞
* 步驟3：執行字符串精確比對（character-by-character matching）
* 步驟4：IF (題目關鍵詞 === 文章關鍵詞) THEN 緊扣 ELSE 偏題/離題

- **嚴格判定規則（無例外執行）**：
* 關鍵詞完全匹配（===） = 緊扣（5-10分）
* 關鍵詞不匹配（!==） = 偏題（一般直接評為4分即可，極少情況會評為1至2分）或離題（一般直接評為3分即可，極少情況會評為1至2分）
* 題目《論禮貌》vs 文章論「禮物」→ 「禮貌」!==「禮物」→ 偏題（一般直接評為4分即可，極少情況會評為1至2分）
* 題目《論競爭》vs 文章論「合作」→ 「競爭」!==「合作」→ 偏題（一般直接評為4分即可，極少情況會評為1至2分）

例如：題目為《論禮貌》，但文中多論「禮物」，都屬於偏題，《禮貌》是一個更寬的概念，「禮貌」會包含「禮物」這個更狹窄的概念，絕不可用狹窄的概念論述寬泛的概念

- **禁止的判斷方式**：
* ❌ 語意相近性判斷（如「禮貌」與「禮儀」相近）
* ❌ 概念關聯性判斷（如「競爭」與「合作」有關聯）
* ❌ 邏輯推演判斷（如「責任心」包含「責任」）
* ❌ 文學創意判斷（如「以禮物論禮貌」的創意寫法）

- **強制執行機制**：
* 系統性：每篇文章必須執行完整的4步驟檢測流程
* 客觀性：僅基於字符串比對結果，不加入主觀判斷
* 一致性：相同字符串比對結果必須得出相同評級
* 嚴謹性：寧可誤判為偏題，不可誤判為緊扣

**範例執行**：
題目《論禮貌》：
- 文章論「禮貌」→ 「禮貌」===「禮貌」→ TRUE → 緊扣
- 文章論「禮物」→ 「禮貌」===「禮物」→ FALSE → 偏題 
- 文章論「禮儀」→ 「禮貌」===「禮儀」→ FALSE → 偏題
- 文章論「送禮」→ 「禮貌」===「送禮」→ FALSE → 偏題`;

        return `你將扮演一個絕對理性的AI評卷員，你的核心任務是完成一份計分工作紙，然後根據工作紙的結果生成報告。

### 你的工作流程 (必須嚴格依序執行)

1. **填寫工作紙**: 這是你的首要且最重要的任務。在 <scoring_worksheet> 標籤內，完成所有計算。
2. **分發分數到JSON**: **絕對禁止重新思考分數**。你將扮演一個數據錄入員，將 <scoring_worksheet> 中計算出的分數，精確地分發到 <grading_json> 的對應欄位。
3. **撰寫報告**: 根據 <grading_json> 的最終分數，撰寫 <critique> 等文字報告，確保文字與數字完全對應。

${specificInstructions}

---

### 你的輸出格式 (必須嚴格遵守此結構與順序)

<scoring_worksheet>
[**計分工作紙**：你必須像執行程式碼一樣，完成以下所有步驟。]
<step_1_topic_analysis>
<topic_keywords>題目關鍵詞: [提取題目的核心概念，如「禮貌」]</topic_keywords>
<article_focus>文章論述焦點: [識別文章主要論述的核心概念，如「禮物」、「送禮」]</article_focus>
<concept_match>概念匹配度: [比較題目關鍵詞與文章焦點是否一致]</concept_match>
</step_1_topic_analysis>

<step_2_strict_topic_judgement>
<critical_check>
**絕對嚴格扣題檢查**：
- 題目核心關鍵詞: [提取題目去除助詞後的核心概念]
- 文章核心論述詞: [識別文章主要論述的核心詞匯]
- 字面一致性檢查: [兩詞是否完全相同，YES/NO]
- 關鍵詞出現頻率: [該關鍵詞在文章中的使用次數]
- 關鍵詞重要性: [該關鍵詞是否為文章論述主線]

**形式化判斷標準**：
- 如果文章論述的核心詞匯與題目關鍵詞字面不同（如「禮貌」vs「禮物」、「責任」vs「負責」、「寬容」vs「包容」），無論內容多優秀，強制判定為「偏題」
- 如果關鍵詞雖然相同但使用頻率極低或非論述主線，判定為「偏題」
- 偏題文章扣題分數：4分或以下
- 離題文章扣題分數：3分或以下
</critical_check>

<final_topic_judgement>[基於上述形式化檢查，強制填寫「離題」、「偏題」或「緊扣」，不得有任何例外]</final_topic_judgement>
</step_2_strict_topic_judgement>

<step_3_base_scores>
<judgement_item name="表達水平">
[在此獨立評估文筆，填寫「優良」、「普通」或「欠佳」。**注意：忽略所有筆誤（如將「得失」寫成「我失」），假設用字正確後再評估。**]
</judgement_item>
</step_3_base_scores>

<step_4_calculation>
<calc_item name="扣題分數計算（絕對基準）">
判斷結果: [複製上面的'final_topic_judgement']
**強制執行規則**：
- IF '離題' THEN 扣題分數 = 1-3分（一般直接評為3分即可，極少情況會評至1至2分）
- IF '偏題' THEN 扣題分數 = 1-4分（一般直接評為4分即可，極少情況會評至1至2分）
- IF '緊扣' THEN 扣題分數 = 5-10分

**特別注意**：任何概念置換（如禮貌→禮物、責任→負責、寬容→包容）必須判定為偏題，如題目為《論禮貌》，但文中多論「禮物」，都屬於偏題，《禮貌》是一個更寬的概念，「禮貌」會包含「禮物」這個更狹窄的概念，絕不可用狹窄的概念論述寬泛的概念，扣題分數絕對不得超過4分，扣題絕對不能打5分或以上。

最終扣題分數 (1-10): [嚴格按照上述規則給分，不允許任何例外]
</calc_item>

<calc_item name="內容分數計算">
規則: 偏題或離題情況下，內容分數不得超過扣題分數且有絕對上限
基於扣題分數: [複製上面的扣題分數]
**嚴格限制**：
- 偏題情況：內容分數絕對上限4分，一般直接評為4分即可，極少情況會評至1至2分
- 離題情況：內容分數絕對上限3分，一般直接評為3分即可，極少情況會評至1至2分
最終內容分數 (1-10): [不得超過扣題分數且不得超過上述絕對上限]
</calc_item>

<calc_item name="結構分數計算">
規則: 偏題或離題情況下，結構分數不得超過扣題分數且有絕對上限
基於扣題分數: [複製上面的扣題分數]
**嚴格限制**：
- 偏題情況：結構分數絕對上限4分，一般直接評為4分即可，極少情況會評至1至2分
- 離題情況：結構分數絕對上限3分，一般直接評為3分即可，極少情況會評至1至2分
最終結構分數 (1-10): [不得超過扣題分數且不得超過上述絕對上限]
</calc_item>

<calc_item name="表達分數計算（相對獨立）">
判斷: [複製上面的'表達水平']
規則: IF '優良' THEN score=7-9; IF '普通' THEN score=4-6; ELSE score=1-3
**容錯檢查**：確保沒有因筆誤而扣分。
最終表達分數 (1-10): [按此規則給分]
</calc_item>


<calc_item name="立意分數計算">
評估觀點深度: [判斷觀點是否深入成熟，填寫「深入成熟」、「一般」或「膚淺」]
**評分標準**：
- IF '深入成熟' THEN 立意分數 = 7-10分
- IF '一般' THEN 立意分數 = 4-6分 
- IF '膚淺' THEN 立意分數 = 1-3分
最終立意分數 (1-10): [按此規則給分]
</calc_item>

<calc_item name="取材分數計算">
論據充實度: [評估論據是否充實涵蓋古今中外]
論據適用性: [評估論據是否適用於論述這道題目]
**評分標準**：
- 充實且適用 THEN 取材分數 = 7-10分
- 一般程度 THEN 取材分數 = 4-6分
- 不足或不適用 THEN 取材分數 = 1-3分
最終取材分數 (1-10): [按此規則給分]
</calc_item>

<calc_item name="內容與結構分數限制檢查">
立意分數: [複製上面的立意分數]
取材分數: [複製上面的取材分數]
**強制限制規則**：
- IF (立意分數 ≤ 4 OR 取材分數 ≤ 4) THEN 內容分數上限 = 5分且結構分數上限 = 5分
- 即使扣題很高，但立意或取材低分時，內容和結構都不能超過5分

內容分數修正: [根據上述規則修正內容分數，不得超過5分if條件符合]
結構分數修正: [根據上述規則修正結構分數，不得超過5分if條件符合]
</calc_item>


</step_4_calculation>
</scoring_worksheet>

<grading_json>
{
"content": [複製'內容分數'的'最終分數'],
"expression": [複製'表達分數'的'最終分數'],
"structure": [複製'結構分數'的'最終分數'],
"radar": {
"立意": [複製'扣題分數'的'扣題基準分數'],
"取材": [複製'內容分數'的'最終分數'],
"扣題": [複製'扣題分數'的'扣題基準分數'],
"詳略": [複製'結構分數'的'最終分數'],
"文筆": [複製'表達分數'的'最終分數']
}
}
</grading_json>

<critique>
[根據「教學筆記」對文章進行點評，可從立意、取材、扣題、詳略、文筆等不同角度點評。必須以數字編號列點方式呈現2-3點核心評論。]
</critique>

<suggestions>
[基於 <critique> 的內容，提出改善建議。]
</suggestions>

<rewrite_example>
[提供一段約150-200字的改寫範例。]
</rewrite_example>

---
### 待評核文章資訊
${basePrompt}

### 語境參考資料
[DSE 評核準則]: ${dsePrinciples}
[5** 級數範文]: ${referenceMaterials}

### 語氣要求
<critique> 和 <suggestions> 的語氣：${toneNote}
<rewrite_example> 的語氣：請使用嚴肅正經的語氣。


### 【重要】概念辨識檢查清單
在評分前，必須完成以下檢查：
□ 題目核心概念是什麼？
□ 文章主要論述什麼概念？ 
□ 兩個概念是否完全相同？
□ 是否存在概念置換問題？

**常見偏題案例**：
- 題目《論禮貌》→ 文章論述禮物/送禮 = 偏題
- 題目《論堅持》→ 文章論述堅定 = 偏題
- 題目《論競爭》→ 文章論述合作 = 偏題

記住：邏輯相關 ≠ 概念相同，必須嚴格區分！
`;
    }
}



/**
 * 嘗試從骯髒的字串中提取並解析 JSON
 * 能處理 AI 在 JSON 前後添加的廢話、Markdown 代碼塊等
 */
function safeJSONParse(rawString) {
    if (!rawString) return null;

    // 1. 嘗試直接解析
    try {
        return JSON.parse(rawString);
    } catch (e) {
        // 忽略錯誤，繼續嘗試修復
    }

    // 2. 尋找 JSON 物件的開始 `{` 和結束 `}`
    const firstBrace = rawString.indexOf('{');
    const lastBrace = rawString.lastIndexOf('}');

    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        const cleanString = rawString.substring(firstBrace, lastBrace + 1);
        try {
            return JSON.parse(cleanString);
        } catch (e) {
            console.error("JSON 修復失敗 (提取後仍格式錯誤):", cleanString);
            return null;
        }
    }

    console.error("無法在字串中找到有效的 JSON 結構");
    return null;
}





	
/**
 * 【最終修訂版】顯示完整的點評、評分系統，並根據最終等級和所選閱卷員調整內容
 * @param {string} containerId - 顯示結果的容器ID
 * @param {string} originalApiResponse - 原始模型的API回應
 * @param {string} llama3ApiResponse - 驗證模型的API回應 (可選)
 * @param {string} uniqueIdPrefix - 用於區分不同評分系統的唯一前綴
 * @param {string} fullTextContent - 用戶提交的完整文章內容
 */
/**
 * 【最終安全版】顯示完整的點評與評分
 * 算分邏輯已移至後端，此函數僅負責解析並顯示結果。
 */
async function displayFullCommentWithGrading(containerId, originalApiResponse, llama3ApiResponse, uniqueIdPrefix, fullTextContent) {
    // 1. 找出閱卷員的名字
    let reviewerName = "陳SIR"; 
    let reviewerSelect;
    let currentTone = "serious"; 
    
    if (uniqueIdPrefix === 'narrative') {
        reviewerSelect = document.getElementById('writingReviewer');
        const toneEl = document.getElementById('writingTone');
        if (toneEl) currentTone = toneEl.value;
    } else if (uniqueIdPrefix === 'argument') {
        reviewerSelect = document.getElementById('argumentReviewer');
        const toneEl = document.getElementById('argumentWritingTone'); 
        if (toneEl) currentTone = toneEl.value;
    }

    if (reviewerSelect) {
        reviewerName = reviewerSelect.options[reviewerSelect.selectedIndex].text;
        reviewerName = reviewerName.replace(/\s*\(預設\)\s*/, ''); 
    }

    // 2. 打開畫布
    openResultCanvas(reviewerName + " 評核報告");
    const resultContainer = document.getElementById("resultCanvasBody");

    // 3. 處理舊的雷達圖實例
    const instanceName = `${uniqueIdPrefix}_radarChartInstance`;
    if (window[instanceName]) {
        window[instanceName].destroy();
        window[instanceName] = null;
    }
    
    let finalHTML = `<h3>${reviewerName}點評：</h3>`;
    
    let scoresForDisplay = null;
    let finalGradeForDisplay = "評級中"; 

    // 使用 i 標誌來忽略大小寫匹配標籤
    const critiqueMatch = originalApiResponse.match(/<critique>([\s\S]*?)<\/critique>/i);
    const suggestionsMatch = originalApiResponse.match(/<suggestions>([\s\S]*?)<\/suggestions>/i);
    const rewriteMatch = originalApiResponse.match(/<rewrite_example>([\s\S]*?)<\/rewrite_example>/i);
    const originalGradingMatch = originalApiResponse.match(/<grading_json>([\s\S]*?)<\/grading_json>/i);
    
    // --- 分數解析邏輯 (極簡化：直接信任後端回傳的 JSON) ---
    if (originalGradingMatch && originalGradingMatch[1]) {
        // 使用 safeJSONParse 來處理
        scoresForDisplay = safeJSONParse(originalGradingMatch[1]);
        
        if (!scoresForDisplay) {
            console.error("JSON Parsing Failed. Raw:", originalGradingMatch[1]);
        }
    } else {
        console.warn("找不到 <grading_json> 標籤，可能由後端被過濾或生成失敗。");
    }
    
    // 計算最終總分與等級 (這部份仍保留在前端作顯示用，因為只是單純加總)
    if (scoresForDisplay) {
        // ★★★ 注意：這裡不再執行 applyV8Rules 或 applyWordCountRule ★★★
        // 這些規則已經在後端執行完畢，scoresForDisplay 已經是調整後的數值。
        
        // 應用最終一致性規則 (可以保留作為前端最後一道防線，或也移至後端)
        scoresForDisplay = applyFinalConsistencyRule(scoresForDisplay);
        
        const finalTotalScoreAfterRules = (scoresForDisplay.content * 4) + (scoresForDisplay.expression * 3) + (scoresForDisplay.structure * 2) + 5 + 1;
        finalGradeForDisplay = determineGrade(Math.min(finalTotalScoreAfterRules, 100));
        
        // 針對字數過少的極端情況進行降級 (可選：保留在前端做即時反應，或移至後端)
        const wordCount = fullTextContent.length;
        if (wordCount < 500) {
            finalGradeForDisplay = "1";
        } else if (wordCount < 800) {
            const gradeHierarchy = ["1", "2", "3", "4", "5", "5*", "5**"];
            const originalGradeIndex = gradeHierarchy.indexOf(finalGradeForDisplay);
            if (originalGradeIndex > gradeHierarchy.indexOf("3")) {
                finalGradeForDisplay = "3";
            }
        }
    }

    // --- AI 點評語氣重寫 (保留) ---
    const originalCritiqueText = critiqueMatch ? critiqueMatch[1].trim() : "未生成點評";
    let finalCritiqueText = originalCritiqueText;
    let critiqueRewriteInstruction = "";

    if (finalGradeForDisplay === "5**") critiqueRewriteInstruction = "點評中應為讚賞。";
    else if (finalGradeForDisplay === "5*" || finalGradeForDisplay === "5") critiqueRewriteInstruction = "點評主要以讚賞為主。";
    else if (finalGradeForDisplay === "4") critiqueRewriteInstruction = "點評應有褒有貶。";
    else critiqueRewriteInstruction = "點評以批評為主。";
    
    let emojiInstruction = (currentTone === "chen") ? "務必穿插大量 Emoji 🤪✨。" : "語氣專業嚴肅，不使用 Emoji。";

     const rewritePrompt = `請重寫以下點評內容。
    原文：${originalCritiqueText}
    【嚴格重寫要求】
    1. **結構鎖定**：嚴格維持原本的列點數量。
    2. **篇幅鎖定**：內容長度相若。
    3. **評級調整**：${critiqueRewriteInstruction}
    4. **語氣風格**：${emojiInstruction}
    `;

    try {
        console.log("等待 API 冷卻...");
        await new Promise(resolve => setTimeout(resolve, 3500)); 
        finalCritiqueText = await callReadingAPI(rewritePrompt, 0.5); 
    } catch (e) {
        console.warn("語氣重寫失敗:", e);
        finalCritiqueText = originalCritiqueText;
    }

    // 強力清洗標題
    finalCritiqueText = finalCritiqueText.replace(/^#+\s*.*點評重寫.*$/gim, '');
    finalCritiqueText = finalCritiqueText.replace(/^#+\s*.*重寫.*$/gim, '');
    finalCritiqueText = finalCritiqueText.replace(/【.*?】/g, ''); 
    finalCritiqueText = finalCritiqueText.replace(/[（(].*嚴格遵循.*[)）]/g, '');
    finalCritiqueText = finalCritiqueText.replace(/^(原文|改寫|重寫內容|重寫點評)[：:]/gim, '');
    finalCritiqueText = finalCritiqueText.trim();

    // --- 組合 HTML ---
    if (scoresForDisplay) {
        finalHTML += createGradingSystemHTML(uniqueIdPrefix, scoresForDisplay, finalGradeForDisplay);
    }  else {
        finalHTML += "<p>評等資料不完整。</p>";
    }
    
    if (finalCritiqueText) {
        finalHTML += createBulletedListHTML("點評", finalCritiqueText);
    }
    if (suggestionsMatch && suggestionsMatch[1]) {
        finalHTML += createBulletedListHTML("建議", suggestionsMatch[1].trim());
    }
    
    // 改寫範例繁體化 + 引號修正
    if (rewriteMatch && rewriteMatch[1]) {
        let rewriteContent = rewriteMatch[1].trim().replace(/\*/g, '');

        if (typeof OpenCC !== 'undefined') {
            try {
                const converter = OpenCC.Converter({ from: 'cn', to: 'tw' });
                rewriteContent = converter(rewriteContent);
            } catch (e) {
                console.error("[OpenCC] 轉換失敗:", e);
            }
        }

        rewriteContent = rewriteContent.replace(/["“](.*?)["”]/g, '「$1」');

        finalHTML += `<div class="rewrite-explanation-container">
            <div class="rewrite-explanation-card">
                <h3>改寫範例</h3>
                <div class="rewrite-content">${rewriteContent}</div>
            </div>
        </div>`;
    }

    // 加入聊天室 HTML
    const chatType = uniqueIdPrefix === 'narrative' ? 'narrative_writing' : 'argument_writing';
    finalHTML += getCanvasChatHTML(chatType);

    // 注入 HTML
    resultContainer.innerHTML = finalHTML;

    // 初始化雷達圖
    if (scoresForDisplay) {
        setTimeout(() => {
            initializeGradingSystem(uniqueIdPrefix, scoresForDisplay, finalGradeForDisplay);
        }, 50);
    }

    // 儲存到歷史紀錄
    const topic = (uniqueIdPrefix === 'narrative') ? localStorage.getItem("currentTopic") : localStorage.getItem("argumentCurrentTopic");
    const htmlContent = captureContainerHTML('resultCanvasBody'); 
    
     await saveToHistory(
        uniqueIdPrefix === 'narrative' ? "敘事抒情" : "議論", 
        "文章點評", 
        topic || "無題目", 
        `題目：${topic}\n\n文章：${fullTextContent}`, 
        htmlContent,
        scoresForDisplay 
    );
}


// =======================================================
// === 評等系統邏輯結束 ===
// =======================================================

document.addEventListener('DOMContentLoaded', function() {

// --- 為動態生成的「自訂題目」輸入框加上排除標記 ---
const originalShowCustomTopicInput = window.showCustomTopicInput;
window.showCustomTopicInput = function(buttonElement) {
originalShowCustomTopicInput(buttonElement);
const customTopicInput = document.getElementById('customTopic');
if (customTopicInput) {
customTopicInput.classList.add('no-modal-editor');
}
// For writing custom topic with focus and plot
const customTitle = document.getElementById('customTitle');
const customFocus = document.getElementById('customFocus');
const customPlot = document.getElementById('customPlot');
if(customTitle) customTitle.classList.add('no-modal-editor');
if(customFocus) customFocus.classList.add('no-modal-editor');
if(customPlot) customPlot.classList.add('no-modal-editor');
};

const originalShowArgumentCustomTopicInput = window.showArgumentCustomTopicInput;
window.showArgumentCustomTopicInput = function(buttonElement) {
originalShowArgumentCustomTopicInput(buttonElement);
const argumentCustomTopicInput = document.getElementById('argumentCustomTopic');
if (argumentCustomTopicInput) {
argumentCustomTopicInput.classList.add('no-modal-editor');
}
};

const originalShowExpandCustomTopicInput = window.showExpandCustomTopicInput;
window.showExpandCustomTopicInput = function(buttonElement) {
originalShowExpandCustomTopicInput(buttonElement);
const container = document.getElementById('expandCustomTopicInputArea');
if (container) {
container.querySelectorAll('input[type="text"], textarea').forEach(el => el.classList.add('no-modal-editor'));
}
};

// --- 懸浮視窗核心邏輯 ---
const modal = document.getElementById('outline-editor-modal');
const modalTextarea = document.getElementById('modal-textarea');
const modalTitle = document.getElementById('modal-title');
const modalSaveBtn = document.getElementById('modal-save-btn');
const modalCloseBtn = document.getElementById('modal-close-btn');

if (!modal || !modalTextarea || !modalSaveBtn || !modalCloseBtn) {
console.error("懸浮視窗的 HTML 結構不完整或未找到！");
return;
}

let currentEditingElement = null;

function openModalEditor(element) {
currentEditingElement = element;
modalTextarea.value = currentEditingElement.value;
let titleText = '編輯內容';

if (element.id === 'writingContent' || element.id === 'argumentWritingContent') {
titleText = '輸入您的文章';
} else {
const parentTableCell = element.closest('td');
if (parentTableCell) {
const parentRow = parentTableCell.closest('tr');
if (parentRow) {
const headerCell = parentRow.cells[0];
const table = parentRow.closest('table');
if (table && table.rows.length > 0) {
const columnHeaderCell = table.rows[0].cells[parentTableCell.cellIndex];
const rowTitle = headerCell ? headerCell.textContent.trim().replace(/[:：]/g, '') : '';
const colTitle = columnHeaderCell ? columnHeaderCell.textContent.trim().replace(/[:：]/g, '') : '';
if (rowTitle && colTitle && rowTitle !== colTitle) {
titleText = `編輯「${rowTitle}」的「${colTitle}」`;
} else if (rowTitle) {
titleText = `編輯「${rowTitle}」`;
} else if (colTitle) {
titleText = `編輯「${colTitle}」`;
}
}
}
} else {
let associatedLabel = document.querySelector(`label[for="${element.id}"]`);
if (!associatedLabel) {
const parentContainer = element.closest('div');
if (parentContainer) {
associatedLabel = parentContainer.querySelector('label');
}
}
if (associatedLabel) {
titleText = `編輯「${associatedLabel.textContent.trim().replace(/[:：]/g, '')}」`;
}
}
}
modalTitle.textContent = titleText;
modal.style.display = 'flex';
modalTextarea.focus();
}

function closeModalEditor() {
modal.style.display = 'none';
currentEditingElement = null;
}

function saveAndCloseEditor() {
if (currentEditingElement) {
currentEditingElement.value = modalTextarea.value;
if (currentEditingElement.id === 'expandContent') {
updateCharCount();
}
}
closeModalEditor();
}

document.body.addEventListener('click', function(event) {
const target = event.target;
const isTextInput = target.tagName === 'INPUT' && target.type === 'text';
const isTextarea = target.tagName === 'TEXTAREA';
if ((isTextInput || isTextarea) && !target.classList.contains('no-modal-editor') && target.id !== 'modal-textarea') {
event.preventDefault();
openModalEditor(target);
}
});

modalSaveBtn.addEventListener('click', saveAndCloseEditor);
modalCloseBtn.addEventListener('click', closeModalEditor);


// --- OCR 整合邏輯 ---
const ocrBtn = document.getElementById('modal-ocr-btn');
let ocrWindow = null;
const VERCEL_OCR_URL = 'https://gemini-ocr-proxy.vercel.app/';

if (ocrBtn) {
ocrBtn.addEventListener('click', function() {
if (ocrWindow && !ocrWindow.closed) {
ocrWindow.focus();
return;
}
ocrWindow = window.open(VERCEL_OCR_URL, 'OCRWindow', 'width=650,height=850,scrollbars=yes,resizable=yes');
});
}

window.addEventListener('message', function(event) {
if (event.origin !== new URL(VERCEL_OCR_URL).origin) {
console.warn('收到來源不明的訊息，已忽略:', event.origin);
return;
}
if (event.data && event.data.type === 'ocrResult') {
const ocrText = event.data.text;
modalTextarea.value += (modalTextarea.value.trim() ? '\n' : '') + ocrText;
if (ocrWindow) {
ocrWindow.close();
}
modalTextarea.focus();
}
});
});

/**
 * 【最終把關規則修訂 v3】
 * 當「扣題」分數為 4 分或以下時，強制將多個核心項目分數的上限限制在 4 分。
 * @param {object} scores - 從 AI 模型解析或初步處理後的原始評分物件。
 * @returns {object} - 經過此規則嚴格調整後的最終評分物件。
 */
function applyFinalConsistencyRule(scores) {
    // 建立一個分數物件的深層複本，避免直接修改傳入的物件
    let s = JSON.parse(JSON.stringify(scores)); 
    
    // 從 radar 物件中安全地獲取「扣題」分數，若不存在則預設為 0
    const kouTi = s.radar ? s.radar.扣題 || 0 : 0;
    
    // 【核心修訂】將觸發條件從 <= 5 改為 <= 4
    if (kouTi <= 4) {
        console.log(`觸發扣題分數把關規則 v3：偵測到扣題分數 (${kouTi}) 低於或等於 4，將相關分數上限設為 4。`);

        // 使用 Math.min() 確保分數不會超過 4。
        // 如果原始分數低於 4（例如 3），則會保留較低的 3 分。
        // 如果原始分數高於 4（例如 6），則會被強制降為 4 分。
        
        // 1. 強制限制雷達圖中的「立意」、「取材」、「詳略」分數
        if (s.radar) {
            s.radar.立意 = Math.min(s.radar.立意, 4);
            s.radar.取材 = Math.min(s.radar.取材, 4);
            s.radar.詳略 = Math.min(s.radar.詳略, 4);
        }

        // 2. 強制限制總項分數中的「內容」和「結構」分數
        s.content = Math.min(s.content, 4);
        s.structure = Math.min(s.structure, 4);
    }
    
    // 在控制台中輸出日誌，方便追蹤規則是否被正確應用及其調整結果
    console.log(`扣題把關規則 v3 應用後：扣題=${kouTi}，調整後立意=${s.radar ? s.radar.立意 : 'N/A'}，取材=${s.radar ? s.radar.取材 : 'N/A'}，詳略=${s.radar ? s.radar.詳略 : 'N/A'}，內容=${s.content}，結構=${s.structure}`);
    
    // 返回經過嚴格調整後的分數物件
    return s;
}



document.addEventListener('DOMContentLoaded', function() {
    const sideMenuToggle = document.getElementById('sideMenuToggle');
    const sideMenu = document.getElementById('sideMenu');
    const sideMenuHomeBtn = document.getElementById('sideMenuHomeBtn');
    const sideMenuCloudBtn = document.getElementById('sideMenuCloudBtn'); // 獲取雲端按鈕

    // 1. 漢堡選單點擊邏輯 (你的新代碼)
    sideMenuToggle.onclick = function(e) {
        e.stopPropagation();
        if (sideMenu.classList.contains('active')) {
            sideMenu.classList.remove('active');
            sideMenuToggle.classList.remove('active');
        } else {
            sideMenu.classList.add('active');
            sideMenuToggle.classList.add('active');
            
            // === 判斷當前頁面狀態以決定按鈕顯示 ===
            const isOnMainPage = document.querySelector('.title-container').style.display !== 'none';
            const isOnToolsPage = document.getElementById('toolsContainer2').style.display === 'flex';
            const isOnCloudPage = document.getElementById('studentCloudModal').style.display === 'block'; // 檢查是否在課業狀態
            
            // 邏輯判斷
            if (isOnCloudPage) {
                // 如果在「課業狀態」頁面
                if (sideMenuHomeBtn) sideMenuHomeBtn.style.display = 'flex';  // 顯示返回主頁
                if (sideMenuCloudBtn) sideMenuCloudBtn.style.display = 'none'; // 隱藏課業狀態按鈕
            } 
            else if (isOnToolsPage) {
                // 如果在「工具一覽」頁面
                if (sideMenuHomeBtn) sideMenuHomeBtn.style.display = 'flex';
                if (sideMenuCloudBtn) sideMenuCloudBtn.style.display = 'flex'; 
            }
            else if (isOnMainPage) {
                // 如果在「主頁」
                if (sideMenuHomeBtn) sideMenuHomeBtn.style.display = 'none'; 
                if (sideMenuCloudBtn) sideMenuCloudBtn.style.display = 'flex'; 
            } 
            else {
                // 其他功能頁面 (如寫作、閱讀等)
                if (sideMenuHomeBtn) sideMenuHomeBtn.style.display = 'flex';
                if (sideMenuCloudBtn) sideMenuCloudBtn.style.display = 'flex';
            }
        }
    };

    // 2. 點擊選單項目後自動收起選單 (補回此功能)
    const menuItems = document.querySelectorAll('.side-menu-item');
    menuItems.forEach(item => {
        item.addEventListener('click', function() {
            sideMenu.classList.remove('active');
            sideMenuToggle.classList.remove('active');
        });
    });

    // 3. 點擊頁面空白處收起選單 (補回此功能)
    document.addEventListener('click', function(e) {
        if (sideMenu.classList.contains('active') && 
            !sideMenu.contains(e.target) && 
            e.target !== sideMenuToggle) {
            sideMenu.classList.remove('active');
            sideMenuToggle.classList.remove('active');
        }
    });
});

// 從側邊選單打開工具一覽
function openToolsFromSideMenu() {
    document.getElementById('sideMenu').classList.remove('active');
    document.getElementById('expandToolsBtn2').click(); // 觸發原有的工具一覽邏輯
}

/* --------------------------------------
   音樂播放器 JS (Lazy Loading 優化版)
   -------------------------------------- */
// 1. 定義音樂清單數據 (原本 HTML 中的選項移到這裡)
const musicPlaylist = [
    { name: "The Abysswalker", url: "https://youfulca.com/wp-content/uploads/2022/08/Battle-Abysswalker.mp3" },
    { name: "死せる都の戰乙女", url: "https://youfulca.com/wp-content/uploads/2022/08/Battle-Rosemoon.mp3" },
    { name: "五大罪", url: "https://youfulca.com/wp-content/uploads/2022/08/Battle-deadly.mp3" },
    { name: "繼承劍的少女", url: "https://youfulca.com/wp-content/uploads/2022/08/Battle-rapier.mp3" },
    { name: "不屈意志之刃", url: "https://youfulca.com/wp-content/uploads/2022/08/Ariadne-Battle.mp3" },
    { name: "西部戰鬥", url: "https://youfulca.com/wp-content/uploads/2022/08/battle-arms.mp3" },
    { name: "Battle Theme", url: "https://youfulca.com/wp-content/uploads/2022/08/Battle.mp3" },
    { name: "流浪城鎮", url: "https://youfulca.com/wp-content/uploads/2022/08/Wanderers-City.mp3" },
    { name: "沉睡的記憶", url: "https://youfulca.com/wp-content/uploads/2022/08/Remotest-Liblary.mp3" },
    { name: "麥田懷舊", url: "https://youfulca.com/wp-content/uploads/2022/08/Nostalgia.mp3" },
    { name: "放學後", url: "https://youfulca.com/wp-content/uploads/2022/08/sunbeams.mp3" },
    { name: "鄉村生活", url: "https://youfulca.com/wp-content/uploads/2022/08/village.mp3" },
    { name: "休息一下", url: "https://youfulca.com/wp-content/uploads/2022/08/Take-a-Rest.mp3" },
    { name: "雪鄉", url: "https://youfulca.com/wp-content/uploads/2022/08/winter-snow.mp3" },
    { name: "被遺忘的地方", url: "https://youfulca.com/wp-content/uploads/2022/08/Forgotten-Place.mp3" },
    { name: "安息", url: "https://youfulca.com/wp-content/uploads/2022/08/Rest-in-Peace.mp3" },
    { name: "告別", url: "https://youfulca.com/wp-content/uploads/2022/08/Farewell.mp3" },
    { name: "回憶", url: "https://youfulca.com/wp-content/uploads/2022/08/reminiscence.mp3" },
    { name: "星夜", url: "https://youfulca.com/wp-content/uploads/2022/08/starry-night.mp3" },
    { name: "當思念傳到某人耳畔", url: "https://youfulca.com/wp-content/uploads/2022/08/last-wish.mp3" },
    { name: "超越悲傷", url: "https://youfulca.com/wp-content/uploads/2022/08/sorrow.mp3" },
    { name: "螢火蟲之路", url: "https://youfulca.com/wp-content/uploads/2022/08/hotarumichi.mp3" },
    { name: "飛艇", url: "https://youfulca.com/wp-content/uploads/2022/08/Sky-Airship.mp3" },
    { name: "跨越神秘之海", url: "https://youfulca.com/wp-content/uploads/2022/08/Voyage_SE.mp3" },
    { name: "盼望", url: "https://youfulca.com/wp-content/uploads/2022/08/main-theme01.mp3" },
    { name: "約定之地", url: "https://youfulca.com/wp-content/uploads/2022/08/saikai637.mp3" }
];

let musicPlayerInitialized = false;
let isPlaying = false;
let currentMusic = '';

// 2. 初始化函數：只在第一次打開時執行
function initMusicPlayer() {
    if (musicPlayerInitialized) return;

    const audio = document.getElementById('audio');
    const playPauseBtn = document.getElementById('play-pause');
    const musicSelect = document.getElementById('music-select');
    const progressBarMusic = document.getElementById('progress-bar-music');
    const playMode = document.getElementById('play-mode');
    const hidePlayerBtn = document.getElementById('hide-player');
    const musicPlayer = document.getElementById('music-player');

    // A. 動態生成選項
    const fragment = document.createDocumentFragment();
    musicPlaylist.forEach(song => {
        const option = document.createElement('option');
        option.value = song.url;
        option.textContent = song.name;
        fragment.appendChild(option);
    });
    musicSelect.appendChild(fragment);

    // B. 綁定事件監聽器 (邏輯與之前相同)
    
    // 音樂選擇
    musicSelect.addEventListener('change', function() {
        const selectedMusic = this.value;
        if (selectedMusic) {
            audio.src = selectedMusic;
            audio.load();
            currentMusic = selectedMusic;
            audio.play().then(() => {
                isPlaying = true;
                playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
            }).catch(error => console.error('自動播放失敗:', error));
        }
    });

    // 確保可以播放時自動播放
    audio.addEventListener('canplay', function() {
        if (isPlaying) audio.play();
    });

    // 播放/暫停按鈕
    playPauseBtn.addEventListener('click', function() {
        if (isPlaying) {
            audio.pause();
            playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
        } else {
            if (currentMusic) {
                audio.play();
                playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
            } else {
                alert('請先選擇音樂');
            }
        }
        isPlaying = !isPlaying;
    });

    // 進度條更新
    audio.addEventListener('timeupdate', function() {
        if (!audio.duration) return;
        const progress = (audio.currentTime / audio.duration) * 100;
        progressBarMusic.value = progress;
    });

    progressBarMusic.addEventListener('input', function() {
        const time = (this.value / 100) * audio.duration;
        audio.currentTime = time;
    });

    // 自動播放下一首邏輯
    audio.addEventListener('ended', function() {
        if (playMode.value === 'loop') {
            audio.currentTime = 0;
            audio.play();
        } else if (playMode.value === 'next') {
            const options = musicSelect.options;
            for (let i = 0; i < options.length; i++) {
                if (options[i].value === currentMusic) {
                    let nextIndex = (i + 1) % options.length;
                    if (nextIndex === 0) nextIndex = 1;
                    currentMusic = options[nextIndex].value;
                    musicSelect.value = currentMusic;
                    audio.src = currentMusic;
                    audio.load();
                    audio.play();
                    break;
                }
            }
        }
    });

    // 隱藏播放器
    hidePlayerBtn.addEventListener('click', function() {
        musicPlayer.style.display = 'none';
    });

    musicPlayerInitialized = true;
    console.log("音樂播放器已初始化 (Lazy Load)");
}

	// 切換音樂播放器顯示/隱藏 (包含 Lazy Loading 觸發)
function toggleMusicPlayer() {
    // 1. 在顯示前，先嘗試初始化 (如果已經初始化過，內部會自動跳過)
    if (typeof initMusicPlayer === 'function') {
        initMusicPlayer();
    }

    const musicPlayer = document.getElementById('music-player');
    
    if (musicPlayer.style.display === 'none' || musicPlayer.style.display === '') {
        musicPlayer.style.display = 'flex';
    } else {
        musicPlayer.style.display = 'none';
    }
    
    // 收起側邊選單
    const sideMenu = document.getElementById('sideMenu');
    if (sideMenu) {
        sideMenu.classList.remove('active');
        document.getElementById('sideMenuToggle').classList.remove('active');
    }
}

// === 優化版：帶動畫的返回主頁 ===
const performReturnToHomeLogic = window.returnToHome || function() {}; // 備份舊邏輯引用(如果有的話)

// === 優化版：帶動畫的返回主頁 (修復滾動鎖定與視窗殘留) ===
// === 優化版：帶動畫的返回主頁 (已修復：加入 featuredContainer 隱藏) ===
window.returnToHome = function() {
    // 1. 找出當前正在顯示的容器 (加入 featuredContainer)
    const activeContainer = document.querySelector(
        '#writingContainer[style*="display: block"], ' +
        '#readingContainer[style*="display: block"], ' +
        '#booksContainer[style*="display: block"], ' +
        '#expandContainer[style*="display: block"], ' +
        '#argumentContainer[style*="display: block"], ' +
        '#historyContainer[style*="display: block"], ' +
        '#toolsContainer2[style*="display: flex"], ' + 
        '#studentCloudModal[style*="display: block"], ' + 
        '#featuredContainer[style*="display: block"]' // <--- ★★★ 關鍵：加入這行偵測 ★★★
    );

    // 2. 如果找到了正在顯示的頁面，先播動畫
    if (activeContainer) {
        activeContainer.classList.add('page-exit-shrink');

        // 3. 等待動畫播完再執行清理
        setTimeout(() => {
            // A. 隱藏所有主要功能容器 (加入 featuredContainer)
            const containers = [
                'writingContainer', 
                'readingContainer', 
                'booksContainer', 
                'expandContainer', 
                'argumentContainer', 
                'historyContainer', 
                'toolsContainer2',
                'studentCloudModal',
                'featuredContainer' // <--- ★★★ 關鍵：加入這個 ID 到隱藏列表 ★★★
            ];
            
            containers.forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    el.style.display = "none";
                    el.classList.remove('page-exit-shrink');
                    el.style.opacity = "";
                    el.style.transform = "";
                }
            });

            // B. 解鎖頁面捲動
            document.body.style.overflow = 'auto'; 
            document.body.style.height = 'auto'; 

            // C. 恢復主頁背景
            document.body.style.backgroundImage = `url('${scenes['home']}')`;
            document.body.style.backgroundColor = '';

            // D. 顯示主頁元素
            document.querySelector('.title-container').style.display = 'block';
            document.getElementById('hitokoto-container').style.display = 'block';
            document.getElementById('mainMenuBox').style.display = 'block';
            
            // E. 顯示 DSE 倒數
            const dseBox = document.getElementById('dse-countdown-box');
            if (dseBox) dseBox.style.display = 'flex';

            // F. 隱藏返回按鈕
            document.getElementById('sideMenuHomeBtn').style.display = 'none';
            document.getElementById('homeBtn').style.display = 'none';

            // G. 移除卡片 active 狀態
            document.querySelectorAll('.anime-card').forEach(card => card.classList.remove('active'));

            // H. 收起側邊選單
            const sideMenu = document.getElementById('sideMenu');
            if (sideMenu) {
                sideMenu.classList.remove('active');
                document.getElementById('sideMenuToggle').classList.remove('active');
            }
            
            // I. 隱藏儲存按鈕
            hideAllSaveHtmlButtons();

            // J. 確保舊版工具箱隱藏
            const toolsBox = document.getElementById('toolsBox');
            if (toolsBox) toolsBox.style.display = 'none';

            // K. 隱藏其他模態視窗
            const historyModal = document.getElementById('historyModal');
            if (historyModal) historyModal.style.display = 'none';
            
            const outlineModal = document.getElementById('outline-editor-modal');
            if (outlineModal) outlineModal.style.display = 'none';

            const previewModal = document.getElementById('previewModal');
            if (previewModal) {
                previewModal.style.display = 'none';
                const iframe = document.getElementById('previewIframe');
                if (iframe) iframe.src = 'about:blank';
            }

            const videoModal = document.getElementById('videoModal');
            if (videoModal) {
                videoModal.style.display = 'none';
                const vIframe = document.getElementById('videoIframe');
                if (vIframe) vIframe.src = '';
            }
            
            // L. 關閉文萃詳情頁 (確保下次打開是列表)
            const featuredDetail = document.getElementById('featuredDetailView');
            if (featuredDetail) featuredDetail.style.display = 'none';
            const featuredList = document.getElementById('featuredListView');
            if (featuredList) featuredList.style.display = 'block';

            // M. 滾動到頂部
            window.scrollTo({ top: 0, behavior: 'instant' });

            // N. 觸發主頁進場動畫
            const mainMenu = document.getElementById('mainMenuBox');
            const dse = document.getElementById('dse-countdown-box');
            
            if (mainMenu) {
                mainMenu.classList.remove('home-enter-pop');
                void mainMenu.offsetWidth; 
                mainMenu.classList.add('home-enter-pop');
            }
            if (dse) {
                dse.classList.remove('home-enter-pop');
                void dse.offsetWidth;
                dse.classList.add('home-enter-pop');
            }

        }, 350); 
        
    } else {
        // 如果沒有偵測到活動頁面，保險起見解鎖滾動並重整
        document.body.style.overflow = 'auto'; 
        location.reload(); 
    }
};
// ==========================================
// === IndexedDB 歷史紀錄系統 (V2 層級版 + 資源快取) ===
// ==========================================

const DB_NAME = 'SansiDB';
const DB_VERSION = 2; // ★ 修改：版本號升級為 2 以觸發結構更新
const STORE_NAME = 'history';
const ASSET_STORE_NAME = 'assets'; // ★ 新增：資源儲存區名稱

// 定義層級結構 (保持不變)
const HISTORY_STRUCTURE = {
    "閱讀": ["點評", "指引"],
    "敘事抒情": ["文章點評", "大綱點評", "解題指引", "敘事物象"],
    "議論": ["文章點評", "大綱點評", "指引"],
    "整合拓展": ["點評", "指引"]
};

// 1. 初始化資料庫 (修訂版：加入 assets 儲存區)
function openHistoryDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onupgradeneeded = function(event) {
            const db = event.target.result;
            
            // 建立歷史紀錄儲存區 (既有邏輯)
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
                store.createIndex('timestamp', 'timestamp', { unique: false });
                store.createIndex('category', 'category', { unique: false });
                store.createIndex('subFunction', 'subFunction', { unique: false });
            }

            // ★ 新增：建立資源快取儲存區 (若不存在則建立)
            if (!db.objectStoreNames.contains(ASSET_STORE_NAME)) {
                db.createObjectStore(ASSET_STORE_NAME); 
            }
        };
        
        request.onsuccess = function(event) { resolve(event.target.result); };
        request.onerror = function(event) { reject(event.target.error); };
    });
}

// ★ 新增：背景圖片快取載入邏輯 (V2 終極防呆版 - 含 CSP 檢測)
async function loadAndCacheBackground() {
    const bgImageUrl = '背景.png'; 
    const bgKey = 'main_background_image';

    try {
        const db = await openHistoryDB();
        
        // 1. 嘗試從 IndexedDB 讀取
        const tx = db.transaction([ASSET_STORE_NAME], 'readonly');
        const store = tx.objectStore(ASSET_STORE_NAME);
        const request = store.get(bgKey);

        request.onsuccess = async (e) => {
            const cachedBlob = e.target.result;

            if (cachedBlob && cachedBlob.size > 0) {
                // A. 命中快取：進行「預載測試」
                const imgUrl = URL.createObjectURL(cachedBlob);
                
                // 建立一個隱形的圖片物件來測試載入
                const testImg = new Image();
                
                testImg.onload = function() {
                    // 測試成功：代表 CSP 通過且圖片正常，這才套用到背景
                    document.body.style.backgroundImage = `url('${imgUrl}')`;
                    console.log("⚡ [Cache] 背景圖片已確認有效並載入");
                };

                testImg.onerror = function() {
                    // 測試失敗：可能是 CSP 阻擋或 Blob 損壞
                    // 什麼都不做！讓網頁維持 CSS 原本設定的伺服器圖片
                    console.warn("⚠️ [Cache] 本地圖片載入失敗 (可能是 CSP 阻擋)，已自動退回伺服器原圖。");
                    URL.revokeObjectURL(imgUrl); // 釋放內存
                };

                // 開始測試
                testImg.src = imgUrl;

            } else {
                // B. 無快取：執行背景下載 (不影響當前畫面)
                console.log("📥 [Cache] 背景下載中...");
                try {
                    const response = await fetch(bgImageUrl);
                    if (!response.ok) throw new Error('Network response was not ok');
                    const blob = await response.blob();

                    const writeTx = db.transaction([ASSET_STORE_NAME], 'readwrite');
                    writeTx.objectStore(ASSET_STORE_NAME).put(blob, bgKey);
                    console.log("✅ [Cache] 背景已寫入 IndexedDB (下次生效)");
                } catch (fetchErr) {
                    console.warn("背景下載失敗", fetchErr);
                }
            }
        };
    } catch (err) {
        console.warn("快取系統啟動失敗 (使用預設背景):", err);
    }
}
	
// 2. ★ 核心輔助：捕捉 HTML 並將 Canvas 轉為圖片 ★
// ★ 核心輔助：捕捉 HTML (修訂版：只捕捉結構，不轉圖片) ★
function captureContainerHTML(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return "";

    // 1. 複製節點
    const clone = container.cloneNode(true);

    // 2. 處理 Canvas：保留標籤，但強制設定高度，避免在歷史紀錄中塌陷
    const canvases = clone.querySelectorAll('canvas');
    canvases.forEach(canvas => {
        // 關鍵：給予明確的高度，確保 Chart.js 稍後有空間繪圖
        canvas.setAttribute('style', 'width: 100%; height: 350px; display: block;');
        // 移除 id 屬性，避免與主頁面的圖表 ID 衝突 (會在查看時動態處理)
        canvas.removeAttribute('id'); 
        // 添加一個通用 class 方便識別
        canvas.classList.add('history-radar-canvas');
    });

    // 3. 捕捉進度條 (藍色 BAR) 的寬度
    const progressBars = clone.querySelectorAll('.progress-bar-fill');
    const originalBars = container.querySelectorAll('.progress-bar-fill');
    for (let i = 0; i < progressBars.length; i++) {
        if (originalBars[i]) {
            progressBars[i].style.width = originalBars[i].style.width;
        }
    }

    // 4. 處理表單元素 (Textarea / Input)
    const textareas = clone.querySelectorAll('textarea');
    const originalTextareas = container.querySelectorAll('textarea');
    for (let i = 0; i < textareas.length; i++) {
        if (originalTextareas[i]) {
            textareas[i].textContent = originalTextareas[i].value;
        }
    }

    const inputs = clone.querySelectorAll('input');
    const originalInputs = container.querySelectorAll('input');
    for (let i = 0; i < inputs.length; i++) {
        if (originalInputs[i]) {
            inputs[i].setAttribute('value', originalInputs[i].value);
        }
    }

    return clone.innerHTML;
}




	
// ==========================================
// === 修訂版：儲存紀錄 (保留聊天介面結構) ===
// ==========================================
async function saveToHistory(category, subFunction, title, userContent, aiContent, scoreData = null) {
    try {
        // 1. 清理 HTML
        if (aiContent && typeof aiContent === 'string') {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = aiContent;
            
            // A. 移除舊版/暫時性輸入框
            const tempToRemove = tempDiv.querySelectorAll('#writingGuideChatInputContainer, #writingChatInputContainer, #argumentChatInputContainer, #chatInputContainer');
            tempToRemove.forEach(el => el.remove());
 
            // B. 移除一般操作按鈕，但保留發送鍵 (.canvas-send-btn)
            const buttonsToRemove = tempDiv.querySelectorAll('button:not(.canvas-send-btn), .btn-icon-action');
            buttonsToRemove.forEach(el => el.remove());
 
            // C. 清空輸入框內容但保留元素
            const chatInputs = tempDiv.querySelectorAll('.canvas-input-area textarea');
            chatInputs.forEach(el => { el.value = ''; el.innerHTML = ''; });
 
            aiContent = tempDiv.innerHTML;
        }
 
        const db = await openHistoryDB();
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const ts = new Date().getTime();
        
        // ★★★ 關鍵修復：這裡直接更新全域變數 ★★★
        // 確保剛生成的內容 ID 被系統記住，讓追問功能可以找到這筆資料
        lastGeneratedTimestamp = ts;
 
        const record = {
            category: category,
            subFunction: subFunction,
            title: title || "無標題",
            userContent: userContent,
            aiContent: aiContent,
            scoreData: scoreData,
            timestamp: ts,
            dateStr: new Date().toLocaleString('zh-HK', { hour12: false }),
            
            // 初始狀態
            isSynced: false,       
            hasBeenSynced: false   
        };
 
        // 寫入並獲取 ID
        const generatedId = await new Promise((resolve, reject) => {
            const req = store.add(record);
            req.onsuccess = (e) => {
                resolve(e.target.result);
            };
            req.onerror = reject;
        });
        record.id = generatedId;
        console.log(`本地紀錄已建立 (ID: ${generatedId})`);
        
        // 執行輕量上傳
        const s = JSON.parse(localStorage.getItem('studentProfile'));
        if (s) {
            quickUploadToFirebase(record);
        }
    } catch (error) {
        console.error("儲存紀錄失敗:", error);
    }
}


// ==========================================
// === 修復版：輕量級上傳 (ID 更新保護) ===
// ==========================================
async function quickUploadToFirebase(record) {
    const s = JSON.parse(localStorage.getItem('studentProfile'));
    if (!s) return;
    const recordKey = record.timestamp.toString();
    const path = `students/${s.grade}/${s.class}/${s.name}/history/${recordKey}`;
    // 準備上傳雲端的物件 (注意：雲端不需要存本地 ID，所以可以過濾掉，或者保留也沒關係)
    // 這裡我們直接上傳整個 record
    const recordToUpload = {
        ...record,
        isSynced: true,
        hasBeenSynced: true
    };
    try {
        // 1. 上傳 Firebase (update)
        const updates = {};
        updates[path] = recordToUpload;
        await database.ref().update(updates);
        
        console.log(`✅ [省流模式] 單筆上傳成功`);
        // 2. 更新本地 IndexedDB 狀態
        // ★★★ 關鍵：確保使用原本的 ID 進行更新 (Put) ★★★
        if (record.id) {
            const db = await openHistoryDB();
            const tx = db.transaction([STORE_NAME], 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            
            // 這裡傳入的 record 必須包含 'id' 欄位
            // IndexedDB 看到有 id，就會執行 Update 而不是 Insert
            store.put(recordToUpload);
        } else {
            console.warn("⚠️ 警告：上傳函式收到無 ID 的紀錄，跳過本地狀態更新以防重複");
        }
    } catch (e) {
        console.error("單筆上傳失敗 (將在下次全量同步時補傳):", e);
    }
}

	
	
// ==========================================
// === 1. 合併算法 (修復：嚴格雙向同步與刪除) ===
// ==========================================
function mergeHistoryRecords(localRecords, cloudRecords) {
    console.log("--- [Logic] 執行智能合併 ---");
    const mergedMap = new Map();
    
    // 輔助：生成唯一鍵值 (基於時間戳，這是唯一的 ID)
    const generateKey = (r) => {
        const ts = r.timestamp ? Number(r.timestamp) : 0;
        return `${ts}`; // 簡化 Key，因為時間戳在系統中是唯一的
    };

    // A. 建立雲端資料索引 (雲端是最高權威)
    // 雲端存在的資料，我們先全部放進 Map
    cloudRecords.forEach(record => {
        const key = generateKey(record);
        mergedMap.set(key, record);
    });

    // B. 處理本地資料
    localRecords.forEach(localRecord => {
        if (!localRecord) return;
        const key = generateKey(localRecord);
        
        // --- 情況 1：雲端也有這筆資料 ---
        if (mergedMap.has(key)) {
            // 關鍵邏輯：如果本地標記為「未同步 (isSynced: false)」，代表本地有新修改 (如聊天追問、編輯)
            // 這時候我們要用「本地」覆蓋「雲端」
            if (localRecord.isSynced === false) {
                // 繼承本地的最新內容，但保留 hasBeenSynced 屬性以防邏輯錯誤
                localRecord.hasBeenSynced = true; 
                mergedMap.set(key, localRecord);
                console.log(`[同步] 本地有新修訂，覆蓋雲端版本: ${localRecord.title}`);
            }
            // 否則，如果本地 isSynced: true，我們信任雲端版本 (已在 map 中)，不做動作
        } 
        // --- 情況 2：雲端【沒有】這筆資料 (刪除 vs 新增) ---
        else {
            // ★★★ 核心判斷：是「新草稿」還是「被刪除」？ ★★★
            
            // 如果 hasBeenSynced 為 true，代表這筆資料曾經上傳過雲端。
            // 現在雲端沒了，唯一的解釋就是「被老師/其他裝置刪除了」。
            if (localRecord.hasBeenSynced === true) {
                console.log(`[同步] 偵測到雲端已刪除紀錄: ${localRecord.title}，執行本地同步刪除。`);
                // 不將其加入 mergedMap，即代表在接下來的步驟中會被刪除
            } 
            // 如果 hasBeenSynced 為 false (或 undefined)，代表這是剛生成、還沒來得及上傳的新資料
            // 我們必須保留它並準備上傳
            else {
                console.log(`[同步] 發現未上傳的新紀錄: ${localRecord.title}，準備上傳。`);
                mergedMap.set(key, localRecord);
            }
        }
    });

    // C. 排序回傳 (按時間倒序)
    return Array.from(mergedMap.values()).sort((a, b) => b.timestamp - a.timestamp);
}
// ==========================================
// === [智能省流版] 核心同步函數 (增量更新 + 斷點續傳) ===
// ==========================================
// ==========================================
// === 2. 省流同步系統 (Smart Sync V4 - ID 合併修復版) ===
// ==========================================
 
async function smartSyncHistory() {
    const s = JSON.parse(localStorage.getItem('studentProfile'));
    const user = firebase.auth().currentUser;
    
    if (!s || !user) return;
 
    // console.log("🚀 [Smart Sync] 開始同步檢查...");
 
    try {
        const db = await openHistoryDB();
        const token = await user.getIdToken();
        const basePath = `students/${s.grade}/${s.class}/${s.name}/history`;
        const dbUrl = "https://sansidata-default-rtdb.firebaseio.com";
 
        // 1. 獲取本地所有資料 (建立 Timestamp -> 內部 ID 的索引)
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const localData = await new Promise(resolve => {
            const req = store.getAll();
            req.onsuccess = e => resolve(e.target.result);
        });
 
        // Map: Timestamp (String) -> Record Object
        // 用來檢查重複和取得舊 ID
        const localTimestampMap = new Map();
        localData.forEach(r => {
            if (r.timestamp) {
                localTimestampMap.set(String(r.timestamp), r);
            }
        });
 
        // 2. 獲取雲端 ID 列表
        const response = await fetch(`${dbUrl}/${basePath}.json?shallow=true&auth=${token}`);
        const cloudKeysData = await response.json();
        const cloudKeys = cloudKeysData ? Object.keys(cloudKeysData) : [];
        const cloudIdsSet = new Set(cloudKeys);
 
        console.log(`📊 [Sync] 本地:${localData.length} / 雲端:${cloudKeys.length}`);
 
        // ==================================================
        // 步驟 A: 清理本地「幽靈檔案」 & 「重複檔案」
        // ==================================================
        const toDeleteLocally = [];
        const seenTimestamps = new Set();
 
        localData.forEach(record => {
            const keyStr = String(record.timestamp);
            
            // 檢查 1: 重複檔案清理 (如果同一個 timestamp 出現兩次)
            if (seenTimestamps.has(keyStr)) {
                console.warn(`🗑️ 發現重複紀錄 (Timestamp: ${keyStr})，標記刪除 ID: ${record.id}`);
                toDeleteLocally.push(record.id); // 刪除多餘的副本
                return;
            }
            seenTimestamps.add(keyStr);
 
            // 檢查 2: 雲端刪除同步
            if (!cloudIdsSet.has(keyStr)) {
                if (record.hasBeenSynced === true) {
                    toDeleteLocally.push(record.id);
                }
            }
        });
 
        if (toDeleteLocally.length > 0) {
            console.log(`🗑️ [Cleanup] 清理 ${toDeleteLocally.length} 筆無效/重複紀錄...`);
            const delTx = db.transaction([STORE_NAME], 'readwrite');
            const delStore = delTx.objectStore(STORE_NAME);
            toDeleteLocally.forEach(id => delStore.delete(id));
            await new Promise(resolve => delTx.oncomplete = resolve);
        }
 
        // ==================================================
        // 步驟 B: 上傳本地新資料
        // ==================================================
        const toUpload = localData.filter(r => r.isSynced === false && !toDeleteLocally.includes(r.id));
        
        if (toUpload.length > 0) {
            console.log(`⬆️ [Upload] 上傳 ${toUpload.length} 筆...`);
            const updates = {};
            const upTx = db.transaction([STORE_NAME], 'readwrite');
            const upStore = upTx.objectStore(STORE_NAME);
 
            toUpload.forEach(record => {
                record.isSynced = true;
                record.hasBeenSynced = true;
                updates[`${basePath}/${record.timestamp}`] = record;
                upStore.put(record);
            });
            await database.ref().update(updates);
            await new Promise(resolve => upTx.oncomplete = resolve);
        }
 
        // ==================================================
        // 步驟 C: 下載缺失資料 (含 ID 合併邏輯)
        // ==================================================
        // 檢查雲端有，但本地 Map 裡沒有的 key
       // ==================================================
// 步驟 C: 下載缺失資料 (含 ID 合併邏輯 + 即時遷移)
// ==================================================
const missingLocally = cloudKeys.filter(key => !localTimestampMap.has(key));
 
if (missingLocally.length > 0) {
    console.log(`⬇️ [Download] 下載 ${missingLocally.length} 筆...`);
    const downloadedRecords = [];
    
    // 用來收集「遷移指令」的物件 (同時刪舊 + 建新)
    const migrationUpdates = {};
 
    // 逐筆下載
    await Promise.all(missingLocally.map(async (key) => {
        try {
            const snap = await database.ref(`${basePath}/${key}`).once('value');
            const r = snap.val();
            if (r) {
                const keyNum = Number(key);
                let isMigrationNeeded = false;
 
                // ★★★ 兼容性遷移邏輯 (Migration Logic) ★★★
                if (keyNum > 1600000000000) {
                    // --- 情況 A: 新格式 (正常下載) ---
                    r.timestamp = keyNum;
                    r.isSynced = true;
                    r.hasBeenSynced = true;
                }
                else {
                    // --- 情況 B: 舊格式 (即時遷移) ---
                    console.log(`🔧 [Migration] 發現舊格式 Key: ${key}，正在即時轉換...`);
                    
                    // 1. 補全時間戳
                    if (!r.timestamp) r.timestamp = new Date().getTime();
                    
                    // 2. ★關鍵修改★：因為我們馬上就要手動上傳了，所以本地標記為「已同步」
                    // 這樣下次同步時，步驟 B 就不會重複上傳它
                    r.isSynced = true;
                    r.hasBeenSynced = true;
 
                    // 3. 準備 Firebase 指令：刪除舊 Key
                    migrationUpdates[`${basePath}/${key}`] = null;
 
                    // 4. 準備 Firebase 指令：寫入新 Key
                    migrationUpdates[`${basePath}/${r.timestamp}`] = r;
                    
                    isMigrationNeeded = true;
                }
 
                // ... ID 合併邏輯 (保持不變) ...
                const existingLocal = localTimestampMap.get(String(r.timestamp));
                if (existingLocal && existingLocal.id) {
                    r.id = existingLocal.id;
                } else {
                    delete r.id;
                }
                
                downloadedRecords.push(r);
            }
        } catch (err) {
            console.error(`下載失敗 Key: ${key}`, err);
        }
    }));
 
    // ★★★ 執行即時遷移 (Atomic Update) ★★★
    // 如果有舊資料需要轉換，這裡會一次過發送「刪除舊+寫入新」的指令
    if (Object.keys(migrationUpdates).length > 0) {
        console.log(`🚀 [Migration] 正在執行雲端即時遷移 (${Object.keys(migrationUpdates).length / 2} 筆)...`);
        await database.ref().update(migrationUpdates);
        console.log("✅ [Migration] 雲端遷移完成");
    }
 
    // 寫入本地資料庫
    if (downloadedRecords.length > 0) {
        const writeTx = db.transaction([STORE_NAME], 'readwrite');
        const writeStore = writeTx.objectStore(STORE_NAME);
        downloadedRecords.forEach(r => writeStore.put(r));
        await new Promise(resolve => writeTx.oncomplete = resolve);
    }
}
 
        // ==================================================
        // 步驟 D: 刷新介面
        // ==================================================
        if (toDeleteLocally.length > 0 || missingLocally.length > 0) {
            if (document.getElementById('historyLevel3').style.display !== 'none' && typeof currentSubFunctionFilter !== 'undefined') {
                 const themeIndex = typeof currentThemeIndex !== 'undefined' ? currentThemeIndex : 1;
                 enterHistoryList(currentSubFunctionFilter, themeIndex);
            }
            console.log("✅ [Sync] 同步完成 (已修正重複)");
        } else {
            console.log("✅ [Sync] 資料已一致");
        }
 
    } catch (e) {
        console.error("同步失敗:", e);
    }
}
	
// ==========================================
// === 2. 更新本地資料庫 (修復：鎖定同步狀態) ===
// ==========================================
async function updateLocalHistoryWithMergedData(mergedRecords, db) {
    let localDb = db;
    if (!localDb) {
        localDb = await openHistoryDB();
    }

    try {
        const transaction = localDb.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        
        // A. 清空本地：確保被判定刪除的資料真的從 IndexedDB 消失
        await new Promise((resolve, reject) => {
            const req = store.clear();
            req.onsuccess = resolve;
            req.onerror = reject;
        });

        // B. 寫入合併後的資料
        for (const record of mergedRecords) {
            // 移除舊 ID，讓 IndexedDB 重新分配 (選用，視乎你的 ID 依賴性，通常保留較好，但重新分配可避免 key 衝突)
            // 若你的系統嚴重依賴 id 來做 DOM 操作，建議保留 id：
            // if (!record.id) delete record.id; 
            
            // ★★★ 關鍵設定：本地鎖定 ★★★
            // 因為這是與雲端協商後的最終結果：
            record.isSynced = true;       // 本地內容 = 雲端內容
            record.hasBeenSynced = true;  // 這筆資料已在雲端掛號
            
            store.put(record); 
        }
        
        return new Promise((resolve) => {
            transaction.oncomplete = resolve;
        });
    } catch(e) {
        console.error("本地資料庫更新錯誤", e);
    }
}

// ==========================================
// === 4. 自動同步監聽器 (修復版) ===
// ==========================================
 
// ==========================================
// === 修正版：自動同步監聽器 (使用 Smart Sync) ===
// ==========================================
// 定義全域變數以儲存監聽器參照
let autoSyncListenerRef = null;    
let autoProfileListenerRef = null;
let isSyncingLock = false;         
function startAutoSyncListener() {
    const s = JSON.parse(localStorage.getItem('studentProfile'));
    if (!s) return;
    // --- 部分 A：歷史紀錄同步監聽 ---
    if (autoSyncListenerRef) {
        autoSyncListenerRef.off();
    }
    const historyPath = `students/${s.grade}/${s.class}/${s.name}/history`;
    autoSyncListenerRef = database.ref(historyPath);
    // 監聽 'value' 事件 (當雲端有任何增刪改時觸發)
    autoSyncListenerRef.on('value', (snapshot) => {
        
        if (isSyncingLock) return;
        console.log("⚡ 偵測到雲端歷史變更，觸發省流同步...");
        
        isSyncingLock = true;
        // ★★★ 修改處：呼叫新的省流同步 ★★★
        smartSyncHistory().then(() => {
            setTimeout(() => {
                isSyncingLock = false;
            }, 2000);
        });
    });
    // --- 部分 B：身份狀態監聽 (保持不變) ---
    if (autoProfileListenerRef) autoProfileListenerRef.off();
    const profilePath = `students/${s.grade}/${s.class}/${s.name}/profile`;
    autoProfileListenerRef = database.ref(profilePath);
    autoProfileListenerRef.on('value', (snapshot) => {
        const val = snapshot.val();
        if (val === null) {
            autoProfileListenerRef.off();
            if (autoSyncListenerRef) autoSyncListenerRef.off();
            findStudentNewLocation(s.name);
        } else if (!val.number || val.number === "") {
            promptForNewClassNumber(s, profilePath);
        }
    });
    console.log("✅ 雙重監聽器 (歷史 + 身份) 已啟動");
}
	
// 變數儲存當前導航狀態
let currentCategoryFilter = null;
let currentSubFunctionFilter = null;

// 4. 開啟歷史頁面 (進入第一層)
// 4. 開啟歷史頁面 (已修復：加入文萃隱藏)
function openHistoryContainer() {
    // 1. 定義要隱藏的所有容器
    const containers = [
        'writingContainer', 'readingContainer', 'booksContainer', 
        'expandContainer', 'argumentContainer', 'mainMenuBox', 
        'hitokoto-container', 'dse-countdown-box', 'toolsBox',
        'toolsContainer2',      
        'studentCloudModal',
        'featuredContainer'     // <--- ★★★ 關鍵：加入文萃容器 ★★★
    ];
    
    containers.forEach(id => {
        const el = document.getElementById(id);
        if(el) el.style.display = 'none';
    });
    document.querySelector('.title-container').style.display = 'none';
    
    // 2. 解鎖捲動
    document.body.style.overflow = 'auto'; 

    // 3. 顯示歷史容器
    const historyContainer = document.getElementById('historyContainer');
    historyContainer.style.display = 'block';
    
    // 4. 按鈕狀態調整
    const homeBtn = document.getElementById('sideMenuHomeBtn');
    if (homeBtn) homeBtn.style.display = 'flex';
    
    const cloudBtn = document.getElementById('sideMenuCloudBtn');
    if (cloudBtn) cloudBtn.style.display = 'flex';

    document.getElementById('sideMenu').classList.remove('active');
    document.getElementById('sideMenuToggle').classList.remove('active');

    // 渲染第一層
    renderHistoryCategories();
    
    // 強制滾動到頂部 (防止視窗還停留在下方)
    window.scrollTo({ top: 0, behavior: 'instant' });
}
// 5. 渲染第一層：主範疇
// ==========================================
// === 歷史紀錄 UI 渲染邏輯 (修訂版) ===
// ==========================================

// 定義範疇與圖片的對應關係 (確保與主頁一致)
const CATEGORY_ASSETS = {
    "閱讀": { img: '郵筒.png', en: 'READING' },
    "敘事抒情": { img: '相機.png', en: 'NARRATIVE' },
    "議論": { img: '筆.png', en: 'ARGUMENT' },
    "整合拓展": { img: '火車.png', en: 'EXPAND' },
    "課外書籍": { img: '書.png', en: 'LIBRARY' },
    "學習報告": { img: '書.png', en: 'REPORT' } // <--- ★★★ 新增這一行 (暫用書.png 或您可指定其他圖片) ★★★
};

// 5. 渲染第一層：主範疇 (動漫卡片風格)
// 5. 渲染第一層：主範疇 (動漫卡片風格)
function renderHistoryCategories() {
    // --- 新增：隱藏日期搜尋按鈕 (因為第一層不需要搜尋) ---
    const searchContainer = document.getElementById('historyDateSearchContainer');
    if (searchContainer) searchContainer.style.display = 'none';

    // 顯示/隱藏層級容器
    document.getElementById('historyLevel1Wrapper').style.display = 'flex'; // Wrapper 需要 flex
    document.getElementById('historyLevel2').style.display = 'none';
    document.getElementById('historyLevel3').style.display = 'none';

	 // ★★★ 新增這一行：觸發第一層的進場動畫 ★★★
    playEntryAnimation('historyLevel1Wrapper');
    
    // 隱藏麵包屑 (第一層不需要)
    document.getElementById('historyBreadcrumb').style.display = 'none';
    
    const container = document.getElementById('historyLevel1');
    const categories = Object.keys(HISTORY_STRUCTURE); // ["閱讀", "敘事抒情", "議論", "整合拓展"]
    
    let html = '';

    categories.forEach(cat => {
        const asset = CATEGORY_ASSETS[cat] || { img: '背景.png', en: 'RECORD' };
        
        // 生成與主頁完全一致的卡片 HTML
        // 注意：這裡移除了 id 屬性以避免衝突，改用 onclick 直接觸發歷史功能
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

// === 新增全域變數，用於傳遞顏色主題 ===
let currentThemeIndex = 1; 

// 6. 進入第二層：子功能 (修改版：分配顏色)
function enterHistoryCategory(category) {
    const searchContainer = document.getElementById('historyDateSearchContainer');
    if (searchContainer) searchContainer.style.display = 'none';

    currentCategoryFilter = category;
    
    document.getElementById('historyLevel1Wrapper').style.display = 'none';
    document.getElementById('historyLevel2').style.display = 'grid';
    document.getElementById('historyLevel3').style.display = 'none';

	 // ★★★ 新增這一行：觸發第二層的進場動畫 ★★★
    playEntryAnimation('historyLevel2');

    // 麵包屑
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

    // ★★★ 核心修改：為每個子功能分配一個固定的顏色索引 (1-5) ★★★
    subFunctions.forEach((sub, index) => {
        // 使用 index % 5 + 1 確保顏色在 1~5 之間循環，並讓不同按鈕顏色不同
        const themeIndex = (index % 5) + 1;
        
        // 在 onclick 中傳遞 themeIndex
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

// 7. 進入第三層：紀錄列表 (修改版：接收並儲存顏色)
async function enterHistoryList(subFunction, themeIndex) {
    currentSubFunctionFilter = subFunction;
    
    // ★★★ 儲存傳入的顏色索引，供渲染列表時使用 ★★★
    // 如果是從麵包屑返回，themeIndex 可能為 undefined，則保持原值或預設為 1
    if (themeIndex) {
        currentThemeIndex = themeIndex;
    }

    document.getElementById('historyLevel1Wrapper').style.display = 'none';
    document.getElementById('historyLevel2').style.display = 'none';
    document.getElementById('historyLevel3').style.display = 'flex';

	// ★★★ 新增這一行：觸發第三層的進場動畫 ★★★
    playEntryAnimation('historyLevel3');
    
    const searchContainer = document.getElementById('historyDateSearchContainer');
    if (searchContainer) searchContainer.style.display = 'block';

    // 麵包屑邏輯 (樣式已在 CSS 修改為莫蘭迪色)
    const breadcrumb = document.getElementById('historyBreadcrumb');
    breadcrumb.style.display = 'flex';

    const homeSpan = breadcrumb.querySelector('span[onclick="renderHistoryCategories()"]');
    homeSpan.innerHTML = '<i class="fas fa-home"></i> 主範疇';
    
    document.getElementById('breadcrumb-sep-1').style.display = 'inline';
    
    const catSpan = document.getElementById('breadcrumb-category');
    catSpan.textContent = currentCategoryFilter;
    catSpan.style.display = 'inline';
    catSpan.setAttribute('onclick', `enterHistoryCategory('${currentCategoryFilter}')`);
    
    document.getElementById('breadcrumb-sep-2').style.display = 'inline';
    
    const subSpan = document.getElementById('breadcrumb-sub');
    subSpan.textContent = subFunction;
    subSpan.style.display = 'inline';

    const listContainer = document.getElementById('historyLevel3');
    listContainer.innerHTML = '<div style="text-align:center; padding:20px;"><i class="fas fa-spinner fa-spin"></i> 載入中...</div>';

    try {
        const db = await openHistoryDB();
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const index = store.index('timestamp');
        const request = index.openCursor(null, 'prev');

        const records = [];
        request.onsuccess = function(event) {
            const cursor = event.target.result;
            if (cursor) {
                const r = cursor.value;
                if (r.category === currentCategoryFilter && r.subFunction === subFunction) {
                    records.push(r);
                }
                cursor.continue();
            } else {
                renderFilteredRecords(records);
            }
        };
    } catch (error) {
        console.error("讀取失敗:", error);
        listContainer.innerHTML = '<p>讀取失敗，請重試。</p>';
    }
}

// 8. 渲染列表卡片 (修改版：統一顏色)
// === 優化版：渲染列表卡片 (整張卡片可點擊) ===
function renderFilteredRecords(records) {
    const listContainer = document.getElementById('historyLevel3');
    listContainer.innerHTML = '';

    if (records.length === 0) {
        listContainer.innerHTML = `
            <div style="text-align:center; color:#999; margin-top:40px; grid-column: 1/-1; font-family: 'Noto Serif TC', serif;">
                <i class="far fa-file-alt" style="font-size: 40px; margin-bottom: 15px; opacity: 0.5;"></i>
                <p>此處尚無紀錄，靜待落筆。</p>
            </div>`;
        listContainer.style.display = 'flex';
        listContainer.style.justifyContent = 'center';
        return;
    } else {
        listContainer.style.display = 'grid';
    }

    records.forEach((record) => {
        const accentClass = `history-theme-${currentThemeIndex}`;

        const dateObj = new Date(record.timestamp);
        const dateStr = dateObj.toLocaleDateString('zh-HK', { 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit' 
        }).replace(/\//g, '-');

        const card = document.createElement('div');
        card.className = `history-card ${accentClass}`;
        card.setAttribute('data-timestamp', record.timestamp);
        
        // ★★★ 關鍵修改 1：將點擊事件移到最外層容器 ★★★
        // 這樣點擊卡片的任何留白處都能打開視窗
        card.setAttribute('onclick', `viewHistoryDetail(${record.id})`);

        card.innerHTML = `
            <!-- ★★★ 關鍵修改 2：移除這裡內層 div 的 onclick，改為純佈局容器 ★★★ -->
            <div style="flex-grow: 1;">
                <div class="history-meta">
                    <span class="history-tag">${record.subFunction}</span>
                    <span class="history-date">${dateStr}</span>
                </div>
                
                <!-- 
                    標題保留自己的 onclick/ondblclick 邏輯。
                    因為 handleTitleClick 裡面有 event.stopPropagation()，
                    所以點標題時不會觸發外層的直接打開，而是執行標題專屬的「延遲判斷雙擊」邏輯。
                -->
                <h4 class="history-title" 
                    onclick="handleTitleClick(event, ${record.id})"
                    ondblclick="handleTitleDblClick(this, ${record.id})"
                    title="單擊查看詳情，雙擊直接修改標題">
                    ${record.title}
                </h4>
            </div>
            
            <div class="history-actions">
    <!-- 下載按鈕 (新增) -->
    <button class="btn-download-history" id="download-btn-${record.id}" onclick="event.stopPropagation(); downloadHistoryHTML(${record.id})" title="下載 HTML 檔案">
    <i class="fas fa-file-code"></i>
</button>

    <!-- 刪除按鈕 -->
    <button class="btn-delete-history" onclick="event.stopPropagation(); deleteHistoryItem(${record.id})" title="刪除此紀錄">
        <i class="fas fa-trash-alt"></i>
    </button>
</div>
        `;

        listContainer.appendChild(card);
    });
}


// === 新增：下載歷史紀錄為 PDF ===
// === [100% 完美復刻 + 強制置中修復版] 下載歷史紀錄為 HTML ===
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
            if (!record) { alert("找不到紀錄"); resetBtn(); return; }

            // 1. 建立影子容器 (設定為 900px，這是電腦版的標準寬度)
            const shadowContainer = document.createElement('div');
            shadowContainer.style.cssText = `
                position: absolute; left: -9999px; top: 0; 
                width: 900px; 
                background-color: #fff; 
                visibility: hidden;
                box-sizing: border-box;
            `;
            document.body.appendChild(shadowContainer);

            // 2. === 重建 HTML 結構 ===
            
            let themeIndex = 1;
            if (record.category && typeof HISTORY_STRUCTURE !== 'undefined') {
                const subIndex = HISTORY_STRUCTURE[record.category]?.indexOf(record.subFunction);
                if (subIndex !== -1 && subIndex !== undefined) themeIndex = (subIndex % 5) + 1;
            }
            const themeClass = `history-theme-context-${themeIndex}`;
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
                const rawText = record.userContent;
                const lines = rawText.split('\n');
                let parsedHTML = `<div class="history-parsed-container ${themeClass}">`;
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
                    <div style="background:#fff; padding:25px; border-radius:12px; margin-bottom:30px; border:1px solid #e0ddd7; box-shadow: 0 4px 15px rgba(0,0,0,0.03);">
                        ${parsedHTML}
                    </div>`;
            }

            if (record.aiContent) {
                contentHTML += `<div class="ai-output-area">${record.aiContent}</div>`;
            }

            contentHTML += `</div>`; 
            shadowContainer.innerHTML = contentHTML;

            // 3. === 清理與凍結 ===
            shadowContainer.querySelectorAll('.canvas-chat-container, .canvas-input-area, button, .action-buttons-container, .history-save-btn, input[type="text"], textarea').forEach(el => {
                if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                    const span = document.createElement('div');
                    span.innerText = el.value;
                    span.style.cssText = "white-space: pre-wrap; background: #fffcf6; padding: 10px; border: 1px solid #ddd; border-radius: 4px; color: #333; font-size: 16px; font-family: 'Noto Serif TC', serif;";
                    el.parentNode.replaceChild(span, el);
                } else {
                    el.remove();
                }
            });

            shadowContainer.querySelectorAll('.progress-bar-fill').forEach(bar => {
                const w = bar.style.width; 
                bar.setAttribute('style', `width: ${w} !important; background-color: #007bff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact;`);
            });

            // 4. === 處理圖表 ===
            if (record.scoreData && record.scoreData.radar) {
                let canvasEl = shadowContainer.querySelector('canvas');
                if (!canvasEl) {
                    const radarContainer = shadowContainer.querySelector('.radar-chart-container') || shadowContainer.querySelector('.ai-output-area');
                    if (radarContainer) {
                        if (radarContainer.classList.contains('radar-chart-container')) radarContainer.innerHTML = ''; 
                        canvasEl = document.createElement('canvas');
                        canvasEl.width = 500;
                        canvasEl.height = 350;
                        if (radarContainer.firstChild) {
                            radarContainer.insertBefore(canvasEl, radarContainer.firstChild);
                        } else {
                            radarContainer.appendChild(canvasEl);
                        }
                    }
                }

                if (canvasEl) {
                    const ctx = canvasEl.getContext('2d');
                    await new Promise((resolve) => {
                        new Chart(ctx, {
                            type: 'radar',
                            data: {
                                labels: ['立意', '取材', '扣題', '詳略', '詞彙', '文學性'],
                                datasets: [{
                                    label: '能力評估',
                                    data: [
                                        record.scoreData.radar.立意 || 0,
                                        record.scoreData.radar.取材 || 0,
                                        record.scoreData.radar.扣題 || 0,
                                        record.scoreData.radar.詳略 || 0,
                                        record.scoreData.radar.詞彙 || 0,
                                        record.scoreData.radar.文學性 || 0
                                    ],
                                    backgroundColor: 'rgba(54, 162, 235, 0.2)',
                                    borderColor: 'rgba(54, 162, 235, 1)',
                                    borderWidth: 2,
                                    pointBackgroundColor: 'rgba(54, 162, 235, 1)'
                                }]
                            },
                            options: {
                                animation: false,
                                responsive: false,
                                scales: {
                                    r: {
                                        angleLines: { display: true },
                                        suggestedMin: 0, suggestedMax: 10,
                                        pointLabels: { font: { size: 14, family: "'Noto Serif TC', serif" } },
                                        ticks: { stepSize: 2, display: false }
                                    }
                                },
                                plugins: { legend: { display: false } }
                            }
                        });
                        setTimeout(resolve, 300);
                    });

                    const imgUrl = canvasEl.toDataURL('image/png');
                    const img = document.createElement('img');
                    img.src = imgUrl;
                    img.style.cssText = "width: 100%; max-width: 500px; display: block; margin: 0 auto;";
                    canvasEl.parentNode.replaceChild(img, canvasEl);
                }
            }

            // 5. === 提取全站 CSS ===
            let cssRules = "";
            Array.from(document.querySelectorAll('style')).forEach(style => { cssRules += style.innerHTML + "\n"; });
            let externalLinks = "";
            Array.from(document.querySelectorAll('link[rel="stylesheet"]')).forEach(link => { externalLinks += link.outerHTML + "\n"; });

            // 6. === 組合最終 HTML (強制覆寫 Body 樣式) ===
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
        
        /* === 關鍵修正：強制覆寫原有網站 CSS 對 Body 的限制 === */
        
        body { 
            /* 1. 強制重置 Body 寬度與背景，覆蓋原網站的 max-width: 800px */
            max-width: 100% !important; 
            width: 100% !important;
            margin: 0 !important;
            padding: 40px 0 !important;
            
            /* 2. 使用 Flexbox 確保內容卡片絕對置中 */
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important; /* 水平置中 */
            
            background-color: #f2f4f7 !important;
            background-image: none !important;
            min-height: 100vh !important;
            overflow-y: auto !important;
        }

        /* 內容容器：這張「紙」 */
        .export-wrapper {
            /* 3. 設定固定寬度 900px (電腦版)，配合 Body 的 Flex 置中 */
            width: 900px !important;
            
            /* 4. 響應式保護：在小螢幕上縮放 */
            max-width: 95% !important; 
            
            background-color: #ffffff !important;
            box-shadow: 0 10px 40px rgba(0,0,0,0.08) !important;
            border-radius: 12px !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
            position: relative !important;
            margin: 0 !important; /* Margin 0，因為 Body 已經負責置中了 */
        }

        /* 修復 Grid 排版 (評分表 + 雷達圖) */
        .grading-grid { 
            display: grid !important; 
            grid-template-columns: 1fr 1fr !important; 
            gap: 20px !important; 
            width: 100% !important;
        }
        .grading-scores, .grading-radar {
            width: 100% !important;
            box-sizing: border-box !important;
            margin: 0 !important;
        }

        /* 手機版樣式 */
        @media (max-width: 768px) {
            body {
                padding: 0 !important; 
                background-color: #fff !important;
                display: block !important; /* 手機版改回 Block，讓內容自然流動 */
            }
            .export-wrapper {
                width: 100% !important;
                max-width: 100% !important;
                border-radius: 0 !important;
                box-shadow: none !important;
            }
            .grading-grid {
                grid-template-columns: 1fr !important;
            }
        }

        button { display: none !important; }
    </style>
</head>
<body>
    <div class="export-wrapper">
        ${shadowContainer.innerHTML}
    </div>
    
    <div style="text-align: center; color: #aaa; font-size: 12px; margin-top: 30px; font-family: sans-serif; width: 100%;">
        Generated by 神思 SANSI AI System
    </div>
</body>
</html>`;

            // 7. 清理與下載
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

        request.onerror = function() { alert("讀取紀錄失敗"); resetBtn(); };

    } catch (e) {
        console.error("下載 HTML 錯誤:", e);
        alert("下載失敗，請重試");
        resetBtn();
    }
}
	
	
// ==========================================
// === 修正版：刪除紀錄 (手術刀式 - 不會影響其他 Key) ===
// ==========================================
async function deleteHistoryItem(id) {
    if (!confirm("確定要刪除這條紀錄嗎？\n(注意：雲端備份也會同步刪除)")) return;
    
    const s = JSON.parse(localStorage.getItem('studentProfile'));
 
    try {
        const db = await openHistoryDB();
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        
        // 1. 先獲取這筆資料 (為了拿到 Timestamp)
        const getReq = store.get(id);
        
        getReq.onsuccess = async function(e) {
            const record = e.target.result;
            
            // 2. 刪除本地
            store.delete(id);
            
            // 3. 刪除雲端 (精準刪除)
            if (s && record && record.timestamp) {
                const cloudKey = record.timestamp.toString();
                // ★★★ 關鍵修改：直接指向該 Key 進行刪除，不影響旁邊的資料 ★★★
                const path = `students/${s.grade}/${s.class}/${s.name}/history/${cloudKey}`;
                
                await database.ref(path).remove();
                console.log(`🗑️ 雲端 Key [${cloudKey}] 已精準移除`);
            } else if (s && (!record || !record.timestamp)) {
                console.warn("找不到 Timestamp，無法刪除雲端對應資料 (可能已是幽靈檔案)");
            }
 
            // 4. 刷新介面
            // (使用 setTimeout 確保 DB 刪除動作已完成)
            setTimeout(() => {
                if (document.getElementById('historyLevel3').style.display !== 'none' && typeof currentSubFunctionFilter !== 'undefined') {
                    // 如果正在列表頁，重新讀取
                    const themeIndex = typeof currentThemeIndex !== 'undefined' ? currentThemeIndex : 1;
                    enterHistoryList(currentSubFunctionFilter, themeIndex);
                }
            }, 100);
        };
        
    } catch (e) {
        console.error("刪除失敗:", e);
        alert("刪除失敗，請重試。");
    }
}
	
// ==========================================
// === 修正版：清空所有紀錄 (直接設為空物件) ===
// ==========================================
async function clearAllHistory() {
    if (!confirm("確定要清空所有歷史紀錄嗎？")) return;
    
    const s = JSON.parse(localStorage.getItem('studentProfile'));
    const level3 = document.getElementById('historyLevel3');
 
    // UI 反饋
    if (level3 && level3.style.display !== 'none') {
        level3.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:40px; color:#999;"><i class="fas fa-circle-notch fa-spin"></i> 正在清空...</div>';
    }
 
    try {
        const db = await openHistoryDB();
        
        // 1. 清空本地
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        store.clear();
 
        // 2. 清空雲端 (設為 null 即可完全移除節點，不會留下 array 結構)
        if (s) {
            const path = `students/${s.grade}/${s.class}/${s.name}/history`;
            await database.ref(path).remove(); // 使用 remove() 比 set([]) 更乾淨
            console.log("雲端同步清空成功");
        }
 
        // 3. 刷新介面
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
            alert("✅ 所有紀錄已清空");
        }, 200);
 
    } catch (e) {
        console.error("清空錯誤:", e);
        alert("清空失敗，請重試。");
        // 恢復畫面
        if (typeof currentSubFunctionFilter !== 'undefined') {
             enterHistoryList(currentSubFunctionFilter);
        }
    }
}
// ==========================================================================
// === 3. [學生端] 歷史詳情修復：加入學習報告雷達圖的重繪邏輯 (修復版) ===
// ==========================================================================
async function viewHistoryDetail(id) {
    try {
        const db = await openHistoryDB();
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(id);
        request.onsuccess = function(event) {
            const record = event.target.result;
            if (record) {
                // ★★★ 關鍵修復：鎖定當前紀錄的時間戳 ★★★
                // 這樣稍後如果在視窗內進行 AI 追問，系統才知道要更新哪一筆紀錄
                lastGeneratedTimestamp = record.timestamp;
 
                // 1. 計算主題色
                let themeIndex = 1;
                if (HISTORY_STRUCTURE[record.category]) {
                    const subIndex = HISTORY_STRUCTURE[record.category].indexOf(record.subFunction);
                    if (subIndex !== -1) {
                        themeIndex = (subIndex % 5) + 1;
                    }
                }
                const themeClass = `history-theme-context-${themeIndex}`;
                const colorVar = `var(--m-color-${themeIndex})`;
                // 2. 設定標題
                document.getElementById('historyModalTitle').innerHTML =
                    `<i class="fas fa-book-open" style="color:${colorVar}"></i>
                     <span style="color:#333">${record.category}</span>
                     <span style="font-size:0.8em; color:#bbb; margin: 0 5px;">/</span>
                     <span style="color:${colorVar}; font-weight:bold;">${record.subFunction}</span>`;
                
                const dateElement = document.getElementById('historyModalDate');
                if (dateElement) dateElement.style.display = "none";
                
                let contentHTML = '';
                // 3. 處理使用者輸入內容
                if (record.category !== "學習報告" && record.userContent) {
                    const rawText = record.userContent;
                    const lines = rawText.split('\n');
                    
                    // 判斷是否為議論指引，如果是，加入專屬 class
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
                // 4. 處理 AI 生成內容
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
                
                // 5. 顯示繳交按鈕 (學習報告除外)
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
                // 6. 注入懸浮儲存鍵
                contentHTML += `
                    <button id="history-save-btn-${record.id}"
                            class="morandi-save-float-btn"
                            onclick="saveHistoryEdits(${record.id})">
                        <i class="fas fa-save"></i>
                    </button>
                `;
                // 7. 注入 Modal
                const modalContent = document.getElementById('historyModalContent');
                modalContent.innerHTML = contentHTML;
                document.getElementById('historyModal').style.display = 'flex';
                // 8. 重繪圖表邏輯 (含學習報告)
                setTimeout(() => {
                    if (record.category !== "學習報告" && record.scoreData && record.scoreData.radar) {
                        const canvasEl = modalContent.querySelector('.radar-chart-container canvas') || modalContent.querySelector('canvas');
                        if (canvasEl) {
                            renderSingleRadarChart(canvasEl, record.scoreData.radar);
                        }
                    }
                    else if (record.category === "學習報告" && record.scoreData) {
                        if (record.scoreData["敘事抒情"] && record.scoreData["敘事抒情"].radar) {
                            const narrBadge = modalContent.querySelector('.badge-narrative');
                            if (narrBadge) {
                                const section = narrBadge.closest('.report-section');
                                const narrCanvas = section ? section.querySelector('canvas') : null;
                                if (narrCanvas) renderReportRadarChart(narrCanvas, record.scoreData["敘事抒情"].radar);
                            }
                        }
                        if (record.scoreData["議論"] && record.scoreData["議論"].radar) {
                            const argBadge = modalContent.querySelector('.badge-argument');
                            if (argBadge) {
                                const section = argBadge.closest('.report-section');
                                const argCanvas = section ? section.querySelector('canvas') : null;
                                if (argCanvas) renderReportRadarChart(argCanvas, record.scoreData["議論"].radar);
                            }
                        }
                    }
                }, 150);
            }
        };
    } catch (e) { console.error(e); }
}
	
// 輔助函式：繪製單篇雷達圖
function renderSingleRadarChart(canvasEl, radarData) {
    const dataValues = [
        radarData.立意 || 0, radarData.取材 || 0, radarData.扣題 || 0,
        radarData.詳略 || 0, radarData.詞彙 || 0, radarData.文學性 || 0
    ];
    new Chart(canvasEl.getContext('2d'), {
        type: 'radar',
        data: {
            labels: ['立意', '取材', '扣題', '詳略', '詞彙', '文學性'],
            datasets: [{
                label: '能力評估',
                data: dataValues,
                backgroundColor: 'rgba(54, 162, 235, 0.2)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 2,
                pointBackgroundColor: 'rgba(54, 162, 235, 1)',
                pointBorderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                r: { angleLines: { display: true }, suggestedMin: 0, suggestedMax: 10, ticks: { stepSize: 2, display: false } }
            },
            plugins: { legend: { display: false } }
        }
    });
}

// 輔助函式：繪製學習報告雷達圖
function renderReportRadarChart(canvasEl, radarDataArray) {
    // 學習報告的 radarData 已經是一個陣列 [立意, 取材...]
    new Chart(canvasEl.getContext('2d'), {
        type: 'radar',
        data: {
            labels: ['立意', '取材', '扣題', '詳略', '詞彙', '文學性'],
            datasets: [{
                label: '平均能力',
                data: radarDataArray,
                backgroundColor: 'rgba(94, 112, 103, 0.4)',
                borderColor: '#5e7067',
                borderWidth: 2,
                pointBackgroundColor: '#5e7067'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                r: { suggestedMin: 0, suggestedMax: 10, ticks: { display: false } }
            },
            plugins: { legend: { display: false } }
        }
    });
}

	function enableHistoryEdit(element) {
    // 啟用編輯
    element.contentEditable = "true";
    element.focus();
    
    // 找出目前紀錄的 ID
    const parts = element.id.split('-');
    const recordId = parts[parts.length - 1];
    
    // 顯示對應的懸浮儲存按鈕
    const saveBtn = document.getElementById(`history-save-btn-${recordId}`);
    if (saveBtn) {
        saveBtn.style.display = 'flex'; // 顯示圓形按鈕
        
        // 手機震動回饋
        if (navigator.vibrate) navigator.vibrate(15);
    }
}

// ==========================================
// === 核心修復：儲存修訂並覆蓋舊檔 ===
// ==========================================

// 輔助函式：根據時間戳記找回新 ID
function findIdByTimestamp(timestamp) {
    return new Promise(async (resolve) => {
        try {
            const db = await openHistoryDB();
            const transaction = db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const index = store.index('timestamp');
            const request = index.get(timestamp);
            
            request.onsuccess = function(event) {
                const record = event.target.result;
                resolve(record ? record.id : null);
            };
            request.onerror = () => resolve(null);
        } catch (e) {
            resolve(null);
        }
    });
}


// ==========================================
// === 4. 儲存修訂 (修復：UI回饋優化版) ===
// ==========================================
async function saveHistoryEdits(id) {
    const userContentEl = document.getElementById(`edit-user-content-${id}`);
    const aiContentEl = document.getElementById(`edit-ai-content-${id}`);
    const saveBtn = document.getElementById(`history-save-btn-${id}`);
    
    // 備份原始按鈕內容以便還原
    const originalIcon = saveBtn ? saveBtn.innerHTML : '<i class="fas fa-save"></i>';
    
    if (saveBtn) {
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        saveBtn.disabled = true;
    }

    try {
        const db = await openHistoryDB();
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        
        const getRequest = store.get(id);
        
        getRequest.onsuccess = function(event) {
            const record = event.target.result;
            if (record) {
                // 1. 記錄舊的時間戳
                const oldTimestamp = record.timestamp;
                
                // 2. 更新內容
                if (userContentEl) record.userContent = userContentEl.innerText;
                if (aiContentEl) record.aiContent = aiContentEl.innerHTML;
                
                // 3. 更新時間戳 (視為新版)
                const newTimestamp = new Date().getTime();
                record.timestamp = newTimestamp;
                record.dateStr = new Date().toLocaleString('zh-HK', { hour12: false });
                
                // 4. 設定同步狀態
                record.isSynced = false;
                record.hasBeenSynced = false;
                
                // 5. 寫入本地資料庫
                const putRequest = store.put(record);
                
                putRequest.onsuccess = async function() {
                    console.log("本地紀錄已修訂，準備同步...");
                    const s = JSON.parse(localStorage.getItem('studentProfile'));
                    
                    if (s) {
                        try {
                            const oldPath = `students/${s.grade}/${s.class}/${s.name}/history/${oldTimestamp}`;
                            await database.ref(oldPath).remove();
                        } catch (cloudErr) {
                            console.error("雲端舊檔移除失敗:", cloudErr);
                        }
                    }
                    
                    // 背景執行同步，不阻擋 UI
                    smartSyncHistory(); 
                    
                    // 6. 尋找新 ID 並刷新介面
                    const newId = await findIdByTimestamp(newTimestamp);
                    if (newId) {
                        lastGeneratedTimestamp = newTimestamp;
                        
                        // ★★★ 關鍵：重新載入詳情，這會重建 DOM，從而移除轉圈的按鈕 ★★★
                        await viewHistoryDetail(newId);
                        
                        // 刷新列表 (如果在背景開啟)
                        if (typeof currentSubFunctionFilter !== 'undefined' &&
                            document.getElementById('historyLevel3').style.display !== 'none') {
                            const themeIndex = typeof currentThemeIndex !== 'undefined' ? currentThemeIndex : 1;
                            enterHistoryList(currentSubFunctionFilter, themeIndex);
                        }
                        
                        alert("✅ 修訂已儲存！");
                    }
                };
            } else {
                alert("錯誤：找不到原始紀錄。");
                if (saveBtn) {
                    saveBtn.disabled = false;
                    saveBtn.innerHTML = originalIcon;
                }
            }
        };
    } catch (e) {
        console.error("儲存失敗:", e);
        alert("儲存失敗，請重試。");
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = originalIcon;
        }
    }
}
	
function closeHistoryModal() {
    document.getElementById('historyModal').style.display = 'none';
}


// === 新增：日期搜尋功能 ===

// 觸發日期選擇器 (為了美觀，用按鈕觸發隱藏的 input)
function triggerDatePicker() {
    const picker = document.getElementById('historyDatePicker');
    if (picker) {
        // 嘗試顯示原生日期選擇器
        try {
            picker.showPicker(); 
        } catch (e) {
            picker.click(); // 舊版瀏覽器 fallback
        }
    }
}

// 執行捲動定位邏輯
function scrollToHistoryDate(inputElement) {
    const selectedDateStr = inputElement.value; // 格式: YYYY-MM-DD
    if (!selectedDateStr) return;

    // 將選擇的日期轉為當天的結束時間戳 (23:59:59)
    // 因為列表是從新到舊排列 (Descending)，我們要找的第一個紀錄應該是
    // 時間戳小於或等於「該日結束」的紀錄
    const selectedDateEnd = new Date(selectedDateStr).setHours(23, 59, 59, 999);
    
    // 獲取所有已渲染的卡片
    const cards = document.querySelectorAll('#historyLevel3 .history-card');
    let targetCard = null;

    // 移除所有舊的高亮
    cards.forEach(c => c.classList.remove('highlighted'));

    // 遍歷卡片尋找目標
    for (let card of cards) {
        const timestamp = parseInt(card.getAttribute('data-timestamp'));
        
        // 邏輯：因為卡片是按時間倒序排列 (最新的在上面)
        // 我們要找的是第一個時間戳「小於或等於」選定日期結束時間的卡片
        // 這代表它是該日期(或該日期之前)最新的一條紀錄
        if (timestamp <= selectedDateEnd) {
            targetCard = card;
            break; // 找到後立即停止
        }
    }

    if (targetCard) {
        // 捲動到該卡片
        targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // 添加高亮效果
        targetCard.classList.add('highlighted');
        
        // 檢查是否完全匹配當天 (用於提示)
        const targetDate = new Date(parseInt(targetCard.getAttribute('data-timestamp')));
        const checkDateStr = targetDate.toISOString().split('T')[0];
        
        if (checkDateStr !== selectedDateStr) {
            // 如果找到的卡片不是選定當天的(代表那天沒紀錄)，提示使用者
            // alert(`找不到 ${selectedDateStr} 的紀錄，已定位至最接近的過往紀錄 (${checkDateStr})。`);
            // 上方 alert 可依需求開啟或關閉，通常直接定位即可
        }
    } else {
        alert("找不到該日期或更早之前的紀錄。");
    }
}

	// === 歷史紀錄：標題原地編輯邏輯 ===

/**
 * 啟用標題編輯模式
 * @param {HTMLElement} titleEl - 被雙擊的 h4 元素
 * @param {number} id - 紀錄的 ID
 */
function enableTitleEditing(titleEl, id) {
    // 防止重複觸發 (如果已經是 input 就不動作)
    if (titleEl.querySelector('input')) return;

    const currentText = titleEl.innerText;
    
    // 創建 input 元素
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentText;
    input.className = 'history-title-input';
    
    // 點擊 input 時也要防止冒泡，以免觸發查看詳情
    input.onclick = (e) => e.stopPropagation();
    input.ondblclick = (e) => e.stopPropagation();

    // 清空原本的標題文字，放入 input
    titleEl.innerHTML = '';
    titleEl.appendChild(input);
    input.focus();

    // 定義儲存並還原的邏輯
    const saveAndRevert = async () => {
        const newTitle = input.value.trim() || currentText; // 如果是空的，還原舊標題
        
        if (newTitle !== currentText) {
            // 如果標題有變更，儲存到 DB
            await updateHistoryTitleInDB(id, newTitle);
        }
        
        // 還原為文字顯示
        titleEl.innerText = newTitle;
    };

    // 事件監聽：失去焦點 (Blur) 或 按下 Enter 鍵時儲存
    input.addEventListener('blur', saveAndRevert);
    input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            this.blur(); // 觸發 blur 來儲存
        } else if (e.key === 'Escape') {
            // 按 Esc 取消編輯，還原舊文字
            titleEl.innerText = currentText; 
        }
    });
}

// ==========================================
// === 3. 聊天室/追問 即時存檔 (修復：保留輸入介面) ===
// ==========================================
async function updateHistoryChat() {
    if (!lastGeneratedTimestamp) {
        console.warn("未設定時間戳，無法儲存對話。");
        return;
    }
 
    // 尋找內容來源 (兼容畫布與歷史詳情視窗)
    let sourceElement = document.getElementById("resultCanvasBody");
    const isCanvasHidden = !sourceElement || sourceElement.style.display === 'none' || sourceElement.offsetParent === null || sourceElement.innerHTML.trim() === "";
    
    if (isCanvasHidden) {
        sourceElement = document.getElementById("historyModalContent");
    }
 
    if (!sourceElement) return;
    
    // 複製 HTML 進行清理
    const clone = sourceElement.cloneNode(true);
 
    // --- [修復重點 A]：只移除「舊版」或「暫時性」的輸入框，保留 .canvas-input-area ---
    const tempInputAreas = clone.querySelectorAll('#writingGuideChatInputContainer, #writingChatInputContainer, #argumentChatInputContainer, #chatInputContainer');
    tempInputAreas.forEach(el => el.remove());
    
    // --- [修復重點 B]：針對畫布聊天室的輸入框，只清空數值，不移除元素 ---
    const canvasInputs = clone.querySelectorAll('.canvas-input-area textarea');
    canvasInputs.forEach(el => {
        el.value = '';      // 清空輸入值
        el.innerHTML = '';  // 清空 HTML 內容
        el.removeAttribute('disabled'); // 確保下次打開可輸入
    });
 
    // --- [修復重點 C]：移除其他功能按鈕，但「保留」發送鍵 (.canvas-send-btn) ---
    // 這裡使用 :not() 選擇器來排除發送按鈕和懸浮儲存按鈕
    const buttons = clone.querySelectorAll('button:not(.canvas-send-btn):not(.morandi-save-float-btn), .btn-icon-action, .history-save-btn');
    buttons.forEach(el => el.remove());
 
    // 確保發送按鈕是啟用狀態
    const sendBtns = clone.querySelectorAll('.canvas-send-btn');
    sendBtns.forEach(btn => btn.disabled = false);
 
    // 處理 Canvas 圖表 (保持不變)
    const clonedCanvases = clone.querySelectorAll('canvas');
    clonedCanvases.forEach((canvas) => {
        canvas.style.width = '100%';
        canvas.style.height = '350px';
        canvas.style.display = 'block';
        canvas.removeAttribute('id');
    });
 
    const newAiContent = clone.innerHTML;
 
    try {
        const db = await openHistoryDB();
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const index = store.index('timestamp');
 
        const request = index.get(lastGeneratedTimestamp);
 
        request.onsuccess = function(event) {
            const data = event.target.result;
            if (data) {
                // A. 更新內容 (寫入包含新氣泡的 HTML)
                data.aiContent = newAiContent;
                
                // B. 設定同步狀態
                data.isSynced = false;       // 標記為本地較新
                data.hasBeenSynced = true;   // 防止被誤刪
 
                const updateRequest = store.put(data);
                
                updateRequest.onsuccess = function() {
                    console.log("聊天紀錄已更新 (準備上傳)");
                    
                    // 立即觸發靜默同步，將最新的對話推送到雲端
                    // 注意：此處調用 smartSyncHistory 而非 syncHistoryToFirebase
                    if (typeof smartSyncHistory === 'function') {
                        smartSyncHistory();
                    }
                };
            }
        };
    } catch (e) {
        console.error("更新聊天紀錄失敗:", e);
    }
}

	
// === 雙擊/單擊 衝突解決方案 ===
let titleClickTimer = null;

/**
 * 處理標題的單擊事件 (延遲觸發查看)
 */
function handleTitleClick(event, id) {
    // 1. 阻止事件冒泡，防止觸發父層的立即查看
    event.stopPropagation();

    // 2. 如果已經有計時器，表示這可能是雙擊過程中的第二次點擊，不做處理
    if (titleClickTimer) return;

    // 3. 設定延遲，如果 250ms 內沒有發生雙擊，才打開視窗
    titleClickTimer = setTimeout(() => {
        viewHistoryDetail(id);
        titleClickTimer = null;
    }, 250); 
}

/**
 * 處理標題的雙擊事件 (取消查看，進入編輯)
 */
function handleTitleDblClick(element, id) {
    // 1. 阻止事件冒泡
    event.stopPropagation();

    // 2. 關鍵：清除單擊產生的計時器！這樣就不會彈出視窗了
    if (titleClickTimer) {
        clearTimeout(titleClickTimer);
        titleClickTimer = null;
    }

    // 3. 進入編輯模式
    enableTitleEditing(element, id);
}




// 2. [發送端功能] 老師發送通知的函式
// 為了安全，將 API KEY 拆分混淆，避免簡單的爬蟲直接抓取
const _p1 = "os_v2_app_";
const _p2 = "7bo2joflvzgf5dnzzh2gh7eycxk5kn45q25uwymlyhqbq746uburtgfhd3xfyyxullklptksmnddfdwgpechno4byssraz7yysuusrq";
const _OS_KEY = _p1 + _p2;

/**
 * 發送推播通知給指定班級 (請在老師發佈課業的代碼中調用此函式)
 * @param {string} targetGrade - 年級 (如 "4")
 * @param {string} targetClass - 班別 (如 "A")
 * @param {string} title - 通知標題
 * @param {string} message - 通知內容
 */
/**
* 發送推播通知 (經由 GAS 後端代理，解決 CORS 與隱私問題)
* @param {string} targetGrade - 年級 (如 "4")
* @param {string} targetClass - 班別 (如 "A")
* @param {string} title - 通知標題
* @param {string} message - 通知內容
*/
async function sendClassNotification(targetGrade, targetClass, title, message) {
    // 1. 獲取 Firebase Token (因為後端有 verifyAuth 保護)
    const user = firebase.auth().currentUser;
    if (!user) {
        console.error("無法發送通知：未登入");
        return;
    }
    const token = await user.getIdToken();
 
    // 2. 構建 OneSignal 的標準 Payload
    const oneSignalData = {
        app_id: "f85da4b8-abae-4c5e-8db9-c9f463fc9815",
        headings: { en: title, zh: title },
        contents: { en: message, zh: message },
        // 過濾條件
        filters: [
            { field: "tag", key: "grade", relation: "=", value: targetGrade },
            { operator: "AND" },
            { field: "tag", key: "class", relation: "=", value: targetClass }
        ],
        // 點擊通知後打開的網址
        url: window.location.href
    };
 
    // 3. 構建發送給 GAS 的 Payload
    const requestBody = {
        token: token,             // 通過後端驗證
        action: 'onesignal_proxy',// 告訴後端執行 OneSignal 轉發
        data: oneSignalData       // 實際要轉發的資料
    };
 
    // 4. 發送請求到您的 GAS (API_URL 已經在您的代碼中定義為 CLOUDFLARE_WORKER_URL)
    // 註：這裡假設 API_URL 指向的是您的 GAS Web App 網址
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // GAS 慣用 text/plain 以避免 OPTIONS 預檢
            body: JSON.stringify(requestBody)
        });
 
        const data = await response.json();
        
        if (data.id) {
            console.log('OneSignal 發送成功 (Via Backend):', data);
        } else if (data.error) {
            console.error('OneSignal 發送失敗 (Backend Error):', data.error);
        } else {
            console.log('OneSignal 回應:', data);
        }
 
    } catch (err) {
        console.error('連線 GAS 後端失敗:', err);
    }
}

/**
 * 發送推播通知給特定學生 (請在老師發還評語的代碼中調用此函式)
 * 注意：這需要 OneSignal 的 External User ID 功能，或利用 Tag 標記個別學生
 * 這裡演示利用 Tag 標記個別學生 (假設 Tag 包含 studentName)
 */
async function sendStudentNotification(studentName, title, message) {
    // 您需要在 bindStudentIdentity 中增加 studentName 的 Tag 才能使用此功能
    // 這裡僅作示例
}

	

// ==========================================
// === 1. 雲端按鍵 (白雲) 與 視窗控制 ===
// ==========================================
 
// 打開「學生雲端中心」
function openStudentLoginModal() {
    const modal = document.getElementById('studentCloudModal');
    if (modal) {
        // 1. 強制關閉其他全螢幕介面
        const containers = ['historyContainer', 'toolsContainer2', 'featuredContainer'];
        containers.forEach(id => {
            const el = document.getElementById(id);
            if(el) el.style.display = 'none';
        });
 
        // 隱藏主頁背景元素
        document.querySelector('.title-container').style.display = 'none';
        document.getElementById('hitokoto-container').style.display = 'none';
        document.getElementById('mainMenuBox').style.display = 'none';
        document.getElementById('dse-countdown-box').style.display = 'none';
 
        // 2. 顯示視窗
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
        
        // 3. 執行登入檢查 & 載入課業 (但不同步歷史)
        checkStudentLogin();
 
        // 4. UI 按鈕狀態調整
        const cloudBtn = document.getElementById('sideMenuCloudBtn');
        if (cloudBtn) cloudBtn.style.display = 'none'; // 在雲端頁面時隱藏雲端按鈕
 
        const homeBtn = document.getElementById('sideMenuHomeBtn');
        if (homeBtn) homeBtn.style.display = 'flex';
 
        const floatHomeBtn = document.getElementById('homeBtn');
        if (floatHomeBtn) floatHomeBtn.style.display = 'none';
 
        // 收起側邊選單
        const sideMenu = document.getElementById('sideMenu');
        if (sideMenu) {
            sideMenu.classList.remove('active');
            document.getElementById('sideMenuToggle').classList.remove('active');
        }
    }
}
// === 2. 修改關閉「學生雲端中心」的函式 ===
function closeStudentCloudModal() {
    // 直接呼叫 returnToHome()，它會負責：
    // 1. 播放退場動畫
    // 2. 隱藏雲端視窗
    // 3. 重新顯示主頁選單、標題、DSE倒數
    // 4. 解鎖頁面捲動
    returnToHome();
}

// ==========================================
// === 全新修訂：學生身份自動同步與轉班處理 ===
// ==========================================

// 檢查學生登入狀態 & 啟動課業監聽
async function checkStudentLogin() {
    // 嘗試讀取本地學生檔案 (登出時不再刪除此檔案，所以通常會有)
    const s = JSON.parse(localStorage.getItem('studentProfile'));
    
    if (!s) {
        // 如果完全沒有資料，顯示登入表單
        document.getElementById('studentIdentityForm').style.display = 'block';
        document.getElementById('studentCloudPanel').style.display = 'none';
        return;
    }
 
    // 有資料，顯示雲端面板
    document.getElementById('studentIdentityForm').style.display = 'none';
    document.getElementById('studentCloudPanel').style.display = 'block';
    updateWelcomeMessage(s);
    
    // 檢查 Firebase Auth 狀態 (是否過期)
    // 我們只在 Auth 準備好時觸發「課業載入」
    // ★★★ 關鍵：這裡只載入課業，不同步歷史 ★★★
    try {
        // 如果 Auth 未初始化，等待一下
        let authWait = 0;
        while (!auth.currentUser && authWait < 5) {
            await new Promise(r => setTimeout(r, 200));
            authWait++;
        }
 
        if (auth.currentUser) {
            // 已連線：載入課業列表
            await loadAssignments(s.grade, s.class);
            
            // 啟動紅點監聽 (如果有未交功課)
            monitorPendingAssignments();
            
            // ★★★ 這裡啟動「省流同步」，只在背景執行，不阻擋 UI ★★★
            smartSyncHistory();
        } else {
            console.log("處於離線或未驗證狀態，顯示本地緩存的介面");
            // 即使沒連線，也可以顯示介面，但不載入新課業
        }
 
    } catch (err) {
        console.error("登入檢查錯誤:", err);
    }
}

	
// 2. 輔助函式：更新歡迎文字
// 2. 輔助函式：更新歡迎文字 (優化顯示版)
function updateWelcomeMessage(profile) {
    let displayStr = '';
    
    // 如果是老師 (System/Test)，顯示特殊格式
    if (profile.grade === 'System') {
        displayStr = `系統測試 - ${profile.name}`;
    } else {
        // 如果是學生，顯示正常格式
        const numDisplay = profile.number ? `(${profile.number})` : '';
        displayStr = `${profile.grade}${profile.class} ${numDisplay} - ${profile.name}`;
    }

    document.getElementById('welcomeText').innerHTML = 
        `你好，${displayStr} 
         <span style="font-size:0.8em; color:#ccc; margin-left:5px;" id="syncStatusIcon"></span>`;
}

// 3. 【核心新增】驗證學生狀態 (同步資料 + 處理轉班 + 處理帳號失效)
// === 1. 嚴格驗證函式 (防止寫入幽靈資料) ===
async function verifyStudentStatus(localProfile) {
    const statusIcon = document.getElementById('syncStatusIcon');
    if(statusIcon) statusIcon.innerHTML = '<i class="fas fa-sync fa-spin"></i>'; 

    // 路徑：students/Grade/Class/Name/profile
    const path = `students/${localProfile.grade}/${localProfile.class}/${localProfile.name}/profile`;

    try {
        const snapshot = await database.ref(path).once('value');
        const cloudData = snapshot.val();

        if (cloudData) {
            // A. 資料存在，檢查班號是否為空
            if (!cloudData.number || cloudData.number === "") {
                // ★★★ 觸發：班號輸入請求 ★★★
                promptForNewClassNumber(localProfile, path);
            } 
            else if (cloudData.number != localProfile.number) {
                // 班號存在但不一樣 (例如老師手動改了)，同步本地
                localProfile.number = cloudData.number;
                localStorage.setItem('studentProfile', JSON.stringify(localProfile));
                updateWelcomeMessage(localProfile);
            }
            if(statusIcon) statusIcon.innerHTML = ''; 
        } else {
            // B. 資料不存在 (可能升班了)，執行全校搜尋
            console.warn("原路徑找不到資料，啟動全校搜尋...");
            findStudentNewLocation(localProfile.name);
        }
    } catch (error) {
        console.error("同步檢查失敗:", error);
    }
}

// === 新增：班號輸入介面 ===
// === 1. 暫存變數，用於跨函式傳遞資料 ===
let pendingUpdateProfile = null;
let pendingUpdatePath = null;

// === 2. 顯示班號更新視窗 (取代原本的 prompt) ===
function promptForNewClassNumber(profile, firebasePath) {
    // 儲存資料以便確認時使用
    pendingUpdateProfile = profile;
    pendingUpdatePath = firebasePath;

    // 初始化下拉選單 (1-35)
    const select = document.getElementById('newClassNumberSelect');
    select.innerHTML = '';
    for (let i = 1; i <= 35; i++) {
        const opt = document.createElement('option');
        opt.value = i;
        opt.innerText = i;
        select.appendChild(opt);
    }

    // 顯示視窗 (強制最上層)
    const modal = document.getElementById('classNumberUpdateModal');
    if (modal) {
        // ★ 強制搬運到 body 最外層，防止被遮擋 ★
        document.body.appendChild(modal);
        
        modal.style.display = 'flex';
    }
}

// === 3. 確認更新班號 (點擊按鈕觸發) ===
async function confirmClassNumberUpdate() {
    const select = document.getElementById('newClassNumberSelect');
    const newNum = select.value;
    const modal = document.getElementById('classNumberUpdateModal');
    const btn = modal.querySelector('button');

    // UI 鎖定
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 更新中...';

    try {
        // 寫入 Firebase
        await database.ref(pendingUpdatePath).update({ number: newNum });
        
        // 更新本地儲存
        pendingUpdateProfile.number = newNum;
        localStorage.setItem('studentProfile', JSON.stringify(pendingUpdateProfile));
        
        // 刷新歡迎語
        updateWelcomeMessage(pendingUpdateProfile);

        // 關閉視窗
        modal.style.display = 'none';
        alert(`✅ 班號已更新為：${newNum}`);

    } catch (err) {
        alert("更新失敗，請檢查網絡。\n" + err.message);
    } finally {
        btn.disabled = false;
        btn.innerText = '確認更新';
    }
}

// (舊的 fallback，備用)
function fallbackPrompt(profile, firebasePath) {
    let newNum = window.prompt(`👋 新學年好！\n請輸入您在 ${profile.grade}${profile.class} 班的新班號 (1-35)：`);
    if (newNum && !isNaN(newNum)) {
        database.ref(firebasePath).update({ number: newNum });
        profile.number = newNum;
        localStorage.setItem('studentProfile', JSON.stringify(profile));
        updateWelcomeMessage(profile);
        alert("✅ 班號已更新！");
    }
}

// === 2. 全校搜尋函式 (處理升班與刪除) ===
// ===============================================================
// === [核心修復] 自動轉班與班號視窗即時彈出邏輯 ===
// ===============================================================

// 1. 覆寫：全校搜尋函式 (移除重新整理，改為即時彈窗)
// === 修正版：搜尋學生新位置 (只查索引，禁止全庫掃描) ===
async function findStudentNewLocation(studentName) {
    // 因為我們無法再進行全校掃描 (Rules 已禁止)，
    // 我們只能依賴 email_mapping。如果 email_mapping 也沒資料，
    // 就只能提示學生重新登入並輸入正確資料。
    
    // 嘗試從本地緩存的 Profile 中獲取電郵來查索引
    const s = JSON.parse(localStorage.getItem('studentProfile'));
    
    if (s && s.email) {
        const newProfile = await findProfileByEmail(s.email);
        
        if (newProfile) {
            // 在索引中找到了 (可能是別處登入過建立了索引)
            localStorage.setItem('studentProfile', JSON.stringify(newProfile));
            
            // 清空舊的本地紀錄
            try {
                const db = await openHistoryDB();
                const transaction = db.transaction([STORE_NAME], 'readwrite');
                const store = transaction.objectStore(STORE_NAME);
                store.clear();
            } catch (e) {}
 
            alert(`👋 歡迎回來！\n系統偵測到您的資料位置已更新。\n\n新位置：${newProfile.grade}${newProfile.class} 班\n(舊紀錄已封存)`);
            
            updateWelcomeMessage(newProfile);
            loadAssignments(newProfile.grade, newProfile.class);
            monitorPendingAssignments();
            startAutoSyncListener();
            
            // 彈出班號確認
            const newPath = `students/${newProfile.grade}/${newProfile.class}/${newProfile.name}/profile`;
            promptForNewClassNumber(newProfile, newPath);
            return;
        }
    }
 
    // 如果索引也沒有 (真的找不到)，則提示重新登入
    console.warn("無法定位學生位置 (全庫掃描已禁用)。");
    alert("⚠️ 系統資料庫已更新或找不到您的位置。\n\n請重新登入，並確保選擇正確的「年級」與「班別」。");
    handleStudentLogout();
}
// 2. 覆寫：自動同步監聽器 (新增 Profile 監聽，實現自動觸發);


	
// 1. 初始化班號選項 (請放在 initDSECalendar 或 DOMContentLoaded 內執行，或是直接放在 script 最後)
function initClassNumbers() {
    const select = document.getElementById('studentNumber');
    if (!select) return;
    select.innerHTML = '';
    for (let i = 1; i <= 32; i++) {
        const opt = document.createElement('option');
        opt.value = i;
        opt.innerText = i; // 顯示數字
        select.appendChild(opt);
    }
}
// 呼叫初始化
document.addEventListener('DOMContentLoaded', initClassNumbers);




// === 新增：學校電郵登入處理函式 ===
async function handleSchoolLogin() {
    // 1. 獲取用戶輸入的資料
    const manualName = document.getElementById('studentNameInput').value.trim();
    const grade = document.getElementById('studentGrade').value;
    const cls = document.getElementById('studentClass').value;
    const number = document.getElementById('studentNumber').value;
    
    // 2. 驗證姓名
    if (!manualName) {
        alert("請務必填寫您的「中文姓名」才能進行註冊！");
        document.getElementById('studentNameInput').focus();
        return;
    }

    const btn = event ? (event.target.tagName === 'BUTTON' ? event.target : event.target.closest('button')) : null;
    let originalContent = "";
    if (btn) {
        originalContent = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 驗證中...';
        btn.disabled = true;
    }

    // 暫存資料
    const tempStudentData = { manualName, grade, cls, number };
    sessionStorage.setItem('sansi_temp_student_data', JSON.stringify(tempStudentData));

    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    try {
        // ★ 核心修訂：設定持久化，確保登入狀態寫入硬碟
        await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);

        // 使用 Popup 登入
        const result = await auth.signInWithPopup(provider);
        await processLoginResult(result.user, btn, originalContent);

    } catch (error) {
        console.error("登入錯誤:", error);
        if (error.code === 'auth/popup-blocked') {
            alert("⚠️ 登入視窗被瀏覽器阻擋。\n\n請允許此網站顯示彈出式視窗，或嘗試使用 Chrome 瀏覽器。");
        } else if (error.code !== 'auth/popup-closed-by-user') {
            alert("登入發生錯誤：" + error.message);
        }
        if (btn) {
            btn.innerHTML = originalContent;
            btn.disabled = false;
        }
    }
}


// === [修正版] 全校電郵搜尋函式 (只查索引表，極速且省流量) ===
async function findProfileByEmail(targetEmail) {
    try {
        // 1. 將電郵轉為 Base64 (因為你的 email_mapping 是用 Base64 當 Key)
        const emailKey = btoa(targetEmail);
        
        // 2. 直接讀取 email_mapping 下的特定節點
        // 這只會下載該用戶的 Profile，不會下載 History，也不會下載其他人的資料
        const snapshot = await database.ref(`email_mapping/${emailKey}`).once('value');
        const profile = snapshot.val();
        
        if (profile) {
            console.log("✅ 透過索引表快速找到用戶:", profile.name);
            return profile; // 回傳該學生的基本資料
        }
 
        // 3. 如果索引表找不到，我們 **絕對不要** 掃描全校資料庫 ('students')
        // 直接回傳 null，讓系統改用「手動輸入的班級姓名」去嘗試登入
        console.log("索引表中未找到此電郵，視為新用戶或需手動驗證。");
        return null;
 
    } catch (error) {
        console.error("搜尋電郵失敗:", error);
        return null;
    }
}

	

// === 修正版：處理登入結果 (已更換為 Smart Sync) ===
async function processLoginResult(user, btn, originalContent) {
    let manualName, grade, cls, number;
    const storedData = sessionStorage.getItem('sansi_temp_student_data');
    if (storedData) {
        const data = JSON.parse(storedData);
        manualName = data.manualName; grade = data.grade; cls = data.cls; number = data.number;
    } else {
        manualName = document.getElementById('studentNameInput')?.value.trim();
        grade = document.getElementById('studentGrade')?.value;
        cls = document.getElementById('studentClass')?.value;
        number = document.getElementById('studentNumber')?.value;
    }
    
    if (!manualName) {
        alert("資料遺失，請重新輸入姓名。");
        if (btn) { btn.innerHTML = originalContent; btn.disabled = false; }
        return;
    }
 
    const email = user.email;
    let isTeacher = false;
    let isSpecialUser = false;
 
    try {
        const safeEmailKey = email.replace(/\./g, ',');
 
        const [teacherSnap, specialSnap] = await Promise.all([
            database.ref(`teachers/${safeEmailKey}`).once('value'),
            database.ref(`special_users/${safeEmailKey}`).once('value')
        ]);
 
        if (teacherSnap.exists() && teacherSnap.val() === true) {
            isTeacher = true;
        } else if (specialSnap.exists() && specialSnap.val() === true) {
            isSpecialUser = true;
            grade = "Special";
            cls = "User";
        }
        else {
            const DEBUG_USER = atob('a2VuY2hhbjIwMTQxQGdtYWlsLmNvbQ==');
            if (email === DEBUG_USER) {
                isTeacher = true;
            }
        }
 
        if (!isTeacher && !isSpecialUser) {
            if (!email.endsWith('@ccckyc.edu.hk')) {
                await auth.signOut();
                alert("⛔ 驗證失敗！\n此電郵不在允許名單內。");
                sessionStorage.removeItem('sansi_temp_student_data');
                if (btn) { btn.innerHTML = originalContent; btn.disabled = false; }
                return;
            }
        }
 
    } catch (err) {
        console.error("權限檢查錯誤:", err);
        if (!email.endsWith('@ccckyc.edu.hk')) {
            alert("系統連線錯誤，無法驗證權限。");
            if (btn) { btn.innerHTML = originalContent; btn.disabled = false; }
            return;
        }
    }
 
    if (isTeacher) { grade = "System"; cls = "Test"; number = "99"; alert("👋 老師您好，進入測試班。"); }
    if (isSpecialUser) { alert("👋 歡迎特許用家。"); }
 
    // --- 搜尋舊資料 ---
    let existingProfile = await findProfileByEmail(email);
    
    if (!existingProfile) {
        const inputPath = `students/${grade}/${cls}/${manualName}/profile`;
        try {
            const snap = await database.ref(inputPath).once('value');
            if (snap.exists() && snap.val().email === email) {
                existingProfile = snap.val();
                database.ref('email_mapping/' + btoa(email)).set(existingProfile);
            }
        } catch(e) {}
    }
 
    if (existingProfile) {
        const oldLocation = `${existingProfile.grade}${existingProfile.class}`;
        const newLocation = `${grade}${cls}`;
        
        if (oldLocation !== newLocation && !isTeacher && !isSpecialUser) {
            alert(`⚠️ 偵測到此電郵已註冊於【${oldLocation}班】。\n系統將登入您的原有帳號。`);
        }
        
        if ((isTeacher && (existingProfile.grade !== "System" || existingProfile.class !== "Test")) ||
            (isSpecialUser && (existingProfile.grade !== "Special" || existingProfile.class !== "User"))) {
             await bindStudentIdentity(grade, cls, number, manualName, email, user.uid);
        } else {
             localStorage.setItem('studentProfile', JSON.stringify(existingProfile));
             updateWelcomeMessage(existingProfile);
             // 登入後載入課業 (不含歷史)
             loadAssignments(existingProfile.grade, existingProfile.class);
        }
        
        sessionStorage.removeItem('sansi_temp_student_data');
        document.getElementById('studentIdentityForm').style.display = 'none';
        document.getElementById('studentCloudPanel').style.display = 'block';
        monitorPendingAssignments();
        
        // ★★★ 修改處：改為呼叫新的省流同步 ★★★
        await smartSyncHistory();
        
        startAutoSyncListener();
    } else {
        // 新用戶註冊
        await bindStudentIdentity(grade, cls, number, manualName, email, user.uid);
        sessionStorage.removeItem('sansi_temp_student_data');
        
        // ★★★ 修改處：改為呼叫新的省流同步 ★★★
        await smartSyncHistory();
        
        startAutoSyncListener();
    }
}

// === 新增：學生登出處理函式 ===
async function handleStudentLogout() {
    if (!confirm("確定要登出學生帳號嗎？\n(登出後下次需要重新輸入姓名驗證)")) {
        return;
    }

	 // ★★★ [新增] OneSignal 標籤移除 ★★★
    if (window.OneSignalDeferred) {
        window.OneSignalDeferred.push(function(OneSignal) {
            // 移除年級和班別標籤，停止接收該班通知
            OneSignal.User.removeTags(["grade", "class"]);
        });
    }
    // ★★★ [新增結束] ★★★


	 // ★★★ 新增：移除紅點監聽 ★★★
    if (pendingMonitorRef) {
        pendingMonitorRef.off();
        pendingMonitorRef = null;
    }
    const badge = document.getElementById('notifBadge');
    if(badge) badge.style.display = 'none';
    // ★★★ 新增結束 ★★★

    try {
        // 1. Firebase 登出
        await firebase.auth().signOut();
    } catch (e) {
        console.error("Firebase 登出錯誤 (可忽略):", e);
    }

    // 2. 清除本地學生資料
    localStorage.removeItem('studentProfile');
    
    // 3. 清除相關的課業緩存 (這裡使用萬用字元清除該使用者的緩存較難，暫時清除當前頁面狀態即可)
    // 若您有特定的緩存命名規則，可在這裡一併移除

    // 4. UI 界面重置
    document.getElementById('studentCloudPanel').style.display = 'none';
    document.getElementById('studentIdentityForm').style.display = 'block';
    
    // 重置按鈕狀態
    const loginBtn = document.querySelector('#studentIdentityForm button');
    if (loginBtn) {
        loginBtn.innerHTML = '<i class="fab fa-google"></i> 學校帳號登入';
        loginBtn.disabled = false;
    }

    // 重置輸入框 (選擇性)
    document.getElementById('studentNameInput').value = '';
    
    // 5. 提示訊息
    alert("已成功登出！");
}

	
// === 修正版：綁定學生資料 (已更換為 Smart Sync) ===
async function bindStudentIdentity(grade, cls, number, name, email, uid) {
    const path = `students/${grade}/${cls}/${name}/profile`;
    const emailKey = btoa(email);
    const profileData = {
        name: name, grade: grade, class: cls, number: number, email: email, uid: uid,
        last_login: new Date().toLocaleString('zh-HK'), status: 'active'
    };
    try {
        const updates = {};
        updates[path] = profileData;
        updates[`email_mapping/${emailKey}`] = profileData;
        await database.ref().update(updates);
        localStorage.setItem('studentProfile', JSON.stringify(profileData));
        if (window.OneSignalDeferred) {
            window.OneSignalDeferred.push(function(OneSignal) {
                OneSignal.User.addTags({ grade: grade, class: cls, userType: 'student' });
            });
        }
        alert(`✅ 驗證成功！\n\n歡迎你，${name}。`);
        document.getElementById('studentIdentityForm').style.display = 'none';
        document.getElementById('studentCloudPanel').style.display = 'block';
        updateWelcomeMessage(profileData);
        loadAssignments(grade, cls);
    } catch (error) {
        console.error("資料庫寫入失敗:", error);
        alert("資料庫錯誤，請重試: " + error.message);
    }
}
	
// 3. 輔助函式：完成登入 (更新本地儲存)
function finishLogin(grade, cls, number, name) {
    const profile = { grade, class: cls, number, name };
    localStorage.setItem('studentProfile', JSON.stringify(profile));
    checkStudentLogin();
    
    // 重置按鈕
    const btn = document.querySelector('#studentIdentityForm button');
    if(btn) { btn.innerHTML = '綁定身份'; btn.disabled = false; }
}


async function loadAssignments(grade, cls) {
    const listDiv = document.getElementById('assignmentList');
    
    // 1. 顯示載入中 (僅在第一次)
    if (listDiv.innerHTML.trim() === "" || listDiv.innerHTML.includes("載入中")) {
        listDiv.innerHTML = '<div style="text-align:center; padding:20px; color:#8fa398;"><i class="fas fa-circle-notch fa-spin"></i> 正在更新課業狀態...</div>';
    }
 
    try {
        const path = `assignments/${grade}/${cls}`;
        
        // 使用 .on() 進行實時監聽
        // 優點：只會在數據變更時下載 Delta，不用每次重新下載全部
        database.ref(path).on('value', (snapshot) => {
            const assignmentsData = snapshot.val();
 
            if (!assignmentsData) {
                listDiv.innerHTML = '<div style="text-align:center; padding:20px; color:#666;">目前沒有新課業</div>';
                return;
            }
 
            // 更新全域變數 (供分頁用)
            allAssignmentTasks = Object.entries(assignmentsData).sort((a, b) => b[1].timestamp - a[1].timestamp);
            
            // 重新渲染列表 (這會自動檢查 assignments_submissions 的狀態)
            // 這裡我們重置計數並重新載入第一批，確保狀態最新
            currentLoadedCount = 0;
            listDiv.innerHTML = '';
            loadNextBatchAssignments();
        });
 
    } catch (error) {
        console.error("課業載入失敗:", error);
        listDiv.innerHTML = '<div style="text-align:center; padding:20px; color:#d69a92;">連線問題，無法更新課業狀態 (但您仍可查看歷史紀錄)</div>';
    }
}
	// === 核心：分批載入詳細數據 ===
async function loadNextBatchAssignments() {
    const listDiv = document.getElementById('assignmentList');
    const s = JSON.parse(localStorage.getItem('studentProfile'));
    
    // 1. 檢查是否還有更多資料
    if (currentLoadedCount >= allAssignmentTasks.length) {
        return; 
    }

    // 2. 顯示局部 Loading (放在列表底部)
    let loadingDiv = document.createElement('div');
    loadingDiv.id = 'batchLoading';
    loadingDiv.style.cssText = "text-align:center; padding:10px; color:#aaa; font-size:0.9em;";
    loadingDiv.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> 讀取中...';
    listDiv.appendChild(loadingDiv);

    // 3. 切片：取出接下來的 5 份 (例如 0-5, 5-10)
    const nextBatch = allAssignmentTasks.slice(currentLoadedCount, currentLoadedCount + BATCH_SIZE);

    try {
        // 4. 並行查詢：只下載這 5 份的提交狀態 (HTML 內容)
        const results = await Promise.all(nextBatch.map(async ([key, task]) => {
            const subPath = `assignments_submissions/${key}/${s.name}`;
            const subSnap = await database.ref(subPath).once('value');
            const submission = subSnap.val(); 
            return { key, task, submission };
        }));

        // 移除 Loading
        if (loadingDiv) loadingDiv.remove();

        // 5. 渲染這 5 份 (傳入 true 代表 append)
        renderAssignmentList(results, false, true); // 注意：需修改 renderAssignmentList 支援 append

        // 6. 更新計數器
        currentLoadedCount += nextBatch.length;

        // 7. 檢查是否需要顯示「載入更多」按鈕
        manageLoadMoreButton();

    } catch (error) {
        console.error("分批讀取錯誤", error);
        if (loadingDiv) loadingDiv.innerHTML = "讀取失敗，請重試";
    }
}

// === 管理「載入更多」按鈕的顯示 ===
function manageLoadMoreButton() {
    const listDiv = document.getElementById('assignmentList');
    
    // 先移除舊按鈕
    const existingBtn = document.getElementById('loadMoreAssignmentsBtn');
    if (existingBtn) existingBtn.remove();

    // 如果還有剩餘資料，就加回按鈕
    if (currentLoadedCount < allAssignmentTasks.length) {
        const remaining = allAssignmentTasks.length - currentLoadedCount;
        
        const btn = document.createElement('button');
        btn.id = 'loadMoreAssignmentsBtn';
        // 使用莫蘭迪灰色系樣式
        btn.style.cssText = "width:100%; padding:10px; margin-top:10px; background:#e0e0e0; color:#555; border:none; border-radius:8px; cursor:pointer; font-weight:bold;";
        btn.innerHTML = `顯示較舊的課業 (${remaining})`;
        
        btn.onclick = function() {
            this.disabled = true; // 防止連點
            loadNextBatchAssignments();
        };

        listDiv.appendChild(btn);
    }
}

	
// === 輔助函數：渲染列表 HTML (防重複顯示修復版) ===
// 參數: dataArray (資料陣列), isSyncing (同步中?), isAppend (是否附加)
function renderAssignmentList(dataArray, isSyncing, isAppend = false) {
    const listDiv = document.getElementById('assignmentList');
    
    // 如果不是 Append 模式，才清空列表
    if (!isAppend) {
        listDiv.innerHTML = '';
    }

    // 莫蘭迪色系
    const morandiPalette = ['#8fa398', '#94a7b5', '#b6a6ca', '#d69a92', '#c7b299'];

    if (isSyncing) {
        // 如果是同步中，且列表是空的，才顯示 ...
        if (listDiv.children.length === 0) {
            listDiv.innerHTML += `<div>...</div>`;
        }
        return;
    }

    dataArray.forEach((item, index) => {
        const key = item.key; // 獲取課業的唯一 ID (Firebase Key)
        
        // ★★★ [核心修復] 防重複檢查 ★★★
        // 如果畫面上已經有這個 ID 的卡片，直接跳過，不重複渲染
        if (document.getElementById(`task-card-${key}`)) {
            return;
        }

        const task = item.task;
        const submission = item.submission;
        
        // 為了視覺美觀，使用隨機或輪替顏色
        const themeColor = morandiPalette[index % morandiPalette.length];

        let uiClass = '';
        let statusIcon = '';
        let statusText = '';
        let clickHandler = null; 
        let dateDisplay = new Date(task.timestamp).toLocaleDateString('zh-HK', {month:'2-digit', day:'2-digit'});

        if (submission && submission.teacherFeedback && submission.teacherFeedback.status === 'returned') {
            uiClass = 'status-returned';
            statusIcon = '<i class="fas fa-envelope-open-text"></i>';
            statusText = '查看評語';
            submission.topic = task.topic; 
            const submissionStr = encodeURIComponent(JSON.stringify(submission));
            clickHandler = function() { showTeacherFeedback(submissionStr); };
        }
        else if (submission) {
            uiClass = 'status-submitted';
            statusIcon = '<i class="fas fa-check-circle" style="color:#5e7067;"></i>';
            statusText = '<span style="color:#5e7067;">已繳交</span>';
            submission.topic = task.topic;
            submission.isPending = true; 
            const submissionStr = encodeURIComponent(JSON.stringify(submission));
            clickHandler = function() { showTeacherFeedback(submissionStr); };
        }
        else {
            uiClass = 'status-pending';
            statusIcon = '<i class="fas fa-pen"></i>'; 
            statusText = '未繳交';
            clickHandler = function() { goToHistoryForAssignment(task.topic); };
        }

        // 建立 DOM 元素
        const cardDiv = document.createElement('div');
        
        // ★★★ [核心修復] 設定唯一 ID ★★★
        // 這樣上面的 if 檢查才能生效
        cardDiv.id = `task-card-${key}`; 
        
        cardDiv.className = `task-card ${uiClass}`;
        cardDiv.onclick = clickHandler; 
        
        cardDiv.style.setProperty('--theme-color', themeColor);
        cardDiv.innerHTML = `
            <div class="task-info">
               <div class="task-topic" style="color: ${themeColor};">${task.topic}</div>
                <div class="task-meta">
                    <span class="task-type-tag" style="background-color: ${themeColor}; color: white; border:none;">${task.type}</span>
                    <span><i class="far fa-clock"></i> ${dateDisplay}</span>
                </div>
            </div>
            <div class="task-status">
                ${statusIcon} <span style="margin-left:5px;">${statusText}</span>
            </div>
        `;
        
        listDiv.appendChild(cardDiv);
    });
}

	
	// === 新增：從未繳交課業跳轉至歷史紀錄 ===
// === 新增：從未繳交課業跳轉至歷史紀錄 (無提示版) ===
function goToHistoryForAssignment(topic) {
    // 1. 關閉「學生雲端中心」彈窗
    document.getElementById('studentCloudModal').style.display = 'none';
    
    // 2. 打開「歷史紀錄」容器 (這會自動顯示第一層的五個範疇卡片)
    openHistoryContainer();
    
    // 3. 滾動到頁面頂部
    window.scrollTo({ top: 0, behavior: 'instant' });
}
// === 顯示老師回饋 (彈窗) ===
// === 最終修訂版：顯示老師回饋 (隱藏右上角日期 + 大地色系) ===
function showTeacherFeedback(submissionStr) {
    let record;
    try {
        record = JSON.parse(decodeURIComponent(submissionStr));
    } catch (e) {
        console.error("解析失敗", e);
        return alert("資料讀取錯誤");
    }

    const feedback = record.teacherFeedback || {};
    const isPending = record.isPending === true;

    // 1. 決定主題顏色
    let themeIndex = 1;
    if (record.category && HISTORY_STRUCTURE[record.category]) {
        const subIndex = HISTORY_STRUCTURE[record.category].indexOf(record.subFunction);
        if (subIndex !== -1) {
            themeIndex = (subIndex % 5) + 1;
        }
    }
    const themeClass = `history-theme-context-${themeIndex}`;

    // 2. 構建「老師回饋」區塊
    let teacherFeedbackHTML = '';
    
    if (isPending) {
        // 待批改
        teacherFeedbackHTML = `
            <div style="background:#f4f8f6; border:2px dashed #8fa398; border-radius:12px; padding:20px; text-align:center;">
                <h3 style="color:#5e7067; margin-top:0;"><i class="fas fa-check-circle"></i> 作業已繳交</h3>
                <p style="color:#666; margin-bottom:5px;">老師尚未批改這份作業。</p>
                <small style="color:#999;">繳交日期：${record.submittedAt ? record.submittedAt.split(' ')[0] : '未知'}</small>
            </div>
        `;
    } else {
        // 已發還
        const scoreDisplay = feedback.score ? `<div class="teacher-score-badge">${feedback.score}</div>` : '';
        const dateObj = feedback.timestamp ? new Date(feedback.timestamp) : null;
        const dateStr = dateObj ? dateObj.toLocaleDateString('zh-HK') : '未知';
        const commentText = feedback.comment ? feedback.comment.trim() : "（沒有文字評語）";

        teacherFeedbackHTML = `
            <div class="teacher-feedback-section">
                <div class="teacher-feedback-header">
                    <div class="teacher-feedback-title">
                        <i class="fas fa-chalkboard-teacher"></i> 老師回饋
                    </div>
                    ${scoreDisplay}
                </div>
                <div class="teacher-comment-content">${commentText}</div>
                
                <div style="text-align:right; margin-top:15px; font-size:0.85em; color:#a1887f;">
                    <i class="far fa-calendar-alt"></i> 批改日期：${dateStr}
                </div>
            </div>
        `;
    }

    // 3. 構建整體內容 HTML
    let contentHTML = teacherFeedbackHTML;

    // 如果有學生內容，加入分隔線
    if (record.userContent || record.aiContent) {
        contentHTML += `<div class="feedback-separator"></div>`;
    }

    // 4. 構建「學生原稿」區塊
    if (record.userContent) {
        const rawText = record.userContent;
        const lines = rawText.split('\n');
        let parsedHTML = `<div class="history-parsed-container ${themeClass}">`;
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
        
        contentHTML += `<div style="background:#fff; padding:20px; border-radius:12px; margin-bottom:25px; border:1px solid #eee; box-shadow: 0 4px 20px rgba(0,0,0,0.04);">
                            ${parsedHTML}
                        </div>`;
    }

    // 加入 AI 分析結果 (這裡通常包含 HTML 結構，但不包含活的 Canvas)
    if (record.aiContent) {
        contentHTML += `<div class="ai-output-area" style="margin-top: 15px;">${record.aiContent}</div>`;
    }

    // 5. 顯示 Modal
    const historyModal = document.getElementById('historyModal');
    const modalTitle = document.getElementById('historyModalTitle');
    const modalContent = document.getElementById('historyModalContent');
    const modalDate = document.getElementById('historyModalDate');

    modalTitle.innerHTML = `<span style="color:#2A9689; font-weight:bold;">${record.topic || "課業紀錄"}</span>`;
    
    if (modalDate) {
        modalDate.style.display = 'none'; 
    }

    modalContent.innerHTML = contentHTML;
    historyModal.style.display = 'flex';

    // 6. ★★★ [核心修復] 雷達圖重繪邏輯 ★★★
    // 使用 setTimeout 確保 DOM 渲染完成後再繪圖
    setTimeout(() => {
        // 檢查是否有分數數據
        if (record.scoreData && record.scoreData.radar) {
            
            // A. 嘗試在 AI 輸出區域尋找現有的 Canvas
            let canvasEl = modalContent.querySelector('canvas');

            // B. 如果找不到 (例如舊資料的 aiContent 裡沒有 Canvas 標籤)，則動態建立一個
            if (!canvasEl) {
                const aiOutputArea = modalContent.querySelector('.ai-output-area');
                if (aiOutputArea) {
                    // 建立圖表容器
                    const chartWrapper = document.createElement('div');
                    chartWrapper.style.width = '100%';
                    chartWrapper.style.maxWidth = '500px';
                    chartWrapper.style.height = '350px';
                    chartWrapper.style.margin = '20px auto';
                    chartWrapper.style.position = 'relative';
                    
                    // 建立 Canvas
                    const newCanvas = document.createElement('canvas');
                    chartWrapper.appendChild(newCanvas);
                    
                    // 將圖表插入到 AI 內容的最上方
                    aiOutputArea.insertBefore(chartWrapper, aiOutputArea.firstChild);
                    
                    canvasEl = newCanvas;
                }
            }

            // C. 執行 Chart.js 繪圖
            if (canvasEl) {
                const radarData = [
                    record.scoreData.radar.立意 || 0,
                    record.scoreData.radar.取材 || 0,
                    record.scoreData.radar.扣題 || 0,
                    record.scoreData.radar.詳略 || 0,
                    record.scoreData.radar.詞彙 || 0,
                    record.scoreData.radar.文學性 || 0
                ];

                new Chart(canvasEl.getContext('2d'), {
                    type: 'radar',
                    data: {
                        labels: ['立意', '取材', '扣題', '詳略', '詞彙', '文學性'],
                        datasets: [{
                            label: '能力評估',
                            data: radarData,
                            backgroundColor: 'rgba(54, 162, 235, 0.2)',
                            borderColor: 'rgba(54, 162, 235, 1)',
                            borderWidth: 2,
                            pointBackgroundColor: 'rgba(54, 162, 235, 1)',
                            pointBorderColor: '#fff'
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false, // 關鍵：允許填滿高度
                        scales: {
                            r: {
                                angleLines: { display: true },
                                suggestedMin: 0,
                                suggestedMax: 10,
                                pointLabels: {
                                    font: { size: 14, family: "'Noto Serif TC', serif" }
                                },
                                ticks: { stepSize: 2, display: false }
                            }
                        },
                        plugins: {
                            legend: { display: false }
                        }
                    }
                });
            }
        }
    }, 100); // 延遲 100ms 確保 HTML 已注入
}
// === 執行未繳交課業動作 (簡化版) ===
function doAssignment(type, topic) {
    document.getElementById('studentCloudModal').style.display = 'none';
    
    // 跳轉邏輯 (與之前相同)
    if (type === '敘事' || type === '敘事抒情') {
        document.getElementById('writingBtn').click();
        setTimeout(() => {
            const select = document.getElementById('writingType');
            if (select) { select.value = '片段描寫'; toggleWritingType(); }
            const btn = document.querySelector('#topicSelectionArea .btn-custom');
            if(btn) btn.click();
            const titleInput = document.getElementById('customTitle') || document.getElementById('customTopic');
            if (titleInput) {
                titleInput.value = topic;
                titleInput.focus();
                alert(`題目「${topic}」已準備就緒，請開始寫作。`);
            }
        }, 800);
    } else if (type === '議論') {
        document.getElementById('argumentBtn').click();
        setTimeout(() => {
            const select = document.getElementById('argumentType');
            if (select) { select.value = 'writing'; toggleArgumentType(); }
            const btn = document.querySelector('#argumentTopicSelectionArea .btn-custom');
            if(btn) btn.click();
            const titleInput = document.getElementById('argumentCustomTopic');
            if (titleInput) {
                titleInput.value = topic;
                setArgumentCustomTopic();
                alert(`題目「${topic}」已鎖定。`);
            }
        }, 800);
    }
    // 可繼續擴充其他類型...
}

// === 核心：同步 IndexedDB 到 Firebase ===



// 1. 打開選擇視窗，列出該班級的有效作業
// === 繳交邏輯 1: 打開選擇視窗 ===
function openSubmitSelector(recordId) {
    const s = JSON.parse(localStorage.getItem('studentProfile'));
    if (!s) return alert("請先在「雲端同步」中綁定身份！");

    // 將紀錄 ID 存入隱藏欄位，稍後繳交時使用
    document.getElementById('pendingRecordId').value = recordId;
    document.getElementById('submitAssignmentModal').style.display = 'flex';
    
    const listDiv = document.getElementById('activeAssignmentList');
    listDiv.innerHTML = '<div style="text-align:center; padding: 20px;"><i class="fas fa-spinner fa-spin"></i> 正在讀取老師的課業列表...</div>';

    // 從 Firebase 讀取該班級的作業
    database.ref(`assignments/${s.grade}/${s.class}`).once('value', (snapshot) => {
        const data = snapshot.val();
        listDiv.innerHTML = '';

        if (!data) {
            listDiv.innerHTML = '<p style="color:#999; text-align:center;">目前老師沒有派發任何課業。</p>';
            return;
        }

        const keys = Object.keys(data).reverse(); // 新的在上面
        
        keys.forEach(key => {
            const task = data[key];
            const item = document.createElement('div');
            item.style.cssText = "padding: 15px; margin-bottom: 10px; background: #fff; border: 2px solid #eee; border-radius: 10px; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: space-between;";
            
            item.innerHTML = `
                <div>
                    <div style="font-weight:bold; color:#333; font-size: 1.1rem; margin-bottom: 5px;">${task.topic}</div>
                    <div style="font-size:0.85em; color:#666;">
                        <span style="background:#e0f7fa; color:#006064; padding:2px 8px; border-radius:4px; font-weight:bold;">${task.type}</span>
                        ${new Date(task.timestamp).toLocaleDateString()}
                    </div>
                </div>
                <div style="color: #2A9689; font-size: 1.2rem;"><i class="fas fa-upload"></i></div>
            `;
            
            // 滑鼠效果
            item.onmouseover = function() { 
                this.style.borderColor = "#2A9689"; 
                this.style.background = "#f0fdfc"; 
                this.style.transform = "translateY(-2px)";
            };
            item.onmouseout = function() { 
                this.style.borderColor = "#eee"; 
                this.style.background = "#fff"; 
                this.style.transform = "translateY(0)";
            };
            
            // 點擊即繳交
            item.onclick = function() { confirmAndSubmitAssignment(key, task.topic); };
            
            listDiv.appendChild(item);
        });
    });
}

// ==========================================
// === 最終修復：繳交課業 + 刷新背景列表 ===
// ==========================================
 
async function confirmAndSubmitAssignment(assignmentId, assignmentTopic) {
    // 確保 ID 是整數
    const recordId = parseInt(document.getElementById('pendingRecordId').value);
    const s = JSON.parse(localStorage.getItem('studentProfile'));
 
    if (!confirm(`確定要將這份紀錄繳交為「${assignmentTopic}」嗎？\n(注意：這將會覆蓋你之前對此功課的繳交內容)`)) return;
 
    try {
        const db = await openHistoryDB();
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(recordId);
 
        request.onsuccess = function(e) {
            const record = e.target.result;
            
            if (!record) return alert("錯誤：找不到原始紀錄 (ID: " + recordId + ")，請重新打開紀錄。");
 
            // 上傳路徑
            const submitPath = `assignments_submissions/${assignmentId}/${s.name}`;
            
            // 顯示載入中
            const modalBody = document.getElementById('activeAssignmentList');
            modalBody.innerHTML = '<div style="text-align:center; color:#2A9689; padding:20px;"><i class="fas fa-circle-notch fa-spin fa-2x"></i><br><br>正在呈交給老師...</div>';
 
            database.ref(submitPath).set({
                ...record, // 包含修訂後的 userContent 和 aiContent
                submittedAt: new Date().toLocaleString('zh-HK'),
                studentName: s.name,
                studentClass: s.class,
                studentGrade: s.grade
            }, async (error) => {
                if (error) {
                    alert("繳交失敗：" + error.message);
                    document.getElementById('submitAssignmentModal').style.display = 'none';
                } else {
                    alert(`🎉 繳交成功！\n\n已成功將此紀錄呈交為「${assignmentTopic}」。`);
                    document.getElementById('submitAssignmentModal').style.display = 'none';
                    
                    // 1. 執行同步 (這會導致 ID 變更)
                    await syncHistoryToFirebase(true);
 
                    // 2. ★★★ 關鍵新增：刷新背景列表 ★★★
                    // 這樣卡片的 ID 才會更新，您關閉視窗後點擊卡片才不會報錯
                    if (typeof currentSubFunctionFilter !== 'undefined' &&
                        document.getElementById('historyLevel3').style.display !== 'none') {
                        
                        const themeIndex = typeof currentThemeIndex !== 'undefined' ? currentThemeIndex : 1;
                        
                        // 靜默刷新列表
                        enterHistoryList(currentSubFunctionFilter, themeIndex);
                    }
                }
            });
        };
    } catch (err) {
        console.error(err);
        alert("系統錯誤，無法讀取紀錄。");
    }
}


// ==========================================
// === 學習報告選單邏輯 (新增) ===
// ==========================================

function openReportMenu() {
    document.getElementById('reportMenuModal').style.display = 'flex';
}

function closeReportMenu(event) {
    // 點擊背景才關閉，點擊內容不關閉
    if (event.target.id === 'reportMenuModal') {
        document.getElementById('reportMenuModal').style.display = 'none';
    }
}

function viewPastReports() {
    // 1. 關閉選單
    document.getElementById('reportMenuModal').style.display = 'none';
    
    // 2. 直接導航到「學習報告」範疇 -> 「綜合分析」列表
    // 假設我們在 HISTORY_STRUCTURE 定義了 "學習報告"
    // 傳入 5 代表使用第 5 種主題色 (奶茶棕)
    enterHistoryCategory('學習報告'); 
    setTimeout(() => {
        enterHistoryList('綜合分析', 5);
    }, 100);
}

// ==========================================
// === 全新功能：生成智能學習報告 (V7 - 數據化存檔版) ===
// ==========================================

async function generateHistoryReport() {
    // 關閉選單
    document.getElementById('reportMenuModal').style.display = 'none';

    const btn = document.querySelector('button[title="學習報告"]');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    }

    console.log("1. 開始生成深度報告...");

    try {
        const db = await openHistoryDB();
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = async function(event) {
            const records = event.target.result;

            if (!records || records.length === 0) {
                alert("目前沒有足夠的歷史紀錄來生成報告，請先多做練習！");
                if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-chart-pie"></i>'; }
                return;
            }

            // === 1. 數據聚合 ===
            const stats = {
                "敘事抒情": { count: 0, scores: { content: 0, expression: 0, structure: 0 }, radar: { 立意: 0, 取材: 0, 扣題: 0, 詳略: 0, 詞彙: 0, 文學性: 0 }, snippets: [] },
                "議論": { count: 0, scores: { content: 0, expression: 0, structure: 0 }, radar: { 立意: 0, 取材: 0, 扣題: 0, 詳略: 0, 詞彙: 0, 文學性: 0 }, snippets: [] },
                "閱讀": { snippets: [] },
                "整合拓展": { snippets: [] }
            };

            const parser = new DOMParser();

            records.forEach(r => {
                if (!r.aiContent) return;
                // 提取摘要
                const cleanText = r.aiContent.replace(/<[^>]*>?/gm, ' ');
                let snippet = "";
                const critiqueIndex = cleanText.indexOf("點評");
                const suggestionIndex = cleanText.indexOf("建議");
                if (critiqueIndex !== -1) snippet += "[評]" + cleanText.substring(critiqueIndex + 3, critiqueIndex + 60).trim();
                if (suggestionIndex !== -1) snippet += " [議]" + cleanText.substring(suggestionIndex + 3, suggestionIndex + 60).trim();
                const summary = `日期:${r.dateStr}|題目:${r.title}|${snippet}`;
                if (stats[r.category]) {
                    stats[r.category].snippets.push(summary);
                }

                // 提取分數 (針對敘事和議論)
                if (r.category === "敘事抒情" || r.category === "議論") {
                    try {
                        // 優先使用結構化存儲的 scoreData
                        if (r.scoreData) {
                            stats[r.category].count++;
                            const c = r.scoreData.content || 0;
                            const e = r.scoreData.expression || 0;
                            const s = r.scoreData.structure || 0;
                            stats[r.category].scores.content += c;
                            stats[r.category].scores.expression += e;
                            stats[r.category].scores.structure += s;
                            
                            if (r.scoreData.radar) {
                                stats[r.category].radar.立意 += (r.scoreData.radar.立意 || 0);
                                stats[r.category].radar.取材 += (r.scoreData.radar.取材 || 0);
                                stats[r.category].radar.扣題 += (r.scoreData.radar.扣題 || 0);
                                stats[r.category].radar.詳略 += (r.scoreData.radar.詳略 || 0);
                                stats[r.category].radar.詞彙 += (r.scoreData.radar.詞彙 || 0);
                                stats[r.category].radar.文學性 += (r.scoreData.radar.文學性 || 0);
                            }
                        } else {
                            // 舊數據回退機制：嘗試從 HTML 解析 input value
                            const doc = parser.parseFromString(r.aiContent, 'text/html');
                            const contentInput = doc.querySelector('input[id*="ContentScore"]');
                            if (contentInput) {
                                stats[r.category].count++;
                                const c = parseInt(contentInput.value || 5);
                                const e = parseInt(doc.querySelector('input[id*="ExpressionScore"]')?.value || 5);
                                const s = parseInt(doc.querySelector('input[id*="StructureScore"]')?.value || 5);
                                stats[r.category].scores.content += c;
                                stats[r.category].scores.expression += e;
                                stats[r.category].scores.structure += s;
                                // 舊數據估算雷達
                                stats[r.category].radar.立意 += (c * 0.6 + s * 0.4);
                                stats[r.category].radar.取材 += (c * 0.8 + e * 0.2);
                                stats[r.category].radar.扣題 += (c * 0.7 + s * 0.3);
                                stats[r.category].radar.詳略 += (s * 0.7 + c * 0.3);
                                stats[r.category].radar.詞彙 += e;
                                stats[r.category].radar.文學性 += e;
                            }
                        }
                    } catch (e) { console.error("Parse Error", e); }
                }
            });

            // === 2. 計算平均值 & 綜合等級 ===
            const finalStats = {};
            let globalTotalScore = 0;
            let globalCount = 0;

            ["敘事抒情", "議論"].forEach(cat => {
                const s = stats[cat];
                if (s.count > 0) {
                    finalStats[cat] = {
                        content: Math.round(s.scores.content / s.count),
                        expression: Math.round(s.scores.expression / s.count),
                        structure: Math.round(s.scores.structure / s.count),
                        radar: [
                            parseFloat((s.radar.立意 / s.count).toFixed(1)),
                            parseFloat((s.radar.取材 / s.count).toFixed(1)),
                            parseFloat((s.radar.扣題 / s.count).toFixed(1)),
                            parseFloat((s.radar.詳略 / s.count).toFixed(1)),
                            parseFloat((s.radar.詞彙 / s.count).toFixed(1)),
                            parseFloat((s.radar.文學性 / s.count).toFixed(1))
                        ]
                    };
                    const totalScore = (finalStats[cat].content * 4) + (finalStats[cat].expression * 3) + (finalStats[cat].structure * 2) + 8; // +5+3
                    finalStats[cat].total = Math.min(totalScore, 100);
                    finalStats[cat].level = determineGrade(finalStats[cat].total);
                    globalTotalScore += finalStats[cat].total * s.count;
                    globalCount += s.count;
                }
            });

            let overallLevel = "待定";
            if (globalCount > 0) {
                const avgGlobalScore = globalTotalScore / globalCount;
                overallLevel = determineGrade(avgGlobalScore);
            }

            // === 3. 構建 Prompt ===
            let promptData = "";
            let hasData = false;
            for (const [cat, data] of Object.entries(stats)) {
                if (data.snippets.length > 0) {
                    hasData = true;
                    promptData += `\n【${cat}】(最近紀錄):\n${data.snippets.slice(-5).join('\n')}\n`;
                }
            }

            if (!hasData) {
                alert("找不到有效的文字紀錄。");
                if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-chart-pie"></i>'; }
                return;
            }

            showLoading("陳SIR 正在生成學習報告...");

            const prompt = `你現在扮演一位資深的中文科老師「陳SIR」。請根據學生以下的歷史紀錄，生成一份「學習概況報告」。

### 學生歷史紀錄摘要：
${promptData}

### 你的任務：
綜合分析數據。**不要使用列點**，直接用流暢、溫暖、專業的段落文字分析。

### 輸出格式要求 (嚴格遵守 HTML)：
請直接輸出以下 HTML，不要用 Markdown。

1. **整體評語** (注意：請將綜合評級 ${overallLevel} 填入下方指定位置)：
   <div class="report-section">
       <div class="report-category-badge badge-general">
           <div class="badge-general-title"><i class="fas fa-user-graduate"></i> 整體學習概況</div>
           <div class="overall-grade-tag">
               <span class="overall-grade-label">綜合評級</span>
               <span>${overallLevel}</span>
           </div>
       </div>
       <div class="report-text-card">
           <p>(約100字整體鼓勵性評語，請提及學生目前的綜合水平 ${overallLevel})</p>
       </div>
   </div>
   
   <div class="report-separator"></div>

2. **分範疇分析**：(針對有數據的範疇)
   <div class="report-section">
       <div class="report-category-badge badge-[narrative/argument/reading/expand]"><i class="fas fa-book"></i> [範疇名稱]</div>
       <div class="report-text-card">
           <p>(詳細分析該範疇的強項與弱項)</p>
       </div>
   </div>
   *badge class: badge-narrative, badge-argument, badge-reading, badge-expand*

3. **陳SIR寄語**：
   <div class="report-quote-card">
       <div class="report-quote-content">「(金句內容)」</div>
       <div class="report-quote-author">—— 陳SIR</div>
   </div>`;

            const reportHTML = await callReadingAPI(prompt);

            // === 4. 組合與渲染 ===
            openResultCanvas("學習歷程報告");
            const resultBody = document.getElementById("resultCanvasBody");
            const today = new Date().toLocaleDateString('zh-HK');
            let finalOutput = `<div style="text-align:right; margin-bottom:20px; color:#aaa; font-size:0.9em;">報告日期：${today}</div>`;

            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = reportHTML;

            // 插入圖表結構
            ["敘事抒情", "議論"].forEach(cat => {
                const badgeClass = cat === "敘事抒情" ? ".badge-narrative" : ".badge-argument";
                const aiHeader = tempDiv.querySelector(badgeClass);
                
                if (finalStats[cat] && aiHeader) {
                    const sectionDiv = aiHeader.closest('.report-section');
                    const textCard = sectionDiv.querySelector('.report-text-card');
                    const aiText = textCard ? textCard.innerHTML : "";
                    const uniqueId = cat === "敘事抒情" ? "reportNarrative" : "reportArgument";

                    const chartHTML = `
                    <div class="report-section">
                        ${aiHeader.outerHTML}
                        <div class="report-radar-wrapper">
                            <div class="grading-container" style="margin:0; border:none; padding:0;">
                                <div class="grading-grid">
                                    <div class="grading-scores" style="padding:15px;">
                                        <h3>綜合能力評估 (平均)</h3>
                                        <div class="score-item"><label>內容 (40)</label><div class="slider-container"><div class="progress-bar-container"><div style="width:${finalStats[cat].content * 10}%" class="progress-bar-fill"></div></div><span class="score-display">${finalStats[cat].content * 4}</span></div></div>
                                        <div class="score-item"><label>表達 (30)</label><div class="slider-container"><div class="progress-bar-container"><div style="width:${finalStats[cat].expression * 10}%" class="progress-bar-fill"></div></div><span class="score-display">${finalStats[cat].expression * 3}</span></div></div>
                                        <div class="score-item"><label>結構 (20)</label><div class="slider-container"><div class="progress-bar-container"><div style="width:${finalStats[cat].structure * 10}%" class="progress-bar-fill"></div></div><span class="score-display">${finalStats[cat].structure * 2}</span></div></div>
                                        <div class="score-item"><label>標點字體 (10)</label><div class="slider-container"><div class="progress-bar-container"><div style="width:50%" class="progress-bar-fill"></div></div><span class="score-display">5</span></div></div>
                                        <div class="score-item"><label>錯別字 (+3)</label><div class="slider-container"><div class="progress-bar-container"><div style="width:100%" class="progress-bar-fill"></div></div><span class="score-display">3</span></div></div>
                                        <div class="total-score-container">
                                            <span style="font-size:1.1em; color:#555;">平均總分: ${finalStats[cat].total} / 100</span>
                                            <span style="font-size:2em; font-weight:bold; color:#d9534f; margin-left:auto;">${finalStats[cat].level}</span>
                                        </div>
                                    </div>
                                    <div class="grading-radar" style="padding:15px;">
                                        <h3>能力分佈</h3>
                                        <!-- 注意：這裡的 canvas 是空的，需要JS繪製 -->
                                        <div class="radar-chart-container" style="height:250px;">
                                            <canvas id="${uniqueId}Chart"></canvas>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="report-text-card">
                            ${aiText}
                        </div>
                    </div>`;
                    sectionDiv.outerHTML = chartHTML;
                }
            });

            resultBody.innerHTML = finalOutput + tempDiv.innerHTML;

            // === 5. 渲染當前畫面的圖表並存檔 ===
            setTimeout(() => {
                // A. 渲染當前使用者看到的畫面
                ["敘事抒情", "議論"].forEach(cat => {
                    if (finalStats[cat]) {
                        const uniqueId = cat === "敘事抒情" ? "reportNarrative" : "reportArgument";
                        const ctxEl = document.getElementById(`${uniqueId}Chart`);
                        if (ctxEl) {
                            renderReportRadarChart(ctxEl, finalStats[cat].radar);
                        }
                    }
                });

                // B. 存檔：這裡最重要！
                // 我們使用 captureContainerHTML 儲存 HTML 結構
                // 並且將 finalStats 作為最後一個參數傳入 saveToHistory
                setTimeout(() => {
                    const htmlToSave = captureContainerHTML('resultCanvasBody');
                    saveToHistory(
                        "學習報告", 
                        "綜合分析", 
                        `學習報告 (${today})`, 
                        `系統自動生成之學習歷程分析。\n綜合評級：${overallLevel}`, 
                        htmlToSave,
                        finalStats // ★★★ 關鍵：這將成為 record.scoreData ★★★
                    );
                    console.log("報告已自動存檔並同步 (含統計數據)。");
                }, 500);

            }, 100);

            hideAllSaveHtmlButtons();
            
            // 強制顯示
            const canvas = document.getElementById("resultCanvas");
            const loadingOverlay = document.getElementById("loadingOverlay");
            if (loadingOverlay) loadingOverlay.style.display = 'none';
            if (canvas) {
                canvas.style.display = 'block';
                canvas.style.zIndex = '99999';
                document.body.style.overflow = 'hidden';
            }

        };

        request.onerror = function(e) { console.error("DB Error:", e); alert("讀取失敗"); hideLoading(); };

    } catch (error) {
        console.error("Report Error:", error);
        alert("生成失敗：" + error.message);
        hideLoading();
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-chart-pie"></i>'; }
    }
}
	
	
</script>

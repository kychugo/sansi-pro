/**
 * Writing Mode Functions
 * 
 * This module contains all writing-mode related JavaScript functions
 * extracted from index2.html for the 陳SIR writing tutoring system.
 * 
 * Functions:
 * - toggleWritingType: Switch between different writing modes (guide, outline, narrative, fragment)
 * - continueWritingGuideDiscussion: Handle follow-up chat for writing guide
 * - submitWritingGuide: Generate writing guide with topic analysis and story seeds
 * - submitWriting: Submit writing for grading (outline, narrative elements, or full text)
 * - continueWritingDiscussion: Handle follow-up chat for writing review
 */

// ==========================================
// === Toggle Writing Type ===
// ==========================================
/**
 * Switch between different writing modes and adjust UI accordingly
 * Modes: "guide" (解題指引), "大綱" (outline), "敘事物象" (narrative elements), "片段描寫" (fragment writing)
 */
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

// ==========================================
// === Continue Writing Guide Discussion ===
// ==========================================
/**
 * Handle follow-up questions in writing guide chat interface
 * Maintains conversation history and displays AI responses
 */
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

        // ★★★ 強制替換引號 (將 "" 或 "" 轉為 「」) ★★★
        aiResponse = aiResponse.replace(/[""](.*?)[""]/g, '「$1」');

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
// === Submit Writing Guide ===
// ==========================================
/**
 * Generate writing guide with topic analysis and story seeds
 * Includes chat interface for follow-up questions
 */
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
// === Submit Writing (Main Submission) ===
// ==========================================
/**
 * Main submission function for writing modes
 * Handles: outline grading, narrative elements generation, and full text review
 */
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

// ==========================================
// === Continue Writing Discussion ===
// ==========================================
/**
 * Handle follow-up questions after writing review
 * Maintains conversation context with original article and review
 */
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

        // ★★★ 強制替換引號 (將 "" 或 "" 轉為 「」) ★★★
        aiResponse = aiResponse.replace(/[""](.*?)[""]/g, '「$1」');

        aiMessageBubble.innerHTML = aiResponse.replace(/\n/g, '<br>');
        await updateHistoryChat();
    } catch (error) {
        aiMessageBubble.textContent = "抱歉，回應失敗。";
    } finally {
        continueBtn.disabled = false;
    }
}

// ==========================================
// === Helper Function: Display Outline Comment ===
// ==========================================
/**
 * Display outline grading results in structured table format
 * Parses AI response and generates HTML tables for comments, rewrites, and explanations
 */
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

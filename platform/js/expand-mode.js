/**
 * Expand Mode Functions
 * 
 * This module contains all expand-mode related JavaScript functions
 * extracted from index2.html for the 陳SIR writing tutoring system.
 * 
 * Functions:
 * - toggleExpandFunction: Switch between expand modes (comment/guide)
 * - showExpandCustomTopicInput: Display custom topic input interface
 * - generateExpandTopic: Generate expand topic using AI
 * - setExpandCustomTopic: Confirm and set custom topic
 * - updateCharCount: Update character count for expand content
 * - submitExpand: Main submit function that routes to comment or guide
 * - submitExpandComment: Submit expand content for AI commentary
 * - submitExpandGuide: Submit expand content for AI guidance questions
 */

// ==========================================
// === Toggle Expand Function ===
// ==========================================
/**
 * Switch between expand modes (comment vs guide) and adjust UI accordingly
 * Modes: "comment" (點評), "guide" (指引)
 */
function toggleExpandFunction() {
    hideAllSaveHtmlButtons();
    clearAllTopicStates();

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

    // Show/hide areas based on selected function
    if (expandFunction === "comment") {
        expandWritingArea.style.display = "block";
        expandGuideArea.style.display = "none";
        expandTopicSelectionArea.style.display = "block";
        expandToneLabel.style.display = "block";
        expandTone.style.display = "block";

        // Ensure custom topic input area is hidden by default
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

// ==========================================
// === Show Custom Topic Input ===
// ==========================================
/**
 * Display custom topic input interface with toggle functionality
 * If button is already active, hide and clear the input area
 * @param {HTMLElement} buttonElement - The clicked button element
 */
function showExpandCustomTopicInput(buttonElement) {
    // Toggle logic: if already active, close it
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

    // Normal open logic
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

    // Generate custom topic input form
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

// ==========================================
// === Generate Expand Topic ===
// ==========================================
/**
 * Generate an expand topic using AI (theme sentence and data)
 * @param {HTMLElement} buttonElement - The clicked button element
 */
async function generateExpandTopic(buttonElement) {
    if (buttonElement) {
        updateButtonActiveState(buttonElement);
    }

    // Hide custom topic input area
    const customTopicArea = document.getElementById("expandCustomTopicInputArea");
    customTopicArea.style.display = "none";
    customTopicArea.innerHTML = "";

    const topicResult = document.getElementById("expandTopicResult");
    
    topicResult.innerHTML = "陳SIR正在出題...";
    topicResult.style.display = 'block';

    try {
        // Build payload for API call
        const payload = {
            action: "grade_expand",
            data: {
                subType: "topic_generation" 
            }
        };
        
        const topic = await callAPI(payload);
        
        // Parse AI response
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
        // Clear any existing custom title
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

// ==========================================
// === Set Custom Topic ===
// ==========================================
/**
 * Confirm and set custom expand topic (title, theme, data)
 */
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

    // Hide and clear input area after confirmation
    const customTopicArea = document.getElementById("expandCustomTopicInputArea");
    customTopicArea.style.display = 'none';
    customTopicArea.innerHTML = '';
}

// ==========================================
// === Update Character Count ===
// ==========================================
/**
 * Update character count display for expand content (max 180 chars)
 */
function updateCharCount() {
    const content = document.getElementById("expandContent").value;
    const remaining = 180 - content.length;
    document.getElementById("charCount").textContent = `剩餘字數：${remaining >= 0 ? remaining : 0}`;
    if (remaining < 0) {
        document.getElementById("expandContent").value = content.substring(0, 180);
    }
}

// ==========================================
// === Submit Expand (Router) ===
// ==========================================
/**
 * Main submit function that routes to either comment or guide based on selected mode
 */
async function submitExpand() {
    const expandFunction = document.getElementById("expandFunction").value;
    if (expandFunction === "comment") {
        await submitExpandComment();
    } else {
        await submitExpandGuide();
    }
}

// ==========================================
// === Submit Expand Comment ===
// ==========================================
/**
 * Submit expand content for AI commentary/review
 */
async function submitExpandComment() {
    const submitBtn = document.getElementById('submitExpandBtn');
    submitBtn.disabled = true;
    hideAllSaveHtmlButtons();

    try {
        const title = localStorage.getItem("expandCurrentTitle");
        const theme = localStorage.getItem("expandCurrentTheme");
        const data = localStorage.getItem("expandCurrentData");
        
        // Get user input content
        const content = document.getElementById("expandContent").value.trim();
        
        if (!theme || !data || !content) {
            alert("請先設定題目並輸入整合拓展內容");
            return;
        }

        const tone = document.getElementById("expandTone").value;

        showLoading("陳SIR 正在審視拓展方向...");
        
        // Build payload for API call
        const payload = {
            action: "grade_expand",
            data: {
                subType: "comment",
                title: title || "無",
                theme: theme,
                data: data,
                content: content,
                tone: tone
            }
        };
        
        // Call API
        const comment = await callAPI(payload);
        
        // Set chat context
        currentContextContent = `題目：${title}\n主題句：${theme}\n抄錄資料：${data}\n內容：${content}`;
        currentContextReview = comment;

        // Parse and render HTML
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

        // Add chat interface
        finalHTML += getCanvasChatHTML('expand_comment');

        openResultCanvas("整合拓展點評");
        document.getElementById("resultCanvasBody").innerHTML = finalHTML;
        
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

// ==========================================
// === Submit Expand Guide ===
// ==========================================
/**
 * Submit expand content for AI guidance (questions to help improve)
 */
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
        
        // Build payload for API call
        const payload = {
            action: "grade_expand",
            data: {
                subType: "guide",
                title: title,
                theme: theme,
                data: data,
                content: expand
            }
        };
        
        // Call API
        const guide = await callAPI(payload);
        
        // Set chat context
        currentContextContent = `題目：${title}\n主題句：${theme}\n抄錄資料：${data}\n內容：${expand}`;
        currentContextReview = guide;

        // Parse and render HTML
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

        // Add chat interface
        guideHTML += getCanvasChatHTML('expand_guide');

        openResultCanvas("整合拓展指引");
        document.getElementById("resultCanvasBody").innerHTML = guideHTML;
        
        // Save to history (remove chat interface)
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

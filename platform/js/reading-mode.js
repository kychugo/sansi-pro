/**
 * Reading Mode Functions
 * Extracted from index2.html
 * Contains all reading-related functionality including API calls, UI toggles, and submission handling
 */

// =======================================================
// === Constants and Configuration ===
// =======================================================

// API Configuration
// Note: CLOUDFLARE_WORKER_URL should be defined in the main application
// const CLOUDFLARE_WORKER_URL = "https://script.google.com/macros/s/AKfycbw3GLUM12ls3PhST5TkimLZvZwQx2H4RG8g2SbZiMJmuxg3HqsO_d13kPU4AnKpxi2P6A/exec";
// const READING_API_URL = CLOUDFLARE_WORKER_URL;
// const READING_MODEL = "deepseek";

// Global variables (should be initialized in main application)
// let globalAbortController = null;
// let currentContextContent = "";
// let currentContextReview = "";

// =======================================================
// === Reading Function Toggle ===
// =======================================================

/**
 * Toggle reading function UI based on selected option
 * Handles display of reading input area and student answer section
 * Line ~12224 in index2.html
 */
function toggleReadingFunction() {
    hideAllSaveHtmlButtons(); // Hide all save HTML buttons
    clearAllTopicStates();
    const readingFunction = document.getElementById("readingFunction").value;
    
    // Handle "training" option - redirect to training page
    if (readingFunction === "training") {
        window.location.href = "toolbox/interpretation.html";
        return;  // Exit immediately to avoid further execution
    }
    
    const contentContainer = document.getElementById("readingInputArea");
    if (readingFunction) {
        contentContainer.style.display = "block";
    } else {
        contentContainer.style.display = "none";
        return; // Stop execution if no selection
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

// =======================================================
// === Reading API Call ===
// =======================================================

/**
 * Call Reading API (DeepSeek) - Secure version
 * Handles both string input and action-based payload
 * Line ~13111 in index2.html
 * 
 * @param {string|object} input - Either a string message or an action object
 * @param {number|null} temperature - Optional temperature parameter for API
 * @returns {Promise<string>} - Cleaned API response content
 */
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
                token: token, // ★ Include Token
                model: READING_MODEL,
                messages: [{ role: "user", content: input }],
                max_tokens: 4000
            };
        } else if (typeof input === 'object' && input.action) {
            requestBody = {
                token: token, // ★ Include Token
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

// =======================================================
// === Submit Reading Function ===
// =======================================================

/**
 * Submit reading comprehension task
 * Handles both "comment" (點評) and "guide" (指引) modes
 * Line ~14074 in index2.html
 */
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

        // ★ Build Payload
        const payload = {
            action: "grade_reading",
            data: {
                subType: readingFunction, // "comment" or "guide"
                passage: passage,
                question: question,
                answer: studentAnswer,
                tone: document.getElementById("readingTone").value 
            }
        };

        const result = await callReadingAPI(payload);
        currentContextReview = result;

        // === HTML generation and rendering logic ===
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

// =======================================================
// === Helper Functions (Dependencies) ===
// =======================================================

/**
 * Note: The following functions are dependencies that should be defined
 * in the main application or imported:
 * 
 * - hideAllSaveHtmlButtons()
 * - clearAllTopicStates()
 * - showLoading(text)
 * - hideLoading()
 * - openResultCanvas(title)
 * - createBulletedListHTML(title, content)
 * - getCanvasChatHTML(type)
 * - saveToHistory(category, subFunction, title, userContent, aiContent)
 * - logProviderInfo(data, apiName)
 * 
 * Global variables that should be defined:
 * - READING_API_URL
 * - READING_MODEL
 * - globalAbortController
 * - currentContextContent
 * - currentContextReview
 * - firebase (Firebase SDK)
 */

// =======================================================
// === Export Functions (ES6 Module) ===
// =======================================================

// If using ES6 modules, uncomment the following:
// export { toggleReadingFunction, callReadingAPI, submitReading };

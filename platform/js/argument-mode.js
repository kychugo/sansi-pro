/**
 * Argument Mode Functions - 議論文相關功能模組
 * 
 * This module contains all argument/debate-mode related JavaScript functions
 * extracted from index2.html
 */

// ==========================================
// === ARGUMENT TOPICS DATA ===
// ==========================================

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

let lastArgumentTopic = localStorage.getItem("lastArgumentTopic") || "";

// ==========================================
// === ARGUMENT CHAT CONTEXT VARIABLES ===
// ==========================================

let currentArgumentArticle = '';
let currentArgumentReview = '';
let argumentChatHistoryData = [];

// ==========================================
// === TOPIC INPUT AND SELECTION ===
// ==========================================

/**
 * Show custom topic input for argument mode
 * Toggle logic - if button is already active, hide the input area
 */
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

/**
 * Generate random argument topic
 * Avoid repeating the last selected topic
 */
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

/**
 * Set custom argument topic
 * Use sanitizeHTML to prevent XSS
 */
function setArgumentCustomTopic() {
    const customTopic = sanitizeHTML(document.getElementById("argumentCustomTopic").value.trim());
    if (!customTopic) {
        alert("請輸入自訂題目");
        return;
    }
    
    const topicResult = document.getElementById("argumentTopicResult");
    topicResult.innerHTML = "<strong>" + customTopic + "</strong>";
    localStorage.setItem("argumentCurrentTopic", customTopic);
    
    topicResult.style.display = "block"; 
    
    const customTopicArea = document.getElementById("argumentCustomTopicArea");
    customTopicArea.style.display = "none";
    customTopicArea.innerHTML = "";
}

// ==========================================
// === TYPE TOGGLE AND NAVIGATION ===
// ==========================================

/**
 * Toggle between different argument types: outline, writing, guide
 * Reset and hide all results and chat interface when switching
 */
function toggleArgumentType() {
    hideAllSaveHtmlButtons();
    clearAllTopicStates();

    const argumentType = document.getElementById("argumentType").value;
    const contentContainer = document.getElementById("argumentContentContainer");

    const reviewScopeArea = document.getElementById("argumentReviewScopeArea");
    const gradingResultDiv = document.getElementById("argumentGradingResult");
    const chatHistoryDiv = document.getElementById("argumentChatHistory");
    const chatInputContainer = document.getElementById("argumentChatInputContainer");

    // Reset and hide all results and chat interface when switching
    gradingResultDiv.innerHTML = "";
    chatHistoryDiv.innerHTML = "";
    chatHistoryDiv.style.display = "none";
    chatInputContainer.style.display = "none";
    reviewScopeArea.style.display = "none";

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
        reviewScopeArea.style.display = "block";
    } else if (argumentType === "guide") {
        outlineArea.style.display = "none";
        writingArea.style.display = "none";
        guideArea.style.display = "block";
        topicSelectionArea.style.display = "none";
    }
}

// ==========================================
// === OUTLINE TABLE MANAGEMENT ===
// ==========================================

/**
 * Generate argument outline table
 * Load from localStorage if available, otherwise use default structure
 */
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

/**
 * Add new structure segment to argument outline
 * Insert before the last row (合)
 */
function addArgumentStructureSegment() {
    const table = document.getElementById("argumentOutlineTable");
    const rows = table.rows;
    let structureSegmentCount = 0;
    for (let i = 1; i < rows.length - 1; i++) {
        if (rows[i].cells[0].innerText.startsWith("結構段")) {
            structureSegmentCount++;
        }
    }
    const newSegmentNumber = structureSegmentCount + 1;
    const chineseNumbers = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];
    const segmentName = `結構段${chineseNumbers[newSegmentNumber - 1] || newSegmentNumber}`;
    const newRowIndex = rows.length - 1;
    const newRow = table.insertRow(newRowIndex);
    const cell1 = newRow.insertCell(0);
    const cell2 = newRow.insertCell(1);
    const cell3 = newRow.insertCell(2);
    cell1.innerText = segmentName;
    cell2.innerHTML = `<textarea id="argumentPoint${newRowIndex - 1}" rows="3"></textarea>`;
    cell3.innerHTML = `<textarea id="argumentEvidence${newRowIndex - 1}" rows="3"></textarea>`;
}

/**
 * Save argument outline to localStorage
 */
function saveArgumentOutline() {
    const table = document.getElementById("argumentOutlineTable");
    const rows = table.rows;
    const outlineData = [];
    for (let i = 1; i < rows.length; i++) {
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

/**
 * Clear argument outline
 * Reset all textareas and remove from localStorage
 */
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

// ==========================================
// === SUBMISSION FUNCTIONS ===
// ==========================================

/**
 * Submit argument guide for AI feedback
 * No categories reference - removed frontend categories
 */
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
            const content = lines.join("<br>");
 
            guideHTML += `
                <div class="guide-section-card">
                    <div class="guide-card-header">${title}</div>
                    <div class="guide-card-body">${content}</div>
                </div>
            `;
        });
 
        guideHTML += `</div>`;
        guideHTML += getCanvasChatHTML('argument_guide');
 
        openResultCanvas("議論文寫作指引");
        document.getElementById("resultCanvasBody").innerHTML = guideHTML;
 
        await saveToHistory("議論", "指引", topic, `題目：${topic}\n論點：${point}\n論據：${evidence}\n論證：${argument}`, guideHTML);
        
    } catch (error) {
        console.error("提交指引時出錯:", error);
        alert("指引生成失敗，請重試");
    } finally {
        submitBtn.disabled = false;
        hideLoading();
    }
}

/**
 * Submit argument writing for AI review
 * Supports both full review and focused review with RAG reference
 */
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

        showLoading(`${currentReviewerName} 正在點評...`);

        const ragReference = await searchSimilarEssays(content, 'argument');

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

        const payload = {
            action: "grade_argument",
            data: {
                subType: "writing", 
                isFullReview: isFullReview,
                topic: topic,
                content: finalPromptContent,
                reviewer: document.getElementById('argumentReviewer').value,
                tone: tone,
                selectedScopes: selectedScopes
            }
        };
        
        const response = await callReadingAPI(payload, 0); 
        
        currentContextContent = content;
        currentContextReview = response;

        if (isFullReview) {
            await displayFullCommentWithGrading('argumentGradingResult', response, null, 'argument', content);
        } else {
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

/**
 * Submit argument outline for AI feedback
 * History record only shows topic, not detailed content
 */
async function submitArgumentOutline() {
    const submitBtn = document.getElementById('submitArgumentOutlineBtn');
    submitBtn.disabled = true;
    hideAllSaveHtmlButtons();

    try {
        const topic = localStorage.getItem("argumentCurrentTopic");
        if (!topic) { alert("請先設定題目"); submitBtn.disabled = false; return; }

        const table = document.getElementById("argumentOutlineTable");
        const rows = table.rows;
        const outlineData = [];
        
        let readableContext = `題目：${topic}\n\n`;
        
        for (let i = 1; i < rows.length; i++) {
            const part = rows[i].cells[0].innerText.trim();
            const point = rows[i].cells[1].querySelector("textarea")?.value.trim() || "";
            const evidence = rows[i].cells[2].querySelector("textarea")?.value.trim() || "";
            
            outlineData.push({ part, point, evidence });
            
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
        
        currentContextContent = readableContext;
        currentContextReview = response;

        displayArgumentOutlineComment(response, outlineData);
        
        const htmlToSave = document.getElementById("resultCanvasBody").innerHTML;
        
        await saveToHistory("議論", "大綱點評", topic, `題目：${topic}`, htmlToSave);

    } catch (error) {
        console.error("提交大綱失敗", error);
        alert("生成失敗，請重試");
    } finally {
        submitBtn.disabled = false;
        hideLoading();
    }
}

// ==========================================
// === DISPLAY AND FORMATTING ===
// ==========================================

/**
 * Display argument outline comment with parsing
 * Parse response into comment table and rewrite table
 */
function displayArgumentOutlineComment(response, inputData) {
    console.log("[Argument Outline] Raw Response:", response);

    const sections = response.split(/===\s*(.+?)\s*===/).filter(s => s.trim());
    
    let commentPart = "";
    let rewritePart = "";
    let explanationPart = "";

    for (let i = 0; i < sections.length; i++) {
        if (sections[i].includes("點評及建議")) commentPart = sections[i + 1] || "";
        if (sections[i].includes("改寫後的大綱")) rewritePart = sections[i + 1] || "";
        if (sections[i].includes("改寫說明")) explanationPart = sections[i + 1] || "";
    }

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

    let explanationHTML = '';
    if (explanationPart.trim()) {
        explanationHTML = createBulletedListHTML("改寫說明", explanationPart.trim());
    }

    const finalHTML = commentTableHTML + rewriteTableHTML + explanationHTML + getCanvasChatHTML('argument_outline');
    
    openResultCanvas("議論文大綱點評");
    document.getElementById("resultCanvasBody").innerHTML = finalHTML;
}

// ==========================================
// === REVIEW SCOPE HANDLING ===
// ==========================================

/**
 * Handle "All Scope" checkbox change in argument review
 * When checked, disable other checkboxes
 */
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

// ==========================================
// === CHAT CONTINUATION ===
// ==========================================

/**
 * Continue argument discussion with AI
 * Support follow-up questions and responses
 */
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

    const tone = document.getElementById("argumentWritingTone").value;
    let toneNote = "";
    if (tone === "chen") {
        toneNote = "請用幽默詼諧、適時揶揄的語氣回應，**必須使用大量Emoji** 🤪✨，表示揶揄時會用🤌這個EMOJI，偶爾用網絡用語。";
    } else {
        toneNote = "請用日常的語言回應我，不要過於理論化。";
    }
    
    const prompt = `我是一位高中生，你正在點評我的議論文。\n原文：${currentArgumentArticle}\n對話紀錄：${conversationHistoryForPrompt}\n請針對最新追問回應。${toneNote}\n\n【重要】請必須使用繁體中文(Traditional Chinese)回答。`;
    
    try {
        let aiResponse = await callReadingAPI(prompt);
        
        if (typeof OpenCC !== 'undefined') {
            const converter = OpenCC.Converter({ from: 'cn', to: 'tw' });
            aiResponse = converter(aiResponse);
        }

        aiResponse = aiResponse.replace(/[""](.*?)[""]/g, '「$1」');
        
        let formattedResponse = aiResponse.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        formattedResponse = formattedResponse.replace(/\n/g, '<br>');
        aiLoadingBubble.innerHTML = formattedResponse;
        
        argumentChatHistoryData.push({ sender: 'ai', message: aiResponse });

        await updateHistoryChat();

    } catch (error) {
        console.error("繼續議論文討論時出錯:", error);
        aiLoadingBubble.textContent = "抱歉，回應失敗。";
    } finally {
        chatHistoryDiv.scrollTop = chatHistoryDiv.scrollHeight;
        continueBtn.disabled = false;
    }
}

# 神思 (Sansi) - DSE 中文科人工智能學習系統

**神思 (Sansi)** 是一個專為香港中學文憑試 (DSE) 考生量身打造的 Progressive Web App (PWA)。本專案突破傳統學習工具的限制，深度整合生成式 AI (GenAI)，提供從「寫作構思」到「模擬評卷」的全流程支援。

系統採用無伺服器 (Serverless) 的純前端架構，結合沉浸式 UI 設計與強大的本地數據庫技術，旨在為學生提供一個私隱安全、反應迅速且具備高度儀式感的學習環境。

![Platform](https://img.shields.io/badge/Platform-Web%20%7C%20Mobile-orange)
![Tech Stack](https://img.shields.io/badge/Tech-HTML5%20%7C%20IndexedDB%20%7C%20AI-blue)
![Target](https://img.shields.io/badge/Exam-HKDSE-red)
![License](https://img.shields.io/badge/License-Proprietary%20(Educational)-red)

## 📖 設計理念

1.  **沉浸式體驗 (Immersion)**：透過動態場景切換、環境音效與流暢的轉場動畫 (Shrink-Exit/Pop-Enter)，解決學生學習時難以專注的痛點。
2.  **人格化 AI (Personification)**：摒棄冷冰冰的 AI 回應，內置「陳 SIR」及多位虛擬閱卷員，模擬真實老師的語氣與評分取向。

## 🏛️ 五大核心範疇詳解 (Five Core Modules)

本系統依據 DSE 中文科考核重點，劃分為五大功能範疇，全面覆蓋讀寫聽說與思維訓練：

### 1. ✍️ 敘事抒情 (Narrative & Lyric Writing)
專注於記敘文與抒情文的寫作訓練，強調情感的細膩度與意象的運用。
*   **文章點評**：採用雙模型驗證（Dual-Model Verification），繪製六維雷達圖（立意、取材、扣題、詳略、詞彙、文學性），提供 0-10 分的量化評核。
*   **大綱點評**：分析「起承轉合」或「三線結構」的邏輯，確保情節發展緊扣題旨。
*   **解題指引**：深度分析題目關鍵詞的張力，並提供三個具體的「寫作種子」（情境與矛盾）。
*   **敘事物象**：根據題目自動生成 50+ 個相關的描寫物象，豐富文章的畫面感。

### 2. ⚖️ 議論寫作 (Argumentative Writing)
針對議論文的嚴謹邏輯訓練，強調論點的深度與論據的廣度。
*   **文章點評**：執行嚴格的「關鍵詞比對」機制，防止偏題。提供針對「謀篇、論點、論據、論證、文筆」的聚焦式分析。
*   **大綱點評**：檢查論點與論據的適配度，以及結構段落的安排是否合理。
*   **寫作指引**：根據題目自動生成參考論點、古今中外論據及論證思路，輔助學生構思。

### 3. 📖 閱讀理解 (Reading Comprehension)
提升學生對篇章的理解能力及答題精準度。
*   **點評模式**：分析學生的答題方向、文本依據引用的準確性及推論的嚴謹度。
*   **指引模式**：生成引導式問題及關鍵答題詞彙，幫助學生讀懂篇章深層含義。
*   **訓練模式**：(連結至外部訓練工具) 提供針對性的閱讀練習。

### 4. 🔗 整合拓展 (Integrated Skills)
專門針對實用文寫作中「整合」與「拓展」能力的訓練。
*   **點評功能**：分析「主題句」與「抄錄資料」的邏輯關係，評估拓展方向是否扣題且具體。
*   **指引功能**：生成引導問題，協助學生思考如何從資料延伸至主題論述。
*   **字數監控**：內置實時字數倒數器，訓練學生精準控制篇幅。

### 5. 📚 課外書籍 (Extra-curricular Reading)
建立閱讀氛圍，鼓勵深度閱讀與思考。
*   **書籍討論**：與 AI 角色進行關於書名、作者及特定議題的深度對話，培養批判性思考。
*   **風格切換**：可選擇「嚴肅正經」或「輕鬆活潑」的對話語氣，適應不同學習情境。

---

## 🛠️ 語薈 (Toolbox) - 綜合學習工具箱

「語薈」是以思維導圖 (Mind Map) 形式建構的學習資源網絡，整合了 20+ 個實用工具，全方位支援學生的學習需求：

### 🧠 核心 AI 與應試
*   **題孳**：AI 自動擬設閱讀卷及寫作卷題目，提供源源不絕的練習庫。
*   **神思**：本系統的核心 AI 引擎，支援多模態學習。

### ✍️ 寫作創作支援
*   **翻水**：AI 範文生成器（分為敘事與議論版），提供高分範作參考。
*   **智能原稿紙**：模擬真實考試方格紙介面，支援字數統計與格式檢測。
*   **字斟・句酌**：詞彙潤色工具，協助學生推敲字句，提升文采。
*   **文章幻燈片**：將作文轉化為視覺化的簡報，便於課堂分享與賞析。

### 📖 閱讀與溫習
*   **語弈錄**：針對各年級（中一至中六）課文及範文的互動問答遊戲。
*   **文樞 (Mensyu)**：文言文專用工具，提供篇章庫、語譯及精準詞解。
*   **背書神器**：內置語音偵測的倒計時器，朗讀時自動重置，輔助默書與背誦。
*   **文學・片段 / 慢讀**：提供優質文學選段與沉浸式閱讀體驗。

### 🧰 實用工具與課業管理
*   **帙雲**：基於 Google Drive 的課業繳交與自動歸檔系統。
*   **琢玉**：圖片與 PDF 批註工具，方便教師批改與學生筆記。
*   **脈問堂 / 搶答器**：課堂互動工具，支援即時問答與競賽。
*   **OCR 文字識別**：將手寫筆記或圖片轉為數碼文字。

### 🤖 智能學伴與支援
*   **喻蛋教室 / 史萊姆教室**：專科 AI 聊天室，解答學科疑難。
*   **解憂雜貨店**：提供心理支持與輔導的 AI 伴侶。

---

## 🛠️ 輔助與支援系統

### 🗂️ 歷史紀錄系統 (History & Knowledge Base)
*   **層級化架構**：建立 `主範疇 -> 子功能 -> 紀錄卡片` 的三層索引結構。
*   **DOM 快照技術**：自動將動態 Canvas (雷達圖) 轉換為靜態圖片存儲，確保評分結果可完美重現。
*   **莫蘭迪色系 UI**：自動為不同類型的紀錄分配顏色標籤，提升視覺區分度。

### 🎨 沉浸式工具
*   **DSE 倒數日曆**：動態翻頁鐘 (Flip Clock)，支援年級切換 (S1-S6) 及煙花特效。
*   **環境音樂播放器**：集成精選輕音樂，具備無干擾的半透明懸浮介面。
*   **語薈 (Toolbox)**：以思維導圖形式整合 20+ 個外部學習工具 (如翻水、題孳、文樞等)。

---

## 💻 技術架構 (Technical Architecture)

*   **Frontend**: 原生 JavaScript (ES6+), HTML5, CSS3.
*   **Styling**: CSS Variables, Keyframe Animations, Glassmorphism.
*   **Database**: IndexedDB (Async Storage for heavy text/html data).
*   **Visualization**: Chart.js (Customized Radar configuration).
*   **Text Processing**: OpenCC (簡繁轉換), Regex (Markdown 解析與 HTML 淨化).
*   **Export**: Client-side HTML generation & Blob download.

## ⚠️ 免責聲明 (Disclaimer)

1.  **AI 生成內容**：本系統的評分與建議由人工智能生成，僅供參考輔助，不代表香港考試及評核局 (HKEAA) 的官方標準。
2.  **網絡依賴**：部分 AI 功能需連接互聯網才能運作。
3.  **瀏覽器兼容性**：建議使用最新版 Chrome, Edge 或 Safari 以獲得最佳體驗 (IndexedDB 及 CSS Grid 支援)。

---

## ©️ 版權與授權聲明 (COPYRIGHT AND LICENSE)

**Copyright © 2025 陳冠健 (Chan Kwun Kin). All Rights Reserved.**

本代碼庫中包含的所有原始碼、版面設計、演算法邏輯及圖像素材，均為 陳冠健 (Chan Kwun Kin) 之知識產權，受版權法保護。

### 1. 允許使用範圍 (PERMITTED USE)
**適用對象：僅限中華基督教會基元中學師生**
*   **專屬授權**：本軟體僅授權予 **中華基督教會基元中學** 的現任教職員與在校學生使用。
*   **使用目的**：僅限於校內教學活動、個人學習及非商業用途。
*   **校外人士**：非本校師生**未經授權，禁止使用**本系統進行任何形式的教學或商業活動。

### 2. 禁止行為 (RESTRICTIONS)
**適用對象：開發者、補習社與其他第三方**
雖然本專案公開代碼以供展示（Source Available），但**並非開源軟件 (Not Open Source)**。未經作者明確書面許可，**嚴禁**進行以下行為：
*   **複製與分發**：不得複製、分發或託管本專案的源代碼。
*   **修改與重製**：不得修改源代碼、進行逆向工程 (Reverse Engineering) 或將其打包為自己的產品。
*   **商業用途**：嚴禁將本專案之全部或部分用於任何商業營利行為、補習社教材或作為付費課程之輔助工具。

**Any unauthorized reproduction, modification, distribution, or use of this software logic/code is strictly prohibited.**

---

### Live2D 相關技術聲明

使用 **Live2D Cubism SDK** 由原圖製作成 2D 即時動畫的技術  
by  ![Live2D Logo](https://www.live2d.com/wp-content/themes/cubism_new/assets/img/sdk/live2d-logo_01.png)

**Live2D 素材使用受《無償提供素材使用授權協議》（版本 1.6，2025年2月3日修訂）約束**  
請務必詳閱完整協議，尤其是商用限制、大型企業使用條件及禁止事項。  
中文參考譯本：https://www.live2d.com/eula/live2d-free-material-license-agreement_cn.html  
日文原版（法律效力優先）：https://www.live2d.com/eula/live2d-free-material-license-agreement_jp.html

*Created with ❤️ for better Chinese Education in Hong Kong.*

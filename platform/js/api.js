/**
 * ======================================
 * API 呼叫核心模組
 * ======================================
 * 負責所有 API 調用功能
 * 包含：Gemini API、DeepSeek 閱讀 API、Llama3 驗證 API、貓咪對話 API
 */

// API 端點配置
const CLOUDFLARE_WORKER_URL = "https://script.google.com/macros/s/AKfycbw3GLUM12ls3PhST5TkimLZvZwQx2H4RG8g2SbZiMJmuxg3HqsO_d13kPU4AnKpxi2P6A/exec";

const API_URL = CLOUDFLARE_WORKER_URL;         
const READING_API_URL = CLOUDFLARE_WORKER_URL;
const LLAMA3_API_URL = CLOUDFLARE_WORKER_URL;  

// 模型設定
const MODEL = "gemini";
const READING_MODEL = "deepseek";
const LLAMA3_MODEL = "gemini";

// 全局中斷控制器
let globalAbortController = null;

/**
 * 記錄 API 提供者資訊
 * @param {Object} dataOrResponse - API 回應資料或 Response 物件
 * @param {string} apiName - API 名稱
 */
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

/**
 * 通用 API 調用 (Gemini) - 安全版
 * @param {string|Object} input - 輸入文字或 action 物件
 * @param {number|null} temperature - 溫度參數 (可選)
 * @returns {Promise<string>} API 回應內容
 */
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

/**
 * 閱讀專用 API (DeepSeek) - 安全版
 * @param {string|Object} input - 輸入文字或 action 物件
 * @param {number|null} temperature - 溫度參數 (可選)
 * @returns {Promise<string>} API 回應內容
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

/**
 * 驗證專用 API (Llama3) - 安全版
 * @param {string|Object} input - 輸入文字或 action 物件
 * @param {number|null} temperature - 溫度參數 (可選)
 * @returns {Promise<string>} API 回應內容
 */
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

/**
 * 貓咪對話專用 API (Gemini Fast)
 * @param {string} input - 輸入文字
 * @param {number|null} temperature - 溫度參數 (可選)
 * @returns {Promise<string>} API 回應內容
 */
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

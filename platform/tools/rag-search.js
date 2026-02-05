// ==========================================
// RAG 搜尋與 Supabase 向量資料庫模組
// ==========================================

// Supabase 設定
const SUPABASE_URL = 'https://vgoisaswgjpdwsikvipx.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnb2lzYXN3Z2pwZHdzaWt2aXB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4Mzg0ODMsImV4cCI6MjA4NTQxNDQ4M30._sMGcMMApSyzdCaXzAlF9hCc8mkgxz_28IbTrXpFnyA';

// 創建 Supabase 客戶端
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 初始化向量模型
let embeddingExtractor = null;

// 初始化向量模型
async function initEmbeddingModel() {
    if (!window.pipeline) {
        console.log("等待 Transformers 庫載入...");
        await new Promise(r => setTimeout(r, 500));
    }

    if (!embeddingExtractor) {
        console.log("📥 [RAG] 正在下載/載入向量模型...");
        
        // 強制設定不使用本地快取路徑，改用 CDN
        window.pipeline.env.allowLocalModels = false;
        window.pipeline.env.useBrowserCache = true;

        // 使用 pipeline 建立特徵提取器
        embeddingExtractor = await window.pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
        console.log("✅ [RAG] 向量模型就緒");
    }
}

// 將文字轉為向量的函式
async function getEmbedding(text) {
    await initEmbeddingModel();
    const output = await embeddingExtractor(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data);
}

// RAG 搜尋核心函數 (詳細 Log + 抓取 3 篇 + 格式化)
// targetType: 'narrative' (敘事) 或 'argument' (議論)
async function searchSimilarEssays(studentText, targetType) {
    console.log(`%c🔍 [RAG] 正在啟動向量搜尋 (類型: ${targetType})...`, "color: yellow");
    
    try {
        if (typeof supabaseClient === 'undefined') {
            console.error("❌ [RAG] Supabase Client 未定義，無法搜尋。");
            return "";
        }

        // 1. 動態匯入 Transformers.js
        const { pipeline, env } = await import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.6.0');
        
        // 設定快取策略，確保下載一次後不用再下載
        env.allowLocalModels = false;
        env.useBrowserCache = true;

        // 2. 初始化/載入模型 (加入進度監聽)
        const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
            progress_callback: (data) => {
                if (data.status === 'initiate') {
                    console.log(`⬇️ [RAG] 正在下載模型組件: ${data.file}`);
                } else if (data.status === 'progress') {
                    const percent = Math.round(data.progress);
                    if (percent % 10 === 0) { 
                        console.log(`📦 [RAG] 下載中... ${percent}%`);
                    }
                } else if (data.status === 'done') {
                    console.log(`✅ [RAG] 組件下載完成: ${data.file}`);
                }
            }
        });
        
        console.log("✅ [RAG] 向量模型已就緒，開始計算特徵...");

        // 3. 計算向量 (擷取前 500 字)
        const output = await extractor(studentText.substring(0, 500), { pooling: 'mean', normalize: true });
        const vector = Array.from(output.data);

        // 4. 呼叫 Supabase 進行比對
        const { data, error } = await supabaseClient.rpc('match_documents', {
            query_embedding: vector,
            match_threshold: 0.3, // 相似度門檻
            match_count: 3,       // 抓取 3 篇
            filter_type: targetType
        });

        if (error) {
            console.error("❌ [RAG] Supabase RPC Error:", error);
            return "";
        }

        if (data && data.length > 0) {
            // 詳細列印命中資料
            console.group(`🎯 [RAG] 命中 ${data.length} 篇範文`);
            data.forEach((match, idx) => {
                const similarityScore = (match.similarity * 100).toFixed(2) + '%';
                const docTitle = match.metadata ? match.metadata.title : '無標題';
                const preview = match.content ? match.content.substring(0, 50).replace(/\n/g, ' ') + '...' : '';
                
                console.log(`%c[${idx + 1}] ${docTitle}`, "font-weight: bold; color: #4caf50;");
                console.log(`    相似度: ${similarityScore}`);
                console.log(`    內容預覽: ${preview}`);
            });
            console.groupEnd();
            
            // 5. 格式化輸出給 LLM
            let ragContent = "=== ⚡ 系統檢索：5** 高分範文庫參考資料 ⚡ ===\n";
            ragContent += "(注意：以下內容僅供評分標準參考，並非學生所寫，請勿對此進行評改)\n\n";

            data.forEach((match, index) => {
                ragContent += `【參考範文 ${index + 1}】：${match.metadata.title || '無題'}\n`;
                ragContent += `${match.content}\n`;
                ragContent += `--------------------------------------------------\n`;
            });
            
            return ragContent;
        } else {
            console.warn(`🤷‍♂️ [RAG] 找不到相似文章 (相似度低於 0.3)`);
            return "";
        }

    } catch (err) {
        console.error("❌ [RAG] 執行過程發生錯誤:", err);
        return ""; 
    }
}

/**
 * ======================================
 * IndexedDB 與 LocalStorage 管理模組
 * ======================================
 * 負責所有資料快取與本地儲存功能
 * 包含：IndexedDB 快取管理、檔案快取、Blob 處理
 */

// IndexedDB 快取配置
const CACHE_DB_NAME = 'SansiLive2DCache';
const CACHE_STORE_NAME = 'files';
const CACHE_VERSION = 1;

/**
 * 開啟 IndexedDB 快取資料庫
 * @returns {Promise<IDBDatabase>} 資料庫實例
 */
function openCacheDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(CACHE_DB_NAME, CACHE_VERSION);
        req.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(CACHE_STORE_NAME)) {
                db.createObjectStore(CACHE_STORE_NAME);
            }
        };
        req.onsuccess = (e) => resolve(e.target.result);
        req.onerror = (e) => reject(e);
    });
}

/**
 * 帶快取的檔案獲取功能
 * 優先從 IndexedDB 讀取，若無則從網路下載並快取
 * @param {string} url - 檔案 URL
 * @returns {Promise<Blob>} 檔案 Blob
 */
async function fetchWithCache(url) {
    try {
        const db = await openCacheDB();
        const tx = db.transaction(CACHE_STORE_NAME, 'readonly');
        const store = tx.objectStore(CACHE_STORE_NAME);
        
        // 嘗試從資料庫讀取
        const cachedFile = await new Promise((resolve) => {
            const req = store.get(url);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => resolve(null);
        });

        if (cachedFile) {
            // console.log(`[Cache Hit] 從本地讀取: ${url}`);
            return cachedFile; // 直接回傳 Blob
        }

        // 資料庫沒有，從網絡下載
        // console.log(`[Network] 下載中: ${url}`);
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Network response was not ok for ${url}`);
        const blob = await response.blob();

        // 寫入資料庫 (非同步執行，不阻擋回傳)
        const writeTx = db.transaction(CACHE_STORE_NAME, 'readwrite');
        writeTx.objectStore(CACHE_STORE_NAME).put(blob, url);

        return blob;

    } catch (err) {
        console.warn("快取系統出錯 (降級為普通下載):", err);
        const response = await fetch(url);
        return await response.blob();
    }
}

/**
 * 將 Blob 轉換為 Base64 Data URI
 * 避開 Blob URL 權限問題
 * @param {Blob} blob - Blob 物件
 * @returns {Promise<string>} Base64 Data URI
 */
function blobToDataURL(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

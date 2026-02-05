// ==========================================
// Firebase 配置與初始化模組
// ==========================================

// Firebase 配置
const firebaseConfig = {
    apiKey: "AIzaSyBgwrgn2m343mRJb0WjzUhteiospegXhvI",
    authDomain: "sansidata.firebaseapp.com",
    projectId: "sansidata",
    storageBucket: "sansidata.firebasestorage.app",
    messagingSenderId: "580288358575",
    appId: "1:580288358575:web:35dcf4e79bcef530de4c5a",
    databaseURL: "https://sansidata-default-rtdb.firebaseio.com" 
};

// 宣告全域變數
let database, auth;

// 初始化 Firebase
function initializeFirebase() {
    if (typeof firebase !== 'undefined' && !firebase.apps.length) {
        try {
            firebase.initializeApp(firebaseConfig);
            console.log("Firebase 初始化成功！");
            database = firebase.database();
            auth = firebase.auth();
        } catch (e) {
            console.error("Firebase 初始化失敗：", e);
        }
    } else if (typeof firebase !== 'undefined' && firebase.apps.length) {
        database = firebase.database();
        auth = firebase.auth();
    }
}

// 自動執行初始化
initializeFirebase();

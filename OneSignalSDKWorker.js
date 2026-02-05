// OneSignalSDKWorker.js

importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');

// ★★★ 強制讓新的 Service Worker 立即啟用，跳過 waiting 狀態 ★★★
self.addEventListener('install', function(event) {
  self.skipWaiting(); // 這一行是解決 "waiting to activate" 的關鍵
});

// ★★★ 讓 Service Worker 立即接管所有開啟的頁面 ★★★
self.addEventListener('activate', function(event) {
  event.waitUntil(clients.claim());
});

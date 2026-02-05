// Post-Body Scripts 3
document.addEventListener('DOMContentLoaded', function() {
    // 獲取雲端同步按鈕
    const cloudBtn = document.getElementById('sideMenuCloudBtn');
    
    if (cloudBtn) {
        // 1. 頁面載入時立即凍結 (套用變灰、無法點擊的樣式)
        cloudBtn.classList.add('btn-frozen');
        
        // (選用) 暫時改變 title 提示
        const originalTitle = cloudBtn.getAttribute('title') || '雲端同步';
        cloudBtn.setAttribute('title', '系統初始化中，請稍候...');

        // 2. 設定 5 秒後解凍
        setTimeout(() => {
            // 移除凍結樣式，恢復顏色與點擊功能
            cloudBtn.classList.remove('btn-frozen');
            
            // 恢復原本的提示文字
            cloudBtn.setAttribute('title', originalTitle);
        }, 5000); // 5000 毫秒 = 5 秒
    }
});
</script>

// Post-Body Scripts 8



// === [新增] 閱讀資源選單邏輯 ===

// 1. 打開選單
function openBookResourceMenu() {
    // 先收起側邊欄
    const sideMenu = document.getElementById('sideMenu');
    if (sideMenu) {
        sideMenu.classList.remove('active');
        document.getElementById('sideMenuToggle').classList.remove('active');
    }
    // 顯示選擇視窗
    document.getElementById('bookResourceModal').style.display = 'flex';
}

// 2. 關閉選單 (點擊背景關閉)
function closeBookResourceMenu(event) {
    if (event.target.id === 'bookResourceModal') {
        document.getElementById('bookResourceModal').style.display = 'none';
    }
}

// 3. 進入「課外書籍討論」
function enterBooksChatFromMenu() {
    document.getElementById('bookResourceModal').style.display = 'none';
    
    // 直接呼叫原本的容器顯示函式
    showContainer('booksContainer');
}

// 4. 進入「精選文章」
function enterFeaturedFromMenu() {
    document.getElementById('bookResourceModal').style.display = 'none';
    
    // 呼叫原本的權限檢查與進入函式
    checkFeaturedAccess();
}
	
</script>

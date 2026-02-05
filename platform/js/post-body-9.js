// Post-Body Scripts 9
document.addEventListener('DOMContentLoaded', function() {
    if (auth) {
        // 強制設定為本地持久化
        auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).then(() => {
            // 監聽 Auth 狀態改變
            auth.onAuthStateChanged(async (user) => {
                const s = JSON.parse(localStorage.getItem('studentProfile'));
                if (user && s) {
                    console.log("✅ 認證已恢復:", user.email);
                    checkStudentLogin(); 
                } else if (!user && !s) {
                    console.log("ℹ️ 訪客狀態：顯示登入表單");
                    const form = document.getElementById('studentIdentityForm');
                    if (form) form.style.display = 'block';
                } else if (user && !s) {
                    // Firebase 有登入但本地沒資料，嘗試自動找回
                    const profile = await findProfileByEmail(user.email);
                    if (profile) {
                        localStorage.setItem('studentProfile', JSON.stringify(profile));
                        checkStudentLogin();
                    }
                }
            });
        });
    }
});
</script>

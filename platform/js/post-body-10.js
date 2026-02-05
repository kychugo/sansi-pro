// Post-Body Scripts 10
// =======================================================
// === [嚴厲版] 作家文粹：離開警報系統 (莫蘭迪極簡鎖定) ===
// =======================================================
const LeaveWarningSystem = {
    checkTimer: null,
    lockInterval: null,
    isLocked: false,
    leaveTimestamp: 0, 
    wasHiddenWhileLocked: false, // 標記是否在鎖定期間逃走

    vibratePattern: [400, 200, 400, 200, 400],

    init: function() {
        document.addEventListener('visibilitychange', () => {
            this.handleVisibilityChange();
        });
    },

    handleVisibilityChange: function() {
        if (typeof focusMonitorState === 'undefined' || !focusMonitorState.isActive) {
            this.resetSystem();
            return;
        }
        
        const detailView = document.getElementById('featuredDetailView');
        if (!detailView || detailView.style.display === 'none') {
            this.resetSystem();
            return;
        }

        if (document.hidden) {
            // --- 【離開頁面時】 ---
            this.leaveTimestamp = Date.now();
            console.log("📍 [Leave] 離開頁面");

            if (this.isLocked) {
                // 如果已經在鎖定中，只要離開一秒都算違規
                this.wasHiddenWhileLocked = true;
                // 離開時停止當前計時器，回來再重算
                if (this.lockInterval) clearInterval(this.lockInterval);
            } else {
                // 尚未鎖定，啟動 5 秒寬限計時
                if (this.checkTimer) clearTimeout(this.checkTimer);
                this.checkTimer = setTimeout(() => {
                    this.triggerAlarmSound(); 
                }, 5000);
            }
        } else {
            // --- 【回到頁面時】 ---
            console.log("📍 [Back] 回到頁面");
            
            // ★ 關鍵：解鎖 iOS 音訊管道
            if (typeof SansiAudio !== 'undefined') {
                SansiAudio.unlock();
            }

            if (this.isLocked) {
                // 情況 A：在鎖定期間逃走後回來
                if (this.wasHiddenWhileLocked) {
                    console.log("🚨 [Violation] 鎖定中再次離開，重新開始 10 秒懲罰");
                    this.wasHiddenWhileLocked = false;
                    
                    // 重新來過：重置聲音與計時
                    this.stopSoundOnly();
                    this.triggerAlarmSound();
                    this.enforcePenalty(); 
                } else {
                    // 只是正常的頁面刷新或誤觸，繼續倒數
                    this.enforcePenalty(); 
                }
            } else {
                // 情況 B：尚未鎖定時的回來判定
                const now = Date.now();
                const timeAway = now - this.leaveTimestamp;
                
                if (this.leaveTimestamp > 0 && timeAway > 5000) {
                    console.log("🚨 [Violation] 離開超過 5 秒，觸發鎖定");
                    this.triggerAlarmSound();
                    this.enforcePenalty();
                } else {
                    // 5 秒內回來，取消警報
                    this.stopSoundOnly();
                }
            }
            this.leaveTimestamp = 0; 
        }
    },

    triggerAlarmSound: function() {
        console.log("🔊 播放警告音與震動");
        if (typeof SansiAudio !== 'undefined') {
            SansiAudio.stop('leave_warning'); // 先強制停止舊的
            SansiAudio.play('leave_warning', true); // 循環播放
        }
        if (navigator.vibrate) {
            navigator.vibrate(this.vibratePattern);
        }
    },

    enforcePenalty: function() {
        const overlay = document.getElementById('penaltyLockOverlay');
        const countSpan = document.getElementById('penaltyCountdown');
        if (!overlay || !countSpan) return;
        
        overlay.style.display = 'flex';
        this.isLocked = true;
        
        // ★ 強制重置為 10 秒
        let timeLeft = 10;
        countSpan.innerText = timeLeft;
        
        if (this.lockInterval) clearInterval(this.lockInterval);
        
        this.lockInterval = setInterval(() => {
            timeLeft--;
            if (timeLeft < 0) timeLeft = 0; // 防止出現負數
            countSpan.innerText = timeLeft;
            
            // 鎖定期間每 2 秒補一次震動，確保威懾力
            if (timeLeft % 2 === 0 && navigator.vibrate) {
                navigator.vibrate(this.vibratePattern);
            }

            if (timeLeft <= 0) {
                this.releasePenalty();
            }
        }, 1000);
    },

    releasePenalty: function() {
        const overlay = document.getElementById('penaltyLockOverlay');
        if (overlay) overlay.style.display = 'none';
        
        if (this.lockInterval) { clearInterval(this.lockInterval); this.lockInterval = null; }
        
        this.isLocked = false;
        this.wasHiddenWhileLocked = false;
        if (navigator.vibrate) navigator.vibrate(0);
        this.stopSoundOnly();
        
        // 重置防睡監察活動時間
        if (typeof focusMonitorState !== 'undefined') {
            focusMonitorState.lastActivityTime = Date.now();
        }
    },

    stopSoundOnly: function() {
        if (typeof SansiAudio !== 'undefined') {
            SansiAudio.stop('leave_warning');
        }
        if (this.checkTimer) { clearTimeout(this.checkTimer); this.checkTimer = null; }
    },

    resetSystem: function() {
        this.stopSoundOnly();
        this.releasePenalty();
        this.leaveTimestamp = 0;
        this.wasHiddenWhileLocked = false;
    }
};

// 啟動監聽
document.addEventListener('DOMContentLoaded', () => {
    LeaveWarningSystem.init();
});
</script>

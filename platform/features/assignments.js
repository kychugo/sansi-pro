/**
 * ============================================================================
 * ASSIGNMENTS & HOMEWORK SYSTEM
 * ============================================================================
 * Manages student assignment tracking, submission, and teacher feedback
 * 
 * Features:
 * - Real-time assignment monitoring
 * - Pending assignment badge notifications
 * - Assignment listing with lazy loading
 * - Assignment submission to Firebase
 * - Teacher feedback display
 * - Submission status tracking
 * 
 * Dependencies:
 * - Firebase Realtime Database
 * - IndexedDB (for local history)
 * - Student profile in localStorage
 * - DOM elements: assignmentList, notifBadge, studentCloudModal
 * ============================================================================
 */

// ============================================================================
// GLOBAL VARIABLES
// ============================================================================

// Active listeners for real-time Firebase updates
let activeListeners = {
    assignments: null,
    submissions: {}
};

// Global reference for pending assignment monitor
let pendingMonitorRef = null;

// Notification tracking to prevent duplicates
let notifiedIds = [];

// Assignment pagination
let allAssignmentTasks = []; // Full list of assignments
let currentLoadedCount = 0;  // How many assignments are currently rendered
const BATCH_SIZE = 5;        // Load 5 assignments at a time

// ============================================================================
// PENDING ASSIGNMENTS MONITOR
// ============================================================================

/**
 * Monitor pending assignments and show badge when student has unsubmitted work
 * Called when student logs in or page loads
 */
function monitorPendingAssignments() {
    const s = JSON.parse(localStorage.getItem('studentProfile'));
    const badge = document.getElementById('notifBadge');
    
    // Exit if no login data or badge element
    if (!s || !badge) return;

    // Remove previous listener to avoid duplicates
    if (pendingMonitorRef) {
        pendingMonitorRef.off();
    }

    // Set up listener for student's class assignments
    pendingMonitorRef = database.ref(`assignments/${s.grade}/${s.class}`);

    pendingMonitorRef.on('value', async (snapshot) => {
        const assignments = snapshot.val();
        
        // Hide badge if no assignments exist
        if (!assignments) {
            badge.style.display = 'none';
            return;
        }

        const assignmentKeys = Object.keys(assignments);
        let hasPending = false;

        // Check submission status for each assignment in parallel
        const checkPromises = assignmentKeys.map(async (key) => {
            // Check if student has submitted this assignment
            const subSnap = await database.ref(`assignments_submissions/${key}/${s.name}`).once('value');
            return subSnap.exists(); 
        });

        const results = await Promise.all(checkPromises);

        // If any assignment is not submitted (false), mark as having pending work
        if (results.includes(false)) {
            hasPending = true;
        }

        // Update UI badge
        if (hasPending) {
            badge.style.display = 'block';
            badge.title = "您有未繳交的課業！";
        } else {
            badge.style.display = 'none';
        }
    });
}

// ============================================================================
// SUBMISSION STATUS MONITORING
// ============================================================================

/**
 * Monitor individual assignment submission for teacher feedback
 * Shows notification when teacher returns graded work
 */
function monitorSubmissionStatus(assignmentId, studentName, topicTitle) {
    // Skip if already monitoring this assignment
    if (activeListeners.submissions[assignmentId]) return;

    const submissionPath = `assignments_submissions/${assignmentId}/${studentName}`;
    const subRef = database.ref(submissionPath);

    // Store reference for later cleanup
    activeListeners.submissions[assignmentId] = subRef;

    subRef.on('value', (snapshot) => {
        const myWork = snapshot.val();
        
        // Check if work has been returned with feedback
        if (myWork && myWork.teacherFeedback && myWork.teacherFeedback.status === 'returned') {
            // Generate unique feedback ID using timestamp
            const feedbackId = "fb_" + assignmentId + "_" + myWork.teacherFeedback.timestamp;
            
            // Show notification if not already seen
            if (!notifiedIds.includes(feedbackId)) {
                showSansiNotif('returned', myWork.title || topicTitle || "課業", feedbackId);
            }
        }
    });
}

// ============================================================================
// ASSIGNMENT LOADING (WITH REAL-TIME SYNC)
// ============================================================================

/**
 * Load assignments for student's class with real-time updates
 * Uses Firebase .on() listener for live sync
 */
async function loadAssignments(grade, cls) {
    const listDiv = document.getElementById('assignmentList');
    
    // Show loading indicator on first load
    if (listDiv.innerHTML.trim() === "" || listDiv.innerHTML.includes("載入中")) {
        listDiv.innerHTML = '<div style="text-align:center; padding:20px; color:#8fa398;"><i class="fas fa-circle-notch fa-spin"></i> 正在更新課業狀態...</div>';
    }
 
    try {
        const path = `assignments/${grade}/${cls}`;
        
        // Use .on() for real-time listening
        // Advantage: Only downloads delta changes, not entire dataset each time
        database.ref(path).on('value', (snapshot) => {
            const assignmentsData = snapshot.val();
 
            if (!assignmentsData) {
                listDiv.innerHTML = '<div style="text-align:center; padding:20px; color:#666;">目前沒有新課業</div>';
                return;
            }
 
            // Update global variable for pagination
            allAssignmentTasks = Object.entries(assignmentsData).sort((a, b) => b[1].timestamp - a[1].timestamp);
            
            // Re-render list with latest submission status
            currentLoadedCount = 0;
            listDiv.innerHTML = '';
            loadNextBatchAssignments();
        });
 
    } catch (error) {
        console.error("課業載入失敗:", error);
        listDiv.innerHTML = '<div style="text-align:center; padding:20px; color:#d69a92;">連線問題，無法更新課業狀態 (但您仍可查看歷史紀錄)</div>';
    }
}

// ============================================================================
// LAZY LOADING (BATCH LOADING)
// ============================================================================

/**
 * Load next batch of assignments (5 at a time)
 * Improves performance for students with many assignments
 */
async function loadNextBatchAssignments() {
    const listDiv = document.getElementById('assignmentList');
    const s = JSON.parse(localStorage.getItem('studentProfile'));
    
    // Check if more data exists
    if (currentLoadedCount >= allAssignmentTasks.length) {
        return; 
    }

    // Show loading indicator at bottom of list
    let loadingDiv = document.createElement('div');
    loadingDiv.id = 'batchLoading';
    loadingDiv.style.cssText = "text-align:center; padding:10px; color:#aaa; font-size:0.9em;";
    loadingDiv.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> 讀取中...';
    listDiv.appendChild(loadingDiv);

    // Slice next batch (e.g., 0-5, 5-10, etc.)
    const nextBatch = allAssignmentTasks.slice(currentLoadedCount, currentLoadedCount + BATCH_SIZE);

    try {
        // Parallel query: Download submission status for this batch only
        const results = await Promise.all(nextBatch.map(async ([key, task]) => {
            const subPath = `assignments_submissions/${key}/${s.name}`;
            const subSnap = await database.ref(subPath).once('value');
            const submission = subSnap.val(); 
            return { key, task, submission };
        }));

        // Remove loading indicator
        if (loadingDiv) loadingDiv.remove();

        // Render this batch (append mode)
        renderAssignmentList(results, false, true);

        // Update counter
        currentLoadedCount += nextBatch.length;

        // Show "Load More" button if needed
        manageLoadMoreButton();

    } catch (error) {
        console.error("分批讀取錯誤", error);
        if (loadingDiv) loadingDiv.innerHTML = "讀取失敗，請重試";
    }
}

/**
 * Manage "Load More" button visibility
 */
function manageLoadMoreButton() {
    const listDiv = document.getElementById('assignmentList');
    
    // Remove existing button
    const existingBtn = document.getElementById('loadMoreAssignmentsBtn');
    if (existingBtn) existingBtn.remove();

    // Add button if more data remains
    if (currentLoadedCount < allAssignmentTasks.length) {
        const remaining = allAssignmentTasks.length - currentLoadedCount;
        
        const btn = document.createElement('button');
        btn.id = 'loadMoreAssignmentsBtn';
        btn.style.cssText = "width:100%; padding:10px; margin-top:10px; background:#e0e0e0; color:#555; border:none; border-radius:8px; cursor:pointer; font-weight:bold;";
        btn.innerHTML = `顯示較舊的課業 (${remaining})`;
        
        btn.onclick = function() {
            this.disabled = true; // Prevent double-click
            loadNextBatchAssignments();
        };

        listDiv.appendChild(btn);
    }
}

// ============================================================================
// ASSIGNMENT LIST RENDERING
// ============================================================================

/**
 * Render assignment list with Morandi color scheme
 * @param {Array} dataArray - Array of assignment data {key, task, submission}
 * @param {boolean} isSyncing - Whether currently syncing
 * @param {boolean} isAppend - Whether to append or replace list
 */
function renderAssignmentList(dataArray, isSyncing, isAppend = false) {
    const listDiv = document.getElementById('assignmentList');
    
    // Only clear list if not in append mode
    if (!isAppend) {
        listDiv.innerHTML = '';
    }

    // Morandi color palette
    const morandiPalette = ['#8fa398', '#94a7b5', '#b6a6ca', '#d69a92', '#c7b299'];

    if (isSyncing) {
        // Show loading indicator if list is empty
        if (listDiv.children.length === 0) {
            listDiv.innerHTML += `<div>...</div>`;
        }
        return;
    }

    dataArray.forEach((item, index) => {
        const key = item.key; // Unique Firebase key for assignment
        
        // ★ DUPLICATE PREVENTION: Skip if card already exists
        if (document.getElementById(`task-card-${key}`)) {
            return;
        }

        const task = item.task;
        const submission = item.submission;
        
        // Rotate colors for visual variety
        const themeColor = morandiPalette[index % morandiPalette.length];

        let uiClass = '';
        let statusIcon = '';
        let statusText = '';
        let clickHandler = null; 
        let dateDisplay = new Date(task.timestamp).toLocaleDateString('zh-HK', {month:'2-digit', day:'2-digit'});

        // Determine status: returned, submitted, or pending
        if (submission && submission.teacherFeedback && submission.teacherFeedback.status === 'returned') {
            uiClass = 'status-returned';
            statusIcon = '<i class="fas fa-envelope-open-text"></i>';
            statusText = '查看評語';
            submission.topic = task.topic; 
            const submissionStr = encodeURIComponent(JSON.stringify(submission));
            clickHandler = function() { showTeacherFeedback(submissionStr); };
        }
        else if (submission) {
            uiClass = 'status-submitted';
            statusIcon = '<i class="fas fa-check-circle" style="color:#5e7067;"></i>';
            statusText = '<span style="color:#5e7067;">已繳交</span>';
            submission.topic = task.topic;
            submission.isPending = true; 
            const submissionStr = encodeURIComponent(JSON.stringify(submission));
            clickHandler = function() { showTeacherFeedback(submissionStr); };
        }
        else {
            uiClass = 'status-pending';
            statusIcon = '<i class="fas fa-pen"></i>'; 
            statusText = '未繳交';
            clickHandler = function() { goToHistoryForAssignment(task.topic); };
        }

        // Create card element
        const cardDiv = document.createElement('div');
        
        // ★ UNIQUE ID: Set unique ID for duplicate check
        cardDiv.id = `task-card-${key}`; 
        
        cardDiv.className = `task-card ${uiClass}`;
        cardDiv.onclick = clickHandler; 
        
        cardDiv.style.setProperty('--theme-color', themeColor);
        cardDiv.innerHTML = `
            <div class="task-info">
               <div class="task-topic" style="color: ${themeColor};">${task.topic}</div>
                <div class="task-meta">
                    <span class="task-type-tag" style="background-color: ${themeColor}; color: white; border:none;">${task.type}</span>
                    <span><i class="far fa-clock"></i> ${dateDisplay}</span>
                </div>
            </div>
            <div class="task-status">
                ${statusIcon} <span style="margin-left:5px;">${statusText}</span>
            </div>
        `;
        
        listDiv.appendChild(cardDiv);
    });
}

// ============================================================================
// ASSIGNMENT NAVIGATION
// ============================================================================

/**
 * Navigate from unsubmitted assignment to history records
 * Closes cloud modal and opens history container
 */
function goToHistoryForAssignment(topic) {
    // Close student cloud center modal
    document.getElementById('studentCloudModal').style.display = 'none';
    
    // Open history container (shows five category cards)
    openHistoryContainer();
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'instant' });
}

// ============================================================================
// ASSIGNMENT SUBMISSION
// ============================================================================

/**
 * Submit assignment to Firebase
 * Uploads student's work from IndexedDB to Firebase assignments_submissions path
 */
async function confirmAndSubmitAssignment(assignmentId, assignmentTopic) {
    // Get record ID from modal
    const recordId = parseInt(document.getElementById('pendingRecordId').value);
    const s = JSON.parse(localStorage.getItem('studentProfile'));
 
    if (!confirm(`確定要將這份紀錄繳交為「${assignmentTopic}」嗎？\n(注意：這將會覆蓋你之前對此功課的繳交內容)`)) return;
 
    try {
        const db = await openHistoryDB();
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(recordId);
 
        request.onsuccess = function(e) {
            const record = e.target.result;
            
            if (!record) return alert("錯誤：找不到原始紀錄 (ID: " + recordId + ")，請重新打開紀錄。");
 
            // Upload path
            const submitPath = `assignments_submissions/${assignmentId}/${s.name}`;
            
            // Show loading
            const modalBody = document.getElementById('activeAssignmentList');
            modalBody.innerHTML = '<div style="text-align:center; color:#2A9689; padding:20px;"><i class="fas fa-circle-notch fa-spin fa-2x"></i><br><br>正在呈交給老師...</div>';
 
            database.ref(submitPath).set({
                ...record, // Include revised userContent and aiContent
                submittedAt: new Date().toLocaleString('zh-HK'),
                studentName: s.name,
                studentClass: s.class,
                studentGrade: s.grade
            }, async (error) => {
                if (error) {
                    alert("繳交失敗：" + error.message);
                    document.getElementById('submitAssignmentModal').style.display = 'none';
                } else {
                    alert(`🎉 繳交成功！\n\n已成功將此紀錄呈交為「${assignmentTopic}」。`);
                    document.getElementById('submitAssignmentModal').style.display = 'none';
                    
                    // Sync history (this will change IDs)
                    await syncHistoryToFirebase(true);
 
                    // ★ KEY FIX: Refresh background list so card IDs update
                    if (typeof currentSubFunctionFilter !== 'undefined' &&
                        document.getElementById('historyLevel3').style.display !== 'none') {
                        
                        const themeIndex = typeof currentThemeIndex !== 'undefined' ? currentThemeIndex : 1;
                        
                        // Silently refresh list (implementation in history system)
                        // loadSubFunctionCards(themeIndex, currentSubFunctionFilter, false);
                    }
                }
            });
        };
    } catch (error) {
        console.error("提交錯誤:", error);
        alert("繳交失敗，請稍後再試");
    }
}

// ============================================================================
// TEACHER FEEDBACK DISPLAY
// ============================================================================

/**
 * Display teacher feedback in modal
 * Shows graded work with teacher comments and scoring
 */
function showTeacherFeedback(submissionStr) {
    let record;
    try {
        record = JSON.parse(decodeURIComponent(submissionStr));
    } catch (e) {
        console.error("解析失敗", e);
        alert("資料格式錯誤");
        return;
    }

    // Implementation would display feedback modal
    // This function is called from renderAssignmentList
    // Full implementation in main index2.html
}

// ============================================================================
// ACTIVE LISTENER CLEANUP
// ============================================================================

/**
 * Clean up Firebase listeners when student logs out
 * Prevents memory leaks and duplicate listeners
 */
function cleanupAssignmentListeners() {
    // Remove assignments listener
    if (activeListeners.assignments) {
        database.ref(`assignments/${grade}/${cls}`).off();
        activeListeners.assignments = null;
    }

    // Remove all submission listeners
    Object.keys(activeListeners.submissions).forEach(key => {
        if (activeListeners.submissions[key]) {
            activeListeners.submissions[key].off();
            delete activeListeners.submissions[key];
        }
    });

    // Remove pending monitor
    if (pendingMonitorRef) {
        pendingMonitorRef.off();
        pendingMonitorRef = null;
    }
}

// ============================================================================
// EXPORT (if using modules)
// ============================================================================

// If using ES6 modules, export functions:
// export { 
//     monitorPendingAssignments, 
//     monitorSubmissionStatus,
//     loadAssignments, 
//     loadNextBatchAssignments,
//     renderAssignmentList,
//     goToHistoryForAssignment,
//     confirmAndSubmitAssignment,
//     cleanupAssignmentListeners
// };

# System Extraction Summary - Phase 3

## Overview
This document summarizes the additional systems extracted from index2.html into organized, documented modules.

## Extracted Systems

### 1. **platform/ui/custom-alerts.js** (5.6 KB)
Custom alert and notification system for the application.

**Key Features:**
- `showSansiNotif()` - Display assignment notifications with Morandi colors
- `openModal()` / `closeModal()` - Modal dialog management
- `showLoading()` / `hideLoading()` - Loading overlay system
- `updateLoadingMessage()` - Update loading text without hiding overlay
- Notification auto-removal after 8 seconds
- Slide-in/out animations

**Dependencies:**
- Firebase for notifications
- DOM elements: notifContainer, various modals
- Global variable: notifiedIds array

**Integration Notes:**
- Called by assignment system when new work or feedback arrives
- Uses Morandi color palette: ['#8fa398', '#94a7b5', '#b6a6ca', '#d69a92', '#c7b299']
- Prevents duplicate notifications via uniqueId tracking

---

### 2. **platform/ui/cat-menu.js** (7.4 KB)
Cat character (Live2D model) selection and management system.

**Key Features:**
- `openCatMenu()` - Display cat selection modal
- `closeCatMenu()` - Close modal on overlay click
- `selectCatMode()` - Load cat mode: 'none', 'hijiki', 'tororo', 'both'
- `loadModelToContainer()` - Load Live2D model with IndexedDB caching
- `forceInitialPosition()` - Position cats at bottom-right corner
- `repositionCats()` - Keep cats within screen bounds (allows half-out)
- `restoreCatMode()` - Restore saved mode from localStorage

**Dependencies:**
- PIXI.js and PIXI.live2d for rendering
- IndexedDB for model caching
- DOM elements: catSelectionModal, sideMenu, canvas
- Global variables: isCatLoading, modelContainer, CANVAS_ID, MODEL_PATH_*

**Integration Notes:**
- Responsive scaling based on screen size (mobile: 0.10, tablet/desktop: 0.15)
- Auto-closes side menu when opening
- Fade-in animation on model load
- Cat mode persisted in localStorage as 'sansi_cat_mode'

---

### 3. **platform/features/assignments.js** (19.3 KB)
Comprehensive assignment and homework management system.

**Key Features:**
- `monitorPendingAssignments()` - Real-time monitoring with badge notification
- `monitorSubmissionStatus()` - Track teacher feedback and return status
- `loadAssignments()` - Load assignments with Firebase .on() listener
- `loadNextBatchAssignments()` - Lazy loading (5 assignments at a time)
- `renderAssignmentList()` - Render with Morandi color scheme and status icons
- `goToHistoryForAssignment()` - Navigate from assignment to history
- `confirmAndSubmitAssignment()` - Submit work to Firebase
- `showTeacherFeedback()` - Display graded work modal
- `cleanupAssignmentListeners()` - Remove Firebase listeners on logout

**Dependencies:**
- Firebase Realtime Database
- IndexedDB for local history (STORE_NAME)
- Student profile in localStorage
- DOM elements: assignmentList, notifBadge, studentCloudModal

**Firebase Paths:**
- `assignments/{grade}/{class}` - Teacher-assigned work
- `assignments_submissions/{assignmentId}/{studentName}` - Student submissions

**Integration Notes:**
- Uses batch loading (BATCH_SIZE = 5) for performance
- Three assignment states: pending (未繳交), submitted (已繳交), returned (已發還)
- Duplicate prevention via unique card IDs: `task-card-${key}`
- Calls showSansiNotif() for new assignments and returned feedback
- Auto-syncs with Firebase on data changes

---

### 4. **platform/ui/side-menu.js** (9.5 KB)
Hamburger side menu with context-aware button visibility.

**Key Features:**
- `initializeSideMenu()` - Set up event listeners
- `openSideMenu()` - Open with context-aware buttons
- `closeSideMenu()` - Close menu
- `isSideMenuOpen()` - Check menu state
- `openToolsFromSideMenu()` - Navigate to tools page
- `updateSideMenuContext()` - Update button visibility based on current page
- `closeSideMenuForModal()` - Auto-close when opening modals
- `highlightMenuItem()` - Visual feedback on click
- `toggleMenuItem()` - Show/hide menu items

**Dependencies:**
- DOM elements: sideMenuToggle, sideMenu, sideMenuClose, sideMenuHomeBtn, sideMenuCloudBtn
- Various page containers for context detection

**Context Detection Logic:**
- Main page: Hide home button, show cloud button
- Tools page: Show both buttons
- Cloud page: Show home button, hide cloud button
- Other pages: Show both buttons

**Integration Notes:**
- Auto-closes on menu item click or outside click
- Prevents propagation to avoid conflicts
- Uses classList.contains('active') for state tracking
- Menu items have class '.side-menu-item'

---

## File Organization

```
platform/
├── features/
│   └── assignments.js         # Assignment & homework system
└── ui/
    ├── custom-alerts.js       # Alert & notification system
    ├── cat-menu.js            # Cat character selection
    └── side-menu.js           # Hamburger side menu
```

---

## Global Variables Used

### Assignments System:
- `activeListeners` - Firebase listener references
- `pendingMonitorRef` - Assignment monitor reference
- `notifiedIds` - Notification tracking array
- `allAssignmentTasks` - Full assignment list
- `currentLoadedCount` - Pagination counter
- `BATCH_SIZE` - Assignments per batch (5)

### Cat Menu System:
- `isCatLoading` - Prevent double-click
- `modelContainer` - PIXI container for models
- `CANVAS_ID` - Canvas element ID
- `MODEL_PATH_HIJIKI` - Hijiki model path
- `MODEL_PATH_TORORO` - Tororo model path

### Alert System:
- `notifiedIds` - Shared with assignments

---

## Key Design Patterns

1. **Real-time Sync**: Uses Firebase .on() listeners for live updates
2. **Lazy Loading**: Batch loading with "Load More" button for performance
3. **Duplicate Prevention**: Unique IDs and existence checks
4. **Context Awareness**: Dynamic button visibility based on current page
5. **Graceful Degradation**: Fallback to direct loading if cache fails
6. **Auto-cleanup**: Removes listeners on logout to prevent memory leaks

---

## Testing Checklist

- [ ] Assignment badge appears when unsubmitted work exists
- [ ] Assignment list loads in batches of 5
- [ ] Assignment submission syncs to Firebase
- [ ] Teacher feedback notifications appear
- [ ] Cat menu opens and closes properly
- [ ] Cat models load with caching
- [ ] Side menu context buttons show/hide correctly
- [ ] Side menu closes on outside click
- [ ] Loading overlays display during async operations
- [ ] Notifications auto-dismiss after 8 seconds

---

## Next Steps

These systems are ready for integration into index2.html via script tags:

```html
<!-- UI Systems -->
<script src="platform/ui/custom-alerts.js"></script>
<script src="platform/ui/side-menu.js"></script>
<script src="platform/ui/cat-menu.js"></script>

<!-- Feature Systems -->
<script src="platform/features/assignments.js"></script>
```

**Note**: All systems are currently in global scope. For ES6 module support, uncomment the export statements at the bottom of each file.

---

## Total Lines Extracted
- custom-alerts.js: ~190 lines
- cat-menu.js: ~240 lines
- assignments.js: ~580 lines
- side-menu.js: ~330 lines
- **Total: ~1,340 lines of organized, documented code**

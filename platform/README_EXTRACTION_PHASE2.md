# JavaScript Module Extraction - Phase 2

## Overview
This document describes the JavaScript modules extracted from `index2.html` during Phase 2 of the modularization effort.

## Newly Extracted Modules

### 1. Tools Manager (`platform/tools/tools-manager.js`)
**Size:** 3.6 KB  
**Purpose:** Manages the tools overview interface (語薈/toolsContainer2)

#### Exported Functions
- `window.openToolsFromSideMenu()` - Opens tools container from side menu

#### Key Features
- Opens/closes tools container (toolsContainer2)
- Manages fullscreen tool interface transitions
- Handles button state updates (home button, cloud button, etc.)
- Integrates with connector drawing system
- Manages side menu interactions
- Handles 語弈錄 toggle functionality

#### Dependencies
- Requires `returnToHome()` from navigation.js
- Uses `drawConnectors()` if available (from SVG connector system)
- Expects `debounceTimer` global variable

---

### 2. Navigation (`platform/ui/navigation.js`)
**Size:** 3.9 KB  
**Purpose:** Core navigation functions for returning to homepage

#### Exported Functions
- `window.returnToHome()` - Complete homepage restoration

#### Key Features
- Restores homepage background from scenes object
- Closes all modals and content containers
- Resets history container to first level
- Shows/hides appropriate UI elements (title, menu, DSE countdown, etc.)
- Manages button visibility states
- Handles scroll position reset
- Closes side menu automatically
- Integrates with save button system

#### Manages These Containers
- writingContainer
- readingContainer
- booksContainer
- expandContainer
- argumentContainer
- historyContainer
- toolsContainer2
- studentCloudModal
- featuredContainer

---

### 3. Music Player (`platform/media/music-player.js`)
**Size:** 7.2 KB  
**Purpose:** Background music player with lazy loading optimization

#### Exported Functions
- `window.toggleMusicPlayer()` - Show/hide music player
- `initMusicPlayer()` - Internal lazy initialization

#### Data Structures
```javascript
musicPlaylist = [
    { name: "song name", url: "song url" }
    // ... 26 songs total
]
```

#### Key Features
- **Lazy Loading:** Only initializes on first use
- Dynamic playlist option generation
- Play/pause control
- Progress bar with seek functionality
- Auto-play next song (next mode)
- Loop single song (loop mode)
- Audio event handling (timeupdate, ended, canplay)
- Closes side menu when toggled

#### State Variables
- `musicPlayerInitialized` - Tracks if player is initialized
- `isPlaying` - Current playback state
- `currentMusic` - Currently selected music URL

---

## Integration Guide

### Loading Order
These modules should be loaded in the following order in `index2.html`:

```html
<!-- Phase 1 modules -->
<script src="platform/js/firebase-config.js"></script>
<script src="platform/js/storage.js"></script>
<script src="platform/js/utils.js"></script>
<script src="platform/js/api.js"></script>
<script src="platform/tools/notifications.js"></script>
<script src="platform/tools/rag-search.js"></script>

<!-- Phase 2 modules - UI/Navigation -->
<script src="platform/ui/navigation.js"></script>

<!-- Phase 2 modules - Media -->
<script src="platform/media/music-player.js"></script>

<!-- Phase 2 modules - Tools -->
<script src="platform/tools/tools-manager.js"></script>

<!-- Mode-specific modules -->
<script src="platform/js/writing-mode.js"></script>
<script src="platform/js/reading-mode.js"></script>
<script src="platform/js/books-mode.js"></script>
<script src="platform/js/expand-mode.js"></script>
<script src="platform/js/argument-mode.js"></script>
<script src="platform/js/live2d-manager.js"></script>
```

### Global Dependencies
These modules expect the following to exist:
- `scenes` object (for background images)
- `hideAllSaveHtmlButtons()` function
- DOM elements with specific IDs (see each module)

### DOM Element Requirements

#### Tools Manager needs:
- `#sideMenu`, `#sideMenuToggle`
- `#expandToolsBtn2`, `#closeToolsBtn2`
- `#toolsContainer2`
- `#historyContainer`, `#studentCloudModal`, `#featuredContainer`
- `#homeBtn`, `#sideMenuHomeBtn`, `#sideMenuCloudBtn`
- `#yuyilu-toggle`, `#yuyilu-grades`

#### Navigation needs:
- All major container IDs
- `#outline-editor-modal`
- `#historyModal`, `#historyLevel1Wrapper`, `#historyLevel2`, `#historyLevel3`, `#historyBreadcrumb`
- `.title-container`, `#hitokoto-container`, `#mainMenuBox`, `#toolsBox`
- `#dse-countdown-box`
- `.anime-card` elements

#### Music Player needs:
- `#music-player`
- `#audio` (HTML5 audio element)
- `#play-pause`, `#music-select`
- `#progress-bar-music`, `#play-mode`
- `#hide-player`

---

## Code Quality Improvements

### From Inline to Modular
- **Before:** All code in `<script>` tags in HTML
- **After:** Organized modules with clear responsibilities

### Benefits Achieved
1. **Better Organization:** Related functions grouped together
2. **Reusability:** Can be imported by other pages
3. **Maintainability:** Easier to find and update specific features
4. **Performance:** Lazy loading for music player
5. **Testing:** Modules can be tested independently

---

## Remaining Work in index2.html

### Large Code Blocks Still Inline

1. **History System** (~1000+ lines)
   - History container management
   - Record rendering and filtering
   - Chart rendering (radar charts)
   - Date search and navigation
   - Title editing
   
2. **Student System** (~700+ lines)
   - Login modal and authentication
   - Student profile management
   - Assignment loading and display
   - Cloud sync functions
   - Badge notifications

3. **Featured Articles (文萃)** (~1200+ lines)
   - Article list and bookmarks
   - Article detail display
   - Slow reader mode
   - Focus monitor system
   - CSV parsing and rendering

4. **Modals & Preview** (~500+ lines)
   - Preview modal for tools
   - Video modal
   - Text library data
   - Modal editor logic

5. **Miscellaneous** (~800+ lines)
   - Report generation
   - One-minute timer
   - Presence system
   - Various UI utilities

### Suggested Next Phase

Create these additional modules:
- `platform/history/history-manager.js`
- `platform/student/student-auth.js`
- `platform/student/assignments.js`
- `platform/reading/featured-articles.js`
- `platform/ui/modals.js`
- `platform/reports/report-generator.js`

---

## File Structure

```
platform/
├── js/
│   ├── api.js              (Phase 1)
│   ├── argument-mode.js    (Phase 1)
│   ├── books-mode.js       (Phase 1)
│   ├── expand-mode.js      (Phase 1)
│   ├── firebase-config.js  (Phase 1)
│   ├── live2d-manager.js   (Phase 1)
│   ├── reading-mode.js     (Phase 1)
│   ├── storage.js          (Phase 1)
│   ├── utils.js            (Phase 1)
│   └── writing-mode.js     (Phase 1)
├── tools/
│   ├── notifications.js    (Phase 1)
│   ├── rag-search.js       (Phase 1)
│   └── tools-manager.js    (Phase 2) ✨
├── ui/
│   └── navigation.js       (Phase 2) ✨
├── media/
│   └── music-player.js     (Phase 2) ✨
├── history/               (Future)
├── student/               (Future)
├── reading/               (Future)
└── reports/               (Future)
```

---

## Testing Checklist

After integrating these modules, verify:

### Tools Manager
- [ ] Side menu "語薈" button opens tools container
- [ ] Tools container shows correctly
- [ ] Close button returns to home
- [ ] 語弈錄 toggle works
- [ ] Connectors redraw on resize

### Navigation
- [ ] Return to home restores homepage
- [ ] All containers are hidden
- [ ] History container resets to level 1
- [ ] Main menu and title visible
- [ ] Save buttons hidden
- [ ] Scroll position resets

### Music Player
- [ ] Player toggles visibility
- [ ] First open initializes player
- [ ] Music selection works
- [ ] Play/pause functions
- [ ] Progress bar updates
- [ ] Next song auto-plays
- [ ] Loop mode works

---

## Notes

- All modules use `window.*` for global functions to maintain compatibility
- Event listeners use `DOMContentLoaded` to ensure elements exist
- Error checking added for missing DOM elements
- Console logging included for debugging
- Maintains original Chinese comments for context

## Author
Extracted as part of the modularization project for Sansi Pro platform.

## Date
February 5, 2025

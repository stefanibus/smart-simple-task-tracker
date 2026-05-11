// START  ==> WINID NORMALIZATION SYSTEM
function normalizeWinID(winID) {
  if (!winID || typeof winID !== 'string') return winID;

  let cleanWinID = winID.replace(/^win_/, '');
  // ALERT IF WE STILL HAVE DOUBLE win_ PREFIXES
  // This alert should NEVER fire now with the fixed getSafeWinID
  if (cleanWinID !== winID) {   // console.log(`🚨 DOUBLE win_ DETECTED!\nInput: ${winID}\nOutput: ${cleanWinID}`);
    alert(`🚨 DOUBLE win_ DETECTED!\nInput: ${winID}\nOutput: ${cleanWinID}`);
    console.log('🚨 DOUBLE win_ DETECTED! This should not happen anymore!');
    console.log('Input:', winID, 'Output:', cleanWinID);
    console.trace('📍 This indicates a logic error in getSafeWinID');
  }

  return cleanWinID;
}
// END  ==> WINID NORMALIZATION SYSTEM

function getSafeWinID(winID) {
  if (!winID) return generateNewWinID();
  // If it already has win_ prefix, return as-is (NO NORMALIZATION NEEDED)
  if (winID.startsWith('win_')) {
    return winID;
  }

  // Otherwise, add the prefix
  return `win_${winID}`;
}
function generateNewWinID() {
  return 'win_' + Math.random().toString(36).substring(2, 12);
};


// ===== MACHINE ID SYSTEM =====
const MACHINE_ID_KEY = 'sstt_mid';
const getMachineId = () => {
  let mid = localStorage.getItem(MACHINE_ID_KEY);
  if (!mid) {
    mid = 'mid_' + Math.random().toString(36).substring(2, 15);
    localStorage.setItem(MACHINE_ID_KEY, mid);
  }
  return mid;
};
const myMachineId = getMachineId();
let isImporting = false; // Prevents sync loops during import
// ===== END MACHINE ID SYSTEM =====

// Generate a unique ID for this window/tab - URL-FIRST approach
// This allows multiple task windows to coexist without interfering
const generateWindowId = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const urlWinId = getSafeWinID(urlParams.get('win'));

  // ALWAYS trust the URL for cross-device sync compatibility
  if (urlWinId) {
    const titleExists = localStorage.getItem(`pageTitle_${urlWinId}`);
    const detailsExists = localStorage.getItem(`details_${urlWinId}`);
    const urlTitle = urlParams.get('title');
    const urlDetails = urlParams.get('details');

    // If URL has content but no existing data, INITIALIZE with the URL winId
    if ((urlTitle || urlDetails) && !titleExists && !detailsExists) {
      if (urlTitle) {
        localStorage.setItem(`pageTitle_${urlWinId}`, urlTitle);
        localStorage.setItem(`timestamp_pageTitle_${urlWinId}`, Date.now().toString());
      }
      if (urlDetails) {
        localStorage.setItem(`details_${urlWinId}`, urlDetails);
        localStorage.setItem(`timestamp_details_${urlWinId}`, Date.now().toString());
      }
    }
    return urlWinId;
  }

  // Create new unique ID only if no URL identifier exists
  const newId = 'win_' + Math.random().toString(36).substr(2, 9);
  const tempURL = new URL(window.location);
  tempURL.searchParams.set('win', newId);
  tempURL.hash = '';
  window.history.replaceState({}, '', tempURL);
  return newId;
};


// Generate and store window ID
const windowId = generateWindowId();

// Define storage keys for this specific window/tab
// This prevents data collisions between multiple task windows
const TITLE_STORAGE_KEY = `pageTitle_${getSafeWinID(windowId)}`;
const DETAILS_STORAGE_KEY = `details_${getSafeWinID(windowId)}`;
const DUE_DATE_STORAGE_KEY = `dueDate_${getSafeWinID(windowId)}`;
const SYNC_TS_STORAGE_KEY = `sync_ts_${getSafeWinID(windowId)}`;
const LAST_SYNC_TIMESTAMP_KEY = `last_sync_ts_${getSafeWinID(windowId)}`;
const LAST_SYNC_MACHINE_KEY = `last_sync_mid_${getSafeWinID(windowId)}`;

const STORAGE_WARNING_THRESHOLD = 85; // to test Storage Warning function set to 0.1   
const STORAGE_CHECK_INTERVAL = 300000; // 5 minutes in milliseconds
const STORAGE_WARNING_COOLDOWN = 3600000; // 1 hour in milliseconds 

// Function to auto-expand textareas as user types
function autoExpand(textarea) {
  textarea.style.height = 'auto'; // Reset height
  textarea.style.height = textarea.scrollHeight + 'px'; // Expand to content
}


function calculateTotalStorageSize() {
  let totalSize = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    const value = localStorage.getItem(key);
    totalSize += key.length + (value ? value.length : 0); // REMOVE the * 2 // // No *2 needed
  }
  return totalSize;
}

function updateLastBackupDisplay(timestamp) {
  const existingDisplay = document.getElementById('lastBackupInfo');
  if (existingDisplay) {
    existingDisplay.remove();
  }

  if (!timestamp) {
    timestamp = localStorage.getItem('lastBackupTimestamp');
  }

  const backupSection = document.querySelector('.backup-section');
  if (!backupSection) {
    console.warn('Backup section not found in DOM');
    return;
  }

  const now = new Date();
  let diffHours = Infinity; // Treat "never backed up" as infinitely old
  let diffDays = Infinity;
  let backupDate = null;

  if (timestamp) {
    backupDate = new Date(timestamp);
    const diffTime = now - backupDate;
    diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  let ageMessage = 'Never backed up';
  if (timestamp) {
    if (diffHours < 24) {
      ageMessage = `${diffHours} hours ago`;
    } else {
      ageMessage = `${diffDays} days ago`;
    }
  }

  // Create display element
  const backupInfo = document.createElement('div');
  backupInfo.id = 'lastBackupInfo';
  const isOld = !timestamp || diffHours >= 24; // Never backed up counts as "old"

  backupInfo.style.cssText = `
    margin-top: 10px;
    padding: 8px;
    border-radius: 4px;
    font-size: 14px;
    background: ${isOld ? '#fff3cd' : '#d4edda'};
    border: 1px solid ${isOld ? '#ffeaa7' : '#c3e6cb'};
    color: ${isOld ? '#856404' : '#155724'};
  `;

  const storageSize = calculateTotalStorageSize();
  const storageMB = (storageSize / (1024 * 1024)).toFixed(2);
  const formattedDate = timestamp ? backupDate.toLocaleString() : 'Never';

  backupInfo.innerHTML = `
    <strong>Last backup:</strong> ${formattedDate}<br>
    <small>(${ageMessage})</small>
    <br><small>Current storage: ${storageMB} MB / 5 MB</small>
    ${isOld ? '<br>⚠️ ' + (timestamp ? 'Backup is over 24 hours old' : 'No backup ever created') : ''}
  `;

  backupSection.appendChild(backupInfo);

  // ⭐ FIXED: Show alert for never-backed-up OR over 24 hours
  if (!timestamp || diffHours >= 24) {
    showBackupWarning(timestamp ? diffHours : Infinity);
  }
}

function showBackupWarning(hoursOld) {
  const lastWarning = localStorage.getItem('lastBackupWarning');
  const now = new Date().getTime();

  let timeMessage;
  if (hoursOld === Infinity) {
    timeMessage = 'never (first time)';
  } else {
    const daysOld = Math.floor(hoursOld / 24);
    const remainingHours = hoursOld % 24;

    if (daysOld > 0) {
      timeMessage = `${daysOld} day${daysOld !== 1 ? 's' : ''}`;
      if (remainingHours > 0) {
        timeMessage += ` and ${remainingHours} hour${remainingHours !== 1 ? 's' : ''}`;
      }
    } else {
      timeMessage = `${hoursOld} hours`;
    }
  }

  if (!lastWarning || (now - parseInt(lastWarning)) > 3600000) {
    const message = hoursOld === Infinity
      ? `⚠️ First Backup Recommended\n\nYou've never created a backup. Consider creating your first backup to protect your data.`
      : `⚠️ Backup Warning\n\nYour last backup was ${timeMessage} old. Consider creating a new backup to protect your data.`;

    alert(message);
    localStorage.setItem('lastBackupWarning', now.toString());
  }
}





function checkStorageRegularly() {
  setInterval(() => {
    const totalSize = calculateTotalStorageSize();
    const usagePercentage = ((totalSize / (5 * 1024 * 1024)) * 100).toFixed(1);
    const usagePercentNum = parseFloat(usagePercentage);

    // Check cooldown BEFORE calling showSimpleStats
    const lastStorageWarning = localStorage.getItem('lastStorageWarning');
    const now = new Date().getTime();
    const lastWarningTime = lastStorageWarning ? parseInt(lastStorageWarning) : 0;
    const timeSinceLastWarning = now - lastWarningTime;

    if (usagePercentNum > STORAGE_WARNING_THRESHOLD &&
      (!lastStorageWarning || timeSinceLastWarning > STORAGE_WARNING_COOLDOWN)) {
      showSimpleStats();
    }
  }, STORAGE_CHECK_INTERVAL);
}

function showStorageWarning(usagePercentage, totalSizeMB) {
  try {
    const lastStorageWarning = localStorage.getItem('lastStorageWarning');
    const now = new Date().getTime();

    console.log('🔍 showStorageWarning called:', {
      usagePercentage,
      totalSizeMB,
      lastStorageWarning,
      now,
      shouldShow: !lastStorageWarning || (now - parseInt(lastStorageWarning)) > 3600000
    });

    // Safely parse the stored timestamp
    const lastWarningTime = lastStorageWarning ? parseInt(lastStorageWarning) : 0;

    // Check if cooldown period has passed (or never set)
    const timeSinceLastWarning = now - lastWarningTime;
    const shouldShowAlert = !lastStorageWarning || timeSinceLastWarning > STORAGE_WARNING_COOLDOWN;

    console.log('🔍 Cooldown Check:', {
      lastWarningTime,
      now,
      timeSinceLastWarning,
      shouldShowAlert
    });

    if (shouldShowAlert) {
      alert(`⚠️ Storage Warning\n\nYour localStorage is at ${usagePercentage}% capacity (${totalSizeMB} MB used).`);
      localStorage.setItem('lastStorageWarning', now.toString());
    }
  } catch (error) {
    console.error('Error in showStorageWarning:', error);
    // Fallback: show alert anyway
    alert(`⚠️ Storage Warning\n\nYour localStorage is at ${usagePercentage}% capacity (${totalSizeMB} MB used).`);
  }
}

function showSimpleStats() {
  // Remove existing stats if any
  const existingStats = document.getElementById('taskStats');
  if (existingStats) {
    existingStats.remove();
  }

  const sessions = [];

  // USE THE CORRECTED FUNCTION INSTEAD OF MANUAL CALCULATION
  const totalSize = calculateTotalStorageSize();

  // Count sessions separately if needed
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.startsWith('pageTitle_')) { // REMOVED 'win_' from pattern
      sessions.push(key);
    }
  }

  const totalSizeKB = (totalSize / 1024).toFixed(2);
  const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2);
  const usagePercentage = ((totalSize / (5 * 1024 * 1024)) * 100).toFixed(1);



  const statsElement = document.createElement('div');
  statsElement.id = 'taskStats';
  statsElement.style.cssText = `
        font-size: 12px;
        color: #666;
        margin-top: 10px;
        text-align: center;
        padding: 10px;
        border-top: 1px solid #eee;
        background: ${usagePercentage > 80 ? '#fff3cd' : '#f8f9fa'};
        border-radius: 4px;
      `;

  let sizeMessage = `Total tasks: ${sessions.length} | Storage: ${totalSizeKB} KB`;
  if (usagePercentage > 60) {
    sizeMessage += ` | ⚠️ ${usagePercentage}% of 5MB limit`;
  }

  statsElement.innerHTML = `
        <div>${sizeMessage}</div>
        ${usagePercentage > 80 ? '<div style="color: #dc3545; font-weight: bold; margin-top: 5px;">⚠️ Storage limit approaching!</div>' : ''}
      `;

  // Add to session management section
  const sessionManagement = document.querySelector('.session-management');
  sessionManagement.appendChild(statsElement);
  // console.log('🔍 showSimpleStats - usagePercentage:', usagePercentage);
  // Show warning alert if critically close to limit // as defined in STORAGE_WARNING_THRESHOLD 
  if (usagePercentage > STORAGE_WARNING_THRESHOLD) {
    // console.log('🔍 Calling showStorageWarning...');
    showStorageWarning(usagePercentage, totalSizeMB);
  }

  return totalSize;
}



// Main initialization when DOM is fully loaded
document.addEventListener('DOMContentLoaded', function () {
  // Get references to all DOM elements
  const titleTextarea = document.getElementById('enterNewTitle');
  const detailsTextarea = document.getElementById('enterNewDetails');
  const counter = document.getElementById('counter');
  const detailsCounter = document.getElementById('detailsCounter');
  const saveBackupBtn = document.getElementById('saveBackup');
  const loadBackupBtn = document.getElementById('loadBackup');
  const backupFile = document.getElementById('backupFile');
  const backupStatus = document.getElementById('backupStatus');
  const manualRefreshBtn = document.getElementById('manualRefresh');
  const dueDateInput = document.getElementById('taskDueDate');
  const daysIndicator = document.getElementById('daysIndicator');
  const sessionList = document.getElementById('sessionList');
  const titleHeading = document.getElementById('titleHeading');


  const TIMEOUTS = {
    DEBOUNCE: 1000,                // Input debouncing delay
    KEYSTROKE_REFRESH: 2000,       // Refresh after typing stops
    BACKUP_SUCCESS: 3000,          // Success message duration
    BACKUP_IMPORTANT: 30000,       // Important message duration
    UI_ANIMATION: 2000,            // Visual effect duration
    BACKGROUND_REFRESH: 30000,     // Background sync interval
  };

  const REQUIRED_FIELDS = [
    'id',               // Window ID (win_xxxxxxxxx)
    'title',            // Task title
    'details',          // Task details
    'titleTimestamp',   // When title was last updated
    'detailsTimestamp', // When details were last updated
    'dueDate'           // Due date (YYYY-MM-DD format or empty)
  ];

  let datePicker; // Will hold Pikaday instance
  let debounceTimer; // For delaying actions after typing
  let keystrokeRefreshTimer; // For refreshing after typing stops 
  let lastRefreshTime = Date.now(); // Track last refresh time
  let refreshInterval; // For periodic background refreshing

  // ... the rest of your existing initialization code ...



  // ===== SORTING FUNCTIONALITY ===== 
  let currentSort = 'none';


  function setSorting(sortType) {
    currentSort = sortType;

    // Update active state of buttons
    document.querySelectorAll('.sort-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-sort') === sortType);
    });

    // Reload sessions with new sorting
    loadSessions();
  }

  function applySorting(sessions) {
    switch (currentSort) {
      case 'updated':
        sessions.sort((a, b) => b.lastUpdated - a.lastUpdated);
        break;
      case 'title':
        sessions.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'none':
      default:
        sessions.sort((a, b) => a.storageIndex - b.storageIndex);
        break;
    }
  }




  // Add event listeners for sorting buttons
  document.addEventListener('click', function (e) {
    if (e.target.classList.contains('sort-btn')) {
      const sortType = e.target.getAttribute('data-sort');
      setSorting(sortType);
    }
  });


  // END SORTING FUNCTIONALITY =====


  // ===== PIKADAY DATE PICKER INITIALIZATION =====
  datePicker = new Pikaday({
    field: dueDateInput, // Connect to input field
    format: 'YYYY-MM-DD', // Use ISO format for consistency
    onSelect: function (date) {
      // Called when user selects a date
      updateDaysIndicator(date); // Update days counter

      if (date) {
        // Format selected date as YYYY-MM-DD string
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const formattedDate = `${year}-${month}-${day}`;

        saveDueDate(formattedDate); // Save to localStorage
      } else {
        saveDueDate(null); // Clear date if none selected
      }

      updateURL(); // Update browser URL with new date

      // FIX: Refresh task list to show updated date immediately
      loadSessions();
      lastRefreshTime = Date.now();
      updateRefreshStatus();
      updateBodyOpacityBasedOnDueDate();
    },
  });

  // Add this line after initializing the date picker
  addClearDateButton();

  updateBodyOpacityBasedOnDueDate(); // Add this line



  // Add this event listener for delete buttons (event delegation)  
  sessionList.addEventListener('click', function (e) {
    // Check if the clicked element is a delete button
    // console.log('Session list clicked:', e.target);
    if (e.target.classList.contains('delete')) {
      // console.log('Delete button clicked');
      const windowId = e.target.getAttribute('data-windowid');
      const title = e.target.getAttribute('data-title');
      // console.log('WindowId:', windowId, 'Title:', title);

      // Call deleteSession with the data from attributes
      deleteSession(windowId, title);
    }

    // ADD THIS FOR VIEW BUTTONS:
    if (e.target.classList.contains('view')) {
      // console.log('View button clicked');
      const windowId = e.target.getAttribute('data-windowid');
      focusSession(windowId);
    }
  });

  // Load saved due date from previous session
  const savedDueDate = localStorage.getItem(DUE_DATE_STORAGE_KEY);

  if (savedDueDate && savedDueDate !== '0' && savedDueDate.trim() !== '') {
    dueDateInput.value = savedDueDate;

    const [year, month, day] = savedDueDate.split('-').map(Number);
    const localDate = new Date(year, month - 1, day);
    datePicker.setDate(localDate);
    updateDaysIndicator(localDate); // Add this line to update on page load
  } else {
    updateDaysIndicator(null); // Add this line for empty dates
  }
  if (savedDueDate) {
    dueDateInput.value = savedDueDate; // Display in input field

    // Set Pikaday's internal date state
    const [year, month, day] = savedDueDate.split('-').map(Number);
    const localDate = new Date(year, month - 1, day); // Month is 0-indexed
    datePicker.setDate(localDate);
    updateDaysIndicator(localDate);
  }

  // ===== URL MANAGEMENT =====
  // Function to update browser URL with current state
  function updateURL(title, details, winId = null) {
    // Skip URL updates during import to prevent sync loops
    if (isImporting) return;

    const newURL = new URL(window.location);
    const currentWinId = winId || windowId;
    const syncTimestamp = Date.now();

    // Save timestamp to localStorage for cross-device comparison
    localStorage.setItem(SYNC_TS_STORAGE_KEY, syncTimestamp.toString());

    // Clear all existing parameters and rebuild in desired order
    newURL.search = '';
    newURL.hash = '';

    // Add machine ID and sync timestamp FIRST (critical for sync)
    newURL.searchParams.set('mid', myMachineId);
    newURL.searchParams.set('ts', syncTimestamp.toString());
    newURL.searchParams.set('win', currentWinId);

    // Use current values if none provided as parameters
    const currentTitle = title !== undefined ? title : titleTextarea.value;
    const currentDetails = details !== undefined ? details : detailsTextarea.value;
    // Add due date SECOND (from localStorage, not input field)
    const dueDate = localStorage.getItem(DUE_DATE_STORAGE_KEY);

    if (dueDate && dueDate !== '0') {
      newURL.searchParams.set('dueDate', dueDate);
    }
    // Then add title and details
    if (currentTitle) {
      newURL.searchParams.set('title', currentTitle);
    }
    if (currentDetails) {
      newURL.searchParams.set('details', currentDetails);
    }

    // Update URL without page reload
    window.history.replaceState({}, '', newURL);
    // Trigger sync for browser extensions etc.
    window.dispatchEvent(new Event('popstate'));
  }

  // ===== CROSS-DEVICE SYNC REFEREE =====
  // ===== CROSS-DEVICE SYNC REFEREE =====
  function syncFromUrlIfNewer() {
    // Skip if already importing to prevent loops
    if (isImporting) return false;

    const urlParams = new URLSearchParams(window.location.search);
    const urlWinId = urlParams.get('win');
    const urlMid = urlParams.get('mid');
    const urlTs = parseInt(urlParams.get('ts')) || 0;
    const urlTitle = urlParams.get('title');
    const urlDetails = urlParams.get('details');
    const urlDueDate = urlParams.get('dueDate');

    // CRITICAL: WinID must match current window
    if (urlWinId && urlWinId !== getSafeWinID(windowId)) {
      console.warn(`SSTT: WinID mismatch! URL: ${urlWinId}, Current: ${getSafeWinID(windowId)}`);
      console.warn(`SSTT: WinID mismatch! URL: ${urlWinId}, Current: ${getSafeWinID(windowId)}`);
      return false;
    }

    // If URL has NO win parameter, this is a fresh page - no sync needed
    if (!urlWinId) {
      console.log("SSTT: Fresh page with no URL parameters - skipping sync");
      return false;
    }

    // Only proceed if URL has a different machine ID
    if (!urlMid || urlMid === myMachineId) return false;

    // === NEW: Check if content is actually different ===
    const currentTitle = localStorage.getItem(TITLE_STORAGE_KEY) || '';
    const currentDetails = localStorage.getItem(DETAILS_STORAGE_KEY) || '';
    const currentDueDate = localStorage.getItem(DUE_DATE_STORAGE_KEY) || '';

    const urlTitleValue = urlTitle || '';
    const urlDetailsValue = urlDetails || '';
    const urlDueDateValue = urlDueDate || '';

    const contentIsSame =
      currentTitle === urlTitleValue &&
      currentDetails === urlDetailsValue &&
      currentDueDate === urlDueDateValue;

    if (contentIsSame) {
      console.log("SSTT: Content identical, ignoring newer timestamp from other device");
      // Still update the sync timestamp to prevent repeated checks
      localStorage.setItem(SYNC_TS_STORAGE_KEY, urlTs.toString());
      return false;
    }
    // === END CONTENT COMPARISON ===
    // Get local data for comparison
    const localTitle = localStorage.getItem(TITLE_STORAGE_KEY) || '';
    const localDetails = localStorage.getItem(DETAILS_STORAGE_KEY) || '';
    const localDueDate = localStorage.getItem(DUE_DATE_STORAGE_KEY) || '';
    const localSyncTs = parseInt(localStorage.getItem(SYNC_TS_STORAGE_KEY) || '0');

    // Check if content is actually different
    const contentSame = (urlTitle === localTitle) && (urlDetails === localDetails) && (urlDueDate === localDueDate);

    if (contentSame) {
      console.log("SSTT: URL and local content are identical - no sync needed");
      return false;
    }

    // Show sync notification banner (never auto-import)
    showSyncBanner({
      urlMid: urlMid,
      urlTs: urlTs,
      urlTitle: urlTitle,
      urlDetails: urlDetails,
      urlDueDate: urlDueDate,
      localTitle: localTitle,
      localDetails: localDetails,
      localDueDate: localDueDate,
      localSyncTs: localSyncTs
    });

    return false; // Never auto-import
  }
  // ===== END SYNC REFEREE =====




  // ===== SYNC BANNER AND DIFF MODAL =====
  let syncBannerElement = null;

  //  here 
  function showDiffModal(data) {
    // Remove existing modal if present
    const existingModal = document.getElementById('syncDiffModal');
    if (existingModal) existingModal.remove();

    // Create modal overlay
    const modal = document.createElement('div');
    modal.id = 'syncDiffModal';
    modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.6);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 2000;  `;

    const localTitle = data.localTitle || '(empty)';
    const localDetails = data.localDetails || '(empty)';
    const remoteTitle = data.urlTitle || '(empty)';
    const remoteDetails = data.urlDetails || '(empty)';
    const remoteDate = new Date(data.urlTs).toLocaleString();

    const localDueDate = data.localDueDate || '(none)';
    const remoteDueDate = data.urlDueDate || '(none)';
    const dueDateSame = localDueDate === remoteDueDate;

    modal.innerHTML = `
    <div style="background: white; border-radius: 12px; max-width: 95vw; max-height: 90vh; overflow: auto; padding: 20px; width: 800px; box-shadow: 0 10px 25px rgba(0,0,0,0.2);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; border-bottom: 1px solid #eee; padding-bottom: 12px;">
        <h3 style="margin: 0;">📋 Compare Versions</h3>
        <button id="closeModalBtn" style="background: none; border: none; font-size: 20px; cursor: pointer; color: #999;">&times;</button>
      </div>
      
      <div style="display: flex; gap: 20px; flex-wrap: wrap;">
        <!-- Local Version -->
        <div style="flex: 1; min-width: 250px;">
          <div style="background: #f8f9fa; border-radius: 8px; padding: 12px;">
            <div style="font-weight: bold; color: #2c3e50; margin-bottom: 8px;">💻 Current (This Device)</div>
            <div style="margin-bottom: 12px;">
              <div style="font-size: 12px; color: #666; margin-bottom: 4px;">Title:</div>
              <div style="background: white; padding: 8px; border-radius: 4px; border: 1px solid #ddd; white-space: pre-wrap; word-break: break-word;">${escapeHtml(localTitle)}</div>
            </div>
            <div>
              <div style="font-size: 12px; color: #666; margin-bottom: 4px;">Details:</div>
              <div style="background: white; padding: 8px; border-radius: 4px; border: 1px solid #ddd; white-space: pre-wrap; word-break: break-word; max-height: 200px; overflow: auto;">${escapeHtml(localDetails)}</div>
            </div>
          </div>
        </div>
        
        <!-- Remote Version -->
        <div style="flex: 1; min-width: 250px;">
          <div style="background: #e8f5e8; border-radius: 8px; padding: 12px;">
            <div style="font-weight: bold; color: #2e7d32; margin-bottom: 8px;">🌐 Other Device (${remoteDate})</div>
            <div style="margin-bottom: 12px;">
              <div style="font-size: 12px; color: #666; margin-bottom: 4px;">Title:</div>
              <div style="background: white; padding: 8px; border-radius: 4px; border: 1px solid #ddd; white-space: pre-wrap; word-break: break-word;">${escapeHtml(remoteTitle)}</div>
            </div>
            <div>
              <div style="font-size: 12px; color: #666; margin-bottom: 4px;">Details:</div>
              <div style="background: white; padding: 8px; border-radius: 4px; border: 1px solid #ddd; white-space: pre-wrap; word-break: break-word; max-height: 200px; overflow: auto;">${escapeHtml(remoteDetails)}</div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Due Date Section - NOW INSIDE THE MODAL (before buttons) -->
      <div style="margin-top: 20px; padding-top: 12px; border-top: 1px solid #eee;">
        <div style="font-size: 12px; color: #666; margin-bottom: 4px;">📅 Due Date:</div>
        <div style="background: #f8f9fa; padding: 8px; border-radius: 4px; border: 1px solid #ddd;">
          ${dueDateSame ?
        `<span>${escapeHtml(localDueDate)}</span>` :
        `<span style="background: #ffe6e6; padding: 2px 4px; border-radius: 3px;">${escapeHtml(localDueDate)}</span>
             <span style="color: #666;"> → </span>
             <span style="background: #e6ffe6; padding: 2px 4px; border-radius: 3px;">${escapeHtml(remoteDueDate)}</span>`
      }
        </div>
      </div>
      
      <!-- Buttons -->
      <div style="margin-top: 20px; padding-top: 12px; border-top: 1px solid #eee; display: flex; justify-content: flex-end; gap: 10px;">
        <button id="modalImportBtn" style="background: #28a745; color: white; border: none; padding: 8px 20px; border-radius: 4px; cursor: pointer;">📥 Import This Version</button>
        <button id="modalCloseBtn" style="background: #6c757d; color: white; border: none; padding: 8px 20px; border-radius: 4px; cursor: pointer;">Close</button>
      </div>
    </div>  `;

    document.body.appendChild(modal);

    // Close modal handlers
    const closeModal = () => modal.remove();
    document.getElementById('closeModalBtn').onclick = closeModal;
    document.getElementById('modalCloseBtn').onclick = closeModal;
    modal.onclick = (e) => { if (e.target === modal) closeModal(); };

    // Import from modal
    document.getElementById('modalImportBtn').onclick = () => {
      closeModal();
      confirmImport(data);
    };
  }


  function confirmImport(data) {
    const remoteDate = new Date(data.urlTs).toLocaleString();
    const remoteShortMid = data.urlMid.substring(0, 12) + '...';

    const userConfirmed = confirm(
      `Import data from other device?\n\n` +
      `From: ${remoteShortMid}\n` +
      `Date: ${remoteDate}\n\n` +
      `Current data will be backed up in case you want to undo.\n\n` +
      `Click OK to import, Cancel to keep current.`
    );

    if (userConfirmed) {
      performSync(data);
    }
  }

  function performSync(data) {
    isImporting = true;

    // Update sync timestamps to match imported data (prevents ping-pong)
    localStorage.setItem(SYNC_TS_STORAGE_KEY, data.urlTs.toString());
    localStorage.setItem(LAST_SYNC_TIMESTAMP_KEY, data.urlTs.toString());
    localStorage.setItem(LAST_SYNC_MACHINE_KEY, data.urlMid);

    // Backup current state before import
    const backupKey = `${TITLE_STORAGE_KEY}_backup`;
    localStorage.setItem(backupKey, JSON.stringify({
      title: localStorage.getItem(TITLE_STORAGE_KEY) || '',
      details: localStorage.getItem(DETAILS_STORAGE_KEY) || '',
      dueDate: localStorage.getItem(DUE_DATE_STORAGE_KEY) || '',
      timestamp: Date.now()
    }));

    // Import URL data to localStorage
    if (data.urlTitle !== undefined && data.urlTitle !== null) {
      localStorage.setItem(TITLE_STORAGE_KEY, data.urlTitle);
      localStorage.setItem(`timestamp_${TITLE_STORAGE_KEY}`, Date.now().toString());
      titleTextarea.value = data.urlTitle;
    }

    if (data.urlDetails !== undefined && data.urlDetails !== null) {
      localStorage.setItem(DETAILS_STORAGE_KEY, data.urlDetails);
      localStorage.setItem(`timestamp_${DETAILS_STORAGE_KEY}`, Date.now().toString());
      detailsTextarea.value = data.urlDetails;
      autoExpand(detailsTextarea);
    }

    if (data.urlDueDate && data.urlDueDate !== '0') {
      localStorage.setItem(DUE_DATE_STORAGE_KEY, data.urlDueDate);
      dueDateInput.value = data.urlDueDate;
      const [year, month, day] = data.urlDueDate.split('-').map(Number);
      const dueDateForPicker = new Date(year, month - 1, day);
      datePicker.setDate(dueDateForPicker);
      updateDaysIndicator(dueDateForPicker);
    }

    // Update sync timestamp
    localStorage.setItem(SYNC_TS_STORAGE_KEY, data.urlTs.toString());
    localStorage.setItem(LAST_SYNC_TIMESTAMP_KEY, data.urlTs.toString());
    localStorage.setItem(LAST_SYNC_MACHINE_KEY, data.urlMid);

    // Update UI
    updateTitle();
    updateCounter();
    updateDetailsCounter();
    loadSessions();
    updateSyncStatusDisplay();

    // Show undo option for 10 seconds
    showUndoNotification();

    // Remove banner if present
    if (syncBannerElement) {
      syncBannerElement.remove();
      syncBannerElement = null;
    }

    isImporting = false;
    console.log("SSTT: Sync import completed");
  }

  function showUndoNotification() {
    const undoBanner = document.createElement('div');
    undoBanner.id = 'undoBanner';
    undoBanner.style.cssText = `
      position: sticky;
      top: 0;
      left: 0;
      right: 0;
      background: #d4edda;
      border-bottom: 3px solid #28a745;
      padding: 10px 16px;
      z-index: 1001;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-family: inherit;
    `;

    undoBanner.innerHTML = `
      <span>✅ Sync completed! Data imported from other device.</span>
      <button id="undoSyncBtn" style="background: #ffc107; color: #333; border: none; padding: 4px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;">↩️ Undo</button>
    `;

    const container = document.querySelector('.container');
    if (container && container.firstChild) {
      container.insertBefore(undoBanner, container.firstChild);
    }

    document.getElementById('undoSyncBtn').onclick = () => {
      undoLastSync();
      undoBanner.remove();
    };

    // Auto-remove after 10 seconds
    setTimeout(() => {
      if (undoBanner.parentNode) undoBanner.remove();
    }, 10000);
  }

  function undoLastSync() {
    const backupKey = `${TITLE_STORAGE_KEY}_backup`;
    const backupStr = localStorage.getItem(backupKey);

    if (!backupStr) {
      alert("No backup found to undo.");
      return;
    }

    const backup = JSON.parse(backupStr);

    // Restore from backup
    localStorage.setItem(TITLE_STORAGE_KEY, backup.title);
    localStorage.setItem(DETAILS_STORAGE_KEY, backup.details);
    localStorage.setItem(DUE_DATE_STORAGE_KEY, backup.dueDate);
    localStorage.setItem(`timestamp_${TITLE_STORAGE_KEY}`, backup.timestamp.toString());
    localStorage.setItem(`timestamp_${DETAILS_STORAGE_KEY}`, backup.timestamp.toString());

    // Update UI
    titleTextarea.value = backup.title;
    detailsTextarea.value = backup.details;
    dueDateInput.value = backup.dueDate;

    if (backup.dueDate && backup.dueDate !== '0') {
      const [year, month, day] = backup.dueDate.split('-').map(Number);
      const dueDateForPicker = new Date(year, month - 1, day);
      datePicker.setDate(dueDateForPicker);
      updateDaysIndicator(dueDateForPicker);
    } else {
      datePicker.setDate(null);
      updateDaysIndicator(null);
    }

    updateTitle();
    updateCounter();
    updateDetailsCounter();
    loadSessions();
    updateSyncStatusDisplay();

    // Clean up backup
    localStorage.removeItem(backupKey);

    console.log("SSTT: Sync undone, previous state restored");
  }
  // ===== END SYNC BANNER AND DIFF MODAL =====





  // ===== INITIAL DATA LOADING =====
  // ===== INITIAL DATA LOADING =====
  // Check for cross-device sync (detects and shows banner, never auto-imports)
  syncFromUrlIfNewer();

  // Get URL parameters (but NEVER auto-import from same machine)
  const urlParams = new URLSearchParams(window.location.search);

  // Only use URL parameters for initial data if this is a BRAND NEW window
  // (no stored data at all)
  const storedTitle = localStorage.getItem(TITLE_STORAGE_KEY);
  const storedDetails = localStorage.getItem(DETAILS_STORAGE_KEY);
  const storedDueDate = localStorage.getItem(DUE_DATE_STORAGE_KEY);



  let initialTitle = storedTitle || '';
  let initialDetails = storedDetails || '';
  let initialDueDate = storedDueDate || '';

  // Only load from URL if this is a new window OR localStorage is completely empty
  const isFreshWindow = !storedTitle && !storedDetails;
  const isStorageEmpty = localStorage.length === 0 ||
    (!storedTitle && !storedDetails && !storedDueDate);

  if (isFreshWindow || isStorageEmpty) {
    const urlTitle = urlParams.get('title');
    const urlDetails = urlParams.get('details');
    const urlDueDate = urlParams.get('dueDate');

    if (urlTitle) initialTitle = urlTitle;
    if (urlDetails) initialDetails = urlDetails;
    if (urlDueDate) initialDueDate = urlDueDate;

    if (urlTitle || urlDetails) {
      console.log("SSTT: New/empty window - loading from URL parameters");
    }
  } else {
    console.log("SSTT: Existing window - using localStorage");
  }

  // Load initial data into UI
  if (initialTitle) {
    titleTextarea.value = initialTitle;
    updateTitle();
    updateCounter();
    localStorage.setItem(TITLE_STORAGE_KEY, initialTitle);
  }

  if (initialDetails) {
    detailsTextarea.value = initialDetails;
    updateDetailsCounter();
    autoExpand(detailsTextarea);
    localStorage.setItem(DETAILS_STORAGE_KEY, initialDetails);
  }

  if (initialDueDate && initialDueDate !== '0') {
    dueDateInput.value = initialDueDate;
    const [year, month, day] = initialDueDate.split('-').map(Number);
    const dueDateForPicker = new Date(year, month - 1, day);
    datePicker.setDate(dueDateForPicker);
    updateDaysIndicator(dueDateForPicker);
    localStorage.setItem(DUE_DATE_STORAGE_KEY, initialDueDate);
  }

  // Finalize URL with loaded data
  updateURL(initialTitle, initialDetails);

  // Check if we're on Stackedit or on out Live-Page 
  const isOnProduction = window.location.hostname.includes('stefanibus.github.io')

  if (isOnProduction) {
    // Auto-Focus the title field for immediate typing
    titleTextarea.focus();
  }

  // ===== EVENT LISTENERS FOR TYPING =====
  // Title textarea input listener with debouncing
  titleTextarea.addEventListener('input', function () {
    // console.log('Title input detected:', this.value); // console.log('WindowId:', windowId); // console.log('Storage key would be:', `pageTitle_${getSafeWinID(windowId)}`);

    if (isImporting) return;
    // Clear any pending timers
    clearTimeout(debounceTimer);
    clearTimeout(keystrokeRefreshTimer);

    // Immediate UI updates
    updateTitle();
    updateCounter();

    // Debounced save operation (waits for typing to pause)
    debounceTimer = setTimeout(() => {
      updateURL(titleTextarea.value, detailsTextarea.value);
      localStorage.setItem(TITLE_STORAGE_KEY, titleTextarea.value);
      localStorage.setItem(
        `timestamp_${TITLE_STORAGE_KEY}`,
        Date.now().toString()
      );
    }, TIMEOUTS.DEBOUNCE);

    // Delayed refresh of task list (longer delay)
    keystrokeRefreshTimer = setTimeout(() => {
      loadSessions();
      lastRefreshTime = Date.now();
      updateRefreshStatus();
    }, TIMEOUTS.KEYSTROKE_REFRESH);
  });


  // Details textarea input listener (same pattern as title)
  detailsTextarea.addEventListener('input', function () {

    if (isImporting) return;
    autoExpand(this);
    clearTimeout(debounceTimer);
    clearTimeout(keystrokeRefreshTimer);

    updateTitle();
    updateCounter();
    updateDetailsCounter();

    debounceTimer = setTimeout(() => {
      updateURL(titleTextarea.value, detailsTextarea.value);
      localStorage.setItem(DETAILS_STORAGE_KEY, detailsTextarea.value);
      localStorage.setItem(
        `timestamp_${DETAILS_STORAGE_KEY}`,
        Date.now().toString()
      );
    }, TIMEOUTS.DEBOUNCE);

    keystrokeRefreshTimer = setTimeout(() => {
      loadSessions();
      lastRefreshTime = Date.now();
      updateRefreshStatus();
    }, TIMEOUTS.KEYSTROKE_REFRESH); // ← YOU CAN CHANGE THIS VALUE!
  });

  // ===== DATE-RELATED FUNCTIONS =====
  function updateDaysIndicator(date) {
    // Clear indicator if no valid date, show "always relevant"
    if (!date || isNaN(date.getTime())) {
      dueDateInput.value = '';
      daysIndicator.textContent = 'Always relevant';
      document.body.classList.remove('future-task');
      daysIndicator.classList.remove('past');
      const clearButton = document.querySelector(
        '.date-picker-container button'
      );
      // hide clear-date-button
      if (clearButton) clearButton.style.display = 'none';
      return;
    }

    // Calculate days difference from today
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to midnight
    const dueDate = new Date(date);
    dueDate.setHours(0, 0, 0, 0);

    const diffTime = dueDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Update display based on days difference
    if (diffDays === 0) {
      daysIndicator.textContent = 'Today';
      daysIndicator.classList.add('past');
    } else if (diffDays > 0) {
      daysIndicator.textContent = `${diffDays} days`;
      daysIndicator.classList.remove('past');
    } else {
      daysIndicator.textContent = `${Math.abs(diffDays)} days ago`;
      daysIndicator.classList.add('past');
    }

    updateBodyOpacityBasedOnDueDate(); // Add this line
  }

  function saveDueDate(dateString) {
    if (isImporting) return;
    // Simple storage function for due dates
    if (dateString) {
      localStorage.setItem(DUE_DATE_STORAGE_KEY, dateString);
    } else {
      // Use "0" to represent no date (best practice for empty values)
      localStorage.setItem(DUE_DATE_STORAGE_KEY, '0');
    }
  }

  // Add this function to your JavaScript
  function addClearDateButton() {
    const clearButton = document.createElement('button');
    clearButton.textContent = '×';
    clearButton.title = 'Clear due date';
    clearButton.style.cssText = `
	        background: #e74c3c;
	        color: white;
	        border: none;
	        border-radius: 50%;
	        width: 20px;
	        height: 20px;
	        cursor: pointer;
	        margin-left: 5px;
	        font-size: 12px;
	        line-height: 1;
	        display: ${dueDateInput.value && dueDateInput.value !== '0' ? 'none' : 'block'
      }; // Show only if date exists
	    `;

    clearButton.addEventListener('click', function () {
      datePicker.setDate(null);
      dueDateInput.value = '';
      daysIndicator.textContent = 'Always relevant';
      saveDueDate(null);
      updateDaysIndicator(null);
      updateURL();
      daysIndicator.classList.remove('past');
      this.style.display = 'none'; // Hide after clearing

      // Refresh sessions to update the display
      loadSessions();
    });

    // Add the button to the date container
    document.querySelector('.date-picker-container').appendChild(clearButton);

    // Also show/hide based on date input changes
    dueDateInput.addEventListener('input', function () {
      clearButton.style.display = this.value ? 'block' : 'none';
    });
  }
  // ===== SESSION/TASK LIST MANAGEMENT =====
  // Background refresh interval (runs every 30 seconds)
  refreshInterval = setInterval(() => {
    loadSessions();
    updateRefreshStatus();
  }, TIMEOUTS.BACKGROUND_REFRESH);

  // Initial load of sessions
  loadSessions(); // stefano search for String "perhapsDuplcate" 

  // Manual refresh button
  manualRefreshBtn.addEventListener('click', function () {
    loadSessions();
    lastRefreshTime = Date.now();
    updateRefreshStatus();
    updateSyncStatusDisplay();
  });

  // Refresh when page visibility changes
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') {
      // Tab became visible: Refresh data
      loadSessions();
      lastRefreshTime = Date.now();
      updateRefreshStatus();
      updateSyncStatusDisplay();
    } else if (document.visibilityState === 'hidden') {
      // Tab became hidden: Save current state
      clearTimeout(debounceTimer);
      updateURL(titleTextarea.value, detailsTextarea.value);
    }
  });

  // Refresh when window gains focus
  window.addEventListener('focus', function () {
    loadSessions();
    lastRefreshTime = Date.now();
    updateRefreshStatus();
    updateSyncStatusDisplay();
  });

  // Clear import lock when window loses focus or unloads
  window.addEventListener('beforeunload', function () {
    isImporting = false;
  });

  window.addEventListener('blur', function () {
    isImporting = false;
  });

  // ===== CORE APPLICATION FUNCTIONS =====
  function updateRefreshStatus() {
    // Show how long since last refresh in friendly format
    const elapsed = Date.now() - lastRefreshTime;
    const seconds = Math.floor(elapsed / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    let statusText;
    if (seconds < 10) statusText = 'Just now';
    else if (seconds < 60) statusText = `${seconds} seconds ago`;
    else if (minutes < 60)
      statusText = `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    else if (hours < 24)
      statusText = `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    else statusText = `${days} day${days !== 1 ? 's' : ''} ago`;

    document.getElementById('lastRefreshTime').textContent = statusText;
  }

  // Update page title and main heading with current title text
  function updateTitle() {
    const newTitle = titleTextarea.value;
    document.title = newTitle; // Set browser tab title
    titleHeading.textContent = newTitle; // Set main page heading

    // Add visual highlight effect when title changes
    if (newTitle.length > 0) {
      titleHeading.classList.add('highlight');
      // Remove highlight after animation completes
      setTimeout(() => {
        titleHeading.classList.remove('highlight');
      }, TIMEOUTS.UI_ANIMATION);
    }
  }

  // Update character counter for title textarea
  function updateCounter() {
    const length = titleTextarea.value.length;
    counter.textContent = `${80 - length} Restbuchstaben`; // Show character count

    // Add warning style when approaching character limit
    if (length > 70) {
      counter.classList.add('near-limit'); // Red text warning
    } else {
      counter.classList.remove('near-limit');
    }
  }

  // Update character counter for details textarea
  function updateDetailsCounter() {
    const length = detailsTextarea.value.length;
    detailsCounter.textContent = `Restbuchstaben: ${600 - length}`;

    // Add warning style when approaching character limit
    if (length > 580) {  // Warn when 20 characters remaining
      detailsCounter.classList.add('near-limit');
    } else {
      detailsCounter.classList.remove('near-limit');
    }
  }

  // Load all task sessions from localStorage for display in task list
  function loadSessions() {
    const sessions = [];
    // const currentWindowId = windowId;
    const processedWindows = new Set(); // Track windows we've already processed

    // Scan through all localStorage items to find ANY task data
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      let windowId = null;

      // Check for any type of task data
      if (key.startsWith('pageTitle_')) {
        windowId = key.replace('pageTitle_', '');
      } else if (key.startsWith('details_')) {
        windowId = key.replace('details_', '');
      } else if (key.startsWith('dueDate_')) {
        windowId = key.replace('dueDate_', '');
      } else if (key.startsWith('timestamp_pageTitle_')) {
        windowId = key.replace('timestamp_pageTitle_', '');
      } else if (key.startsWith('timestamp_details_')) {
        windowId = key.replace('timestamp_details_', '');
      } else if (key.startsWith('timestamp_dueDate_')) {
        windowId = key.replace('timestamp_dueDate_', '');
      }

      // Skip if not a task key or already processed
      // REMOVE the check for currentWindowID to make sure the list will contain the current task: "|| windowId === currentWindowId ||"  
      if (!windowId || processedWindows.has(windowId)) {
        continue;
      }

      processedWindows.add(windowId);

      // Get all data for this window
      const title = localStorage.getItem(`pageTitle_${getSafeWinID(windowId)}`) || '';
      // But windowId might already be prefixed from earlier parsing!
      // Add debug: 
      // console.log('🔍 loadSessions windowId:', windowId);

      const details = localStorage.getItem(`details_${getSafeWinID(windowId)}`) || '';
      const dueDate = localStorage.getItem(`dueDate_${getSafeWinID(windowId)}`) || '';

      // Include sessions with ANY content
      //if (title || details || (dueDate && dueDate !== '0')) {   // every session should be displayed in the List whatsoever ( therefore I removed the if Condition completely)  
      const timestampKey = `timestamp_pageTitle_${getSafeWinID(windowId)}`;
      const timestamp = localStorage.getItem(timestampKey);

      sessions.push({
        windowId: windowId,
        title: title,
        details: details,
        dueDate: dueDate,
        lastUpdated: timestamp ? parseInt(timestamp) : 0,
        storageIndex: i,
      });
      // }
    }


    // Apply sorting based on current selection
    applySorting(sessions); // ← ADD THIS LINE
    // Display the collected sessions
    displaySessions(sessions);
    showSimpleStats();
    lastRefreshTime = Date.now();
    updateRefreshStatus();
  }

  // Display sessions in the task list UI
  function displaySessions(sessions) {
    // Show empty state if no sessions found
    if (sessions.length === 0) {
      const isCurrentEmpty = !titleTextarea.value && !detailsTextarea.value;

      if (isCurrentEmpty) {
        sessionList.innerHTML = `
		            <div class="no-sessions">
		                <p>No tasks yet!</p>
		                <p><small>Start by typing a title above to create your first task.</small></p>
		            </div>
		        `;
      } else {
        sessionList.innerHTML = `
		            <div class="no-sessions">
		                <p>No other task sessions found</p>
		                <p><small>Open this page in another tab to create multiple tasks.</small></p>
		            </div>
		        `;
      }
      return;
    }

    let html = '';

    // Generate HTML for each session
    sessions.forEach((session) => {
      // Format last updated time for display
      const timeText = session.lastUpdated
        ? new Date(session.lastUpdated).toLocaleTimeString()
        : 'unknown time';

      // Display due date if available
      let dueDateText = '';
      if (session.dueDate && session.dueDate !== '0') {
        dueDateText = `<div class="session-date">Due: ${session.dueDate}</div>`;
      }

      // ⭐ NEW: Determine task status for styling
      let taskStatus = '';
      let statusIndicator = '';


      if (session.dueDate && session.dueDate !== '0') {
        const dueDate = new Date(session.dueDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        dueDate.setHours(0, 0, 0, 0);

        const diffTime = dueDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays > 0) {
          // Future tasks
          taskStatus = 'future-task';
          statusIndicator = `<span class="future-task-indicator">in ${diffDays} days</span>`;
        } else {
          // Today or past due (both get yellow treatment)
          taskStatus = 'current-or-past';
          if (diffDays === 0) {
            statusIndicator = `<span class="urgent-indicator">today</span>`;
          } else {
            statusIndicator = `<span class="urgent-indicator">${Math.abs(diffDays)} days ago</span>`;
          }
        }
      }


      // ⭐⭐ MODIFIED: Handle empty titles (In the session generation, ensure we have a valid title for the delete button )
      const displayTitle = session.title || 'Untitled Task';
      const displayDetails = session.details || 'No details';

      // Build session item HTML
      html += `<div class="session-item ${taskStatus}">
      <div class="session-content">
        <div class="session-title" style="${!session.title ? 'font-style: italic; color: #888;' : ''}">
          ${escapeHtml(displayTitle)} ${statusIndicator}
        </div>
                    <div class="session-details" title="${escapeHtml(displayDetails)}">
                        ${escapeHtml(truncateText(displayDetails, 60))}
                    </div>
                    ${dueDateText}
                    <small>Updated: ${timeText}</small>
                </div>
                <div class="session-actions">
                    <button class="session-action view" data-windowid="${session.windowId}" title="View task">👁️</button> 
                    <button class="session-action delete" data-windowid="${session.windowId}" data-title="${escapeHtml(displayTitle)}" title="Delete task">🗑️</button>

                </div>
            </div>`;
    });
    // Update the session list UI
    sessionList.innerHTML = html;
  }


  // ===== SYNC STATUS DISPLAY =====
  function updateSyncStatusDisplay() {
    const syncStatusElement = document.getElementById('syncStatusIndicator');
    if (!syncStatusElement) {
      console.log("SSTT: syncStatusIndicator element not found in DOM");
      return;
    }

    const lastSyncTs = localStorage.getItem(LAST_SYNC_TIMESTAMP_KEY);
    const lastSyncMid = localStorage.getItem(LAST_SYNC_MACHINE_KEY);

    if (!lastSyncTs || !lastSyncMid) {
      syncStatusElement.textContent = '📡 No cross-device sync yet';
      syncStatusElement.className = 'sync-status';
      return;
    }

    const syncDate = new Date(parseInt(lastSyncTs));
    const now = Date.now();
    const hoursSinceSync = (now - parseInt(lastSyncTs)) / (1000 * 60 * 60);

    let statusClass = 'sync-status';
    let statusIcon = '✅';

    if (hoursSinceSync > 168) { // 7 days
      statusClass += ' error';
      statusIcon = '❌';
    } else if (hoursSinceSync > 24) {
      statusClass += ' warning';
      statusIcon = '⚠️';
    } else {
      statusClass += ' synced';
      statusIcon = '✅';
    }

    const formattedDate = syncDate.toLocaleString();
    const shortMid = lastSyncMid.substring(0, 12) + '...';

    syncStatusElement.innerHTML = `${statusIcon} Last sync: ${formattedDate} from ${shortMid}`;
    syncStatusElement.className = statusClass;

    // Add tooltip with full details
    syncStatusElement.title = `Full Machine ID: ${lastSyncMid}\nTimestamp: ${syncDate.toISOString()}\nAge: ${Math.round(hoursSinceSync)} hours ago`;
  }
  // ===== END SYNC STATUS DISPLAY =====


  // Add this function to update body class based on due date status
  function updateBodyOpacityBasedOnDueDate() {
    const daysIndicator = document.getElementById('daysIndicator');

    if (daysIndicator && !daysIndicator.classList.contains('past')) {
      // If days indicator exists and doesn't have 'past' class, it's a future task
      document.body.classList.add('future-task');
    } else {
      document.body.classList.remove('future-task');
    }
  }



  // Save all application data to a backup file
  function saveBackup() {
    // Create backup data structure with version info
    const backupData = {
      version: '1.3',
      exportDate: new Date().toISOString(),
      schema: {
        fields: ['id', 'title', 'details', 'titleTimestamp', 'detailsTimestamp', 'dueDate']
      },
      tabs: {},
    };

    // Add storage info to backup data
    const storageInfo = {
      totalItems: localStorage.length,
      estimatedSize: calculateTotalStorageSize(),
      backupDate: new Date().toISOString()
    };

    backupData.storageInfo = storageInfo;

    // Define what data patterns to include in backup
    const keyPatterns = [
      { pattern: 'pageTitle_', property: 'title' },
      { pattern: 'details_', property: 'details' },
      { pattern: 'timestamp_pageTitle_', property: 'titleTimestamp' },
      { pattern: 'timestamp_details_', property: 'detailsTimestamp' },
      { pattern: 'dueDate_', property: 'dueDate' },
    ];



    // Initialize every tab with all fields (empty if no data)
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      const keyInfo = keyPatterns.find(info => key.startsWith(info.pattern));
      if (!keyInfo) continue;

      const windowId = key.replace(keyInfo.pattern, '');

      if (!backupData.tabs[windowId]) {
        // Initialize with all required fields as empty strings
        backupData.tabs[windowId] = {
          id: windowId,
          title: '',
          details: '',
          titleTimestamp: '',
          detailsTimestamp: '',
          dueDate: ''
        };
      }

      // Fill in actual values (will keep empty strings if no data)
      const value = localStorage.getItem(key) || '';
      backupData.tabs[windowId][keyInfo.property] = value;
    }



    // Collect all relevant data from localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);

      // Check if key matches any of our backup patterns
      const keyInfo = keyPatterns.find((info) => key.startsWith(info.pattern));
      if (!keyInfo) continue; // Skip unrelated keys

      // Extract window ID from key
      const windowId = key.replace(keyInfo.pattern, '');

      // Initialize tab object if it doesn't exist
      if (!backupData.tabs[windowId]) {
        backupData.tabs[windowId] = {
          id: windowId,
          title: '',
          details: '',
          titleTimestamp: '',
          detailsTimestamp: '',
          dueDate: ''
        };




      }


      // Store the value using the mapped property name
      backupData.tabs[windowId][keyInfo.property] =
        localStorage.getItem(key) || '';
    }

    // Create download for backup file
    const dataStr = JSON.stringify(backupData, null, 2); // Pretty-print JSON
    const dataUri =
      'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `tasks-backup-${new Date().toISOString().split('T')[0]
      }.json`;

    // Create invisible download link and trigger click
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();


    // ⭐ NEW: Save backup timestamp to localStorage
    const backupTimestamp = new Date().toISOString();
    localStorage.setItem('lastBackupTimestamp', backupTimestamp);

    // ⭐ NEW: Update UI with backup time
    updateLastBackupDisplay(backupTimestamp);


    // Show success message
    // backupStatus.textContent = `Backup saved: ${exportFileDefaultName}`;
    backupStatus.innerHTML = `
		    <span style="color: #27ae60;">✓ Backup saved: ${exportFileDefaultName}</span>
		    <br><small>${new Date().toLocaleTimeString()}</small>
		`;
    setTimeout(() => {
      backupStatus.textContent = '';
    }, TIMEOUTS.BACKUP_IMPORTANT);

  }






  // Load backup data from file
  function loadBackup(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    // Process file when loaded
    reader.onload = function (e) {
      try {
        const backupData = JSON.parse(e.target.result);
        let loadedCount = 0;

        // Handle new format with tabs object
        if (backupData.tabs) {
          for (const windowId in backupData.tabs) {
            const tab = backupData.tabs[windowId];
            // Restore all tab data to localStorage
            if (tab.title !== undefined) {
              localStorage.setItem(`pageTitle_${getSafeWinID(windowId)}`, tab.title);
              loadedCount++;
            }
            if (tab.details !== undefined) {
              localStorage.setItem(`details_${getSafeWinID(windowId)}`, tab.details);
              loadedCount++;
            }
            if (tab.titleTimestamp !== undefined) {
              localStorage.setItem(
                `timestamp_pageTitle_${getSafeWinID(windowId)}`,
                tab.titleTimestamp
              );
              loadedCount++;
            }
            if (tab.detailsTimestamp !== undefined) {
              localStorage.setItem(
                `timestamp_details_${getSafeWinID(windowId)}`,
                tab.detailsTimestamp
              );
              loadedCount++;
            }
            if (tab.dueDate !== undefined) {
              localStorage.setItem(`dueDate_${getSafeWinID(windowId)}`, tab.dueDate);
              loadedCount++;
            }
          }
        } else {
          // Handle old backup format (flat structure)
          for (const key in backupData) {
            if (
              backupData.hasOwnProperty(key) &&
              (key.startsWith('pageTitle_') ||
                key.startsWith('details_') ||
                key.startsWith('timestamp_pageTitle_') ||
                key.startsWith('timestamp_details_'))
            ) {
              localStorage.setItem(key, backupData[key]);
              loadedCount++;
            }
          }
        }

        // ⭐ NEW: Update backup timestamp when restoring from backup
        localStorage.setItem('lastBackupTimestamp', new Date().toISOString());
        updateLastBackupDisplay();

        // Show restore status
        // backupStatus.textContent = `Restored ${loadedCount} items from backup`;
        backupStatus.innerHTML = `
				    <span style="color: #27ae60;">✓ Restored ${loadedCount} items from backup</span>
				    <br><small>${new Date().toLocaleTimeString()}</small>
				`;
        setTimeout(() => {
          backupStatus.textContent = '';
        }, TIMEOUTS.BACKUP_SUCCESS);

        // Refresh session list if visible
        if (sessionList.classList.contains('visible')) {
          loadSessions();
        }
      } catch (error) {
        // Handle backup file errors
        backupStatus.textContent = 'Error: Invalid backup file';
        setTimeout(() => {
          backupStatus.textContent = '';
        }, TIMEOUTS.BACKUP_SUCCESS);
        console.error('Backup load error:', error);
      }
    };

    // Read the file as text
    reader.readAsText(file);
    event.target.value = ''; // Reset file input
  }






  // ===== GLOBAL FUNCTIONS (called from HTML onclick) =====

  // Open a task session in new window
  window.focusSession = function (windowId) {
    const title = localStorage.getItem(`pageTitle_${getSafeWinID(windowId)}`) || '';
    const details = localStorage.getItem(`details_${getSafeWinID(windowId)}`) || '';
    const dueDate = localStorage.getItem(`dueDate_${getSafeWinID(windowId)}`) || '';

    // Create URL with consistent parameter order AND proper encoding
    const urlParams = new URLSearchParams();
    urlParams.set('win', windowId);

    if (dueDate && dueDate !== '0') {
      urlParams.set('dueDate', dueDate);
    }

    if (title) {
      urlParams.set('title', title);
    }

    if (details) {
      urlParams.set('details', details);
    }

    const url = `${window.location.origin}${window.location.pathname}?${urlParams.toString()}`;
    window.open(url, '_blank');
  };

  // Delete a task session with confirmation
  function deleteSession(windowId, taskTitle) {
    // console.log('deleteSession called with:', windowId, taskTitle);

    // Handle empty/untitled tasks better
    const displayTitle = taskTitle && taskTitle !== "''" ? taskTitle : 'Untitled Task';

    if (
      confirm(
        `Are you sure you want to delete this task session?\n\nTask: ${displayTitle}\nWindow ID: ${windowId}`
      )
    ) {
      // Remove all data associated with this session
      localStorage.removeItem(`pageTitle_${getSafeWinID(windowId)}`);
      localStorage.removeItem(`details_${getSafeWinID(windowId)}`);
      localStorage.removeItem(`timestamp_pageTitle_${getSafeWinID(windowId)}`);
      localStorage.removeItem(`timestamp_details_${getSafeWinID(windowId)}`);
      localStorage.removeItem(`dueDate_${getSafeWinID(windowId)}`);
      localStorage.removeItem(`timestamp_dueDate_${getSafeWinID(windowId)}`);

      loadSessions(); // Refresh the task list
    }
  }

  // ===== UTILITY FUNCTIONS =====


  // ===== RESET MACHINE ID (for troubleshooting) =====
  window.resetMachineId = function () {
    if (confirm("Reset your device ID?\n\nThis will generate a new unique ID for this browser.\nYour tasks will NOT be affected.\n\nCross-device sync will work normally after reset.")) {
      localStorage.removeItem(MACHINE_ID_KEY);
      alert("Device ID reset. The page will now reload.");
      location.reload();
    }
  };


  // Escape text for use in JavaScript string literals
  function escapeHtmlForJsString(text) {
    if (!text) return "''";

    // Escape backslashes, quotes, and line breaks
    return (
      "'" +
      text
        .replace(/\\/g, '\\\\') // Escape backslashes
        .replace(/'/g, "\\'") // Escape single quotes
        .replace(/"/g, '\\"') // Escape double quotes
        .replace(/\n/g, '\\n') // Escape newlines
        .replace(/\r/g, '\\r') + // Escape carriage returns
      "'"
    );
  }

  // Escape HTML special characters to prevent XSS
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML; // Browser automatically escapes
  }

  // Truncate text with ellipsis if too long
  function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...'; // Add ellipsis
  }

  // ===== EVENT LISTENERS FOR UI CONTROLS =====

  // Backup button handlers
  saveBackupBtn.addEventListener('click', saveBackup);
  loadBackupBtn.addEventListener('click', () => backupFile.click());
  backupFile.addEventListener('change', loadBackup);

  // Auto-expand details textarea on load
  autoExpand(detailsTextarea);

  // Add this to your DOMContentLoaded event
  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault(); // block browser "Save as..."
      if (confirm('Save backup now?')) saveBackup();
    }
    // Ctrl/Cmd + R to refresh sessions
    if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
      alert('refresh sessions now?');
      e.preventDefault();
      loadSessions();
      lastRefreshTime = Date.now();
      updateRefreshStatus();
    }

    // Escape to clear focus
    if (e.key === 'Escape') {
      document.activeElement.blur();
    }
  });

  // Initial load of sessions
  loadSessions(); // stefano search for String "perhapsDuplcate"

  // Update sync status display
  updateSyncStatusDisplay();


  // checkStorageRegularly 
  checkStorageRegularly();

  // ⭐ INITIALIZE BACKUP DISPLAY - MOVED TO END ⭐
  // This must be after all DOM elements are fully loaded
  updateLastBackupDisplay();

  // checkStorageRegularly 
  checkStorageRegularly();

  // ⭐ INITIALIZE BACKUP DISPLAY - MOVED TO END ⭐
  updateLastBackupDisplay();

  // Optional: Clear sync history for this task
  function clearSyncHistory() {
    localStorage.removeItem(LAST_SYNC_TIMESTAMP_KEY);
    localStorage.removeItem(LAST_SYNC_MACHINE_KEY);
    updateSyncStatusDisplay();
    console.log("SSTT: Sync history cleared");
  }

  // ===== MODAL SYNC DETAILS TOGGLE =====

  function updateModalSyncStatus() {
    const syncStatusElement = document.getElementById('modalSyncStatus');
    const detailsElement = document.getElementById('syncDetails');

    if (!syncStatusElement) return;

    const lastSync = localStorage.getItem(LAST_SYNC_TIMESTAMP_KEY);
    const machineId = localStorage.getItem(MACHINE_ID_KEY);

    if (!lastSync) {
      syncStatusElement.innerHTML = '<span style="color: #6c757d;">📡 No cross-device sync yet</span>';
    } else {
      const syncDate = new Date(parseInt(lastSync));
      const daysSinceSync = (Date.now() - parseInt(lastSync)) / (1000 * 60 * 60 * 24);
      let statusColor = '#28a745'; // green
      if (daysSinceSync > 7) statusColor = '#dc3545'; // red
      else if (daysSinceSync > 1) statusColor = '#ffc107'; // yellow

      syncStatusElement.innerHTML = `<span style="color: ${statusColor}; font-weight: 500;">${syncDate.toLocaleString()} (${Math.round(daysSinceSync)} days ago)</span>`;
    }

    if (detailsElement && machineId) {
      const lastSync = localStorage.getItem(LAST_SYNC_TIMESTAMP_KEY);
      detailsElement.innerHTML = `
        <div style="display: grid; gap: 8px;">
          <div><strong>🔧 Device ID:</strong> <code style="background: #f1f3f4; padding: 2px 6px; border-radius: 4px;">${machineId.substring(0, 12)}...</code></div>
          <div><strong>📋 Sync Rules:</strong></div>
          <ul style="margin: 0 0 0 20px; padding: 0;">
            <li>✓ Different device + newer timestamp → <strong style="color: #28a745;">Auto-import</strong></li>
            <li>✗ Different device + older timestamp → <strong style="color: #ffc107;">Warning, keep local</strong></li>
            <li>= Same device → <strong style="color: #6c757d;">URL ignored (localStorage is source of truth)</strong></li>
          </ul>
          <div><strong>🔄 Last sync:</strong> ${lastSync ? new Date(parseInt(lastSync)).toLocaleString() : 'Never'}</div>
          <div><strong>⚠️ Troubleshooting:</strong></div>
          <ul style="margin: 0 0 0 20px; padding: 0;">
            <li>"WinID mismatch" → URL belongs to different task window</li>
            <li>"Older data" warning → Other device has newer unsynced changes</li>
            <li>No sync indicator → Perform first cross-device sync</li>
          </ul>
          <div style="font-size: 10px; color: #6c757d; margin-top: 8px; padding-top: 8px; border-top: 1px solid #e9ecef;">
            SSTT v1.3 | <a href="https://github.com/stefanibus/smart-simple-task-tracker" target="_blank" style="color: #4a6fa5;">GitHub Repository</a>
          </div>
        </div>
      `;
    }
  }

  // Toggle button text when clicked
  document.addEventListener('click', function (e) {
    const btn = e.target.closest('#showSyncDetails');
    if (btn) {
      const details = document.getElementById('syncDetails');
      if (details) {
        const isHidden = details.style.display === 'none';
        details.style.display = isHidden ? 'block' : 'none';
        btn.textContent = isHidden ? '🔧 Hide technical details' : '📋 Show technical details';
      }
    }
  });



  // Update modal status when sessions load (override without breaking)
  const originalLoadSessions = loadSessions;
  loadSessions = function () {
    originalLoadSessions();
    updateModalSyncStatus();
  };

  // Initial update
  updateModalSyncStatus();
  // ===== END MODAL SYNC DETAILS TOGGLE =====

}); // ← DOMContentLoaded ends here



// Optional: Clear sync history for this task
function clearSyncHistory() {
  localStorage.removeItem(LAST_SYNC_TIMESTAMP_KEY);
  localStorage.removeItem(LAST_SYNC_MACHINE_KEY);
  updateSyncStatusDisplay();
  console.log("SSTT: Sync history cleared");
}

// ===== MODAL FUNCTIONALITY START =====
const docsToggle = document.getElementById('docsToggle');
const docsModal = document.getElementById('docsModal');

if (docsToggle && docsModal) {
  docsToggle.addEventListener('click', function (e) {
    e.stopPropagation();
    docsModal.style.display =
      docsModal.style.display === 'none' ? 'block' : 'none';
  });

  // Close modal when clicking outside
  document.addEventListener('click', function (event) {
    if (
      docsModal.style.display === 'block' &&
      !docsModal.contains(event.target) &&
      event.target !== docsToggle
    ) {
      docsModal.style.display = 'none';
    }
  });
}
// ===== MODAL FUNCTIONALITY END =====
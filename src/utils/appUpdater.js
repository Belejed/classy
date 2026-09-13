/**
 * Classy App Updater & Cache Buster Utility
 * Ensures all client devices always run the latest build, clears legacy localStorage,
 * unregisters lingering service workers, and auto-refreshes data on tab focus.
 */

const PRESERVED_STORAGE_PREFIXES = [
  'sb-', // Supabase session tokens
  'classy_changelog', // Changelog view state
  'classy_app_build_version', // Version tracker
  'classy_extra_superadmins', // Configured superadmin list
  'classy_pending_upload_' // In-flight assignment upload protection
];

/**
 * 1. Purge legacy offline data and stale cache from localStorage
 */
export const purgeLegacyStorage = () => {
  try {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      const isPreserved = PRESERVED_STORAGE_PREFIXES.some(prefix => key.startsWith(prefix));
      if (!isPreserved) {
        if (
          key.startsWith('noted_') ||
          key.startsWith('offline_') ||
          key.startsWith('cache_') ||
          key.startsWith('temp_') ||
          key.startsWith('firebase:') ||
          key === 'app_theme' ||
          key === 'classy_theme' ||
          key === 'noted_files' ||
          key === 'noted_tasks' ||
          key === 'noted_classes' ||
          key === 'noted_schedules'
        ) {
          keysToRemove.push(key);
        }
      }
    }

    keysToRemove.forEach(k => {
      try {
        localStorage.removeItem(k);
      } catch {}
    });

    if (keysToRemove.length > 0) {
      console.log(`[AppUpdater] Cleaned ${keysToRemove.length} legacy localStorage entries.`);
    }
  } catch (err) {
    console.warn('[AppUpdater] Storage purge warning:', err);
  }
};

/**
 * 2. Unregister lingering service workers & clear CacheStorage
 */
export const unregisterServiceWorkersAndCaches = async () => {
  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
      }
    }

    if ('caches' in window) {
      const cacheNames = await caches.keys();
      for (const name of cacheNames) {
        await caches.delete(name);
      }
    }
  } catch (err) {
    console.warn('[AppUpdater] Service worker/cache unregister warning:', err);
  }
};

/**
 * 3. Check for app updates against /version.json
 */
let isReloading = false;

export const checkAppUpdate = async () => {
  if (isReloading) return false;

  try {
    const response = await fetch(`/version.json?_t=${Date.now()}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    });

    if (!response.ok) return false;

    const data = await response.json();
    const serverVersion = String(data.version || data.builtAt || '');
    if (!serverVersion) return false;

    const localVersion = localStorage.getItem('classy_app_build_version');

    if (!localVersion) {
      // First run or after storage clear: record version
      localStorage.setItem('classy_app_build_version', serverVersion);
      return false;
    }

    if (localVersion !== serverVersion) {
      console.log(`[AppUpdater] New build detected (local: ${localVersion}, server: ${serverVersion}). Force refreshing...`);
      localStorage.setItem('classy_app_build_version', serverVersion);
      isReloading = true;
      
      // Perform clean hard reload
      window.location.reload();
      return true;
    }
  } catch {
    // Network offline or failed fetch: skip silently
  }
  return false;
};

/**
 * 4. Setup global update listeners and auto-refresh on tab entry / focus
 */
export const setupGlobalUpdateListeners = ({ onRefreshData } = {}) => {
  // Purge legacy storage & unregister old service workers immediately
  purgeLegacyStorage();
  unregisterServiceWorkersAndCaches();

  // Check version on initial load
  checkAppUpdate();

  // Vite Preload Error Handler (when dynamic chunks 404 after a new deployment)
  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault();
    console.warn('[AppUpdater] Vite preload chunk error detected. Reloading for latest bundle...');
    window.location.reload();
  });

  // Handle visibility and focus: whenever user enters or returns to tab
  let lastRefreshTime = Date.now();
  const MIN_REFRESH_INTERVAL_MS = 20 * 1000; // 20 seconds throttle

  const handleUserReturn = async () => {
    const now = Date.now();
    if (now - lastRefreshTime < MIN_REFRESH_INTERVAL_MS) return;
    lastRefreshTime = now;

    // 1. Check if new code was deployed
    const updated = await checkAppUpdate();
    if (updated) return;

    // 2. Trigger fresh data load from Supabase
    if (typeof onRefreshData === 'function') {
      try {
        await onRefreshData();
      } catch (err) {
        console.warn('[AppUpdater] Auto-refresh data warning:', err);
      }
    }
  };

  const onVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      handleUserReturn();
    }
  };

  const onWindowFocus = () => {
    handleUserReturn();
  };

  document.addEventListener('visibilitychange', onVisibilityChange);
  window.addEventListener('focus', onWindowFocus);

  return () => {
    document.removeEventListener('visibilitychange', onVisibilityChange);
    window.removeEventListener('focus', onWindowFocus);
  };
};

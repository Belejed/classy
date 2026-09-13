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
 * Updates local version tracking quietly without aggressive page reloads.
 */
export const checkAppUpdate = async () => {
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
      localStorage.setItem('classy_app_build_version', serverVersion);
      return false;
    }

    if (localVersion !== serverVersion) {
      console.log(`[AppUpdater] New build detected (local: ${localVersion}, server: ${serverVersion}). Version recorded.`);
      localStorage.setItem('classy_app_build_version', serverVersion);
      return true;
    }
  } catch {
    // Network offline or failed fetch: skip silently
  }
  return false;
};

/**
 * 4. Setup global update listeners and auto-refresh on tab entry / focus
 * Quietly syncs fresh Supabase data in the background without reloading the page.
 */
export const setupGlobalUpdateListeners = ({ onRefreshData } = {}) => {
  // Purge legacy storage & unregister old service workers once
  purgeLegacyStorage();
  unregisterServiceWorkersAndCaches();

  // Check version once quietly on initial load
  checkAppUpdate();

  // Vite Preload Error Handler (only reloads if dynamic chunks 404 after a deployment)
  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault();
    console.warn('[AppUpdater] Vite preload chunk error detected. Reloading for latest bundle...');
    window.location.reload();
  });

  // Handle visibility: whenever user returns to the tab, quietly sync data from Supabase
  let lastRefreshTime = Date.now();
  const MIN_REFRESH_INTERVAL_MS = 60 * 1000; // 60 seconds throttle between background data fetches

  const handleUserReturn = async () => {
    const now = Date.now();
    if (now - lastRefreshTime < MIN_REFRESH_INTERVAL_MS) return;
    lastRefreshTime = now;

    // Check version quietly in background without reloading
    checkAppUpdate();

    // Trigger fresh data load from Supabase quietly in background
    if (typeof onRefreshData === 'function') {
      try {
        await onRefreshData();
      } catch (err) {
        console.warn('[AppUpdater] Background data sync warning:', err);
      }
    }
  };

  const onVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      handleUserReturn();
    }
  };

  document.addEventListener('visibilitychange', onVisibilityChange);

  return () => {
    document.removeEventListener('visibilitychange', onVisibilityChange);
  };
};

/**
 * 20-Minute Idle Session Timeout Manager
 * Automatically logs out the user after 20 minutes of inactivity across all browser tabs.
 */

export const IDLE_TIMEOUT_MS = 20 * 60 * 1000; // 20 minutes in milliseconds
const LAST_ACTIVITY_KEY = 'classy_last_activity_epoch';
const THROTTLE_ACTIVITY_MS = 10 * 1000; // Throttle activity updates to once every 10 seconds

export function markUserActive() {
  try {
    const now = Date.now();
    const prev = Number(localStorage.getItem(LAST_ACTIVITY_KEY) || 0);
    if (now - prev > THROTTLE_ACTIVITY_MS) {
      localStorage.setItem(LAST_ACTIVITY_KEY, now.toString());
    }
  } catch {}
}

export function resetActivityEpoch() {
  try {
    localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
  } catch {}
}

export function clearActivityEpoch() {
  try {
    localStorage.removeItem(LAST_ACTIVITY_KEY);
  } catch {}
}

export function isSessionExpired() {
  try {
    const last = Number(localStorage.getItem(LAST_ACTIVITY_KEY) || 0);
    if (!last) return false;
    return (Date.now() - last) > IDLE_TIMEOUT_MS;
  } catch {
    return false;
  }
}

export function setupIdleSessionWatcher({ onTimeout, enabled = true }) {
  if (!enabled || typeof window === 'undefined') return () => {};

  let checkTimer = null;
  let hasTimedOut = false;

  const triggerTimeout = () => {
    if (hasTimedOut) return;
    hasTimedOut = true;
    clearActivityEpoch();
    if (typeof onTimeout === 'function') {
      onTimeout();
    }
  };

  const checkInactivity = () => {
    try {
      const last = Number(localStorage.getItem(LAST_ACTIVITY_KEY) || 0);
      if (!last) {
        // If not initialized yet, initialize now
        resetActivityEpoch();
        return;
      }

      const elapsed = Date.now() - last;
      if (elapsed >= IDLE_TIMEOUT_MS) {
        triggerTimeout();
      }
    } catch {}
  };

  // Immediate check on setup (e.g. when reopening a tab or restoring a session)
  checkInactivity();

  // Activity handler (throttled)
  const handleUserActivity = () => {
    if (hasTimedOut) return;
    markUserActive();
  };

  // Event listeners for user interaction
  const events = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll', 'click'];
  events.forEach((evt) => {
    window.addEventListener(evt, handleUserActivity, { passive: true });
  });

  // Handle tab visibility change & window focus (e.g. waking up laptop, switching back to tab)
  const handleVisibilityOrFocus = () => {
    if (document.visibilityState === 'visible') {
      checkInactivity();
    }
  };
  document.addEventListener('visibilitychange', handleVisibilityOrFocus);
  window.addEventListener('focus', handleVisibilityOrFocus);

  // Periodic heartbeat checker every 10 seconds
  checkTimer = setInterval(checkInactivity, 10 * 1000);

  return () => {
    if (checkTimer) clearInterval(checkTimer);
    events.forEach((evt) => {
      window.removeEventListener(evt, handleUserActivity);
    });
    document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
    window.removeEventListener('focus', handleVisibilityOrFocus);
  };
}

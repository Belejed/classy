/**
 * Current release changelog information
 */
export const CURRENT_CHANGELOG = {
  version: 'v2.6.0',
  title: 'Pembaruan Sistem • v2.6.0',
  releaseDate: '2026-09-14', // Format YYYY-MM-DD
};

/**
 * Formats a Date object into YYYY-MM-DD
 */
export function getLocalDateString(dateInput = new Date()) {
  const d = new Date(dateInput);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Determines whether the changelog modal should automatically pop up:
 * 1. SETIAP SENIN: Otomatis muncul pada kunjungan pertama setiap hari Senin.
 * 2. ATAU: Jika terdapat rilis versi baru yang belum pernah dilihat sama sekali.
 */
export function shouldShowChangelogAuto() {
  if (typeof window === 'undefined') return false;
  try {
    const now = new Date();
    const todayKey = getLocalDateString(now);
    const isMonday = now.getDay() === 1; // 1 = Monday (Senin)

    // 1. Setiap hari Senin: Muncul sekali di pembukaan pertama hari Senin tersebut
    if (isMonday) {
      const seenThisMonday = localStorage.getItem(`classy_monday_changelog_${todayKey}`);
      if (!seenThisMonday) {
        return true;
      }
    }

    // 2. Jika ada pembaruan versi baru yang belum pernah dilihat sama sekali
    const seenVersion = localStorage.getItem('classy_changelog_seen_version');
    if (seenVersion !== CURRENT_CHANGELOG.version) {
      const seenToday = localStorage.getItem(`classy_changelog_seen_date_${todayKey}`);
      if (!seenToday) {
        return true;
      }
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Record that the user has seen/dismissed the changelog
 */
export function markChangelogSeen() {
  if (typeof window === 'undefined') return;
  try {
    const now = new Date();
    const todayKey = getLocalDateString(now);

    // Tandai sudah dilihat untuk hari Senin ini
    localStorage.setItem(`classy_monday_changelog_${todayKey}`, 'true');
    localStorage.setItem(`classy_changelog_seen_date_${todayKey}`, 'true');
    localStorage.setItem('classy_changelog_seen_version', CURRENT_CHANGELOG.version);
    localStorage.setItem('classy_changelog_last_seen_at', Date.now().toString());
  } catch {}
}

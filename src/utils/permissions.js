/**
 * Centralized Role & Permission System for Classy
 *
 * Roles:
 * - 'komti': Full admin (create, edit, delete, settings, members, PIN)
 * - 'vice_komti': Full access to manage/edit (tasks, files, schedule, announcements, PIN), but CANNOT delete anything.
 * - 'division_head': Access only to input files and tasks (cannot delete, view-only on other features).
 * - 'lecturer': Lecturer / Dosen pengajar
 * - 'student': Standard student member
 * - 'superadmin': Global platform superadmin
 */

export const ROLES = {
  KOMTI: 'komti',
  VICE_KOMTI: 'vice_komti',
  DIVISION_HEAD: 'division_head',
  LECTURER: 'lecturer',
  STUDENT: 'student',
  SUPERADMIN: 'superadmin'
};

export const normalizeRole = (role) => {
  const r = String(role || '').toLowerCase().trim();
  if (r === 'coordinator') return ROLES.KOMTI;
  if (r === 'wakil_komti') return ROLES.VICE_KOMTI;
  if (r === 'kadiv' || r === 'kepala_divisi') return ROLES.DIVISION_HEAD;
  if (r === 'dosen') return ROLES.LECTURER;
  return r || ROLES.STUDENT;
};

export const isKomti = (role) => {
  const r = normalizeRole(role);
  return r === ROLES.KOMTI || r === ROLES.SUPERADMIN;
};

export const isViceKomti = (role) => {
  const r = normalizeRole(role);
  return r === ROLES.VICE_KOMTI;
};

export const isDivisionHead = (role) => {
  const r = normalizeRole(role);
  return r === ROLES.DIVISION_HEAD;
};

// General manager check (Komti, Wakil Komti, Lecturer, Superadmin)
export const isClassManager = (role, isOwner = false) => {
  if (isOwner) return true;
  const r = normalizeRole(role);
  return [ROLES.KOMTI, ROLES.VICE_KOMTI, ROLES.LECTURER, ROLES.SUPERADMIN].includes(r);
};

// Can manage Tasks (Create, Edit): Komti, Wakil Komti, Kepala Divisi, Lecturer, Superadmin, Owner
export const canManageTasks = (role, isOwner = false) => {
  if (isOwner) return true;
  const r = normalizeRole(role);
  return [ROLES.KOMTI, ROLES.VICE_KOMTI, ROLES.DIVISION_HEAD, ROLES.LECTURER, ROLES.SUPERADMIN].includes(r);
};

// Can manage Files (Upload, Create folders): Komti, Wakil Komti, Kepala Divisi, Lecturer, Superadmin, Owner
export const canManageFiles = (role, isOwner = false) => {
  if (isOwner) return true;
  const r = normalizeRole(role);
  return [ROLES.KOMTI, ROLES.VICE_KOMTI, ROLES.DIVISION_HEAD, ROLES.LECTURER, ROLES.SUPERADMIN].includes(r);
};

// Can manage Schedule (Create, Edit): Komti, Wakil Komti, Lecturer, Superadmin, Owner (NOT Kepala Divisi)
export const canManageSchedule = (role, isOwner = false) => {
  if (isOwner) return true;
  const r = normalizeRole(role);
  return [ROLES.KOMTI, ROLES.VICE_KOMTI, ROLES.LECTURER, ROLES.SUPERADMIN].includes(r);
};

// Can manage Announcements (Create, Edit): Komti, Wakil Komti, Lecturer, Superadmin, Owner (NOT Kepala Divisi)
export const canManageAnnouncements = (role, isOwner = false) => {
  if (isOwner) return true;
  const r = normalizeRole(role);
  return [ROLES.KOMTI, ROLES.VICE_KOMTI, ROLES.LECTURER, ROLES.SUPERADMIN].includes(r);
};

// Can access Rapikan Tugas (PIN Komti): Komti, Wakil Komti, Superadmin, Owner (NOT Kepala Divisi)
export const canAccessSubmissionsManager = (role, isOwner = false) => {
  if (isOwner) return true;
  const r = normalizeRole(role);
  return [ROLES.KOMTI, ROLES.VICE_KOMTI, ROLES.SUPERADMIN].includes(r);
};

// Can manage Class Structure: ONLY Komti, Wakil Komti, Superadmin, Owner
export const canManageClassStructure = (role, isOwner = false) => {
  if (isOwner) return true;
  const r = normalizeRole(role);
  return [ROLES.KOMTI, ROLES.VICE_KOMTI, ROLES.SUPERADMIN].includes(r);
};

// Can access Monitoring / Cek Tugas Member: Komti, Wakil Komti, PJ (division_head or in structure.divisions), Lecturer, Superadmin, Owner
export const canAccessMemberTasks = (role, isOwner = false, currentClass = null, currentUser = null) => {
  if (isOwner) return true;
  const r = normalizeRole(role);
  if ([ROLES.KOMTI, ROLES.VICE_KOMTI, ROLES.DIVISION_HEAD, ROLES.LECTURER, ROLES.SUPERADMIN].includes(r)) {
    return true;
  }

  // Check if currentUser is assigned as PJ in structure.divisions
  if (currentClass?.structure?.divisions && Array.isArray(currentClass.structure.divisions) && currentUser) {
    const uName = (currentUser.displayName || currentUser.name || '').toLowerCase().trim();
    const uEmail = (currentUser.email || '').toLowerCase().trim();
    const uId = currentUser.uid || currentUser.id;

    const isStructurePJ = currentClass.structure.divisions.some(div => {
      if (!div) return false;
      const pj1 = (div.leaderName || '').toLowerCase().trim();
      const pj2 = (div.leaderName2 || '').toLowerCase().trim();
      const divUid1 = div.memberId || div.userId || '';
      const divUid2 = div.memberId2 || div.userId2 || '';

      if (uId && (divUid1 === uId || divUid2 === uId)) return true;
      if (uName && (pj1 === uName || pj2 === uName)) return true;
      return false;
    });

    if (isStructurePJ) return true;
  }

  // Check if currentUser is assigned as komti / viceKomti in structure
  if (currentClass?.structure && currentUser) {
    const uId = currentUser.uid || currentUser.id;
    const uName = (currentUser.displayName || currentUser.name || '').toLowerCase().trim();
    const komtiId = currentClass.structure.komti?.memberId || '';
    const viceId = currentClass.structure.viceKomti?.memberId || '';
    const komtiName = (currentClass.structure.komti?.name || '').toLowerCase().trim();
    const viceName = (currentClass.structure.viceKomti?.name || '').toLowerCase().trim();

    if (uId && (komtiId === uId || viceId === uId)) return true;
    if (uName && (komtiName === uName || viceName === uName)) return true;
  }

  return false;
};

// CAN DELETE: ONLY Komti, Lecturer, Superadmin, Owner!
// WAKIL KOMTI AND KEPALA DIVISI CANNOT DELETE ANYTHING!
export const canDeleteAnything = (role, isOwner = false) => {
  if (isOwner) return true;
  const r = normalizeRole(role);
  // Specifically: vice_komti and division_head CANNOT delete
  if (r === ROLES.VICE_KOMTI || r === ROLES.DIVISION_HEAD) return false;
  return [ROLES.KOMTI, ROLES.LECTURER, ROLES.SUPERADMIN].includes(r);
};

// Role display label
export const getRoleDisplayName = (role) => {
  const r = normalizeRole(role);
  switch (r) {
    case ROLES.SUPERADMIN: return '⚡ Superadmin';
    case ROLES.KOMTI: return '👑 Komti';
    case ROLES.VICE_KOMTI: return '🛡️ Wakil Komti';
    case ROLES.DIVISION_HEAD: return '📁 Kepala Divisi';
    case ROLES.LECTURER: return '🎓 Dosen';
    default: return '👤 Mahasiswa';
  }
};

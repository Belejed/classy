import { db, auth, isConfigured as isFirebaseConfigured } from '../firebase.js';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot
} from 'firebase/firestore';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged as onFirebaseAuthStateChanged,
  sendPasswordResetEmail,
  updatePassword as updateFirebasePassword,
  updateEmail as updateFirebaseEmail,
  updateProfile as updateFirebaseProfile
} from 'firebase/auth';
import { extractDriveFileId } from './driveUpload.js';

export const isSupabaseConfigured = isFirebaseConfigured;

// --- FIRESTORE ADAPTER & SANITIZER ---
const sanitizeForFirestore = (obj) => {
  if (obj === undefined) return null;
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map(sanitizeForFirestore);
  }
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = sanitizeForFirestore(value);
    }
  }
  return result;
};

const cleanForFirestore = (collName, item) => {
  if (!item || typeof item !== 'object') return sanitizeForFirestore(item);
  const copy = JSON.parse(JSON.stringify(item));
  if (collName === 'tasks') {
    if (Array.isArray(copy.attachments)) {
      copy.attachments.forEach(a => {
        if (a && a.dataUrl && (a.url || a.directUrl || a.fileId)) {
          delete a.dataUrl;
        }
      });
    }
    if (typeof copy.description === 'string' && copy.description.startsWith('{')) {
      try {
        const p = JSON.parse(copy.description);
        if (Array.isArray(p.attachments)) {
          p.attachments.forEach(a => {
            if (a && a.dataUrl && (a.url || a.directUrl || a.fileId)) {
              delete a.dataUrl;
            }
          });
          copy.description = JSON.stringify(p);
        }
      } catch {}
    }
  }
  return sanitizeForFirestore(copy);
};

class FirestoreQueryBuilder {
  constructor(tableName) {
    this.tableName = tableName;
    this.filters = [];
    this.sorts = [];
    this.limitCount = null;
    this.rangeFrom = null;
    this.rangeTo = null;
    this.isSingle = false;
    this.isMaybeSingle = false;
    this.countExact = false;
    this.isHead = false;
  }

  select(fields = '*', options = {}) {
    if (options && options.count === 'exact') this.countExact = true;
    if (options && options.head) this.isHead = true;
    return this;
  }

  eq(field, value) {
    this.filters.push({ field, op: 'eq', value });
    return this;
  }

  ilike(field, pattern) {
    this.filters.push({ field, op: 'ilike', value: pattern });
    return this;
  }

  in(field, values) {
    this.filters.push({ field, op: 'in', value: values });
    return this;
  }

  match(obj) {
    if (obj && typeof obj === 'object') {
      for (const [k, v] of Object.entries(obj)) {
        this.filters.push({ field: k, op: 'eq', value: v });
      }
    }
    return this;
  }

  filter(field, op, value) {
    this.filters.push({ field, op: op || 'eq', value });
    return this;
  }

  limit(n) {
    this.limitCount = Number(n);
    return this;
  }

  range(from, to) {
    this.rangeFrom = Number(from);
    this.rangeTo = Number(to);
    return this;
  }

  order(field, { ascending = true } = {}) {
    this.sorts.push({ field, ascending });
    return this;
  }

  maybeSingle() {
    this.isMaybeSingle = true;
    return this.execute();
  }

  single() {
    this.isSingle = true;
    return this.execute();
  }

  then(resolve, reject) {
    return this.execute().then(resolve, reject);
  }

  async execute() {
    try {
      const idFilter = this.filters.find(f => f.field === 'id' && f.op === 'eq');
      if (idFilter && this.filters.length === 1 && (this.isSingle || this.isMaybeSingle)) {
        const docRef = doc(db, this.tableName, String(idFilter.value));
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) {
          return { data: null, error: this.isSingle ? new Error('Record not found') : null, count: 0 };
        }
        return { data: { id: docSnap.id, ...docSnap.data() }, error: null, count: 1 };
      }

      let q;
      const wsFilter = this.filters.find(f => f.field === 'workspace_id' && f.op === 'eq');
      if (wsFilter) {
        q = query(collection(db, this.tableName), where('workspace_id', '==', wsFilter.value));
      } else {
        q = collection(db, this.tableName);
      }

      const snapshot = await getDocs(q);
      let records = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

      for (const filter of this.filters) {
        if (filter.op === 'eq') {
          records = records.filter(r => String(r[filter.field] ?? '') === String(filter.value ?? ''));
        } else if (filter.op === 'ilike') {
          const cleanVal = String(filter.value || '').toLowerCase().replace(/%/g, '');
          records = records.filter(r => String(r[filter.field] || '').toLowerCase().includes(cleanVal));
        } else if (filter.op === 'in') {
          const arr = Array.isArray(filter.value) ? filter.value : [filter.value];
          records = records.filter(r => arr.map(String).includes(String(r[filter.field] ?? '')));
        }
      }

      for (const sort of this.sorts) {
        records.sort((a, b) => {
          const valA = a[sort.field] ?? '';
          const valB = b[sort.field] ?? '';
          if (valA < valB) return sort.ascending ? -1 : 1;
          if (valA > valB) return sort.ascending ? 1 : -1;
          return 0;
        });
      }

      const totalCount = records.length;

      if (this.rangeFrom !== null || this.rangeTo !== null) {
        records = records.slice(this.rangeFrom || 0, this.rangeTo !== null ? this.rangeTo + 1 : undefined);
      }

      if (this.limitCount && this.limitCount > 0) {
        records = records.slice(0, this.limitCount);
      }

      if (this.isHead) {
        return { data: null, count: totalCount, error: null };
      }
      if (this.isSingle || this.isMaybeSingle) {
        const first = records[0] || null;
        if (!first && this.isSingle) {
          return { data: null, error: new Error('Record not found'), count: 0 };
        }
        return { data: first, count: first ? 1 : 0, error: null };
      }
      return { data: records, count: totalCount, error: null };
    } catch (err) {
      console.error(`Firestore query error on ${this.tableName}:`, err);
      return { data: null, error: err, count: 0 };
    }
  }

  async insert(data) {
    try {
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        const id = item.id || 'doc_' + Math.random().toString(36).substr(2, 9);
        const itemToSave = cleanForFirestore(this.tableName, { ...item, id });
        await setDoc(doc(db, this.tableName, id), itemToSave, { merge: true });
      }
      return { data, error: null };
    } catch (err) {
      console.error(`Firestore insert error on ${this.tableName}:`, err);
      return { data: null, error: err };
    }
  }

  async upsert(data) {
    return this.insert(data);
  }

  update(updates) {
    this.pendingUpdates = updates;
    return {
      eq: (field, value) => {
        this.filters.push({ field, op: 'eq', value });
        return {
          eq: (field2, value2) => {
            this.filters.push({ field: field2, op: 'eq', value: value2 });
            return this.executeUpdate();
          },
          then: (resolve, reject) => this.executeUpdate().then(resolve, reject)
        };
      },
      then: (resolve, reject) => this.executeUpdate().then(resolve, reject)
    };
  }

  async executeUpdate() {
    try {
      const updates = cleanForFirestore(this.tableName, this.pendingUpdates);
      const idFilter = this.filters.find(f => f.field === 'id' && f.op === 'eq');
      if (idFilter && this.filters.length === 1) {
        await setDoc(doc(db, this.tableName, String(idFilter.value)), updates, { merge: true });
        return { data: updates, error: null };
      }

      const { data: records } = await this.execute();
      if (records && records.length > 0) {
        for (const r of records) {
          await setDoc(doc(db, this.tableName, r.id), updates, { merge: true });
        }
      }
      return { data: updates, error: null };
    } catch (err) {
      console.error(`Firestore update error on ${this.tableName}:`, err);
      return { data: null, error: err };
    }
  }

  delete() {
    return {
      eq: (field, value) => {
        this.filters.push({ field, op: 'eq', value });
        return {
          eq: (field2, value2) => {
            this.filters.push({ field: field2, op: 'eq', value: value2 });
            return this.executeDelete();
          },
          then: (resolve, reject) => this.executeDelete().then(resolve, reject)
        };
      },
      then: (resolve, reject) => this.executeDelete().then(resolve, reject)
    };
  }

  async executeDelete() {
    try {
      const idFilter = this.filters.find(f => f.field === 'id' && f.op === 'eq');
      if (idFilter && this.filters.length === 1) {
        await deleteDoc(doc(db, this.tableName, String(idFilter.value)));
        return { data: null, error: null };
      }

      const { data: records } = await this.execute();
      if (records && records.length > 0) {
        for (const r of records) {
          await deleteDoc(doc(db, this.tableName, r.id));
        }
      }
      return { data: null, error: null };
    } catch (err) {
      console.error(`Firestore delete error on ${this.tableName}:`, err);
      return { data: null, error: err };
    }
  }
}

const supabase = {
  from: (table) => new FirestoreQueryBuilder(table)
};

// Generate 6-character clean unique join code like 'A7K29P'
export const generateJoinCode = () => {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// Default notification preferences
export const DEFAULT_NOTIFICATION_PREFERENCES = {
  whatsappEnabled: true,
  assignmentUpdates: true,
  newAnnouncements: true,
  upcomingDeadlines: true,
  scheduleChanges: true,
  importantClassInfo: true
};

// --- SUPERADMIN CONFIGURATION (GHOST / STEALTH ROLE) ---
export const SUPERADMIN_EMAILS = [
  'exars.012@gmail.com',
  'arya@exars.my.id'
];

export const isSuperAdminEmail = (email) => {
  if (!email) return false;
  const clean = String(email).trim().toLowerCase();
  if (SUPERADMIN_EMAILS.some(e => e.toLowerCase() === clean)) return true;
  try {
    const extra = JSON.parse(localStorage.getItem('classy_extra_superadmins') || '[]');
    if (Array.isArray(extra) && extra.map(e => String(e).toLowerCase()).includes(clean)) return true;
  } catch {}
  return false;
};

export const isSuperAdmin = (user) => {
  if (!user) return false;
  if (user.role === 'superadmin' || user.userRole === 'superadmin' || user.user_metadata?.role === 'superadmin') return true;
  return isSuperAdminEmail(user.email);
};

// Helper: Determine if a class is blocked (Classes other than MLOG B are blocked by default unless unblocked by Superadmin)
export const isClassBlocked = (cls) => {
  if (!cls) return false;
  if (typeof cls.isBlocked === 'boolean') return cls.isBlocked;
  if (cls.status === 'blocked' || cls.status === 'pending_approval') return true;
  if (cls.status === 'active') return false;

  // Default rule: only M.Log B is active, all other classes are blocked
  const name = (cls.name || '').toLowerCase();
  const identifier = (cls.classIdentifier || '').toLowerCase();
  const isMlogB = (name.includes('log') && name.includes('b')) || identifier.includes('26b');
  return !isMlogB;
};

// Helper: Protect primary class (M.Log B) from accidental deletion
export const isProtectedClass = (clsOrId) => {
  if (!clsOrId) return false;
  const id = typeof clsOrId === 'string' ? clsOrId : clsOrId.id;
  const name = typeof clsOrId === 'object' ? (clsOrId.name || '').toLowerCase() : '';
  const identifier = typeof clsOrId === 'object' ? (clsOrId.classIdentifier || '').toLowerCase() : '';

  if (id === 'class_xwa91itgg') return true;
  if (name.includes('log') && name.includes('b')) return true;
  if (identifier.includes('26b')) return true;
  return false;
};

// Format Firebase user to Classy standard user object
const formatUser = (user, extra = {}) => {
  if (!user) return null;
  const email = user.email || '';
  const isSuper = isSuperAdminEmail(email);
  let savedMeta = {};
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      savedMeta = JSON.parse(localStorage.getItem(`classy_user_meta_${user.uid}`) || '{}');
    } catch {}
  }

  const displayName = extra.fullName || user.displayName || savedMeta.fullName || email.split('@')[0];
  const phoneNumber = extra.phoneNumber || user.phoneNumber || savedMeta.phoneNumber || '';
  const notificationPreferences = extra.notificationPreferences || savedMeta.notificationPreferences || DEFAULT_NOTIFICATION_PREFERENCES;
  const role = isSuper ? 'superadmin' : (savedMeta.role || 'user');

  if (typeof window !== 'undefined' && window.localStorage) {
    if (extra.fullName || extra.phoneNumber || extra.notificationPreferences || isSuper) {
      try {
        localStorage.setItem(`classy_user_meta_${user.uid}`, JSON.stringify({
          fullName: displayName,
          phoneNumber,
          role,
          notificationPreferences
        }));
      } catch {}
    }
  }

  return {
    uid: user.uid,
    id: user.uid,
    email: user.email,
    displayName,
    phoneNumber,
    role,
    userRole: role,
    isSuperAdmin: isSuper,
    notificationPreferences
  };
};

// Helper to translate Firebase Auth errors into user-friendly Indonesian messages
export const getFriendlyAuthErrorMessage = (err) => {
  if (!err) return 'Terjadi kesalahan autentikasi.';
  const code = err.code || '';
  const msg = (err.message || '').toLowerCase();

  if (
    code === 'auth/invalid-credential' ||
    code === 'auth/wrong-password' ||
    code === 'auth/user-not-found' ||
    msg.includes('invalid-credential') ||
    msg.includes('wrong-password') ||
    msg.includes('user-not-found')
  ) {
    return 'Email/Nomor WhatsApp atau password salah. Password default mahasiswa adalah 123456.';
  }
  if (code === 'auth/invalid-email' || msg.includes('invalid-email')) {
    return 'Format email atau no. WhatsApp tidak valid. Pastikan terdaftar.';
  }
  if (code === 'auth/user-disabled' || msg.includes('user-disabled')) {
    return 'Akun ini telah dinonaktifkan. Hubungi admin atau Komti.';
  }
  if (code === 'auth/too-many-requests' || msg.includes('too-many-requests')) {
    return 'Terlalu banyak percobaan gagal. Silakan tunggu beberapa saat lagi.';
  }
  if (code === 'auth/email-already-in-use' || msg.includes('email-already-in-use')) {
    return 'Email ini sudah terdaftar. Silakan langsung masuk / login.';
  }
  if (code === 'auth/weak-password' || msg.includes('weak-password')) {
    return 'Password terlalu singkat atau lemah. Minimal 6 karakter.';
  }
  if (code === 'auth/network-request-failed' || msg.includes('network-request-failed')) {
    return 'Koneksi internet bermasalah. Periksa jaringan Anda.';
  }

  // Clean raw Firebase error string if any unmapped error code appears
  const clean = (err.message || '').replace(/^Firebase:\s*Error\s*\((.*?)\)\.?/i, '$1').trim();
  return clean || 'Terjadi kesalahan saat memproses akun Anda.';
};

// Helper to resolve email from phone number or student name if user inputs WhatsApp or name
export const resolveEmailFromIdentifier = async (rawIdentifier) => {
  if (!rawIdentifier) return '';
  const cleanId = String(rawIdentifier).trim().toLowerCase();
  if (cleanId.includes('@')) return cleanId;

  // Clean digits for phone matching
  const phoneDigits = cleanId.replace(/\D/g, '');
  const normalizedPhone = phoneDigits.startsWith('0') 
    ? '62' + phoneDigits.slice(1) 
    : (phoneDigits.startsWith('62') ? phoneDigits : (phoneDigits ? '62' + phoneDigits : ''));

  try {
    const { data: workspaces } = await supabase.from('workspaces').select('members');
    if (Array.isArray(workspaces)) {
      for (const ws of workspaces) {
        const members = ws.members || [];
        const found = members.find(m => {
          if (!m) return false;
          // Match by phone
          if (normalizedPhone && m.phoneNumber) {
            const mPhone = String(m.phoneNumber).replace(/\D/g, '');
            const mNorm = mPhone.startsWith('0') ? '62' + mPhone.slice(1) : (mPhone.startsWith('62') ? mPhone : '62' + mPhone);
            if (mNorm === normalizedPhone) return true;
          }
          // Match by name
          if (m.name && m.name.toLowerCase().trim() === cleanId) return true;
          return false;
        });
        if (found && found.email) {
          return String(found.email).toLowerCase().trim();
        }
      }
    }
  } catch (err) {
    console.warn('Failed to resolve email from identifier:', err);
  }

  return cleanId;
};

// --- AUTHENTICATION SERVICE (FIREBASE AUTH) ---
export const authService = {
  getCurrentUser: async () => {
    try {
      if (typeof auth.authStateReady === 'function') {
        await auth.authStateReady();
      }
      return formatUser(auth.currentUser);
    } catch (err) {
      console.warn('getCurrentUser error:', err);
      return formatUser(auth.currentUser);
    }
  },

  onAuthStateChanged: (callback) => {
    return onFirebaseAuthStateChanged(auth, (user) => {
      callback(formatUser(user));
    });
  },

  login: async (emailOrIdentifier, password) => {
    try {
      const cleanPass = String(password || '').trim();
      let resolvedEmail = String(emailOrIdentifier || '').trim().toLowerCase();

      if (!resolvedEmail.includes('@')) {
        resolvedEmail = await resolveEmailFromIdentifier(resolvedEmail);
      }

      const cred = await signInWithEmailAndPassword(auth, resolvedEmail, cleanPass);
      return formatUser(cred.user);
    } catch (err) {
      throw new Error(getFriendlyAuthErrorMessage(err));
    }
  },

  signup: async (email, password, { fullName = '', phoneNumber = '' } = {}) => {
    try {
      const cleanPhone = (phoneNumber || '').trim();
      const formattedPhone = cleanPhone.startsWith('+') ? cleanPhone : (cleanPhone ? `+${cleanPhone.replace(/^0+/, '62')}` : '');

      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      if (fullName.trim()) {
        try {
          await updateFirebaseProfile(cred.user, { displayName: fullName.trim() });
        } catch {}
      }
      return formatUser(cred.user, { fullName: fullName.trim(), phoneNumber: formattedPhone });
    } catch (err) {
      throw new Error(getFriendlyAuthErrorMessage(err));
    }
  },

  updateProfile: async ({ fullName, phoneNumber, notificationPreferences }) => {
    const user = auth.currentUser;
    if (!user) throw new Error('Pengguna belum masuk.');

    try {
      if (fullName && fullName.trim()) {
        await updateFirebaseProfile(user, { displayName: fullName.trim() });
      }
      return formatUser(user, { fullName, phoneNumber, notificationPreferences });
    } catch (err) {
      throw new Error(getFriendlyAuthErrorMessage(err));
    }
  },

  resetPassword: async (email) => {
    try {
      await sendPasswordResetEmail(auth, email.trim());
      return { success: true };
    } catch (err) {
      throw new Error(getFriendlyAuthErrorMessage(err));
    }
  },

  updatePassword: async (newPassword) => {
    const user = auth.currentUser;
    if (!user) throw new Error('Pengguna belum masuk.');
    try {
      await updateFirebasePassword(user, newPassword);
      return { success: true };
    } catch (err) {
      throw new Error(getFriendlyAuthErrorMessage(err));
    }
  },

  updateEmail: async (newEmail) => {
    const user = auth.currentUser;
    if (!user) throw new Error('Pengguna belum masuk.');
    try {
      await updateFirebaseEmail(user, newEmail.trim());
      return { success: true };
    } catch (err) {
      throw new Error(getFriendlyAuthErrorMessage(err));
    }
  },

  logout: async () => {
    await firebaseSignOut(auth);
  },

  signOut: async () => {
    await firebaseSignOut(auth);
  }
};

// Helper to parse lecturer name, role, and contact phone number
export const parseLecturerInfo = (rawLecturer = '', rawNotes = '', explicitPhone = '') => {
  const text = `${rawLecturer || ''} ${rawNotes || ''} ${explicitPhone || ''}`;
  
  // Normalize if someone accidentally typed 625x... (missing the 8 for Indosat 085x)
  const typoMatch = text.match(/(?:\+?62)(5\d{8,11})/);
  let normalizedText = text;
  if (typoMatch) {
    normalizedText = text.replace(/(?:\+?62)5/, '6285');
  }

  // Extract phone number (starts with +628, 628, 08, 625 typo, or 8 followed by 8-12 digits)
  const phoneMatch = (explicitPhone || normalizedText).match(/(?:\+?62|0)?(8\d{8,12})/);
  let phone = '';
  let cleanPhone = '';
  if (phoneMatch) {
    phone = phoneMatch[0];
    cleanPhone = '62' + phoneMatch[1];
  } else if (typoMatch) {
    phone = typoMatch[0];
    cleanPhone = '628' + typoMatch[1];
  }

  // Extract role if in parentheses, but exclude if it only contains phone numbers
  let role = '';
  const parenthesesMatches = Array.from((rawLecturer || '').matchAll(/\(([^)]+)\)/g));
  for (const match of parenthesesMatches) {
    const content = match[1].trim();
    // If content is purely digits/phone characters, it's not a role
    const isPhoneContent = /^[\d\s+-]+$/.test(content);
    if (!isPhoneContent && content) {
      role = content;
      break;
    }
  }

  // Clean lecturer name:
  // 1. Remove typo format like 625...
  // 2. Remove phone in parentheses like (08128315124) or ( 0812... )
  // 3. Remove raw phone digits
  // 4. Remove role in parentheses if found
  // 5. Remove empty or whitespace-only parentheses `()`
  let name = (rawLecturer || '')
    .replace(/(?:\+?62)?5\d{8,11}/g, '')
    .replace(/\(\s*(?:\+?62|0)?8\d{8,12}\s*\)/g, '')
    .replace(/(?:\+?62|0)?8\d{8,12}/g, '')
    .replace(/\(\s*\)/g, '');

  if (role) {
    name = name.replace(new RegExp(`\\(\\s*${escapeRegExp(role)}\\s*\\)`, 'g'), '');
  }

  name = name.replace(/\s+/g, ' ').trim();

  return {
    name,
    phone,
    cleanPhone,
    role,
    lecturerName: name,
    lecturerPhone: phone,
    lecturerCleanPhone: cleanPhone,
    lecturerRole: role
  };
};

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// --- DATA SERVICE (CLASSY DOMAIN) ---
export const dbService = {
  // 1. CLASSES (Workspaces Table)
  classes: {
    list: async (userId, userEmail) => {
      const { data, error } = await supabase.from('workspaces').select('*').order('created_at', { ascending: false });
      if (error) {
        console.error('Error fetching classes:', error);
        return [];
      }

      const isSuper = isSuperAdminEmail(userEmail);
      const filtered = (data || []).filter(c => 
        !c.id.startsWith('personal_') && 
        c.invite_code !== 'PERSONAL' &&
        (isSuper ||
         c.owner_id === userId || 
         c.members?.some(m => m.userId === userId || m.email?.toLowerCase() === userEmail?.toLowerCase()))
      );

      return filtered.map(c => {
        let meta = {};
        try {
          meta = typeof c.description === 'string' && c.description.startsWith('{') ? JSON.parse(c.description) : {};
        } catch {
          meta = {};
        }

        const isOwner = c.owner_id === userId;
        const currentMember = c.members?.find(m => m.userId === userId || m.email?.toLowerCase() === userEmail?.toLowerCase());
        let userRole = isSuper ? 'superadmin' : (currentMember?.role || (isOwner ? 'komti' : 'student'));
        if (userRole === 'coordinator') userRole = 'komti';

        // An owner or superadmin is always approved
        const membershipStatus = (isOwner || isSuper) ? 'approved' : (currentMember?.status || 'approved');

        // Always hide superadmin from member lists and member count
        const cleanMembers = (c.members || []).filter(m => m && m.role !== 'superadmin' && !isSuperAdminEmail(m.email));

        const isBlocked = meta.isBlocked !== undefined
          ? Boolean(meta.isBlocked)
          : isClassBlocked({ name: c.name, classIdentifier: meta.classIdentifier || c.description, isBlocked: meta.isBlocked, status: meta.status });

        return {
          id: c.id,
          name: c.name,
          classIdentifier: meta.classIdentifier || c.description || 'TI-3A',
          lecturer: meta.lecturer || 'Dosen Pengajar',
          academicPeriod: meta.academicPeriod || '2026/2027 Ganjil',
          waGroupLink: meta.waGroupLink || '',
          joinCode: c.invite_code,
          komtiPin: meta.komtiPin || '',
          ownerId: c.owner_id,
          userRole, // 'superadmin' | 'komti' | 'lecturer' | 'student'
          membershipStatus, // 'approved' | 'pending' | 'rejected'
          isBlocked,
          status: isBlocked ? 'blocked' : 'active',
          members: cleanMembers,
          memberCount: cleanMembers.filter(m => (m.status || 'approved') === 'approved').length || 1,
          createdAt: c.created_at
        };
      });
    },

    get: async (classId) => {
      const { data, error } = await supabase.from('workspaces').select('*').eq('id', classId).maybeSingle();
      if (error || !data) return null;

      let meta = {};
      try {
        meta = typeof data.description === 'string' && data.description.startsWith('{') ? JSON.parse(data.description) : {};
      } catch {
        meta = {};
      }

      // Always hide superadmin from member lists and member count
      const cleanMembers = (data.members || []).filter(m => m && m.role !== 'superadmin' && !isSuperAdminEmail(m.email));

      const isBlocked = meta.isBlocked !== undefined
        ? Boolean(meta.isBlocked)
        : isClassBlocked({ name: data.name, classIdentifier: meta.classIdentifier || data.description, isBlocked: meta.isBlocked, status: meta.status });

      return {
        id: data.id,
        name: data.name,
        classIdentifier: meta.classIdentifier || data.description || 'TI-3A',
        lecturer: meta.lecturer || 'Dosen Pengajar',
        academicPeriod: meta.academicPeriod || '2026/2027 Ganjil',
        waGroupLink: meta.waGroupLink || '',
        joinCode: data.invite_code,
        komtiPin: meta.komtiPin || '',
        ownerId: data.owner_id,
        isBlocked,
        status: isBlocked ? 'blocked' : 'active',
        members: cleanMembers,
        memberCount: cleanMembers.filter(m => (m.status || 'approved') === 'approved').length || 1,
        createdAt: data.created_at
      };
    },

    previewByCode: async (joinCode) => {
      const cleanCode = (joinCode || '').trim().toUpperCase();
      const { data, error } = await supabase.from('workspaces').select('*').ilike('invite_code', cleanCode).maybeSingle();
      if (error || !data) return null;

      let meta = {};
      try {
        meta = typeof data.description === 'string' && data.description.startsWith('{') ? JSON.parse(data.description) : {};
      } catch {
        meta = {};
      }

      // Always hide superadmin from member lists and member count
      const cleanMembers = (data.members || []).filter(m => m && m.role !== 'superadmin' && !isSuperAdminEmail(m.email));

      const isBlocked = meta.isBlocked !== undefined
        ? Boolean(meta.isBlocked)
        : isClassBlocked({ name: data.name, classIdentifier: meta.classIdentifier || data.description, isBlocked: meta.isBlocked, status: meta.status });

      return {
        id: data.id,
        name: data.name,
        classIdentifier: meta.classIdentifier || data.description || 'TI-3A',
        lecturer: meta.lecturer || 'Dosen Pengajar',
        academicPeriod: meta.academicPeriod || '2026/2027',
        joinCode: data.invite_code,
        isBlocked,
        status: isBlocked ? 'blocked' : 'active',
        members: cleanMembers,
        memberCount: cleanMembers.filter(m => (m.status || 'approved') === 'approved').length || 1
      };
    },

    create: async (userId, userEmail, userName, { name, classIdentifier, lecturer, academicPeriod, waGroupLink = '', creatorRole = 'komti', phoneNumber = '' }) => {
      // Rule: 1 user can only have 1 class
      const existingClasses = await dbService.classes.list(userId, userEmail);
      if (existingClasses.length > 0) {
        throw new Error(`Akun Anda sudah terdaftar di kelas "${existingClasses[0].name}". Setiap pengguna hanya dapat mengikuti 1 ruang kelas.`);
      }

      const classId = 'class_' + Math.random().toString(36).substr(2, 9);
      const joinCode = generateJoinCode();

      const isSuper = isSuperAdminEmail(userEmail);
      const isMlogB = (name.trim().toLowerCase().includes('log') && name.trim().toLowerCase().includes('b')) || (classIdentifier || '').toLowerCase().includes('26b');
      // Non-superadmin classes other than M.Log B default to blocked pending admin approval
      const isBlocked = !isSuper && !isMlogB;

      const meta = {
        classIdentifier: (classIdentifier || 'TI-3A').trim(),
        lecturer: (lecturer || 'Dosen Pengajar').trim(),
        academicPeriod: (academicPeriod || '2026/2027').trim(),
        waGroupLink: (waGroupLink || '').trim(),
        isBlocked,
        status: isBlocked ? 'blocked' : 'active'
      };

      const finalRole = (creatorRole === 'lecturer' || creatorRole === 'dosen') ? 'lecturer' : 'komti';

      const newDbRecord = {
        id: classId,
        name: name.trim(),
        description: JSON.stringify(meta),
        icon: '🎓',
        color: 'indigo',
        owner_id: userId,
        invite_code: joinCode,
        created_at: new Date().toISOString(),
        members: [
          {
            userId,
            name: userName || userEmail.split('@')[0],
            email: userEmail,
            phoneNumber: (phoneNumber || '').trim(),
            role: finalRole,
            status: 'approved',
            joinedAt: new Date().toISOString()
          }
        ]
      };

      const { error } = await supabase.from('workspaces').insert(newDbRecord);
      if (error) throw error;

      // Send approval confirmation email to administrator (arya@exars.my.id)
      try {
        fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipients: ['arya@exars.my.id'],
            subject: `[PERMINTAAN KELAS BARU] Pengajuan Ruang Kelas: ${name.trim()}`,
            type: 'class_approval_request',
            title: `Pengajuan Ruang Kelas Baru`,
            subtitle: `Permintaan Aktivasi Kelas - ${name.trim()}`,
            message: `Halo Administrator! Telah diajukan pembuatan ruang kelas baru di portal Classy. Ruang kelas ini otomatis berstatus terblokir sampai Anda menyetujui / membuka aksesnya di portal.`,
            metaRows: [
              ['Nama Kelas', name.trim()],
              ['Rombel / Kode', meta.classIdentifier || '-'],
              ['Dosen Pengampu', meta.lecturer || '-'],
              ['Tahun / Periode', meta.academicPeriod || '-'],
              ['Pembuat Kelas', `${userName || userEmail} (${userEmail})`],
              ['Peran Pembuat', finalRole === 'lecturer' ? 'Dosen' : 'Komti'],
              ['No. WhatsApp', (phoneNumber || '-')],
              ['Kode Undangan', joinCode],
              ['Status Awal', isBlocked ? '🔒 Terblokir (Menunggu Aktivasi Admin)' : 'Aktif']
            ],
            ctaLabel: 'Buka Portal & Kelola Kelas',
            ctaUrl: 'https://classy.exars.my.id/lobby'
          })
        }).catch(err => console.warn('Gagal mengirim email konfirmasi kelas ke arya@exars.my.id:', err));
      } catch (emailErr) {
        console.warn('Error dispatching class creation email:', emailErr);
      }

      // Log class creation
      try {
        await dbService.logs.create(newDbRecord.id, {
          actionType: 'class_create',
          title: `Ruang kelas "${name.trim()}" dibuat`,
          details: `${userName || userEmail} membuat ruang kelas baru dengan kode undangan ${joinCode}.${isBlocked ? ' Status: Menunggu persetujuan admin (Terblokir).' : ''}`,
          actor: { name: userName || userEmail, email: userEmail, role: finalRole },
          color: isBlocked ? 'amber' : 'indigo'
        });
      } catch (logErr) {
        console.warn('Could not record create log:', logErr);
      }

      return {
        id: newDbRecord.id,
        name: newDbRecord.name,
        classIdentifier: meta.classIdentifier,
        lecturer: meta.lecturer,
        academicPeriod: meta.academicPeriod,
        waGroupLink: meta.waGroupLink,
        joinCode: newDbRecord.invite_code,
        ownerId: newDbRecord.owner_id,
        userRole: finalRole,
        membershipStatus: 'approved',
        isBlocked,
        status: isBlocked ? 'blocked' : 'active',
        members: newDbRecord.members,
        memberCount: 1,
        createdAt: newDbRecord.created_at
      };
    },

    joinByCode: async (userId, userEmail, userName, joinCode, defaultRole = 'student', phoneNumber = '') => {
      // Rule: 1 user can only have 1 active class
      const existingClasses = await dbService.classes.list(userId, userEmail);
      const cleanCode = (joinCode || '').trim().toUpperCase();
      const { data, error } = await supabase.from('workspaces').select('*').ilike('invite_code', cleanCode).maybeSingle();
      if (error || !data) {
        throw new Error('Kode kelas tidak valid atau kelas tidak ditemukan.');
      }

      // Check if class is blocked
      let rawMeta = {};
      try {
        rawMeta = typeof data.description === 'string' && data.description.startsWith('{') ? JSON.parse(data.description) : {};
      } catch {
        rawMeta = {};
      }
      const isSuper = isSuperAdminEmail(userEmail);
      const isMlogB = (data.name || '').toLowerCase().includes('log') && (data.name || '').toLowerCase().includes('b');
      const isBlocked = rawMeta.isBlocked !== undefined ? !!rawMeta.isBlocked : (!isMlogB);
      if (isBlocked && !isSuper) {
        throw new Error('Kelas ini saat ini diblokir atau belum diaktivasi oleh Superadmin. Silakan hubungi Arya via email: arya@exars.my.id untuk konfirmasi pembukaan akses.');
      }

      // If user is already in a different class
      if (existingClasses.length > 0 && existingClasses[0].id !== data.id) {
        throw new Error(`Akun Anda sudah terdaftar di kelas "${existingClasses[0].name}". Setiap pengguna hanya dapat mengikuti 1 ruang kelas. Silakan keluar dari kelas saat ini terlebih dahulu jika ingin berpindah.`);
      }

      const existingMembers = data.members || [];
      const currentMemberIndex = existingMembers.findIndex(m => m.userId === userId || m.email?.toLowerCase() === userEmail?.toLowerCase());

      let updatedMembers = [...existingMembers];
      let userStatus = 'pending';

      if (currentMemberIndex === -1) {
        // New join request -> starts as 'pending' for komti approval
        const newMember = {
          userId,
          name: userName || userEmail.split('@')[0],
          email: userEmail,
          phoneNumber: (phoneNumber || '').trim(),
          role: defaultRole,
          status: 'pending',
          joinedAt: new Date().toISOString()
        };
        updatedMembers.push(newMember);

        const { error: updErr } = await supabase.from('workspaces').update({ members: updatedMembers }).eq('id', data.id);
        if (updErr) throw updErr;

        // Log request join
        try {
          await dbService.logs.create(data.id, {
            actionType: 'member_request',
            title: `${newMember.name} meminta bergabung ke kelas`,
            details: `Mahasiswa ${newMember.name} (${userEmail}) meminta izin bergabung dengan kode ${cleanCode}. Menunggu persetujuan Komti/Dosen.`,
            actor: { name: newMember.name, email: userEmail, role: defaultRole },
            color: 'amber'
          });
        } catch (logErr) {
          console.warn('Could not record join request log:', logErr);
        }
      } else {
        // Member already exists, retain their existing status or re-request if previously denied
        const existing = updatedMembers[currentMemberIndex];
        userStatus = existing.status || 'approved';
        if (userStatus === 'denied' || userStatus === 'rejected') {
          // Allow re-requesting
          updatedMembers[currentMemberIndex] = {
            ...existing,
            status: 'pending',
            joinedAt: new Date().toISOString()
          };
          userStatus = 'pending';
          await supabase.from('workspaces').update({ members: updatedMembers }).eq('id', data.id);
        }
      }

      let meta = {};
      try {
        meta = typeof data.description === 'string' && data.description.startsWith('{') ? JSON.parse(data.description) : {};
      } catch {
        meta = {};
      }

      const currentMember = updatedMembers.find(m => m.userId === userId || m.email?.toLowerCase() === userEmail?.toLowerCase());
      const userRole = currentMember?.role || (data.owner_id === userId ? 'komti' : 'student');

      return {
        id: data.id,
        name: data.name,
        classIdentifier: meta.classIdentifier || data.description || 'TI-3A',
        lecturer: meta.lecturer || 'Dosen Pengajar',
        academicPeriod: meta.academicPeriod || '2026/2027',
        waGroupLink: meta.waGroupLink || '',
        joinCode: data.invite_code,
        komtiPin: meta.komtiPin || '',
        ownerId: data.owner_id,
        userRole,
        membershipStatus: userStatus,
        members: updatedMembers,
        memberCount: updatedMembers.filter(m => (m.status || 'approved') === 'approved').length,
        createdAt: data.created_at
      };
    },

    approveMember: async (classId, targetUserId) => {
      const { data, error } = await supabase.from('workspaces').select('*').eq('id', classId).maybeSingle();
      if (error || !data) throw new Error('Kelas tidak ditemukan.');

      const members = data.members || [];
      const targetMember = members.find(m => m.userId === targetUserId);
      const updatedMembers = members.map(m => m.userId === targetUserId ? { ...m, status: 'approved' } : m);

      const { error: updErr } = await supabase.from('workspaces').update({ members: updatedMembers }).eq('id', classId);
      if (updErr) throw updErr;

      try {
        await dbService.logs.create(classId, {
          actionType: 'member_approve',
          title: `Permintaan masuk disetujui`,
          details: `${targetMember?.name || 'Mahasiswa'} (${targetMember?.email || ''}) telah disetujui bergabung ke dalam kelas.`,
          actor: { name: 'Komti/Dosen', role: 'komti' },
          color: 'emerald'
        });
      } catch {}

      return updatedMembers;
    },

    denyMember: async (classId, targetUserId) => {
      const { data, error } = await supabase.from('workspaces').select('*').eq('id', classId).maybeSingle();
      if (error || !data) throw new Error('Kelas tidak ditemukan.');

      const members = data.members || [];
      const targetMember = members.find(m => m.userId === targetUserId);
      // Remove or mark as denied
      const updatedMembers = members.filter(m => m.userId !== targetUserId);

      const { error: updErr } = await supabase.from('workspaces').update({ members: updatedMembers }).eq('id', classId);
      if (updErr) throw updErr;

      try {
        await dbService.logs.create(classId, {
          actionType: 'member_deny',
          title: `Permintaan masuk ditolak`,
          details: `Permintaan masuk ${targetMember?.name || 'Mahasiswa'} (${targetMember?.email || ''}) ditolak oleh Komti/Dosen.`,
          actor: { name: 'Komti/Dosen', role: 'komti' },
          color: 'rose'
        });
      } catch {}

      return updatedMembers;
    },

    cancelJoinRequest: async (classId, userId) => {
      const { data, error } = await supabase.from('workspaces').select('*').eq('id', classId).maybeSingle();
      if (error || !data) throw new Error('Kelas tidak ditemukan.');

      const members = data.members || [];
      const updatedMembers = members.filter(m => m.userId !== userId);

      const { error: updErr } = await supabase.from('workspaces').update({ members: updatedMembers }).eq('id', classId);
      if (updErr) throw updErr;
      return updatedMembers;
    },

    updateMemberRole: async (classId, targetUserId, newRole) => {
      const { data, error } = await supabase.from('workspaces').select('*').eq('id', classId).maybeSingle();
      if (error || !data) throw new Error('Kelas tidak ditemukan.');

      const members = data.members || [];
      const updatedMembers = members.map(m => m.userId === targetUserId ? { ...m, role: newRole } : m);

      const { error: updErr } = await supabase.from('workspaces').update({ members: updatedMembers }).eq('id', classId);
      if (updErr) throw updErr;
      return updatedMembers;
    },

    removeMember: async (classId, targetUserId) => {
      const { data, error } = await supabase.from('workspaces').select('*').eq('id', classId).maybeSingle();
      if (error || !data) throw new Error('Kelas tidak ditemukan.');

      const members = data.members || [];
      const updatedMembers = members.filter(m => m.userId !== targetUserId);

      const { error: updErr } = await supabase.from('workspaces').update({ members: updatedMembers }).eq('id', classId);
      if (updErr) throw updErr;
      return updatedMembers;
    },

    syncMemberPhone: async (classId, userId, phoneNumber) => {
      if (!classId || !userId || !phoneNumber) return;
      try {
        const { data, error } = await supabase.from('workspaces').select('members').eq('id', classId).maybeSingle();
        if (error || !data) return;
        const members = data.members || [];
        let changed = false;
        const updated = members.map(m => {
          if (m.userId === userId && m.phoneNumber !== phoneNumber) {
            changed = true;
            return { ...m, phoneNumber };
          }
          return m;
        });
        if (changed) {
          await supabase.from('workspaces').update({ members: updated }).eq('id', classId);
        }
      } catch {}
    },

    syncMemberEmail: async (userId, newEmail) => {
      if (!userId || !newEmail) return;
      const cleanEmail = String(newEmail).trim().toLowerCase();
      try {
        const { data: workspaces, error } = await supabase.from('workspaces').select('id, members');
        if (error || !workspaces) return;
        for (const ws of workspaces) {
          const members = ws.members || [];
          let changed = false;
          const updated = members.map(m => {
            if (m.userId === userId && m.email?.toLowerCase() !== cleanEmail) {
              changed = true;
              return { ...m, email: cleanEmail };
            }
            return m;
          });
          if (changed) {
            await supabase.from('workspaces').update({ members: updated }).eq('id', ws.id);
          }
        }
      } catch (err) {
        console.warn('syncMemberEmail error:', err);
      }
    },

    update: async (classId, { name, classIdentifier, lecturer, academicPeriod, waGroupLink, komtiPin }) => {
      const { data, error } = await supabase.from('workspaces').select('*').eq('id', classId).maybeSingle();
      if (error || !data) throw new Error('Kelas tidak ditemukan.');

      let meta = {};
      try {
        meta = typeof data.description === 'string' && data.description.startsWith('{') ? JSON.parse(data.description) : {};
      } catch {
        meta = {};
      }

      if (classIdentifier !== undefined) meta.classIdentifier = classIdentifier.trim();
      if (lecturer !== undefined) meta.lecturer = lecturer.trim();
      if (academicPeriod !== undefined) meta.academicPeriod = academicPeriod.trim();
      if (waGroupLink !== undefined) meta.waGroupLink = waGroupLink.trim();
      if (komtiPin !== undefined) meta.komtiPin = (komtiPin || '').trim();

      const updates = {
        description: JSON.stringify(meta)
      };
      if (name !== undefined && name.trim()) {
        updates.name = name.trim();
      }

      const { error: updErr } = await supabase.from('workspaces').update(updates).eq('id', classId);
      if (updErr) throw updErr;

      return {
        id: data.id,
        name: updates.name || data.name,
        classIdentifier: meta.classIdentifier || '26B',
        lecturer: meta.lecturer || '',
        academicPeriod: meta.academicPeriod || 'Semester 1',
        waGroupLink: meta.waGroupLink || '',
        joinCode: data.invite_code,
        komtiPin: meta.komtiPin || '',
        ownerId: data.owner_id,
        members: data.members || [],
        memberCount: (data.members || []).filter(m => (m.status || 'approved') === 'approved').length || 1,
        createdAt: data.created_at
      };
    },

    updateBlockStatus: async (classId, isBlocked) => {
      const { data, error } = await supabase.from('workspaces').select('*').eq('id', classId).maybeSingle();
      if (error || !data) throw new Error('Kelas tidak ditemukan.');

      let meta = {};
      try {
        meta = typeof data.description === 'string' && data.description.startsWith('{') ? JSON.parse(data.description) : {};
      } catch {
        meta = {};
      }

      meta.isBlocked = Boolean(isBlocked);
      meta.status = isBlocked ? 'blocked' : 'active';

      const { error: updErr } = await supabase.from('workspaces').update({
        description: JSON.stringify(meta)
      }).eq('id', classId);

      if (updErr) throw updErr;

      try {
        await dbService.logs.create(classId, {
          actionType: isBlocked ? 'class_block' : 'class_unblock',
          title: isBlocked ? `Ruang kelas diblokir` : `Ruang kelas diaktifkan`,
          details: isBlocked
            ? `Superadmin memblokir akses ke ruang kelas ini. Akses mahasiswa & komti ditangguhkan.`
            : `Superadmin menyetujui dan membuka blokir ruang kelas ini. Mahasiswa & komti kini dapat beraktivitas normal.`,
          actor: { name: 'Superadmin', role: 'superadmin' },
          color: isBlocked ? 'rose' : 'emerald'
        });
      } catch {}

      return {
        id: data.id,
        isBlocked: meta.isBlocked,
        status: meta.status
      };
    },

    delete: async (classId) => {
      if (isProtectedClass(classId)) {
        throw new Error('Kelas utama (M.Log B) dilindungi sistem dan tidak dapat dihapus.');
      }

      // 1. Cascading delete on all dependent records
      await Promise.allSettled([
        supabase.from('schedules').delete().eq('workspace_id', classId),
        supabase.from('tasks').delete().eq('workspace_id', classId),
        supabase.from('notes').delete().eq('workspace_id', classId),
        supabase.from('announcements').delete().eq('workspace_id', classId),
        supabase.from('activity_logs').delete().eq('workspace_id', classId),
        supabase.from('groups').delete().eq('workspace_id', classId)
      ]);

      // 2. Delete workspace record
      const { error } = await supabase.from('workspaces').delete().eq('id', classId);
      if (error) throw error;

      return { success: true, id: classId };
    }
  },

  // 2. SCHEDULES (Schedules Table)
  schedules: {
    list: async (classId) => {
      const { data, error } = await supabase.from('schedules').select('*').eq('workspace_id', classId).order('start_time', { ascending: true });
      if (error) return [];
      return (data || []).map(s => {
        const parsed = parseLecturerInfo(s.lecturer, s.notes);
        return {
          id: s.id,
          classId: s.workspace_id,
          title: s.subject || s.title,
          course: s.subject || '',
          lecturer: parsed.name || s.lecturer || '',
          lecturerRaw: s.lecturer || '',
          lecturerPhone: parsed.phone || '',
          lecturerCleanPhone: parsed.cleanPhone || '',
          lecturerRole: parsed.role || '',
          day: s.day || 'Senin',
          startTime: s.start_time || '08:00',
          endTime: s.end_time || '10:00',
          room: s.room || '',
          sks: s.sks || 3,
          type: s.code || 'class',
          description: s.notes || ''
        };
      });
    },

    create: async (classId, item) => {
      const id = 'sch_' + Math.random().toString(36).substr(2, 9);
      const lecturerName = (item.lecturer || '').trim();
      const lecturerPhone = (item.lecturerPhone || '').trim();
      const formattedLecturer = lecturerPhone && !lecturerName.includes(lecturerPhone)
        ? `${lecturerName} (${lecturerPhone})`
        : lecturerName;

      const row = {
        id,
        workspace_id: classId,
        subject: (item.title || item.course || '').trim(),
        code: item.type || 'class',
        lecturer: formattedLecturer,
        day: item.day || 'Senin',
        start_time: item.startTime || '08:00',
        end_time: item.endTime || '10:00',
        room: (item.room || '').trim(),
        notes: (item.description || '').trim(),
        updated_at: new Date().toISOString()
      };
      const { error } = await supabase.from('schedules').insert(row);
      if (error) throw error;
      const parsed = parseLecturerInfo(row.lecturer, row.notes);
      return {
        id,
        classId,
        title: row.subject,
        course: row.subject,
        lecturer: parsed.name || row.lecturer,
        lecturerRaw: row.lecturer,
        lecturerPhone: parsed.phone || '',
        lecturerCleanPhone: parsed.cleanPhone || '',
        lecturerRole: parsed.role || '',
        day: row.day,
        startTime: row.start_time,
        endTime: row.end_time,
        room: row.room,
        type: row.code,
        description: row.notes
      };
    },

    update: async (scheduleId, item) => {
      const lecturerName = (item.lecturer || '').trim();
      const lecturerPhone = (item.lecturerPhone || '').trim();
      const formattedLecturer = lecturerPhone && !lecturerName.includes(lecturerPhone)
        ? `${lecturerName} (${lecturerPhone})`
        : lecturerName;

      const row = {
        subject: (item.title || item.course || '').trim(),
        code: item.type || 'class',
        lecturer: formattedLecturer,
        day: item.day || 'Senin',
        start_time: item.startTime || '08:00',
        end_time: item.endTime || '10:00',
        room: (item.room || '').trim(),
        notes: (item.description || '').trim(),
        updated_at: new Date().toISOString()
      };
      const { error } = await supabase.from('schedules').update(row).eq('id', scheduleId);
      if (error) throw error;
      const parsed = parseLecturerInfo(row.lecturer, row.notes);
      return {
        id: scheduleId,
        title: row.subject,
        course: row.subject,
        lecturer: parsed.name || row.lecturer,
        lecturerRaw: row.lecturer,
        lecturerPhone: parsed.phone || '',
        lecturerCleanPhone: parsed.cleanPhone || '',
        lecturerRole: parsed.role || '',
        day: row.day,
        startTime: row.start_time,
        endTime: row.end_time,
        room: row.room,
        type: row.code,
        description: row.notes
      };
    },

    delete: async (scheduleId) => {
      await supabase.from('schedules').delete().eq('id', scheduleId);
    }
  },

  // 3. TASKS & ASSIGNMENTS (Tasks Table)
  tasks: {
    list: async (classId) => {
      const { data, error } = await supabase.from('tasks').select('*').eq('workspace_id', classId).order('created_at', { ascending: false });
      if (error) return [];
      return (data || []).map(t => {
        let meta = {};
        let isJson = false;
        try {
          if (typeof t.description === 'string' && t.description.trim().startsWith('{')) {
            meta = JSON.parse(t.description);
            isJson = true;
          }
        } catch {
          meta = {};
          isJson = false;
        }

        const attachments = Array.isArray(t.attachments) && t.attachments.length > 0
          ? t.attachments
          : (Array.isArray(meta.attachments) ? meta.attachments : []);
        const submissions = meta.submissions || [];
        const submissionType = meta.submissionType || 'individual'; // 'individual' | 'group'

        return {
          id: t.id,
          classId: t.workspace_id,
          title: t.title,
          course: t.subject || '',
          lecturer: meta.lecturer || '',
          dueDate: t.due_date,
          dueTime: t.due_time || '23:59',
          description: isJson ? (meta.text || '') : (t.description || ''),
          instructions: meta.instructions || '',
          submissionRequired: meta.submissionRequired !== false,
          submissionType,
          attachments,
          submissions,
          createdAt: t.created_at
        };
      });
    },

    create: async (classId, item) => {
      const id = 'task_' + Math.random().toString(36).substr(2, 9);
      const meta = {
        text: item.description || '',
        instructions: item.instructions || '',
        lecturer: item.lecturer || '',
        submissionRequired: item.submissionRequired !== false,
        submissionType: item.submissionType || 'individual',
        attachments: item.attachments || [],
        submissions: []
      };

      const row = {
        id,
        workspace_id: classId,
        title: item.title.trim(),
        subject: (item.course || '').trim(),
        due_date: item.dueDate || new Date().toISOString().split('T')[0],
        due_time: item.dueTime || '23:59',
        priority: 'medium',
        status: 'pending',
        completed: false,
        description: JSON.stringify(meta),
        attachments: item.attachments || [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase.from('tasks').insert(row);
      if (error) throw error;

      return {
        id,
        classId,
        title: row.title,
        course: row.subject,
        lecturer: meta.lecturer,
        dueDate: row.due_date,
        dueTime: row.due_time,
        description: meta.text,
        instructions: meta.instructions,
        submissionRequired: meta.submissionRequired,
        submissionType: meta.submissionType,
        attachments: row.attachments,
        submissions: [],
        createdAt: row.created_at
      };
    },

    submit: async (taskId, { userId, userName, fileName, fileUrl, fileSize, files = [], isGroup = false, groupMembers = [], groupName = null }) => {
      const { data: existing, error: getErr } = await supabase.from('tasks').select('*').eq('id', taskId).maybeSingle();
      if (getErr || !existing) throw new Error('Tugas tidak ditemukan.');

      let meta = {};
      try {
        meta = typeof existing.description === 'string' && existing.description.startsWith('{') ? JSON.parse(existing.description) : {};
      } catch {
        meta = { text: existing.description };
      }

      const submissions = meta.submissions || [];
      const normalizedFiles = Array.isArray(files) && files.length > 0
        ? files
        : (fileUrl ? [{ name: fileName || 'Berkas Tugas', url: fileUrl, size: fileSize || '' }] : []);

      const primaryFileName = normalizedFiles.length > 1
        ? `${normalizedFiles.length} Berkas: ${normalizedFiles.map(f => f.name).join(', ')}`
        : (normalizedFiles[0]?.name || fileName || 'Tugas');

      const primaryFileUrl = normalizedFiles[0]?.url || fileUrl || '';
      const primaryFileSize = normalizedFiles.length > 1
        ? `${normalizedFiles.length} berkas`
        : (normalizedFiles[0]?.size || fileSize || '');

      const newSubmission = {
        id: 'sub_' + Math.random().toString(36).substr(2, 9),
        userId,
        userName,
        fileName: primaryFileName,
        fileUrl: primaryFileUrl,
        fileSize: primaryFileSize,
        files: normalizedFiles,
        isGroup: Boolean(isGroup),
        groupName: groupName || null,
        groupMembers: Array.isArray(groupMembers) ? groupMembers : [],
        submittedAt: new Date().toISOString()
      };

      // Exclude previous submission from this user or any user in the group
      const memberUserIds = new Set([userId, ...newSubmission.groupMembers.map(m => m.userId)]);

      const updatedSubmissions = [
        ...submissions.filter(s => {
          if (memberUserIds.has(s.userId)) return false;
          if (s.groupMembers?.some(m => memberUserIds.has(m.userId))) return false;
          return true;
        }),
        newSubmission
      ];

      meta.submissions = updatedSubmissions;

      const { error: updErr } = await supabase.from('tasks').update({
        description: JSON.stringify(meta),
        updated_at: new Date().toISOString()
      }).eq('id', taskId);

      if (updErr) throw updErr;
      return newSubmission;
    },

    unsubmit: async (taskId, userId) => {
      const { data: existing, error: getErr } = await supabase.from('tasks').select('*').eq('id', taskId).maybeSingle();
      if (getErr || !existing) throw new Error('Tugas tidak ditemukan.');

      let meta = {};
      try {
        meta = typeof existing.description === 'string' && existing.description.startsWith('{') ? JSON.parse(existing.description) : {};
      } catch {
        meta = { text: existing.description };
      }

      const submissions = meta.submissions || [];
      // Remove submission if user is submitter or in the group
      const updatedSubmissions = submissions.filter(s => {
        if (s.userId === userId) return false;
        if (s.groupMembers?.some(m => m.userId === userId)) return false;
        return true;
      });
      meta.submissions = updatedSubmissions;

      const { error: updErr } = await supabase.from('tasks').update({
        description: JSON.stringify(meta),
        updated_at: new Date().toISOString()
      }).eq('id', taskId);

      if (updErr) throw updErr;
      return true;
    },

    updateSubmission: async (taskId, submissionId, updates) => {
      const { data: existing, error: getErr } = await supabase.from('tasks').select('*').eq('id', taskId).maybeSingle();
      if (getErr || !existing) throw new Error('Tugas tidak ditemukan.');

      let meta = {};
      try {
        meta = typeof existing.description === 'string' && existing.description.startsWith('{') ? JSON.parse(existing.description) : {};
      } catch {
        meta = { text: existing.description };
      }

      const submissions = meta.submissions || [];
      let updatedSubmission = null;

      const updatedSubmissions = submissions.map(s => {
        const isMatch = s.id === submissionId || s.userId === submissionId || ('sub_' + s.id) === submissionId;
        if (isMatch) {
          updatedSubmission = {
            ...s,
            ...updates,
            groupMembers: Array.isArray(updates.groupMembers) ? updates.groupMembers : s.groupMembers,
            isGroup: updates.isGroup !== undefined ? Boolean(updates.isGroup) : s.isGroup,
            groupName: updates.groupName !== undefined ? updates.groupName : s.groupName,
            fileName: updates.fileName !== undefined ? updates.fileName : s.fileName,
            updatedAt: new Date().toISOString()
          };
          return updatedSubmission;
        }
        return s;
      });

      meta.submissions = updatedSubmissions;

      const { error: updErr } = await supabase.from('tasks').update({
        description: JSON.stringify(meta),
        updated_at: new Date().toISOString()
      }).eq('id', taskId);

      if (updErr) throw updErr;
      return updatedSubmission;
    },

    moveSubmission: async (fromTaskId, toTaskId, submissionId) => {
      if (fromTaskId === toTaskId) return true;

      const { data: fromTask, error: fromErr } = await supabase.from('tasks').select('*').eq('id', fromTaskId).maybeSingle();
      if (fromErr || !fromTask) throw new Error('Tugas sumber tidak ditemukan.');

      const { data: toTask, error: toErr } = await supabase.from('tasks').select('*').eq('id', toTaskId).maybeSingle();
      if (toErr || !toTask) throw new Error('Tugas tujuan tidak ditemukan.');

      let fromMeta = {};
      try {
        fromMeta = typeof fromTask.description === 'string' && fromTask.description.startsWith('{') ? JSON.parse(fromTask.description) : {};
      } catch {
        fromMeta = { text: fromTask.description };
      }

      let toMeta = {};
      try {
        toMeta = typeof toTask.description === 'string' && toTask.description.startsWith('{') ? JSON.parse(toTask.description) : {};
      } catch {
        toMeta = { text: toTask.description };
      }

      const fromSubs = fromMeta.submissions || [];
      const toSubs = toMeta.submissions || [];

      const targetIndex = fromSubs.findIndex(s => s.id === submissionId || s.userId === submissionId || ('sub_' + s.id) === submissionId);
      if (targetIndex === -1) throw new Error('Pengumpulan tugas tidak ditemukan pada tugas sumber.');

      const [subToMove] = fromSubs.splice(targetIndex, 1);
      toSubs.push(subToMove);

      fromMeta.submissions = fromSubs;
      toMeta.submissions = toSubs;

      const { error: updFromErr } = await supabase.from('tasks').update({
        description: JSON.stringify(fromMeta),
        updated_at: new Date().toISOString()
      }).eq('id', fromTaskId);
      if (updFromErr) throw updFromErr;

      const { error: updToErr } = await supabase.from('tasks').update({
        description: JSON.stringify(toMeta),
        updated_at: new Date().toISOString()
      }).eq('id', toTaskId);
      if (updToErr) throw updToErr;

      return true;
    },

    update: async (taskId, updates) => {
      const { data: existing, error: getErr } = await supabase.from('tasks').select('*').eq('id', taskId).maybeSingle();
      if (getErr || !existing) throw new Error('Tugas tidak ditemukan.');

      let meta = {};
      try {
        meta = typeof existing.description === 'string' && existing.description.startsWith('{') ? JSON.parse(existing.description) : {};
      } catch {
        meta = { text: existing.description };
      }

      // Strictly preserve existing student submissions
      const submissions = meta.submissions || [];

      if (updates.description !== undefined) meta.text = updates.description;
      if (updates.instructions !== undefined) meta.instructions = updates.instructions;
      if (updates.lecturer !== undefined) meta.lecturer = updates.lecturer;
      if (updates.submissionRequired !== undefined) meta.submissionRequired = updates.submissionRequired;
      if (updates.submissionType !== undefined) meta.submissionType = updates.submissionType;
      if (updates.attachments !== undefined) meta.attachments = updates.attachments;

      const rowUpdates = {
        updated_at: new Date().toISOString()
      };

      if (updates.title !== undefined) rowUpdates.title = updates.title.trim();
      if (updates.course !== undefined) rowUpdates.subject = (updates.course || '').trim();
      if (updates.dueDate !== undefined) rowUpdates.due_date = updates.dueDate;
      if (updates.dueTime !== undefined) rowUpdates.due_time = updates.dueTime;
      if (updates.attachments !== undefined) rowUpdates.attachments = updates.attachments;
      rowUpdates.description = JSON.stringify(meta);

      const { error: updErr } = await supabase.from('tasks').update(rowUpdates).eq('id', taskId);
      if (updErr) throw updErr;

      return {
        id: taskId,
        classId: existing.workspace_id,
        title: rowUpdates.title !== undefined ? rowUpdates.title : existing.title,
        course: rowUpdates.subject !== undefined ? rowUpdates.subject : (existing.subject || ''),
        lecturer: meta.lecturer || '',
        dueDate: rowUpdates.due_date !== undefined ? rowUpdates.due_date : existing.due_date,
        dueTime: rowUpdates.due_time !== undefined ? rowUpdates.due_time : (existing.due_time || '23:59'),
        description: meta.text || '',
        instructions: meta.instructions || '',
        submissionRequired: meta.submissionRequired !== false,
        submissionType: meta.submissionType || 'individual',
        attachments: updates.attachments !== undefined ? updates.attachments : (existing.attachments || meta.attachments || []),
        submissions,
        createdAt: existing.created_at,
        updatedAt: rowUpdates.updated_at
      };
    },

    delete: async (taskId) => {
      await supabase.from('tasks').delete().eq('id', taskId);
    }
  },

  // 4. FILES (Central Library, stored in Notes table)
  files: {
    list: async (classId) => {
      const [notesRes, tasksRes] = await Promise.all([
        supabase.from('notes').select('*').eq('workspace_id', classId).eq('category', 'file').order('updated_at', { ascending: false }),
        supabase.from('tasks').select('*').eq('workspace_id', classId)
      ]);

      const filesData = (notesRes.data || []).map(f => {
        let meta = {};
        try {
          meta = typeof f.content === 'string' && f.content.startsWith('{') ? JSON.parse(f.content) : {};
        } catch {
          meta = {};
        }

        return {
          id: f.id,
          classId: f.workspace_id,
          name: f.title,
          category: meta.category || 'Material',
          folder: meta.folder || meta.groupName || (meta.category === 'Material' ? 'Materi Kuliah' : 'Umum'),
          course: f.subject || '',
          groupName: meta.groupName || '',
          uploadedBy: meta.uploadedBy || 'Member',
          fileSize: meta.fileSize || '1.2 MB',
          fileType: meta.fileType || f.title.split('.').pop()?.toLowerCase() || 'pdf',
          storageUrl: meta.storageUrl || '',
          driveFileId: meta.driveFileId || '',
          createdAt: f.updated_at
        };
      });

      // Extract all student submissions from tasks table
      const submissionFiles = [];
      (tasksRes.data || []).forEach(t => {
        let meta = {};
        try {
          meta = typeof t.description === 'string' && t.description.startsWith('{') ? JSON.parse(t.description) : {};
        } catch {
          meta = {};
        }
        const subs = meta.submissions || [];
        subs.forEach(s => {
          const groupNames = Array.isArray(s.groupMembers) && s.groupMembers.length > 0
            ? s.groupMembers.map(m => m.userName || m.name).filter(Boolean).join(', ')
            : '';

          const subFilesList = Array.isArray(s.files) && s.files.length > 0
            ? s.files
            : (s.fileUrl ? [{ name: s.fileName, url: s.fileUrl, size: s.fileSize }] : []);

          subFilesList.forEach((fileItem, fileIdx) => {
            if (!fileItem.url) return; // ignore paper/empty fileUrl
            submissionFiles.push({
              id: 'sub_' + (s.id || `${s.userId}_${t.id}`) + (fileIdx > 0 ? `_${fileIdx}` : ''),
              classId: t.workspace_id,
              name: fileItem.name || s.fileName || `${s.userName} - Submission`,
              category: 'Submission',
              folder: `Tugas: ${t.title}`,
              course: t.subject || '',
              groupName: groupNames ? `Kelompok: ${groupNames}` : t.title,
              uploadedBy: s.userName || 'Mahasiswa',
              fileSize: fileItem.size || s.fileSize || '1.2 MB',
              fileType: (fileItem.name || s.fileName || '').split('.').pop()?.toLowerCase() || 'pdf',
              storageUrl: fileItem.url || s.fileUrl || '',
              createdAt: s.submittedAt || t.created_at,
              isSubmission: true,
              isGroup: Boolean(s.isGroup),
              groupMembers: s.groupMembers || [],
              taskId: t.id,
              userId: s.userId
            });
          });
        });

        // Also extract task instructor attachments (soal/materi panduan)
        const taskAttachments = Array.isArray(t.attachments) && t.attachments.length > 0
          ? t.attachments
          : (Array.isArray(meta.attachments) ? meta.attachments : []);

        taskAttachments.forEach((att, attIdx) => {
          if (att?.url || att?.storageUrl) {
            submissionFiles.push({
              id: `task_att_${t.id}_${attIdx}`,
              classId: t.workspace_id,
              name: att.name || `Lampiran Soal: ${t.title}`,
              category: 'Assignments',
              folder: `Tugas: ${t.title}`,
              course: t.subject || '',
              groupName: t.title,
              uploadedBy: meta.lecturer || 'Dosen/Komti',
              fileSize: att.size || '1.0 MB',
              fileType: (att.name || '').split('.').pop()?.toLowerCase() || 'pdf',
              storageUrl: att.url || att.storageUrl || '',
              driveFileId: att.fileId || att.driveFileId || '',
              createdAt: t.created_at,
              isTaskAttachment: true,
              taskId: t.id
            });
          }
        });
      });

      // Combine and filter duplicates
      const allFiles = [...filesData];
      submissionFiles.forEach(sf => {
        if (!allFiles.some(f => f.name === sf.name && f.uploadedBy === sf.uploadedBy)) {
          allFiles.push(sf);
        }
      });

      return allFiles.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    },

    create: async (classId, fileItem) => {
      const id = 'file_' + Math.random().toString(36).substr(2, 9);
      const meta = {
        category: fileItem.category || 'Material',
        folder: fileItem.folder || fileItem.groupName || (fileItem.category === 'Submission' ? 'Tugas' : 'Materi Kuliah'),
        groupName: fileItem.groupName || '',
        uploadedBy: fileItem.uploadedBy || 'Member',
        fileSize: fileItem.fileSize || '1.0 MB',
        fileType: fileItem.fileType || fileItem.name.split('.').pop()?.toLowerCase() || 'pdf',
        storageUrl: fileItem.storageUrl || '',
        driveFileId: fileItem.driveFileId || ''
      };

      const row = {
        id,
        workspace_id: classId,
        title: fileItem.name.trim(),
        subject: (fileItem.course || '').trim(),
        category: 'file',
        content: JSON.stringify(meta),
        color: 'slate',
        pinned: false,
        favorite: false,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase.from('notes').insert(row);
      if (error) throw error;

      return {
        id,
        classId,
        name: row.title,
        category: meta.category,
        folder: meta.folder,
        course: row.subject,
        groupName: meta.groupName,
        uploadedBy: meta.uploadedBy,
        fileSize: meta.fileSize,
        fileType: meta.fileType,
        storageUrl: meta.storageUrl,
        driveFileId: meta.driveFileId,
        createdAt: row.updated_at
      };
    },

    delete: async (fileId) => {
      if (typeof fileId === 'string' && fileId.startsWith('sub_')) {
        // Remove from task submissions
        const { data: allTasks } = await supabase.from('tasks').select('*');
        for (const task of (allTasks || [])) {
          let meta = {};
          try {
            meta = typeof task.description === 'string' && task.description.startsWith('{') ? JSON.parse(task.description) : {};
          } catch {
            continue;
          }
          const subs = meta.submissions || [];
          const foundIndex = subs.findIndex(s => ('sub_' + (s.id || `${s.userId}_${task.id}`)) === fileId || s.id === fileId);
          if (foundIndex !== -1) {
            subs.splice(foundIndex, 1);
            meta.submissions = subs;
            await supabase.from('tasks').update({
              description: JSON.stringify(meta),
              updated_at: new Date().toISOString()
            }).eq('id', task.id);
            break;
          }
        }
      } else {
        await supabase.from('notes').delete().eq('id', fileId);
      }
    },

    syncDriveFileNames: async (classId, updatesByDriveId) => {
      if (!classId || !updatesByDriveId || Object.keys(updatesByDriveId).length === 0) return 0;
      let updatedCount = 0;

      // 1. Update task submissions and attachments in database
      const { data: tasks, error: taskErr } = await supabase.from('tasks').select('*').eq('workspace_id', classId);
      if (!taskErr && tasks) {
        for (const t of tasks) {
          let meta = {};
          try {
            meta = typeof t.description === 'string' && t.description.startsWith('{') ? JSON.parse(t.description) : {};
          } catch {
            continue;
          }

          let taskModified = false;
          const subs = meta.submissions || [];
          subs.forEach(s => {
            if (Array.isArray(s.files) && s.files.length > 0) {
              s.files.forEach(f => {
                const driveId = extractDriveFileId(f.url);
                if (driveId && updatesByDriveId[driveId] && updatesByDriveId[driveId] !== f.name) {
                  f.name = updatesByDriveId[driveId];
                  taskModified = true;
                  updatedCount++;
                }
              });
              if (s.files.length === 1 && s.files[0].name && s.fileName !== s.files[0].name) {
                s.fileName = s.files[0].name;
              }
            } else if (s.fileUrl) {
              const driveId = extractDriveFileId(s.fileUrl);
              if (driveId && updatesByDriveId[driveId] && updatesByDriveId[driveId] !== s.fileName) {
                s.fileName = updatesByDriveId[driveId];
                taskModified = true;
                updatedCount++;
              }
            }
          });

          if (Array.isArray(meta.attachments)) {
            meta.attachments.forEach(att => {
              const driveId = att.fileId || att.driveFileId || extractDriveFileId(att.url || att.storageUrl);
              if (driveId && updatesByDriveId[driveId] && updatesByDriveId[driveId] !== att.name) {
                att.name = updatesByDriveId[driveId];
                taskModified = true;
                updatedCount++;
              }
            });
          }

          if (taskModified) {
            await supabase.from('tasks').update({
              description: JSON.stringify(meta),
              updated_at: new Date().toISOString()
            }).eq('id', t.id);
          }
        }
      }

      // 2. Update library notes (files)
      const { data: notes, error: notesErr } = await supabase.from('notes').select('*').eq('workspace_id', classId).eq('category', 'file');
      if (!notesErr && notes) {
        for (const n of notes) {
          let meta = {};
          try {
            meta = typeof n.content === 'string' && n.content.startsWith('{') ? JSON.parse(n.content) : {};
          } catch {
            continue;
          }
          const driveId = meta.driveFileId || extractDriveFileId(meta.storageUrl);
          if (driveId && updatesByDriveId[driveId] && updatesByDriveId[driveId] !== n.title) {
            await supabase.from('notes').update({
              title: updatesByDriveId[driveId],
              updated_at: new Date().toISOString()
            }).eq('id', n.id);
            updatedCount++;
          }
        }
      }

      return updatedCount;
    }
  },

  // 5. ANNOUNCEMENTS (Stored in Notes table with category = 'announcement')
  announcements: {
    list: async (classId) => {
      const { data, error } = await supabase.from('notes').select('*').eq('workspace_id', classId).eq('category', 'announcement').order('updated_at', { ascending: false });
      if (error) return [];
      return (data || []).map(a => {
        let meta = {};
        try {
          meta = typeof a.attachments === 'object' && a.attachments ? a.attachments : (typeof a.attachments === 'string' && a.attachments.startsWith('{') ? JSON.parse(a.attachments) : {});
        } catch {
          meta = {};
        }

        return {
          id: a.id,
          classId: a.workspace_id,
          title: a.title,
          message: a.content || '',
          type: a.color || 'general',
          author: meta.author || 'Class Coordinator',
          attachment: meta.attachment || null,
          createdAt: a.updated_at
        };
      });
    },

    create: async (classId, item) => {
      const id = 'ann_' + Math.random().toString(36).substr(2, 9);
      const meta = {
        author: item.author || 'Class Coordinator',
        attachment: item.attachment || null
      };

      const row = {
        id,
        workspace_id: classId,
        title: item.title.trim(),
        subject: item.type || 'general',
        category: 'announcement',
        content: (item.message || '').trim(),
        color: item.type || 'general',
        pinned: item.type === 'important',
        favorite: false,
        attachments: meta,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase.from('notes').insert(row);
      if (error) throw error;

      return {
        id,
        classId,
        title: row.title,
        message: row.content,
        type: row.color,
        author: meta.author,
        attachment: meta.attachment,
        createdAt: row.updated_at
      };
    },

    delete: async (announcementId) => {
      await supabase.from('notes').delete().eq('id', announcementId);
    }
  },

  // 6. FORUM & SMALL CLASS GROUPS (Stored in Notes table with category = 'group')
  groups: {
    list: async (classId) => {
      const { data, error } = await supabase.from('notes').select('*').eq('workspace_id', classId).eq('category', 'group').order('updated_at', { ascending: false });
      if (error) return [];
      return (data || []).map(g => {
        let meta = {};
        try {
          meta = typeof g.content === 'string' && g.content.startsWith('{') ? JSON.parse(g.content) : {};
        } catch {
          meta = {};
        }

        return {
          id: g.id,
          classId: g.workspace_id,
          name: g.title,
          description: meta.description || '',
          members: meta.members || [],
          messages: meta.messages || [],
          files: meta.files || [],
          createdAt: g.updated_at
        };
      });
    },

    create: async (classId, { name, description, members = [] }) => {
      const id = 'grp_' + Math.random().toString(36).substr(2, 9);
      const meta = {
        description: (description || '').trim(),
        members,
        messages: [],
        files: []
      };

      const row = {
        id,
        workspace_id: classId,
        title: name.trim(),
        subject: 'group',
        category: 'group',
        content: JSON.stringify(meta),
        color: 'indigo',
        pinned: false,
        favorite: false,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase.from('notes').insert(row);
      if (error) throw error;

      return {
        id,
        classId,
        name: row.title,
        description: meta.description,
        members: meta.members,
        messages: meta.messages,
        files: meta.files,
        createdAt: row.updated_at
      };
    },

    sendMessage: async (groupId, messageItem) => {
      const { data: existing, error: getErr } = await supabase.from('notes').select('*').eq('id', groupId).maybeSingle();
      if (getErr || !existing) throw new Error('Kelompok tidak ditemukan.');

      let meta = {};
      try {
        meta = typeof existing.content === 'string' && existing.content.startsWith('{') ? JSON.parse(existing.content) : {};
      } catch {
        meta = {};
      }

      const messages = meta.messages || [];
      const newMsg = {
        id: 'msg_' + Math.random().toString(36).substr(2, 9),
        senderName: messageItem.senderName || 'Member',
        senderId: messageItem.senderId || '',
        text: messageItem.text.trim(),
        createdAt: new Date().toISOString()
      };

      meta.messages = [...messages, newMsg];

      const { error: updErr } = await supabase.from('notes').update({
        content: JSON.stringify(meta),
        updated_at: new Date().toISOString()
      }).eq('id', groupId);

      if (updErr) throw updErr;
      return newMsg;
    },

    addFile: async (classId, groupId, fileItem) => {
      const { data: existing, error: getErr } = await supabase.from('notes').select('*').eq('id', groupId).maybeSingle();
      if (getErr || !existing) throw new Error('Kelompok tidak ditemukan.');

      let meta = {};
      try {
        meta = typeof existing.content === 'string' && existing.content.startsWith('{') ? JSON.parse(existing.content) : {};
      } catch {
        meta = {};
      }

      const groupFiles = meta.files || [];
      const newFileObj = {
        id: 'gf_' + Math.random().toString(36).substr(2, 9),
        name: fileItem.name,
        uploadedBy: fileItem.uploadedBy,
        fileSize: fileItem.fileSize || '1.0 MB',
        storageUrl: fileItem.storageUrl || '',
        createdAt: new Date().toISOString()
      };

      meta.files = [...groupFiles, newFileObj];

      await supabase.from('notes').update({
        content: JSON.stringify(meta),
        updated_at: new Date().toISOString()
      }).eq('id', groupId);

      await dbService.files.create(classId, {
        name: fileItem.name,
        category: 'Groups',
        groupName: existing.title,
        uploadedBy: fileItem.uploadedBy,
        fileSize: fileItem.fileSize || '1.0 MB',
        storageUrl: fileItem.storageUrl || '',
        fileType: 'pdf'
      });

      return newFileObj;
    },

    deleteFile: async (classId, groupId, fileId) => {
      const { data: existing, error: getErr } = await supabase.from('notes').select('*').eq('id', groupId).maybeSingle();
      if (getErr || !existing) return;

      let meta = {};
      try {
        meta = typeof existing.content === 'string' && existing.content.startsWith('{') ? JSON.parse(existing.content) : {};
      } catch {
        meta = {};
      }

      meta.files = (meta.files || []).filter(f => f.id !== fileId);

      await supabase.from('notes').update({
        content: JSON.stringify(meta),
        updated_at: new Date().toISOString()
      }).eq('id', groupId);
    },

    delete: async (groupId) => {
      await supabase.from('notes').delete().eq('id', groupId);
    }
  },

  // 7. ACTIVITY & AUDIT LOGS (Stored in Notes table with category = 'activity_log')
  logs: {
    list: async (classId) => {
      if (!classId) return [];
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('workspace_id', classId)
        .eq('category', 'activity_log')
        .order('updated_at', { ascending: false })
        .limit(150);

      if (error) {
        console.warn('Error fetching class activity logs:', error);
        return [];
      }

      return (data || []).map(row => {
        let meta = {};
        try {
          meta = typeof row.content === 'string' && row.content.startsWith('{') ? JSON.parse(row.content) : { details: row.content };
        } catch {
          meta = { details: row.content };
        }

        return {
          id: row.id,
          classId: row.workspace_id,
          title: row.title,
          actionType: row.subject || meta.actionType || 'general',
          actorName: meta.actorName || 'Pengguna',
          actorEmail: meta.actorEmail || '',
          actorRole: meta.actorRole || '',
          targetName: meta.targetName || '',
          details: meta.details || row.content || '',
          color: row.color || 'blue',
          timestamp: row.updated_at
        };
      });
    },

    create: async (classId, { actionType, title, details, actor, targetName, color = 'blue' }) => {
      if (!classId) return null;
      try {
        const id = 'log_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
        const meta = {
          actionType: actionType || 'general',
          actorName: actor?.name || actor?.displayName || 'Pengguna',
          actorEmail: actor?.email || '',
          actorRole: actor?.role || '',
          targetName: targetName || '',
          details: details || ''
        };

        const row = {
          id,
          workspace_id: classId,
          title: title || `${meta.actorName} melakukan aktivitas`,
          subject: actionType || 'general',
          category: 'activity_log',
          content: JSON.stringify(meta),
          color: color || 'blue',
          pinned: false,
          favorite: false,
          updated_at: new Date().toISOString()
        };

        const { error } = await supabase.from('notes').insert(row);
        if (error) {
          console.warn('Failed to insert activity log:', error);
        }

        return {
          id,
          classId,
          title: row.title,
          actionType: row.subject,
          actorName: meta.actorName,
          actorRole: meta.actorRole,
          actorEmail: meta.actorEmail,
          targetName: meta.targetName,
          details: meta.details,
          color: row.color,
          timestamp: row.updated_at
        };
      } catch (err) {
        console.warn('Error creating activity log:', err);
        return null;
      }
    },

    clear: async (classId) => {
      if (!classId) return;
      await supabase.from('notes').delete().eq('workspace_id', classId).eq('category', 'activity_log');
    }
  },

  // 10. SUPERADMIN GLOBAL SERVICE
  superadmin: {
    getGlobalMetrics: async () => {
      // 1. Fetch all workspaces
      const { data: workspaces, error: wsErr } = await supabase.from('workspaces').select('*').order('created_at', { ascending: false });
      if (wsErr) throw wsErr;

      const classList = (workspaces || []).map(w => {
        let meta = {};
        try { meta = typeof w.description === 'string' && w.description.startsWith('{') ? JSON.parse(w.description) : {}; } catch {}
        const isBlocked = meta.isBlocked !== undefined
          ? Boolean(meta.isBlocked)
          : isClassBlocked({ name: w.name, classIdentifier: meta.classIdentifier || w.description, isBlocked: meta.isBlocked, status: meta.status });
        return {
          id: w.id,
          name: w.name,
          classIdentifier: meta.classIdentifier || w.description || 'TI-3A',
          lecturer: meta.lecturer || 'Dosen Pengajar',
          academicPeriod: meta.academicPeriod || '2026/2027',
          joinCode: w.invite_code,
          isBlocked,
          status: isBlocked ? 'blocked' : 'active',
          isProtected: isProtectedClass({ id: w.id, name: w.name, classIdentifier: meta.classIdentifier }),
          members: (w.members || []).filter(m => m && m.role !== 'superadmin' && !isSuperAdminEmail(m.email)),
          memberCount: ((w.members || []).filter(m => m && m.role !== 'superadmin' && !isSuperAdminEmail(m.email))).length || 0,
          createdAt: w.created_at
        };
      });

      const totalClasses = classList.length;
      const activeClasses = classList.filter(c => !c.isBlocked).length;
      const blockedClasses = classList.filter(c => c.isBlocked).length;

      // Unique user calculation
      const userMap = new Map();
      let komtiCount = 0;
      let lecturerCount = 0;
      let studentCount = 0;

      classList.forEach(cls => {
        (cls.members || []).forEach(m => {
          const email = (m.email || m.userId || '').toLowerCase();
          if (!email) return;
          const userRole = (m.role || 'student').toLowerCase();

          if (!userMap.has(email)) {
            if (userRole === 'komti' || userRole === 'coordinator') komtiCount++;
            else if (userRole === 'lecturer' || userRole === 'dosen') lecturerCount++;
            else studentCount++;

            userMap.set(email, {
              userId: m.userId,
              name: m.name || email.split('@')[0],
              email: m.email || email,
              phoneNumber: m.phoneNumber || '',
              role: m.role || 'student',
              status: m.status || 'approved',
              joinedAt: m.joinedAt || m.joined_at || cls.createdAt,
              classes: [{ id: cls.id, name: cls.name, classIdentifier: cls.classIdentifier, role: m.role || 'student' }]
            });
          } else {
            const existing = userMap.get(email);
            if (!existing.classes.some(c => c.id === cls.id)) {
              existing.classes.push({ id: cls.id, name: cls.name, classIdentifier: cls.classIdentifier, role: m.role || 'student' });
            }
            if (!existing.phoneNumber && m.phoneNumber) {
              existing.phoneNumber = m.phoneNumber;
            }
          }
        });
      });

      const userList = Array.from(userMap.values()).sort((a, b) => (a.name || '').localeCompare(b.name || ''));

      // 2. Platform totals for tasks, files, schedules
      const [tasksRes, filesRes, schRes] = await Promise.allSettled([
        supabase.from('tasks').select('id', { count: 'exact', head: true }),
        supabase.from('notes').select('id', { count: 'exact', head: true }).eq('category', 'file'),
        supabase.from('schedules').select('id', { count: 'exact', head: true })
      ]);

      const totalTasks = tasksRes.status === 'fulfilled' ? (tasksRes.value.count || 0) : 0;
      const totalFiles = filesRes.status === 'fulfilled' ? (filesRes.value.count || 0) : 0;
      const totalSchedules = schRes.status === 'fulfilled' ? (schRes.value.count || 0) : 0;

      return {
        classes: classList,
        users: userList,
        totalClasses,
        activeClasses,
        blockedClasses,
        totalUsers: userMap.size,
        komtiCount,
        lecturerCount,
        studentCount,
        totalTasks,
        totalFiles,
        totalSchedules
      };
    }
  },

  // 11. SYSTEM SETTINGS & MAINTENANCE SERVICE
  system: {
    getMaintenanceConfig: async () => {
      try {
        const { data, error } = await supabase
          .from('notes')
          .select('*')
          .eq('id', 'system_maintenance')
          .maybeSingle();

        if (error || !data) {
          return {
            enabled: false,
            title: 'Sistem Sedang Dalam Pemeliharaan',
            message: 'Classy sedang menjalani pemeliharaan sistem berkala untuk peningkatan performa dan pembaruan fitur. Kami akan segera kembali!',
            estimatedEndTime: '',
            updatedAt: null,
            updatedBy: null
          };
        }

        let parsed = {};
        try {
          parsed = typeof data.content === 'string' && data.content.startsWith('{')
            ? JSON.parse(data.content)
            : {};
        } catch {}

        return {
          enabled: Boolean(parsed.enabled),
          title: data.title || parsed.title || 'Sistem Sedang Dalam Pemeliharaan',
          message: parsed.message || 'Classy sedang menjalani pemeliharaan sistem berkala untuk peningkatan performa dan pembaruan fitur. Kami akan segera kembali!',
          estimatedEndTime: parsed.estimatedEndTime || '',
          updatedAt: data.updated_at || parsed.updatedAt || null,
          updatedBy: parsed.updatedBy || null
        };
      } catch (err) {
        console.warn('Failed to get maintenance config, defaulting to false:', err);
        return {
          enabled: false,
          title: 'Sistem Sedang Dalam Pemeliharaan',
          message: 'Classy sedang menjalani pemeliharaan sistem berkala untuk peningkatan performa dan pembaruan fitur. Kami akan segera kembali!',
          estimatedEndTime: '',
          updatedAt: null,
          updatedBy: null
        };
      }
    },

    setMaintenanceConfig: async ({ enabled, title, message, estimatedEndTime, updatedBy }) => {
      const payload = {
        enabled: Boolean(enabled),
        title: title || 'Sistem Sedang Dalam Pemeliharaan',
        message: message || 'Classy sedang menjalani pemeliharaan sistem berkala untuk peningkatan performa dan pembaruan fitur. Kami akan segera kembali!',
        estimatedEndTime: estimatedEndTime || '',
        updatedAt: new Date().toISOString(),
        updatedBy: updatedBy || 'Superadmin'
      };

      const row = {
        id: 'system_maintenance',
        workspace_id: null,
        title: payload.title,
        category: 'system_setting',
        content: JSON.stringify(payload),
        color: enabled ? 'rose' : 'emerald',
        updated_at: new Date().toISOString()
      };

      const { data: existing } = await supabase
        .from('notes')
        .select('id')
        .eq('id', 'system_maintenance')
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('notes')
          .update(row)
          .eq('id', 'system_maintenance');
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('notes')
          .insert(row);
        if (error) throw error;
      }

      return payload;
    },

    subscribeToMaintenance: (callback) => {
      try {
        const unsub = onSnapshot(doc(db, 'notes', 'system_maintenance'), (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            let parsed = {};
            try {
              parsed = typeof data.content === 'string' && data.content.startsWith('{')
                ? JSON.parse(data.content)
                : (data.content || {});
            } catch {}
            callback({
              enabled: Boolean(parsed.enabled),
              title: data.title || parsed.title || 'Sistem Sedang Dalam Pemeliharaan',
              message: parsed.message || '',
              estimatedEndTime: parsed.estimatedEndTime || '',
              updatedAt: data.updated_at || parsed.updatedAt || null,
              updatedBy: parsed.updatedBy || null
            });
          } else {
            callback({
              enabled: false,
              title: 'Sistem Sedang Dalam Pemeliharaan',
              message: '',
              estimatedEndTime: '',
              updatedAt: null,
              updatedBy: null
            });
          }
        }, (err) => {
          console.warn('Firestore maintenance snapshot error:', err);
        });

        return () => unsub();
      } catch (err) {
        console.warn('Error establishing maintenance listener:', err);
        return () => {};
      }
    }
  },

  // 12. REALTIME ONLINE PRESENCE
  presence: {
    heartbeat: async (classId, user) => {
      if (!classId || (!user?.id && !user?.uid)) return;
      try {
        const uid = user.id || user.uid;
        const presenceRef = doc(db, 'workspaces', classId, 'presence', uid);
        await setDoc(presenceRef, {
          userId: uid,
          userName: user.displayName || user.name || user.fullName || (user.email ? user.email.split('@')[0] : 'Mahasiswa'),
          userEmail: user.email || '',
          avatar: user.photoURL || user.avatar || '',
          isOnline: true,
          lastSeen: Date.now(),
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (err) {
        console.warn('Presence heartbeat error:', err);
      }
    },

    setOffline: async (classId, userId) => {
      if (!classId || !userId) return;
      try {
        const presenceRef = doc(db, 'workspaces', classId, 'presence', userId);
        await setDoc(presenceRef, { isOnline: false, lastSeen: Date.now() }, { merge: true });
      } catch {}
    },

    subscribe: (classId, callback) => {
      if (!classId) return () => {};
      try {
        const presCol = collection(db, 'workspaces', classId, 'presence');
        return onSnapshot(presCol, (snap) => {
          const now = Date.now();
          const activeUsers = [];
          snap.docs.forEach(d => {
            const data = d.data();
            // Count online if last seen within 75 seconds and not explicitly offline
            if (data.isOnline !== false && data.lastSeen && (now - Number(data.lastSeen)) < 75000) {
              activeUsers.push({ id: d.id, ...data });
            }
          });
          callback(activeUsers);
        }, (err) => {
          console.warn('Presence subscription error:', err);
        });
      } catch (err) {
        console.warn('Error subscribing to presence:', err);
        return () => {};
      }
    }
  },

  // 13. VOICE CHAT SIGNALING (WEBRTC DISCORD-STYLE)
  voice: {
    joinRoom: async (classId, roomId = 'main', peerInfo) => {
      if (!classId || !peerInfo?.peerId) return;
      const peerDoc = doc(db, 'workspaces', classId, 'voice_peers', peerInfo.peerId);
      await setDoc(peerDoc, {
        roomId,
        peerId: peerInfo.peerId,
        userId: peerInfo.userId || peerInfo.peerId,
        userName: peerInfo.userName || 'Mahasiswa',
        userEmail: peerInfo.userEmail || '',
        avatar: peerInfo.avatar || '',
        isMuted: Boolean(peerInfo.isMuted),
        isDeafened: Boolean(peerInfo.isDeafened),
        isSpeaking: false,
        joinedAt: Date.now(),
        lastSeen: Date.now()
      }, { merge: true });
    },

    updatePeerState: async (classId, peerId, updates) => {
      if (!classId || !peerId) return;
      try {
        const peerDoc = doc(db, 'workspaces', classId, 'voice_peers', peerId);
        await setDoc(peerDoc, { ...updates, lastSeen: Date.now() }, { merge: true });
      } catch {}
    },

    leaveRoom: async (classId, peerId) => {
      if (!classId || !peerId) return;
      try {
        const peerDoc = doc(db, 'workspaces', classId, 'voice_peers', peerId);
        await deleteDoc(peerDoc);
      } catch {}
    },

    subscribePeers: (classId, roomId = 'main', callback) => {
      if (!classId) return () => {};
      try {
        const peersCol = collection(db, 'workspaces', classId, 'voice_peers');
        return onSnapshot(peersCol, (snap) => {
          const now = Date.now();
          const peers = [];
          snap.docs.forEach(d => {
            const data = d.data();
            if (data.roomId === roomId && (now - Number(data.lastSeen || 0)) < 45000) {
              peers.push({ id: d.id, ...data });
            }
          });
          callback(peers);
        }, (err) => {
          console.warn('Voice peers subscription error:', err);
        });
      } catch (err) {
        console.warn('Error subscribing to voice peers:', err);
        return () => {};
      }
    },

    sendSignal: async (classId, { fromPeerId, toPeerId, signal }) => {
      if (!classId || !fromPeerId || !toPeerId) return;
      try {
        const sigId = `${fromPeerId}_to_${toPeerId}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
        const sigDoc = doc(db, 'workspaces', classId, 'voice_signals', sigId);
        await setDoc(sigDoc, {
          fromPeerId,
          toPeerId,
          signal: JSON.stringify(signal),
          createdAt: Date.now()
        });
      } catch (err) {
        console.warn('Failed to send voice signal:', err);
      }
    },

    subscribeSignals: (classId, myPeerId, callback) => {
      if (!classId || !myPeerId) return () => {};
      try {
        const sigCol = collection(db, 'workspaces', classId, 'voice_signals');
        return onSnapshot(sigCol, (snap) => {
          snap.docChanges().forEach(change => {
            if (change.type === 'added') {
              const data = change.doc.data();
              if (data.toPeerId === myPeerId) {
                try {
                  const parsedSignal = JSON.parse(data.signal);
                  callback({
                    id: change.doc.id,
                    fromPeerId: data.fromPeerId,
                    signal: parsedSignal
                  });
                  // Clean up delivered signal
                  deleteDoc(change.doc.ref).catch(() => {});
                } catch {}
              }
            }
          });
        });
      } catch (err) {
        console.warn('Error subscribing to voice signals:', err);
        return () => {};
      }
    }
  }
};

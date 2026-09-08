import { supabase, isSupabaseConfigured } from '../supabase';

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

// --- AUTHENTICATION SERVICE ---
export const authService = {
  getCurrentUser: async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session) return null;
      const isSuper = isSuperAdminEmail(session.user.email) || session.user.user_metadata?.role === 'superadmin';
      return {
        uid: session.user.id,
        email: session.user.email,
        displayName: session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
        phoneNumber: session.user.user_metadata?.phone_number || '',
        role: isSuper ? 'superadmin' : (session.user.user_metadata?.role || 'user'),
        isSuperAdmin: isSuper,
        notificationPreferences: session.user.user_metadata?.notification_preferences || DEFAULT_NOTIFICATION_PREFERENCES
      };
    } catch {
      return null;
    }
  },

  onAuthStateChanged: (callback) => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const isSuper = isSuperAdminEmail(session.user.email) || session.user.user_metadata?.role === 'superadmin';
        callback({
          uid: session.user.id,
          email: session.user.email,
          displayName: session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
          phoneNumber: session.user.user_metadata?.phone_number || '',
          role: isSuper ? 'superadmin' : (session.user.user_metadata?.role || 'user'),
          isSuperAdmin: isSuper,
          notificationPreferences: session.user.user_metadata?.notification_preferences || DEFAULT_NOTIFICATION_PREFERENCES
        });
      } else {
        callback(null);
      }
    });

    return () => subscription.unsubscribe();
  },

  login: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return {
      uid: data.user.id,
      email: data.user.email,
      displayName: data.user.user_metadata?.full_name || data.user.email?.split('@')[0],
      phoneNumber: data.user.user_metadata?.phone_number || '',
      notificationPreferences: data.user.user_metadata?.notification_preferences || DEFAULT_NOTIFICATION_PREFERENCES
    };
  },

  signup: async (email, password, { fullName = '', phoneNumber = '' } = {}) => {
    const cleanPhone = (phoneNumber || '').trim();
    const formattedPhone = cleanPhone.startsWith('+') ? cleanPhone : (cleanPhone ? `+${cleanPhone.replace(/^0+/, '62')}` : '');

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          phone_number: formattedPhone,
          notification_preferences: DEFAULT_NOTIFICATION_PREFERENCES
        }
      }
    });
    if (error) throw error;
    return {
      uid: data.user?.id,
      email: data.user?.email,
      displayName: fullName || email?.split('@')[0],
      phoneNumber: formattedPhone,
      notificationPreferences: DEFAULT_NOTIFICATION_PREFERENCES
    };
  },

  updateProfile: async ({ fullName, phoneNumber, notificationPreferences }) => {
    const updates = {};
    if (fullName !== undefined) updates.full_name = fullName;
    if (phoneNumber !== undefined) updates.phone_number = phoneNumber;
    if (notificationPreferences !== undefined) updates.notification_preferences = notificationPreferences;

    const { data, error } = await supabase.auth.updateUser({
      data: updates
    });
    if (error) throw error;
    return {
      uid: data.user.id,
      email: data.user.email,
      displayName: data.user.user_metadata?.full_name || data.user.email?.split('@')[0],
      phoneNumber: data.user.user_metadata?.phone_number || '',
      notificationPreferences: data.user.user_metadata?.notification_preferences || DEFAULT_NOTIFICATION_PREFERENCES
    };
  },

  resetPassword: async (email) => {
    const isDev = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    const base = isDev ? window.location.origin : 'https://classy.exars.my.id';
    const redirectTo = `${base}/reset-password`;
    const { data, error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo
    });
    if (error) throw error;
    return data;
  },

  updatePassword: async (newPassword) => {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword
    });
    if (error) throw error;
    return data;
  },

  updateEmail: async (newEmail) => {
    const cleanEmail = String(newEmail).trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      throw new Error('Alamat email baru tidak valid.');
    }

    const isDev = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    const base = isDev ? window.location.origin : 'https://classy.exars.my.id';
    const emailRedirectTo = `${base}/`;

    const { data, error } = await supabase.auth.updateUser(
      { email: cleanEmail },
      { emailRedirectTo }
    );
    if (error) throw error;
    return data;
  },

  logout: async () => {
    await supabase.auth.signOut();
  },

  signOut: async () => {
    await supabase.auth.signOut();
  }
};

// Helper to parse lecturer name, role, and contact phone number
export const parseLecturerInfo = (rawLecturer = '', rawNotes = '', explicitPhone = '') => {
  const text = `${rawLecturer || ''} ${rawNotes || ''} ${explicitPhone || ''}`;
  
  // Extract phone number (starts with +628, 628, 08, or 8 followed by 8-12 digits)
  const phoneMatch = (explicitPhone || text).match(/(?:\+?62|0)?(8\d{8,12})/);
  let phone = '';
  let cleanPhone = '';
  if (phoneMatch) {
    phone = phoneMatch[0];
    cleanPhone = '62' + phoneMatch[1];
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
  // 1. Remove phone in parentheses like (08128315124) or ( 0812... )
  // 2. Remove standalone phone numbers
  // 3. Remove role in parentheses if found
  // 4. Remove empty or whitespace-only parentheses `()`
  let name = (rawLecturer || '')
    .replace(/\(\s*(?:\+?62|0)?8\d{8,12}\s*\)/g, '') // remove phone in parentheses
    .replace(/(?:\+?62|0)?8\d{8,12}/g, '')          // remove raw phone digits
    .replace(/\(\s*\)/g, '');                       // remove empty parentheses

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

    update: async (classId, { name, classIdentifier, lecturer, academicPeriod, waGroupLink }) => {
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

    submit: async (taskId, { userId, userName, fileName, fileUrl, fileSize, isGroup = false, groupMembers = [] }) => {
      const { data: existing, error: getErr } = await supabase.from('tasks').select('*').eq('id', taskId).maybeSingle();
      if (getErr || !existing) throw new Error('Tugas tidak ditemukan.');

      let meta = {};
      try {
        meta = typeof existing.description === 'string' && existing.description.startsWith('{') ? JSON.parse(existing.description) : {};
      } catch {
        meta = { text: existing.description };
      }

      const submissions = meta.submissions || [];
      const newSubmission = {
        id: 'sub_' + Math.random().toString(36).substr(2, 9),
        userId,
        userName,
        fileName,
        fileUrl: fileUrl || '',
        fileSize: fileSize || '',
        isGroup: Boolean(isGroup),
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
          submissionFiles.push({
            id: 'sub_' + (s.id || `${s.userId}_${t.id}`),
            classId: t.workspace_id,
            name: s.fileName || `${s.userName} - Submission`,
            category: 'Submission',
            folder: `Tugas: ${t.title}`,
            course: t.subject || '',
            groupName: groupNames ? `Kelompok: ${groupNames}` : t.title,
            uploadedBy: s.userName || 'Mahasiswa',
            fileSize: s.fileSize || '1.2 MB',
            fileType: (s.fileName || '').split('.').pop()?.toLowerCase() || 'pdf',
            storageUrl: s.fileUrl || '',
            createdAt: s.submittedAt || t.created_at,
            isSubmission: true,
            isGroup: Boolean(s.isGroup),
            groupMembers: s.groupMembers || [],
            taskId: t.id
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
          if (!userMap.has(email)) {
            userMap.set(email, m);
            const role = (m.role || '').toLowerCase();
            if (role === 'komti' || role === 'coordinator') komtiCount++;
            else if (role === 'lecturer' || role === 'dosen') lecturerCount++;
            else studentCount++;
          }
        });
      });

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
  }
};

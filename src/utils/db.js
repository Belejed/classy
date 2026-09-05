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

// --- AUTHENTICATION SERVICE ---
export const authService = {
  getCurrentUser: async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session) return null;
      return {
        uid: session.user.id,
        email: session.user.email,
        displayName: session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
        phoneNumber: session.user.user_metadata?.phone_number || '',
        notificationPreferences: session.user.user_metadata?.notification_preferences || DEFAULT_NOTIFICATION_PREFERENCES
      };
    } catch {
      return null;
    }
  },

  onAuthStateChanged: (callback) => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        callback({
          uid: session.user.id,
          email: session.user.email,
          displayName: session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
          phoneNumber: session.user.user_metadata?.phone_number || '',
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

  // Extract role if in parentheses (e.g. (pengajar utama))
  let role = '';
  const roleMatch = (rawLecturer || '').match(/\(([^)]+)\)/);
  if (roleMatch) {
    role = roleMatch[1].trim();
  }

  // Clean lecturer name
  let name = (rawLecturer || '')
    .replace(/(?:\+?62|0)?8\d{8,12}/g, '') // remove phone digits
    .replace(/\([^)]+\)/g, '') // remove parentheses text
    .trim();

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

      const filtered = (data || []).filter(c => 
        !c.id.startsWith('personal_') && 
        c.invite_code !== 'PERSONAL' &&
        (c.owner_id === userId || 
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
        let userRole = currentMember?.role || (isOwner ? 'komti' : 'student');
        if (userRole === 'coordinator') userRole = 'komti';

        return {
          id: c.id,
          name: c.name,
          classIdentifier: meta.classIdentifier || c.description || 'TI-3A',
          lecturer: meta.lecturer || 'Dosen Pengampu',
          academicPeriod: meta.academicPeriod || '2026/2027 Ganjil',
          joinCode: c.invite_code,
          ownerId: c.owner_id,
          userRole, // 'komti' | 'lecturer' | 'student'
          members: c.members || [],
          memberCount: (c.members || []).length || 1,
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

      return {
        id: data.id,
        name: data.name,
        classIdentifier: meta.classIdentifier || data.description || 'TI-3A',
        lecturer: meta.lecturer || 'Dosen Pengampu',
        academicPeriod: meta.academicPeriod || '2026/2027 Ganjil',
        joinCode: data.invite_code,
        ownerId: data.owner_id,
        members: data.members || [],
        memberCount: (data.members || []).length || 1,
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

      return {
        id: data.id,
        name: data.name,
        classIdentifier: meta.classIdentifier || data.description || 'TI-3A',
        lecturer: meta.lecturer || 'Dosen Pengampu',
        academicPeriod: meta.academicPeriod || '2026/2027',
        joinCode: data.invite_code,
        members: data.members || [],
        memberCount: (data.members || []).length || 1
      };
    },

    create: async (userId, userEmail, userName, { name, classIdentifier, lecturer, academicPeriod, creatorRole = 'komti' }) => {
      // Rule: 1 user can only have 1 class
      const existingClasses = await dbService.classes.list(userId, userEmail);
      if (existingClasses.length > 0) {
        throw new Error(`Akun Anda sudah terdaftar di kelas "${existingClasses[0].name}". Setiap pengguna hanya dapat mengikuti 1 ruang kelas.`);
      }

      const classId = 'class_' + Math.random().toString(36).substr(2, 9);
      const joinCode = generateJoinCode();

      const meta = {
        classIdentifier: (classIdentifier || 'TI-3A').trim(),
        lecturer: (lecturer || 'Dosen Pengampu').trim(),
        academicPeriod: (academicPeriod || '2026/2027').trim()
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
            role: finalRole,
            joinedAt: new Date().toISOString()
          }
        ]
      };

      const { error } = await supabase.from('workspaces').insert(newDbRecord);
      if (error) throw error;

      return {
        id: newDbRecord.id,
        name: newDbRecord.name,
        classIdentifier: meta.classIdentifier,
        lecturer: meta.lecturer,
        academicPeriod: meta.academicPeriod,
        joinCode: newDbRecord.invite_code,
        ownerId: newDbRecord.owner_id,
        userRole: finalRole,
        members: newDbRecord.members,
        memberCount: 1,
        createdAt: newDbRecord.created_at
      };
    },

    joinByCode: async (userId, userEmail, userName, joinCode, defaultRole = 'student') => {
      // Rule: 1 user can only have 1 class
      const existingClasses = await dbService.classes.list(userId, userEmail);
      const cleanCode = (joinCode || '').trim().toUpperCase();
      const { data, error } = await supabase.from('workspaces').select('*').ilike('invite_code', cleanCode).maybeSingle();
      if (error || !data) {
        throw new Error('Kode kelas tidak valid atau kelas tidak ditemukan.');
      }

      // If user is already in a different class
      if (existingClasses.length > 0 && existingClasses[0].id !== data.id) {
        throw new Error(`Akun Anda sudah terdaftar di kelas "${existingClasses[0].name}". Setiap pengguna hanya dapat mengikuti 1 ruang kelas. Silakan keluar dari kelas saat ini terlebih dahulu jika ingin berpindah.`);
      }

      const existingMembers = data.members || [];
      const alreadyJoined = existingMembers.some(m => m.userId === userId || m.email?.toLowerCase() === userEmail?.toLowerCase());

      let updatedMembers = existingMembers;
      if (!alreadyJoined) {
        updatedMembers = [
          ...existingMembers,
          {
            userId,
            name: userName || userEmail.split('@')[0],
            email: userEmail,
            role: defaultRole,
            joinedAt: new Date().toISOString()
          }
        ];
        const { error: updErr } = await supabase.from('workspaces').update({ members: updatedMembers }).eq('id', data.id);
        if (updErr) throw updErr;
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
        lecturer: meta.lecturer || 'Dosen Pengampu',
        academicPeriod: meta.academicPeriod || '2026/2027',
        joinCode: data.invite_code,
        ownerId: data.owner_id,
        userRole,
        members: updatedMembers,
        memberCount: updatedMembers.length,
        createdAt: data.created_at
      };
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

    update: async (classId, { name, classIdentifier, lecturer, academicPeriod }) => {
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
        joinCode: data.invite_code,
        ownerId: data.owner_id,
        members: data.members || [],
        memberCount: (data.members || []).length || 1,
        createdAt: data.created_at
      };
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

        const attachments = Array.isArray(t.attachments) ? t.attachments : [];
        const submissions = meta.submissions || [];

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
        attachments: row.attachments,
        submissions: [],
        createdAt: row.created_at
      };
    },

    submit: async (taskId, { userId, userName, fileName, fileUrl, fileSize }) => {
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
        submittedAt: new Date().toISOString()
      };

      const updatedSubmissions = [
        ...submissions.filter(s => s.userId !== userId),
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
          submissionFiles.push({
            id: 'sub_' + (s.id || `${s.userId}_${t.id}`),
            classId: t.workspace_id,
            name: s.fileName || `${s.userName} - Submission`,
            category: 'Submission',
            folder: `Tugas: ${t.title}`, // Folder specifically grouped by task title!
            course: t.subject || '',
            groupName: t.title,
            uploadedBy: s.userName || 'Mahasiswa',
            fileSize: s.fileSize || '1.2 MB',
            fileType: (s.fileName || '').split('.').pop()?.toLowerCase() || 'pdf',
            storageUrl: s.fileUrl || '',
            createdAt: s.submittedAt || t.created_at,
            isSubmission: true,
            taskId: t.id
          });
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
        storageUrl: fileItem.storageUrl || ''
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
        createdAt: row.updated_at
      };
    },

    delete: async (fileId) => {
      await supabase.from('notes').delete().eq('id', fileId);
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
  }
};

import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useNavigate, useParams, useLocation } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';
import { authService, dbService, isSuperAdmin, isClassBlocked } from './utils/db';
import { moveFileToDriveTrash, moveFilesToDriveTrash } from './utils/driveUpload';
import { unlockBodyScroll } from './components/ModalPortal';
import { Lock, ShieldCheck, Mail, ArrowLeft, ShieldAlert, Copy, Check, Wrench } from 'lucide-react';

// Classy Core Components (Eagerly loaded for fast immediate navigation)
import Auth from './components/Auth';
import ClassLobby from './components/ClassLobby';
import ClassSidebar from './components/ClassSidebar';
import ClassMembers from './components/ClassMembers';
import ClassDashboard from './components/ClassDashboard';
import ClassSchedule from './components/ClassSchedule';
import ClassTasks from './components/ClassTasks';
import ClassFiles from './components/ClassFiles';
import ClassAnnouncements from './components/ClassAnnouncements';
import ClassForum from './components/ClassForum';
import ClassContacts from './components/ClassContacts';
import ErrorBoundary from './components/ErrorBoundary';
import ClassTopHeader from './components/ClassTopHeader';
import { DashboardSkeleton, TasksSkeleton, ScheduleSkeleton } from './components/SkeletonLoader';
import { setupGlobalUpdateListeners } from './utils/appUpdater';
import { canDeleteAnything } from './utils/permissions';
import { shouldShowChangelogAuto, markChangelogSeen } from './utils/changelogHelper';
import ChangeTemporaryPasswordModal from './components/ChangeTemporaryPasswordModal';
import { setupIdleSessionWatcher, resetActivityEpoch, clearActivityEpoch } from './utils/sessionTimeout';

// Heavy modals and non-critical sub-tabs: Lazy loaded for optimal mobile performance and small bundle
const ClassSubmissionsManager = lazy(() => import('./components/ClassSubmissionsManager'));
const ClassActivityLog = lazy(() => import('./components/ClassActivityLog'));
const ClassStructure = lazy(() => import('./components/ClassStructure'));
const UserProfileModal = lazy(() => import('./components/UserProfileModal'));
const SuperadminDashboardModal = lazy(() => import('./components/SuperadminDashboardModal'));
const ChangelogModal = lazy(() => import('./components/ChangelogModal'));
const MaintenanceScreen = lazy(() => import('./components/MaintenanceScreen'));

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Class Management State
  const [classes, setClasses] = useState([]);
  const [currentClass, setCurrentClass] = useState(null);
  const [classesLoading, setClassesLoading] = useState(true);

  // Class Domain Data (null until fetched from database to prevent flashing 0s)
  const [schedules, setSchedules] = useState(null);
  const [tasks, setTasks] = useState(null);
  const [files, setFiles] = useState(null);
  const [announcements, setAnnouncements] = useState(null);
  const [groups, setGroups] = useState(null);
  const [logs, setLogs] = useState(null);
  const [contentLoading, setContentLoading] = useState(false);

  // Modals
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showGlobalSuperadminModal, setShowGlobalSuperadminModal] = useState(false);

  // System Maintenance Mode State
  const [maintenanceConfig, setMaintenanceConfig] = useState({
    enabled: false,
    title: 'Sistem Sedang Dalam Pemeliharaan',
    message: 'Classy sedang menjalani pemeliharaan sistem berkala untuk peningkatan performa dan pembaruan fitur. Kami akan segera kembali!',
    estimatedEndTime: ''
  });

  // App Update Changelog Modal (shows every Monday on first open, or on new release)
  const [showChangelogModal, setShowChangelogModal] = useState(() => shouldShowChangelogAuto());

  // Automatically pop up Changelog every Monday when user logs in / opens the app
  useEffect(() => {
    if (user && shouldShowChangelogAuto()) {
      setShowChangelogModal(true);
    }
  }, [user]);

  const handleCloseChangelog = () => {
    markChangelogSeen();
    setShowChangelogModal(false);
  };

  // Mandatory Change Password state for temporary password users (123456)
  const [mustChangePassword, setMustChangePassword] = useState(() => {
    try {
      return localStorage.getItem('classy_must_change_temp_password') === 'true' || 
             sessionStorage.getItem('classy_must_change_temp_password') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (user) {
      const needed = localStorage.getItem('classy_must_change_temp_password') === 'true' || 
                     sessionStorage.getItem('classy_must_change_temp_password') === 'true';
      setMustChangePassword(needed);
    } else {
      setMustChangePassword(false);
    }
  }, [user]);

  const handleQuickDisableMaintenance = async () => {
    const toastId = toast.loading('Mematikan mode pemeliharaan...');
    try {
      const updated = await dbService.system.setMaintenanceConfig({
        ...maintenanceConfig,
        enabled: false,
        updatedBy: user?.displayName || user?.email || 'Superadmin'
      });
      setMaintenanceConfig(updated);
      toast.success('Mode pemeliharaan berhasil dimatikan. Website kembali normal!', { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error('Gagal mematikan mode pemeliharaan', { id: toastId });
    }
  };

  const navigate = useNavigate();
  const location = useLocation();

  // Clean old cached keys and reset any dark mode flags
  useEffect(() => {
    try {
      localStorage.removeItem('noted_files');
      localStorage.removeItem('app_theme');
      localStorage.removeItem('classy_theme');
      document.documentElement.classList.remove('dark', 'theme-dark');
      unlockBodyScroll(true);
    } catch {}
  }, []);

  // Failsafe: Always ensure body scroll is unlocked when navigating between routes
  useEffect(() => {
    unlockBodyScroll(true);
  }, [location.pathname]);

  // Maintenance Mode Initial Load and Realtime Listener
  useEffect(() => {
    let unsub = null;
    const initMaintenance = async () => {
      try {
        const config = await dbService.system.getMaintenanceConfig();
        if (config) setMaintenanceConfig(config);
      } catch (err) {
        console.warn('Error loading maintenance config:', err);
      }
    };
    initMaintenance();
    unsub = dbService.system.subscribeToMaintenance((updated) => {
      if (updated) {
        setMaintenanceConfig(updated);
      }
    });
    return () => {
      if (unsub) unsub();
    };
  }, []);

  // 1. Auth Listener with Mobile Network Safety Timeout (Instant Reveal once resolved) & Global Force Logout Guard
  useEffect(() => {
    // Safety timeout: Ensure users on cellular data or poor connections are never trapped on splash screen
    const safetyTimer = setTimeout(() => {
      setAuthLoading(false);
    }, 800);

    const unsubscribe = authService.onAuthStateChanged(async (currentUser) => {
      clearTimeout(safetyTimer);

      if (currentUser) {
        // Sync mustChangePassword state immediately
        const isMustChange = localStorage.getItem('classy_must_change_temp_password') === 'true' || 
                             sessionStorage.getItem('classy_must_change_temp_password') === 'true';
        if (isMustChange) {
          setMustChangePassword(true);
        }
      }

      setUser(currentUser);
      setAuthLoading(false);
    });

    return () => {
      clearTimeout(safetyTimer);
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [navigate]);

  // 20-Minute Inactivity / Idle Auto-Logout Watcher (Session Expired)
  useEffect(() => {
    if (!user) return;

    const cleanup = setupIdleSessionWatcher({
      enabled: Boolean(user),
      onTimeout: async () => {
        console.warn('[Security] User idle for 20 minutes. Terminating session.');
        try {
          await authService.logout();
        } catch (err) {
          console.error('Idle timeout logout error:', err);
        }
        try {
          clearActivityEpoch();
          localStorage.removeItem('classy_must_change_temp_password');
          sessionStorage.removeItem('classy_must_change_temp_password');
        } catch {}

        setUser(null);
        setCurrentClass(null);
        setClasses([]);
        toast('Sesi Anda telah berakhir karena tidak ada aktivitas selama 20 menit. Silakan login kembali.', {
          icon: '⏰',
          duration: 8000,
          id: 'session-timeout-toast'
        });
        navigate('/login', { replace: true });
      }
    });

    return () => {
      cleanup();
    };
  }, [user, navigate]);

  // Intercept recovery tokens arriving on any path (Firebase oobCode or reset tokens)
  useEffect(() => {
    const hash = window.location.hash || '';
    const search = window.location.search || '';
    if (
      hash.includes('type=recovery') || 
      hash.includes('reset') || 
      hash.includes('oobCode') ||
      search.includes('type=recovery') || 
      search.includes('mode=resetPassword') ||
      search.includes('oobCode')
    ) {
      navigate('/reset-password' + search + hash, { replace: true });
    }
  }, []);

  // 2. Load Classes when user is authenticated
  const loadUserClasses = async () => {
    if (!user) return;
    setClassesLoading(true);
    try {
      // Instant SWR cache read so users never see an empty screen on slow cellular connections
      const cacheKey = `classy_cached_user_classes_${user.uid}`;
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setClasses(parsed);
          }
        }
      } catch {}

      const userClasses = await dbService.classes.list(user.uid, user.email, user.phoneNumber);
      setClasses(userClasses);

      try {
        localStorage.setItem(cacheKey, JSON.stringify(userClasses));
      } catch {}

      if (currentClass) {
        const stillValid = userClasses.find(c => c.id === currentClass.id);
        if (stillValid) setCurrentClass(stillValid);
      }
    } catch (err) {
      console.error('Failed to load classes:', err);
    } finally {
      setClassesLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadUserClasses();
    } else {
      setClasses([]);
      setCurrentClass(null);
    }
  }, [user]);

  // 3. Load Class Content when currentClass changes
  const loadClassContent = async (cls = currentClass, isSilent = false) => {
    if (!cls?.id) return;
    const hasData = schedules !== null && tasks !== null && files !== null;
    if (!isSilent && !hasData) {
      setContentLoading(true);
    }
    try {
      const [schRes, taskRes, fileRes, annRes, grpRes, logRes] = await Promise.allSettled([
        dbService.schedules.list(cls.id),
        dbService.tasks.list(cls.id),
        dbService.files.list(cls.id),
        dbService.announcements.list(cls.id),
        dbService.groups.list(cls.id),
        dbService.logs.list(cls.id)
      ]);

      if (schRes.status === 'fulfilled') setSchedules(schRes.value || []);
      if (taskRes.status === 'fulfilled') setTasks(taskRes.value || []);
      if (fileRes.status === 'fulfilled') setFiles(fileRes.value || []);
      if (annRes.status === 'fulfilled') setAnnouncements(annRes.value || []);
      if (grpRes.status === 'fulfilled') setGroups(grpRes.value || []);
      if (logRes.status === 'fulfilled') setLogs(logRes.value || []);

      // Auto-sync current user's phone number into class members
      if (user?.uid && user?.phoneNumber && cls?.id) {
        dbService.classes.syncMemberPhone(cls.id, user.uid, user.phoneNumber).catch(() => {});
      }
    } catch (err) {
      console.error('Error loading class data:', err);
      if (!hasData) {
        setSchedules([]);
        setTasks([]);
        setFiles([]);
        setAnnouncements([]);
        setGroups([]);
        setLogs([]);
      }
    } finally {
      setContentLoading(false);
    }
  };

  const handleRefreshLogs = async () => {
    if (!currentClass?.id) return;
    try {
      const freshLogs = await dbService.logs.list(currentClass.id);
      setLogs(freshLogs);
      return freshLogs;
    } catch (err) {
      console.error('Error refreshing logs:', err);
    }
  };

  useEffect(() => {
    if (currentClass?.id) {
      loadClassContent(currentClass);
    } else {
      setSchedules(null);
      setTasks(null);
      setFiles(null);
      setAnnouncements(null);
      setGroups(null);
      setLogs(null);
    }
  }, [currentClass?.id]);

  // Auto-Update & Background Refresh on Tab Focus / Entry
  useEffect(() => {
    const cleanup = setupGlobalUpdateListeners({
      onRefreshData: async () => {
        if (user) {
          await loadUserClasses();
          if (currentClass?.id) {
            await loadClassContent(currentClass, true);
          }
        }
      }
    });
    return cleanup;
  }, [user, currentClass?.id]);

  // Helper to send class notifications via serverless Resend endpoint
  const sendClassNotificationEmail = async ({ subject, type = 'announcement', title, subtitle, message, metaRows = [], photoUrl = null, sendIndividual = true }) => {
    try {
      if (isClassBlocked(currentClass)) {
        console.warn('[sendClassNotificationEmail] Pengiriman email di-pause karena kelas terblokir:', currentClass?.name);
        return { success: false, paused: true, message: 'Pengiriman email di-pause karena kelas sedang terblokir.' };
      }

      const recipients = (currentClass?.members || [])
        .filter(m => (m.status || 'approved') === 'approved' && m.email)
        .map(m => m.email);

      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId: currentClass?.id,
          recipients,
          sendIndividual,
          subject,
          type,
          title,
          subtitle: subtitle || `Ruang Kelas ${currentClass?.name || 'Classy'}`,
          message,
          metaRows,
          photoUrl
        })
      });
      return await res.json();
    } catch (err) {
      console.warn('Could not send notification email:', err);
      return null;
    }
  };

  // Handlers for Data Mutations
  const handleAddSchedule = async (item) => {
    const created = await dbService.schedules.create(currentClass.id, item);
    setSchedules(prev => [...prev, created]);

    // Send email notification for new class schedule
    sendClassNotificationEmail({
      subject: `[Jadwal Baru] ${created.subject || created.title} - Ruang ${created.room || 'Kelas'}`,
      type: 'schedule_update',
      title: `Jadwal Kuliah Baru: ${created.subject || created.title}`,
      subtitle: `Jadwal Kuliah ${currentClass?.name || 'Classy'}`,
      message: `Jadwal perkuliahan baru telah ditambahkan untuk mata kuliah ${created.subject || created.title}.`,
      metaRows: [
        ['Mata Kuliah', created.subject || created.title || 'Mata Kuliah'],
        ['Dosen Pengajar', created.lecturer || 'Dosen Pengajar'],
        ['Hari & Jam', `${created.day}, ${created.startTime} - ${created.endTime || 'Selesai'} WIB`],
        ['Ruang Kuliah', created.room || 'Ruang Kelas / Online'],
        ['Kelas / Rombel', currentClass?.name || 'Classy'],
        ...(created.notes ? [['Catatan', created.notes]] : [])
      ]
    });

    return created;
  };

  const handleUpdateSchedule = async (scheduleId, updates) => {
    const updated = await dbService.schedules.update(scheduleId, updates);
    setSchedules(prev => prev.map(s => s.id === scheduleId ? { ...s, ...updated } : s));

    // Send email notification for schedule/room update
    const sch = { ...schedules?.find(s => s.id === scheduleId), ...updated };
    if (sch?.subject || sch?.title) {
      const subjectName = sch.subject || sch.title;
      sendClassNotificationEmail({
        subject: `[Update Jadwal / Ruangan] ${subjectName} - Ruang ${sch.room || 'Kelas'}`,
        type: 'schedule_update',
        title: `Pembaruan Jadwal: ${subjectName}`,
        subtitle: `Pembaruan Jadwal Kelas ${currentClass?.name || 'Classy'}`,
        message: `Terdapat pembaruan informasi jadwal atau ruangan pada mata kuliah ${subjectName}. Mohon periksa jadwal terbaru sebelum perkuliahan dimulai.`,
        metaRows: [
          ['Mata Kuliah', subjectName],
          ['Dosen Pengajar', sch.lecturer || 'Dosen Pengajar'],
          ['Hari & Jam', `${sch.day}, ${sch.startTime} - ${sch.endTime || 'Selesai'} WIB`],
          ['Ruangan Terkini', sch.room || 'Ruang Kelas / Online'],
          ['Kelas / Rombel', currentClass?.name || 'Classy'],
          ...(sch.notes ? [['Catatan Khusus', sch.notes]] : [])
        ]
      });
    }

    return updated;
  };

  const handleDeleteSchedule = async (scheduleId) => {
    const isOwner = currentClass?.ownerId === user?.uid;
    if (!canDeleteAnything(currentClass?.userRole, isOwner)) {
      toast.error('Wakil Komti dan Kepala Divisi tidak memiliki izin menghapus jadwal.');
      return;
    }
    await dbService.schedules.delete(scheduleId);
    setSchedules(prev => prev.filter(s => s.id !== scheduleId));
  };

  const handleCreateTask = async (item) => {
    const created = await dbService.tasks.create(currentClass.id, item);
    setTasks(prev => [created, ...prev]);

    try {
      const typeLabel = item.submissionType === 'group' ? ' (Tugas Kelompok)' : '';
      const attInfo = item.attachments?.length ? ` [${item.attachments.length} Lampiran]` : '';
      await dbService.logs.create(currentClass.id, {
        actionType: 'task_create',
        title: `Tugas baru: ${item.title}${typeLabel}`,
        details: `${user?.displayName || 'Komti'} menambahkan tugas "${item.title}"${typeLabel}${attInfo} untuk mata kuliah ${item.course || '-'}. Tenggat: ${item.dueDate} ${item.dueTime || '23:59'}.`,
        actor: { name: user?.displayName, email: user?.email, role: currentClass?.userRole },
        targetName: item.title,
        color: 'blue'
      });
      handleRefreshLogs();
    } catch {}

    // Send email notification if enabled
    if (item.sendEmailNotification !== false) {
      const isGroup = item.submissionType === 'group';
      const isPaper = item.submissionRequired === false;
      const metaRows = [
        ['Mata Kuliah', item.course || 'Perkuliahan'],
        ['Judul Tugas', item.title],
        ['Jenis Pengerjaan', isGroup ? '👥 Tugas Kelompok (1 Perwakilan Kumpul)' : '👤 Tugas Individu'],
        ['Format Pengumpulan', isPaper ? '📝 Tugas Fisik / Kertas (Paper di Kelas)' : '📁 Upload Berkas (Google Drive)'],
        ['Batas Pengumpulan', `${item.dueDate} pukul ${item.dueTime || '23:59'} WIB`],
        ['Dosen Pengajar', item.lecturer || '-'],
        ['Ruang Kelas', currentClass?.name || 'Classy']
      ];
      if (item.attachments?.length) {
        metaRows.push(['Lampiran Soal', `${item.attachments.length} berkas/foto terlampir di portal`]);
      }

      sendClassNotificationEmail({
        subject: `[TUGAS KULIAH BARU: ${item.course || currentClass?.name || 'Classy'}] ${item.title}`,
        type: 'task_new',
        title: item.title,
        subtitle: `Tugas Kuliah Baru - ${item.course || currentClass?.name || 'Classy'}`,
        message: item.description ? item.description : `Telah ditambahkan penugasan baru untuk mata kuliah ${item.course || '-'}. Harap periksa detail tugas dan instruksi pengumpulan.`,
        metaRows
      }).catch(err => console.warn('Gagal mengirim notifikasi email tugas baru:', err));
    }

    return created;
  };

  const handleUpdateTask = async (taskId, updates) => {
    const updated = await dbService.tasks.update(taskId, updates);
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updated } : t));

    try {
      const typeLabel = updated.submissionType === 'group' ? ' (Tugas Kelompok)' : '';
      const attInfo = updated.attachments?.length ? ` [${updated.attachments.length} Lampiran]` : '';
      await dbService.logs.create(currentClass.id, {
        actionType: 'task_update',
        title: `Tugas diperbarui: ${updated.title}${typeLabel}`,
        details: `${user?.displayName || 'Komti'} memperbarui rincian tugas "${updated.title}"${typeLabel}${attInfo} untuk mata kuliah ${updated.course || '-'}. Tenggat: ${updated.dueDate} ${updated.dueTime || '23:59'}.`,
        actor: { name: user?.displayName, email: user?.email, role: currentClass?.userRole },
        targetName: updated.title,
        color: 'indigo'
      });
      handleRefreshLogs();
    } catch {}

    return updated;
  };

  const handleSubmitAssignment = async (taskId, submissionData) => {
    // If student previously submitted files with different URLs, move the old ones to Trash in Drive
    const currentTask = tasks?.find(t => t.id === taskId);
    const existingSub = currentTask?.submissions?.find(s => s.userId === submissionData.userId || s.groupMembers?.some(m => m.userId === submissionData.userId));
    
    if (existingSub) {
      const oldUrls = [
        ...(existingSub.files?.map(f => f.url) || []),
        existingSub.fileUrl
      ].filter(Boolean);

      const newUrls = new Set([
        ...(submissionData.files?.map(f => f.url) || []),
        submissionData.fileUrl
      ].filter(Boolean));

      const urlsToTrash = oldUrls.filter(u => !newUrls.has(u));
      if (urlsToTrash.length > 0) {
        try {
          await moveFilesToDriveTrash(urlsToTrash);
        } catch (trashErr) {
          console.warn('Gagal memindahkan berkas tugas lama ke folder Trash di Drive:', trashErr);
        }
      }
    }

    const sub = await dbService.tasks.submit(taskId, submissionData);
    const refreshed = await dbService.tasks.list(currentClass.id);
    setTasks(refreshed);

    // Refresh files list so the submission immediately appears in Files tab
    try {
      const freshFiles = await dbService.files.list(currentClass.id);
      setFiles(freshFiles);
    } catch {}

    try {
      const targetTask = refreshed.find(t => t.id === taskId);
      const isGroup = Boolean(submissionData.isGroup);
      const isPaper = !submissionData.fileUrl && (!submissionData.files || submissionData.files.length === 0);
      const groupName = (submissionData.groupName || '').trim();
      const groupList = Array.isArray(submissionData.groupMembers) && submissionData.groupMembers.length > 0
        ? submissionData.groupMembers.map(m => m.userName || m.name).filter(Boolean).join(', ')
        : '';
      const fileCountInfo = Array.isArray(submissionData.files) && submissionData.files.length > 1
        ? `${submissionData.files.length} berkas`
        : submissionData.fileName;

      const logTitle = isGroup
        ? `${submissionData.userName} ${isPaper ? 'menandai tugas kelompok selesai' : 'mengumpulkan tugas kelompok'} ${groupName ? `[${groupName}]` : ''}`
        : `${submissionData.userName} ${isPaper ? 'menandai tugas selesai' : 'mengumpulkan tugas'}`;

      const logDetails = isGroup
        ? `${submissionData.userName} ${isPaper ? 'menandai tugas fisik (paper/kertas)' : 'mengumpulkan berkas'} kelompok ${groupName ? `"${groupName}" ` : ''}${fileCountInfo ? `("${fileCountInfo}")` : ''}${groupList ? ` bersama: ${groupList}` : ''} untuk tugas "${targetTask?.title || 'Tugas Kuliah'}".`
        : `${submissionData.userName} ${isPaper ? 'menandai tugas fisik (paper/kertas) selesai dikerjakan' : `mengumpulkan berkas "${fileCountInfo}"`} untuk tugas "${targetTask?.title || 'Tugas Kuliah'}".`;

      await dbService.logs.create(currentClass.id, {
        actionType: 'task_submit',
        title: logTitle,
        details: logDetails,
        actor: { name: submissionData.userName, email: user?.email, role: 'student' },
        targetName: targetTask?.title || '',
        color: 'sky'
      });
      handleRefreshLogs();
    } catch {}

    return sub;
  };

  const handleDeleteSubmission = async (taskId, userId) => {
    const currentTask = tasks?.find(t => t.id === taskId);
    const existingSub = currentTask?.submissions?.find(s => s.userId === userId || s.groupMembers?.some(m => m.userId === userId));
    const urlsToTrash = [
      ...(existingSub?.files?.filter(f => !f.isLink)?.map(f => f.url) || []),
      (!existingSub?.isLink ? existingSub?.fileUrl : null)
    ].filter(Boolean);

    if (urlsToTrash.length > 0) {
      try {
        await moveFilesToDriveTrash(urlsToTrash);
      } catch (trashErr) {
        console.warn('Gagal memindahkan berkas tugas ke folder Trash di Drive:', trashErr);
      }
    }

    await dbService.tasks.unsubmit(taskId, userId);
    const refreshed = await dbService.tasks.list(currentClass.id);
    setTasks(refreshed);

    try {
      const freshFiles = await dbService.files.list(currentClass.id);
      setFiles(freshFiles);
    } catch {}

    try {
      await dbService.logs.create(currentClass.id, {
        actionType: 'task_unsubmit',
        title: `Pengumpulan tugas dibatalkan`,
        details: `${user?.displayName || 'Mahasiswa'} membatalkan pengumpulan tugas "${currentTask?.title || taskId}". Berkas tugas telah dihapus.`,
        actor: { name: user?.displayName, email: user?.email, role: currentClass?.userRole },
        targetName: currentTask?.title || '',
        color: 'rose'
      });
      handleRefreshLogs();
    } catch {}
  };

  const handleAdminUpdateSubmission = async (taskId, submissionId, updates) => {
    await dbService.tasks.updateSubmission(taskId, submissionId, updates);
    const refreshed = await dbService.tasks.list(currentClass.id);
    setTasks(refreshed);
    try {
      const freshFiles = await dbService.files.list(currentClass.id);
      setFiles(freshFiles);
    } catch {}

    try {
      const targetTask = refreshed.find(t => t.id === taskId);
      const groupNames = Array.isArray(updates.groupMembers) && updates.groupMembers.length > 0
        ? updates.groupMembers.map(m => m.userName || m.name).join(', ')
        : '';
      await dbService.logs.create(currentClass.id, {
        actionType: 'task_submit_cleanup',
        title: `Pengumpulan tugas dirapikan oleh Komti`,
        details: `${user?.displayName || 'Komti'} merapikan pengumpulan tugas "${targetTask?.title || taskId}"${groupNames ? ` (Anggota kelompok: ${groupNames})` : ''}.`,
        actor: { name: user?.displayName, email: user?.email, role: currentClass?.userRole },
        targetName: targetTask?.title || '',
        color: 'indigo'
      });
      handleRefreshLogs();
    } catch {}
  };

  const handleAdminMoveSubmission = async (fromTaskId, toTaskId, submissionId) => {
    await dbService.tasks.moveSubmission(fromTaskId, toTaskId, submissionId);
    const refreshed = await dbService.tasks.list(currentClass.id);
    setTasks(refreshed);
    try {
      const freshFiles = await dbService.files.list(currentClass.id);
      setFiles(freshFiles);
    } catch {}

    try {
      const toTask = refreshed.find(t => t.id === toTaskId);
      await dbService.logs.create(currentClass.id, {
        actionType: 'task_submit_move',
        title: `Pengumpulan tugas dipindahkan oleh Komti`,
        details: `${user?.displayName || 'Komti'} memindahkan pengumpulan tugas ke "${toTask?.title || toTaskId}".`,
        actor: { name: user?.displayName, email: user?.email, role: currentClass?.userRole },
        targetName: toTask?.title || '',
        color: 'sky'
      });
      handleRefreshLogs();
    } catch {}
  };

  const handleRefreshSubmissionsData = async () => {
    const refreshedTasks = await dbService.tasks.list(currentClass.id);
    setTasks(refreshedTasks);
    try {
      const freshFiles = await dbService.files.list(currentClass.id);
      setFiles(freshFiles);
    } catch {}
  };

  const handleDeleteTask = async (taskId) => {
    const isOwner = currentClass?.ownerId === user?.uid;
    if (!canDeleteAnything(currentClass?.userRole, isOwner)) {
      toast.error('Wakil Komti dan Kepala Divisi tidak memiliki izin menghapus tugas.');
      return;
    }
    const taskToDelete = tasks?.find(t => t.id === taskId);

    // If this task has submissions with Google Drive URLs, move them to Trash in Drive
    if (taskToDelete?.submissions && taskToDelete.submissions.length > 0) {
      const subUrls = [];
      taskToDelete.submissions.forEach(s => {
        if (Array.isArray(s.files)) {
          s.files.forEach(f => f.url && !subUrls.includes(f.url) && subUrls.push(f.url));
        }
        if (s.fileUrl && !subUrls.includes(s.fileUrl)) {
          subUrls.push(s.fileUrl);
        }
      });
      if (subUrls.length > 0) {
        try {
          await moveFilesToDriveTrash(subUrls);
        } catch (trashErr) {
          console.warn('Gagal memindahkan berkas tugas ke folder Trash di Drive:', trashErr);
        }
      }
    }

    await dbService.tasks.delete(taskId);
    setTasks(prev => prev.filter(t => t.id !== taskId));

    // Refresh files since task submissions were deleted
    try {
      const freshFiles = await dbService.files.list(currentClass.id);
      setFiles(freshFiles);
    } catch {}

    try {
      await dbService.logs.create(currentClass.id, {
        actionType: 'task_delete',
        title: `Tugas dihapus`,
        details: `${user?.displayName || 'Komti'} menghapus tugas "${taskToDelete?.title || taskId}".`,
        actor: { name: user?.displayName, email: user?.email, role: currentClass?.userRole },
        targetName: taskToDelete?.title || '',
        color: 'rose'
      });
      handleRefreshLogs();
    } catch {}
  };

  const handleUploadFile = async (fileData) => {
    const created = await dbService.files.create(currentClass.id, fileData);
    setFiles(prev => [created, ...prev]);
    return created;
  };

  const handleDeleteFile = async (fileId, fileObj = null) => {
    const isOwner = currentClass?.ownerId === user?.uid;
    if (!canDeleteAnything(currentClass?.userRole, isOwner)) {
      toast.error('Wakil Komti dan Kepala Divisi tidak memiliki izin menghapus berkas.');
      return;
    }
    const targetFile = fileObj || files?.find(f => f.id === fileId);

    // Extract storageUrl or drive fileId
    const targetUrlOrId = targetFile?.driveFileId || targetFile?.storageUrl || (typeof fileId === 'object' ? (fileId?.driveFileId || fileId?.storageUrl) : null);

    // If file has a Google Drive link, move it to 'Trash' folder in Drive instead of permanent deletion
    if (targetUrlOrId) {
      try {
        const trashResult = await moveFileToDriveTrash(targetUrlOrId);
        console.log('Moved file to Drive Trash:', trashResult);
      } catch (trashErr) {
        console.warn('Gagal memindahkan file ke folder Trash di Drive:', trashErr);
      }
    }

    const idToDelete = typeof fileId === 'string' ? fileId : targetFile?.id;
    if (idToDelete) {
      await dbService.files.delete(idToDelete);
      setFiles(prev => prev ? prev.filter(f => f.id !== idToDelete) : []);

      // If deleted file was a task submission, refresh tasks so task cards reflect it immediately!
      if (targetFile?.isSubmission || (typeof idToDelete === 'string' && idToDelete.startsWith('sub_'))) {
        try {
          const freshTasks = await dbService.tasks.list(currentClass.id);
          setTasks(freshTasks);
        } catch (taskErr) {
          console.warn('Could not refresh tasks after submission file deletion:', taskErr);
        }
      }
    }

    try {
      await dbService.logs.create(currentClass.id, {
        actionType: 'file_delete',
        title: `Berkas dihapus`,
        details: `${user?.displayName || 'Komti'} menghapus berkas "${targetFile?.name || idToDelete}".`,
        actor: { name: user?.displayName, email: user?.email, role: currentClass?.userRole },
        targetName: targetFile?.name || '',
        color: 'rose'
      });
      handleRefreshLogs();
    } catch {}
  };

  const handleRefreshFiles = async () => {
    if (!currentClass?.id) return;
    try {
      const [freshFiles, freshTasks] = await Promise.all([
        dbService.files.list(currentClass.id),
        dbService.tasks.list(currentClass.id)
      ]);
      setFiles(freshFiles);
      setTasks(freshTasks);
      return freshFiles;
    } catch (err) {
      console.error('Error refreshing files:', err);
    }
  };

  const handleCreateAnnouncement = async (item) => {
    const created = await dbService.announcements.create(currentClass.id, item);
    setAnnouncements(prev => [created, ...prev]);

    try {
      await dbService.logs.create(currentClass.id, {
        actionType: 'announcement_create',
        title: `Pengumuman baru: ${item.title}`,
        details: `${item.author || user?.displayName || 'Komti'} memposting pengumuman: "${item.title}".`,
        actor: { name: item.author || user?.displayName, email: user?.email, role: currentClass?.userRole },
        targetName: item.title,
        color: 'amber'
      });
      handleRefreshLogs();
    } catch {}

    return created;
  };

  const handleDeleteAnnouncement = async (id) => {
    const isOwner = currentClass?.ownerId === user?.uid;
    if (!canDeleteAnything(currentClass?.userRole, isOwner)) {
      toast.error('Wakil Komti tidak memiliki izin menghapus pengumuman.');
      return;
    }
    const annToDelete = announcements?.find(a => a.id === id);
    await dbService.announcements.delete(id);
    setAnnouncements(prev => prev.filter(a => a.id !== id));

    try {
      await dbService.logs.create(currentClass.id, {
        actionType: 'announcement_delete',
        title: `Pengumuman dihapus`,
        details: `${user?.displayName || 'Komti'} menghapus pengumuman "${annToDelete?.title || id}".`,
        actor: { name: user?.displayName, email: user?.email, role: currentClass?.userRole },
        color: 'slate'
      });
      handleRefreshLogs();
    } catch {}
  };

  const handleCreateGroup = async (item) => {
    const created = await dbService.groups.create(currentClass.id, item);
    setGroups(prev => [created, ...prev]);
    return created;
  };

  const handleSendMessage = async (groupId, messageItem) => {
    return await dbService.groups.sendMessage(groupId, messageItem);
  };

  const handleAddGroupFile = async (classId, groupId, fileItem) => {
    const res = await dbService.groups.addFile(classId, groupId, fileItem);
    const freshFiles = await dbService.files.list(currentClass.id);
    setFiles(freshFiles);
    return res;
  };

  const handleDeleteGroup = async (groupId) => {
    await dbService.groups.delete(groupId);
    setGroups(prev => prev.filter(g => g.id !== groupId));
  };

  const handleUpdateMemberRole = async (classId, targetUserId, newRole) => {
    const targetMember = currentClass?.members?.find(m => m.userId === targetUserId);
    const updatedMembers = await dbService.classes.updateMemberRole(classId, targetUserId, newRole);
    setCurrentClass(prev => {
      if (!prev) return null;
      const isSelf = targetUserId === user?.uid;
      return {
        ...prev,
        members: updatedMembers,
        userRole: isSelf ? newRole : prev.userRole
      };
    });

    try {
      await dbService.logs.create(classId, {
        actionType: 'member_role',
        title: `Peran ${targetMember?.name || 'anggota'} diubah`,
        details: `${user?.displayName || 'Komti'} mengubah peran ${targetMember?.name || 'anggota'} (${targetMember?.email || ''}) menjadi "${newRole}".`,
        actor: { name: user?.displayName, email: user?.email, role: currentClass?.userRole },
        targetName: targetMember?.name || '',
        color: 'purple'
      });
      handleRefreshLogs();
    } catch {}

    await loadUserClasses();
  };

  const handleApproveMember = async (classId, targetUserId) => {
    const updatedMembers = await dbService.classes.approveMember(classId, targetUserId);
    setCurrentClass(prev => {
      if (!prev) return null;
      return {
        ...prev,
        members: updatedMembers,
        memberCount: updatedMembers.filter(m => (m.status || 'approved') === 'approved').length
      };
    });
    await loadUserClasses();
    handleRefreshLogs();
  };

  const handleDenyMember = async (classId, targetUserId) => {
    const updatedMembers = await dbService.classes.denyMember(classId, targetUserId);
    setCurrentClass(prev => {
      if (!prev) return null;
      return {
        ...prev,
        members: updatedMembers,
        memberCount: updatedMembers.filter(m => (m.status || 'approved') === 'approved').length
      };
    });
    await loadUserClasses();
    handleRefreshLogs();
  };

  const handleCancelJoinRequest = async (classId) => {
    if (!user?.uid) return;
    await dbService.classes.cancelJoinRequest(classId, user.uid);
    await loadUserClasses();
    toast.success('Permintaan bergabung telah dibatalkan.');
  };

  const handleRemoveMember = async (classId, targetUserId) => {
    const isSelf = targetUserId === user?.uid;
    const isOwner = currentClass?.ownerId === user?.uid;
    if (!isSelf && !canDeleteAnything(currentClass?.userRole, isOwner)) {
      toast.error('Wakil Komti dan Kepala Divisi tidak memiliki izin mengeluarkan anggota.');
      return;
    }
    const targetMember = currentClass?.members?.find(m => m.userId === targetUserId);
    const updatedMembers = await dbService.classes.removeMember(classId, targetUserId);

    try {
      await dbService.logs.create(classId, {
        actionType: isSelf ? 'member_leave' : 'member_kick',
        title: isSelf ? `${user?.displayName || 'Anggota'} keluar dari kelas` : `${targetMember?.name || 'Anggota'} dikeluarkan dari kelas`,
        details: isSelf 
          ? `Mahasiswa ${user?.displayName || user?.email} telah keluar dari ruang kelas.` 
          : `${user?.displayName || 'Komti'} mengeluarkan ${targetMember?.name || 'anggota'} (${targetMember?.email || ''}) dari ruang kelas.`,
        actor: { name: user?.displayName, email: user?.email, role: currentClass?.userRole },
        targetName: targetMember?.name || '',
        color: isSelf ? 'amber' : 'rose'
      });
      handleRefreshLogs();
    } catch {}

    if (isSelf) {
      setCurrentClass(null);
      await loadUserClasses();
      navigate('/lobby');
      toast.success('Anda telah keluar dari kelas.');
      return;
    }
    setCurrentClass(prev => {
      if (!prev) return null;
      return {
        ...prev,
        members: updatedMembers,
        memberCount: updatedMembers.length
      };
    });
    await loadUserClasses();
  };

  const handleUpdateClassSettings = async (classId, updates) => {
    const updatedClass = await dbService.classes.update(classId, updates);
    setCurrentClass(prev => {
      if (!prev) return null;
      return {
        ...prev,
        ...updatedClass,
        userRole: prev.userRole
      };
    });

    try {
      await dbService.logs.create(classId, {
        actionType: 'class_update',
        title: `Pengaturan ruang kelas diperbarui`,
        details: `${user?.displayName || 'Komti'} memperbarui informasi ruang kelas (${updates.name || currentClass?.name}).`,
        actor: { name: user?.displayName, email: user?.email, role: currentClass?.userRole },
        color: 'indigo'
      });
      handleRefreshLogs();
    } catch {}

    await loadUserClasses();
    return updatedClass;
  };

  const handleLogout = async () => {
    try {
      clearActivityEpoch();
      await authService.logout();
    } catch {}
    setUser(null);
    setCurrentClass(null);
    setClasses([]);
    setShowProfileModal(false);
    navigate('/login');
    toast.success('Berhasil keluar.');
  };

  // Loading Screen: Visible loading spinner and logo with manual bypass if connection lags
  if (authLoading) {
    return (
      <div className="min-h-screen w-full bg-[#FDFBF7] flex flex-col items-center justify-center font-sans select-none p-4">
        <div className="flex flex-col items-center gap-3">
          <img 
            src="/logo.png" 
            alt="Classy" 
            className="w-12 h-12 object-contain" 
            onError={(e) => { e.target.style.display = 'none'; }} 
          />
          <div className="w-5 h-5 border-2 border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
          <span className="text-xs text-slate-500 font-medium tracking-tight">Memuat Classy...</span>
          <button
            type="button"
            onClick={() => setAuthLoading(false)}
            className="mt-3 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-[11px] font-semibold text-slate-600 transition-colors cursor-pointer shadow-2xs"
          >
            Lanjut ke Halaman Login &rarr;
          </button>
        </div>
      </div>
    );
  }

  // System Maintenance Mode Guard (Non-superadmins are blocked from the application)
  if (maintenanceConfig.enabled && !isSuperAdmin(user)) {
    return (
      <>
        <Toaster position="top-right" />
        <Suspense fallback={null}>
          <MaintenanceScreen
            config={maintenanceConfig}
            onRefreshStatus={async () => {
              const cfg = await dbService.system.getMaintenanceConfig();
              if (cfg) setMaintenanceConfig(cfg);
            }}
            onSuperadminLogin={(u) => {
              setUser(u);
            }}
          />
        </Suspense>
      </>
    );
  }

  return (
    <>
      <Toaster 
        position="top-right" 
        gutter={8}
        containerStyle={{
          top: 20,
          right: 20,
          zIndex: 99999,
        }}
        toastOptions={{ 
          duration: 3500,
          className: 'classy-toast',
          style: {
            background: '#FFFFFF',
            color: '#0F172A',
            borderRadius: '14px',
            padding: '10px 16px',
            fontSize: '13px',
            fontWeight: '600',
            letterSpacing: '-0.01em',
            boxShadow: '0 10px 25px -4px rgba(15, 23, 42, 0.08), 0 4px 10px -2px rgba(15, 23, 42, 0.04)',
            maxWidth: '440px',
            border: '1px solid #E2E8F0',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#10B981',
              secondary: '#ECFDF5',
            },
            style: {
              border: '1px solid #D1FAE5',
              background: '#FFFFFF',
              color: '#065F46',
            },
          },
          error: {
            duration: 4000,
            iconTheme: {
              primary: '#EF4444',
              secondary: '#FEF2F2',
            },
            style: {
              border: '1px solid #FFE4E6',
              background: '#FFFFFF',
              color: '#9F1239',
            },
          },
          loading: {
            iconTheme: {
              primary: '#0F172A',
              secondary: '#E2E8F0',
            },
            style: {
              border: '1px solid #E2E8F0',
              background: '#FFFFFF',
              color: '#334155',
            },
          },
        }} 
      />

      {/* Global Superadmin Maintenance Alert Banner */}
      {isSuperAdmin(user) && maintenanceConfig.enabled && (
        <div className="sticky top-0 z-[99999] bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600 text-white px-4 py-2.5 shadow-md flex items-center justify-between gap-3 text-xs font-bold font-sans">
          <div className="flex items-center gap-2">
            <Wrench size={16} className="animate-bounce shrink-0" />
            <span className="truncate">
              ⚠️ MODE PEMELIHARAAN AKTIF: Pengguna biasa saat ini diblokir dari web.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleQuickDisableMaintenance}
              className="px-3 py-1 rounded-lg bg-white text-slate-900 font-extrabold hover:bg-slate-100 transition-colors cursor-pointer text-xs shadow-xs"
            >
              Matikan Pemeliharaan
            </button>
            <button
              onClick={() => setShowGlobalSuperadminModal(true)}
              className="px-3 py-1 rounded-lg bg-black/25 hover:bg-black/35 text-white font-semibold transition-colors cursor-pointer text-xs"
            >
              Kelola
            </button>
          </div>
        </div>
      )}

      {/* Global Superadmin Command Center Modal */}
      {showGlobalSuperadminModal && isSuperAdmin(user) && (
        <Suspense fallback={null}>
          <SuperadminDashboardModal
            isOpen={showGlobalSuperadminModal}
            onClose={() => setShowGlobalSuperadminModal(false)}
            currentUser={user}
            onRefreshParentClasses={loadUserClasses}
          />
        </Suspense>
      )}

      {/* Mandatory Change Temporary Password Modal */}
      {user && mustChangePassword && (
        <ChangeTemporaryPasswordModal
          user={user}
          onSuccess={() => setMustChangePassword(false)}
          onLogout={handleLogout}
        />
      )}

      <Routes>
        {/* Reset & Forgot Password - ALWAYS accessible regardless of auth state */}
        <Route 
          path="/reset-password" 
          element={
            <Auth 
              initialMode="update_password"
              onAuthSuccess={(u) => { 
                setUser(u); 
                resetActivityEpoch();
                setMustChangePassword(localStorage.getItem('classy_must_change_temp_password') === 'true');
                navigate('/lobby'); 
              }} 
            />
          } 
        />
        <Route 
          path="/forgot-password" 
          element={
            <Auth 
              initialMode="forgot"
              onAuthSuccess={(u) => { 
                setUser(u); 
                resetActivityEpoch();
                setMustChangePassword(localStorage.getItem('classy_must_change_temp_password') === 'true');
                navigate('/lobby'); 
              }} 
            />
          } 
        />

        {/* Not Logged In */}
        {!user ? (
          <>
            <Route 
              path="/login" 
              element={
                <Auth onAuthSuccess={(u) => { 
                  setUser(u); 
                  resetActivityEpoch();
                  setMustChangePassword(localStorage.getItem('classy_must_change_temp_password') === 'true');
                  navigate('/lobby'); 
                }} />
              } 
            />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </>
        ) : (
          <>
            {/* Redirect / and /login to /lobby */}
            <Route path="/" element={<Navigate to="/lobby" replace />} />
            <Route path="/login" element={<Navigate to="/lobby" replace />} />

            {/* Class Lobby */}
            <Route
              path="/lobby"
              element={
                <ClassLobby
                  currentUser={user}
                  classes={classes}
                  classesLoading={classesLoading}
                  onSelectClass={(cls) => {
                    setCurrentClass(cls);
                    navigate(`/class/${cls.id}/dashboard`);
                  }}
                  onRefreshClasses={loadUserClasses}
                  onCancelJoinRequest={handleCancelJoinRequest}
                  onOpenProfile={() => setShowProfileModal(true)}
                  onLogout={handleLogout}
                />
              }
            />

            {/* Class Workspace Redirect: /class/:classId -> /class/:classId/dashboard */}
            <Route 
              path="/class/:classId" 
              element={<ClassRedirect />} 
            />

            {/* Class Workspace with Tab in URL */}
            <Route
              path="/class/:classId/:tab"
              element={
                <ClassWorkspace
                  user={user}
                  classes={classes}
                  currentClass={currentClass}
                  setCurrentClass={setCurrentClass}
                  contentLoading={contentLoading}
                  schedules={schedules}
                  tasks={tasks}
                  files={files}
                  announcements={announcements}
                  groups={groups}
                  handleAddSchedule={handleAddSchedule}
                  handleUpdateSchedule={handleUpdateSchedule}
                  handleDeleteSchedule={handleDeleteSchedule}
                  handleCreateTask={handleCreateTask}
                  handleUpdateTask={handleUpdateTask}
                  handleSubmitAssignment={handleSubmitAssignment}
                  handleDeleteSubmission={handleDeleteSubmission}
                  handleDeleteTask={handleDeleteTask}
                  handleUploadFile={handleUploadFile}
                  handleDeleteFile={handleDeleteFile}
                  handleRefreshFiles={handleRefreshFiles}
                  handleCreateAnnouncement={handleCreateAnnouncement}
                  handleDeleteAnnouncement={handleDeleteAnnouncement}
                  handleCreateGroup={handleCreateGroup}
                  handleSendMessage={handleSendMessage}
                  handleAddGroupFile={handleAddGroupFile}
                  handleUpdateMemberRole={handleUpdateMemberRole}
                  handleRemoveMember={handleRemoveMember}
                  handleApproveMember={handleApproveMember}
                  handleDenyMember={handleDenyMember}
                  handleUpdateClassSettings={handleUpdateClassSettings}
                  classesLoading={classesLoading}
                  logs={logs}
                  onRefreshClasses={loadUserClasses}
                  handleAdminUpdateSubmission={handleAdminUpdateSubmission}
                  handleAdminMoveSubmission={handleAdminMoveSubmission}
                  handleRefreshSubmissionsData={handleRefreshSubmissionsData}
                  onOpenProfile={() => setShowProfileModal(true)}
                  onLogout={handleLogout}
                />
              }
            />

            {/* Fallback to /lobby */}
            <Route path="*" element={<Navigate to="/lobby" replace />} />
          </>
        )}
      </Routes>

      {/* Global User Profile Modal */}
      {showProfileModal && (
        <Suspense fallback={null}>
          <UserProfileModal
            currentUser={user}
            currentClass={currentClass}
            onClose={() => setShowProfileModal(false)}
            onLogout={handleLogout}
            onUpdateUser={(updated) => setUser(updated)}
            onOpenChangelog={() => setShowChangelogModal(true)}
          />
        </Suspense>
      )}

      {/* Global Changelog / What's New Modal (shows once per version when dismissed) */}
      {user && showChangelogModal && (
        <Suspense fallback={null}>
          <ChangelogModal
            isOpen={showChangelogModal}
            onClose={handleCloseChangelog}
          />
        </Suspense>
      )}
    </>
  );
}

// Helper: Redirect /class/:classId to /class/:classId/dashboard
function ClassRedirect() {
  const { classId } = useParams();
  return <Navigate to={`/class/${classId}/dashboard`} replace />;
}

// Component: Class Workspace synced with URL param :classId and :tab
function ClassWorkspace({
  user,
  classes,
  currentClass,
  setCurrentClass,
  contentLoading,
  schedules,
  tasks,
  files,
  announcements,
  groups,
  handleAddSchedule,
  handleUpdateSchedule,
  handleDeleteSchedule,
  handleCreateTask,
  handleUpdateTask,
  handleSubmitAssignment,
  handleDeleteSubmission,
  handleDeleteTask,
  handleUploadFile,
  handleDeleteFile,
  handleRefreshFiles,
  handleCreateAnnouncement,
  handleDeleteAnnouncement,
  handleCreateGroup,
  handleSendMessage,
  handleAddGroupFile,
  handleDeleteGroup,
  handleUpdateMemberRole,
  handleRemoveMember,
  handleApproveMember,
  handleDenyMember,
  handleUpdateClassSettings,
  handleAdminUpdateSubmission,
  handleAdminMoveSubmission,
  handleRefreshSubmissionsData,
  classesLoading,
  logs,
  onRefreshClasses,
  onRefreshLogs,
  onOpenProfile,
  onLogout
}) {
  const { classId, tab } = useParams();
  const navigate = useNavigate();
  const [isTogglingBlock, setIsTogglingBlock] = useState(false);
  const [showSuperadminModal, setShowSuperadminModal] = useState(false);

  const handleToggleClassBlock = async (targetClassId, newBlockedState) => {
    setIsTogglingBlock(true);
    const toastId = toast.loading(newBlockedState ? 'Memblokir kelas...' : 'Membuka blokir kelas...');
    try {
      const updated = await dbService.classes.updateBlockStatus(targetClassId, newBlockedState);
      setCurrentClass(prev => prev && prev.id === targetClassId ? { ...prev, isBlocked: updated.isBlocked, status: updated.status } : prev);
      if (typeof onRefreshClasses === 'function') {
        await onRefreshClasses();
      }
      toast.success(newBlockedState ? 'Kelas berhasil diblokir!' : 'Kelas berhasil diaktifkan / dibuka blokirnya!', { id: toastId });
    } catch (err) {
      toast.error(err.message || 'Gagal memperbarui status kelas', { id: toastId });
    } finally {
      setIsTogglingBlock(false);
    }
  };

  const validTabs = ['dashboard', 'schedule', 'tasks', 'files', 'announcements', 'forum', 'structure', 'contacts', 'members', 'logs', 'submissions'];
  const activeTab = validTabs.includes(tab) ? tab : 'dashboard';

  // Ensure currentClass matches the URL classId
  useEffect(() => {
    if (!classId) return;

    if (currentClass && currentClass.id === classId) {
      return;
    }

    // Try finding from loaded classes
    const matched = classes.find(c => c.id === classId);
    if (matched) {
      if (isSuperAdmin(user)) {
        matched.userRole = 'superadmin';
        matched.membershipStatus = 'approved';
        setCurrentClass(matched);
        return;
      }
      if (matched.membershipStatus && matched.membershipStatus !== 'approved') {
        toast.error('Keanggotaan Anda masih menunggu persetujuan Komti/Dosen.');
        navigate('/lobby');
        return;
      }
      setCurrentClass(matched);
    } else {
      // Direct load via URL: fetch from db
      dbService.classes.get(classId).then((cls) => {
        if (cls) {
          const isSuper = isSuperAdmin(user);
          const isOwner = cls.ownerId === user?.uid;
          const memberObj = (cls.members || []).find(m => m.userId === user?.uid || m.email?.toLowerCase() === user?.email?.toLowerCase());
          const isApproved = isSuper || isOwner || (memberObj && (memberObj.status || 'approved') === 'approved');

          if (!isApproved) {
            toast.error('Keanggotaan Anda masih menunggu persetujuan Komti/Dosen.');
            navigate('/lobby');
            return;
          }

          if (isSuper) {
            cls.userRole = 'superadmin';
            cls.membershipStatus = 'approved';
            setCurrentClass(cls);
          } else if (isOwner || memberObj) {
            cls.userRole = memberObj?.role || (isOwner ? 'komti' : 'student');
            cls.membershipStatus = 'approved';
            setCurrentClass(cls);
          } else {
            toast.error('Anda bukan anggota kelas ini.');
            navigate('/lobby');
          }
        } else {
          toast.error('Kelas tidak ditemukan.');
          navigate('/lobby');
        }
      }).catch(() => {
        navigate('/lobby');
      });
    }
  }, [classId, classes, classesLoading, currentClass, user]);

  // Scroll to top cleanly and ensure body scroll is unlocked when switching tabs
  useEffect(() => {
    unlockBodyScroll(true);
    window.scrollTo(0, 0);
  }, [activeTab]);

  // Realtime Presence Heartbeat (Who's Online)
  useEffect(() => {
    if (!currentClass?.id || !user) return;

    // Send immediate heartbeat
    dbService.presence.heartbeat(currentClass.id, user);

    const interval = setInterval(() => {
      dbService.presence.heartbeat(currentClass.id, user);
    }, 25000);

    const handleUnload = () => {
      dbService.presence.setOffline(currentClass.id, user.uid || user.id);
    };
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleUnload);
      dbService.presence.setOffline(currentClass.id, user.uid || user.id);
    };
  }, [currentClass?.id, user]);

  const isDataReady = schedules !== null && tasks !== null && files !== null && announcements !== null;

  if (!currentClass) {
    return (
      <div className="h-screen w-screen bg-[#FDFBF7] flex items-center justify-center font-sans select-none">
        <div className="w-20 h-20 flex items-center justify-center animate-classy-breathing">
          <img src="/logo.png" alt="Classy" className="w-full h-full object-contain" />
        </div>
      </div>
    );
  }

  // Non-superadmin blocked class screen
  if (!isSuperAdmin(user) && isClassBlocked(currentClass)) {
    return (
      <ClassBlockedScreen
        currentClass={currentClass}
        user={user}
        onBackToLobby={() => {
          setCurrentClass(null);
          navigate('/lobby');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#FDFBF7] text-[#1E293B] flex flex-col md:flex-row font-sans overflow-x-hidden">
      {/* Left Navigation Sidebar */}
      <ClassSidebar
        currentClass={currentClass}
        classes={classes}
        activeTab={activeTab}
        onSelectTab={(newTab) => navigate(`/class/${currentClass.id}/${newTab}`)}
        onSelectClass={(cls) => {
          setCurrentClass(cls);
          navigate(`/class/${cls.id}/dashboard`);
        }}
        onBackToLobby={() => {
          setCurrentClass(null);
          navigate('/lobby');
        }}
        currentUser={user}
        onOpenProfile={onOpenProfile}
        onLogout={onLogout}
      />

      {/* Main Workspace Content Column */}
      <div className="flex-1 min-w-0 min-h-screen flex flex-col bg-[#FDFBF7]">
        {/* Sticky Superadmin Block/Unblock Control Banner */}
        {isSuperAdmin(user) && (
          <div className={`w-full px-4 sm:px-6 py-2.5 border-b flex items-center justify-between gap-3 flex-wrap text-xs font-semibold z-30 transition-colors ${
            isClassBlocked(currentClass)
              ? 'bg-rose-50 dark:bg-rose-950/80 border-rose-200 dark:border-rose-900 text-rose-900 dark:text-rose-200'
              : 'bg-indigo-50 dark:bg-indigo-950/80 border-indigo-200 dark:border-indigo-900 text-indigo-900 dark:text-indigo-200'
          }`}>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-current text-[10px] font-extrabold uppercase tracking-wide">
                ⚡ Superadmin Control
              </span>
              <span className="text-xs">
                Status Kelas: <strong className={isClassBlocked(currentClass) ? 'text-rose-600 dark:text-rose-400 font-extrabold' : 'text-emerald-600 dark:text-emerald-400 font-extrabold'}>
                  {isClassBlocked(currentClass) ? '🔒 Terblokir (Pending Aktivasi)' : '✅ Aktif (Dapat Diakses Mahasiswa)'}
                </strong>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowSuperadminModal(true)}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                title="Buka Pusat Kendali Superadmin"
              >
                <ShieldCheck size={14} />
                <span>📊 Command Center</span>
              </button>

              <button
                type="button"
                onClick={() => handleToggleClassBlock(currentClass.id, !isClassBlocked(currentClass))}
                disabled={isTogglingBlock}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50 ${
                  isClassBlocked(currentClass)
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-rose-600 hover:bg-rose-700 text-white'
                }`}
              >
                {isClassBlocked(currentClass) ? (
                  <>
                    <ShieldCheck size={14} />
                    <span>{isTogglingBlock ? 'Memproses...' : '⚡ Buka Blokir / Setujui Kelas Ini'}</span>
                  </>
                ) : (
                  <>
                    <Lock size={14} />
                    <span>{isTogglingBlock ? 'Memproses...' : '🔒 Blokir Kelas Ini'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Sticky Top Workspace Header */}
        <ClassTopHeader
          currentClass={currentClass}
          activeTab={activeTab}
          currentUser={user}
          onOpenProfile={onOpenProfile}
        />

        <ErrorBoundary>
          <main className={`flex-1 min-w-0 w-full pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:pb-8 px-3.5 sm:px-8 py-4 sm:py-6 mx-auto ${activeTab === 'schedule' ? 'max-w-[1500px]' : 'max-w-6xl'}`}>
            {!isDataReady ? (
              activeTab === 'tasks' ? <TasksSkeleton /> :
              activeTab === 'schedule' ? <ScheduleSkeleton /> :
              <DashboardSkeleton />
            ) : (
              <>
                {activeTab === 'dashboard' && (
                  <ClassDashboard
                    currentClass={currentClass}
                    currentUser={user}
                    schedules={schedules}
                    tasks={tasks}
                    announcements={announcements}
                    onNavigateTab={(targetTab) => navigate(`/class/${currentClass.id}/${targetTab}`)}
                    onOpenTaskDetail={() => navigate(`/class/${currentClass.id}/tasks`)}
                    onOpenAnnouncementDetail={() => navigate(`/class/${currentClass.id}/announcements`)}
                  />
                )}

            {activeTab === 'schedule' && (
              <ClassSchedule
                currentClass={currentClass}
                currentUser={user}
                schedules={schedules}
                tasks={tasks}
                onAddSchedule={handleAddSchedule}
                onUpdateSchedule={handleUpdateSchedule}
                onDeleteSchedule={handleDeleteSchedule}
                onNavigateToTask={(taskId) => navigate(`/class/${currentClass.id}/tasks${taskId ? '?task=' + taskId : ''}`)}
              />
            )}

            {activeTab === 'tasks' && (
              <ClassTasks
                currentClass={currentClass}
                currentUser={user}
                tasks={tasks}
                schedules={schedules}
                onCreateTask={handleCreateTask}
                onUpdateTask={handleUpdateTask}
                onSubmitAssignment={handleSubmitAssignment}
                onDeleteSubmission={handleDeleteSubmission}
                onDeleteTask={handleDeleteTask}
              />
            )}

            {activeTab === 'files' && (
              <ClassFiles
                currentClass={currentClass}
                currentUser={user}
                files={files}
                schedules={schedules}
                tasks={tasks}
                onUploadFile={handleUploadFile}
                onDeleteFile={handleDeleteFile}
                onRefreshFiles={handleRefreshFiles}
              />
            )}

            {activeTab === 'announcements' && (
              <ClassAnnouncements
                currentClass={currentClass}
                currentUser={user}
                announcements={announcements}
                onCreateAnnouncement={handleCreateAnnouncement}
                onDeleteAnnouncement={handleDeleteAnnouncement}
              />
            )}

            {/* Forum & Panggung Suara kept mounted so audio stays active when navigating between class tabs */}
            <div className={activeTab === 'forum' ? 'contents' : 'hidden'}>
              <ClassForum
                currentClass={currentClass}
                currentUser={user}
                groups={groups}
                onCreateGroup={handleCreateGroup}
                onSendMessage={handleSendMessage}
                handleAddGroupFile={handleAddGroupFile}
                onDeleteGroup={handleDeleteGroup}
              />
            </div>

            {activeTab === 'structure' && (
              <Suspense fallback={<DashboardSkeleton />}>
                <ClassStructure
                  currentClass={currentClass}
                  currentUser={user}
                />
              </Suspense>
            )}

            {activeTab === 'contacts' && (
              <ClassContacts
                currentClass={currentClass}
                currentUser={user}
                schedules={schedules}
                onNavigateTab={(targetTab) => navigate(`/class/${currentClass.id}/${targetTab}`)}
              />
            )}

            {activeTab === 'members' && (
              <ClassMembers
                currentClass={currentClass}
                currentUser={user}
                onUpdateMemberRole={handleUpdateMemberRole}
                onRemoveMember={handleRemoveMember}
                onApproveMember={handleApproveMember}
                onDenyMember={handleDenyMember}
                onUpdateClassSettings={handleUpdateClassSettings}
                onNavigateTab={(targetTab) => navigate(`/class/${currentClass.id}/${targetTab}`)}
              />
            )}

            {activeTab === 'logs' && (
              <Suspense fallback={<DashboardSkeleton />}>
                <ClassActivityLog
                  currentClass={currentClass}
                  currentUser={user}
                  logs={logs || []}
                  loading={contentLoading}
                  onRefresh={onRefreshLogs}
                />
              </Suspense>
            )}

            {activeTab === 'submissions' && (
              <Suspense fallback={<TasksSkeleton />}>
                <ClassSubmissionsManager
                  currentClass={currentClass}
                  currentUser={user}
                  tasks={tasks || []}
                  files={files || []}
                  schedules={schedules || []}
                  onUpdateSubmission={handleAdminUpdateSubmission}
                  onMoveSubmission={handleAdminMoveSubmission}
                  onDeleteSubmission={handleDeleteSubmission}
                  onUpdateClassSettings={handleUpdateClassSettings}
                  onRefreshData={handleRefreshSubmissionsData}
                />
              </Suspense>
            )}
              </>
            )}
          </main>
        </ErrorBoundary>
      </div>

      {/* Superadmin Command Center Modal */}
      {showSuperadminModal && (
        <Suspense fallback={null}>
          <SuperadminDashboardModal
            currentUser={user}
            isOpen={showSuperadminModal}
            onClose={() => setShowSuperadminModal(false)}
            onSelectClass={(cls) => {
              setCurrentClass(cls);
              navigate(`/class/${cls.id}/dashboard`);
            }}
            onRefreshParentClasses={async () => {
              if (typeof onRefreshClasses === 'function') {
                await onRefreshClasses();
              }
            }}
          />
        </Suspense>
      )}
    </div>
  );
}

// Screen displayed when a non-superadmin attempts to access a blocked class
function ClassBlockedScreen({ currentClass, user, onBackToLobby }) {
  const [copiedEmail, setCopiedEmail] = useState(false);

  const handleCopyEmail = () => {
    navigator.clipboard.writeText('arya@exars.my.id');
    setCopiedEmail(true);
    toast.success('Email admin (arya@exars.my.id) disalin ke clipboard!');
    setTimeout(() => setCopiedEmail(false), 2500);
  };

  const mailtoHref = `mailto:arya@exars.my.id?subject=${encodeURIComponent(`Permintaan Buka Blokir Kelas: ${currentClass?.name || ''} (${currentClass?.classIdentifier || ''})`)}&body=${encodeURIComponent(`Halo Superadmin Arya,\n\nSaya ingin mengajukan pembukaan blokir / aktivasi kelas berikut di Classy:\n- Nama Kelas: ${currentClass?.name || '-'}\n- Kode/Rombel: ${currentClass?.classIdentifier || '-'}\n- Dosen: ${currentClass?.lecturer || '-'}\n- Pemohon: ${user?.displayName || '-'} (${user?.email || '-'})\n\nMohon bantuannya untuk memeriksa dan membuka blokir kelas ini agar kami dapat mengakses ruang kelas. Terima kasih.`)}`;

  return (
    <div className="min-h-screen w-screen bg-[#FDFBF7] dark:bg-[#0B0F19] text-[#1E293B] dark:text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 font-sans">
      <div className="max-w-md w-full bg-white dark:bg-[#151D2F] border border-rose-200 dark:border-rose-900/60 rounded-3xl p-6 sm:p-8 shadow-xl text-center space-y-6 relative overflow-hidden">
        {/* Top accent line */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-rose-500 via-red-500 to-amber-500" />

        {/* Lock Icon Badge */}
        <div className="w-16 h-16 rounded-3xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto shadow-sm">
          <Lock size={32} />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 text-xs font-bold border border-rose-200 dark:border-rose-800">
            <ShieldAlert size={13} />
            <span>Akses Kelas Dibatasi / Menunggu Aktivasi</span>
          </div>

          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {currentClass?.name || 'Ruang Kelas'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {currentClass?.classIdentifier} {currentClass?.lecturer ? `· ${currentClass.lecturer}` : ''}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/40 text-left space-y-2 text-xs text-rose-900 dark:text-rose-200">
          <p className="leading-relaxed">
            Ruang kelas ini berstatus terblokir atau memerlukan verifikasi dan persetujuan dari <strong>Superadmin</strong> sebelum dapat diakses oleh anggota kelas.
          </p>
          <p className="leading-relaxed text-[11px] text-rose-800 dark:text-rose-300">
            Silakan kirim email konfirmasi ke Superadmin untuk meminta pembukaan blokir kelas ini.
          </p>
        </div>

        {/* Admin Contact Box */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs flex items-center justify-between gap-2">
          <div className="text-left">
            <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block">Email Superadmin</span>
            <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-xs">arya@exars.my.id</span>
          </div>
          <button
            type="button"
            onClick={handleCopyEmail}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
            title="Salin Email"
          >
            {copiedEmail ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
          </button>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5 pt-2">
          <a
            href={mailtoHref}
            className="w-full py-3 px-4 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
          >
            <Mail size={16} />
            <span>Kirim Email ke arya@exars.my.id</span>
          </a>

          <button
            type="button"
            onClick={onBackToLobby}
            className="w-full py-2.5 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <ArrowLeft size={14} />
            <span>Kembali ke Class Lobby</span>
          </button>
        </div>
      </div>
    </div>
  );
}

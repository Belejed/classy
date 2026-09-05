import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';
import { authService, dbService } from './utils/db';

// Classy Components
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
import UserProfileModal from './components/UserProfileModal';
import ErrorBoundary from './components/ErrorBoundary';

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
  const [contentLoading, setContentLoading] = useState(false);

  // Modals
  const [showProfileModal, setShowProfileModal] = useState(false);

  const navigate = useNavigate();

  // Clean old cached keys from legacy app
  useEffect(() => {
    try {
      localStorage.removeItem('noted_files');
      localStorage.removeItem('app_theme');
    } catch {}
  }, []);

  // 1. Auth Listener & Minimum Splash Duration (2.5s ~ 2-3 seconds)
  const [minSplashDone, setMinSplashDone] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMinSplashDone(true);
    }, 2500); // 2.5 detik
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  // Intercept recovery tokens arriving on any path (e.g. /login#access_token=...&type=recovery)
  useEffect(() => {
    const hash = window.location.hash || '';
    const search = window.location.search || '';
    if (hash.includes('type=recovery') || search.includes('type=recovery') || hash.includes('reset')) {
      navigate('/reset-password' + hash, { replace: true });
    }
  }, []);

  // 2. Load Classes when user is authenticated
  const loadUserClasses = async () => {
    if (!user) return;
    setClassesLoading(true);
    try {
      const userClasses = await dbService.classes.list(user.uid, user.email);
      setClasses(userClasses);

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
  const loadClassContent = async (cls = currentClass) => {
    if (!cls?.id) return;
    setContentLoading(true);
    try {
      const [schData, taskData, fileData, annData, grpData] = await Promise.all([
        dbService.schedules.list(cls.id),
        dbService.tasks.list(cls.id),
        dbService.files.list(cls.id),
        dbService.announcements.list(cls.id),
        dbService.groups.list(cls.id)
      ]);

      setSchedules(schData || []);
      setTasks(taskData || []);
      setFiles(fileData || []);
      setAnnouncements(annData || []);
      setGroups(grpData || []);
    } catch (err) {
      console.error('Error loading class data:', err);
      setSchedules([]);
      setTasks([]);
      setFiles([]);
      setAnnouncements([]);
      setGroups([]);
    } finally {
      setContentLoading(false);
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
    }
  }, [currentClass?.id]);

  // Handlers for Data Mutations
  const handleAddSchedule = async (item) => {
    const created = await dbService.schedules.create(currentClass.id, item);
    setSchedules(prev => [...prev, created]);
    return created;
  };

  const handleUpdateSchedule = async (scheduleId, updates) => {
    const updated = await dbService.schedules.update(scheduleId, updates);
    setSchedules(prev => prev.map(s => s.id === scheduleId ? { ...s, ...updated } : s));
    return updated;
  };

  const handleDeleteSchedule = async (scheduleId) => {
    await dbService.schedules.delete(scheduleId);
    setSchedules(prev => prev.filter(s => s.id !== scheduleId));
  };

  const handleCreateTask = async (item) => {
    const created = await dbService.tasks.create(currentClass.id, item);
    setTasks(prev => [created, ...prev]);
    return created;
  };

  const handleSubmitAssignment = async (taskId, submissionData) => {
    const sub = await dbService.tasks.submit(taskId, submissionData);
    const refreshed = await dbService.tasks.list(currentClass.id);
    setTasks(refreshed);

    // Refresh files list so the submission immediately appears in Files tab
    try {
      const freshFiles = await dbService.files.list(currentClass.id);
      setFiles(freshFiles);
    } catch {}

    return sub;
  };

  const handleDeleteTask = async (taskId) => {
    await dbService.tasks.delete(taskId);
    setTasks(prev => prev.filter(t => t.id !== taskId));
  };

  const handleUploadFile = async (fileData) => {
    const created = await dbService.files.create(currentClass.id, fileData);
    setFiles(prev => [created, ...prev]);
    return created;
  };

  const handleDeleteFile = async (fileId) => {
    await dbService.files.delete(fileId);
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const handleCreateAnnouncement = async (item) => {
    const created = await dbService.announcements.create(currentClass.id, item);
    setAnnouncements(prev => [created, ...prev]);
    return created;
  };

  const handleDeleteAnnouncement = async (id) => {
    await dbService.announcements.delete(id);
    setAnnouncements(prev => prev.filter(a => a.id !== id));
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
    await loadUserClasses();
  };

  const handleRemoveMember = async (classId, targetUserId) => {
    const updatedMembers = await dbService.classes.removeMember(classId, targetUserId);
    if (targetUserId === user?.uid) {
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
    await loadUserClasses();
    return updatedClass;
  };

  const handleLogout = async () => {
    await authService.logout();
    setUser(null);
    setCurrentClass(null);
    setClasses([]);
    setShowProfileModal(false);
    navigate('/login');
    toast.success('Berhasil keluar.');
  };

  // Loading Screen (stays for ~2.5 seconds)
  if (authLoading || !minSplashDone) {
    return (
      <div className="h-screen w-screen bg-[#FDFBF7] flex flex-col items-center justify-center space-y-4 font-sans select-none">
        <div className="relative flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm flex items-center justify-center p-2 mb-3">
            <img src="/logo.png" alt="Classy" className="w-full h-full object-contain animate-pulse" />
          </div>
          <h2 className="font-bold text-lg text-[#0F172A] tracking-tight">Classy</h2>
          <p className="text-xs text-[#64748B] mt-0.5 font-medium">Memuat ruang akademik...</p>
          
          {/* Animated loading bar lasting 2.5s */}
          <div className="w-36 h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden mt-4">
            <div className="h-full bg-[#0F172A] rounded-full animate-classy-progress" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />

      <Routes>
        {/* Reset & Forgot Password - ALWAYS accessible regardless of auth state */}
        <Route 
          path="/reset-password" 
          element={
            <Auth 
              initialMode="update_password"
              onAuthSuccess={(u) => { 
                setUser(u); 
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
                  handleSubmitAssignment={handleSubmitAssignment}
                  handleDeleteTask={handleDeleteTask}
                  handleUploadFile={handleUploadFile}
                  handleDeleteFile={handleDeleteFile}
                  handleCreateAnnouncement={handleCreateAnnouncement}
                  handleDeleteAnnouncement={handleDeleteAnnouncement}
                  handleCreateGroup={handleCreateGroup}
                  handleSendMessage={handleSendMessage}
                  handleAddGroupFile={handleAddGroupFile}
                  handleDeleteGroup={handleDeleteGroup}
                  handleUpdateMemberRole={handleUpdateMemberRole}
                  handleRemoveMember={handleRemoveMember}
                  handleUpdateClassSettings={handleUpdateClassSettings}
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
        <UserProfileModal
          currentUser={user}
          currentClass={currentClass}
          onClose={() => setShowProfileModal(false)}
          onLogout={handleLogout}
          onUpdateUser={(updated) => setUser(updated)}
        />
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
  handleSubmitAssignment,
  handleDeleteTask,
  handleUploadFile,
  handleDeleteFile,
  handleCreateAnnouncement,
  handleDeleteAnnouncement,
  handleCreateGroup,
  handleSendMessage,
  handleAddGroupFile,
  handleDeleteGroup,
  handleUpdateMemberRole,
  handleRemoveMember,
  handleUpdateClassSettings,
  onOpenProfile,
  onLogout
}) {
  const { classId, tab } = useParams();
  const navigate = useNavigate();

  const validTabs = ['dashboard', 'schedule', 'tasks', 'files', 'announcements', 'forum', 'contacts', 'members'];
  const activeTab = validTabs.includes(tab) ? tab : 'dashboard';

  // Ensure currentClass matches the URL classId
  useEffect(() => {
    if (!classId) return;

    if (currentClass?.id === classId) return;

    const matched = classes.find(c => c.id === classId);
    if (matched) {
      setCurrentClass(matched);
    } else if (classes.length > 0) {
      // Direct load via URL: fetch from db
      dbService.classes.get(classId).then((cls) => {
        if (cls) {
          const isOwner = cls.ownerId === user?.uid;
          const memberObj = cls.members?.find(m => m.userId === user?.uid || m.email?.toLowerCase() === user?.email?.toLowerCase());
          if (isOwner || memberObj) {
            cls.userRole = memberObj?.role || (isOwner ? 'komti' : 'student');
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
  }, [classId, classes, currentClass, user]);

  const isDataReady = !contentLoading && schedules !== null && tasks !== null && files !== null && announcements !== null;

  if (!currentClass || !isDataReady) {
    return (
      <div className="h-screen w-screen bg-[#FDFBF7] flex flex-col items-center justify-center space-y-4 font-sans select-none">
        <div className="relative flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm flex items-center justify-center p-2 mb-3">
            <img src="/logo.png" alt="Classy" className="w-full h-full object-contain animate-pulse" />
          </div>
          <h2 className="font-bold text-lg text-[#0F172A] tracking-tight">Classy</h2>
          <p className="text-xs text-[#64748B] mt-0.5 font-medium">Memuat data kelas...</p>
          <div className="w-36 h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden mt-4">
            <div className="h-full bg-[#0F172A] rounded-full animate-classy-progress" />
          </div>
        </div>
      </div>
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
        <ErrorBoundary>
          <main className={`flex-1 min-w-0 w-full ${activeTab === 'schedule' ? 'max-w-[1500px] mx-auto px-3 sm:px-6 py-2 sm:py-3' : 'max-w-6xl mx-auto px-4 sm:px-8 py-6 sm:py-8'}`}>
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
                onAddSchedule={handleAddSchedule}
                onUpdateSchedule={handleUpdateSchedule}
                onDeleteSchedule={handleDeleteSchedule}
                onNavigateToTask={() => navigate(`/class/${currentClass.id}/tasks`)}
              />
            )}

            {activeTab === 'tasks' && (
              <ClassTasks
                currentClass={currentClass}
                currentUser={user}
                tasks={tasks}
                onCreateTask={handleCreateTask}
                onSubmitAssignment={handleSubmitAssignment}
                onDeleteTask={handleDeleteTask}
              />
            )}

            {activeTab === 'files' && (
              <ClassFiles
                currentClass={currentClass}
                currentUser={user}
                files={files}
                onUploadFile={handleUploadFile}
                onDeleteFile={handleDeleteFile}
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

            {activeTab === 'forum' && (
              <ClassForum
                currentClass={currentClass}
                currentUser={user}
                groups={groups}
                onCreateGroup={handleCreateGroup}
                onSendMessage={handleSendMessage}
                handleAddGroupFile={handleAddGroupFile}
                onDeleteGroup={handleDeleteGroup}
              />
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
                onUpdateClassSettings={handleUpdateClassSettings}
              />
            )}
          </main>
        </ErrorBoundary>
      </div>
    </div>
  );
}

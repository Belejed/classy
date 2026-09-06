import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  X, 
  User, 
  Phone, 
  Mail, 
  Bell, 
  Lock, 
  LogOut, 
  Check, 
  Edit2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { authService, dbService, DEFAULT_NOTIFICATION_PREFERENCES } from '../utils/db';
import ModalPortal from './ModalPortal';

export default function UserProfileModal({
  currentUser,
  currentClass,
  onClose,
  onLogout,
  onUpdateUser
}) {
  const [fullName, setFullName] = useState(currentUser?.displayName || '');
  const [phoneNumber, setPhoneNumber] = useState(currentUser?.phoneNumber || '+62 ');
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [prefs, setPrefs] = useState(currentUser?.notificationPreferences || DEFAULT_NOTIFICATION_PREFERENCES);
  const [isSaving, setIsSaving] = useState(false);

  const togglePref = (key) => {
    setPrefs(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const updated = await authService.updateProfile({
        fullName: fullName.trim(),
        phoneNumber: phoneNumber.trim(),
        notificationPreferences: prefs
      });
      if (currentClass?.id && currentUser?.uid) {
        dbService.classes.syncMemberPhone(currentClass.id, currentUser.uid, phoneNumber.trim()).catch(() => {});
      }
      toast.success('Pengaturan profil & notifikasi disimpan!');
      if (onUpdateUser) onUpdateUser(updated);
      setIsEditingContact(false);
    } catch (err) {
      toast.error('Gagal menyimpan profil: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const userInitial = currentUser?.displayName ? currentUser.displayName[0].toUpperCase() : 'U';

  const navigate = useNavigate();

  return (
    <ModalPortal onClose={onClose} maxWidth="max-w-md">
      <div className="bg-white border border-[#E2E8F0] rounded-3xl w-full p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-[#F1F5F9]">
          <h3 className="font-bold text-base text-[#0F172A]">Profil Pengguna</h3>
          <button 
            onClick={onClose} 
            className="min-w-[40px] min-h-[40px] flex items-center justify-center p-2 rounded-xl text-[#94A3B8] hover:text-[#0F172A] hover:bg-slate-100 transition-colors cursor-pointer"
            title="Tutup"
          >
            <X size={18} />
          </button>
        </div>

        {/* Profile Header Box */}
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0]">
          <div className="w-14 h-14 rounded-2xl bg-[#0F172A] text-white flex items-center justify-center font-bold text-xl shrink-0 shadow-2xs">
            {userInitial}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="font-bold text-base text-[#0F172A] truncate">
              {currentUser?.displayName || 'Student'}
            </h4>
            <p className="text-xs text-[#64748B] truncate">{currentUser?.email}</p>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E2E8F0] text-[#334155] inline-block mt-1">
              {currentClass?.userRole === 'coordinator' ? 'Class Coordinator' : 'Student'}
            </span>
          </div>
        </div>

        {/* Contact Information (WhatsApp Number) */}
        <div className="p-4 rounded-2xl border border-[#E2E8F0] space-y-2.5">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-xs uppercase tracking-wider text-[#475569]">
              Contact Information
            </h4>
            <button
              onClick={() => setIsEditingContact(!isEditingContact)}
              className="text-xs font-bold text-[#0F172A] hover:underline flex items-center gap-1"
            >
              <Edit2 size={12} />
              <span>{isEditingContact ? 'Cancel' : 'Edit'}</span>
            </button>
          </div>

          {isEditingContact ? (
            <div className="space-y-3 pt-1">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#334155] flex items-center gap-1.5">
                  <User size={13} className="text-[#64748B]" />
                  <span>Full Name</span>
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Masukkan nama lengkap"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs sm:text-sm text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#0F172A] focus:ring-2 focus:ring-[#0F172A]/10 shadow-2xs transition-all font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#334155] flex items-center gap-1.5">
                  <Phone size={13} className="text-[#64748B]" />
                  <span>WhatsApp Number</span>
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="e.g. +628123456789"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs sm:text-sm text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#0F172A] focus:ring-2 focus:ring-[#0F172A]/10 shadow-2xs transition-all font-mono font-medium"
                />
              </div>

              <button
                onClick={handleSaveProfile}
                disabled={isSaving}
                className="w-full py-2.5 rounded-xl bg-[#0F172A] text-white text-xs font-semibold hover:bg-[#1E293B] shadow-xs disabled:opacity-50 transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-1"
              >
                {isSaving ? 'Menyimpan...' : 'Save Contact'}
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-[#64748B]">WhatsApp:</span>
              <span className="font-mono font-bold text-[#0F172A]">{phoneNumber || 'Not set'}</span>
            </div>
          )}

          <p className="text-[10px] text-[#94A3B8]">
            Your phone number is only used for class notifications and is not publicly visible to other students.
          </p>
        </div>

        {/* WhatsApp Notification Settings */}
        <div className="p-4 rounded-2xl border border-[#E2E8F0] space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-xs uppercase tracking-wider text-[#475569]">
              Notifications
            </h4>
            <span className="text-[10px] text-[#64748B]">WhatsApp Alerts</span>
          </div>

          <div className="space-y-2 pt-1 text-xs">
            {/* Master Toggle */}
            <label className="flex items-center justify-between py-1 cursor-pointer font-bold text-[#0F172A] border-b border-[#F1F5F9]">
              <span>WhatsApp Notifications</span>
              <input
                type="checkbox"
                checked={prefs.whatsappEnabled}
                onChange={() => togglePref('whatsappEnabled')}
                className="w-4 h-4 rounded text-[#0F172A] focus:ring-0 cursor-pointer"
              />
            </label>

            {/* Sub Toggles */}
            <label className="flex items-center justify-between py-1 cursor-pointer text-[#475569]">
              <span>Assignment Updates</span>
              <input
                type="checkbox"
                checked={prefs.assignmentUpdates}
                onChange={() => togglePref('assignmentUpdates')}
                disabled={!prefs.whatsappEnabled}
                className="w-4 h-4 rounded text-[#0F172A] focus:ring-0 cursor-pointer disabled:opacity-30"
              />
            </label>

            <label className="flex items-center justify-between py-1 cursor-pointer text-[#475569]">
              <span>New Announcements</span>
              <input
                type="checkbox"
                checked={prefs.newAnnouncements}
                onChange={() => togglePref('newAnnouncements')}
                disabled={!prefs.whatsappEnabled}
                className="w-4 h-4 rounded text-[#0F172A] focus:ring-0 cursor-pointer disabled:opacity-30"
              />
            </label>

            <label className="flex items-center justify-between py-1 cursor-pointer text-[#475569]">
              <span>Upcoming Deadlines</span>
              <input
                type="checkbox"
                checked={prefs.upcomingDeadlines}
                onChange={() => togglePref('upcomingDeadlines')}
                disabled={!prefs.whatsappEnabled}
                className="w-4 h-4 rounded text-[#0F172A] focus:ring-0 cursor-pointer disabled:opacity-30"
              />
            </label>

            <label className="flex items-center justify-between py-1 cursor-pointer text-[#475569]">
              <span>Schedule Changes</span>
              <input
                type="checkbox"
                checked={prefs.scheduleChanges}
                onChange={() => togglePref('scheduleChanges')}
                disabled={!prefs.whatsappEnabled}
                className="w-4 h-4 rounded text-[#0F172A] focus:ring-0 cursor-pointer disabled:opacity-30"
              />
            </label>

            <label className="flex items-center justify-between py-1 cursor-pointer text-[#475569]">
              <span>Important Class Information</span>
              <input
                type="checkbox"
                checked={prefs.importantClassInfo}
                onChange={() => togglePref('importantClassInfo')}
                disabled={!prefs.whatsappEnabled}
                className="w-4 h-4 rounded text-[#0F172A] focus:ring-0 cursor-pointer disabled:opacity-30"
              />
            </label>
          </div>

          <button
            onClick={handleSaveProfile}
            disabled={isSaving}
            className="w-full py-2 rounded-xl bg-[#F1F5F9] hover:bg-[#E2E8F0] text-xs font-semibold text-[#0F172A] transition-colors mt-2"
          >
            {isSaving ? 'Saving...' : 'Update Notification Settings'}
          </button>
        </div>

        {/* Account Section: Password & Logout */}
        <div className="pt-2 border-t border-[#F1F5F9] flex items-center justify-between">
          <button
            onClick={() => {
              onClose();
              navigate('/reset-password');
            }}
            className="text-xs font-semibold text-[#64748B] hover:text-[#0F172A] cursor-pointer"
          >
            Change Password
          </button>

          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
          >
            <LogOut size={13} />
            <span>Log out</span>
          </button>
        </div>

      </div>
    </ModalPortal>
  );
}

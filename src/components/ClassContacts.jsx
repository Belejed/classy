import React, { useState, useMemo } from 'react';
import { 
  Phone, 
  MessageCircle, 
  Search, 
  Copy, 
  Check, 
  GraduationCap, 
  BookOpen, 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  ShieldCheck, 
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import { parseLecturerInfo } from '../utils/db';

const DAYS_LIST = ['Semua', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

export default function ClassContacts({
  currentClass,
  currentUser,
  schedules = [],
  onNavigateTab
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDayFilter, setSelectedDayFilter] = useState('Semua');
  const [copiedId, setCopiedId] = useState(null);

  // Identify class coordinator / komti
  const coordinatorMember = useMemo(() => {
    return (currentClass?.members || []).find(m => 
      m.role === 'komti' || 
      m.role === 'coordinator' || 
      m.userId === currentClass?.ownerId
    );
  }, [currentClass]);

  // Aggregate and clean lecturer data from schedules
  const courseLecturers = useMemo(() => {
    const list = [];
    const seen = new Set();

    (schedules || []).forEach(sch => {
      const parsed = parseLecturerInfo(sch.lecturerRaw || sch.lecturer, sch.description, sch.lecturerPhone);
      const lecturerName = (parsed.name || sch.lecturer || '').trim();
      const courseName = (sch.title || sch.course || '').trim();

      if (!lecturerName && !courseName) return;

      const key = `${lecturerName.toLowerCase()}_${courseName.toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        list.push({
          id: sch.id,
          lecturer: lecturerName || 'Dosen Pengampu',
          role: parsed.role || 'Pengajar Utama',
          phone: sch.lecturerPhone || parsed.phone || '',
          cleanPhone: sch.lecturerCleanPhone || parsed.cleanPhone || '',
          course: courseName || 'Mata Kuliah',
          day: sch.day || 'Senin',
          startTime: sch.startTime || '08:00',
          endTime: sch.endTime || '10:00',
          time: `${sch.startTime || '08:00'} - ${sch.endTime || '10:00'} WIB`,
          room: sch.room || '',
          sks: sch.sks || 3,
          description: sch.description || ''
        });
      }
    });

    return list;
  }, [schedules]);

  // Filtered lecturers
  const filteredLecturers = useMemo(() => {
    return courseLecturers.filter(lec => {
      // Day filter
      if (selectedDayFilter !== 'Semua' && lec.day !== selectedDayFilter) {
        return false;
      }

      // Query filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        lec.lecturer.toLowerCase().includes(q) ||
        lec.course.toLowerCase().includes(q) ||
        lec.day.toLowerCase().includes(q) ||
        (lec.room && lec.room.toLowerCase().includes(q)) ||
        (lec.phone && lec.phone.includes(q))
      );
    });
  }, [courseLecturers, searchQuery, selectedDayFilter]);

  const handleCopyPhone = (phone, id) => {
    if (!phone) return;
    navigator.clipboard.writeText(phone);
    setCopiedId(id);
    toast.success(`Nomor ${phone} disalin!`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getLecturerInitials = (name = '') => {
    return name
      .split(' ')
      .filter(w => !['dr.', 'dr', 'se', 'mm', 'mmtr', 's.pd', 'm.pd', 'ir.', 'm.kom', 'm.ti'].includes(w.toLowerCase().replace(/,/g, '')))
      .slice(0, 2)
      .map(w => w[0]?.toUpperCase())
      .join('') || 'D';
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* Header Banner */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                <GraduationCap size={20} />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight text-[#0F172A]">
                  Kontak Dosen & Pengajar
                </h2>
                <p className="text-xs text-[#64748B]">
                  Direktori lengkap dosen pengampu mata kuliah kelas <strong className="text-[#0F172A]">{currentClass?.name}</strong> untuk keperluan bimbingan, izin, dan koordinasi perkuliahan.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200">
              {courseLecturers.length} Dosen Terdata
            </span>
          </div>
        </div>

        {/* Komti / Class Coordinator Fast Access Card */}
        {coordinatorMember && (
          <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-[#0F172A] text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs">
                {coordinatorMember.name ? coordinatorMember.name[0].toUpperCase() : 'K'}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-xs text-[#0F172A] truncate">{coordinatorMember.name || 'Komti Kelas'}</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                    Koordinator / Komti
                  </span>
                </div>
                <p className="text-[11px] text-[#64748B] truncate">
                  Penanggung jawab kelas untuk koordinasi jadwal & perizinan umum
                </p>
              </div>
            </div>

            {coordinatorMember.phoneNumber ? (
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <button
                  type="button"
                  onClick={() => handleCopyPhone(coordinatorMember.phoneNumber, 'komti')}
                  className="px-2.5 py-1.5 rounded-xl border border-[#CBD5E1] bg-white text-[#475569] hover:text-[#0F172A] text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                  title="Salin nomor Komti"
                >
                  {copiedId === 'komti' ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                  <span>{copiedId === 'komti' ? 'Disalin' : 'Salin'}</span>
                </button>
                <a
                  href={`https://wa.me/${coordinatorMember.phoneNumber.replace(/\D/g, '')}?text=${encodeURIComponent(`Halo ${coordinatorMember.name}, saya mahasiswa kelas ${currentClass?.name || ''}...`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                >
                  <MessageCircle size={14} />
                  <span>Chat WA Komti</span>
                </a>
              </div>
            ) : (
              <span className="text-xs text-[#94A3B8] italic">Kontak Komti belum dicantumkan</span>
            )}
          </div>
        )}
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
            <input
              type="text"
              placeholder="Cari nama dosen, mata kuliah, nomor kontak, atau ruangan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] text-xs sm:text-sm text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#0F172A] focus:bg-white transition-all shadow-2xs"
            />
          </div>

          {/* Clear search if active */}
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-xs font-semibold text-[#64748B] hover:text-[#0F172A] px-2 py-1 cursor-pointer"
            >
              Reset Cari
            </button>
          )}
        </div>

        {/* Day Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 text-xs font-semibold">
          <span className="text-[11px] text-[#64748B] mr-1 shrink-0">Filter Hari:</span>
          {DAYS_LIST.map((day) => {
            const isActive = selectedDayFilter === day;
            return (
              <button
                key={day}
                onClick={() => setSelectedDayFilter(day)}
                className={`px-3 py-1 rounded-lg transition-all shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-[#0F172A] text-white shadow-2xs font-bold'
                    : 'bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0]'
                }`}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>

      {/* Lecturers Grid */}
      {filteredLecturers.length === 0 ? (
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-10 text-center space-y-3 shadow-2xs">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <GraduationCap size={24} />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-sm text-[#0F172A]">
              {searchQuery || selectedDayFilter !== 'Semua' 
                ? 'Tidak ada dosen pengajar yang sesuai filter' 
                : 'Belum ada data dosen pengajar'}
            </h3>
            <p className="text-xs text-[#64748B] max-w-sm mx-auto">
              {searchQuery || selectedDayFilter !== 'Semua'
                ? 'Coba ganti kata kunci pencarian atau pilih opsi "Semua" pada filter hari.'
                : 'Dosen pengajar dan nomor kontak akan otomatis terdata saat Anda memasukkan jadwal perkuliahan.'}
            </p>
          </div>
          {onNavigateTab && (
            <button
              onClick={() => onNavigateTab('schedule')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            >
              <Calendar size={13} />
              <span>Buka Jadwal Kuliah</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredLecturers.map((lec) => {
            const initials = getLecturerInitials(lec.lecturer);

            return (
              <div
                key={lec.id}
                className="bg-white border border-slate-200 hover:border-indigo-200 rounded-2xl p-5 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3.5">
                  {/* Top: Avatar, Lecturer Name & Role */}
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs">
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-bold text-[#0F172A] leading-snug">
                        {lec.lecturer}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-800 border border-indigo-200/80 uppercase tracking-wider">
                          {lec.role}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Course, Time slot, and Room Info */}
                  <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2 text-xs">
                    <div className="flex items-center gap-2 text-[#0F172A] font-semibold">
                      <BookOpen size={14} className="text-indigo-600 shrink-0" />
                      <span className="truncate">{lec.course}</span>
                    </div>

                    <div className="flex items-center justify-between text-[#64748B] text-[11px] pt-1 border-t border-[#E2E8F0]/60">
                      <span className="flex items-center gap-1.5">
                        <Clock size={12} className="shrink-0 text-slate-500" />
                        <span>{lec.day}, {lec.time}</span>
                      </span>
                      {lec.room && (
                        <span className="flex items-center gap-1 font-semibold text-[#334155]">
                          <MapPin size={11} className="shrink-0 text-slate-500" />
                          <span>Ruang {lec.room}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom Action Footer */}
                <div className="pt-3 border-t border-[#F1F5F9] flex items-center justify-between gap-2">
                  {lec.phone ? (
                    <>
                      <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-[#0F172A] min-w-0">
                        <Phone size={13} className="text-emerald-600 shrink-0" />
                        <span className="truncate">{lec.phone}</span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleCopyPhone(lec.phone, lec.id)}
                          title="Salin nomor WhatsApp"
                          className="px-2.5 py-1.5 rounded-xl border border-[#CBD5E1] bg-white text-[#475569] hover:text-[#0F172A] hover:bg-slate-50 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                        >
                          {copiedId === lec.id ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                          <span>{copiedId === lec.id ? 'Disalin' : 'Salin'}</span>
                        </button>

                        {lec.cleanPhone && (
                          <a
                            href={`https://wa.me/${lec.cleanPhone}?text=${encodeURIComponent(`Halo Bapak/Ibu ${lec.lecturer}, saya mahasiswa kelas ${currentClass?.name || ''} untuk perkuliahan ${lec.course}. Mohon izin bertanya terkait perkuliahan...`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                          >
                            <MessageCircle size={13} />
                            <span>Chat WA</span>
                          </a>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="w-full flex items-center justify-between text-xs text-[#94A3B8]">
                      <span className="italic">No. kontak belum tersedia</span>
                      {onNavigateTab && (
                        <button
                          type="button"
                          onClick={() => onNavigateTab('schedule')}
                          className="font-bold text-[#0F172A] hover:underline cursor-pointer flex items-center gap-0.5"
                        >
                          <span>Buka Jadwal</span>
                          <ChevronRight size={12} />
                        </button>
                      )}
                    </div>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://klnemjadmcuetdpulzkf.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_OhvNh6I3jjbj4vLvFNmEWQ_t0GwP5O1';
const RESEND_BATCH_URL = 'https://api.resend.com/emails/batch';
const DEFAULT_RESEND_KEY = process.env.RESEND_API_KEY || 're_49d3iMFv_QCsHWiJpaJ8GnGtcQ5y2c8NN';
const DEFAULT_FROM = process.env.RESEND_FROM_EMAIL || 'Classy Academic Hub <notifikasi@classy.exars.my.id>';
const DEFAULT_CC = process.env.RESEND_CC_EMAIL || 'exars.012@gmail.com';
const PORTAL_URL = 'https://classy.exars.my.id';

const DAYS_MAP = {
  0: 'Minggu',
  1: 'Senin',
  2: 'Selasa',
  3: 'Rabu',
  4: 'Kamis',
  5: 'Jumat',
  6: 'Sabtu'
};

const MONTHS_MAP = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

/**
 * Helper to get current Date & Time in Western Indonesian Time (WIB / UTC+7)
 */
function getWibDateTime() {
  const now = new Date();
  const utcMs = now.getTime() + (now.getTimezoneOffset() * 60000);
  const wibMs = utcMs + (7 * 3600000); // UTC+7
  const wibDate = new Date(wibMs);

  const y = wibDate.getFullYear();
  const m = String(wibDate.getMonth() + 1).padStart(2, '0');
  const d = String(wibDate.getDate()).padStart(2, '0');
  const dateStr = `${y}-${m}-${d}`;
  const dayName = DAYS_MAP[wibDate.getDay()];
  const displayDate = `${wibDate.getDate()} ${MONTHS_MAP[wibDate.getMonth()]} ${y}`;

  return { wibDate, dateStr, dayName, displayDate, hours: wibDate.getHours(), minutes: wibDate.getMinutes() };
}

/**
 * HTML Template for Daily Morning Digest (Sent at 06:00 WIB)
 * Contains:
 * 1. Today's Lecture Schedule
 * 2. Upcoming Task Deadlines
 * 3. Latest Class Announcement
 */
function buildDailyDigestHtml({ className, dayName, displayDate, todaySchedules = [], upcomingTasks = [], latestAnnouncement = null }) {
  // 1. Schedule Section HTML
  let schedulesHtml = '';
  if (todaySchedules.length > 0) {
    schedulesHtml = `
      <div style="margin-top: 10px;">
        ${todaySchedules.map((s) => `
          <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 12px 16px; margin-bottom: 8px;">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="width: 100%;">
              <tr>
                <td>
                  <div style="font-size: 14px; font-weight: 800; color: #0F172A;">${s.subject || 'Mata Kuliah'}</div>
                  <div style="font-size: 12px; color: #64748B; margin-top: 3px;">
                    Dosen: <strong>${s.lecturer || '-'}</strong> &middot; Ruang: <strong>${s.room || 'Online / Ruang Kelas'}</strong>
                  </div>
                </td>
                <td align="right" style="vertical-align: middle; white-space: nowrap;">
                  <span style="background-color: #EFF6FF; color: #1D4ED8; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 8px; border: 1px solid #DBEAFE;">
                    ${s.startTime || '00:00'} - ${s.endTime || 'Selesai'} WIB
                  </span>
                </td>
              </tr>
            </table>
          </div>
        `).join('')}
      </div>
    `;
  } else {
    schedulesHtml = `
      <div style="background-color: #F8FAFC; border: 1px dashed #CBD5E1; border-radius: 12px; padding: 14px 16px; text-align: center; color: #64748B; font-size: 13px; margin-top: 10px;">
        ☕ <strong>Tidak ada jadwal kuliah hari ini.</strong> Selamat beristirahat atau mencicil tugas!
      </div>
    `;
  }

  // 2. Task Deadlines Section HTML
  let tasksHtml = '';
  if (upcomingTasks.length > 0) {
    tasksHtml = `
      <div style="margin-top: 10px;">
        ${upcomingTasks.map(t => {
          const badgeBg = t.isToday ? '#FFF1F2' : (t.isTomorrow ? '#FFFBEB' : '#F1F5F9');
          const badgeColor = t.isToday ? '#E11D48' : (t.isTomorrow ? '#D97706' : '#475569');
          const badgeBorder = t.isToday ? '#FECDD3' : (t.isTomorrow ? '#FDE68A' : '#E2E8F0');
          const badgeText = t.isToday ? 'HARI INI' : (t.isTomorrow ? 'BESOK' : `${t.daysDiff} HARI LAGI`);

          return `
            <div style="background-color: #FFFFFF; border: 1px solid #E2E8F0; border-left: 4px solid ${badgeColor}; border-radius: 10px; padding: 12px 14px; margin-bottom: 8px;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="width: 100%;">
                <tr>
                  <td>
                    <div style="font-size: 13px; font-weight: 700; color: #0F172A;">${t.title}</div>
                    <div style="font-size: 11px; color: #64748B; margin-top: 2px;">
                      ${t.subject || 'Tugas'} &middot; Tenggat: <strong>${t.due_date} (${t.due_time || '23:59'} WIB)</strong>
                    </div>
                  </td>
                  <td align="right" style="vertical-align: middle; white-space: nowrap;">
                    <span style="background-color: ${badgeBg}; color: ${badgeColor}; border: 1px solid ${badgeBorder}; font-size: 10px; font-weight: 800; padding: 3px 8px; border-radius: 6px;">
                      ${badgeText}
                    </span>
                  </td>
                </tr>
              </table>
            </div>
          `;
        }).join('')}
      </div>
    `;
  } else {
    tasksHtml = `
      <div style="background-color: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 12px; padding: 12px 16px; text-align: center; color: #166534; font-size: 13px; margin-top: 10px;">
        ✨ <strong>Semua tugas aman!</strong> Tidak ada tenggat tugas mendesak dalam waktu dekat.
      </div>
    `;
  }

  // 3. Announcement Section HTML
  let announcementHtml = '';
  if (latestAnnouncement) {
    const annType = latestAnnouncement.color || 'general';
    const isImportant = annType === 'important';
    const annBorder = isImportant ? '#E11D48' : '#3B82F6';
    const annBadgeBg = isImportant ? '#FFF1F2' : '#EFF6FF';
    const annBadgeColor = isImportant ? '#E11D48' : '#1D4ED8';

    announcementHtml = `
      <div style="margin-top: 10px; background-color: #F8FAFC; border: 1px solid #E2E8F0; border-left: 4px solid ${annBorder}; border-radius: 12px; padding: 14px 16px;">
        <div style="margin-bottom: 6px;">
          <span style="background-color: ${annBadgeBg}; color: ${annBadgeColor}; font-size: 10px; font-weight: 800; padding: 2px 7px; border-radius: 6px; text-transform: uppercase;">
            ${isImportant ? 'PENTING' : 'PENGUMUMAN TERBARU'}
          </span>
          <span style="font-size: 11px; color: #94A3B8; margin-left: 6px;">Oleh ${latestAnnouncement.author || 'Komti'}</span>
        </div>
        <div style="font-size: 14px; font-weight: 800; color: #0F172A; margin-bottom: 6px;">${latestAnnouncement.title}</div>
        <div style="font-size: 13px; color: #475569; line-height: 1.5;">
          ${(latestAnnouncement.content || '').length > 250 
            ? (latestAnnouncement.content || '').substring(0, 250) + '...' 
            : (latestAnnouncement.content || '')}
        </div>
      </div>
    `;
  } else {
    announcementHtml = `
      <div style="background-color: #F8FAFC; border: 1px dashed #CBD5E1; border-radius: 12px; padding: 12px 16px; text-align: center; color: #64748B; font-size: 13px; margin-top: 10px;">
        Belum ada pengumuman baru dari pengurus kelas.
      </div>
    `;
  }

  return `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Classy Daily Briefing - ${dayName}, ${displayDate}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FDFBF7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #0F172A;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="width: 100%; background-color: #FDFBF7; padding: 32px 16px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background-color: #FFFFFF; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.05); border: 1px solid #E2E8F0;">
          
          <!-- Top Light Header (Matches Classy Web Navbar) -->
          <tr>
            <td style="background-color: #FFFFFF; border-bottom: 1px solid #E2E8F0; padding: 20px 26px;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="width: 100%;">
                <tr>
                  <td style="width: 44px; vertical-align: middle; padding-right: 12px;">
                    <img src="${PORTAL_URL}/classy-logo.png" alt="Classy Logo" width="40" height="40" style="width: 40px; height: 40px; border-radius: 10px; display: block; border: 1px solid #E2E8F0;" />
                  </td>
                  <td style="vertical-align: middle;">
                    <div style="font-size: 17px; font-weight: 800; color: #0F172A; letter-spacing: -0.4px; line-height: 1.2;">
                      Classy
                      <span style="font-size: 10px; font-weight: 700; color: #64748B; background-color: #F1F5F9; border: 1px solid #E2E8F0; padding: 2px 7px; border-radius: 8px; vertical-align: middle; margin-left: 6px; letter-spacing: 0.5px; text-transform: uppercase;">Portal Kelas</span>
                    </div>
                    <div style="font-size: 12px; color: #64748B; font-weight: 600; margin-top: 3px;">
                      ${className || 'Kelas Akademik'} &middot; Ringkasan Pagi
                    </div>
                  </td>
                  <td align="right" style="vertical-align: middle;">
                    <span style="background-color: #FFFBEB; color: #D97706; border: 1px solid #FDE68A; font-size: 10px; font-weight: 800; text-transform: uppercase; padding: 5px 11px; border-radius: 20px; letter-spacing: 0.5px; display: inline-block;">
                      ${dayName.toUpperCase()}, ${displayDate.split(' ')[0]} ${displayDate.split(' ')[1].substring(0, 3).toUpperCase()}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Email Content Body -->
          <tr>
            <td style="padding: 26px 26px 20px 26px;">
              
              <!-- Greeting & Subtitle -->
              <div style="margin-bottom: 22px;">
                <h2 style="margin: 0 0 6px 0; font-size: 18px; font-weight: 800; color: #0F172A; letter-spacing: -0.3px;">
                  Selamat Pagi Rekan Mahasiswa! ☀️
                </h2>
                <p style="margin: 0; font-size: 13px; color: #64748B; line-height: 1.5;">
                  Berikut adalah agenda perkuliahan hari ini, pengingat deadline tugas terdekat, dan pengumuman terbaru di ruang kelas Anda.
                </p>
              </div>

              <!-- SECTION 1: LECTURE SCHEDULE -->
              <div style="margin-bottom: 24px;">
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="width: 100%;">
                  <tr>
                    <td>
                      <span style="font-size: 13px; font-weight: 800; color: #0F172A; text-transform: uppercase; letter-spacing: 0.5px;">
                        📅 Jadwal Kuliah Hari Ini (${dayName})
                      </span>
                    </td>
                  </tr>
                </table>
                ${schedulesHtml}
              </div>

              <!-- SECTION 2: TASK DEADLINES -->
              <div style="margin-bottom: 24px;">
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="width: 100%;">
                  <tr>
                    <td>
                      <span style="font-size: 13px; font-weight: 800; color: #0F172A; text-transform: uppercase; letter-spacing: 0.5px;">
                        📝 Pengingat Deadline Tugas
                      </span>
                    </td>
                  </tr>
                </table>
                ${tasksHtml}
              </div>

              <!-- SECTION 3: LATEST ANNOUNCEMENT -->
              <div style="margin-bottom: 26px;">
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="width: 100%;">
                  <tr>
                    <td>
                      <span style="font-size: 13px; font-weight: 800; color: #0F172A; text-transform: uppercase; letter-spacing: 0.5px;">
                        📢 Pengumuman Terakhir Kelas
                      </span>
                    </td>
                  </tr>
                </table>
                ${announcementHtml}
              </div>

              <!-- Action CTA Button -->
              <div style="text-align: center; margin: 24px 0 10px 0;">
                <a href="${PORTAL_URL}" target="_blank" style="background-color: #0F172A; color: #FFFFFF; font-size: 13px; font-weight: 700; text-decoration: none; padding: 12px 28px; border-radius: 12px; display: inline-block; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15);">
                  Buka Portal Kelas Classy &rarr;
                </a>
              </div>

            </td>
          </tr>

          <!-- Footer (Warm Cream Accent) -->
          <tr>
            <td style="background-color: #FDFBF7; padding: 18px 26px; border-top: 1px solid #E2E8F0; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #64748B; line-height: 1.5;">
                Email ringkasan harian otomatis dikirimkan setiap pagi pukul 06:00 WIB oleh <strong>Classy</strong>.<br/>
                Salinan otomatis dikirimkan ke koordinator kelas: <code>${DEFAULT_CC}</code>
              </p>
              <p style="margin: 6px 0 0 0; font-size: 10px; color: #94A3B8;">
                &copy; ${new Date().getFullYear()} Classy Academic Hub &middot; <a href="${PORTAL_URL}" style="color: #0F172A; font-weight: 700; text-decoration: underline;">classy.exars.my.id</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

export default async function handler(req, res) {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { dateStr, dayName, displayDate } = getWibDateTime();
    const todayDate = new Date(dateStr);

    // 1. Fetch all classes (workspaces)
    const { data: workspaces, error: wsErr } = await supabase.from('workspaces').select('*');
    if (wsErr) throw wsErr;

    // 2. Fetch all schedules
    const { data: allSchedules, error: schErr } = await supabase.from('schedules').select('*');
    if (schErr) throw schErr;

    // 3. Fetch all active tasks
    const { data: allTasks, error: taskErr } = await supabase.from('tasks').select('*');
    if (taskErr) throw taskErr;

    // 4. Fetch announcements
    const { data: allAnnouncements, error: annErr } = await supabase
      .from('notes')
      .select('*')
      .eq('category', 'announcement')
      .order('updated_at', { ascending: false });
    if (annErr) console.warn('Could not load announcements for digest:', annErr);

    const digestResults = [];

    for (const ws of (workspaces || [])) {
      const classId = ws.id;
      const members = ws.members || [];
      const cleanRecipients = members
        .filter(m => (m.status || 'approved') === 'approved' && m.email)
        .map(m => m.email.trim().toLowerCase());

      if (cleanRecipients.length === 0) continue;

      // Check deduplication: 1 morning digest per class per day
      const dedupKey = `cron_morning_digest_${classId}_${dateStr}`;
      const { data: existingLog } = await supabase
        .from('notes')
        .select('id')
        .eq('category', 'cron_reminder_log')
        .eq('title', dedupKey)
        .maybeSingle();

      if (existingLog) {
        continue; // Already dispatched today
      }

      // Filter today's schedules for this class
      const todaySchedules = (allSchedules || [])
        .filter(s => s.workspace_id === classId && (s.day || '').trim().toLowerCase() === dayName.toLowerCase())
        .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

      // Filter upcoming tasks for this class (due today or within next 7 days)
      const upcomingTasks = (allTasks || [])
        .filter(t => t.workspace_id === classId && t.due_date)
        .map(t => {
          const taskDate = new Date(t.due_date);
          const timeDiff = taskDate.getTime() - todayDate.getTime();
          const daysDiff = Math.round(timeDiff / (1000 * 3600 * 24));
          return {
            ...t,
            daysDiff,
            isToday: daysDiff === 0,
            isTomorrow: daysDiff === 1
          };
        })
        .filter(t => t.daysDiff >= 0 && t.daysDiff <= 7)
        .sort((a, b) => a.daysDiff - b.daysDiff);

      // Latest announcement for this class
      const classAnnouncements = (allAnnouncements || []).filter(a => a.workspace_id === classId);
      let latestAnnouncement = null;
      if (classAnnouncements.length > 0) {
        const top = classAnnouncements[0];
        let meta = {};
        try {
          meta = typeof top.attachments === 'object' && top.attachments ? top.attachments : JSON.parse(top.attachments || '{}');
        } catch {}

        latestAnnouncement = {
          title: top.title,
          content: top.content,
          color: top.color,
          author: meta.author || 'Komti',
          date: top.updated_at
        };
      }

      // If class has no schedule today, no tasks, and no announcement, skip to conserve quota
      if (todaySchedules.length === 0 && upcomingTasks.length === 0 && !latestAnnouncement) {
        continue;
      }

      // Build Morning Digest HTML
      const digestSubject = `[Classy Pagi] Agenda Kuliah & Info Tugas - ${dayName}, ${displayDate}`;
      const digestHtml = buildDailyDigestHtml({
        className: ws.name,
        dayName,
        displayDate,
        todaySchedules,
        upcomingTasks,
        latestAnnouncement
      });

      // Prepare 1-on-1 batch items for all members
      const batchItems = cleanRecipients.map(studentEmail => ({
        from: DEFAULT_FROM,
        to: [studentEmail],
        reply_to: DEFAULT_CC,
        subject: digestSubject,
        html: digestHtml
      }));

      // Always include coordinator copy
      if (!cleanRecipients.includes(DEFAULT_CC.toLowerCase())) {
        batchItems.push({
          from: DEFAULT_FROM,
          to: [DEFAULT_CC],
          reply_to: DEFAULT_CC,
          subject: `[SALINAN KOORDINATOR] ${digestSubject}`,
          html: digestHtml
        });
      }

      try {
        const batchRes = await fetch(RESEND_BATCH_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${DEFAULT_RESEND_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(batchItems)
        });

        if (batchRes.ok) {
          await supabase.from('notes').insert({
            id: 'cron_' + Math.random().toString(36).substr(2, 9),
            workspace_id: classId,
            title: dedupKey,
            subject: 'Morning Digest 06:00 WIB',
            category: 'cron_reminder_log',
            content: JSON.stringify({
              classId,
              date: dateStr,
              day: dayName,
              schedulesCount: todaySchedules.length,
              tasksCount: upcomingTasks.length,
              hasAnnouncement: !!latestAnnouncement,
              recipientsCount: batchItems.length,
              sentAt: new Date().toISOString()
            }),
            color: 'amber',
            pinned: false,
            favorite: false,
            updated_at: new Date().toISOString()
          });

          digestResults.push({
            class: ws.name,
            recipientsCount: batchItems.length,
            schedulesCount: todaySchedules.length,
            tasksCount: upcomingTasks.length
          });
        } else {
          const errData = await batchRes.json().catch(() => ({}));
          console.error('Failed to dispatch morning digest:', errData);
        }
      } catch (err) {
        console.error(`Error sending digest for class ${ws.name}:`, err);
      }
    }

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      wib: `${dateStr} (${dayName})`,
      digestResults
    });

  } catch (err) {
    console.error('Cron job error:', err);
    return res.status(500).json({ error: err.message });
  }
}

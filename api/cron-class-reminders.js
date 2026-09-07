import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://klnemjadmcuetdpulzkf.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_OhvNh6I3jjbj4vLvFNmEWQ_t0GwP5O1';
const RESEND_API_URL = 'https://api.resend.com/emails';
const RESEND_BATCH_URL = 'https://api.resend.com/emails/batch';
const DEFAULT_RESEND_KEY = process.env.RESEND_API_KEY || 're_49d3iMFv_QCsHWiJpaJ8GnGtcQ5y2c8NN';

/**
 * HTML template for Lecture Reminders (1-on-1 individual email)
 */
function buildLectureReminderHtml({ subject, reminderLabel, startTime, endTime, metaRows = [] }) {
  return `
    <!DOCTYPE html>
    <html lang="id">
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #F1F5F9; margin: 0; padding: 24px;">
      <div style="max-width: 560px; margin: 0 auto; background: #FFF; border-radius: 16px; overflow: hidden; border: 1px solid #E2E8F0; box-shadow: 0 4px 16px rgba(0,0,0,0.04);">
        <div style="background: #0F172A; padding: 24px; color: #FFF;">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="width: 100%;">
            <tr>
              <td style="width: 48px; vertical-align: middle; padding-right: 14px;">
                <img src="https://classy.exars.my.id/classy-logo.png" alt="Classy Logo" width="44" height="44" style="width: 44px; height: 44px; border-radius: 12px; display: block; background: #FFF; padding: 2px;" />
              </td>
              <td style="vertical-align: middle;">
                <span style="font-size: 10px; font-weight: bold; background: #E11D48; color: #FFF; padding: 3px 8px; border-radius: 10px; text-transform: uppercase;">PENGINGAT KULIAH (${reminderLabel})</span>
                <h2 style="margin: 6px 0 0 0; font-size: 18px; font-weight: 700; color: #FFFFFF;">${subject}</h2>
              </td>
            </tr>
          </table>
          <p style="margin: 10px 0 0 0; font-size: 13px; color: #94A3B8;">Perkuliahan akan dimulai dalam <strong>${reminderLabel}</strong> (${startTime} WIB). Harap segera bersiap!</p>
        </div>
        <div style="padding: 24px;">
          <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
            ${metaRows.map(([k, v]) => `
              <tr style="border-bottom: 1px solid #F1F5F9;">
                <td style="padding: 10px 0; color: #64748B; font-weight: bold; width: 35%;">${k}</td>
                <td style="padding: 10px 0; color: #0F172A; font-weight: 600;">${v}</td>
              </tr>
            `).join('')}
          </table>
          <div style="text-align: center; margin-top: 24px;">
            <a href="https://classy.exars.my.id" style="background: #0F172A; color: #FFF; padding: 12px 24px; border-radius: 10px; text-decoration: none; font-weight: bold; font-size: 13px; display: inline-block;">
              Buka Portal Kelas →
            </a>
          </div>
        </div>
        <div style="background-color: #F8FAFC; padding: 14px 24px; border-top: 1px solid #E2E8F0; text-align: center;">
          <p style="margin: 0; font-size: 11px; color: #64748B;">
            Email ini dikirimkan secara otomatis oleh sistem <strong>Classy Academic Hub</strong>.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * HTML template for Task Deadline Reminders (1-on-1 individual email)
 */
function buildTaskDeadlineHtml({ course, title, deadlineLabel, dueDate, dueTime, instructions, metaRows = [] }) {
  return `
    <!DOCTYPE html>
    <html lang="id">
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #F1F5F9; margin: 0; padding: 24px;">
      <div style="max-width: 560px; margin: 0 auto; background: #FFF; border-radius: 16px; overflow: hidden; border: 1px solid #E2E8F0; box-shadow: 0 4px 16px rgba(0,0,0,0.04);">
        <div style="background: #0F172A; padding: 24px; color: #FFF;">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="width: 100%;">
            <tr>
              <td style="width: 48px; vertical-align: middle; padding-right: 14px;">
                <img src="https://classy.exars.my.id/classy-logo.png" alt="Classy Logo" width="44" height="44" style="width: 44px; height: 44px; border-radius: 12px; display: block; background: #FFF; padding: 2px;" />
              </td>
              <td style="vertical-align: middle;">
                <span style="font-size: 10px; font-weight: bold; background: #E11D48; color: #FFF; padding: 3px 8px; border-radius: 10px; text-transform: uppercase;">DEADLINE TUGAS: ${deadlineLabel}</span>
                <h2 style="margin: 6px 0 0 0; font-size: 18px; font-weight: 700; color: #FFFFFF;">${title}</h2>
              </td>
            </tr>
          </table>
          <p style="margin: 10px 0 0 0; font-size: 13px; color: #FCA5A5;">Mata Kuliah: <strong>${course}</strong> · Tenggat: <strong>${dueDate} (${dueTime} WIB)</strong></p>
        </div>
        <div style="padding: 24px;">
          <p style="margin: 0 0 16px 0; font-size: 13px; color: #334155; line-height: 1.6;">
            Halo! Ini adalah pengingat bahwa batas pengumpulan tugas kuliah di bawah ini segera berakhir. Mohon segera selesaikan dan submit tugas Anda tepat waktu sebelum portal ditutup.
          </p>
          <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
            ${metaRows.map(([k, v]) => `
              <tr style="border-bottom: 1px solid #F1F5F9;">
                <td style="padding: 10px 0; color: #64748B; font-weight: bold; width: 35%;">${k}</td>
                <td style="padding: 10px 0; color: #0F172A; font-weight: 600;">${v}</td>
              </tr>
            `).join('')}
          </table>
          ${instructions ? `
            <div style="margin: 20px 0; padding: 14px 16px; background-color: #F8FAFC; border-left: 4px solid #E11D48; border-radius: 8px; font-size: 12px; color: #475569; line-height: 1.5;">
              <strong style="color: #0F172A; display: block; margin-bottom: 4px;">Instruksi Pengerjaan:</strong>
              ${instructions}
            </div>
          ` : ''}
          <div style="text-align: center; margin-top: 24px;">
            <a href="https://classy.exars.my.id" style="background: #E11D48; color: #FFF; padding: 12px 24px; border-radius: 10px; text-decoration: none; font-weight: bold; font-size: 13px; display: inline-block;">
              Buka & Kumpulkan Tugas Sekarang →
            </a>
          </div>
        </div>
        <div style="background-color: #F8FAFC; padding: 14px 24px; border-top: 1px solid #E2E8F0; text-align: center;">
          <p style="margin: 0; font-size: 11px; color: #64748B;">
            Email pengingat otomatis dari <strong>Classy Academic Hub</strong>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}
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
  const totalMinutes = wibDate.getHours() * 60 + wibDate.getMinutes();

  return { wibDate, dateStr, dayName, totalMinutes, hours: wibDate.getHours(), minutes: wibDate.getMinutes() };
}

function parseTimeToMinutes(timeStr) {
  if (!timeStr) return null;
  const clean = timeStr.trim().replace('.', ':');
  const parts = clean.split(':').map(Number);
  if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return null;
  return parts[0] * 60 + parts[1];
}

export default async function handler(req, res) {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { dateStr, dayName, totalMinutes } = getWibDateTime();

    // 1. Fetch all classes
    const { data: workspaces, error: wsErr } = await supabase.from('workspaces').select('*');
    if (wsErr) throw wsErr;

    // 2. Fetch all schedules
    const { data: schedules, error: schErr } = await supabase.from('schedules').select('*');
    if (schErr) throw schErr;

    const remindersSent = [];

    for (const sch of (schedules || [])) {
      // Check if schedule is for today
      const schDay = sch.day ? sch.day.trim() : '';
      if (!schDay || schDay.toLowerCase() !== dayName.toLowerCase()) {
        continue;
      }

      const startMinutes = parseTimeToMinutes(sch.startTime);
      if (startMinutes === null) continue;

      const diff = startMinutes - totalMinutes;

      // Determine reminder interval
      let reminderType = null;
      let reminderLabel = '';
      if (diff >= 105 && diff <= 125) {
        reminderType = 'reminder_2h';
        reminderLabel = '2 Jam Lagi';
      } else if (diff >= 45 && diff <= 65) {
        reminderType = 'reminder_1h';
        reminderLabel = '1 Jam Lagi';
      }

      if (!reminderType) continue;

      // Deduplication key per schedule per day per reminder type
      const dedupKey = `cron_rem_${sch.id}_${dateStr}_${reminderType}`;

      // Check if already sent today
      const { data: existingLog } = await supabase
        .from('notes')
        .select('id')
        .eq('category', 'cron_reminder_log')
        .eq('title', dedupKey)
        .maybeSingle();

      if (existingLog) {
        continue; // Already sent
      }

      // Find matching class
      const parentClass = (workspaces || []).find(w => w.id === sch.workspace_id);
      const members = parentClass?.members || [];
      const recipients = members
        .filter(m => (m.status || 'approved') === 'approved' && m.email)
        .map(m => m.email.trim().toLowerCase());

      const subject = `[Pengingat Kuliah - ${reminderLabel}] ${sch.subject} (${sch.startTime} WIB)`;
      const metaRows = [
        ['Mata Kuliah', sch.subject || 'Perkuliahan'],
        ['Dosen Pengajar', sch.lecturer || 'Dosen Pengajar'],
        ['Waktu Kuliah', `${sch.startTime} - ${sch.endTime || 'Selesai'} WIB (${reminderLabel})`],
        ['Ruang Kuliah', sch.room || 'Ruang Kelas / Online'],
        ['Kelas / Rombel', parentClass?.name || 'Classy']
      ];
      if (sch.notes) metaRows.push(['Catatan Khusus', sch.notes]);

      const htmlContent = buildLectureReminderHtml({
        subject: sch.subject,
        reminderLabel,
        startTime: sch.startTime,
        endTime: sch.endTime,
        metaRows
      });

      // 1-on-1 individual emails for each student
      const batchItems = recipients.map(studentEmail => ({
        from: DEFAULT_FROM,
        to: [studentEmail],
        reply_to: DEFAULT_CC,
        subject: subject,
        html: htmlContent
      }));

      // Copy to coordinator
      if (!recipients.includes(DEFAULT_CC.toLowerCase())) {
        batchItems.push({
          from: DEFAULT_FROM,
          to: [DEFAULT_CC],
          reply_to: DEFAULT_CC,
          subject: `[SALINAN KOORDINATOR] ${subject}`,
          html: htmlContent
        });
      }

      if (batchItems.length > 0) {
        try {
          const emailRes = await fetch(RESEND_BATCH_URL, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${DEFAULT_RESEND_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(batchItems)
          });

          if (emailRes.ok) {
            await supabase.from('notes').insert({
              id: 'cron_' + Math.random().toString(36).substr(2, 9),
              workspace_id: sch.workspace_id,
              title: dedupKey,
              subject: sch.subject,
              category: 'cron_reminder_log',
              content: JSON.stringify({
                scheduleId: sch.id,
                reminderType,
                date: dateStr,
                sentAt: new Date().toISOString(),
                recipientsCount: batchItems.length
              }),
              color: 'slate',
              pinned: false,
              favorite: false,
              updated_at: new Date().toISOString()
            });

            remindersSent.push({
              schedule: sch.subject,
              type: reminderType,
              time: sch.startTime,
              recipientsCount: batchItems.length
            });
          }
        } catch (err) {
          console.error(`Failed to send reminder for ${sch.subject}:`, err);
        }
      }
    }

    // =========================================================================
    // SECTION B: TASK DEADLINE REMINDERS (1-ON-1 INDIVIDUAL BATCH EMAILS)
    // =========================================================================
    const taskRemindersSent = [];
    const { data: allTasks, error: taskErr } = await supabase.from('tasks').select('*');
    if (!taskErr && Array.isArray(allTasks)) {
      const todayDate = new Date(dateStr);

      for (const task of allTasks) {
        if (!task.due_date) continue;

        // Calculate difference in days (0 = today, 1 = tomorrow)
        const taskDueDate = new Date(task.due_date);
        const timeDiff = taskDueDate.getTime() - todayDate.getTime();
        const daysDiff = Math.round(timeDiff / (1000 * 3600 * 24));

        let taskReminderLabel = null;
        let taskReminderType = null;

        if (daysDiff === 0) {
          taskReminderLabel = 'HARI INI';
          taskReminderType = 'task_deadline_today';
        } else if (daysDiff === 1) {
          taskReminderLabel = 'BESOK (H-1)';
          taskReminderType = 'task_deadline_1d';
        }

        if (!taskReminderType) continue;

        const taskDedupKey = `cron_task_rem_${task.id}_${dateStr}_${taskReminderType}`;
        const { data: existingTaskLog } = await supabase
          .from('notes')
          .select('id')
          .eq('category', 'cron_reminder_log')
          .eq('title', taskDedupKey)
          .maybeSingle();

        if (existingTaskLog) continue; // Already sent today

        const parentClass = (workspaces || []).find(w => w.id === task.workspace_id);
        const members = parentClass?.members || [];

        // Parse meta to find students who already submitted
        let meta = {};
        try {
          if (typeof task.description === 'string' && task.description.trim().startsWith('{')) {
            meta = JSON.parse(task.description);
          }
        } catch {}

        const submissions = Array.isArray(meta.submissions) ? meta.submissions : [];
        const submittedUserIds = new Set(submissions.map(s => s.userId).filter(Boolean));
        const submittedEmails = new Set(submissions.map(s => String(s.userEmail || '').trim().toLowerCase()).filter(Boolean));

        // Filter unsubmitted approved students
        const unsubmittedMembers = members.filter(m => {
          if ((m.status || 'approved') !== 'approved' || !m.email) return false;
          const email = m.email.trim().toLowerCase();
          if (submittedUserIds.has(m.id) || submittedUserIds.has(m.userId)) return false;
          if (submittedEmails.has(email)) return false;
          return true;
        });

        const targetEmails = unsubmittedMembers.map(m => m.email.trim().toLowerCase());
        if (targetEmails.length === 0) continue; // All members already submitted

        const taskSubject = `[PENGINGAT DEADLINE: ${taskReminderLabel}] ${task.subject || 'Tugas'} - ${task.title}`;
        const taskMetaRows = [
          ['Mata Kuliah', task.subject || 'Perkuliahan'],
          ['Judul Tugas', task.title],
          ['Batas Pengumpulan', `${task.due_date} pukul ${task.due_time || '23:59'} WIB (${taskReminderLabel})`],
          ['Dosen Pengajar', meta.lecturer || '-'],
          ['Ruang Kelas', parentClass?.name || 'Classy']
        ];

        const taskHtml = buildTaskDeadlineHtml({
          course: task.subject || 'Perkuliahan',
          title: task.title,
          deadlineLabel: taskReminderLabel,
          dueDate: task.due_date,
          dueTime: task.due_time || '23:59',
          instructions: meta.instructions || meta.text || '',
          metaRows: taskMetaRows
        });

        // 1-on-1 batch items for unsubmitted students
        const taskBatchItems = targetEmails.map(email => ({
          from: DEFAULT_FROM,
          to: [email],
          reply_to: DEFAULT_CC,
          subject: taskSubject,
          html: taskHtml
        }));

        // Copy to coordinator
        if (!targetEmails.includes(DEFAULT_CC.toLowerCase())) {
          taskBatchItems.push({
            from: DEFAULT_FROM,
            to: [DEFAULT_CC],
            reply_to: DEFAULT_CC,
            subject: `[SALINAN KOORDINATOR] ${taskSubject}`,
            html: taskHtml
          });
        }

        try {
          const taskBatchRes = await fetch(RESEND_BATCH_URL, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${DEFAULT_RESEND_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(taskBatchItems)
          });

          if (taskBatchRes.ok) {
            await supabase.from('notes').insert({
              id: 'cron_' + Math.random().toString(36).substr(2, 9),
              workspace_id: task.workspace_id,
              title: taskDedupKey,
              subject: task.title,
              category: 'cron_reminder_log',
              content: JSON.stringify({
                taskId: task.id,
                reminderType: taskReminderType,
                date: dateStr,
                sentAt: new Date().toISOString(),
                unsubmittedCount: targetEmails.length
              }),
              color: 'rose',
              pinned: false,
              favorite: false,
              updated_at: new Date().toISOString()
            });

            taskRemindersSent.push({
              task: task.title,
              type: taskReminderType,
              deadline: `${task.due_date} ${task.due_time || '23:59'}`,
              unsubmittedCount: targetEmails.length
            });
          }
        } catch (err) {
          console.error(`Failed to send task deadline reminder for ${task.title}:`, err);
        }
      }
    }

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      wib: `${dateStr} ${dayName}`,
      remindersSent,
      taskRemindersSent
    });

  } catch (err) {
    console.error('Cron job error:', err);
    return res.status(500).json({ error: err.message });
  }
}

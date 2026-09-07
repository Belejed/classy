import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://klnemjadmcuetdpulzkf.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_OhvNh6I3jjbj4vLvFNmEWQ_t0GwP5O1';
const RESEND_API_URL = 'https://api.resend.com/emails';
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
        .map(m => m.email);

      const toList = recipients.length > 0 ? recipients : [DEFAULT_CC];
      const subject = `[Pengingat Kuliah - ${reminderLabel}] ${sch.subject} (${sch.startTime} WIB)`;

      const metaRows = [
        ['Mata Kuliah', sch.subject || 'Perkuliahan'],
        ['Dosen Pengajar', sch.lecturer || 'Dosen Pengajar'],
        ['Waktu Kuliah', `${sch.startTime} - ${sch.endTime || 'Selesai'} WIB (${reminderLabel})`],
        ['Ruang Kuliah', sch.room || 'Ruang Kelas / Online'],
        ['Kelas / Rombel', parentClass?.name || 'Classy']
      ];

      if (sch.notes) {
        metaRows.push(['Catatan Khusus', sch.notes]);
      }

      // Send via send-email helper or direct Resend call
      const emailPayload = {
        from: DEFAULT_FROM,
        to: toList,
        cc: [DEFAULT_CC],
        subject: subject,
        html: `
          <!DOCTYPE html>
          <html>
          <body style="font-family: sans-serif; background: #F1F5F9; padding: 20px;">
            <div style="max-width: 560px; margin: 0 auto; background: #FFF; border-radius: 16px; overflow: hidden; border: 1px solid #E2E8F0;">
              <div style="background: #0F172A; padding: 20px; color: #FFF;">
                <span style="font-size: 10px; font-weight: bold; background: #E11D48; color: #FFF; padding: 3px 8px; border-radius: 10px;">PENGINGAT KULIAH</span>
                <h2 style="margin: 8px 0 0 0; font-size: 18px;">${sch.subject}</h2>
                <p style="margin: 4px 0 0 0; font-size: 12px; color: #94A3B8;">Kelas akan dimulai dalam <strong>${reminderLabel}</strong> (${sch.startTime} WIB)</p>
              </div>
              <div style="padding: 20px;">
                <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
                  ${metaRows.map(([k, v]) => `
                    <tr style="border-bottom: 1px solid #F1F5F9;">
                      <td style="padding: 8px 0; color: #64748B; font-weight: bold; width: 35%;">${k}</td>
                      <td style="padding: 8px 0; color: #0F172A; font-weight: 600;">${v}</td>
                    </tr>
                  `).join('')}
                </table>
                <div style="text-align: center; margin-top: 24px;">
                  <a href="${PORTAL_URL}" style="background: #0F172A; color: #FFF; padding: 10px 20px; border-radius: 10px; text-decoration: none; font-weight: bold; font-size: 13px; display: inline-block;">
                    Buka Portal Kelas →
                  </a>
                </div>
              </div>
            </div>
          </body>
          </html>
        `
      };

      try {
        const emailRes = await fetch(RESEND_API_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${DEFAULT_RESEND_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(emailPayload)
        });

        let sentOk = emailRes.ok;
        if (!emailRes.ok) {
          const errData = await emailRes.json().catch(() => ({}));
          if (errData.name === 'validation_error' && errData.message?.includes('testing email')) {
            const match = errData.message.match(/\(([^)]+@.+)\)/);
            const ownerEmail = match ? match[1] : 'blajed27@gmail.com';
            const fbRes = await fetch(RESEND_API_URL, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${DEFAULT_RESEND_KEY}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                ...emailPayload,
                to: [ownerEmail],
                cc: undefined,
                subject: `[UJI COBA CLASSY] ${emailPayload.subject}`
              })
            });
            sentOk = fbRes.ok;
          }
        }

        if (sentOk) {
          // Record deduplication log so it won't send again today
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
              recipientsCount: toList.length
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
            recipientsCount: toList.length
          });
        }
      } catch (err) {
        console.error(`Failed to send reminder for ${sch.subject}:`, err);
      }
    }

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      wib: `${dateStr} ${dayName}`,
      remindersSent
    });

  } catch (err) {
    console.error('Cron job error:', err);
    return res.status(500).json({ error: err.message });
  }
}

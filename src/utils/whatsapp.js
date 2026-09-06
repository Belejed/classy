/**
 * WhatsApp Gateway Dispatcher Utility
 * Supports Fonnte, Wablas, and Custom Webhooks for Class & Task Reminders
 */

export const sendWhatsAppMessage = async ({
  provider = 'fonnte',
  apiToken,
  targetPhone,
  message
}) => {
  if (!apiToken || !targetPhone || !message) {
    throw new Error('Token API, nomor WhatsApp tujuan, dan pesan wajib diisi.');
  }

  // Sanitize target phone (e.g. 0812... -> 62812...)
  let cleanPhone = targetPhone.replace(/[^0-9]/g, '');
  if (cleanPhone.startsWith('0')) {
    cleanPhone = '62' + cleanPhone.slice(1);
  }

  try {
    if (provider === 'fonnte') {
      const response = await fetch('https://api.fonnte.com/send', {
        method: 'POST',
        headers: {
          Authorization: apiToken
        },
        body: new URLSearchParams({
          target: cleanPhone,
          message: message,
          countryCode: '62'
        })
      });

      const result = await response.json();
      if (!result.status) {
        throw new Error(result.reason || result.message || 'Gagal mengirim pesan via Fonnte.');
      }
      return result;
    } 
    
    if (provider === 'wablas') {
      const response = await fetch('https://kudus.wablas.com/api/send-message', {
        method: 'POST',
        headers: {
          Authorization: apiToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          phone: cleanPhone,
          message: message
        })
      });

      const result = await response.json();
      if (!result.status) {
        throw new Error(result.message || 'Gagal mengirim pesan via Wablas.');
      }
      return result;
    }

    if (provider === 'custom_webhook') {
      const response = await fetch(apiToken, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          phone: cleanPhone,
          message: message,
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`Webhook error (${response.status}): ${response.statusText}`);
      }
      return { status: true, message: 'Sent to custom webhook' };
    }

    throw new Error(`Provider "${provider}" tidak didukung.`);
  } catch (error) {
    console.error('WhatsApp dispatch error:', error);
    throw error;
  }
};

/**
 * Format Class Schedule Reminder template
 */
export const formatClassReminderMessage = (schedule, minutesBefore = 15) => {
  return `🔔 *PENGINGAT KELAS KULIAH* 🎓
━━━━━━━━━━━━━━━━━━━━
📚 *Mata Kuliah:* ${schedule.subject} ${schedule.sks ? `(${schedule.sks} SKS)` : ''}
${schedule.code ? `🏷️ *Kode MK:* ${schedule.code}\n` : ''}👨‍🏫 *Dosen:* ${schedule.lecturer || 'Dosen Pengajar'}
⏰ *Waktu:* ${schedule.startTime} - ${schedule.endTime} WIB
📍 *Ruangan / Link:* ${schedule.room || 'Ruang Kelas'}
${schedule.notes ? `📝 *Catatan:* ${schedule.notes}\n` : ''}━━━━━━━━━━━━━━━━━━━━
_Kelas akan dimulai dalam ${minutesBefore} menit. Siapkan perlengkapan kuliahmu!_
_Powered by Noted by Blazed Academic Hub_`;
};

/**
 * Format Task / Assignment Deadline Reminder template
 */
export const formatTaskReminderMessage = (task) => {
  let cleanDesc = task.description;
  if (typeof cleanDesc === 'string' && cleanDesc.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(cleanDesc);
      cleanDesc = parsed.text || '';
    } catch {}
  }

  return `⚠️ *PENGINGAT DEADLINE TUGAS KULIAH* 📚
━━━━━━━━━━━━━━━━━━━━
📌 *Tugas:* ${task.title}
${task.subject || task.course ? `📖 *Mata Kuliah:* ${task.subject || task.course}\n` : ''}🚨 *Prioritas:* ${task.priority || 'Normal'}
📅 *Tenggat Waktu:* ${task.dueDate} ${task.dueTime ? `pukul ${task.dueTime} WIB` : ''}
${cleanDesc ? `📝 *Keterangan:* ${cleanDesc}\n` : ''}━━━━━━━━━━━━━━━━━━━━
_Jangan sampai terlewat! Segera selesaikan dan submit tugasmu tepat waktu._
_Classy Academic Hub_`;
};

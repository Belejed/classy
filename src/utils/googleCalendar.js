/**
 * Google Calendar & iCal (.ics) Utilities for College Schedules
 */

// Day mapping for recurring Google Calendar RRULE (Senin -> MO, etc.)
const DAY_TO_BYDAY = {
  'Senin': 'MO',
  'Selasa': 'TU',
  'Rabu': 'WE',
  'Kamis': 'TH',
  'Jumat': 'FR',
  'Sabtu': 'SA',
  'Minggu': 'SU',
  'Monday': 'MO',
  'Tuesday': 'TU',
  'Wednesday': 'WE',
  'Thursday': 'TH',
  'Friday': 'FR',
  'Saturday': 'SA',
  'Sunday': 'SU'
};

const DAY_TO_INDEX = {
  'Minggu': 0, 'Sunday': 0,
  'Senin': 1, 'Monday': 1,
  'Selasa': 2, 'Tuesday': 2,
  'Rabu': 3, 'Wednesday': 3,
  'Kamis': 4, 'Thursday': 4,
  'Jumat': 5, 'Friday': 5,
  'Sabtu': 6, 'Saturday': 6
};

/**
 * Get next occurrence date string for a given day name
 */
function getNextDateForDay(dayName, timeStr = '08:00') {
  const targetDay = DAY_TO_INDEX[dayName] ?? 1;
  const now = new Date();
  const currentDay = now.getDay();
  let distance = targetDay - currentDay;
  if (distance < 0) distance += 7;

  const targetDate = new Date(now);
  targetDate.setDate(now.getDate() + distance);

  const [hours, minutes] = timeStr.split(':').map(Number);
  targetDate.setHours(hours || 8, minutes || 0, 0, 0);
  return targetDate;
}

function formatIsoForGCal(date) {
  return date.toISOString().replace(/-|:|\.\d+/g, '');
}

/**
 * Generates direct 1-Click "Add to Google Calendar" link with weekly recurrence
 */
export const createGoogleCalendarUrl = (schedule) => {
  const title = encodeURIComponent(`[Kuliah] ${schedule.subject}${schedule.code ? ` (${schedule.code})` : ''}`);
  
  const startDateTime = getNextDateForDay(schedule.day, schedule.startTime || '08:00');
  const endDateTime = getNextDateForDay(schedule.day, schedule.endTime || '10:00');
  
  const dates = `${formatIsoForGCal(startDateTime)}/${formatIsoForGCal(endDateTime)}`;
  
  const details = encodeURIComponent(
    `Mata Kuliah: ${schedule.subject}\nDosen: ${schedule.lecturer || '-'}\nSKS: ${schedule.sks || '-'}\nRuangan: ${schedule.room || '-'}\n\nCatatan: ${schedule.notes || '-'}\n\n(Dibuat via Noted by Blazed Academic Hub)`
  );
  
  const location = encodeURIComponent(schedule.room || 'Kampus');
  const byDay = DAY_TO_BYDAY[schedule.day] || 'MO';
  const recur = encodeURIComponent(`RRULE:FREQ=WEEKLY;BYDAY=${byDay}`);

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}&location=${location}&recur=${recur}`;
};

/**
 * Export full workspace semester schedules to standard iCalendar (.ics) format
 */
export const exportSchedulesToIcs = (workspaceName = 'Jadwal Kuliah', schedules = []) => {
  if (!schedules.length) {
    throw new Error('Belum ada jadwal kuliah untuk diekspor.');
  }

  const nowStamp = formatIsoForGCal(new Date());
  
  let icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Noted by Blazed//Academic Hub//ID',
    `X-WR-CALNAME:${workspaceName} - Jadwal Kuliah`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH'
  ];

  schedules.forEach((sch) => {
    const startDt = getNextDateForDay(sch.day, sch.startTime || '08:00');
    const endDt = getNextDateForDay(sch.day, sch.endTime || '10:00');
    const byDay = DAY_TO_BYDAY[sch.day] || 'MO';
    const uid = `sch_${sch.id || Math.random().toString(36).substr(2, 9)}@noted.blazed`;

    icsContent.push(
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${nowStamp}`,
      `DTSTART:${formatIsoForGCal(startDt)}`,
      `DTEND:${formatIsoForGCal(endDt)}`,
      `RRULE:FREQ=WEEKLY;BYDAY=${byDay}`,
      `SUMMARY:[Kuliah] ${sch.subject}${sch.code ? ` (${sch.code})` : ''}`,
      `DESCRIPTION:Dosen: ${sch.lecturer || '-'} | SKS: ${sch.sks || '-'} | Ruang: ${sch.room || '-'}`,
      `LOCATION:${sch.room || 'Kampus'}`,
      'STATUS:CONFIRMED',
      'END:VEVENT'
    );
  });

  icsContent.push('END:VCALENDAR');

  const blob = new Blob([icsContent.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const downloadUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = `${workspaceName.replace(/\s+/g, '_')}_Jadwal_Kuliah.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(downloadUrl);
};

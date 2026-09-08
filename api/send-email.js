const RESEND_API_URL = 'https://api.resend.com/emails';
const RESEND_BATCH_URL = 'https://api.resend.com/emails/batch';
const DEFAULT_RESEND_KEY = process.env.RESEND_API_KEY || 're_49d3iMFv_QCsHWiJpaJ8GnGtcQ5y2c8NN';
const DEFAULT_FROM = process.env.RESEND_FROM_EMAIL || 'Classy Academic Hub <notifikasi@classy.exars.my.id>';
const DEFAULT_CC = process.env.RESEND_CC_EMAIL || 'exars.012@gmail.com';
const PORTAL_URL = 'https://classy.exars.my.id';

/**
 * Generate standard responsive HTML email template for Classy notifications
 */
function buildHtmlTemplate({ type, title, subtitle, contentHtml, metaRows = [], ctaLabel = 'Buka Portal Kelas', ctaUrl = PORTAL_URL, photoUrl = null }) {
  const badgeStyle = 
    type === 'important' || type === 'reminder_1h' || type === 'task_deadline' 
      ? { bg: '#E11D48', color: '#FFFFFF', border: '#BE123C' } :
    type === 'task_new' 
      ? { bg: '#0284C7', color: '#FFFFFF', border: '#0369A1' } :
    type === 'class_approval_request'
      ? { bg: '#6366F1', color: '#FFFFFF', border: '#4F46E5' } :
    type === 'reminder_2h' 
      ? { bg: '#D97706', color: '#FFFFFF', border: '#B45309' } :
      { bg: '#0F172A', color: '#FFFFFF', border: '#000000' };

  const badgeText = 
    type === 'class_approval_request' ? 'PERSETUJUAN KELAS BARU' :
    type === 'announcement' ? 'PENGUMUMAN KELAS' :
    type === 'important' ? 'PENGUMUMAN PENTING' :
    type === 'reminder_2h' ? 'PENGINGAT KELAS (2 JAM LAGI)' :
    type === 'reminder_1h' ? 'PENGINGAT KELAS (1 JAM LAGI)' :
    type === 'schedule_update' ? 'PERUBAHAN JADWAL KULIAH' :
    type === 'task_new' ? 'TUGAS KULIAH BARU' :
    type === 'task_deadline' ? 'PENGINGAT DEADLINE TUGAS' : 'NOTIFIKASI AKADEMIK';

  const metaHtml = metaRows.length > 0 ? `
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="width: 100%; margin: 20px 0; border-collapse: separate; border-spacing: 0; background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; overflow: hidden;">
      ${metaRows.map(([k, v], i) => `
        <tr style="border-bottom: ${i === metaRows.length - 1 ? 'none' : '1px solid #E2E8F0'};">
          <td style="padding: 11px 16px; font-size: 11px; font-weight: 700; color: #64748B; text-transform: uppercase; width: 35%; border-bottom: ${i === metaRows.length - 1 ? 'none' : '1px solid #E2E8F0'}; letter-spacing: 0.5px;">${k}</td>
          <td style="padding: 11px 16px; font-size: 13px; font-weight: 600; color: #0F172A; border-bottom: ${i === metaRows.length - 1 ? 'none' : '1px solid #E2E8F0'};">${v}</td>
        </tr>
      `).join('')}
    </table>
  ` : '';

  const isBase64 = photoUrl && photoUrl.startsWith('data:');
  const photoHtml = photoUrl ? (
    !isBase64 ? `
      <div style="margin: 22px 0; text-align: center;">
        <a href="${photoUrl}" target="_blank" style="text-decoration: none;">
          <img src="${photoUrl}" alt="Foto Pengumuman" style="max-width: 100%; height: auto; border-radius: 14px; border: 1px solid #E2E8F0; box-shadow: 0 4px 16px rgba(0,0,0,0.06); display: block; margin: 0 auto;" />
        </a>
        <p style="font-size: 11px; color: #94A3B8; margin-top: 8px;">Klik gambar untuk memperbesar</p>
      </div>
    ` : `
      <div style="margin: 22px 0; text-align: center;">
        <img src="cid:announcement-photo" alt="Foto Pengumuman" style="max-width: 100%; height: auto; border-radius: 14px; border: 1px solid #E2E8F0; box-shadow: 0 4px 16px rgba(0,0,0,0.06); display: block; margin: 0 auto;" />
        <p style="font-size: 11px; color: #94A3B8; margin-top: 8px;">Foto lampiran pengumuman</p>
      </div>
    `
  ) : '';

  return `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FDFBF7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #0F172A;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="width: 100%; background-color: #FDFBF7; padding: 24px 12px;">
    <tr>
      <td align="center">
        <!-- Main Card Container (Classy Light Theme) -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="max-width: 580px; width: 100%; background-color: #FFFFFF; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.05); border: 1px solid #E2E8F0;">
          
          <!-- Top Light Header (Clean mobile-proof header) -->
          <tr>
            <td style="background-color: #FFFFFF; border-bottom: 1px solid #E2E8F0; padding: 20px 22px;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="width: 100%;">
                <tr>
                  <td style="width: 44px; vertical-align: top; padding-right: 12px;">
                    <img src="${PORTAL_URL}/classy-logo.png" alt="Classy Logo" width="40" height="40" style="width: 40px; height: 40px; border-radius: 10px; display: block; border: 1px solid #E2E8F0;" />
                  </td>
                  <td style="vertical-align: top;">
                    <div style="line-height: 1.3;">
                      <span style="font-size: 18px; font-weight: 800; color: #0F172A; letter-spacing: -0.4px; vertical-align: middle;">Classy</span>
                      <span style="display: inline-block; font-size: 9px; font-weight: 800; color: #475569; background-color: #F1F5F9; border: 1px solid #CBD5E1; padding: 2px 7px; border-radius: 6px; vertical-align: middle; margin-left: 6px; letter-spacing: 0.5px; text-transform: uppercase;">PORTAL KELAS</span>
                    </div>
                    <div style="font-size: 12px; color: #64748B; font-weight: 600; margin-top: 4px;">
                      ${subtitle || 'Notifikasi Akademik'}
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Badge Bar (High-contrast, dark-mode proof) -->
              <div style="margin-top: 14px; padding-top: 12px; border-top: 1px solid #F1F5F9;">
                <span style="display: inline-block; background-color: ${badgeStyle.bg}; color: ${badgeStyle.color}; border: 1px solid ${badgeStyle.border}; font-size: 10px; font-weight: 800; text-transform: uppercase; padding: 4px 10px; border-radius: 20px; letter-spacing: 0.5px;">
                  ${badgeText}
                </span>
              </div>
            </td>
          </tr>

          <!-- Email Content Body -->
          <tr>
            <td style="padding: 28px 28px 24px 28px;">
              <h2 style="margin: 0 0 14px 0; font-size: 19px; font-weight: 800; color: #0F172A; letter-spacing: -0.3px; line-height: 1.35;">${title}</h2>
              
              <div style="font-size: 14px; line-height: 1.65; color: #334155; margin-bottom: 20px;">
                ${contentHtml}
              </div>

              ${photoHtml}
              ${metaHtml}

              <!-- Action CTA Button (Web Primary Button Style) -->
              <div style="text-align: center; margin: 28px 0 12px 0;">
                <a href="${ctaUrl}" target="_blank" style="background-color: #0F172A; color: #FFFFFF; font-size: 13px; font-weight: 700; text-decoration: none; padding: 12px 26px; border-radius: 12px; display: inline-block; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15);">
                  ${ctaLabel} →
                </a>
              </div>
            </td>
          </tr>

          <!-- Footer (Warm Cream Accent) -->
          <tr>
            <td style="background-color: #FDFBF7; padding: 18px 28px; border-top: 1px solid #E2E8F0; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #64748B; line-height: 1.5;">
                Email otomatis dikirimkan oleh sistem portal perkuliahan <strong>Classy</strong>.<br/>
                Salinan terkirim ke koordinator: <code>${DEFAULT_CC}</code>
              </p>
              <p style="margin: 6px 0 0 0; font-size: 10px; color: #94A3B8;">
                © ${new Date().getFullYear()} Classy Academic Hub · <a href="${PORTAL_URL}" style="color: #0F172A; font-weight: 700; text-decoration: underline;">classy.exars.my.id</a>
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
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const apiKey = process.env.RESEND_API_KEY || DEFAULT_RESEND_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'RESEND_API_KEY is not configured' });
    }

    const {
      recipients = [],
      subject,
      type = 'announcement',
      title,
      subtitle,
      message,
      html: customHtml,
      metaRows = [],
      ctaLabel,
      ctaUrl,
      photoUrl,
      attachmentName,
      attachments = [],
      ccEmails = [],
      sendIndividual = true
    } = req.body || {};

    if (!subject) {
      return res.status(400).json({ error: 'subject is required' });
    }

    // Process recipient list (clean and deduplicate)
    const rawRecipients = Array.isArray(recipients) ? recipients : [recipients];
    const cleanRecipients = [...new Set(
      rawRecipients
        .filter(Boolean)
        .map(e => String(e).trim().toLowerCase())
        .filter(e => e.includes('@') && !e.includes('example.com'))
    )];

    // Target CC: always include DEFAULT_CC (exars.012@gmail.com)
    const combinedCc = [...new Set([
      DEFAULT_CC,
      ...(Array.isArray(ccEmails) ? ccEmails : [ccEmails]).filter(Boolean).map(e => String(e).trim().toLowerCase())
    ])];

    // Build standard HTML if not fully custom
    const finalHtml = customHtml || buildHtmlTemplate({
      type,
      title: title || subject,
      subtitle: subtitle || 'Classy Notification',
      contentHtml: (message || '').replace(/\n/g, '<br/>'),
      metaRows,
      ctaLabel,
      ctaUrl,
      photoUrl
    });

    // Process attachments: attach base64 image cleanly if provided
    const payloadAttachments = Array.isArray(attachments) ? [...attachments] : [];
    if (photoUrl && photoUrl.startsWith('data:')) {
      const parts = photoUrl.split(',');
      if (parts.length > 1) {
        const mimeMatch = photoUrl.match(/^data:([^;]+);/);
        const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
        let ext = 'jpg';
        if (mimeType.includes('png')) ext = 'png';
        else if (mimeType.includes('pdf')) ext = 'pdf';
        else if (mimeType.includes('webp')) ext = 'webp';

        payloadAttachments.push({
          filename: attachmentName || `lampiran_pengumuman.${ext}`,
          content: parts[1],
          content_id: 'announcement-photo'
        });
      }
    }

    // 1-ON-1 INDIVIDUAL BATCH DISPATCH (If sendIndividual is true)
    if (sendIndividual && cleanRecipients.length > 0) {
      const batchPayload = cleanRecipients.map(rEmail => {
        const item = {
          from: process.env.RESEND_FROM_EMAIL || DEFAULT_FROM,
          to: [rEmail],
          reply_to: DEFAULT_CC,
          subject: subject,
          html: finalHtml
        };
        if (payloadAttachments.length > 0) item.attachments = payloadAttachments;
        return item;
      });

      // Always include coordinator DEFAULT_CC copy if not already in recipients
      if (!cleanRecipients.includes(DEFAULT_CC)) {
        const coordItem = {
          from: process.env.RESEND_FROM_EMAIL || DEFAULT_FROM,
          to: [DEFAULT_CC],
          reply_to: DEFAULT_CC,
          subject: subject,
          html: finalHtml
        };
        if (payloadAttachments.length > 0) coordItem.attachments = payloadAttachments;
        batchPayload.push(coordItem);
      }

      const batchResponse = await fetch(RESEND_BATCH_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(batchPayload)
      });

      const batchData = await batchResponse.json();

      if (!batchResponse.ok) {
        console.error('Resend Batch API error:', batchData);
        return res.status(batchResponse.status).json({
          error: batchData.message || 'Gagal mengirim batch email via Resend',
          details: batchData
        });
      }

      return res.status(200).json({
        success: true,
        mode: 'individual_batch',
        data: batchData,
        count: batchPayload.length,
        recipients: cleanRecipients
      });
    }

    // BROADCAST VIA BCC (Default mass broadcast)
    // Best Practice for mass/broadcast email:
    // If multiple recipients (> 1), send with TO = DEFAULT_CC (coordinator/owner) and BCC = all members.
    // This prevents revealing students' private emails to each other, avoids spam filters triggered by bulk 'To',
    // and prevents Gmail greylisting/rate-limiting on custom domains.
    let targetTo = [];
    let targetBcc = [];
    let targetCc = [];

    if (cleanRecipients.length === 1) {
      // Single recipient (e.g. personal test or direct individual notice)
      targetTo = cleanRecipients;
      targetCc = combinedCc.filter(cc => !targetTo.includes(cc));
    } else if (cleanRecipients.length > 1) {
      // Broadcast to multiple members -> Use BCC!
      targetTo = [DEFAULT_CC];
      targetBcc = cleanRecipients.filter(r => r !== DEFAULT_CC);
      targetCc = combinedCc.filter(cc => cc !== DEFAULT_CC && !targetBcc.includes(cc));
    } else {
      // Fallback if no recipients provided
      targetTo = [DEFAULT_CC];
    }

    const payload = {
      from: process.env.RESEND_FROM_EMAIL || DEFAULT_FROM,
      to: targetTo,
      reply_to: DEFAULT_CC,
      subject: subject,
      html: finalHtml
    };

    if (targetCc.length > 0) {
      payload.cc = targetCc;
    }

    if (targetBcc.length > 0) {
      payload.bcc = targetBcc;
    }

    if (payloadAttachments.length > 0) {
      payload.attachments = payloadAttachments;
    }

    // Call Resend API
    const response = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      // If Resend free tier error (e.g. "can only send to your own email address")
      // Retry sending directly to the verified CC email so that the admin/organizer still receives it!
      if (data.name === 'validation_error' && data.message?.includes('testing email')) {
        const match = data.message.match(/\(([^)]+@.+)\)/);
        const ownerEmail = match ? match[1] : 'blajed27@gmail.com';
        const fallbackPayload = {
          from: process.env.RESEND_FROM_EMAIL || DEFAULT_FROM,
          to: [ownerEmail],
          subject: `[UJI COBA CLASSY] ${subject}`,
          html: `
            <div style="padding: 14px 18px; margin-bottom: 20px; background-color: #FEF3C7; border: 1px solid #F59E0B; border-radius: 12px; font-size: 13px; color: #92400E; line-height: 1.6;">
              <strong style="font-size: 14px;">⚠️ Info Mode Sandbox Resend:</strong><br/>
              Email notifikasi ini berhasil dikirim oleh sistem Classy, namun karena akun Resend Anda masih menggunakan domain bawaan pengujian (<code>onboarding@resend.dev</code>), Resend membatasi penerima hanya ke email pemilik akun terdaftar (<strong>${ownerEmail}</strong>).<br/><br/>
              <strong>Daftar Tujuan Asli:</strong> ${cleanRecipients.length > 0 ? cleanRecipients.join(', ') : '(Tidak ada penerima)'}<br/>
              <strong>Target CC Asli:</strong> <code>${DEFAULT_CC}</code><br/><br/>
              💡 <strong>Agar email terkirim langsung ke SEMUA siswa & CC ke ${DEFAULT_CC}:</strong><br/>
              Verifikasikan domain Anda di <a href="https://resend.com/domains" style="color: #B45309; font-weight: bold; text-decoration: underline;">resend.com/domains</a> (misalnya domain <code>exars.my.id</code>), lalu atur pengirim menggunakan domain tersebut.
            </div>
            ${finalHtml}
          `
        };

        const fallbackRes = await fetch(RESEND_API_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(fallbackPayload)
        });

        const fallbackData = await fallbackRes.json();
        return res.status(200).json({
          success: true,
          mode: 'resend_sandbox_delivered_to_owner',
          message: `Berhasil dikirim ke email pemilik akun (${ownerEmail}) melalui sandbox testing Resend.`,
          data: fallbackData,
          recipientsCount: cleanRecipients.length,
          sandboxNotice: `Untuk dapat mengirim ke semua email siswa dan CC ke ${DEFAULT_CC}, verifikasikan domain Anda di resend.com/domains.`
        });
      }

      console.error('Resend API error:', data);
      return res.status(response.status).json({
        error: data.message || 'Gagal mengirim email via Resend',
        details: data
      });
    }

    return res.status(200).json({
      success: true,
      id: data.id,
      to: targetTo,
      bcc: targetBcc,
      cc: targetCc,
      recipientsCount: cleanRecipients.length
    });

  } catch (err) {
    console.error('Error sending email:', err);
    return res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
}

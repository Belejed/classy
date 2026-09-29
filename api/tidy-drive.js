import { google } from 'googleapis';

const CLIENT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || 'classy@total-chess-481123-k8.iam.gserviceaccount.com';

const FALLBACK_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQC6+PiZymHbhTBo
2P4fXndHsb4arXUgr4O910q9CFYnErpdt7EjH8aAgJYtoBJYZdBanE+0h2i1sCtf
q9DHYwrqWy7e/n/VoPwxcMfgWMoBmz0vL0TZOrhWGqp3ENA6payyObloswwZo4yg
UZgaj8YPCFIl+dmXDZiYuhrJyuuFZF6aVEfs8jr4NymMoNN+0BHvXM+ZkIP58yBk
ZOwk4zh+YZxSymUTQwwIZgtSoQ1yC+Nul2hhpbRO5vhrcnJsTYzY455vNPefzEBs
Iy/YaxVycQztM06SqWIs/j5NVEwgfqRA2Ct9+uFlMtWfguMH17BVgHz/OTEbEMax
IakCZLe1AgMBAAECggEAHWVY8pb42TJgyM867vQjdURq8tdMJ7ookI+ZesxlfSmq
3uKrSS4s/5WX5u74i2jgf+p89pFmg1BCFX3WKo72D6AL57fkIdJ4bA6DAlD7W5LM
ZQ99t9iNVE5HeEZOsrXLB89fCOjDkYFe8fK6IwzxMvpYLgvQ67iRwgtafFj4vAUl
l7whq23PY1zTDBofBwsvzYcR56oQWu96FwUtzR56FCxE6BTkiQ+OVq2JRFzNt3PU
/xM++McrElqXxbTuoBJojLtaUVzo1/wW55/yLa+QPBeWhyeKg3xmXx+dRTvt8W/y
8Sun2yz8uV3psemp5Hmv4uxhbT25qTSvHB8l3tZTkQKBgQDoA18q8rBl6JkHWPBf
qkaRKgLQHaWYXAxo/VhBGLSkZJ7s8MtKZnimoQf4BrccsYJi0iTxdArgwisTQmsF
zmamv2B4iz7qUUQIRMLb27lMrGmPyj3qa3jTV465iZwvXxuI9LLnHOxvl4Vvbsso
iZGRh5M/4rHOeozQfsy6gcWacQKBgQDOTYWEPuL7y/os4yFdclsCQNE9E3TOI0mb
O/YFFfn9DL01/5uYhIbINTOg5hVhab63VDwAoGT77D9qvWs4PiWxPnQYwrTL/B2Z
MCgW4HIO2I5L6wx0t9EDOJf5w9HfXa3oDqUO8Ob+HvryNElYdmu6JzuZL2hTKANn
dw3BlrKrhQKBgEYzrvoZ0NIlHRiiCqmHpi6KXauHLPH6+C5Uaf3YceBEKepbucdb
ViplEzozHfjqpR8toswEZr43Qj1jnWp2V40g3xnaWEEiMcmmtKc9xsWybYZ6lV13
A2o/VgpB3yZeSsCX+gIAOHJTkKZ1CbfMWGWGdkGgYFivsCfuFhhg59+hAoGATBZl
VvgGqU160JFYneluTW9wfHEvlFOJczpzKz8Gu2C2bDMAxQij2TVd/Eq/ufTRRTZJ
BwYhGJTycsC3yb+KEUvyb6toGQ+8LuKG9qEDEByoprFjH60n5mM6EgE554LagAre
r5sD5tewQCIupvTOGJMdtQq6FGlekAtlxG97KC0CgYADUr9fVM4lQ4x8RWXIIUYX
GPsKN9HpKPKjwyLkP9K122Fnl1uXI2xHDOkmD7th+IpEdtawxkq956uzCp61ATby
dNuCHdHzCvq4t58uPLgOYorolS/yvhDknC2vvjefcEnREct5O73qNPWvGYuv7OXV
t2Gswk5dKzoUyhKl2/zZcw==
-----END PRIVATE KEY-----`;

const getPrivateKey = () => {
  let key = process.env.GOOGLE_PRIVATE_KEY || FALLBACK_PRIVATE_KEY;
  if (key.includes('\\n')) {
    key = key.replace(/\\n/g, '\n');
  }
  return key;
};

const ROOT_FOLDER_ID = (process.env.GOOGLE_DRIVE_FOLDER_ID && process.env.GOOGLE_DRIVE_FOLDER_ID !== '1ILurBWuTaUbPAMRZUGgJXu8nsZl8d0Lv')
  ? process.env.GOOGLE_DRIVE_FOLDER_ID
  : '1BK-P0mPQF9MSy0wsQ-tqNgVCXHXuCwmf';

const getDriveClient = () => {
  const privateKey = getPrivateKey();
  if (!privateKey) {
    throw new Error('GOOGLE_PRIVATE_KEY environment variable is not configured');
  }
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: CLIENT_EMAIL,
      private_key: privateKey
    },
    scopes: ['https://www.googleapis.com/auth/drive']
  });
  return google.drive({ version: 'v3', auth });
};

async function getOrCreateDriveFolder(drive, name, parentId) {
  const safeName = name.replace(/'/g, "\\'");
  const q = `mimeType = 'application/vnd.google-apps.folder' and name = '${safeName}' and '${parentId}' in parents and trashed = false`;
  const res = await drive.files.list({
    q,
    fields: 'files(id, name)',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true
  });

  if (res.data.files && res.data.files.length > 0) {
    return res.data.files[0].id;
  }

  const created = await drive.files.create({
    requestBody: {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId]
    },
    fields: 'id, name',
    supportsAllDrives: true
  });

  return created.data.id;
}

const TRASH_FOLDER_NAME = 'Trash';
let cachedTrashFolderId = null;

async function getOrCreateTrashFolder(drive) {
  if (cachedTrashFolderId) {
    try {
      const check = await drive.files.get({
        fileId: cachedTrashFolderId,
        fields: 'id, trashed',
        supportsAllDrives: true
      });
      if (check.data && !check.data.trashed) return cachedTrashFolderId;
    } catch {
      cachedTrashFolderId = null;
    }
  }

  const q = `mimeType = 'application/vnd.google-apps.folder' and name = '${TRASH_FOLDER_NAME}' and '${ROOT_FOLDER_ID}' in parents and trashed = false`;
  const res = await drive.files.list({
    q,
    fields: 'files(id, name)',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true
  });

  if (res.data.files && res.data.files.length > 0) {
    cachedTrashFolderId = res.data.files[0].id;
    return cachedTrashFolderId;
  }

  const created = await drive.files.create({
    requestBody: {
      name: TRASH_FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [ROOT_FOLDER_ID]
    },
    fields: 'id, name',
    supportsAllDrives: true
  });

  cachedTrashFolderId = created.data.id;
  return cachedTrashFolderId;
}

export default async function handler(req, res) {
  // CORS configuration
  const origin = req.headers.origin;
  const allowedOrigins = [
    'https://classy.exars.my.id',
    'https://noted-by-blazed.vercel.app'
  ];
  const isAllowed = !origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app') || origin.startsWith('http://localhost:');

  if (origin && !isAllowed) {
    return res.status(403).json({ error: 'Origin not allowed' });
  }

  if (isAllowed && origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  } else if (!origin) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const drive = getDriveClient();
    const { taskTitles = [] } = req.body || {};

    const targetFolderId = ROOT_FOLDER_ID;

    // 1. List all existing subfolders directly inside ROOT_FOLDER_ID
    const foldersRes = await drive.files.list({
      q: `'${targetFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: 'files(id, name)',
      pageSize: 100,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true
    });

    const folderMap = new Map();
    for (const f of (foldersRes.data.files || [])) {
      const lower = f.name.toLowerCase().trim();
      // Auto-trash legacy intermediate workspace folders if encountered
      if (lower === 'mlog a 2026' || lower === 'm.log a' || lower === 'm.log b') {
        try {
          await drive.files.update({
            fileId: f.id,
            requestBody: { trashed: true },
            supportsAllDrives: true
          });
        } catch {}
        continue;
      }
      folderMap.set(lower, f.id);
    }

    // 2. Ensure required task folders exist directly in Root
    const createdFolders = [];
    const normalizedTitles = new Set([
      'Materi Kuliah',
      'Pedoman',
      'Lampiran Pengumuman',
      ...(Array.isArray(taskTitles) ? taskTitles : []).map(t => {
        const clean = (t || '').trim();
        return clean.startsWith('Tugas:') ? clean : `Tugas: ${clean}`;
      })
    ]);

    for (const title of normalizedTitles) {
      if (!title || title === 'Tugas:') continue;
      const key = title.toLowerCase().trim();
      if (!folderMap.has(key)) {
        const newFolderId = await getOrCreateDriveFolder(drive, title, targetFolderId);
        folderMap.set(key, newFolderId);
        createdFolders.push({ name: title, id: newFolderId });
      }
    }

    // 3. Find any loose files directly in Root and move them into subfolders
    const looseFilesRes = await drive.files.list({
      q: `'${targetFolderId}' in parents and mimeType != 'application/vnd.google-apps.folder' and trashed = false`,
      fields: 'files(id, name)',
      pageSize: 100,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true
    });

    const looseFiles = looseFilesRes.data.files || [];
    let movedCount = 0;

    for (const file of looseFiles) {
      const lowerName = file.name.toLowerCase();
      const normalizedName = lowerName.replace(/[_\-\s]+/g, ' ');

      // Test files -> move to Trash
      if (lowerName.startsWith('test-') || lowerName.startsWith('test_') || lowerName === 'test.txt' || lowerName.includes('probe')) {
        await drive.files.update({
          fileId: file.id,
          requestBody: { trashed: true },
          supportsAllDrives: true
        });
        continue;
      }

      // 1. Match against known task folders with normalized spaces/underscores
      let destFolderId = null;
      for (const [folderKey, id] of folderMap.entries()) {
        const cleanKey = folderKey.replace(/^tugas:\s*/i, '').replace(/[_\-\s]+/g, ' ').trim();
        if (cleanKey && normalizedName.includes(cleanKey)) {
          destFolderId = id;
          break;
        }
      }

      // 2. Keyword fallback matching
      if (!destFolderId) {
        if (normalizedName.includes('pancasila') && normalizedName.includes('hukum')) {
          destFolderId = folderMap.get('tugas: pancasila sebagai dasar hukum');
        } else if (normalizedName.includes('innovation') || normalizedName.includes('innovation case')) {
          destFolderId = folderMap.get('tugas: laporan tertulis innovation case analysis') || folderMap.get('tugas: laporan tertulis  innovation case analysis');
        } else if (normalizedName.includes('quiz') || normalizedName.includes('quiz individu')) {
          destFolderId = folderMap.get('tugas: quiz individu');
        } else if (normalizedName.includes('individu') && normalizedName.includes('transportasi')) {
          destFolderId = folderMap.get('tugas: tugas individu transportasi');
        } else if (normalizedName.includes('andrew') || normalizedName.includes('mathews')) {
          destFolderId = folderMap.get('tugas: buat ppt pilih judul dan 3 bab buku andrew mathews');
        } else if (normalizedName.includes('etika') && normalizedName.includes('pancasila')) {
          destFolderId = folderMap.get('tugas: bikin ringkasan dipresentasiin materi etika pancasila');
        } else if (normalizedName.includes('video') && normalizedName.includes('pancasila')) {
          destFolderId = folderMap.get('tugas: tugas kelompok video pancasila');
        } else if (normalizedName.includes('hafalan') && normalizedName.includes('pancasila')) {
          destFolderId = folderMap.get('tugas: hafalan butir butir pancasila');
        } else if (normalizedName.includes('paper') && normalizedName.includes('pancasila')) {
          destFolderId = folderMap.get('tugas: tugas kelompok paper makalah ppt soal pancasila');
        } else if (normalizedName.includes('mtk') || normalizedName.includes('matematika') || normalizedName.includes('soal mtk')) {
          destFolderId = folderMap.get('tugas: tugas 2 soal mtk');
        } else if (normalizedName.includes('bisnis inovasi') || normalizedName.includes('individu bisnis inovasi')) {
          destFolderId = folderMap.get('tugas: tugas individu bisnis inovasi');
        } else if (normalizedName.includes('pancasila') && normalizedName.includes('offline')) {
          destFolderId = folderMap.get('tugas: tugas pancasila offline');
        } else if (normalizedName.includes('quiz') && normalizedName.includes('akuntansi')) {
          destFolderId = folderMap.get('tugas: quiz pengantar akuntansi');
        } else if (normalizedName.includes('value mapping') || normalizedName.includes('bussiness value')) {
          destFolderId = folderMap.get('tugas: bussiness value mapping');
        } else if (normalizedName.includes('benchmarking')) {
          destFolderId = folderMap.get('tugas: analisis benchmarking perusahaan');
        } else if (normalizedName.includes('penyusunan paper')) {
          destFolderId = folderMap.get('tugas: penyusunan paper');
        } else if (normalizedName.includes('permasalahan transportasi')) {
          destFolderId = folderMap.get('tugas: ppt permasalahan transportasi');
        } else if (normalizedName.includes('makalah riset')) {
          destFolderId = folderMap.get('tugas: makalah riset 2 halaman');
        } else if (lowerName.startsWith('img_9515') || lowerName.startsWith('img_9516')) {
          destFolderId = folderMap.get('tugas: bikin ringkasan dipresentasiin materi etika pancasila');
        } else if (lowerName.startsWith('img_9595') || lowerName.startsWith('img_9596') || lowerName.startsWith('img_9597')) {
          destFolderId = folderMap.get('tugas: tugas 2 soal mtk');
        } else if (lowerName.endsWith('.pdf') || lowerName.endsWith('.docx') || lowerName.endsWith('.pptx') || lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) {
          destFolderId = folderMap.get('materi kuliah');
        }
      }

      if (destFolderId) {
        await drive.files.update({
          fileId: file.id,
          addParents: destFolderId,
          removeParents: targetFolderId,
          supportsAllDrives: true
        });
        movedCount++;
      }
    }

    // 5. Scan all subfolders for duplicate filenames and move older copies to Trash
    let duplicatesCleaned = 0;
    try {
      const trashFolderId = await getOrCreateTrashFolder(drive);
      for (const [_, subfolderId] of folderMap.entries()) {
        const subFilesRes = await drive.files.list({
          q: `'${subfolderId}' in parents and mimeType != 'application/vnd.google-apps.folder' and trashed = false`,
          fields: 'files(id, name, createdTime, parents)',
          pageSize: 100,
          supportsAllDrives: true,
          includeItemsFromAllDrives: true
        });

        const byKey = {};
        for (const f of (subFilesRes.data.files || [])) {
          // Normalize base key: strip date suffix (_YYYY-MM-DD.ext) to detect student revision duplicates
          const baseKey = f.name.replace(/_\d{4}-\d{2}-\d{2}(\.\w+)$/, '$1');
          if (!byKey[baseKey]) byKey[baseKey] = [];
          byKey[baseKey].push(f);
        }

        for (const [key, list] of Object.entries(byKey)) {
          if (list.length > 1) {
            // Sort ascending by creation time so latest is kept
            list.sort((a, b) => new Date(a.createdTime) - new Date(b.createdTime));
            const olderCopies = list.slice(0, list.length - 1);
            for (const oldFile of olderCopies) {
              const currentParents = (oldFile.parents || []).join(',');
              await drive.files.update({
                fileId: oldFile.id,
                addParents: trashFolderId,
                removeParents: currentParents || subfolderId,
                supportsAllDrives: true
              });
              duplicatesCleaned++;
            }
          }
        }
      }
    } catch (dupCleanErr) {
      console.warn('Tidy subfolder duplicate cleanup error:', dupCleanErr.message);
    }

    return res.status(200).json({
      success: true,
      folderId: targetFolderId,
      createdFoldersCount: createdFolders.length,
      createdFolders,
      looseFilesFound: looseFiles.length,
      movedFilesCount: movedCount,
      duplicatesCleaned,
      totalFolders: folderMap.size,
      message: `Google Drive rapi! ${createdFolders.length} folder dibuat, ${movedCount} berkas tertata, ${duplicatesCleaned} duplikat dibersihkan.`
    });
  } catch (error) {
    console.error('tidy-drive error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Gagal merapikan Google Drive'
    });
  }
}

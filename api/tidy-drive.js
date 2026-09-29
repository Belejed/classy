import { google } from 'googleapis';

const CLIENT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || 'classy@total-chess-481123-k8.iam.gserviceaccount.com';

const getPrivateKey = () => {
  let key = process.env.GOOGLE_PRIVATE_KEY || '';
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
    const { workspaceName = 'M.Log B', taskTitles = [] } = req.body || {};

    const targetWorkspace = (workspaceName || '').trim() || 'M.Log B';

    // 1. Get or create Workspace Folder inside ROOT_FOLDER_ID
    const workspaceFolderId = await getOrCreateDriveFolder(drive, targetWorkspace, ROOT_FOLDER_ID);

    // 2. List all existing subfolders inside workspace
    const foldersRes = await drive.files.list({
      q: `'${workspaceFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: 'files(id, name)',
      pageSize: 100,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true
    });

    const folderMap = new Map();
    (foldersRes.data.files || []).forEach(f => {
      folderMap.set(f.name.toLowerCase().trim(), f.id);
    });

    // 3. Ensure required task folders exist
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
        const newFolderId = await getOrCreateDriveFolder(drive, title, workspaceFolderId);
        folderMap.set(key, newFolderId);
        createdFolders.push({ name: title, id: newFolderId });
      }
    }

    // 4. Find any loose files directly in workspace root and move them into subfolders
    const looseFilesRes = await drive.files.list({
      q: `'${workspaceFolderId}' in parents and mimeType != 'application/vnd.google-apps.folder' and trashed = false`,
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
          removeParents: workspaceFolderId,
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

        const byName = {};
        for (const f of (subFilesRes.data.files || [])) {
          if (!byName[f.name]) byName[f.name] = [];
          byName[f.name].push(f);
        }

        for (const [name, list] of Object.entries(byName)) {
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
      workspace: targetWorkspace,
      workspaceFolderId,
      createdFoldersCount: createdFolders.length,
      createdFolders,
      looseFilesFound: looseFiles.length,
      movedFilesCount: movedCount,
      duplicatesCleaned,
      totalFolders: folderMap.size,
      message: `Google Drive "${targetWorkspace}" rapi! ${createdFolders.length} folder dibuat, ${movedCount} berkas tertata, ${duplicatesCleaned} duplikat dibersihkan.`
    });
  } catch (error) {
    console.error('tidy-drive error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Gagal merapikan Google Drive'
    });
  }
}

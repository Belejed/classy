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

      // Find matching folder
      let destFolderId = null;
      for (const [folderKey, id] of folderMap.entries()) {
        const cleanKey = folderKey.replace(/^tugas:\s*/i, '').trim();
        if (cleanKey && lowerName.includes(cleanKey)) {
          destFolderId = id;
          break;
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

    return res.status(200).json({
      success: true,
      workspace: targetWorkspace,
      workspaceFolderId,
      createdFoldersCount: createdFolders.length,
      createdFolders,
      looseFilesFound: looseFiles.length,
      movedFilesCount: movedCount,
      totalFolders: folderMap.size,
      message: `Google Drive "${targetWorkspace}" rapi! ${createdFolders.length} folder baru dibuat, ${movedCount} berkas tertata.`
    });
  } catch (error) {
    console.error('tidy-drive error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Gagal merapikan Google Drive'
    });
  }
}

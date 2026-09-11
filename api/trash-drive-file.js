import { google } from 'googleapis';

const CLIENT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || 'classy@total-chess-481123-k8.iam.gserviceaccount.com';

const getPrivateKey = () => {
  let key = process.env.GOOGLE_PRIVATE_KEY || '';
  if (key.includes('\\n')) {
    key = key.replace(/\\n/g, '\n');
  }
  return key;
};

const ROOT_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || '1BK-P0mPQF9MSy0wsQ-tqNgVCXHXuCwmf';
const TRASH_FOLDER_NAME = 'Trash';

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

function extractDriveFileId(url) {
  if (!url) return null;
  const matchD = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (matchD) return matchD[1];
  const matchId = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (matchId) return matchId[1];
  return url;
}

let cachedTrashFolderId = null;

async function getOrCreateTrashFolder(drive) {
  if (cachedTrashFolderId) {
    try {
      const check = await drive.files.get({
        fileId: cachedTrashFolderId,
        fields: 'id, trashed',
        supportsAllDrives: true
      });
      if (check.data && !check.data.trashed) {
        return cachedTrashFolderId;
      }
    } catch {
      cachedTrashFolderId = null;
    }
  }

  // Look for existing folder named Trash in the root folder
  const q = `mimeType = 'application/vnd.google-apps.folder' and name = '${TRASH_FOLDER_NAME}' and '${ROOT_FOLDER_ID}' in parents and trashed = false`;
  const listRes = await drive.files.list({
    q,
    fields: 'files(id, name)',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true
  });

  if (listRes.data.files && listRes.data.files.length > 0) {
    cachedTrashFolderId = listRes.data.files[0].id;
    return cachedTrashFolderId;
  }

  // Create new Trash folder inside ROOT_FOLDER_ID
  const createRes = await drive.files.create({
    requestBody: {
      name: TRASH_FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [ROOT_FOLDER_ID]
    },
    fields: 'id, name',
    supportsAllDrives: true
  });

  cachedTrashFolderId = createRes.data.id;
  return cachedTrashFolderId;
}

async function moveSingleFileToTrash(drive, fileId, trashFolderId) {
  try {
    const fileRes = await drive.files.get({
      fileId,
      fields: 'id, name, parents',
      supportsAllDrives: true
    });

    const file = fileRes.data;
    if (file.parents && file.parents.includes(trashFolderId)) {
      return { success: true, fileId, name: file.name, alreadyInTrash: true };
    }

    const previousParents = (file.parents || [])
      .filter(p => p !== trashFolderId)
      .join(',');

    const updateParams = {
      fileId,
      addParents: trashFolderId,
      fields: 'id, name, parents',
      supportsAllDrives: true
    };

    if (previousParents) {
      updateParams.removeParents = previousParents;
    }

    const moveRes = await drive.files.update(updateParams);

    return {
      success: true,
      fileId,
      name: moveRes.data.name,
      parents: moveRes.data.parents
    };
  } catch (err) {
    console.error(`Error moving file ${fileId} to trash:`, err);
    return {
      success: false,
      fileId,
      error: err.message || 'Gagal memindahkan berkas ke folder Trash'
    };
  }
}

export default async function handler(req, res) {
  // CORS Headers
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
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { fileId, fileUrl, fileIds } = req.body || {};

    const idsToTrash = [];
    if (Array.isArray(fileIds) && fileIds.length > 0) {
      fileIds.forEach(id => {
        const extracted = extractDriveFileId(id);
        if (extracted) idsToTrash.push(extracted);
      });
    } else {
      const singleId = fileId || extractDriveFileId(fileUrl);
      if (singleId) idsToTrash.push(singleId);
    }

    if (idsToTrash.length === 0) {
      return res.status(400).json({ error: 'fileId, fileUrl, atau fileIds diperlukan' });
    }

    const drive = getDriveClient();
    const trashFolderId = await getOrCreateTrashFolder(drive);

    const results = await Promise.all(
      idsToTrash.map(id => moveSingleFileToTrash(drive, id, trashFolderId))
    );

    const successfulMoves = results.filter(r => r.success);
    const allSucceeded = successfulMoves.length === results.length;

    return res.status(allSucceeded ? 200 : 207).json({
      success: allSucceeded,
      trashFolderId,
      results,
      message: `${successfulMoves.length}/${results.length} berkas dipindahkan ke folder Trash di Google Drive`
    });

  } catch (error) {
    console.error('Error in trash-drive-file handler:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

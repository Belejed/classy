import { google } from 'googleapis';

const CLIENT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || 'classy@total-chess-481123-k8.iam.gserviceaccount.com';

const getPrivateKey = () => {
  let key = process.env.GOOGLE_PRIVATE_KEY || '';
  if (key.includes('\\n')) {
    key = key.replace(/\\n/g, '\n');
  }
  return key;
};

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
    scopes: ['https://www.googleapis.com/auth/drive.readonly']
  });
  return google.drive({ version: 'v3', auth });
};

const ROOT_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || '1BK-P0mPQF9MSy0wsQ-tqNgVCXHXuCwmf';
const TRASH_FOLDER_NAME = 'Trash';

let cachedTrashFolderId = null;

async function getTrashFolderId(drive) {
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

  try {
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
  } catch (e) {
    console.warn('Error finding trash folder:', e);
  }
  return null;
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
    const { fileIds = [] } = req.body || {};

    if (!Array.isArray(fileIds) || fileIds.length === 0) {
      return res.status(400).json({ error: 'fileIds array is required' });
    }

    const drive = getDriveClient();
    const trashFolderId = await getTrashFolderId(drive);
    const results = {};

    // Check files concurrently (limit max 30 at a time)
    const checkPromises = fileIds.slice(0, 30).map(async (fileId) => {
      if (!fileId) return;
      try {
        const fileRes = await drive.files.get({
          fileId: fileId,
          fields: 'id, name, trashed, explicitlyTrashed, parents',
          supportsAllDrives: true
        });

        const isExplicitlyTrashed = !!(fileRes.data.trashed || fileRes.data.explicitlyTrashed);
        const parents = fileRes.data.parents || [];
        const isInTrashFolder = Boolean(trashFolderId && parents.includes(trashFolderId));

        const isMissingOrTrashed = isExplicitlyTrashed || isInTrashFolder;

        results[fileId] = {
          exists: !isMissingOrTrashed,
          trashed: isMissingOrTrashed,
          inTrashFolder: isInTrashFolder,
          name: fileRes.data.name
        };
      } catch (err) {
        // If 404 or not found, it's missing
        results[fileId] = {
          exists: false,
          trashed: true,
          error: err.message || 'File not found'
        };
      }
    });

    await Promise.all(checkPromises);

    return res.status(200).json({
      success: true,
      results
    });
  } catch (error) {
    console.error('Error crosschecking Google Drive files:', error);
    return res.status(500).json({ error: error.message });
  }
}

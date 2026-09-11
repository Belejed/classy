import { google } from 'googleapis';

const GOOGLE_SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbwi3vHYbWBRva2OhDZVefspXZsr_dOid3hdtQ7rwxWtCoiRsS-24gU4l4A167mNVHEeww/exec';

const CLIENT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || 'classy@total-chess-481123-k8.iam.gserviceaccount.com';

const getPrivateKey = () => {
  let key = process.env.GOOGLE_PRIVATE_KEY || '';
  if (key.includes('\\n')) {
    key = key.replace(/\\n/g, '\n');
  }
  return key;
};

const ROOT_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || '1BK-P0mPQF9MSy0wsQ-tqNgVCXHXuCwmf';

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

const folderCache = new Map();

async function getOrCreateDriveFolder(drive, name, parentId) {
  const cacheKey = `${parentId}:${name}`;
  if (folderCache.has(cacheKey)) {
    return folderCache.get(cacheKey);
  }

  const safeName = name.replace(/'/g, "\\'");
  const q = `mimeType = 'application/vnd.google-apps.folder' and name = '${safeName}' and '${parentId}' in parents and trashed = false`;
  const res = await drive.files.list({
    q,
    fields: 'files(id, name)',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true
  });

  if (res.data.files && res.data.files.length > 0) {
    const id = res.data.files[0].id;
    folderCache.set(cacheKey, id);
    return id;
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

  const id = created.data.id;
  folderCache.set(cacheKey, id);
  return id;
}

export default async function handler(req, res) {
  // Enable CORS
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

  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
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
    const { fileName, mimeType, fileData, folderName, workspaceName, resolveOnly, folderId, moveOnly, fileId } = req.body || {};

    const targetWorkspace = (workspaceName || '').trim() || 'Umum';
    const targetSubfolder = (folderName || '').trim() || 'Materi Kuliah';

    let resolvedFolderId = folderId || null;

    if (!resolvedFolderId) {
      try {
        const drive = getDriveClient();
        // 1. Get or create Workspace Folder inside ROOT_FOLDER_ID
        const workspaceFolderId = await getOrCreateDriveFolder(drive, targetWorkspace, ROOT_FOLDER_ID);

        // 2. Get or create Subfolder inside Workspace Folder
        resolvedFolderId = await getOrCreateDriveFolder(drive, targetSubfolder, workspaceFolderId);
      } catch (folderErr) {
        console.warn('Could not resolve nested Drive folder via Google API, falling back:', folderErr);
      }
    }

    if (resolveOnly) {
      return res.status(200).json({
        success: true,
        folderId: resolvedFolderId
      });
    }

    // Move an existing file into the target subfolder (used post direct-script upload)
    if (moveOnly && fileId && resolvedFolderId) {
      try {
        const drive = getDriveClient();
        const fileInfo = await drive.files.get({
          fileId,
          fields: 'id, parents',
          supportsAllDrives: true
        });
        const currentParents = (fileInfo.data.parents || []).join(',');
        if (!fileInfo.data.parents || !fileInfo.data.parents.includes(resolvedFolderId)) {
          await drive.files.update({
            fileId,
            addParents: resolvedFolderId,
            removeParents: currentParents || ROOT_FOLDER_ID,
            fields: 'id, parents',
            supportsAllDrives: true
          });
        }
        return res.status(200).json({
          success: true,
          fileId,
          folderId: resolvedFolderId
        });
      } catch (moveErr) {
        console.error('moveOnly error:', moveErr);
        return res.status(500).json({ error: moveErr.message });
      }
    }

    if (!fileName || !fileData) {
      return res.status(400).json({ error: 'fileName and fileData are required' });
    }

    // Forward to Google Apps Script Web App
    const scriptBody = {
      fileName,
      mimeType: mimeType || 'application/octet-stream',
      fileData
    };

    if (resolvedFolderId) {
      scriptBody.folderId = resolvedFolderId;
    } else {
      scriptBody.folderName = `${targetWorkspace} - ${targetSubfolder}`;
    }

    const scriptResponse = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(scriptBody)
    });

    const scriptData = await scriptResponse.json();

    if (!scriptData.success) {
      throw new Error(scriptData.error || 'Google Apps Script returned an error');
    }

    // Ensure the uploaded file is placed into the exact resolved workspace subfolder
    if (resolvedFolderId && scriptData.fileId) {
      try {
        const drive = getDriveClient();
        const fileInfo = await drive.files.get({
          fileId: scriptData.fileId,
          fields: 'id, parents',
          supportsAllDrives: true
        });

        const currentParents = (fileInfo.data.parents || []).join(',');
        if (!fileInfo.data.parents || !fileInfo.data.parents.includes(resolvedFolderId)) {
          await drive.files.update({
            fileId: scriptData.fileId,
            addParents: resolvedFolderId,
            removeParents: currentParents || ROOT_FOLDER_ID,
            fields: 'id, parents',
            supportsAllDrives: true
          });
        }
      } catch (moveErr) {
        console.warn('Could not move file to resolved workspace subfolder:', moveErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      fileId: scriptData.fileId,
      name: scriptData.fileName || fileName,
      fileSize: scriptData.fileSize || '1.0 MB',
      fileType: fileName.split('.').pop()?.toLowerCase() || 'pdf',
      mimeType: mimeType,
      storageUrl: scriptData.webViewLink,
      webViewLink: scriptData.webViewLink,
      webContentLink: scriptData.webContentLink,
      previewUrl: `https://drive.google.com/file/d/${scriptData.fileId}/preview`
    });

  } catch (error) {
    console.error('Google Drive Upload Error:', error);
    return res.status(500).json({ 
      error: error.message || 'Internal server error during Google Drive upload' 
    });
  }
}

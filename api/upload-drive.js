import { google } from 'googleapis';

const GOOGLE_SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbwi3vHYbWBRva2OhDZVefspXZsr_dOid3hdtQ7rwxWtCoiRsS-24gU4l4A167mNVHEeww/exec';

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

let PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY || FALLBACK_PRIVATE_KEY;
if (PRIVATE_KEY.includes('\\n')) {
  PRIVATE_KEY = PRIVATE_KEY.replace(/\\n/g, '\n');
}

const ROOT_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || '1BK-P0mPQF9MSy0wsQ-tqNgVCXHXuCwmf';

const getDriveClient = () => {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: CLIENT_EMAIL,
      private_key: PRIVATE_KEY
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
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
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

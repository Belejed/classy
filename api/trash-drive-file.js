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

let PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY || FALLBACK_PRIVATE_KEY;
if (PRIVATE_KEY.includes('\\n')) {
  PRIVATE_KEY = PRIVATE_KEY.replace(/\\n/g, '\n');
}

const ROOT_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || '1BK-P0mPQF9MSy0wsQ-tqNgVCXHXuCwmf';
const TRASH_FOLDER_NAME = 'Trash';

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

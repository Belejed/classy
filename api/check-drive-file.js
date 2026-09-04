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

const getDriveClient = () => {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: CLIENT_EMAIL,
      private_key: PRIVATE_KEY
    },
    scopes: ['https://www.googleapis.com/auth/drive.readonly']
  });
  return google.drive({ version: 'v3', auth });
};

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
    const { fileIds = [] } = req.body || {};

    if (!Array.isArray(fileIds) || fileIds.length === 0) {
      return res.status(400).json({ error: 'fileIds array is required' });
    }

    const drive = getDriveClient();
    const results = {};

    // Check files concurrently (limit max 20 at a time)
    const checkPromises = fileIds.slice(0, 30).map(async (fileId) => {
      if (!fileId) return;
      try {
        const fileRes = await drive.files.get({
          fileId: fileId,
          fields: 'id, name, trashed, explicitlyTrashed',
          supportsAllDrives: true
        });

        const isTrashed = !!(fileRes.data.trashed || fileRes.data.explicitlyTrashed);
        results[fileId] = {
          exists: !isTrashed,
          trashed: isTrashed,
          name: fileRes.data.name
        };
      } catch (err) {
        // If 404 or not found, it's missing
        results[fileId] = {
          exists: false,
          trashed: false,
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

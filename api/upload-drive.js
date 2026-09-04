const GOOGLE_SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbwi3vHYbWBRva2OhDZVefspXZsr_dOid3hdtQ7rwxWtCoiRsS-24gU4l4A167mNVHEeww/exec';

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
    const { fileName, mimeType, fileData, folderName } = req.body || {};

    if (!fileName || !fileData) {
      return res.status(400).json({ error: 'fileName and fileData are required' });
    }

    // Forward to Google Apps Script Web App
    const scriptResponse = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify({
        fileName,
        mimeType: mimeType || 'application/octet-stream',
        fileData,
        folderName: folderName || 'Materi Kuliah'
      })
    });

    const scriptData = await scriptResponse.json();

    if (!scriptData.success) {
      throw new Error(scriptData.error || 'Google Apps Script returned an error');
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

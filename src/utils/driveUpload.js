/**
 * Helper to upload files to Google Drive via /api/upload-drive or directly to Google Apps Script
 */
const DIRECT_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwi3vHYbWBRva2OhDZVefspXZsr_dOid3hdtQ7rwxWtCoiRsS-24gU4l4A167mNVHEeww/exec';

export async function uploadToGoogleDrive({ file, name, folderName }) {
  if (!file) throw new Error('File tidak ditemukan');

  const reader = new FileReader();
  const fileData = await new Promise((resolve, reject) => {
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const fileName = name || file.name;
  const mimeType = file.type || 'application/octet-stream';
  const targetFolder = folderName || 'Materi Kuliah';

  // 1. Try via Vercel serverless / dev proxy endpoint
  try {
    const res = await fetch('/api/upload-drive', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fileName,
        mimeType,
        fileData,
        folderName: targetFolder
      })
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success) return data;
    }
  } catch (apiErr) {
    console.warn('/api/upload-drive endpoint failed, trying direct Google Script...', apiErr);
  }

  // 2. Direct fallback to Google Apps Script Web App
  const directRes = await fetch(DIRECT_SCRIPT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8'
    },
    body: JSON.stringify({
      fileName,
      mimeType,
      fileData,
      folderName: targetFolder
    })
  });

  const directData = await directRes.json();
  if (!directData.success) {
    throw new Error(directData.error || 'Gagal mengunggah ke Google Drive');
  }

  return {
    success: true,
    fileId: directData.fileId,
    name: directData.fileName || fileName,
    fileSize: directData.fileSize || `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
    fileType: fileName.split('.').pop()?.toLowerCase() || 'pdf',
    mimeType: mimeType,
    storageUrl: directData.webViewLink,
    webViewLink: directData.webViewLink,
    webContentLink: directData.webContentLink,
    previewUrl: `https://drive.google.com/file/d/${directData.fileId}/preview`
  };
}

/**
 * Extract Google Drive file ID from various URL formats
 */
export function extractDriveFileId(url) {
  if (!url) return null;
  const matchD = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (matchD) return matchD[1];
  const matchId = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (matchId) return matchId[1];
  return null;
}

/**
 * Crosscheck Google Drive file statuses in batch
 */
export async function checkDriveFiles(fileIds = []) {
  const validIds = fileIds.filter(Boolean);
  if (!validIds.length) return {};

  try {
    const res = await fetch('/api/check-drive-file', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ fileIds: validIds })
    });

    if (res.ok) {
      const data = await res.json();
      return data.results || {};
    }
  } catch (err) {
    console.warn('Google Drive file check failed:', err);
  }
  return {};
}

/**
 * Move a file in Google Drive to the 'Trash' folder instead of permanently deleting it
 */
export async function moveFileToDriveTrash(fileUrlOrId) {
  if (!fileUrlOrId) return null;
  const fileId = (fileUrlOrId.includes('/') || fileUrlOrId.includes('?'))
    ? extractDriveFileId(fileUrlOrId)
    : fileUrlOrId;

  if (!fileId) return null;

  try {
    const res = await fetch('/api/trash-drive-file', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ fileId })
    });

    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch (err) {
    console.warn('Gagal memindahkan berkas ke folder Trash di Google Drive:', err);
  }
  return null;
}

/**
 * Move multiple files in Google Drive to the 'Trash' folder in batch
 */
export async function moveFilesToDriveTrash(fileUrlsOrIds = []) {
  const validIds = fileUrlsOrIds.map(f => {
    if (!f) return null;
    return (f.includes('/') || f.includes('?')) ? extractDriveFileId(f) : f;
  }).filter(Boolean);

  if (!validIds.length) return null;

  try {
    const res = await fetch('/api/trash-drive-file', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ fileIds: validIds })
    });

    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Gagal memindahkan daftar berkas ke folder Trash di Google Drive:', err);
  }
  return null;
}


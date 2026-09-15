/**
 * Helper to upload files to Google Drive via /api/upload-drive or directly to Google Apps Script
 */
const DIRECT_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwi3vHYbWBRva2OhDZVefspXZsr_dOid3hdtQ7rwxWtCoiRsS-24gU4l4A167mNVHEeww/exec';

// Pre-mapped known folder IDs to ensure 100% placement inside M.Log B without stray root folders
export const KNOWN_SUBFOLDER_IDS = {
  'M.Log B:Tugas: Bussiness Value Mapping': '1onArmPNPMErsISDvv9RiQ43T35ahF7p5',
  'M.Log B:Tugas: Tugas Individu': '1vNmsOTYef1vEYCUmpQwwj_gqeKDwkKIn',
  'M.Log B:Tugas: PPT Permasalahan Transportasi': '1m-EgXYUjhaLdlJDKG4s2d_u2kt4YGoro',
  'M.Log B:Tugas: Makalah Riset 2 Halaman': '1goE6yRZfOW0adgVsG9VKQSYKLrfBNlwb',
  'M.Log B:Tugas: Analisis Benchmarking Perusahaan': '16nT7DjMqLeJm9JYexVj5SncZbjWwNFxb',
  'M.Log B:Tugas: Penyusunan Paper': '1RLsG1Lr3mwDyD8Tpp-8czlsuHNVCToEo',
  'M.Log B:Materi Kuliah': '1oedY2DbXYwQIC5S6XahXNoEvAtFaGJIz',
  'M.Log B:Pedoman': '14qmi8TBJSFnWdXEGxDTSurRHQp1JJmIF',
  'M.Log B:Lampiran Pengumuman': '1MVMWi8D1BwFuOdNMGlI3nKRorrQa4S_C',
  'M.Log B': '1cflGkvF46agbdU_hWwHXPdc1iCmniWgF',
  'MLog A 2026': '1blMVEK27MmjwvgrvK26Hs-FNfug5yquZ'
};

const folderCache = new Map();

/**
 * Pre-resolves Google Drive nested folder ID (Workspace > Subfolder)
 * using lightweight metadata call without transmitting large file payloads
 */
export async function resolveDriveFolderId(workspaceName, folderName) {
  const targetWorkspace = (workspaceName || '').trim() || 'M.Log B';
  const targetFolder = (folderName || '').trim() || 'Materi Kuliah';
  const directKey = `${targetWorkspace}:${targetFolder}`;

  if (KNOWN_SUBFOLDER_IDS[directKey]) {
    return KNOWN_SUBFOLDER_IDS[directKey];
  }

  const cacheKey = `fld_${targetWorkspace}_${targetFolder}`;

  if (folderCache.has(cacheKey)) {
    return folderCache.get(cacheKey);
  }

  try {
    if (typeof sessionStorage !== 'undefined') {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        folderCache.set(cacheKey, cached);
        return cached;
      }
    }
  } catch {}

  try {
    const res = await fetch('/api/upload-drive', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        resolveOnly: true,
        workspaceName: targetWorkspace,
        folderName: targetFolder
      })
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.folderId) {
        folderCache.set(cacheKey, data.folderId);
        try {
          if (typeof sessionStorage !== 'undefined') {
            sessionStorage.setItem(cacheKey, data.folderId);
          }
        } catch {}
        return data.folderId;
      }
    }
  } catch (err) {
    console.warn('Could not resolve Drive folder ID:', err);
  }

  return KNOWN_SUBFOLDER_IDS[targetWorkspace] || null;
}

export async function uploadToGoogleDrive({ file, name, folderName, workspaceName }) {
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
  const targetWorkspace = (workspaceName || '').trim() || 'Umum';

  // Pre-resolve nested folder ID to guarantee placement in Workspace > Subfolder
  const resolvedFolderId = await resolveDriveFolderId(targetWorkspace, targetFolder);

  // 1. For smaller files (< 3 MB), try via Vercel serverless / dev proxy endpoint
  if (file.size <= 3 * 1024 * 1024) {
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
          folderName: targetFolder,
          workspaceName: targetWorkspace,
          folderId: resolvedFolderId
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) return data;
      }
    } catch (apiErr) {
      console.warn('/api/upload-drive endpoint failed, trying direct Google Script...', apiErr);
    }
  }

  // 2. Direct upload to Google Apps Script Web App (handles any file size up to 50MB)
  const scriptPayload = {
    fileName,
    mimeType,
    fileData,
    workspaceName: targetWorkspace,
    folderName: targetFolder
  };

  if (resolvedFolderId) {
    scriptPayload.folderId = resolvedFolderId;
  }

  const directRes = await fetch(DIRECT_SCRIPT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8'
    },
    body: JSON.stringify(scriptPayload),
    signal: AbortSignal.timeout(180000)
  });

  const directData = await directRes.json();
  if (!directData.success) {
    throw new Error(directData.error || 'Gagal mengunggah ke Google Drive');
  }

  // Ensure the file is placed directly inside Workspace > Subfolder (not in Root)
  try {
    await fetch('/api/upload-drive', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        moveOnly: true,
        fileId: directData.fileId,
        folderId: resolvedFolderId,
        workspaceName: targetWorkspace,
        folderName: targetFolder
      })
    });
  } catch (moveErr) {
    console.warn('Post-upload subfolder placement warning:', moveErr);
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
  if (typeof url !== 'string') return null;
  const trimmed = url.trim();
  const matchD = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (matchD) return matchD[1];
  const matchId = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (matchId) return matchId[1];
  // If it's already a raw Google Drive File ID (alphanumeric 20-60 chars)
  if (/^[a-zA-Z0-9_-]{20,60}$/.test(trimmed)) {
    return trimmed;
  }
  return null;
}

/**
 * Crosscheck Google Drive file statuses in batch
 */
export async function checkDriveFiles(fileIds = []) {
  const validIds = Array.from(new Set(fileIds.filter(Boolean)));
  if (!validIds.length) return {};

  const allResults = {};
  const chunkSize = 30;

  for (let i = 0; i < validIds.length; i += chunkSize) {
    const chunk = validIds.slice(i, i + chunkSize);
    try {
      const res = await fetch('/api/check-drive-file', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ fileIds: chunk })
      });

      if (res.ok) {
        const data = await res.json();
        Object.assign(allResults, data.results || {});
      }
    } catch (err) {
      console.warn('Google Drive file check failed for chunk:', err);
    }
  }

  return allResults;
}

/**
 * Move a file in Google Drive to the 'Trash' folder instead of permanently deleting it
 */
export async function moveFileToDriveTrash(fileUrlOrId) {
  if (!fileUrlOrId) return null;

  let fileId = null;
  if (typeof fileUrlOrId === 'object' && fileUrlOrId !== null) {
    fileId = fileUrlOrId.driveFileId || fileUrlOrId.fileId || fileUrlOrId.id || extractDriveFileId(fileUrlOrId.storageUrl || fileUrlOrId.fileUrl);
  } else if (typeof fileUrlOrId === 'string') {
    fileId = extractDriveFileId(fileUrlOrId) || fileUrlOrId.trim();
  }

  if (!fileId) {
    console.warn('Tidak dapat menemukan Google Drive File ID dari:', fileUrlOrId);
    return null;
  }

  try {
    const res = await fetch('/api/trash-drive-file', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ fileId })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      const errMsg = data.error || data.message || 'Gagal memindahkan ke Trash';
      console.warn('Drive trash API returned non-success:', errMsg);
      throw new Error(errMsg);
    }
    return data;
  } catch (err) {
    console.warn('Gagal memindahkan berkas ke folder Trash di Google Drive:', err);
    throw err;
  }
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


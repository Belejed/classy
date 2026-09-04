/**
 * File & PDF Attachment Utility
 * Converts documents (PDF, DOCX, Images) to optimized Base64 / DataURI with file metadata
 */

export const processFileUpload = (file, maxMb = 10) => {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error('Tidak ada file yang dipilih.'));

    const sizeMb = file.size / (1024 * 1024);
    if (sizeMb > maxMb) {
      return reject(new Error(`Ukuran file melebihi batas maksimal ${maxMb}MB.`));
    }

    const reader = new FileReader();
    reader.onload = () => {
      resolve({
        id: 'file_' + Math.random().toString(36).substr(2, 9),
        name: file.name,
        size: formatFileSize(file.size),
        rawSize: file.size,
        type: file.type || 'application/octet-stream',
        isPdf: file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'),
        dataUrl: reader.result,
        uploadedAt: new Date().toISOString()
      });
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
};

export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const downloadAttachment = (attachment) => {
  const link = document.createElement('a');
  link.href = attachment.dataUrl;
  link.download = attachment.name;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

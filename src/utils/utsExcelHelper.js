import * as XLSX from 'xlsx';

/**
 * UTILITY EXCEL HELPER FOR UTS QUIZZES & FLASHCARDS
 * Mendukung Download Template (.xlsx), Upload File (.xlsx/.xls/.csv), 
 * dan Bulk Paste langsung dari spreadsheet.
 */

// -------------------------------------------------------------
// 1. QUIZ TEMPLATE & PARSER
// -------------------------------------------------------------

export function downloadQuizExcelTemplate() {
  const sampleData = [
    {
      'Mata Kuliah': 'Pengantar Logistik',
      'Pertanyaan Soal': 'Prinsip logistik yang memastikan pengiriman barang tidak mengalami cacat fisik adalah...',
      'Pilihan A': 'Right Customer',
      'Pilihan B': 'Right Condition',
      'Pilihan C': 'Right Quantity',
      'Pilihan D': 'Right Place',
      'Kunci Jawaban (A/B/C/D)': 'B',
      'Pembahasan / Penjelasan': 'Right Condition berarti barang harus sampai dalam kondisi baik dan tidak rusak.'
    },
    {
      'Mata Kuliah': 'Ekonomi Mikro',
      'Pertanyaan Soal': 'Keseimbangan pasar (Equilibrium) tercapai ketika...',
      'Pilihan A': 'Jumlah permintaan sama dengan jumlah penawaran (Qd = Qs)',
      'Pilihan B': 'Harga barang naik setinggi-tingginya',
      'Pilihan C': 'Pemerintah menetapkan harga batas atas',
      'Pilihan D': 'Produsen tidak memproduksi barang apa pun',
      'Kunci Jawaban (A/B/C/D)': 'A',
      'Pembahasan / Penjelasan': 'Titik keseimbangan terjadi pada perpotongan kurva permintaan dan kurva penawaran.'
    },
    {
      'Mata Kuliah': 'Pengantar Akuntansi',
      'Pertanyaan Soal': 'Rumus Persamaan Dasar Akuntansi yang benar adalah...',
      'Pilihan A': 'Aset = Liabilitas - Ekuitas',
      'Pilihan B': 'Aset = Liabilitas + Ekuitas',
      'Pilihan C': 'Ekuitas = Aset + Liabilitas',
      'Pilihan D': 'Liabilitas = Aset + Ekuitas',
      'Kunci Jawaban (A/B/C/D)': 'B',
      'Pembahasan / Penjelasan': 'Total aset perusahaan didanai oleh hutang (liabilitas) dan modal sendiri (ekuitas).'
    }
  ];

  const ws = XLSX.utils.json_to_sheet(sampleData);
  // Auto-fit column widths
  ws['!cols'] = [
    { wch: 24 }, // Mata Kuliah
    { wch: 50 }, // Pertanyaan
    { wch: 25 }, // Opsi A
    { wch: 25 }, // Opsi B
    { wch: 25 }, // Opsi C
    { wch: 25 }, // Opsi D
    { wch: 22 }, // Kunci
    { wch: 45 }  // Pembahasan
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Template_Soal_Quiz');
  XLSX.writeFile(wb, 'Template_Soal_Quiz_UTS.xlsx');
}

export async function parseQuizFile(file) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  return normalizeQuizRows(rawRows);
}

export function parseQuizTsv(text) {
  // Support copy-paste tab-separated rows from Excel
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return [];

  // Check if first row is header
  const firstCols = lines[0].split('\t').map(c => c.trim().toLowerCase());
  const hasHeader = firstCols.some(c => c.includes('soal') || c.includes('mata kuliah') || c.includes('pilihan'));
  const dataLines = hasHeader ? lines.slice(1) : lines;

  const rawRows = dataLines.map(line => {
    const cols = line.split('\t').map(c => c.trim());
    return {
      'Mata Kuliah': cols[0] || '',
      'Pertanyaan Soal': cols[1] || '',
      'Pilihan A': cols[2] || '',
      'Pilihan B': cols[3] || '',
      'Pilihan C': cols[4] || '',
      'Pilihan D': cols[5] || '',
      'Kunci Jawaban (A/B/C/D)': cols[6] || 'A',
      'Pembahasan / Penjelasan': cols[7] || ''
    };
  });

  return normalizeQuizRows(rawRows);
}

function normalizeQuizRows(rawRows) {
  const parsedQuizzes = [];

  for (const row of rawRows) {
    // Find keys flexibly
    const course = findValue(row, ['mata kuliah', 'matkul', 'course', 'subject']) || 'Pengantar Logistik';
    const question = findValue(row, ['pertanyaan soal', 'pertanyaan', 'soal', 'question']);
    const optA = findValue(row, ['pilihan a', 'opsi a', 'a', 'option a']);
    const optB = findValue(row, ['pilihan b', 'opsi b', 'b', 'option b']);
    const optC = findValue(row, ['pilihan c', 'opsi c', 'c', 'option c']);
    const optD = findValue(row, ['pilihan d', 'opsi d', 'd', 'option d']);
    const keyRaw = String(findValue(row, ['kunci jawaban (a/b/c/d)', 'kunci jawaban', 'kunci', 'jawaban benar', 'answer', 'key']) || 'A').trim().toUpperCase();
    const explanation = findValue(row, ['pembahasan / penjelasan', 'pembahasan', 'penjelasan', 'explanation']) || '';

    if (!question || !optA || !optB) {
      continue; // Skip invalid row
    }

    let answerIdx = 0;
    if (keyRaw === 'B' || keyRaw === '1') answerIdx = 1;
    else if (keyRaw === 'C' || keyRaw === '2') answerIdx = 2;
    else if (keyRaw === 'D' || keyRaw === '3') answerIdx = 3;

    parsedQuizzes.push({
      id: `qz-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      course: course.trim(),
      question: question.trim(),
      options: [optA.trim(), optB.trim(), (optC || '').trim(), (optD || '').trim()].filter(Boolean),
      answer: answerIdx,
      explanation: explanation.trim()
    });
  }

  return parsedQuizzes;
}

// -------------------------------------------------------------
// 2. FLASHCARD TEMPLATE & PARSER
// -------------------------------------------------------------

export function downloadFlashcardExcelTemplate() {
  const sampleData = [
    {
      'Mata Kuliah': 'Pengantar Logistik',
      'Pertanyaan Depan Kartu': 'Sebutkan 7 Prinsip R (7R) dalam aktivitas logistik!',
      'Jawaban Belakang Kartu': 'Right Product, Right Quantity, Right Condition, Right Place, Right Time, Right Customer, dan Right Cost.'
    },
    {
      'Mata Kuliah': 'Pengantar Transportasi',
      'Pertanyaan Depan Kartu': 'Apa keunggulan utama moda transportasi truk (road)?',
      'Jawaban Belakang Kartu': 'Fleksibilitas rute tinggi dengan layanan langsung dari pintu ke pintu (door-to-door).'
    },
    {
      'Mata Kuliah': 'Ekonomi Mikro',
      'Pertanyaan Depan Kartu': 'Apa bunyi Hukum Permintaan?',
      'Jawaban Belakang Kartu': 'Jika harga suatu barang naik, maka jumlah barang yang diminta akan turun (ceteris paribus).'
    },
    {
      'Mata Kuliah': 'Prinsip - Prinsip Manajemen',
      'Pertanyaan Depan Kartu': 'Sebutkan 4 fungsi manajemen dasar menurut teori POAC!',
      'Jawaban Belakang Kartu': 'Planning (Perencanaan), Organizing (Pengorganisasian), Actuating (Penggerakan), dan Controlling (Pengawasan).'
    }
  ];

  const ws = XLSX.utils.json_to_sheet(sampleData);
  ws['!cols'] = [
    { wch: 25 }, // Mata Kuliah
    { wch: 55 }, // Pertanyaan
    { wch: 65 }  // Jawaban
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Template_Flashcard');
  XLSX.writeFile(wb, 'Template_Flashcard_UTS.xlsx');
}

export async function parseFlashcardFile(file) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  return normalizeFlashcardRows(rawRows);
}

export function parseFlashcardTsv(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return [];

  const firstCols = lines[0].split('\t').map(c => c.trim().toLowerCase());
  const hasHeader = firstCols.some(c => c.includes('kartu') || c.includes('pertanyaan') || c.includes('jawaban'));
  const dataLines = hasHeader ? lines.slice(1) : lines;

  const rawRows = dataLines.map(line => {
    const cols = line.split('\t').map(c => c.trim());
    return {
      'Mata Kuliah': cols[0] || '',
      'Pertanyaan Depan Kartu': cols[1] || '',
      'Jawaban Belakang Kartu': cols[2] || ''
    };
  });

  return normalizeFlashcardRows(rawRows);
}

function normalizeFlashcardRows(rawRows) {
  const parsedFlashcards = [];

  for (const row of rawRows) {
    const course = findValue(row, ['mata kuliah', 'matkul', 'course', 'subject']) || 'Pengantar Logistik';
    const question = findValue(row, ['pertanyaan depan kartu', 'pertanyaan', 'soal', 'question', 'depan']);
    const answer = findValue(row, ['jawaban belakang kartu', 'jawaban', 'answer', 'belakang']);

    if (!question || !answer) {
      continue;
    }

    parsedFlashcards.push({
      id: `fc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      course: course.trim(),
      question: question.trim(),
      answer: answer.trim()
    });
  }

  return parsedFlashcards;
}

// -------------------------------------------------------------
// HELPER FOR FLEXIBLE COLUMN MATCHING
// -------------------------------------------------------------
function findValue(rowObj, candidateKeys) {
  for (const key of Object.keys(rowObj)) {
    const cleanKey = key.trim().toLowerCase();
    for (const cand of candidateKeys) {
      if (cleanKey === cand.toLowerCase() || cleanKey.includes(cand.toLowerCase())) {
        return rowObj[key];
      }
    }
  }
  return '';
}

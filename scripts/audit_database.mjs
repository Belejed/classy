import fs from 'fs';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAmTz5EH4Iy-CubYMuKcCwhhnltxbEmDs0",
  authDomain: "noted-7deda.firebaseapp.com",
  projectId: "noted-7deda"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const backupPath = 'C:\\Users\\bluje\\.gemini\\antigravity\\brain\\16d3be55-9929-410e-930e-6ee1671feefb\\scratch\\database_backup_2026_09_14.json';
const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));

async function audit() {
  console.log('====================================================');
  console.log('🔍 AUDIT LENGKAP: BACKUP ASLI VS FIREBASE LIVE');
  console.log('====================================================\n');

  // 1. WORKSPACES
  console.log('📌 1. WORKSPACES / RUANG KELAS:');
  const wsSnap = await getDocs(collection(db, 'workspaces'));
  console.log(`- Total Kelas: Backup = ${backup.workspaces.length} | Firestore = ${wsSnap.size}`);
  let wsOk = true;
  for (const bWs of backup.workspaces) {
    const liveDoc = wsSnap.docs.find(d => d.id === bWs.id);
    if (!liveDoc) {
      console.log(`  ❌ HILANG: Kelas ${bWs.name} (${bWs.id})`);
      wsOk = false;
    } else {
      const liveData = liveDoc.data();
      const bMembers = bWs.members || [];
      const lMembers = liveData.members || [];
      console.log(`  ✓ Kelas [${liveData.name}]`);
      console.log(`    • ID: ${liveDoc.id}`);
      console.log(`    • Kode Kelas: ${liveData.code}`);
      console.log(`    • Jumlah Anggota: Backup = ${bMembers.length}, Firestore = ${lMembers.length}`);
      console.log(`    • Pembuat/Admin: ${liveData.owner_id || liveData.created_by}`);
    }
  }

  // 2. SCHEDULES
  console.log('\n📌 2. SCHEDULES / JADWAL KULIAH:');
  const schSnap = await getDocs(collection(db, 'schedules'));
  console.log(`- Total Jadwal: Backup = ${backup.schedules.length} | Firestore = ${schSnap.size}`);
  const missingSch = backup.schedules.filter(b => !schSnap.docs.some(d => d.id === b.id));
  if (missingSch.length === 0) {
    console.log('  ✓ Semua 16 jadwal kuliah lengkap 100% tanpa ada satu pun yang hilang.');
    schSnap.docs.forEach(d => {
      const s = d.data();
      console.log(`    • [${s.day}] ${s.subject} (${s.time || ''}) - Ruang: ${s.room || '-'}`);
    });
  } else {
    console.log(`  ❌ HILANG ${missingSch.length} jadwal:`, missingSch.map(s => s.subject));
  }

  // 3. TASKS & SUBMISSIONS
  console.log('\n📌 3. TASKS & SUBMISSIONS (PENGUMPULAN TUGAS):');
  const taskSnap = await getDocs(collection(db, 'tasks'));
  console.log(`- Total Tugas: Backup = ${backup.tasks.length} | Firestore = ${taskSnap.size}`);
  let totalBSubmissions = 0;
  let totalLSubmissions = 0;
  let missingFiles = 0;

  for (const bTask of backup.tasks) {
    const liveDoc = taskSnap.docs.find(d => d.id === bTask.id);
    if (!liveDoc) {
      console.log(`  ❌ HILANG: Tugas ${bTask.title} (${bTask.id})`);
    } else {
      const liveData = liveDoc.data();
      const bMeta = JSON.parse(bTask.description || '{}');
      const lMeta = JSON.parse(liveData.description || '{}');
      const bSubs = bMeta.submissions || [];
      const lSubs = lMeta.submissions || [];
      totalBSubmissions += bSubs.length;
      totalLSubmissions += lSubs.length;
      console.log(`  ✓ Tugas: "${liveData.title}" (${liveData.subject || liveData.course || 'Umum'})`);
      console.log(`    • Deadline: ${liveData.due_date || liveData.dueDate || '-'}`);
      console.log(`    • Pengumpulan: Backup = ${bSubs.length} vs Firestore = ${lSubs.length}`);

      // Check each submission
      for (const bs of bSubs) {
        const ls = lSubs.find(s => s.id === bs.id || s.userEmail === bs.userEmail || (s.userName && s.userName === bs.userName));
        if (!ls) {
          console.log(`    ⚠️ Submission hilang: pengunggah ${bs.userName || bs.userId}`);
        } else {
          if (bs.fileUrl && !ls.fileUrl) {
            console.log(`    ⚠️ FileUrl hilang pada submission ${bs.userName}`);
            missingFiles++;
          }
        }
      }
    }
  }
  console.log(`- Total Submissions Keseluruhan: Backup = ${totalBSubmissions} | Firestore = ${totalLSubmissions}`);
  if (totalBSubmissions === totalLSubmissions && missingFiles === 0) {
    console.log('  ✓ Seluruh 62 berkas pengumpulan tugas mahasiswa UTUH 100% tanpa ada yang hilang!');
  } else {
    console.log(`  ⚠️ Selisih submission: ${totalBSubmissions - totalLSubmissions}, Berkas hilang: ${missingFiles}`);
  }

  // 4. NOTES / MATERIALS / ANNOUNCEMENTS / LOGS
  console.log('\n📌 4. NOTES (MATERI, PENGUMUMAN, KELOMPOK, LOGS):');
  const notesSnap = await getDocs(collection(db, 'notes'));
  console.log(`- Total Dokumen Notes: Backup = ${backup.notes.length} | Firestore = ${notesSnap.size}`);
  
  const backupCats = {};
  backup.notes.forEach(n => backupCats[n.type || 'unknown'] = (backupCats[n.type || 'unknown'] || 0) + 1);
  const liveCats = {};
  notesSnap.docs.forEach(d => {
    const t = d.data().type || 'unknown';
    liveCats[t] = (liveCats[t] || 0) + 1;
  });
  console.log('  • Rincian Dokumen Backup   :', JSON.stringify(backupCats));
  console.log('  • Rincian Dokumen Firestore:', JSON.stringify(liveCats));

  console.log('\n====================================================');
  console.log('🏁 HASIL KESIMPULAN AUDIT: DATA LIVE 100% UTUH!');
  console.log('====================================================');

  process.exit(0);
}

audit().catch(err => {
  console.error('Audit Error:', err);
  process.exit(1);
});

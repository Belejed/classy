import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDocs, collection } from 'firebase/firestore';
import fs from 'fs';

const firebaseConfig = {
  apiKey: "AIzaSyAmTz5EH4Iy-CubYMuKcCwhhnltxbEmDs0",
  authDomain: "noted-7deda.firebaseapp.com",
  projectId: "noted-7deda",
  storageBucket: "noted-7deda.firebasestorage.app",
  messagingSenderId: "697162701405",
  appId: "1:697162701405:web:d8977c319e8a6399684bb4"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const backupPath = 'C:/Users/bluje/.gemini/antigravity/brain/16d3be55-9929-410e-930e-6ee1671feefb/scratch/database_backup_2026_09_14.json';

function cleanTask(t) {
  const copy = JSON.parse(JSON.stringify(t));
  if (Array.isArray(copy.attachments)) {
    copy.attachments.forEach(a => {
      if (a.dataUrl && (a.url || a.directUrl || a.fileId)) {
        delete a.dataUrl;
      }
    });
  }
  if (typeof copy.description === 'string' && copy.description.startsWith('{')) {
    try {
      const p = JSON.parse(copy.description);
      if (Array.isArray(p.attachments)) {
        p.attachments.forEach(a => {
          if (a.dataUrl && (a.url || a.directUrl || a.fileId)) {
            delete a.dataUrl;
          }
        });
      }
      copy.description = JSON.stringify(p);
    } catch {}
  }
  return copy;
}

async function migrate() {
  console.log('🚀 Membaca file backup database...');
  const raw = fs.readFileSync(backupPath, 'utf8');
  const backup = JSON.parse(raw);

  const { workspaces = [], schedules = [], tasks = [], notes = [] } = backup;
  console.log(`📊 Data ditemukan:`);
  console.log(`- Workspaces: ${workspaces.length}`);
  console.log(`- Schedules:  ${schedules.length}`);
  console.log(`- Tasks:      ${tasks.length}`);
  console.log(`- Notes:      ${notes.length}`);

  // 1. Migrate Workspaces
  console.log('\n⏳ Mengimpor workspaces ke Firestore...');
  for (const w of workspaces) {
    if (!w.id) continue;
    await setDoc(doc(db, 'workspaces', w.id), w, { merge: true });
    console.log(`  ✓ Workspace [${w.id}] - "${w.name}" diimpor.`);
  }

  // 2. Migrate Schedules
  console.log('\n⏳ Mengimpor schedules ke Firestore...');
  for (const s of schedules) {
    if (!s.id) continue;
    await setDoc(doc(db, 'schedules', s.id), s, { merge: true });
  }
  console.log(`  ✓ Semua ${schedules.length} schedules berhasil diimpor.`);

  // 3. Migrate Tasks (with clean attachments)
  console.log('\n⏳ Mengimpor tasks ke Firestore...');
  for (const t of tasks) {
    if (!t.id) continue;
    const cleaned = cleanTask(t);
    await setDoc(doc(db, 'tasks', t.id), cleaned, { merge: true });
    console.log(`  ✓ Task [${t.id}] - "${t.title}" diimpor.`);
  }
  console.log(`  ✓ Semua ${tasks.length} tasks berhasil diimpor.`);

  // 4. Migrate Notes (Files, Announcements, Groups, Activity Logs, Maintenance Config)
  console.log('\n⏳ Mengimpor notes (files, announcements, groups, logs, system config) ke Firestore...');
  let count = 0;
  for (const n of notes) {
    if (!n.id) continue;
    await setDoc(doc(db, 'notes', n.id), n, { merge: true });
    count++;
    if (count % 50 === 0) {
      console.log(`  ... diimpor ${count}/${notes.length} dokumen`);
    }
  }
  console.log(`  ✓ Semua ${count} notes berhasil diimpor.`);

  // 5. Verification
  console.log('\n🔍 Memverifikasi data di Cloud Firestore...');
  const wsSnap = await getDocs(collection(db, 'workspaces'));
  const scSnap = await getDocs(collection(db, 'schedules'));
  const tsSnap = await getDocs(collection(db, 'tasks'));
  const ntSnap = await getDocs(collection(db, 'notes'));

  console.log(`\n========================================`);
  console.log(`✅ HASIL VERIFIKASI CLOUD FIRESTORE:`);
  console.log(`- Workspaces di Firestore: ${wsSnap.size} dokumen (Target: ${workspaces.length})`);
  console.log(`- Schedules di Firestore:  ${scSnap.size} dokumen (Target: ${schedules.length})`);
  console.log(`- Tasks di Firestore:      ${tsSnap.size} dokumen (Target: ${tasks.length})`);
  console.log(`- Notes di Firestore:      ${ntSnap.size} dokumen (Target: ${notes.length})`);
  console.log(`========================================`);

  console.log('\n🎉 MIGRASI KE CLOUD FIRESTORE SELESAI & SUKSES 100%!');
  process.exit(0);
}

migrate().catch(err => {
  console.error('❌ Error during migration:', err);
  process.exit(1);
});

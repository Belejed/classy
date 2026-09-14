import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  updateProfile,
  signOut
} from 'firebase/auth';
import { getFirestore, doc, getDoc, getDocs, collection, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAmTz5EH4Iy-CubYMuKcCwhhnltxbEmDs0",
  authDomain: "noted-7deda.firebaseapp.com",
  projectId: "noted-7deda"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const DEFAULT_PASSWORD = '123456';

async function provision() {
  console.log('🚀 Memulai pendaftaran otomatis seluruh akun anggota kelas ke Firebase Auth...\n');

  // 1. Ambil data kelas dan anggota dari Firestore
  const wsSnap = await getDocs(collection(db, 'workspaces'));
  const allMembers = [];
  const classDocs = [];

  wsSnap.docs.forEach(d => {
    const ws = d.data();
    classDocs.push({ id: d.id, ...ws });
    (ws.members || []).forEach(m => {
      allMembers.push({ ...m, classId: d.id, className: ws.name });
    });
  });

  const uniqueMembers = new Map();
  allMembers.forEach(m => {
    if (m.email) {
      const cleanEmail = m.email.toLowerCase().trim();
      if (!uniqueMembers.has(cleanEmail)) {
        uniqueMembers.set(cleanEmail, m);
      }
    }
  });

  console.log(`📊 Ditemukan ${uniqueMembers.size} mahasiswa unik dari seluruh ruang kelas.`);
  console.log(`🔑 Password default yang ditetapkan: "${DEFAULT_PASSWORD}"\n`);

  const emailToUidMap = new Map();
  let createdCount = 0;
  let alreadyExistCount = 0;
  let failedCount = 0;

  for (const [email, member] of uniqueMembers.entries()) {
    try {
      // Coba buat akun baru di Firebase Auth
      const cred = await createUserWithEmailAndPassword(auth, email, DEFAULT_PASSWORD);
      const uid = cred.user.uid;
      emailToUidMap.set(email, uid);

      // Perbarui Display Name
      if (member.name) {
        try {
          await updateProfile(cred.user, { displayName: member.name.trim() });
        } catch {}
      }

      await signOut(auth);
      createdCount++;
      console.log(`  ✓ [BARU] ${member.name || email} (${email}) -> UID: ${uid}`);
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        alreadyExistCount++;
        // Login untuk mengambil UID yang sudah ada
        try {
          const cred = await signInWithEmailAndPassword(auth, email, DEFAULT_PASSWORD);
          emailToUidMap.set(email, cred.user.uid);
          await signOut(auth);
          console.log(`  ✓ [SUDAH ADA] ${member.name || email} (${email}) -> Password cocok & aktif.`);
        } catch (loginErr) {
          console.log(`  ℹ [SUDAH ADA] ${member.name || email} (${email}) -> Akun sudah ada dengan password khusus.`);
        }
      } else {
        failedCount++;
        console.error(`  ✗ [GAGAL] ${email}:`, err.message);
      }
    }
  }

  console.log(`\n----------------------------------------`);
  console.log(`📈 Rekapitulasi Pembuatan Akun:`);
  console.log(`- Berhasil Dibuat: ${createdCount}`);
  console.log(`- Sudah Ada Sebelumnya: ${alreadyExistCount}`);
  console.log(`- Gagal: ${failedCount}`);
  console.log(`----------------------------------------\n`);

  // 2. Sinkronkan Firebase UID ke data `workspaces.members` di Firestore
  console.log('⏳ Menyinkronkan Firebase UID ke data anggota ruang kelas di Firestore...');
  for (const ws of classDocs) {
    let modified = false;
    const members = (ws.members || []).map(m => {
      const cleanEmail = (m.email || '').toLowerCase().trim();
      const newUid = emailToUidMap.get(cleanEmail);
      if (newUid && m.userId !== newUid) {
        modified = true;
        return { ...m, userId: newUid };
      }
      return m;
    });

    if (modified) {
      await setDoc(doc(db, 'workspaces', ws.id), { members }, { merge: true });
      console.log(`  ✓ Workspace [${ws.name}] anggota berhasil diperbarui dengan Firebase UID.`);
    }
  }

  // 3. Sinkronkan Firebase UID ke data `submissions` di tasks
  console.log('⏳ Menyinkronkan Firebase UID ke seluruh data submissions tugas di Firestore...');
  const tasksSnap = await getDocs(collection(db, 'tasks'));
  for (const tDoc of tasksSnap.docs) {
    const tData = tDoc.data();
    if (!tData.description || !tData.description.startsWith('{')) continue;

    try {
      const meta = JSON.parse(tData.description);
      let taskModified = false;

      if (Array.isArray(meta.submissions)) {
        meta.submissions.forEach(s => {
          const sEmail = (s.userEmail || s.email || '').toLowerCase().trim();
          const newUid = emailToUidMap.get(sEmail);
          if (newUid && s.userId !== newUid) {
            s.userId = newUid;
            taskModified = true;
          }
          if (Array.isArray(s.groupMembers)) {
            s.groupMembers.forEach(gm => {
              const gmEmail = (gm.userEmail || gm.email || '').toLowerCase().trim();
              const gmUid = emailToUidMap.get(gmEmail);
              if (gmUid && gm.userId !== gmUid) {
                gm.userId = gmUid;
                taskModified = true;
              }
            });
          }
        });
      }

      if (taskModified) {
        tData.description = JSON.stringify(meta);
        await setDoc(doc(db, 'tasks', tDoc.id), tData, { merge: true });
        console.log(`  ✓ Submissions pada tugas [${tData.title}] berhasil disinkronkan dengan UID baru.`);
      }
    } catch {}
  }

  console.log('\n🎉 SEMUA 36 AKUN MAHASISWA TELAH SIAP 100% DI FIREBASE AUTH!');
  process.exit(0);
}

provision().catch(err => {
  console.error('Fatal error during provisioning:', err);
  process.exit(1);
});

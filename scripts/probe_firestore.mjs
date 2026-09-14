import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAmTz5EH4Iy-CubYMuKcCwhhnltxbEmDs0",
  authDomain: "noted-7deda.firebaseapp.com",
  projectId: "noted-7deda"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const possibleNames = [
  'users', 'user', 'profiles', 'accounts',
  'notes', 'note',
  'todos', 'todo',
  'tasks', 'task',
  'journals', 'journal', 'journal_entries', 'journalEntries',
  'entries', 'entry',
  'categories', 'tags',
  'workspaces', 'workspace',
  'classes', 'class',
  'schedules', 'schedule',
  'files', 'file',
  'announcements', 'announcement',
  'groups', 'group',
  'logs', 'activity_logs', 'activityLogs',
  'settings', 'system',
  'folders', 'documents', 'items',
  'test', 'test_connection', 'debug_tasks',
  'submissions', 'komti', 'feedback', 'reminders', 'events'
];

async function probe() {
  console.log('🔍 Probing collections in Firebase project noted-7deda...');
  for (const name of possibleNames) {
    try {
      const snap = await getDocs(collection(db, name));
      if (snap.size > 0) {
        console.log(`\nFOUND: [${name}] - ${snap.size} documents`);
        const sample = snap.docs[0].data();
        console.log('  sample keys:', Object.keys(sample));
        snap.docs.slice(0, 5).forEach(d => {
          const data = d.data();
          console.log(`  - ID: ${d.id} | Title/Name: ${data.title || data.name || data.email || data.text || '(no name)'}`);
        });
      }
    } catch (err) {
      console.log(`Error checking [${name}]:`, err.message);
    }
  }
  process.exit(0);
}

probe();

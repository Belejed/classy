import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Replace the values below with your Firebase Project Configuration keys
// To use Firebase, replace placeholders with actual credentials.
// If left as placeholders, the app will run in "Offline Fallback Mode" (localStorage).
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAmTz5EH4Iy-CubYMuKcCwhhnltxbEmDs0",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "noted-7deda.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "noted-7deda",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "noted-7deda.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "697162701405",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:697162701405:web:d8977c319e8a6399684bb4"
};

// Helper to check if credentials are loaded
const isConfigured = 
  !!firebaseConfig.apiKey && 
  firebaseConfig.apiKey !== "YOUR_API_KEY" && 
  firebaseConfig.apiKey !== "";

let app;
let auth;
let db;

if (isConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    db = getFirestore(app);
    console.log("Firebase initialized successfully.");
  } catch (error) {
    console.error("Firebase initialization failed:", error);
  }
} else {
  console.warn("Firebase not configured. Running in Local Storage offline mode.");
}

export { auth, db, isConfigured };

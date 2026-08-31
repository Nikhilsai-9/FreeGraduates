import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile
} from "firebase/auth";

// Configured via Vite environment variables with fallback defaults
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAjPVPmtc-3cKQ69ZhChA_iAT3UcrrxwdQ",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "freegraduates.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "freegraduates",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "freegraduates.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "360518243392",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:360518243392:web:4316bebc06fae8eec47ba5"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export {
  auth,
  googleProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile
};

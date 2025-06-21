// src/firebase.ts

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyAaICU1qx0Jk_MLlnD1bMgPgCqHFEhQhGY",
  authDomain: "memo-app-b4d5f.firebaseapp.com",
  projectId: "memo-app-b4d5f",
  storageBucket: "memo-app-b4d5f.firebasestorage.app",
  messagingSenderId: "769939810631",
  appId: "1:769939810631:web:24d7fb6efd6db7bb480462"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
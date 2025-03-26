// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Your web app's Firebase configuration
// Replace these values with your actual Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBf4j7AO0wFlqcxlfM1-_d8vBsNPq58adk",
  authDomain: "catformmanager.firebaseapp.com",
  projectId: "catformmanager",
  storageBucket: "catformmanager.firebasestorage.app",
  messagingSenderId: "636865518310",
  appId: "1:636865518310:web:478beaa28c1f9d6233b927"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Your web app's Firebase configuration
// Replace these values with your actual Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCAlfH0KMzKJY6Rg7vMjCXGiuZhGtSboR0",
  authDomain: "catfm-48154.firebaseapp.com",
  projectId: "catfm-48154",
  storageBucket: "catfm-48154.firebasestorage.app",
  messagingSenderId: "754530976368",
  appId: "1:754530976368:web:5cdd758e3edd7dd7d9aab5",
  measurementId: "G-YNWS78BCGP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
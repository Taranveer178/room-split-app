import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getFirestore,
  onSnapshot,
  setDoc,
} from 'firebase/firestore';

const firebaseConfig = {

  apiKey: 'AIzaSyCOJBE94_PA5RYG4pZ83zYpKszPndDx5a4',
  authDomain: 'roomsplit-86601.firebaseapp.com',
  projectId: 'roomsplit-86601',
  storageBucket: 'roomsplit-86601.firebasestorage.app',
  messagingSenderId: '6706257446',
  appId: '1:6706257446:web:7d7f65518aea493cc310e7',
};

export const hasFirebase = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

let db = null;
let auth = null;

if (hasFirebase) {
  try {
    const firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    db = getFirestore(firebaseApp);
    auth = getAuth(firebaseApp);
  } catch (error) {
    console.error('Firebase init failed:', error);
  }
}

export { auth, collection, db, deleteDoc, doc, onSnapshot, setDoc, signInAnonymously };
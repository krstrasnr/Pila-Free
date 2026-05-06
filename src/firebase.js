import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
// Get this from Firebase Console → Project settings → General → Your apps → Web app
const firebaseConfig = {
  apiKey: "AIzaSyDQDvUaumqSwG82vs2gBrzGACvYWffgqps",
  authDomain: "pcu-pilafree.firebaseapp.com",
  projectId: "pcu-pilafree",
  storageBucket: "pcu-pilafree.firebasestorage.app",
  messagingSenderId: "491214832556",
  appId: "1:491214832556:web:a9f1e7c829ce7ef35b7009",
  measurementId: "G-2CQB4R91NC"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
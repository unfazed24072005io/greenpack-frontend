import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDWpHcHstlfpKkxYoEbxURtroAPFKvdFS0",
  authDomain: "accountpro-de1d4.firebaseapp.com",
  projectId: "accountpro-de1d4",
  storageBucket: "accountpro-de1d4.firebasestorage.app",
  messagingSenderId: "820451589200",
  appId: "1:820451589200:web:d8b07a4fcccabd2d526555",
  measurementId: "G-25ZNG2EK0L"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDXLszI3freBo7U9XZC3WMojuX7rIGLsQk",
  authDomain: "language-island-v2.firebaseapp.com",
  projectId: "language-island-v2",
  storageBucket: "language-island-v2.firebasestorage.app",
  messagingSenderId: "418225731357",
  appId: "1:418225731357:web:00ca392b915adbc54f13f4",
  measurementId: "G-LYMDSNQQE2",
};

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(firebaseApp);
export const firestore = getFirestore(firebaseApp);

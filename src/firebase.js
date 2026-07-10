import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDjvoZIZdmmsjAzikRUXe0mUra-KJ8lFF8",
  authDomain: "fafc-os.firebaseapp.com",
  projectId: "fafc-os",
  storageBucket: "fafc-os.firebasestorage.app",
  messagingSenderId: "646293777879",
  appId: "1:646293777879:web:1e6eaa7bc39845bb8e2f92"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);

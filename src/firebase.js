import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDZl78n3XAPC8XCz3cCDAcGoZnhbwSLgDM",
  authDomain: "flowcast-fnf.firebaseapp.com",
  projectId: "flowcast-fnf",
  storageBucket: "flowcast-fnf.firebasestorage.app",
  messagingSenderId: "611488372803",
  appId: "1:611488372803:web:0c895ab005f92e5dd19cf6"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);

// Import fungsi yang dibutuhkan dari Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// GANTI dengan data dari Firebase Console kamu!
const firebaseConfig = {
    apiKey: "AIzaSyC1lcJb2efD5Ik1FYgchwQM-yAO6k8a6iU",
    authDomain: "toko-online-saya-9b69b.firebaseapp.com",
    projectId: "toko-online-saya-9b69b",
    storageBucket: "toko-online-saya-9b69b.firebasestorage.app",
    messagingSenderId: "1027876534694",
    appId: "1:1027876534694:web:9e70b933cb8c3e22b9b767"
  };

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Ekspor agar bisa dipakai di file JS lain
export { db, auth };
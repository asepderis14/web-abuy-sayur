import { auth } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Cek status login
onAuthStateChanged(auth, (user) => {
    if (!user) {
        // Jika tidak ada user yang login, arahkan ke login.html
        window.location.href = 'login.html';
    }
});

// Fungsi Logout (Bisa dipasang di tombol keluar)
window.logoutAdmin = () => {
    auth.signOut().then(() => {
        window.location.href = 'login.html';
    }).catch((error) => {
        console.error("Error logout:", error);
        alert("Gagal logout: " + error.message);
    });
};
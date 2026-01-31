import { db, auth } from './firebase-config.js';
import { collection, addDoc, onSnapshot, deleteDoc, doc, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import './auth-check.js';

const form = document.getElementById('menu-form');

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-save');
    btn.disabled = true; btn.innerText = "Uploading...";

    const file = document.getElementById('image').files[0];
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'preset_toko'); // GANTI INI

    const res = await fetch('https://api.cloudinary.com/v1_1/dxoldybca/image/upload', { // GANTI INI
        method: 'POST', body: formData
    });
    const imgData = await res.json();

    await addDoc(collection(db, "menus"), {
        name: document.getElementById('name').value,
        price: Number(document.getElementById('price').value),
        image: imgData.secure_url,
        createdAt: new Date()
    });

    alert("Berhasil!"); form.reset();
    btn.disabled = false; btn.innerText = "Simpan ke Database";
});

onSnapshot(query(collection(db, "menus"), orderBy("createdAt", "desc")), (snap) => {
    const list = document.getElementById('menu-list');
    list.innerHTML = "";
    snap.forEach(d => {
        const item = d.data();
        list.innerHTML += `
            <div class="card">
                <img src="${item.image}">
                <div class="card-content">
                    <h4>${item.name}</h4>
                    <p style="color:var(--primary); font-weight:bold">Rp ${item.price.toLocaleString()}</p>
                    <button class="btn-danger" onclick="hapus('${d.id}')">Hapus</button>
                </div>
            </div>`;
    });
});
window.hapus = async (id) => { if(confirm("Hapus?")) await deleteDoc(doc(db, "menus", id)); };
document.getElementById('logout').onclick = () => signOut(auth).then(() => location.href="login.html");
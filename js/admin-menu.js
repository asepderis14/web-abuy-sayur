import { db } from './firebase-config.js';
import { collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const menuForm = document.getElementById('menu-form');
const menuTableBody = document.getElementById('menu-table-body');

// 1. FUNGSI MENAMBAH MENU BARU
menuForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('name').value;
    const price = Number(document.getElementById('price').value);
    const category = document.getElementById('category').value;
    const unit = document.getElementById('unit').value;
    const fileInput = document.getElementById('file-input');

    // Karena kita tidak pakai Firebase Storage (untuk simpelnya), 
    // kita ubah gambar jadi URL Base64 agar bisa disimpan langsung di Firestore
    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = async () => {
        const base64Image = reader.result;

        try {
            await addDoc(collection(db, "menus"), {
                name: name,
                price: price,
                category: category,
                unit: unit,
                image: base64Image,
                status: "Tersedia", // Status default saat baru ditambah
                createdAt: serverTimestamp()
            });

            alert("Menu Berhasil Ditambahkan!");
            menuForm.reset();
        } catch (error) {
            console.error("Gagal menambah menu: ", error);
            alert("Terjadi kesalahan saat menyimpan ke Database.");
        }
    };

    if (file) {
        reader.readAsDataURL(file);
    } else {
        alert("Silakan pilih foto menu terlebih dahulu!");
    }
});

// 2. FUNGSI MENAMPILKAN DAFTAR MENU (REAL-TIME)
onSnapshot(collection(db, "menus"), (snapshot) => {
    menuTableBody.innerHTML = "";
    snapshot.forEach((docSnap) => {
        const item = docSnap.data();
        const id = docSnap.id;
        const isHabis = item.status === "Habis";

        menuTableBody.innerHTML += `
            <tr>
                <td><img src="${item.image}" style="width:50px; height:50px; object-fit:cover; border-radius:5px;"></td>
                <td>
                    <strong>${item.name}</strong><br>
                    <small style="color:#888">${item.category}</small>
                </td>
                <td>Rp ${Number(item.price).toLocaleString('id-ID')} / ${item.unit}</td>
                <td style="text-align:center;">
                    <span style="padding:4px 8px; border-radius:5px; font-size:0.75rem; background:${isHabis ? '#ff7675' : '#00b894'}; color:white;">
                        ${item.status}
                    </span>
                </td>
                <td style="text-align:center;">
                    <div style="display:flex; gap:5px; justify-content:center;">
                        <button onclick="toggleStok('${id}', '${item.status}')" style="background:#f1c40f; border:none; padding:5px 10px; border-radius:5px; cursor:pointer; color:white;">
                            <i class="fa fa-sync"></i> Set ${isHabis ? 'Tersedia' : 'Habis'}
                        </button>
                        <button onclick="hapusMenu('${id}')" style="background:#e74c3c; border:none; padding:5px 10px; border-radius:5px; cursor:pointer; color:white;">
                            <i class="fa fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
});

// 3. FUNGSI UBAH STATUS STOK
window.toggleStok = async (id, currentStatus) => {
    const newStatus = currentStatus === "Tersedia" ? "Habis" : "Tersedia";
    try {
        await updateDoc(doc(db, "menus", id), { status: newStatus });
    } catch (error) {
        alert("Gagal memperbarui status.");
    }
};

// 4. FUNGSI HAPUS MENU
window.hapusMenu = async (id) => {
    if (confirm("Apakah Anda yakin ingin menghapus menu ini?")) {
        try {
            await deleteDoc(doc(db, "menus", id));
        } catch (error) {
            alert("Gagal menghapus menu.");
        }
    }
};
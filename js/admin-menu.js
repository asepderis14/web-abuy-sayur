import { db } from './firebase-config.js';
import { collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const menuForm = document.getElementById('menu-form');
const menuTableBody = document.getElementById('menu-table-body');
const btnSave = document.getElementById('btn-save');

/**
 * Fungsi kompresi gambar menggunakan Canvas
 * @param {File} file - File gambar yang dipilih user
 * @param {number} maxSizeMB - Ukuran maksimal dalam MB (default 1 MB)
 * @param {number} maxWidth - Lebar maksimal piksel (default 1024px)
 * @returns {Promise<string>} - Base64 gambar yang sudah dikompresi
 */
function compressImage(file, maxSizeMB = 1, maxWidth = 1024) {
    return new Promise((resolve, reject) => {
        // Batas ukuran dalam byte
        const maxSize = maxSizeMB * 1024 * 1024;
        
        // Jika file sudah di bawah maxSize dan tidak perlu kompresi? 
        // Tetap kita kompres untuk optimasi, atau bisa lewati jika <= 1MB dan dimensi kecil.
        // Tapi lebih baik kompres dengan kualitas sedang agar loading cepat.
        
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (e) => {
            const img = new Image();
            img.src = e.target.result;
            img.onload = () => {
                // Hitung dimensi baru dengan mempertahankan rasio aspek
                let width = img.width;
                let height = img.height;
                
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }
                
                // Buat canvas
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                // Mulai dengan kualitas 0.8
                let quality = 0.8;
                let compressedBase64 = canvas.toDataURL('image/jpeg', quality);
                
                // Fungsi untuk mendapatkan ukuran base64 dalam byte (kurang lebih)
                const getBase64Size = (base64) => {
                    // Hapus header data:image/jpeg;base64,
                    const base64Data = base64.split(',')[1];
                    return Math.ceil((base64Data.length * 3) / 4); // ukuran dalam byte
                };
                
                // Iterasi menurunkan kualitas hingga ukuran <= maxSize
                while (getBase64Size(compressedBase64) > maxSize && quality > 0.1) {
                    quality -= 0.1;
                    compressedBase64 = canvas.toDataURL('image/jpeg', quality);
                }
                
                resolve(compressedBase64);
            };
            img.onerror = () => reject(new Error('Gagal memuat gambar'));
        };
        reader.onerror = () => reject(new Error('Gagal membaca file'));
    });
}

// 1. FUNGSI MENAMBAH MENU BARU DENGAN KOMPRESI GAMBAR
menuForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('name').value;
    const price = Number(document.getElementById('price').value);
    const category = document.getElementById('category').value;
    const unit = document.getElementById('unit').value;
    const fileInput = document.getElementById('file-input');

    const file = fileInput.files[0];
    
    if (!file) {
        alert("Silakan pilih foto menu terlebih dahulu!");
        return;
    }

    // Validasi tipe file
    if (!file.type.startsWith('image/')) {
        alert("File harus berupa gambar!");
        return;
    }

    // Simpan teks asli tombol
    const originalText = btnSave.innerHTML;
    btnSave.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Mengompresi gambar...';
    btnSave.disabled = true;

    try {
        // Kompres gambar (target max 1 MB)
        const compressedBase64 = await compressImage(file, 1, 1024);
        
        btnSave.innerHTML = '<i class="fa fa-cloud-upload-alt"></i> Menyimpan...';
        
        await addDoc(collection(db, "menus"), {
            name: name,
            price: price,
            category: category,
            unit: unit,
            image: compressedBase64, // Hasil kompresi
            status: "Tersedia",
            createdAt: serverTimestamp()
        });

        alert("✅ Menu Berhasil Ditambahkan dengan gambar terkompresi!");
        menuForm.reset();
        
        // Reset file input secara manual (karena reset() tidak selalu menghapus file)
        fileInput.value = '';
        
    } catch (error) {
        console.error("Gagal menambah menu: ", error);
        alert("❌ Terjadi kesalahan: " + error.message);
    } finally {
        btnSave.innerHTML = originalText;
        btnSave.disabled = false;
    }
});

// 2. FUNGSI MENAMPILKAN DAFTAR MENU (REAL-TIME)
onSnapshot(collection(db, "menus"), (snapshot) => {
    menuTableBody.innerHTML = "";
    
    if (snapshot.empty) {
        menuTableBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align:center; padding:20px;">
                    Belum ada menu. Silakan tambahkan menu baru.
                </td>
            </tr>
        `;
        return;
    }
    
    snapshot.forEach((docSnap) => {
        const item = docSnap.data();
        const id = docSnap.id;
        const isHabis = item.status === "Habis";

        menuTableBody.innerHTML += `
            <tr>
                <td><img src="${item.image || 'logo.png'}" style="width:50px; height:50px; object-fit:cover; border-radius:5px;"></td>
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
}, (error) => {
    console.error("Error membaca data:", error);
    menuTableBody.innerHTML = `
        <tr>
            <td colspan="5" style="text-align:center; padding:20px; color:red;">
                Gagal memuat data. Error: ${error.message}
            </td>
        </tr>
    `;
});

// 3. FUNGSI UBAH STATUS STOK
window.toggleStok = async (id, currentStatus) => {
    const newStatus = currentStatus === "Tersedia" ? "Habis" : "Tersedia";
    try {
        await updateDoc(doc(db, "menus", id), { status: newStatus });
    } catch (error) {
        alert("Gagal memperbarui status: " + error.message);
    }
};

// 4. FUNGSI HAPUS MENU
window.hapusMenu = async (id) => {
    if (confirm("Apakah Anda yakin ingin menghapus menu ini?")) {
        try {
            await deleteDoc(doc(db, "menus", id));
        } catch (error) {
            alert("Gagal menghapus menu: " + error.message);
        }
    }
};
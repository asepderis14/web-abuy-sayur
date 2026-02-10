import { db } from './firebase-config.js';
import { collection, onSnapshot, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let cart = JSON.parse(localStorage.getItem('abuyCart')) || [];
let allData = [];

// FUNGSI CEK ELEMENT
const getEl = (id) => document.getElementById(id);

console.log("Sistem dimulai, mencoba menghubungi Firebase...");

// 1. Ambil Data & Render Otomatis
onSnapshot(collection(db, "menus"), (snap) => {
    try {
        if (snap.empty) {
            console.warn("Database Kosong! Tidak ada data di koleksi 'menus'.");
            if(getEl('product-list')) getEl('product-list').innerHTML = "<p style='text-align:center; padding:50px;'>Database kosong. Silakan isi menu di Panel Admin.</p>";
            return;
        }

        allData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log("Data Berhasil Dimuat:", allData);

        const categories = ['Semua', ...new Set(allData.map(item => item.category || 'Lainnya'))];
        renderTabs(categories);
        renderProducts(allData);

    } catch (err) {
        console.error("Gagal memproses data:", err);
        alert("Terjadi kesalahan pembacaan data: " + err.message);
    }
}, (error) => {
    console.error("Firebase Error:", error.code);
    if (error.code === 'permission-denied') {
        alert("Akses Ditolak! Harap buka Firebase Console > Firestore > Rules dan ubah menjadi: allow read, write: if true;");
    } else {
        alert("Koneksi Firebase bermasalah: " + error.message);
    }
});

function renderProducts(items) {
    const list = getEl('product-list');
    if(!list) return console.error("Elemen 'product-list' tidak ditemukan di index.html!");

    list.innerHTML = items.map(p => {
        const isHabis = p.status === "Habis";
        const price = Number(p.price) || 0;
        
        return `
            <div class="product-card" style="position: relative; border:1px solid #eee; padding:10px; border-radius:10px; ${isHabis ? 'filter: grayscale(1); opacity: 0.6;' : ''}">
                <div style="position: relative; overflow: hidden; height: 150px; border-radius: 8px; background: #eee;">
                    <img src="${p.image || 'logo.png'}" style="width:100%; height:100%; object-fit:cover;">
                    ${isHabis ? 
                        `<div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-15deg); 
                            background: red; color: white; padding: 5px 10px; font-weight: bold; border: 2px solid white; z-index: 10;">
                            STOK HABIS
                        </div>` 
                        : ''}
                </div>
                <h4 style="margin: 10px 0 5px; font-size:1rem;">${p.name || 'Produk'}</h4>
                <p style="color: #00b894; font-weight: bold; margin: 0;">
                    Rp ${price.toLocaleString('id-ID')} <span style="font-weight:normal; color:#888; font-size:0.8rem;">/ ${p.unit || 'pcs'}</span>
                </p>
                <button class="btn-buy" 
                    ${isHabis ? 'disabled' : `onclick="addToCart('${p.name}', ${price}, '${p.unit}')"`}
                    style="width: 100%; margin-top: 10px; background: ${isHabis ? '#ccc' : '#003366'}; color:white; border:none; padding:8px; border-radius:5px; cursor:${isHabis ? 'not-allowed' : 'pointer'};">
                    ${isHabis ? 'Habis' : 'Tambah'}
                </button>
            </div>
        `;
    }).join('');
}

function renderTabs(cats) {
    const container = getEl('category-tabs');
    if(!container) return;
    container.innerHTML = cats.map(c => `
        <button class="cat-tab" onclick="filterCat('${c}', this)" style="padding:8px 15px; margin-right:5px; border-radius:20px; border:1px solid #00b894; background:white; cursor:pointer;">${c}</button>
    `).join('');
}

let currentCategory = 'Semua';
let currentSearchKeyword = '';

window.filterCat = (cat, el) => {
    currentCategory = cat;
    applyFilters();
    
    // Update tab aktif
    const tabs = document.querySelectorAll('.cat-tab');
    tabs.forEach(tab => {
        tab.style.background = 'white';
        tab.style.color = '#666';
    });
    el.style.background = '#003366';
    el.style.color = 'white';
};

window.searchProduct = function() {
    const searchInput = getEl('search-input');
    if (!searchInput) return;
    
    currentSearchKeyword = searchInput.value.toLowerCase().trim();
    applyFilters();
};

function applyFilters() {
    let filtered = allData;
    
    // Filter berdasarkan kategori
    if (currentCategory !== 'Semua') {
        filtered = filtered.filter(p => p.category === currentCategory);
    }
    
    // Filter berdasarkan kata kunci pencarian
    if (currentSearchKeyword) {
        filtered = filtered.filter(item => {
            const nameMatch = item.name && item.name.toLowerCase().includes(currentSearchKeyword);
            const categoryMatch = item.category && item.category.toLowerCase().includes(currentSearchKeyword);
            return nameMatch || categoryMatch;
        });
    }
    
    renderProducts(filtered);
}

// FUNGSI KERANJANG BELANJA YANG DIPERBAIKI
window.addToCart = (name, price, unit) => {
    const item = cart.find(i => i.name === name);
    if (item) {
        item.qty++;
    } else {
        cart.push({ 
            name: name, 
            price: price, 
            qty: 1, 
            unit: unit,
            subtotal: price
        });
    }
    updateUI();
};

window.increaseQty = (index) => {
    if (cart[index]) {
        cart[index].qty++;
        cart[index].subtotal = cart[index].price * cart[index].qty;
        updateUI();
    }
};

window.decreaseQty = (index) => {
    if (cart[index] && cart[index].qty > 1) {
        cart[index].qty--;
        cart[index].subtotal = cart[index].price * cart[index].qty;
        updateUI();
    }
};

window.removeItem = (index) => {
    if (confirm(`Hapus ${cart[index].name} dari keranjang?`)) {
        cart.splice(index, 1);
        updateUI();
    }
};

function updateUI() {
    // Hitung subtotal untuk setiap item
    cart.forEach(item => {
        item.subtotal = item.price * item.qty;
    });
    
    localStorage.setItem('abuyCart', JSON.stringify(cart));
    
    // Update jumlah item di icon keranjang
    const totalQty = cart.reduce((total, item) => total + item.qty, 0);
    if(getEl('cart-count')) getEl('cart-count').innerText = totalQty;
    
    // Update total harga
    const totalPrice = cart.reduce((total, item) => total + item.subtotal, 0);
    if(getEl('cart-total')) getEl('cart-total').innerText = `Rp ${totalPrice.toLocaleString('id-ID')}`;
    
    // Render daftar item di keranjang
    const list = getEl('cart-items-list');
    if(!list) return;
    
    if (cart.length === 0) {
        list.innerHTML = `
            <div style="text-align:center; padding:40px 20px; color:#888;">
                <i class="fa fa-shopping-basket" style="font-size:3rem; margin-bottom:15px; opacity:0.3;"></i>
                <p>Keranjang belanja kosong</p>
                <small>Tambahkan produk dari katalog</small>
            </div>
        `;
        return;
    }
    
    list.innerHTML = cart.map((item, i) => {
        const itemTotal = item.price * item.qty;
        return `
            <div style="border-bottom:1px solid #eee; padding:15px 0;">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px;">
                    <div style="flex:1;">
                        <b style="display:block; margin-bottom:5px;">${item.name}</b>
                        <small style="color:#666;">Rp ${item.price.toLocaleString('id-ID')} / ${item.unit}</small>
                    </div>
                    <button onclick="removeItem(${i})" style="color:#e74c3c; border:none; background:none; cursor:pointer; font-size:1.2rem; padding:0 5px;">
                        <i class="fa fa-trash"></i>
                    </button>
                </div>
                
                <div style="display:flex; justify-content:space-between; align-items:center; background:#f8f9fa; padding:10px; border-radius:8px;">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <button onclick="decreaseQty(${i})" style="width:30px; height:30px; border-radius:50%; border:1px solid #ddd; background:white; cursor:pointer; font-size:1rem;">
                            -
                        </button>
                        <span style="font-weight:bold; min-width:30px; text-align:center;">${item.qty}</span>
                        <button onclick="increaseQty(${i})" style="width:30px; height:30px; border-radius:50%; border:1px solid #ddd; background:white; cursor:pointer; font-size:1rem;">
                            +
                        </button>
                        <span style="color:#666; margin-left:10px;">${item.unit}</span>
                    </div>
                    
                    <div style="text-align:right;">
                        <div style="font-weight:bold; color:#003366; font-size:1rem;">
                            Rp ${itemTotal.toLocaleString('id-ID')}
                        </div>
                        <small style="color:#666;">
                            Subtotal: ${item.qty} × Rp ${item.price.toLocaleString('id-ID')}
                        </small>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    // Tambahkan ringkasan belanja
    const summary = document.getElementById('cart-summary');
    if (!summary) {
        const summaryHTML = `
            <div id="cart-summary" style="margin-top:20px; border-top:2px solid #eee; padding-top:15px;">
                <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                    <span>Jumlah Item:</span>
                    <span style="font-weight:bold;">${totalQty} item</span>
                </div>
                <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                    <span>Total Belanja:</span>
                    <span style="font-weight:bold;">Rp ${totalPrice.toLocaleString('id-ID')}</span>
                </div>
                <div style="display:flex; justify-content:space-between; font-weight:bold; font-size:1.1rem; margin:15px 0; padding-top:10px; border-top:1px dashed #ddd;">
                    <span>Total Bayar:</span>
                    <span style="color:#00b894;">Rp ${totalPrice.toLocaleString('id-ID')}</span>
                </div>
            </div>
        `;
        list.insertAdjacentHTML('beforeend', summaryHTML);
    } else {
        summary.innerHTML = `
            <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                <span>Jumlah Item:</span>
                <span style="font-weight:bold;">${totalQty} item</span>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                <span>Total Belanja:</span>
                <span style="font-weight:bold;">Rp ${totalPrice.toLocaleString('id-ID')}</span>
            </div>
            <div style="display:flex; justify-content:space-between; font-weight:bold; font-size:1.1rem; margin:15px 0; padding-top:10px; border-top:1px dashed #ddd;">
                <span>Total Bayar:</span>
                <span style="color:#00b894;">Rp ${totalPrice.toLocaleString('id-ID')}</span>
            </div>
        `;
    }
}

updateUI();

// FUNGSI TOGGLE KERANJANG
window.toggleCart = function() {
    const sidebar = document.getElementById('cart-sidebar');
    const overlay = document.getElementById('cart-overlay');
    
    if (sidebar.style.display === 'block') {
        sidebar.style.display = 'none';
        overlay.style.display = 'none';
    } else {
        sidebar.style.display = 'block';
        overlay.style.display = 'block';
        // Update UI saat keranjang dibuka
        updateUI();
    }
};

// FUNGSI KIRIM PESANAN
window.sendOrder = async function() {
    const name = getEl('cust-name').value.trim();
    const address = getEl('cust-address').value.trim();
    const note = getEl('cust-note').value.trim();

    if (!name || !address) {
        alert('Harap isi nama dan alamat pengiriman!');
        return;
    }

    if (cart.length === 0) {
        alert('Keranjang belanja masih kosong!');
        return;
    }

    const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    
    const orderData = {
        customerName: name,
        address: address,
        note: note,
        items: cart.map(item => ({
            name: item.name,
            price: item.price,
            qty: item.qty,
            unit: item.unit,
            subtotal: item.price * item.qty
        })),
        total: total,
        status: 'Baru',
        createdAt: serverTimestamp()
    };

    try {
        await addDoc(collection(db, "orders"), orderData);
        alert('✅ Pesanan berhasil dikirim! Admin akan segera memproses.');
        
        // Reset keranjang dan form
        cart = [];
        localStorage.setItem('abuyCart', JSON.stringify(cart));
        updateUI();
        getEl('cust-name').value = '';
        getEl('cust-address').value = '';
        getEl('cust-note').value = '';
        
        // Tutup sidebar
        toggleCart();
    } catch (error) {
        console.error('Error sending order:', error);
        alert('❌ Terjadi kesalahan saat mengirim pesanan: ' + error.message);
    }
};
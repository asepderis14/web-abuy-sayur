import { db } from './firebase-config.js';
import { collection, onSnapshot, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let cart = JSON.parse(localStorage.getItem('abuyCart')) || [];
let allData = [];

// 1. Ambil Data & Render Otomatis
onSnapshot(collection(db, "menus"), (snap) => {
    allData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    const categories = ['Semua', ...new Set(allData.map(item => item.category || 'Lainnya'))];
    renderTabs(categories);
    renderProducts(allData);
});

// FITUR CARI
window.searchProduct = () => {
    const key = document.getElementById('search-input').value.toLowerCase();
    const filtered = allData.filter(p => p.name.toLowerCase().includes(key));
    renderProducts(filtered);
};

function renderTabs(cats) {
    const container = document.getElementById('category-tabs');
    if(container) {
        container.innerHTML = cats.map(c => `
            <div class="cat-tab ${c === 'Semua' ? 'active' : ''}" onclick="filterCat('${c}', this)">${c}</div>
        `).join('');
    }
}

window.filterCat = (cat, el) => {
    document.querySelectorAll('.cat-tab').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
    renderProducts(cat === 'Semua' ? allData : allData.filter(p => p.category === cat));
};

// RENDER KATALOG DENGAN LOGIKA STOK HABIS
function renderProducts(items) {
    const list = document.getElementById('product-list');
    if(!list) return;
    
    list.innerHTML = items.map(p => {
        const isHabis = p.status === "Habis";
        return `
            <div class="product-card" style="position: relative; ${isHabis ? 'filter: grayscale(1); opacity: 0.8;' : ''}">
                <div style="position: relative; overflow: hidden; border-radius: 10px;">
                    <img src="${p.image || 'logo.png'}" style="width: 100%; height: 150px; object-fit: cover;">
                    ${isHabis ? `
                        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-15deg); 
                            background: #e74c3c; color: white; padding: 5px 10px; font-weight: bold; border: 2px solid white; z-index: 2;">
                            STOK HABIS
                        </div>
                    ` : ''}
                </div>
                <h4 style="margin: 10px 0 5px;">${p.name}</h4>
                <p style="color: #00b894; font-weight: bold; margin: 0;">
                    Rp ${Number(p.price).toLocaleString('id-ID')} 
                    <span style="font-size: 0.8rem; color: #888; font-weight: normal;">/ ${p.unit}</span>
                </p>
                <button class="btn-buy" 
                    ${isHabis ? 'disabled' : `onclick="addToCart('${p.name}', ${p.price}, '${p.unit}')"`}
                    style="width: 100%; margin-top: 10px; ${isHabis ? 'background: #ccc; cursor: not-allowed;' : ''}">
                    ${isHabis ? 'Habis' : 'Tambah'}
                </button>
            </div>
        `;
    }).join('');
}

// 2. LOGIKA KERANJANG
window.toggleCart = () => {
    const s = document.getElementById('cart-sidebar');
    const o = document.getElementById('cart-overlay');
    if(!s) return;
    const isHidden = s.style.display === 'none' || s.style.display === '';
    s.style.display = isHidden ? 'block' : 'none';
    o.style.display = isHidden ? 'block' : 'none';
};

window.addToCart = (name, price, unit) => {
    const item = cart.find(i => i.name === name);
    if (item) item.qty++; else cart.push({ name, price, qty: 1, unit: unit });
    updateUI();
};

window.changeQty = (i, d) => {
    cart[i].qty += d;
    if (cart[i].qty <= 0) cart.splice(i, 1);
    updateUI();
};

window.removeItem = (i) => { cart.splice(i, 1); updateUI(); };

function updateUI() {
    localStorage.setItem('abuyCart', JSON.stringify(cart));
    const countEl = document.getElementById('cart-count');
    if(countEl) countEl.innerText = cart.reduce((a, b) => a + b.qty, 0);
    
    const itemList = document.getElementById('cart-items-list');
    if(!itemList) return;
    
    itemList.innerHTML = cart.map((item, i) => `
        <div style="border-bottom: 1px solid #eee; padding: 10px 0;">
            <div style="font-weight: bold; color: #003366;">${item.name}</div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 5px;">
                <div style="font-size: 0.9rem;">
                    <span style="background: #fff3cd; color: #e67e22; padding: 2px 6px; border-radius: 4px; font-weight: bold;">${item.qty}</span> ${item.unit} 
                    <span style="color: #999;"> x </span> Rp ${item.price.toLocaleString('id-ID')}
                </div>
                <div style="display: flex; gap: 5px;">
                    <button onclick="changeQty(${i},-1)" style="border: 1px solid #ddd; background: white; padding: 2px 8px;">-</button>
                    <button onclick="changeQty(${i},1)" style="border: 1px solid #ddd; background: white; padding: 2px 8px;">+</button>
                    <button onclick="removeItem(${i})" style="color: red; border: none; background: none; margin-left: 5px;"><i class="fa fa-trash"></i></button>
                </div>
            </div>
            <div style="text-align: right; font-size: 0.85rem; font-weight: bold; color: #00b894; margin-top: 5px;">
                Subtotal: Rp ${(item.price * item.qty).toLocaleString('id-ID')}
            </div>
        </div>
    `).join('');

    const total = cart.reduce((acc, i) => acc + (i.price * i.qty), 0);
    const totalEl = document.getElementById('cart-total');
    if(totalEl) totalEl.innerText = `Rp ${total.toLocaleString('id-ID')}`;
}

// 3. KIRIM PESANAN
window.sendOrder = async () => {
    const n = document.getElementById('cust-name').value;
    const a = document.getElementById('cust-address').value;
    const c = document.getElementById('cust-note').value; 

    if(!n || !a || cart.length === 0) return alert("Lengkapi Nama & Alamat!");

    try {
        await addDoc(collection(db, "orders"), {
            customerName: n,
            address: a,
            note: c || "", 
            items: cart,
            total: cart.reduce((acc, i) => acc + (i.price * i.qty), 0),
            status: "Baru",
            createdAt: serverTimestamp()
        });
        alert("Pesanan Berhasil Dikirim!");
        cart = []; updateUI(); toggleCart();
        document.getElementById('cust-note').value = "";
    } catch (e) { alert("Gagal mengirim pesanan."); }
};

updateUI();
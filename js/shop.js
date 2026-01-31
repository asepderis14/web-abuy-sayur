import { db } from './firebase-config.js';
import { collection, onSnapshot, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let cart = JSON.parse(localStorage.getItem('tokoCart')) || [];
let allMenus = [];

onSnapshot(collection(db, "menus"), (snapshot) => {
    allMenus = [];
    snapshot.forEach(doc => allMenus.push(doc.data()));
    render(allMenus);
});

function render(menus) {
    const list = document.getElementById('product-list');
    list.innerHTML = menus.map(item => `
        <div class="card">
            <img src="${item.image}">
            <div class="card-content">
                <h4>${item.name}</h4>
                <p>Rp ${item.price.toLocaleString('id-ID')}</p>
                <button onclick="addToCart('${item.name}', ${item.price})">Tambah</button>
            </div>
        </div>`).join('');
}

document.getElementById('search-input').oninput = (e) => {
    const keyword = e.target.value.toLowerCase();
    const filtered = allMenus.filter(m => m.name.toLowerCase().includes(keyword));
    render(filtered);
};

window.addToCart = (name, price) => {
    cart.push({name, price});
    updateUI();
};

window.toggleCart = () => {
    const m = document.getElementById('cart-modal');
    m.style.display = m.style.display === 'none' ? 'block' : 'none';
};

function updateUI() {
    localStorage.setItem('tokoCart', JSON.stringify(cart));
    document.getElementById('cart-count').innerText = `🛒 ${cart.length}`;
    const itemsDiv = document.getElementById('cart-items');
    itemsDiv.innerHTML = cart.map((item, i) => `
        <div style="display:flex; justify-content:space-between; padding:5px 0; border-bottom:1px solid #eee">
            <span>${item.name}</span>
            <span>Rp ${item.price.toLocaleString()} <button onclick="remove(${i})" style="width:auto; padding:0 5px" class="btn-danger">x</button></span>
        </div>`).join('');
    const total = cart.reduce((a, b) => a + b.price, 0);
    document.getElementById('cart-total').innerText = `Rp ${total.toLocaleString('id-ID')}`;
}

window.remove = (i) => { cart.splice(i,1); updateUI(); };

window.checkout = async () => {
    if(!cart.length) return alert("Keranjang kosong!");
    const nama = prompt("Nama Lengkap:");
    if(!nama) return;
    const catatan = document.getElementById('order-note').value;
    
    await addDoc(collection(db, "orders"), {
        customerName: nama, items: cart, note: catatan,
        totalPrice: cart.reduce((a,b)=> a+b.price, 0),
        status: "Baru", createdAt: serverTimestamp()
    });
    alert("Pesanan terkirim!");
    cart = []; updateUI(); toggleCart();
};
updateUI();
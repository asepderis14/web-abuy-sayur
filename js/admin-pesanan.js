import { db } from './firebase-config.js';
import { collection, onSnapshot, query, orderBy, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import './auth-check.js';

onSnapshot(query(collection(db, "orders"), orderBy("createdAt", "desc")), (snap) => {
    const list = document.getElementById('order-list');
    list.innerHTML = "";
    snap.forEach(d => {
        const o = d.data();
        const div = document.createElement('div');
        div.style = "background:white; padding:20px; border-radius:10px; margin-bottom:15px; box-shadow:0 2px 5px rgba(0,0,0,0.1)";
        div.innerHTML = `
            <div style="display:flex; justify-content:space-between">
                <strong>${o.customerName}</strong>
                <span class="status-${o.status.toLowerCase()}">${o.status}</span>
            </div>
            <p>Menu: ${o.items.map(i=>i.name).join(', ')}</p>
            <p>Catatan: <i>${o.note || '-'}</i></p>
            <p>Total: <strong>Rp ${o.totalPrice.toLocaleString()}</strong></p>
            <select onchange="updateStatus('${d.id}', this.value)">
                <option value="Baru" ${o.status=='Baru'?'selected':''}>Baru</option>
                <option value="Proses" ${o.status=='Proses'?'selected':''}>Proses</option>
                <option value="Selesai" ${o.status=='Selesai'?'selected':''}>Selesai</option>
            </select>
        `;
        list.appendChild(div);
    });
});

window.updateStatus = async (id, s) => {
    await updateDoc(doc(db, "orders", id), { status: s });
};
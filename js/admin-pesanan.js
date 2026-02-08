import { db } from './firebase-config.js';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Load library jspdf & autotable secara otomatis untuk fitur PDF
const s1 = document.createElement('script'); s1.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"; document.head.appendChild(s1);
const s2 = document.createElement('script'); s2.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.23/jspdf.plugin.autotable.min.js"; document.head.appendChild(s2);

const orderList = document.getElementById('admin-order-list');

onSnapshot(query(collection(db, "orders"), orderBy("createdAt", "desc")), (snap) => {
    orderList.innerHTML = "";
    snap.forEach(docSnap => {
        const o = docSnap.data();
        const id = docSnap.id;
        const col = o.status === 'Baru' ? '#e74c3c' : (o.status === 'Diproses' ? '#f39c12' : '#2ecc71');
        const orderDate = o.createdAt ? o.createdAt.toDate().toLocaleString('id-ID') : '-';

        orderList.innerHTML += `
            <div class="order-card" style="background:white; padding:20px; border-radius:10px; margin-bottom:20px; border-left:10px solid ${col}; box-shadow:0 4px 10px rgba(0,0,0,0.05);">
                <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                    <h3 style="margin:0;">${o.customerName}</h3>
                    <span style="color:${col}; font-weight:bold;">${o.status}</span>
                </div>
                <p style="font-size:0.8rem; color:#666; margin-bottom:15px;">
                    📍 ${o.address} <br>
                    ⏰ ${orderDate}
                </p>

                <table style="width:100%; border-collapse:collapse; margin-bottom:15px; font-size:0.9rem;">
                    <tr style="background:#f0f2f5; color:#888; text-align:left;">
                        <th style="padding:8px;">Produk</th>
                        <th style="padding:8px; text-align:center;">Jumlah</th>
                        <th style="padding:8px; text-align:right;">Total</th>
                    </tr>
                    ${o.items.map(i => `
                        <tr style="border-bottom:1px solid #eee;">
                            <td style="padding:8px 0;"><b>${i.name}</b></td>
                            <td style="text-align:center;">
                                <span style="background:orange; color:white; padding:2px 6px; border-radius:4px; font-weight:bold;">${i.qty}</span> x ${i.unit}
                            </td>
                            <td style="text-align:right; font-weight:bold;">Rp ${(i.price * i.qty).toLocaleString('id-ID')}</td>
                        </tr>
                    `).join('')}
                </table>

                ${o.note ? `
                <div style="background:#fff3cd; padding:10px; border-radius:5px; font-size:0.85rem; margin-bottom:15px; border-left:4px solid #f1c40f;">
                    <b>Catatan Pembeli:</b><br>${o.note}
                </div>` : ''}

                <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px dashed #ddd; padding-top:15px;">
                    <h2 style="margin:0; font-size:1.1rem; color:#003366;">Total Bayar: Rp ${o.total.toLocaleString('id-ID')}</h2>
                    <div style="display:flex; gap:5px;">
                        <button onclick='downloadPDF(${JSON.stringify(o)}, "${orderDate}")' style="background:#34495e; color:white; border:none; padding:8px 12px; border-radius:5px; cursor:pointer;">
                            <i class="fa fa-file-pdf"></i> Simpan PDF
                        </button>
                        <button onclick="updateStatus('${id}', 'Diproses')" style="background:#f39c12; color:white; border:none; padding:8px 12px; border-radius:5px; cursor:pointer;">Proses</button>
                        <button onclick="updateStatus('${id}', 'Selesai')" style="background:#2ecc71; color:white; border:none; padding:8px 12px; border-radius:5px; cursor:pointer;">Selesai</button>
                        <button onclick="delOrder('${id}')" style="background:none; border:1px solid #ddd; color:red; padding:8px; border-radius:5px; cursor:pointer;"><i class="fa fa-trash"></i></button>
                    </div>
                </div>
            </div>
        `;
    });
});

// FUNGSI EXPORT PDF (FORMAT STRUK)
window.downloadPDF = (data, tanggal) => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text("STRUK PESANAN ABUY SAYUR", 105, 15, { align: "center" });
    doc.setFontSize(10);
    doc.text(`Waktu: ${tanggal}`, 105, 22, { align: "center" });

    doc.text(`Nama Pelanggan : ${data.customerName}`, 20, 32);
    doc.text(`Alamat         : ${data.address}`, 20, 38);

    const tableBody = data.items.map(i => [
        i.name,
        `${i.qty} x ${i.unit}`, // Format 'x' di dalam PDF
        `Rp ${i.price.toLocaleString('id-ID')}`,
        `Rp ${(i.price * i.qty).toLocaleString('id-ID')}`
    ]);

    doc.autoTable({
        startY: 45,
        head: [['Produk', 'jumlah', 'Harga satuan', 'Subtotal']],
        body: tableBody,
        theme: 'grid',
        headStyles: { fillColor: [0, 51, 102] }
    });

    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`TOTAL BAYAR: Rp ${data.total.toLocaleString('id-ID')}`, 20, finalY);
    
    if (data.note) {
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(`Catatan: ${data.note}`, 20, finalY + 10);
    }

    doc.save(`Struk_Abuy_${data.customerName}.pdf`);
};

window.updateStatus = async (id, s) => { await updateDoc(doc(db, "orders", id), { status: s }); };
window.delOrder = async (id) => { if(confirm("Hapus pesanan ini?")) await deleteDoc(doc(db, "orders", id)); };
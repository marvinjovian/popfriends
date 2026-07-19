/* =========================================================
   INVOICE — model & app logic (OOP)

   Model      : Party (dari/klien), LineItem (1 baris pekerjaan)
   Aggregate  : Invoice (gabungan Party + LineItem[] + pajak + total)
   Builder    : ItemRowBuilder (bikin/baca baris item dari form)
   Controller : InvoiceApp (baca form, render, ekspor)

   Kelas Money, DocNumber, Toast, DocumentExporter datang dari
   ../shared/utils.js — jangan didefinisikan ulang di sini.
   ========================================================= */

class Party {
  constructor(nama, kontak){
    this.nama = (nama || '').trim();
    this.kontak = (kontak || '').trim();
  }
  isValid(){ return this.nama.length > 0; }
}

class LineItem {
  constructor(deskripsi, qty, harga){
    this.deskripsi = (deskripsi || '').trim();
    this.qty = Number(qty) || 0;
    this.harga = Number(harga) || 0;
  }
  subtotal(){ return this.qty * this.harga; }
  isValid(){ return this.deskripsi.length > 0 && this.qty > 0; }
}

class Invoice {
  static _docNumber = new DocNumber('INV');

  constructor(dari, klien, items, pajakPersen, tglTerbit, tglTempo, catatan, rekening){
    this.dari = dari;
    this.klien = klien;
    this.items = items;
    this.pajakPersen = Number(pajakPersen) || 0;
    this.tglTerbit = tglTerbit;
    this.tglTempo = tglTempo;
    this.catatan = (catatan || '').trim();
    this.rekening = (rekening || '').trim();
    this.nomor = Invoice._docNumber.next(new Date());
  }

  isValid(){
    return this.dari.isValid() && this.klien.isValid() &&
      this.items.length > 0 && this.items.every(i => i.isValid());
  }
  subtotal(){ return this.items.reduce((sum, i) => sum + i.subtotal(), 0); }
  pajakNominal(){ return this.subtotal() * (this.pajakPersen / 100); }
  total(){ return this.subtotal() + this.pajakNominal(); }
}

/** Bikin & baca baris "item pekerjaan" di form — dipisah dari Invoice biar rapi. */
class ItemRowBuilder {
  static count = 0;

  static add(deskripsi, qty, harga){
    ItemRowBuilder.count++;
    const id = 'item' + ItemRowBuilder.count;
    const row = document.createElement('div');
    row.className = 'item-row';
    row.id = id;
    row.innerHTML = `
      <div class="full"><label>Deskripsi</label><input type="text" class="it-desc" placeholder="mis. Konten video promo 30 detik" value="${deskripsi || ''}"></div>
      <div><label>Qty</label><input type="number" class="it-qty" min="1" value="${qty || 1}"></div>
      <div><label>Harga Satuan</label><input type="text" class="it-harga" placeholder="1000000" value="${harga || ''}"></div>
      <span class="rm" onclick="document.getElementById('${id}').remove()">✕</span>
    `;
    document.getElementById('item-list').appendChild(row);
    Money.bindLiveFormat(row.querySelector('.it-harga'));
  }

  static readAll(){
    const rows = document.querySelectorAll('#item-list .item-row');
    const items = [];
    rows.forEach(row => {
      const deskripsi = row.querySelector('.it-desc').value;
      const qty = row.querySelector('.it-qty').value;
      const harga = Money.toNumber(row.querySelector('.it-harga').value);
      const item = new LineItem(deskripsi, qty, harga);
      if(item.deskripsi) items.push(item);
    });
    return items;
  }
}

class InvoiceApp {
  constructor(){
    this.invoice = null;
  }

  buatDariForm(){
    const dari = new Party(
      document.getElementById('iv-nama-dari').value,
      document.getElementById('iv-kontak-dari').value
    );
    const klien = new Party(
      document.getElementById('iv-nama-klien').value,
      document.getElementById('iv-kontak-klien').value
    );
    const items = ItemRowBuilder.readAll();
    const pajak = document.getElementById('iv-pajak').value;
    const tglTerbit = document.getElementById('iv-tgl-terbit').value;
    const tglTempo = document.getElementById('iv-tgl-jatuh-tempo').value;
    const catatan = document.getElementById('iv-catatan').value;
    const rekening = document.getElementById('iv-rekening').value;

    if(!dari.isValid()){ Toast.show('⚠️ Nama kamu (pengirim invoice) wajib diisi'); return; }
    if(!klien.isValid()){ Toast.show('⚠️ Nama klien wajib diisi'); return; }
    if(items.length === 0){ Toast.show('⚠️ Tambahin minimal 1 item pekerjaan'); return; }

    this.invoice = new Invoice(dari, klien, items, pajak, tglTerbit, tglTempo, catatan, rekening);
    this.render();
    Toast.show('Invoice berhasil dibuat ✅');
  }

  render(){
    if(!this.invoice) return;
    const inv = this.invoice;

    document.getElementById('out-invnum').textContent = '#' + inv.nomor;
    document.getElementById('out-dari-nama').textContent = inv.dari.nama;
    document.getElementById('out-dari-kontak').textContent = inv.dari.kontak || '-';
    document.getElementById('out-dari-nama2').textContent = inv.dari.nama;
    document.getElementById('out-dari-kontak2').textContent = inv.dari.kontak || '-';
    document.getElementById('out-klien-nama').textContent = inv.klien.nama;
    document.getElementById('out-klien-kontak').textContent = inv.klien.kontak || '-';
    document.getElementById('out-tgl-terbit').textContent = DocNumber.formatTanggalIndo(inv.tglTerbit);
    document.getElementById('out-tgl-tempo').textContent = DocNumber.formatTanggalIndo(inv.tglTempo);

    const tbody = document.getElementById('out-items');
    tbody.innerHTML = '';
    inv.items.forEach(item => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${item.deskripsi}</td><td class="num">${item.qty}</td><td class="num">${Money.format(item.harga)}</td><td class="num">${Money.format(item.subtotal())}</td>`;
      tbody.appendChild(tr);
    });

    document.getElementById('out-subtotal').textContent = Money.format(inv.subtotal());
    document.getElementById('out-pajak-label').textContent = `Pajak (${inv.pajakPersen}%)`;
    document.getElementById('out-pajak').textContent = Money.format(inv.pajakNominal());
    document.getElementById('out-pajak-row').style.display = inv.pajakPersen > 0 ? 'flex' : 'none';
    document.getElementById('out-total').textContent = Money.format(inv.total());

    const catatanWrap = document.getElementById('out-catatan-wrap');
    if(inv.catatan){
      document.getElementById('out-catatan').textContent = inv.catatan;
      catatanWrap.style.display = 'block';
    } else {
      catatanWrap.style.display = 'none';
    }
    document.getElementById('out-rekening').textContent = inv.rekening || '-';

    document.getElementById('inv-placeholder').style.display = 'none';
    const box = document.getElementById('invoice');
    box.classList.remove('show');
    void box.offsetWidth;
    box.classList.add('show');
    document.getElementById('action-row').style.display = 'flex';
  }

  previewPDF(){
    if(!this.invoice){ Toast.show('⚠️ Buat invoice-nya dulu ya'); return; }
    DocumentExporter.previewPDF(document.getElementById('invoice'));
  }

  saveAsImage(){
    if(!this.invoice){ Toast.show('⚠️ Buat invoice-nya dulu ya'); return; }
    DocumentExporter.saveAsImage(document.getElementById('invoice'), this.invoice.nomor);
  }
}

/* ---------- init ---------- */
const app = new InvoiceApp();
ItemRowBuilder.add('Konten foto produk (3 slide)', 1, '1500000');
ItemRowBuilder.add('Video review 60 detik', 1, '2500000');

(function setDefaultDates(){
  const today = new Date();
  const due = new Date(today); due.setDate(due.getDate() + 7);
  document.getElementById('iv-tgl-terbit').value = today.toISOString().slice(0,10);
  document.getElementById('iv-tgl-jatuh-tempo').value = due.toISOString().slice(0,10);
})();

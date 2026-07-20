/* =========================================================
   INVOICE — model & app logic (OOP, versi upgrade)

   Lapisan-lapisannya:
   - Model       : Party -> Sender, Client | LineItem | Invoice (aggregate)
   - Strategy    : Discount (abstract-ish) -> NoDiscount, PercentageDiscount, FixedDiscount
                   Ini "Strategy Pattern" — cara hitung diskon bisa ganti-ganti
                   tanpa mengubah kode Invoice sama sekali.
   - Validator   : InvoiceValidator — validasi dipisah dari model, supaya
                   Invoice tetap fokus cuma pada kalkulasi.
   - Repository  : ClientRepository, InvoiceRepository — semua akses
                   localStorage lewat sini, controller tidak sentuh storage langsung.
   - Controller  : InvoiceApp — jembatan form <-> model <-> repository.

   Kelas Money, DocNumber, Toast, LocalStore, DocumentExporter datang dari
   ../shared/utils.js — jangan didefinisikan ulang di sini.
   ========================================================= */

/* ================= MODEL: Party & turunannya ================= */
class Party {
  constructor(nama, kontak){
    this.nama = (nama || '').trim();
    this.kontak = (kontak || '').trim();
  }
  isValid(){ return this.nama.length > 0; }
}

class Sender extends Party {}

class Client extends Party {
  constructor(nama, kontak, id){
    super(nama, kontak);
    this.id = id || Client.buatId(nama);
  }
  static buatId(nama){
    return (nama || 'klien').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now().toString(36);
  }
}

/* ================= MODEL: LineItem ================= */
class LineItem {
  constructor(deskripsi, qty, harga){
    this.deskripsi = (deskripsi || '').trim();
    this.qty = Number(qty) || 0;
    this.harga = Number(harga) || 0;
  }
  subtotal(){ return this.qty * this.harga; }
  isValid(){ return this.deskripsi.length > 0 && this.qty > 0; }
}

/* ================= STRATEGY: Discount ================= */
/**
 * Strategy pattern: semua jenis diskon punya bentuk yang sama (.apply(subtotal)),
 * jadi Invoice tidak perlu tahu "jenis" diskonnya apa — tinggal panggil .apply().
 * Nambah jenis diskon baru nanti = tambah 1 class baru, tanpa ubah Invoice.
 */
class Discount {
  apply(subtotal){ return 0; } // nominal potongan
  label(){ return 'Tanpa diskon'; }
}
class NoDiscount extends Discount {
  apply(){ return 0; }
  label(){ return '-'; }
}
class PercentageDiscount extends Discount {
  constructor(persen){ super(); this.persen = Number(persen) || 0; }
  apply(subtotal){ return subtotal * (this.persen / 100); }
  label(){ return `Diskon (${this.persen}%)`; }
}
class FixedDiscount extends Discount {
  constructor(nominal){ super(); this.nominal = Number(nominal) || 0; }
  apply(subtotal){ return Math.min(this.nominal, subtotal); }
  label(){ return 'Diskon (potongan tetap)'; }
}
/** Factory kecil biar controller tidak perlu tahu detail konstruksi tiap jenis diskon. */
class DiscountFactory {
  static create(type, value){
    if(type === 'percent') return new PercentageDiscount(value);
    if(type === 'fixed') return new FixedDiscount(value);
    return new NoDiscount();
  }
}

/* ================= MODEL: Invoice status ================= */
class InvoiceStatus {
  static DRAFT = 'Draft';
  static TERKIRIM = 'Terkirim';
  static LUNAS = 'Lunas';
  static JATUH_TEMPO = 'Jatuh Tempo';
  static all(){ return [InvoiceStatus.DRAFT, InvoiceStatus.TERKIRIM, InvoiceStatus.LUNAS, InvoiceStatus.JATUH_TEMPO]; }
  static color(status){
    return {
      [InvoiceStatus.DRAFT]: '#E1D6FB',
      [InvoiceStatus.TERKIRIM]: '#C9DFFC',
      [InvoiceStatus.LUNAS]: '#BFEFDA',
      [InvoiceStatus.JATUH_TEMPO]: '#FF8471'
    }[status] || '#FFE9A8';
  }
}

/* ================= AGGREGATE: Invoice ================= */
class Invoice {
  static _docNumber = new DocNumber('INV');

  constructor({ dari, klien, items, discount, pajakPersen, tglTerbit, tglTempo, catatan, rekening, status, nomor }){
    this.dari = dari;
    this.klien = klien;
    this.items = items;
    this.discount = discount instanceof Discount ? discount : new NoDiscount();
    this.pajakPersen = Number(pajakPersen) || 0;
    this.tglTerbit = tglTerbit;
    this.tglTempo = tglTempo;
    this.catatan = (catatan || '').trim();
    this.rekening = (rekening || '').trim();
    this.status = status || InvoiceStatus.DRAFT;
    this.nomor = nomor || Invoice._docNumber.next(new Date());
  }

  subtotal(){ return this.items.reduce((sum, i) => sum + i.subtotal(), 0); }
  potongan(){ return this.discount.apply(this.subtotal()); }
  dasarPajak(){ return this.subtotal() - this.potongan(); }
  pajakNominal(){ return this.dasarPajak() * (this.pajakPersen / 100); }
  total(){ return this.dasarPajak() + this.pajakNominal(); }

  /** Serialisasi buat disimpan ke localStorage / dikirim ke Sheets. */
  toJSON(){
    return {
      nomor: this.nomor,
      dari: { nama:this.dari.nama, kontak:this.dari.kontak },
      klien: { nama:this.klien.nama, kontak:this.klien.kontak },
      items: this.items.map(i => ({ deskripsi:i.deskripsi, qty:i.qty, harga:i.harga })),
      discountType: this.discount instanceof PercentageDiscount ? 'percent'
        : this.discount instanceof FixedDiscount ? 'fixed' : 'none',
      discountValue: this.discount instanceof PercentageDiscount ? this.discount.persen
        : this.discount instanceof FixedDiscount ? this.discount.nominal : 0,
      pajakPersen: this.pajakPersen, tglTerbit: this.tglTerbit, tglTempo: this.tglTempo,
      catatan: this.catatan, rekening: this.rekening, status: this.status,
      subtotal: this.subtotal(), potongan: this.potongan(), total: this.total()
    };
  }

  /** Rekonstruksi Invoice dari data JSON tersimpan (dipakai Repository). */
  static fromJSON(data){
    const dari = new Sender(data.dari.nama, data.dari.kontak);
    const klien = new Client(data.klien.nama, data.klien.kontak);
    const items = data.items.map(i => new LineItem(i.deskripsi, i.qty, i.harga));
    const discount = DiscountFactory.create(data.discountType, data.discountValue);
    return new Invoice({
      dari, klien, items, discount, pajakPersen:data.pajakPersen,
      tglTerbit:data.tglTerbit, tglTempo:data.tglTempo, catatan:data.catatan,
      rekening:data.rekening, status:data.status, nomor:data.nomor
    });
  }
}

/* ================= VALIDATOR (terpisah dari model) ================= */
class InvoiceValidator {
  static validate({ dari, klien, items }){
    const errors = [];
    if(!dari.isValid()) errors.push('Nama kamu (pengirim invoice) wajib diisi');
    if(!klien.isValid()) errors.push('Nama klien wajib diisi');
    if(items.length === 0) errors.push('Tambahin minimal 1 item pekerjaan');
    else if(!items.every(i => i.isValid())) errors.push('Ada item pekerjaan yang deskripsi/qty-nya belum lengkap');
    return { valid: errors.length === 0, errors };
  }
}

/* ================= REPOSITORY: klien tersimpan ================= */
class ClientRepository {
  constructor(store){ this.store = store; }
  all(){ return this.store.get('clients', []); }
  save(client){
    const list = this.all();
    const idx = list.findIndex(c => c.nama.toLowerCase() === client.nama.toLowerCase());
    const record = { id: client.id, nama: client.nama, kontak: client.kontak };
    if(idx >= 0) list[idx] = record; else list.unshift(record);
    this.store.set('clients', list.slice(0, 30)); // simpan max 30 klien terakhir
  }
  findById(id){ return this.all().find(c => c.id === id) || null; }
  remove(id){ this.store.set('clients', this.all().filter(c => c.id !== id)); }
}

/* ================= REPOSITORY: riwayat invoice ================= */
class InvoiceRepository {
  constructor(store){ this.store = store; }
  all(){ return this.store.get('invoices', []); }
  save(invoice){
    const list = this.all();
    const idx = list.findIndex(i => i.nomor === invoice.nomor);
    const record = invoice.toJSON();
    if(idx >= 0) list[idx] = record; else list.unshift(record);
    this.store.set('invoices', list);
  }
  findByNomor(nomor){
    const data = this.all().find(i => i.nomor === nomor);
    return data ? Invoice.fromJSON(data) : null;
  }
  updateStatus(nomor, status){
    const list = this.all();
    const item = list.find(i => i.nomor === nomor);
    if(item){ item.status = status; this.store.set('invoices', list); }
  }
  remove(nomor){ this.store.set('invoices', this.all().filter(i => i.nomor !== nomor)); }
}

/* ================= UI HELPER: baris item pekerjaan ================= */
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
      const item = new LineItem(
        row.querySelector('.it-desc').value,
        row.querySelector('.it-qty').value,
        Money.toNumber(row.querySelector('.it-harga').value)
      );
      if(item.deskripsi) items.push(item);
    });
    return items;
  }
  static clear(){ document.getElementById('item-list').innerHTML = ''; }
}

/* ================= CONTROLLER ================= */
class InvoiceApp {
  constructor(){
    this.store = new LocalStore('invoice');
    this.clients = new ClientRepository(this.store);
    this.invoices = new InvoiceRepository(this.store);
    this.currentInvoice = null;
  }

  init(){
    this.renderClientOptions();
    this.renderHistory();
  }

  showTab(id, btn){
    document.querySelectorAll('.tab-page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.pill-btn').forEach(t => t.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    btn.classList.add('active');
  }

  /* ---------- klien tersimpan ---------- */
  renderClientOptions(){
    const sel = document.getElementById('iv-klien-tersimpan');
    if(!sel) return;
    const list = this.clients.all();
    sel.innerHTML = '<option value="">— pilih klien tersimpan (opsional) —</option>' +
      list.map(c => `<option value="${c.id}">${c.nama}</option>`).join('');
  }
  pilihKlienTersimpan(id){
    if(!id) return;
    const c = this.clients.findById(id);
    if(!c) return;
    document.getElementById('iv-nama-klien').value = c.nama;
    document.getElementById('iv-kontak-klien').value = c.kontak;
    Toast.show(`Data "${c.nama}" dimuat ✅`);
  }

  /* ---------- baca form jadi objek Invoice ---------- */
  bacaForm(){
    const dari = new Sender(
      document.getElementById('iv-nama-dari').value,
      document.getElementById('iv-kontak-dari').value
    );
    const klien = new Client(
      document.getElementById('iv-nama-klien').value,
      document.getElementById('iv-kontak-klien').value
    );
    const items = ItemRowBuilder.readAll();
    const discountType = document.getElementById('iv-diskon-tipe').value;
    const discountValue = document.getElementById('iv-diskon-nilai').value;
    const discount = DiscountFactory.create(discountType, discountValue);
    const pajak = document.getElementById('iv-pajak').value;
    const tglTerbit = document.getElementById('iv-tgl-terbit').value;
    const tglTempo = document.getElementById('iv-tgl-jatuh-tempo').value;
    const catatan = document.getElementById('iv-catatan').value;
    const rekening = document.getElementById('iv-rekening').value;
    const status = document.getElementById('iv-status').value;

    return new Invoice({ dari, klien, items, discount, pajakPersen:pajak, tglTerbit, tglTempo, catatan, rekening, status });
  }

  buatDariForm(){
    const invoice = this.bacaForm();
    const { valid, errors } = InvoiceValidator.validate(invoice);
    if(!valid){ Toast.show('⚠️ ' + errors[0]); return; }

    this.currentInvoice = invoice;
    this.clients.save(invoice.klien);
    this.invoices.save(invoice);
    this.renderClientOptions();
    this.renderHistory();
    this.render();
    Toast.show('Invoice berhasil dibuat ✅');
  }

  render(){
    if(!this.currentInvoice) return;
    const inv = this.currentInvoice;

    document.getElementById('out-invnum').textContent = '#' + inv.nomor;
    document.getElementById('out-status').textContent = inv.status;
    document.getElementById('out-status').style.background = InvoiceStatus.color(inv.status);
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
    document.getElementById('out-diskon-row').style.display = inv.potongan() > 0 ? 'flex' : 'none';
    document.getElementById('out-diskon-label').textContent = inv.discount.label();
    document.getElementById('out-diskon').textContent = '-' + Money.format(inv.potongan());
    document.getElementById('out-pajak-row').style.display = inv.pajakPersen > 0 ? 'flex' : 'none';
    document.getElementById('out-pajak-label').textContent = `Pajak (${inv.pajakPersen}%)`;
    document.getElementById('out-pajak').textContent = Money.format(inv.pajakNominal());
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

  /* ---------- riwayat invoice ---------- */
  renderHistory(){
    const container = document.getElementById('history-table');
    if(!container) return;
    const list = this.invoices.all();
    if(list.length === 0){
      container.innerHTML = '<div class="hist-empty">Belum ada invoice tersimpan. Buat invoice pertama di tab "Buat Invoice".</div>';
      return;
    }
    let html = '<div style="overflow-x:auto;"><table class="hist-table"><tr>' +
      '<th>Nomor</th><th>Klien</th><th style="text-align:right;">Total</th><th>Status</th><th></th></tr>';
    list.forEach(inv => {
      html += `<tr>
        <td>${inv.nomor}</td><td>${inv.klien.nama}</td>
        <td style="text-align:right; font-weight:800;">${Money.format(inv.total)}</td>
        <td>
          <select onchange="app.ubahStatus('${inv.nomor}', this.value)" style="font-family:'Baloo 2',sans-serif; font-weight:700; font-size:11.5px; border:2px solid var(--line); border-radius:8px; padding:3px 6px; background:${InvoiceStatus.color(inv.status)};">
            ${InvoiceStatus.all().map(s => `<option value="${s}" ${s===inv.status?'selected':''}>${s}</option>`).join('')}
          </select>
        </td>
        <td style="text-align:center;">
          <span class="rm" style="color:var(--ink); cursor:pointer; margin-right:8px;" onclick="app.muatInvoice('${inv.nomor}')">↩️</span>
          <span class="rm" style="color:var(--coral-dark); cursor:pointer;" onclick="app.hapusInvoice('${inv.nomor}')">✕</span>
        </td>
      </tr>`;
    });
    html += '</table></div>';
    container.innerHTML = html;
  }

  ubahStatus(nomor, status){
    this.invoices.updateStatus(nomor, status);
    if(this.currentInvoice && this.currentInvoice.nomor === nomor){
      this.currentInvoice.status = status;
      this.render();
    }
    Toast.show('Status diperbarui ✅');
  }

  muatInvoice(nomor){
    const inv = this.invoices.findByNomor(nomor);
    if(!inv) return;
    this.currentInvoice = inv;
    document.querySelector('.pill-btn[data-tab="buat"]').click();
    this.render();
    Toast.show('Invoice ' + nomor + ' dimuat ✅');
  }

  hapusInvoice(nomor){
    if(!confirm('Hapus invoice ' + nomor + '? Tindakan ini tidak bisa dibatalkan.')) return;
    this.invoices.remove(nomor);
    this.renderHistory();
    Toast.show('Invoice dihapus 🗑️');
  }

  /* ---------- ekspor ---------- */
  previewPDF(){
    if(!this.currentInvoice){ Toast.show('⚠️ Buat invoice-nya dulu ya'); return; }
    DocumentExporter.previewPDF(document.getElementById('invoice'));
  }
  saveAsImage(){
    if(!this.currentInvoice){ Toast.show('⚠️ Buat invoice-nya dulu ya'); return; }
    DocumentExporter.saveAsImage(document.getElementById('invoice'), this.currentInvoice.nomor);
  }
}

/* ---------- init ---------- */
const app = new InvoiceApp();
document.addEventListener('DOMContentLoaded', () => {
  app.init();
  ItemRowBuilder.add('Konten foto produk (3 slide)', 1, '1500000');
  ItemRowBuilder.add('Video review 60 detik', 1, '2500000');

  const today = new Date();
  const due = new Date(today); due.setDate(due.getDate() + 7);
  document.getElementById('iv-tgl-terbit').value = today.toISOString().slice(0,10);
  document.getElementById('iv-tgl-jatuh-tempo').value = due.toISOString().slice(0,10);
});

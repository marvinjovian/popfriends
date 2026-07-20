/* =========================================================
   RESI — model & app logic (OOP, versi upgrade)

   Lapisan-lapisannya:
   - Model      : Person -> Penerima, Pengirim | PackageType (enum-like)
   - Strategy   : NoteStrategy (abstract-ish) -> RegulerNote, ExpressNote, FragileNote
                  Catatan random yang keluar beda pool tergantung jenis paket,
                  tapi cara "mintanya" (.random()) selalu sama dari sisi Resi.
   - Validator  : ResiValidator — validasi dipisah dari model.
   - Repository : SenderRepository (pengirim yang sering dipakai),
                  ResiRepository (riwayat resi yang pernah dibuat).
   - Controller : ResiApp — jembatan form <-> model <-> repository.

   Kelas DocNumber, Toast, LocalStore, DocumentExporter datang dari
   ../shared/utils.js — jangan didefinisikan ulang di sini.
   ========================================================= */

/* ================= MODEL: Person & turunannya ================= */
class Person {
  constructor(nama, kontak){
    this.nama = (nama || '').trim();
    this.kontak = (kontak || '').trim();
  }
  isValid(){ return this.nama.length > 0; }
}

class Penerima extends Person {
  constructor(nama, kontak, alamat){
    super(nama, kontak);
    this.alamat = (alamat || '').trim();
  }
  isValid(){ return super.isValid() && this.alamat.length > 0; }
}

class Pengirim extends Person {
  constructor(nama, telepon, id){
    super(nama, telepon);
    this.id = id || Pengirim.buatId(nama);
  }
  static buatId(nama){
    return (nama || 'pengirim').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now().toString(36);
  }
}

/* ================= MODEL: jenis paket (enum-like) ================= */
class PackageType {
  static REGULER = 'reguler';
  static EXPRESS = 'express';
  static FRAGILE = 'fragile';

  static all(){ return [PackageType.REGULER, PackageType.EXPRESS, PackageType.FRAGILE]; }
  static label(type){
    return { reguler:'📦 Reguler', express:'🚀 Express', fragile:'🔔 Fragile' }[type] || '📦 Reguler';
  }
  static badgeColor(type){
    return { reguler:'#BFEFDA', express:'#FFD9B8', fragile:'#FF8471' }[type] || '#BFEFDA';
  }
}

/* ================= STRATEGY: catatan random per jenis paket ================= */
/**
 * Strategy pattern: tiap jenis paket punya "gaya" catatan sendiri,
 * tapi caranya diminta (.random()) selalu seragam lewat method yang sama.
 * Nambah jenis paket baru = bikin 1 class NoteStrategy baru + daftarin di factory.
 */
class NoteStrategy {
  constructor(){ this.lastIndex = -1; }
  pool(){ return [{ emoji:'📦', text:'Paket standar, aman dalam perjalanan.' }]; }
  random(){
    const list = this.pool();
    let idx;
    do{ idx = Math.floor(Math.random() * list.length); }
    while(idx === this.lastIndex && list.length > 1);
    this.lastIndex = idx;
    return list[idx];
  }
}

class RegulerNote extends NoteStrategy {
  pool(){
    return [
      { emoji:'📦', text:'Paketnya dijamin aman, dipeluk dulu sebelum dikirim.' },
      { emoji:'☕', text:'Dikemas sambil nemenin ngopi, jadi extra semangat.' },
      { emoji:'✨', text:'Semoga harinya secerah paket yang mau dateng ini.' },
      { emoji:'🐢', text:'Santai kayak di pantai, tapi tetep sampe kok.' },
      { emoji:'💌', text:'Titip salam buat yang nerima, semoga suka!' },
      { emoji:'🌈', text:'Ada sedikit keajaiban di setiap paket yang keluar.' },
      { emoji:'🍀', text:'Dikirim dengan restu semesta biar lancar sampenya.' },
      { emoji:'📸', text:'Kalau sempet, foto pas dibuka ya, biar seru.' }
    ];
  }
}
class ExpressNote extends NoteStrategy {
  pool(){
    return [
      { emoji:'🚀', text:'Meluncur secepat kilat, sabar ya nunggunya (dikit doang)!' },
      { emoji:'⚡', text:'Ngebut demi sampe tepat waktu, jangan kemana-mana.' },
      { emoji:'🎯', text:'Prioritas utama, alamat udah dicek dua kali biar nggak nyasar.' },
      { emoji:'🔥', text:'Paket ini lagi buru-buru, tolong langsung diterima ya.' },
      { emoji:'🏃', text:'Kurirnya udah pemanasan dari semalem buat ini.' }
    ];
  }
}
class FragileNote extends NoteStrategy {
  pool(){
    return [
      { emoji:'🔔', text:'Pelan-pelan bukanya, isinya gampang baper (mudah pecah).' },
      { emoji:'🎁', text:'Dibungkus extra hati-hati, jangan dilempar-lempar ya.' },
      { emoji:'🧊', text:'Sensitif kayak perasaan mantan, mohon ditangani lembut.' },
      { emoji:'🔒', text:'Udah dilapis aman berkali-kali, tapi tetep hati-hati pas buka.' },
      { emoji:'🌸', text:'Isinya rapuh tapi niatnya kuat, dijaga baik-baik ya.' }
    ];
  }
}
class NoteStrategyFactory {
  static create(type){
    if(type === PackageType.EXPRESS) return new ExpressNote();
    if(type === PackageType.FRAGILE) return new FragileNote();
    return new RegulerNote();
  }
}

/* ================= AGGREGATE: Resi ================= */
class Resi {
  static _docNumber = new DocNumber('RESI');

  constructor({ penerima, pengirim, packageType, noteStrategy, nomor, catatan }){
    this.penerima = penerima;
    this.pengirim = pengirim;
    this.packageType = packageType || PackageType.REGULER;
    this.noteStrategy = noteStrategy || NoteStrategyFactory.create(this.packageType);
    this.tanggal = new Date();
    this.nomor = nomor || Resi._docNumber.next(this.tanggal);
    this.catatan = catatan || this.noteStrategy.random();
  }
  formatTanggal(){ return DocNumber.formatTanggalJamIndo(this.tanggal); }
  acakUlangCatatan(){ this.catatan = this.noteStrategy.random(); return this.catatan; }

  toJSON(){
    return {
      nomor: this.nomor,
      penerima: { nama:this.penerima.nama, kontak:this.penerima.kontak, alamat:this.penerima.alamat },
      pengirim: { nama:this.pengirim.nama, kontak:this.pengirim.kontak },
      packageType: this.packageType,
      catatan: this.catatan,
      waktu: this.tanggal.toLocaleString('id-ID')
    };
  }
  static fromJSON(data){
    const penerima = new Penerima(data.penerima.nama, data.penerima.kontak, data.penerima.alamat);
    const pengirim = new Pengirim(data.pengirim.nama, data.pengirim.kontak);
    const strategy = NoteStrategyFactory.create(data.packageType);
    return new Resi({ penerima, pengirim, packageType:data.packageType, noteStrategy:strategy, nomor:data.nomor, catatan:data.catatan });
  }
}

/* ================= VALIDATOR ================= */
class ResiValidator {
  static validate({ penerima, pengirim }){
    const errors = [];
    if(!penerima.isValid()) errors.push('Nama & alamat penerima wajib diisi');
    if(!pengirim.isValid()) errors.push('Nama pengirim wajib diisi');
    return { valid: errors.length === 0, errors };
  }
}

/* ================= REPOSITORY: pengirim tersimpan ================= */
class SenderRepository {
  constructor(store){ this.store = store; }
  all(){ return this.store.get('senders', []); }
  save(pengirim){
    const list = this.all();
    const idx = list.findIndex(p => p.nama.toLowerCase() === pengirim.nama.toLowerCase());
    const record = { id: pengirim.id, nama: pengirim.nama, kontak: pengirim.kontak };
    if(idx >= 0) list[idx] = record; else list.unshift(record);
    this.store.set('senders', list.slice(0, 20));
  }
  findById(id){ return this.all().find(p => p.id === id) || null; }
}

/* ================= REPOSITORY: riwayat resi ================= */
class ResiRepository {
  constructor(store){ this.store = store; }
  all(){ return this.store.get('riwayat', []); }
  save(resi){
    const list = this.all();
    list.unshift(resi.toJSON());
    this.store.set('riwayat', list.slice(0, 200)); // cukup 200 terakhir
  }
  findByNomor(nomor){
    const data = this.all().find(r => r.nomor === nomor);
    return data ? Resi.fromJSON(data) : null;
  }
  remove(nomor){ this.store.set('riwayat', this.all().filter(r => r.nomor !== nomor)); }
  clear(){ this.store.set('riwayat', []); }
}

/* ================= CONTROLLER ================= */
class ResiApp {
  constructor(){
    this.store = new LocalStore('resi');
    this.senders = new SenderRepository(this.store);
    this.history = new ResiRepository(this.store);
    this.currentResi = null;
  }

  init(){
    this.renderSenderOptions();
    this.renderHistory();
  }

  showTab(id, btn){
    document.querySelectorAll('.tab-page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.pill-btn').forEach(t => t.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    btn.classList.add('active');
  }

  /* ---------- pengirim tersimpan ---------- */
  renderSenderOptions(){
    const sel = document.getElementById('rn-pengirim-tersimpan');
    if(!sel) return;
    const list = this.senders.all();
    sel.innerHTML = '<option value="">— pilih pengirim tersimpan (opsional) —</option>' +
      list.map(p => `<option value="${p.id}">${p.nama}</option>`).join('');
  }
  pilihPengirimTersimpan(id){
    if(!id) return;
    const p = this.senders.findById(id);
    if(!p) return;
    document.getElementById('rn-nama-kirim').value = p.nama;
    document.getElementById('rn-telp-kirim').value = p.kontak;
    Toast.show(`Data "${p.nama}" dimuat ✅`);
  }

  buatDariForm(){
    const penerima = new Penerima(
      document.getElementById('rn-nama').value,
      document.getElementById('rn-kontak').value,
      document.getElementById('rn-alamat').value
    );
    const pengirim = new Pengirim(
      document.getElementById('rn-nama-kirim').value,
      document.getElementById('rn-telp-kirim').value
    );
    const packageType = document.querySelector('input[name="package-type"]:checked')?.value || PackageType.REGULER;

    const { valid, errors } = ResiValidator.validate({ penerima, pengirim });
    if(!valid){ Toast.show('⚠️ ' + errors[0]); return; }

    const noteStrategy = NoteStrategyFactory.create(packageType);
    this.currentResi = new Resi({ penerima, pengirim, packageType, noteStrategy });

    this.senders.save(pengirim);
    this.history.save(this.currentResi);
    this.renderSenderOptions();
    this.renderHistory();
    this.render();
    Toast.show('Resi berhasil dibuat ✅');
  }

  render(){
    if(!this.currentResi) return;
    const r = this.currentResi;

    document.getElementById('resi-idnum').textContent = '#' + r.nomor;
    document.getElementById('resi-badge').textContent = PackageType.label(r.packageType);
    document.getElementById('resi-badge').style.background = PackageType.badgeColor(r.packageType);
    document.getElementById('out-nama').textContent = r.penerima.nama;
    document.getElementById('out-kontak').textContent = r.penerima.kontak || '-';
    document.getElementById('out-alamat').textContent = r.penerima.alamat;
    document.getElementById('out-nama-kirim').textContent = r.pengirim.nama;
    document.getElementById('out-telp-kirim').textContent = r.pengirim.kontak || '-';
    document.getElementById('resi-note-emoji').textContent = r.catatan.emoji;
    document.getElementById('resi-note-text').textContent = r.catatan.text;
    document.getElementById('resi-tanggal').textContent = r.formatTanggal();

    document.getElementById('resi-placeholder').style.display = 'none';
    const label = document.getElementById('resi-label');
    label.classList.remove('show');
    void label.offsetWidth;
    label.classList.add('show');
    document.getElementById('action-row').style.display = 'flex';
  }

  acakCatatan(){
    if(!this.currentResi) return;
    const c = this.currentResi.acakUlangCatatan();
    document.getElementById('resi-note-emoji').textContent = c.emoji;
    document.getElementById('resi-note-text').textContent = c.text;
  }

  /* ---------- riwayat ---------- */
  renderHistory(){
    const container = document.getElementById('history-table');
    if(!container) return;
    const list = this.history.all();
    if(list.length === 0){
      container.innerHTML = '<div class="hist-empty">Belum ada resi tersimpan. Buat resi pertama di tab "Buat Resi".</div>';
      return;
    }
    let html = '<div style="overflow-x:auto;"><table class="hist-table"><tr>' +
      '<th>Nomor</th><th>Penerima</th><th>Jenis</th><th></th></tr>';
    list.forEach(r => {
      html += `<tr>
        <td>${r.nomor}</td><td>${r.penerima.nama}</td>
        <td><span style="background:${PackageType.badgeColor(r.packageType)}; border:2px solid var(--line); border-radius:999px; padding:2px 10px; font-size:11px; font-weight:700;">${PackageType.label(r.packageType)}</span></td>
        <td style="text-align:center;">
          <span class="rm" style="color:var(--ink); cursor:pointer; margin-right:8px;" onclick="app.muatResi('${r.nomor}')">↩️</span>
          <span class="rm" style="color:var(--coral-dark); cursor:pointer;" onclick="app.hapusResi('${r.nomor}')">✕</span>
        </td>
      </tr>`;
    });
    html += '</table></div>';
    container.innerHTML = html;
  }

  muatResi(nomor){
    const r = this.history.findByNomor(nomor);
    if(!r) return;
    this.currentResi = r;
    document.querySelector('.pill-btn[data-tab="buat"]').click();
    this.render();
    Toast.show('Resi ' + nomor + ' dimuat ✅');
  }

  hapusResi(nomor){
    if(!confirm('Hapus resi ' + nomor + '?')) return;
    this.history.remove(nomor);
    this.renderHistory();
    Toast.show('Resi dihapus 🗑️');
  }

  /* ---------- ekspor ---------- */
  previewPDF(){
    if(!this.currentResi){ Toast.show('⚠️ Buat resinya dulu ya'); return; }
    DocumentExporter.previewPDF(document.getElementById('resi-label'));
  }
  saveAsImage(){
    if(!this.currentResi){ Toast.show('⚠️ Buat resinya dulu ya'); return; }
    DocumentExporter.saveAsImage(document.getElementById('resi-label'), this.currentResi.nomor);
  }
}

const app = new ResiApp();
document.addEventListener('DOMContentLoaded', () => app.init());

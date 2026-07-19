/* =========================================================
   RESI — model & app logic (OOP)

   Model      : Person -> Penerima, Pengirim
   Service    : NoteGenerator (catatan random)
   Aggregate  : Resi (gabungan Penerima + Pengirim + catatan + nomor)
   Controller : ResiApp (baca form, render, ekspor)

   Kelas Money, DocNumber, Toast, DocumentExporter datang dari
   ../shared/utils.js — jangan didefinisikan ulang di sini.
   ========================================================= */

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
  constructor(nama, telepon){
    super(nama, telepon);
  }
}

class NoteGenerator {
  constructor(){
    this.catatan = [
      { emoji:'📦', text:'Paketnya dijamin aman, dipeluk dulu sebelum dikirim.' },
      { emoji:'🚀', text:'Meluncur secepat kilat, sabar ya nunggunya!' },
      { emoji:'🎁', text:'Isinya rahasia, bukanya pas udah sampe aja.' },
      { emoji:'☕', text:'Dikemas sambil nemenin ngopi, jadi extra semangat.' },
      { emoji:'✨', text:'Semoga harinya secerah paket yang mau dateng ini.' },
      { emoji:'🐢', text:'Santai kayak di pantai, tapi tetep sampe kok.' },
      { emoji:'💌', text:'Titip salam buat yang nerima, semoga suka!' },
      { emoji:'🔒', text:'Udah dibungkus rapi, aman dari drama di jalan.' },
      { emoji:'🌈', text:'Ada sedikit keajaiban di setiap paket yang keluar.' },
      { emoji:'🎯', text:'Alamat udah dicek dua kali, gak bakal nyasar.' },
      { emoji:'🍀', text:'Dikirim dengan restu semesta biar lancar sampenya.' },
      { emoji:'📸', text:'Kalau sempet, foto pas dibuka ya, biar seru.' }
    ];
    this.lastIndex = -1;
  }
  random(){
    let idx;
    do{ idx = Math.floor(Math.random() * this.catatan.length); }
    while(idx === this.lastIndex && this.catatan.length > 1);
    this.lastIndex = idx;
    return this.catatan[idx];
  }
}

class Resi {
  static _docNumber = new DocNumber('RESI');

  constructor(penerima, pengirim, noteGenerator){
    this.penerima = penerima;
    this.pengirim = pengirim;
    this.noteGenerator = noteGenerator;
    this.tanggal = new Date();
    this.id = Resi._docNumber.next(this.tanggal);
    this.catatan = this.noteGenerator.random();
  }
  isValid(){ return this.penerima.isValid() && this.pengirim.isValid(); }
  formatTanggal(){ return DocNumber.formatTanggalJamIndo(this.tanggal); }
  acakUlangCatatan(){
    this.catatan = this.noteGenerator.random();
    return this.catatan;
  }
}

class ResiApp {
  constructor(){
    this.resi = null;
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

    if(!penerima.isValid()){ Toast.show('⚠️ Nama & alamat penerima wajib diisi dulu'); return; }
    if(!pengirim.isValid()){ Toast.show('⚠️ Nama pengirim wajib diisi dulu'); return; }

    this.resi = new Resi(penerima, pengirim, new NoteGenerator());
    this.render();
    Toast.show('Resi berhasil dibuat ✅');
  }

  render(){
    if(!this.resi) return;
    const r = this.resi;

    document.getElementById('resi-idnum').textContent = '#' + r.id;
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
    if(!this.resi) return;
    const c = this.resi.acakUlangCatatan();
    document.getElementById('resi-note-emoji').textContent = c.emoji;
    document.getElementById('resi-note-text').textContent = c.text;
  }

  previewPDF(){
    if(!this.resi){ Toast.show('⚠️ Buat resinya dulu ya'); return; }
    DocumentExporter.previewPDF(document.getElementById('resi-label'));
  }

  saveAsImage(){
    if(!this.resi){ Toast.show('⚠️ Buat resinya dulu ya'); return; }
    DocumentExporter.saveAsImage(document.getElementById('resi-label'), this.resi.id);
  }
}

const app = new ResiApp();

/* =========================================================
   POPFRIENDS — SHARED UTILS
   Kelas-kelas dasar yang dipakai bersama oleh semua proyek.
   Prinsip: satu kelas, satu tanggung jawab (single responsibility).
   ========================================================= */

/** Format & parsing angka Rupiah. Dipakai di HPP, Resi, Invoice. */
class Money {
  static toNumber(str){
    if(typeof str !== 'string') return Number(str) || 0;
    const cleaned = str.replace(/[^0-9]/g, '');
    return cleaned ? parseInt(cleaned, 10) : 0;
  }
  static format(num){
    num = Math.round(num || 0);
    return 'Rp ' + new Intl.NumberFormat('id-ID').format(num);
  }
  /** Pasang listener biar input otomatis terformat "1.000.000" saat diketik. */
  static bindLiveFormat(inputEl){
    inputEl.addEventListener('input', (e) => {
      const n = Money.toNumber(e.target.value);
      e.target.value = n === 0 ? '' : new Intl.NumberFormat('id-ID').format(n);
    });
  }
}

/** Pembuat nomor dokumen berformat tanggal, mis. 20260718-001. Dipakai di Resi & Invoice. */
class DocNumber {
  constructor(prefix = ''){
    this.prefix = prefix;
    this.seqToday = 0;
    this.lastDateKey = '';
  }
  next(tanggal = new Date()){
    const y = tanggal.getFullYear();
    const m = String(tanggal.getMonth() + 1).padStart(2, '0');
    const d = String(tanggal.getDate()).padStart(2, '0');
    const dateKey = `${y}${m}${d}`;
    if(dateKey !== this.lastDateKey){
      this.lastDateKey = dateKey;
      this.seqToday = 0;
    }
    this.seqToday++;
    const seq = String(this.seqToday).padStart(3, '0');
    return this.prefix ? `${this.prefix}-${dateKey}-${seq}` : `${dateKey}-${seq}`;
  }
  static formatTanggalIndo(dateStr){
    if(!dateStr) return '-';
    const d = typeof dateStr === 'string' ? new Date(dateStr + 'T00:00:00') : dateStr;
    return d.toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' });
  }
  static formatTanggalJamIndo(date){
    return date.toLocaleDateString('id-ID', {
      day:'numeric', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit'
    });
  }
}

/** Notifikasi kecil di bawah layar. Butuh elemen <div class="pf-toast" id="pf-toast"> di HTML. */
class Toast {
  static show(msg, ms = 2800){
    const el = document.getElementById('pf-toast');
    if(!el) { console.warn('Toast: elemen #pf-toast tidak ditemukan'); return; }
    el.textContent = msg;
    el.classList.remove('show');
    void el.offsetWidth;
    el.classList.add('show');
    clearTimeout(Toast._timer);
    Toast._timer = setTimeout(() => el.classList.remove('show'), ms);
  }
}

/** Wrapper localStorage biar konsisten & aman dari error JSON. */
class LocalStore {
  constructor(namespace = 'pf'){ this.ns = namespace; }
  key(k){ return `${this.ns}_${k}`; }
  get(k, fallback = null){
    try{
      const raw = localStorage.getItem(this.key(k));
      return raw === null ? fallback : JSON.parse(raw);
    }catch(_){ return fallback; }
  }
  set(k, value){ localStorage.setItem(this.key(k), JSON.stringify(value)); }
  remove(k){ localStorage.removeItem(this.key(k)); }
}

/**
 * Ekspor elemen DOM jadi PDF (preview di tab baru) atau PNG.
 * Pakai html2canvas + jsPDF, di-load otomatis on-demand (lazy) biar
 * halaman tetap ringan kalau fitur ini belum dipakai.
 */
class DocumentExporter {
  static _libsReady = false;

  static ensureLibs(cb){
    if(DocumentExporter._libsReady){ cb(); return; }
    const need = [];
    if(typeof html2canvas === 'undefined'){
      need.push('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
    }
    if(typeof window.jspdf === 'undefined'){
      need.push('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
    }
    if(need.length === 0){ DocumentExporter._libsReady = true; cb(); return; }
    let loaded = 0;
    need.forEach(src => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = () => { loaded++; if(loaded === need.length){ DocumentExporter._libsReady = true; cb(); } };
      document.head.appendChild(s);
    });
  }

  /** Buka preview PDF di tab baru dari sebuah elemen DOM. */
  static previewPDF(node, backgroundColor = '#FBF7F0'){
    DocumentExporter.ensureLibs(() => {
      html2canvas(node, { backgroundColor, scale: 2 }).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        const { jsPDF } = window.jspdf;
        const pxToMm = px => px * 0.264583;
        const wMm = pxToMm(canvas.width);
        const hMm = pxToMm(canvas.height);
        const pdf = new jsPDF({
          orientation: wMm > hMm ? 'landscape' : 'portrait',
          unit: 'mm',
          format: [wMm, hMm]
        });
        pdf.addImage(imgData, 'PNG', 0, 0, wMm, hMm);
        window.open(pdf.output('bloburl'), '_blank');
      });
    });
  }

  /** Unduh elemen DOM sebagai file PNG. */
  static saveAsImage(node, filename, backgroundColor = '#FBF7F0'){
    DocumentExporter.ensureLibs(() => {
      html2canvas(node, { backgroundColor, scale: 2 }).then(canvas => {
        const link = document.createElement('a');
        link.download = filename.endsWith('.png') ? filename : filename + '.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
      });
    });
  }
}

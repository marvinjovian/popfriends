/* =========================================================
   HPP — model & app logic (OOP)

   Model      : DagangHpp, KulinerHpp, ManufakturHpp (masing-masing
                punya rumus sendiri, tapi API-nya seragam: .hitung())
   Value obj  : Ingredient (1 baris bahan baku + konversi satuan)
   Service    : UnitConverter, SheetConnector, HistoryManager
   Controller : HppApp (baca form, render, ekspor)

   Kelas Money, DocNumber, Toast, LocalStore datang dari
   ../shared/utils.js — jangan didefinisikan ulang di sini.
   ========================================================= */

/* ---------- SEKTOR 1: DAGANG & ECERAN ---------- */
class DagangHpp {
  constructor({ awal, akhir, pembelian, ongkos, retur, potongan, unit, markup }){
    this.awal = awal; this.akhir = akhir; this.pembelian = pembelian;
    this.ongkos = ongkos; this.retur = retur; this.potongan = potongan;
    this.unit = unit; this.markup = markup;
  }
  pembelianBersih(){ return this.pembelian + this.ongkos - this.retur - this.potongan; }
  hpp(){ return this.awal + this.pembelianBersih() - this.akhir; }
  hppPerUnit(){ return this.unit > 0 ? this.hpp() / this.unit : null; }
  hargaJual(){
    const perUnit = this.hppPerUnit();
    return perUnit !== null ? perUnit * (1 + this.markup / 100) : null;
  }
  toPayload(){
    return {
      persediaan_awal:this.awal, persediaan_akhir:this.akhir, pembelian:this.pembelian,
      ongkos_angkut:this.ongkos, retur_pembelian:this.retur, potongan_pembelian:this.potongan,
      pembelian_bersih:this.pembelianBersih(), hpp:this.hpp(), unit_terjual:this.unit,
      hpp_per_unit:this.hppPerUnit() || 0, markup_persen:this.markup, harga_jual_per_unit:this.hargaJual() || 0
    };
  }
}

/* ---------- SEKTOR 2: KULINER & F&B ---------- */
class UnitConverter {
  static UNITS = {
    gram:{cat:'Berat', label:'gram', factor:1},
    kg:{cat:'Berat', label:'kg', factor:1000},
    ml:{cat:'Volume', label:'ml', factor:1},
    liter:{cat:'Volume', label:'liter', factor:1000},
    sdm:{cat:'Volume', label:'sdm', factor:15},
    sdt:{cat:'Volume', label:'sdt', factor:5},
    pcs:{cat:'Satuan', label:'pcs', factor:1},
    butir:{cat:'Satuan', label:'butir', factor:1},
    lembar:{cat:'Satuan', label:'lembar', factor:1},
    ikat:{cat:'Satuan', label:'ikat', factor:1}
  };
  static sameCategory(u1, u2){ return UnitConverter.UNITS[u1].cat === UnitConverter.UNITS[u2].cat; }
  static toBase(qty, unit){ return qty * UnitConverter.UNITS[unit].factor; }
  static label(unit){ return UnitConverter.UNITS[unit].label; }
  static optionsHtml(selected){
    const groups = {};
    Object.keys(UnitConverter.UNITS).forEach(k=>{
      const u = UnitConverter.UNITS[k];
      (groups[u.cat] = groups[u.cat] || []).push(k);
    });
    let html = '';
    Object.keys(groups).forEach(cat=>{
      html += `<optgroup label="${cat}">`;
      groups[cat].forEach(k=>{
        html += `<option value="${k}" ${k===selected?'selected':''}>${UnitConverter.UNITS[k].label}</option>`;
      });
      html += `</optgroup>`;
    });
    return html;
  }
}

class Ingredient {
  constructor(nama, harga, isi, isiUnit, pakai, pakaiUnit, yieldPersen){
    this.nama = (nama || 'Bahan').trim();
    this.harga = harga;
    this.isi = isi; this.isiUnit = isiUnit;
    this.pakai = pakai; this.pakaiUnit = pakaiUnit;
    this.yieldPersen = yieldPersen || 100;
  }
  isSameCategory(){ return UnitConverter.sameCategory(this.isiUnit, this.pakaiUnit); }
  biaya(){
    if(!this.isSameCategory()) return null;
    const isiBase = UnitConverter.toBase(this.isi, this.isiUnit);
    const pakaiBase = UnitConverter.toBase(this.pakai, this.pakaiUnit);
    if(isiBase <= 0) return 0;
    const hargaSatuan = this.harga / isiBase;
    return (hargaSatuan * pakaiBase) / (this.yieldPersen / 100);
  }
  ringkasan(){
    const b = this.biaya();
    if(b === null) return `${this.nama}: satuan tidak sejenis`;
    return `${this.nama} (${this.pakai} ${UnitConverter.label(this.pakaiUnit)} dari ${this.isi} ${UnitConverter.label(this.isiUnit)}): ${Money.format(b)}`;
  }
}

class KulinerHpp {
  constructor({ ingredients, tenaga, overhead, porsi, foodCostPersen }){
    this.ingredients = ingredients;
    this.tenaga = tenaga; this.overhead = overhead;
    this.porsi = Math.max(1, porsi);
    this.foodCostPersen = foodCostPersen;
  }
  totalBahan(){ return this.ingredients.reduce((sum, i) => sum + (i.biaya() || 0), 0); }
  totalBatch(){ return this.totalBahan() + this.tenaga + this.overhead; }
  hppPerPorsi(){ return this.totalBatch() / this.porsi; }
  hargaJual(){ return this.foodCostPersen > 0 ? this.hppPerPorsi() / (this.foodCostPersen / 100) : null; }
  toPayload(){
    return {
      daftar_bahan: this.ingredients.map(i => i.ringkasan()).join(' | '),
      total_biaya_bahan: this.totalBahan(), tenaga_kerja: this.tenaga, overhead: this.overhead,
      jumlah_porsi: this.porsi, total_biaya_batch: this.totalBatch(), hpp_per_porsi: this.hppPerPorsi(),
      target_food_cost_persen: this.foodCostPersen, harga_jual_per_porsi: this.hargaJual() || 0
    };
  }
}

/* ---------- SEKTOR 3: MANUFAKTUR ---------- */
class ManufakturHpp {
  constructor({ bbAwal, bbBeli, bbAkhir, btkl, bop, bdpAwal, bdpAkhir, bjAwal, bjAkhir, unit, markup }){
    Object.assign(this, { bbAwal, bbBeli, bbAkhir, btkl, bop, bdpAwal, bdpAkhir, bjAwal, bjAkhir, unit, markup });
  }
  bahanTerpakai(){ return this.bbAwal + this.bbBeli - this.bbAkhir; }
  totalBiayaProduksi(){ return this.bahanTerpakai() + this.btkl + this.bop; }
  hargaPokokProduksi(){ return this.totalBiayaProduksi() + this.bdpAwal - this.bdpAkhir; }
  hpp(){ return this.hargaPokokProduksi() + this.bjAwal - this.bjAkhir; }
  hppPerUnit(){ return this.unit > 0 ? this.hpp() / this.unit : null; }
  hargaJual(){
    const perUnit = this.hppPerUnit();
    return perUnit !== null ? perUnit * (1 + this.markup / 100) : null;
  }
  toPayload(){
    return {
      bb_awal:this.bbAwal, bb_beli:this.bbBeli, bb_akhir:this.bbAkhir, bahan_terpakai:this.bahanTerpakai(),
      btkl:this.btkl, bop:this.bop, total_biaya_produksi:this.totalBiayaProduksi(),
      bdp_awal:this.bdpAwal, bdp_akhir:this.bdpAkhir, harga_pokok_produksi:this.hargaPokokProduksi(),
      bj_awal:this.bjAwal, bj_akhir:this.bjAkhir, hpp:this.hpp(), unit_produksi:this.unit,
      hpp_per_unit:this.hppPerUnit() || 0, markup_persen:this.markup, harga_jual_per_unit:this.hargaJual() || 0
    };
  }
}

/* ---------- SERVICE: koneksi ke Google Sheets Web App ---------- */
class SheetConnector {
  constructor(store){
    this.store = store;
  }
  getUrl(){ return this.store.get('sheet_url', ''); }
  setUrl(url){ this.store.set('sheet_url', url); }
  isConnected(){ return !!this.getUrl(); }
  getNamaUsaha(){ return this.store.get('nama_usaha', ''); }
  setNamaUsaha(nama){ this.store.set('nama_usaha', nama); }

  send(sektor, payload, onDone){
    const url = this.getUrl();
    if(!url){ onDone(false); return; }
    const full = Object.assign({
      waktu: new Date().toLocaleString('id-ID'),
      sektor: sektor,
      nama_usaha: this.getNamaUsaha() || '-'
    }, payload);
    fetch(url, {
      method:'POST', mode:'no-cors',
      headers:{'Content-Type':'text/plain;charset=utf-8'},
      body: JSON.stringify(full)
    }).then(()=> onDone(true)).catch(()=> onDone(false, true));
  }
}

/* ---------- SERVICE: riwayat lokal + CSV ---------- */
class HistoryManager {
  constructor(store){
    this.store = store;
  }
  getAll(){ return this.store.get('riwayat', []); }
  add(sektor, namaUsaha, hppUtama, detail){
    const hist = this.getAll();
    hist.unshift({
      waktu: new Date().toLocaleString('id-ID'),
      sektor, nama_usaha: namaUsaha || '-', hpp_utama: hppUtama, detail
    });
    this.store.set('riwayat', hist);
    return hist;
  }
  removeAt(i){
    const hist = this.getAll();
    hist.splice(i, 1);
    this.store.set('riwayat', hist);
    return hist;
  }
  clear(){ this.store.set('riwayat', []); }

  static csvEscape(val){
    val = String(val === undefined || val === null ? '' : val);
    if(/[",\n]/.test(val)) val = '"' + val.replace(/"/g, '""') + '"';
    return val;
  }
  toCSV(){
    const header = ['waktu','sektor','nama_usaha','hpp_utama','detail_json'];
    const rows = [header.join(',')];
    this.getAll().forEach(e=>{
      rows.push([e.waktu, e.sektor, e.nama_usaha, e.hpp_utama, JSON.stringify(e.detail||{})]
        .map(HistoryManager.csvEscape).join(','));
    });
    return rows.join('\n');
  }
  static parseCSV(text){
    const rows = [];
    let row = [], field = '', inQuotes = false;
    for(let i=0;i<text.length;i++){
      const c = text[i];
      if(inQuotes){
        if(c === '"'){ if(text[i+1] === '"'){ field += '"'; i++; } else inQuotes = false; }
        else field += c;
      } else {
        if(c === '"') inQuotes = true;
        else if(c === ','){ row.push(field); field=''; }
        else if(c === '\n'){ row.push(field); rows.push(row); row=[]; field=''; }
        else if(c === '\r'){ /* skip */ }
        else field += c;
      }
    }
    if(field.length || row.length){ row.push(field); rows.push(row); }
    return rows;
  }
  importFromCSVText(text){
    const rows = HistoryManager.parseCSV(text);
    const header = rows[0];
    const idx = {
      waktu: header.indexOf('waktu'), sektor: header.indexOf('sektor'),
      nama_usaha: header.indexOf('nama_usaha'), hpp_utama: header.indexOf('hpp_utama'),
      detail_json: header.indexOf('detail_json')
    };
    const existing = this.getAll();
    let added = 0;
    for(let i=1;i<rows.length;i++){
      const r = rows[i];
      if(!r || r.length < 2) continue;
      let detail = {};
      try{ detail = JSON.parse(r[idx.detail_json] || '{}'); }catch(_){}
      existing.push({
        waktu:r[idx.waktu], sektor:r[idx.sektor], nama_usaha:r[idx.nama_usaha],
        hpp_utama:Number(r[idx.hpp_utama])||0, detail
      });
      added++;
    }
    this.store.set('riwayat', existing);
    return added;
  }
}

/* =========================================================
   CONTROLLER
   ========================================================= */
class HppApp {
  constructor(){
    this.store = new LocalStore('hpp');
    this.sheets = new SheetConnector(this.store);
    this.history = new HistoryManager(this.store);
    this.ingredientRowCount = 0;
  }

  init(){
    this.loadSheetPanel();
    this.seedIngredients();
    this.renderHistory();
  }

  showPage(id, btn){
    document.querySelectorAll('.tab-page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.pill-btn').forEach(t => t.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    btn.classList.add('active');
  }

  /* ---------- panel sheets ---------- */
  loadSheetPanel(){
    document.getElementById('sheet-url').value = this.sheets.getUrl();
    document.getElementById('nama-usaha').value = this.sheets.getNamaUsaha();
    this.updateSheetStatus();
    document.getElementById('nama-usaha').addEventListener('input', (e) => {
      this.sheets.setNamaUsaha(e.target.value);
    });
  }
  updateSheetStatus(){
    const el = document.getElementById('sheet-status');
    const connected = this.sheets.isConnected();
    el.textContent = connected ? 'Tersambung ✅' : 'Belum tersambung';
    el.style.color = connected ? '#1E7A57' : '#E8654F';
  }
  saveSheetUrl(){
    const v = document.getElementById('sheet-url').value.trim();
    this.sheets.setUrl(v);
    this.updateSheetStatus();
    Toast.show(v ? 'URL Sheets tersimpan ✅' : 'URL dikosongkan');
  }
  toggleGuide(){
    const g = document.getElementById('guide');
    const btn = document.getElementById('guide-toggle');
    const open = g.style.display !== 'none';
    g.style.display = open ? 'none' : 'block';
    btn.textContent = open
      ? 'Belum punya Sheets-nya? Lihat cara sambungkan (5 menit) ⌄'
      : 'Sembunyikan panduan ⌃';
  }
  copyCode(){
    const code = document.getElementById('gs-code').textContent;
    navigator.clipboard.writeText(code)
      .then(() => Toast.show('Kode Apps Script disalin 📋'))
      .catch(() => Toast.show('Gagal menyalin — salin manual ya'));
  }

  /* ---------- helper baca input ---------- */
  val(key){
    const el = document.querySelector(`[data-k="${key}"]`);
    if(!el) return 0;
    return el.type === 'number' ? (Number(el.value) || 0) : Money.toNumber(el.value);
  }

  /* ---------- SEKTOR 1: DAGANG ---------- */
  hitungDagang(){
    const dagang = new DagangHpp({
      awal:this.val('dg_awal'), akhir:this.val('dg_akhir'), pembelian:this.val('dg_pembelian'),
      ongkos:this.val('dg_ongkos'), retur:this.val('dg_retur'), potongan:this.val('dg_potongan'),
      unit:this.val('dg_unit'), markup:this.val('dg_markup')
    });
    document.getElementById('dg-pb').textContent = Money.format(dagang.pembelianBersih());
    document.getElementById('dg-awal-o').textContent = Money.format(dagang.awal);
    document.getElementById('dg-akhir-o').textContent = Money.format(dagang.akhir);
    document.getElementById('dg-hpp-o').textContent = Money.format(dagang.hpp());
    document.getElementById('dg-stamp-val').textContent = Money.format(dagang.hpp());
    document.getElementById('dg-stamp-sub').textContent = dagang.hppPerUnit() !== null
      ? 'per unit: ' + Money.format(dagang.hppPerUnit()) : 'isi jumlah unit untuk HPP per unit';
    document.getElementById('dg-jual').textContent = dagang.hargaJual() !== null
      ? Money.format(dagang.hargaJual()) + ' / unit' : 'isi jumlah unit dulu';
    this.popTag('dg-stamp', 'dg-placeholder');
    this._lastDagang = dagang;
    return dagang;
  }
  simpanDagang(){
    const d = this.hitungDagang();
    this.simpanHasil('Dagang', d.hpp(), d.toPayload());
  }

  /* ---------- SEKTOR 2: KULINER ---------- */
  seedIngredients(){
    this.addIngredientRow('Beras', '10000', 1, 'kg', 200, 'gram', 100);
    this.addIngredientRow('Ayam', '40000', 1, 'kg', 100, 'gram', 90);
    this.addIngredientRow('Bumbu & minyak', '2000', 1, 'pcs', 1, 'pcs', 100);
  }
  addIngredientRow(name, harga, isi, isiUnit, pakai, pakaiUnit, yieldp){
    this.ingredientRowCount++;
    const id = 'ing' + this.ingredientRowCount;
    const row = document.createElement('div');
    row.className = 'ing-row';
    row.id = id;
    row.innerHTML = `
      <div class="ing-field full"><span class="ing-mlabel">Bahan</span><input type="text" class="name-input" placeholder="mis. Tepung terigu" value="${name||''}"></div>
      <div class="ing-field"><span class="ing-mlabel">Harga Beli (Rp)</span><input type="text" class="rp-ing" placeholder="10000" value="${harga||''}"></div>
      <div class="ing-field">
        <span class="ing-mlabel">Isi Beli</span>
        <div class="qty-unit">
          <input type="number" class="qty-isi" placeholder="1000" value="${isi||''}">
          <select class="unit-isi">${UnitConverter.optionsHtml(isiUnit||'gram')}</select>
        </div>
      </div>
      <div class="ing-field">
        <span class="ing-mlabel">Dipakai</span>
        <div class="qty-unit">
          <input type="number" class="qty-pakai" placeholder="200" value="${pakai||''}">
          <select class="unit-pakai">${UnitConverter.optionsHtml(pakaiUnit||'gram')}</select>
        </div>
      </div>
      <div class="ing-field"><span class="ing-mlabel">Yield %</span><input type="number" class="yield-input" placeholder="100" value="${yieldp||100}"></div>
      <div class="unit-warning">⚠️ Satuan Isi Beli &amp; Dipakai tidak sejenis — bahan ini tidak ikut dihitung.</div>
      <span class="rm" onclick="document.getElementById('${id}').remove()">✕ Hapus bahan</span>
    `;
    document.getElementById('ing-list').appendChild(row);
    Money.bindLiveFormat(row.querySelector('.rp-ing'));
  }
  readIngredients(){
    const list = [];
    document.querySelectorAll('#ing-list .ing-row').forEach(row => {
      const ing = new Ingredient(
        row.querySelector('.name-input').value,
        Money.toNumber(row.querySelector('.rp-ing').value),
        Number(row.querySelector('.qty-isi').value) || 0,
        row.querySelector('.unit-isi').value,
        Number(row.querySelector('.qty-pakai').value) || 0,
        row.querySelector('.unit-pakai').value,
        Number(row.querySelector('.yield-input').value) || 100
      );
      row.classList.toggle('mismatch', !ing.isSameCategory());
      row.querySelector('.unit-warning').style.display = ing.isSameCategory() ? 'none' : 'block';
      list.push(ing);
    });
    return list;
  }
  hitungKuliner(){
    const kuliner = new KulinerHpp({
      ingredients: this.readIngredients(),
      tenaga: this.val('kl_tenaga'), overhead: this.val('kl_overhead'),
      porsi: this.val('kl_porsi'), foodCostPersen: this.val('kl_fc')
    });
    document.getElementById('kl-bahan').textContent = Money.format(kuliner.totalBahan());
    document.getElementById('kl-tenaga-o').textContent = Money.format(kuliner.tenaga);
    document.getElementById('kl-overhead-o').textContent = Money.format(kuliner.overhead);
    document.getElementById('kl-total-o').textContent = Money.format(kuliner.totalBatch());
    document.getElementById('kl-stamp-val').textContent = Money.format(kuliner.hppPerPorsi());
    document.getElementById('kl-stamp-sub').textContent = 'dari ' + kuliner.porsi + ' porsi';
    document.getElementById('kl-jual').textContent = kuliner.hargaJual() !== null
      ? Money.format(kuliner.hargaJual()) + ' / porsi' : '—';
    this.popTag('kl-stamp', 'kl-placeholder');
    this._lastKuliner = kuliner;
    return kuliner;
  }
  simpanKuliner(){
    const k = this.hitungKuliner();
    this.simpanHasil('Kuliner', k.hppPerPorsi(), k.toPayload());
  }

  /* ---------- SEKTOR 3: MANUFAKTUR ---------- */
  hitungManufaktur(){
    const mf = new ManufakturHpp({
      bbAwal:this.val('mf_bb_awal'), bbBeli:this.val('mf_bb_beli'), bbAkhir:this.val('mf_bb_akhir'),
      btkl:this.val('mf_btkl'), bop:this.val('mf_bop'),
      bdpAwal:this.val('mf_bdp_awal'), bdpAkhir:this.val('mf_bdp_akhir'),
      bjAwal:this.val('mf_bj_awal'), bjAkhir:this.val('mf_bj_akhir'),
      unit:this.val('mf_unit'), markup:this.val('mf_markup')
    });
    document.getElementById('mf-bb-o').textContent = Money.format(mf.bahanTerpakai());
    document.getElementById('mf-btkl-o').textContent = Money.format(mf.btkl);
    document.getElementById('mf-bop-o').textContent = Money.format(mf.bop);
    document.getElementById('mf-tbp-o').textContent = Money.format(mf.totalBiayaProduksi());
    document.getElementById('mf-hpprod-o').textContent = Money.format(mf.hargaPokokProduksi());
    document.getElementById('mf-stamp-val').textContent = Money.format(mf.hpp());
    document.getElementById('mf-stamp-sub').textContent = mf.hppPerUnit() !== null
      ? 'per unit: ' + Money.format(mf.hppPerUnit()) : 'isi jumlah unit untuk HPP per unit';
    document.getElementById('mf-jual').textContent = mf.hargaJual() !== null
      ? Money.format(mf.hargaJual()) + ' / unit' : 'isi jumlah unit dulu';
    this.popTag('mf-stamp', 'mf-placeholder');
    this._lastManufaktur = mf;
    return mf;
  }
  simpanManufaktur(){
    const m = this.hitungManufaktur();
    this.simpanHasil('Manufaktur', m.hpp(), m.toPayload());
  }

  /* ---------- simpan terpadu: riwayat lokal + Sheets ---------- */
  simpanHasil(sektor, hppUtama, payload){
    const namaUsaha = this.sheets.getNamaUsaha();
    this.history.add(sektor, namaUsaha, hppUtama, payload);
    this.renderHistory();

    if(!this.sheets.isConnected()){
      Toast.show('📥 Tersimpan ke riwayat lokal. Sambungkan Sheets untuk backup ke cloud.');
      return;
    }
    this.sheets.send(sektor, payload, (ok, failed) => {
      if(ok) Toast.show('Tersimpan ke riwayat lokal 📥 + Google Sheets ✅');
      else if(failed) Toast.show('Tersimpan lokal 📥, tapi gagal kirim ke Sheets — cek URL Web App');
    });
  }

  /* ---------- riwayat ---------- */
  renderHistory(){
    const hist = this.history.getAll();
    const container = document.getElementById('history-table');
    if(!container) return;
    if(hist.length === 0){
      container.innerHTML = '<div class="hist-empty">Belum ada riwayat. Klik "💾 Simpan hasil ke Google Sheets" di salah satu kalkulator — otomatis tercatat di sini juga.</div>';
      return;
    }
    let html = '<div style="overflow-x:auto;"><table class="hist-table"><tr>' +
      '<th>Waktu</th><th>Sektor</th><th>Usaha</th><th style="text-align:right;">HPP</th><th></th></tr>';
    hist.forEach((e, i) => {
      html += `<tr>
        <td>${e.waktu||'-'}</td><td>${e.sektor||'-'}</td><td>${e.nama_usaha||'-'}</td>
        <td style="text-align:right; font-weight:800;">${Money.format(e.hpp_utama)}</td>
        <td style="text-align:center;"><span class="rm" style="color:var(--coral-dark); cursor:pointer;" onclick="app.deleteHistoryRow(${i})">✕</span></td>
      </tr>`;
    });
    html += '</table></div>';
    container.innerHTML = html;
  }
  deleteHistoryRow(i){ this.history.removeAt(i); this.renderHistory(); }
  clearHistory(){
    if(confirm('Hapus semua riwayat lokal? Tindakan ini tidak bisa dibatalkan.')){
      this.history.clear();
      this.renderHistory();
      Toast.show('Riwayat dihapus 🗑️');
    }
  }
  exportCSV(){
    const csv = this.history.toCSV();
    const blob = new Blob([csv], { type:'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'riwayat-hpp-' + new Date().toISOString().slice(0,10) + '.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    Toast.show('CSV terunduh ⬇️');
  }
  importCSV(file){
    if(!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try{
        const added = this.history.importFromCSVText(e.target.result);
        this.renderHistory();
        Toast.show('Impor berhasil: ' + added + ' baris ditambahkan ✅');
      }catch(err){
        Toast.show('Gagal membaca CSV — pastikan formatnya sesuai');
      }
    };
    reader.readAsText(file);
  }

  /* ---------- animasi tag hasil ---------- */
  popTag(stampId, placeholderId){
    const tag = document.getElementById(stampId);
    const ph = document.getElementById(placeholderId);
    ph.style.display = 'none';
    tag.classList.remove('show');
    void tag.offsetWidth;
    tag.classList.add('show');
  }
}

const app = new HppApp();
document.addEventListener('DOMContentLoaded', () => app.init());

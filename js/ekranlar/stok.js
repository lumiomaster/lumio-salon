import { t } from '../i18n.js';
import { mesajYap } from '../mesaj.js';
import { h, doldur, hataMetni, bildir, kilitli, sayi, para, pencereAc, onayIste, lisansDurumu, telNormalize } from '../util.js';
import { S } from '../durum.js';
import { yetkiliMi } from '../roller.js';
import { auth, db, doc, collection, getDocs, query, where, writeBatch, serverTimestamp, increment } from '../fb.js';
import { urunleriYukle, stokAyariYukle, uyeleriYukle } from '../veri.js';
import { tarihMetin, tarihEkle } from '../takvim-mantik.js';
import { waAc, tarihTR } from '../mesaj.js';
import { stokYazi, miktarOlustur, miktarAyir, azMi, siparisOner, paketBoyu, birimAdi, birimMaliyet, birimSatis } from '../stok-mantik.js';

const yol = (...p) => collection(db, 'salons', S.salon.id, ...p);
const bugun = () => tarihMetin(new Date());
const yv = (n) => Math.round((Number(n) || 0) * 100) / 100;
const TUR = { giris: 'Mal kabul', sayim: 'Sayım', formul: 'Formül', satis: 'Satış', duzeltme: 'Düzeltme' };

function hareket(b, urunId, miktar, tur, ref, not) {
  b.set(doc(yol('stokHareket')), { urunId, miktar: yv(miktar), tur, ref: ref || '', not: not || '', uid: auth.currentUser.uid, gun: bugun(), zaman: serverTimestamp() });
}

export function stokEkrani() {
  const kutu = h('div', null, h('p', { class: 'soluk' }, t('Yükleniyor…')));
  const yenile = () => yukle(kutu, yenile);
  yenile();
  return kutu;
}

async function yukle(kutu, yenile) {
  try {
    const [urunler, ayar] = await Promise.all([urunleriYukle(), stokAyariYukle()]);
    ciz(kutu, { urunler, ayar }, yenile);
  } catch (e) {
    console.error(e);
    kutu.replaceChildren(h('div', { class: 'uyari' }, hataMetni(e)), h('button', { class: 'dugme ikincil', type: 'button', onclick: yenile }, t('Tekrar dene')));
  }
}

function sayimGecikti(ayar) {
  if (!ayar.sonSayim) return true;
  return ayar.sonSayim < tarihEkle(bugun(), -7);
}

function ciz(kutu, D, yenile) {
  const duzenle = yetkiliMi(S.profil.rol) && lisansDurumu(S.salon).aktif;
  const aktifler = D.urunler.filter(u => u.aktif !== false), pasifler = D.urunler.filter(u => u.aktif === false);
  const azlar = aktifler.filter(azMi);
  const kart = (u) => h('button', { class: 'kart urun-kart tikla', type: 'button', onclick: () => urunDetay(u, D, yenile) },
    h('div', { class: 'uye-ust' }, h('strong', null, u.ad), h('span', { class: azMi(u) ? 'eksi' : '' }, stokYazi(u, u.stok))),
    h('div', { class: 'kucuk' }, (u.birim === 'gram' ? t('1 tüp = {g} gr', { g: u.paketGram }) : t('Adetle sayılır')) + (azMi(u) ? ' · ⚠️ ' + t('Azalıyor') : '') + (u.alis != null ? ' · ' + t('Alış') + ' ' + para(u.alis) : '')));
  doldur(kutu,
    h('div', { class: 'baslik-satir' }, h('h2', { class: 'ilk' }, t('Stok')),
      duzenle ? h('button', { class: 'dugme kucuk-dugme', type: 'button', onclick: () => urunFormu(null, D, yenile) }, t('+ Ürün')) : null),
    duzenle && aktifler.length ? h('div', { class: 'stok-islemler' },
      h('button', { class: 'dugme ikincil kucuk-dugme', type: 'button', onclick: () => malKabulFormu(D, yenile) }, t('Mal kabul / fatura')),
      h('button', { class: 'dugme ikincil kucuk-dugme', type: 'button', onclick: () => sayimFormu(D, yenile) }, t('Haftalık sayım')),
      h('button', { class: 'dugme ikincil kucuk-dugme', type: 'button', onclick: () => siparisListesi(D, yenile) }, t('Sipariş listesi') + (azlar.length ? ' (' + azlar.length + ')' : ''))) : null,
    aktifler.length && sayimGecikti(D.ayar) ? h('div', { class: 'kart bilgi' }, h('strong', null, t('Sayım zamanı')), h('p', { class: 'kucuk' }, D.ayar.sonSayim ? t('Son sayım {t}. Haftada bir sayıp girin; farklar kayda geçer.', { t: tarihTR(D.ayar.sonSayim) }) : t('Henüz sayım yapılmadı. Raftakini sayıp girerek başlayın.'))) : null,
    azlar.length ? h('div', { class: 'kart bilgi' }, h('strong', null, '⚠️ ' + t('Azalan ürünler')), h('p', { class: 'kucuk' }, azlar.map(u => u.ad + ' (' + stokYazi(u, u.stok) + ')').join(', '))) : null,
    aktifler.length === 0 ? h('div', { class: 'kart' }, h('p', null, t('Henüz ürün yok. Boya, oksidan, şampuan gibi kullandığınız ve sattığınız ürünleri ekleyin; formülde ve satışta bu listeden seçilir, stok kendiliğinden düşer.'))) : aktifler.map(kart),
    pasifler.length ? h('details', null, h('summary', null, t('Pasif ürünler ({n})', { n: pasifler.length })), pasifler.map(kart)) : null);
}

// ---------- Ürün kartı formu ----------
// sonra verilirse (mal kabulden açıldığında) kayıttan sonra yenile yerine yeni ürünle birlikte çağrılır; elde stok sorulmaz (fatura ekler)
function urunFormu(u, D, yenile, sonra) {
  const yeni = !u;
  const st = { birim: u ? u.birim : 'gram' };
  const ad = h('input', { type: 'text', maxlength: 60, value: u ? u.ad : '', placeholder: t('örn. Wella 6.0 boya') });
  const paket = h('input', { type: 'text', inputmode: 'decimal', value: u && u.birim === 'gram' ? u.paketGram : '60', placeholder: '60' });
  const alis = h('input', { type: 'text', inputmode: 'decimal', value: u && u.alis != null ? String(u.alis).replace('.', ',') : '', placeholder: '0' });
  const satis = h('input', { type: 'text', inputmode: 'decimal', value: u && u.satis != null ? String(u.satis).replace('.', ',') : '', placeholder: '0' });
  const enAz = h('input', { type: 'text', inputmode: 'decimal', value: u ? String(miktarAyir(u, u.enAz).tup + (u.birim === 'gram' && miktarAyir(u, u.enAz).gr ? miktarAyir(u, u.enAz).gr / u.paketGram : 0)).replace('.', ',') : '', placeholder: '0' });
  const bTup = h('input', { type: 'text', inputmode: 'decimal', placeholder: '0' });
  const bGr = h('input', { type: 'text', inputmode: 'decimal', placeholder: '0' });
  const kutu = h('div', null);
  const hata = h('div', { class: 'hata', role: 'alert' });
  const dugme = h('button', { class: 'dugme', type: 'submit' }, t('Kaydet'));
  const cizAlan = () => {
    const gr = st.birim === 'gram', b = gr ? t('tüp') : t('adet');
    doldur(kutu,
      h('label', null, t('Ürün adı'), ad),
      yeni ? h('label', null, t('Nasıl ölçülür?'), h('select', { onchange: (e) => { st.birim = e.target.value; cizAlan(); } },
        h('option', { value: 'gram', selected: gr }, t('Gramla (boya, oksidan, açıcı toz…)')),
        h('option', { value: 'adet', selected: !gr }, t('Adetle (şampuan, krem, fön spreyi…)')))) : h('p', { class: 'kucuk' }, gr ? t('Gramla ölçülür.') : t('Adetle sayılır.')),
      gr ? h('label', null, t('Bir tüp/paket kaç gram?'), paket) : null,
      h('div', { class: 'iki-sutun' },
        h('label', null, t('Alış fiyatı (₺, 1 {b})', { b }), alis),
        h('label', null, t('Satış fiyatı (₺, 1 {b})', { b }), satis)),
      h('label', null, t('En az stok ({b}) — altına inince uyarı çıkar', { b }), enAz),
      yeni && !sonra ? h('div', null, h('strong', null, t('Şu an elinizdeki')),
        h('div', { class: 'iki-sutun' }, h('label', null, b === t('tüp') ? t('Tüp') : t('Adet'), bTup), gr ? h('label', null, t('+ Gram'), bGr) : null)) : null);
  };
  cizAlan();
  const icerik = h('div', null);
  const p = pencereAc(yeni ? t('Yeni ürün') : u.ad, icerik);
  icerik.append(h('form', { class: 'form', novalidate: true,
    onsubmit: (e) => {
      e.preventDefault(); hata.textContent = '';
      const adV = ad.value.trim(); if (adV.length < 2) { hata.textContent = t('Ürün adını yazın.'); return; }
      const gr = st.birim === 'gram';
      const pg = gr ? sayi(paket.value) : 0;
      if (gr && !(pg > 0)) { hata.textContent = t('Bir tüpün gramını yazın.'); return; }
      const a = alis.value.trim() === '' ? 0 : sayi(alis.value), s = satis.value.trim() === '' ? 0 : sayi(satis.value), ea = enAz.value.trim() === '' ? 0 : sayi(enAz.value);
      if (![a, s, ea].every(Number.isFinite) || a < 0 || s < 0 || ea < 0) { hata.textContent = t('Fiyat ve miktarları sayı olarak yazın.'); return; }
      const bt = bTup.value.trim() === '' ? 0 : sayi(bTup.value), bg = bGr.value.trim() === '' ? 0 : sayi(bGr.value);
      if (yeni && (!Number.isFinite(bt) || !Number.isFinite(bg) || bt < 0 || bg < 0)) { hata.textContent = t('Elinizdeki miktarı sayı olarak yazın.'); return; }
      const tmp = { birim: st.birim, paketGram: pg };
      kilitli(dugme, async () => {
        try {
          const b = writeBatch(db);
          const ref = yeni ? doc(yol('urunler')) : doc(db, 'salons', S.salon.id, 'urunler', u.id);
          const stok = yeni ? miktarOlustur(tmp, bt, bg) : u.stok;
          const kart = { ad: adV, birim: st.birim, paketGram: pg, enAz: yv(ea * (gr ? pg : 1)), guncelleme: serverTimestamp() };
          // Düzenlemede stok'a dokunulmaz (başkası aynı anda stok düşürmüş olabilir)
          if (yeni) b.set(ref, { ...kart, stok, aktif: true }); else b.update(ref, kart);
          b.set(doc(db, 'salons', S.salon.id, 'urunFiyat', ref.id), { alis: yv(a), satis: yv(s), guncelleme: serverTimestamp() });
          if (yeni && stok > 0) hareket(b, ref.id, stok, 'giris', '', 'Başlangıç stoku');
          await b.commit(); p.kapat(); bildir(t('Ürün kaydedildi'));
          if (sonra) sonra({ id: ref.id, ad: adV, birim: st.birim, paketGram: pg, enAz: kart.enAz, stok, aktif: true, alis: yv(a), satis: yv(s) }); else yenile();
        } catch (err) { console.error(err); hata.textContent = hataMetni(err); }
      });
    } }, kutu, hata, dugme));
}

// ---------- Ürün ayrıntısı ----------
async function urunDetay(u, D, yenile) {
  const duzenle = yetkiliMi(S.profil.rol) && lisansDurumu(S.salon).aktif;
  const gecmis = h('div', null, h('p', { class: 'soluk' }, t('Yükleniyor…')));
  const bm = birimMaliyet(u), bs = birimSatis(u);
  const icerik = h('div', { class: 'ayrinti' },
    h('div', { class: 'kart kasa-ozet' },
      h('div', { class: 'hesap-satir' }, h('span', null, t('Eldeki')), h('strong', { class: azMi(u) ? 'eksi' : '' }, stokYazi(u, u.stok))),
      u.enAz > 0 ? h('div', { class: 'hesap-satir' }, h('span', null, t('En az stok')), h('span', null, stokYazi(u, u.enAz))) : null,
      u.alis != null ? h('div', { class: 'hesap-satir' }, h('span', null, t('Alış (1 {b})', { b: birimAdi(u) })), h('span', null, para(u.alis))) : null,
      u.satis != null ? h('div', { class: 'hesap-satir' }, h('span', null, t('Satış (1 {b})', { b: birimAdi(u) })), h('span', null, para(u.satis))) : null,
      u.birim === 'gram' && bm != null ? h('div', { class: 'hesap-satir' }, h('span', null, t('Gram maliyeti')), h('span', null, para(bm))) : null),
    duzenle ? h('div', { class: 'dugme-satir sol' },
      h('button', { class: 'dugme ikincil kucuk-dugme', type: 'button', onclick: () => { p.kapat(); urunFormu(u, D, yenile); } }, t('Düzenle')),
      h('button', { class: 'dugme ikincil kucuk-dugme', type: 'button', onclick: async () => {
        const pasif = u.aktif !== false;
        if (pasif && !(await onayIste(t('"{ad}" pasife alınsın mı? Listeden ve formüllerden kalkar, geçmişi kalır.', { ad: u.ad }), t('Evet, pasife al')))) return;
        try {
          const b = writeBatch(db);
          b.update(doc(db, 'salons', S.salon.id, 'urunler', u.id), { aktif: !pasif, guncelleme: serverTimestamp() });
          await b.commit(); p.kapat(); yenile();
        } catch (e) { console.error(e); bildir(hataMetni(e), 'hata'); }
      } }, u.aktif !== false ? t('Pasife al') : t('Tekrar aktif et'))) : null,
    h('h3', null, t('Son hareketler')), gecmis);
  const p = pencereAc(u.ad, icerik);
  try {
    const [sn, uyeler] = await Promise.all([getDocs(query(yol('stokHareket'), where('urunId', '==', u.id))), uyeleriYukle()]);
    const ms = (z) => (z && z.toMillis ? z.toMillis() : 0);
    const l = sn.docs.map(d => d.data()).sort((a, b) => ms(b.zaman) - ms(a.zaman)).slice(0, 25);
    doldur(gecmis, l.length ? l.map(x => h('div', { class: 'hesap-satir' },
      h('span', null, tarihTR(x.gun).slice(0, 5) + ' · ' + t(TUR[x.tur] || x.tur) + ' · ' + ((uyeler.find(y => y.id === x.uid) || { ad: '?' }).ad.split(' ')[0]) + (x.not ? ' · ' + x.not : '')),
      h('span', { class: x.miktar < 0 ? 'eksi' : '' }, (x.miktar > 0 ? '+' : '') + stokYazi(u, x.miktar)))) : h('p', { class: 'soluk' }, t('Henüz hareket yok.')));
  } catch (e) { doldur(gecmis, h('p', { class: 'kucuk' }, hataMetni(e))); }
}

// ---------- Mal kabul / alış faturası ----------
function malKabulFormu(D, yenile) {
  const aktifler = D.urunler.filter(u => u.aktif !== false);
  const satirlar = [{ urunId: '', miktar: '', fiyat: '' }];
  const tedarikci = h('input', { type: 'text', maxlength: 60, placeholder: t('Tedarikçi / firma') });
  const faturaNo = h('input', { type: 'text', maxlength: 30, placeholder: t('Fatura / irsaliye no (isteğe bağlı)') });
  const tarih = h('input', { type: 'date', value: bugun(), max: bugun() });
  const kutu = h('div', { class: 'satirlar' }), ozet = h('div', { class: 'odeme-ozet' });
  const hata = h('div', { class: 'hata', role: 'alert' });
  const dugme = h('button', { class: 'dugme', type: 'submit' }, t('Kaydet ve stoğa ekle'));
  const uOf = (id) => aktifler.find(x => x.id === id);
  const toplam = () => yv(satirlar.reduce((a, s) => a + (Math.max(0, sayi(s.miktar) || 0) * Math.max(0, sayi(s.fiyat) || 0)), 0));
  const cizOzet = () => doldur(ozet, h('div', { class: 'uye-ust' }, h('span', { class: 'soluk' }, t('Fatura toplamı')), h('strong', null, para(toplam()))));
  const ciz = () => {
    doldur(kutu, satirlar.map((s, i) => {
      const u = uOf(s.urunId);
      return h('div', { class: 'satir' },
        h('div', { class: 'satir-ust' },
          h('select', { 'aria-label': t('Ürün'), onchange: (e) => {
            if (e.target.value === '__yeni') {
              e.target.value = s.urunId;
              urunFormu(null, D, null, (yeniUrun) => { aktifler.push(yeniUrun); D.urunler.push(yeniUrun); s.urunId = yeniUrun.id; s.fiyat = yeniUrun.alis ? String(yeniUrun.alis).replace('.', ',') : ''; ciz(); yenile(); });
              return;
            }
            s.urunId = e.target.value; const x = uOf(s.urunId); s.fiyat = x && x.alis ? String(x.alis).replace('.', ',') : ''; ciz(); } },
            h('option', { value: '' }, t('Ürün seçin…')), h('option', { value: '__yeni' }, '＋ ' + t('Yeni ürün ekle')), aktifler.map(x => h('option', { value: x.id, selected: x.id === s.urunId }, x.ad))),
          satirlar.length > 1 ? h('button', { class: 'ikon-dugme', type: 'button', 'aria-label': t('Satırı sil'), onclick: () => { satirlar.splice(i, 1); ciz(); } }, '🗑') : null),
        h('div', { class: 'iki-sutun' },
          h('label', null, u ? t('Gelen ({b})', { b: birimAdi(u) }) : t('Gelen miktar'), h('input', { type: 'text', inputmode: 'decimal', value: s.miktar, placeholder: '0', oninput: (e) => { s.miktar = e.target.value; cizOzet(); } })),
          h('label', null, u ? t('Birim fiyat (₺/{b})', { b: birimAdi(u) }) : t('Birim fiyat (₺)'), h('input', { type: 'text', inputmode: 'decimal', value: s.fiyat, placeholder: '0', oninput: (e) => { s.fiyat = e.target.value; cizOzet(); } }))));
    }), satirlar.length < 30 ? h('button', { class: 'dugme ikincil kucuk-dugme', type: 'button', onclick: () => { satirlar.push({ urunId: '', miktar: '', fiyat: '' }); ciz(); } }, t('+ Ürün ekle')) : null);
    cizOzet();
  };
  ciz();
  const icerik = h('div', null);
  const p = pencereAc(t('Mal kabul / fatura'), icerik);
  icerik.append(h('form', { class: 'form', novalidate: true,
    onsubmit: (e) => {
      e.preventDefault(); hata.textContent = '';
      // Aynı ürün iki satırda yazıldıysa birleştirilir
      const harita = new Map();
      for (const s of satirlar) {
        if (!s.urunId && !s.miktar) continue;
        if (!s.urunId) { hata.textContent = t('Her satır için ürün seçin.'); return; }
        const m = sayi(s.miktar), f = s.fiyat === '' ? 0 : sayi(s.fiyat);
        if (!(m > 0) || !Number.isFinite(f) || f < 0) { hata.textContent = t('Gelen miktarı ve fiyatı sayı olarak yazın.'); return; }
        const o = harita.get(s.urunId) || { urunId: s.urunId, miktar: 0, tutar: 0 };
        o.miktar += m; o.tutar += m * f; harita.set(s.urunId, o);
      }
      if (!harita.size) { hata.textContent = t('En az bir ürün ekleyin.'); return; }
      if (!tarih.value) { hata.textContent = t('Tarihi seçin.'); return; }
      kilitli(dugme, async () => {
        try {
          const b = writeBatch(db);
          const aref = doc(yol('alislar'));
          const kalemler = [];
          for (const o of harita.values()) {
            const u = uOf(o.urunId), fiyat = yv(o.tutar / o.miktar), baz = o.miktar * paketBoyu(u);
            kalemler.push({ urunId: u.id, ad: u.ad, miktar: yv(o.miktar), birim: birimAdi(u), birimFiyat: fiyat, tutar: yv(o.tutar) });
            b.update(doc(db, 'salons', S.salon.id, 'urunler', u.id), { stok: increment(yv(baz)), guncelleme: serverTimestamp() });
            hareket(b, u.id, baz, 'giris', aref.id, (tedarikci.value.trim() || 'Mal kabul').slice(0, 100));
            if (fiyat > 0 && yv(fiyat) !== yv(u.alis || 0)) b.set(doc(db, 'salons', S.salon.id, 'urunFiyat', u.id), { alis: fiyat, satis: yv(u.satis || 0), guncelleme: serverTimestamp() });
          }
          b.set(aref, { tarih: tarih.value, tedarikci: tedarikci.value.trim(), faturaNo: faturaNo.value.trim(), kalemler, toplam: yv(kalemler.reduce((a, k) => a + k.tutar, 0)), not: '', uid: auth.currentUser.uid, zaman: serverTimestamp() });
          await b.commit(); p.kapat(); bildir(t('Stoğa eklendi')); yenile();
        } catch (err) { console.error(err); hata.textContent = hataMetni(err); }
      });
    } },
    h('label', null, t('Tedarikçi'), tedarikci), h('label', null, t('Fatura no'), faturaNo), h('label', null, t('Tarih'), tarih),
    h('h3', null, t('Gelen ürünler')), kutu, ozet,
    h('p', { class: 'kucuk' }, t('Birim fiyat farklıysa ürünün alış fiyatı da güncellenir.')), hata, dugme));
}

// ---------- Haftalık sayım ----------
function sayimFormu(D, yenile) {
  const aktifler = D.urunler.filter(u => u.aktif !== false);
  const satir = aktifler.map(u => {
    const a = miktarAyir(u, u.stok);
    const tup = h('input', { type: 'text', inputmode: 'decimal', value: String(a.tup).replace('.', ','), 'aria-label': t('Tüp/adet') });
    const gr = u.birim === 'gram' ? h('input', { type: 'text', inputmode: 'decimal', value: String(a.gr), 'aria-label': t('Gram') }) : null;
    const fark = h('span', { class: 'kucuk' });
    const oku = () => { const tv = tup.value.trim() === '' ? 0 : sayi(tup.value), gv = gr ? (gr.value.trim() === '' ? 0 : sayi(gr.value)) : 0; return (Number.isFinite(tv) && Number.isFinite(gv) && tv >= 0 && gv >= 0) ? miktarOlustur(u, tv, gv) : NaN; };
    const guncelle = () => { const m = oku(); if (!Number.isFinite(m)) { fark.textContent = t('Geçersiz'); return; } const d = yv(m - u.stok); fark.textContent = d === 0 ? '' : (d > 0 ? '+' : '') + stokYazi(u, d); fark.className = 'kucuk' + (d < 0 ? ' eksi' : ''); };
    tup.addEventListener('input', guncelle); if (gr) gr.addEventListener('input', guncelle);
    return { u, oku, el: h('div', { class: 'satir' }, h('div', { class: 'uye-ust' }, h('strong', null, u.ad), fark),
      h('div', { class: 'iki-sutun' }, h('label', null, u.birim === 'gram' ? t('Tüp') : t('Adet'), tup), gr ? h('label', null, t('+ Gram'), gr) : null),
      h('div', { class: 'kucuk' }, t('Kayıtlı: {s}', { s: stokYazi(u, u.stok) }))) };
  });
  const hata = h('div', { class: 'hata', role: 'alert' });
  const dugme = h('button', { class: 'dugme', type: 'submit' }, t('Sayımı kaydet'));
  const icerik = h('div', null);
  const p = pencereAc(t('Haftalık sayım'), icerik);
  icerik.append(h('form', { class: 'form', novalidate: true,
    onsubmit: (e) => {
      e.preventDefault(); hata.textContent = '';
      const degisen = [];
      for (const s of satir) {
        const m = s.oku();
        if (!Number.isFinite(m)) { hata.textContent = t('{ad}: sayıyı kontrol edin.', { ad: s.u.ad }); return; }
        if (yv(m - s.u.stok) !== 0) degisen.push({ u: s.u, m, fark: yv(m - s.u.stok) });
      }
      kilitli(dugme, async () => {
        try {
          const b = writeBatch(db);
          degisen.forEach(({ u, m, fark }) => {
            b.update(doc(db, 'salons', S.salon.id, 'urunler', u.id), { stok: m, guncelleme: serverTimestamp() });
            hareket(b, u.id, fark, 'sayim', '', 'Haftalık sayım');
          });
          b.set(doc(db, 'salons', S.salon.id, 'ayarlar', 'stok'), { sonSayim: bugun(), tedarikciTel: D.ayar.tedarikciTel || '', guncelleme: serverTimestamp() });
          await b.commit(); p.kapat();
          bildir(degisen.length ? t('Sayım kaydedildi, {n} üründe fark var.', { n: degisen.length }) : t('Sayım kaydedildi, fark yok.')); yenile();
        } catch (err) { console.error(err); hata.textContent = hataMetni(err); }
      });
    } },
    h('p', { class: 'kucuk' }, t('Raftaki gerçek miktarı yazın. Kayıtlıdan farklıysa fark stok hareketi olarak kaydedilir (eksik çıkanlar fire/kayıp demektir).')),
    satir.map(s => s.el), hata, dugme));
}

// ---------- Sipariş listesi (WhatsApp) ----------
function siparisListesi(D, yenile) {
  const azlar = D.urunler.filter(azMi);
  const satirlar = azlar.map(u => ({ u, sec: true, miktar: String(siparisOner(u)) }));
  const tel = h('input', { type: 'tel', inputmode: 'tel', maxlength: 30, value: D.ayar.tedarikciTel || '', placeholder: t('Tedarikçi WhatsApp numarası (isteğe bağlı)') });
  const kutu = h('div', null);
  const ciz = () => doldur(kutu, satirlar.length === 0 ? h('p', { class: 'soluk' }, t('Azalan ürün yok. Ürünlere "en az stok" yazarsanız burada otomatik listelenir.')) : satirlar.map(s => h('div', { class: 'satir' },
    h('label', { class: 'onay-satir' }, h('input', { type: 'checkbox', checked: s.sec, onchange: (e) => { s.sec = e.target.checked; } }), h('strong', null, s.u.ad)),
    h('div', { class: 'kucuk' }, t('Eldeki: {s}', { s: stokYazi(s.u, s.u.stok) })),
    h('label', null, t('Sipariş ({b})', { b: birimAdi(s.u) }), h('input', { type: 'text', inputmode: 'decimal', value: s.miktar, oninput: (e) => { s.miktar = e.target.value; } })))));
  ciz();
  const metin = () => {
    const l = satirlar.filter(s => s.sec && sayi(s.miktar) > 0).map(s => '• ' + s.u.ad + ' — ' + sayi(s.miktar) + ' ' + birimAdi(s.u));
    return l.length ? mesajYap('siparis', { LISTE: l.join('\n') }) : '';
  };
  const hata = h('div', { class: 'hata', role: 'alert' });
  const gonder = h('button', { class: 'dugme', type: 'button', onclick: async () => {
    hata.textContent = ''; const m = metin(); if (!m) { hata.textContent = t('Sipariş edilecek ürün seçin.'); return; }
    if (tel.value.trim() !== (D.ayar.tedarikciTel || '')) {
      try { const b = writeBatch(db); b.set(doc(db, 'salons', S.salon.id, 'ayarlar', 'stok'), { sonSayim: D.ayar.sonSayim || '', tedarikciTel: tel.value.trim(), guncelleme: serverTimestamp() }); await b.commit(); D.ayar.tedarikciTel = tel.value.trim(); } catch (e) { console.error(e); }
    }
    waAc(telNormalize(tel.value) || '', m);
  } }, t("WhatsApp'ta aç"));
  const kopya = h('button', { class: 'dugme ikincil', type: 'button', onclick: async () => { const m = metin(); if (!m) return; try { await navigator.clipboard.writeText(m); bildir(t('Kopyalandı')); } catch (e) { bildir(t('Kopyalanamadı'), 'hata'); } } }, t('Kopyala'));
  pencereAc(t('Sipariş listesi'), h('div', { class: 'form' }, h('p', { class: 'kucuk' }, t('En az stoğun altına inen ürünler. Miktarları düzenleyip tedarikçiye WhatsApp\'tan gönderebilirsiniz.')), kutu, h('label', null, t('Tedarikçi numarası'), tel), hata, h('div', { class: 'dugme-satir' }, gonder, kopya)));
}

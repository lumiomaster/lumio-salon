import { t } from '../i18n.js';
import { h, doldur, hataMetni, bildir, kilitli, para, sayi, pencereAc } from '../util.js';
import { S } from '../durum.js';
import { auth, db, doc, collection, writeBatch, serverTimestamp } from '../fb.js';
import { uyeleriYukle, ustalariYukle, ayariYukle, donemiYukle, hizmetleriYukle, urunleriYukle, oranAyariYukle } from '../veri.js';
import { satisStokYaz } from '../stok-yaz.js';
import { paketBoyu, birimAdi, stokYazi } from '../stok-mantik.js';
import { tarihMetin, dkMetin } from '../takvim-mantik.js';
import { yuvarla, urunKari } from '../kasa-mantik.js';
import { sembol } from '../ulke.js';

// Ödeme alma formu. randevu verilirse kalemleri hazır gelir; verilmezse "ürün satışı" olur.
// bitti(): ödeme yazılınca ekranı yenilemek için çağrılır.
export async function odemeFormu(randevu, bitti) {
  let uyeler, u, ayar, hizmetler, urunler, tumHizmetler = [], oranAy = { caprazYuzde: 0 };
  try { [uyeler, u, ayar, hizmetler, urunler] = await Promise.all([uyeleriYukle(), ustalariYukle(), ayariYukle(true), hizmetleriYukle(), urunleriYukle().catch(() => [])]); oranAy = await oranAyariYukle().catch(() => oranAy); tumHizmetler = hizmetler; hizmetler = hizmetler.filter(x => x.aktif); urunler = urunler.filter(x => x.aktif !== false); }
  catch (e) { console.error(e); bildir(hataMetni(e), 'hata'); return; }
  const oran = ayar ? ayar.posOrani : 0;
  const ad = (uid) => (uyeler.find(x => x.id === uid) || { ad: '?' }).ad;
  const ustaAday = uyeler.filter(x => x.aktif && u.profil[x.id] && u.profil[x.id].calisir);

  const asilUsta = randevu && randevu.kalemler[0] ? (randevu.kalemler[0].ustaUid || '') : '';   // ek hizmeti satan: varsayılan olarak asıl randevuyu alan usta
  const satirlar = randevu
    ? randevu.kalemler.map(k => ({ ustaUid: k.ustaUid, ad: k.ad, hizmetId: k.hizmetId || '', grup: ((tumHizmetler.find(x => x.id === k.hizmetId) || {}).oranGrup) || '', tutar: String(k.fiyat || 0).replace('.', ','), alis: '', tur: 'hizmet' }))
    : [{ ustaUid: ustaAday[0] ? ustaAday[0].id : '', ad: '', tutar: '', alis: '', tur: 'urun', urunId: '', adet: '' }];
  let yontem = 'nakit';
  const musteri = h('input', { type: 'text', maxlength: 60, value: randevu ? randevu.musteriAd : '', placeholder: randevu ? '' : t('Müşteri (isteğe bağlı)') });
  const sonraki = h('input', { type: 'date' });
  const hata = h('div', { class: 'hata', role: 'alert' });
  const dugme = h('button', { class: 'dugme', type: 'submit' }, t('Ödemeyi kaydet'));
  const satirKutu = h('div', { class: 'satirlar' });
  const ozet = h('div', { class: 'odeme-ozet' });
  const yontemKutu = h('div', { class: 'sekme-cubugu' });

  const toplamHesapla = () => satirlar.reduce((a, s) => { const v = sayi(s.tutar); return a + (Number.isFinite(v) && v > 0 ? v : 0); }, 0);

  function ciz() {
    doldur(yontemKutu, ['nakit', 'kart'].map(y => h('button', { type: 'button', class: y === yontem ? 'secili' : '', onclick: () => { yontem = y; ciz(); } }, y === 'nakit' ? t('Nakit') : t('Kart'))));
    doldur(satirKutu, satirlar.map((s, i) => h('div', { class: 'satir' },
      h('div', { class: 'satir-ust' },
        s.tur === 'urun'
          ? h('div', { class: 'urun-sec' },
            urunler.length ? h('select', { 'aria-label': t('Stoktan ürün'), onchange: (e) => urunSec(s, e.target.value) },
              h('option', { value: '' }, t('Stoktan seç (ya da elle yazın)…')),
              urunler.map(x => h('option', { value: x.id, selected: x.id === s.urunId }, x.ad + ' · ' + stokYazi(x, x.stok)))) : null,
            h('input', { type: 'text', value: s.ad, maxlength: 40, placeholder: t('Ürün adı'), oninput: (e) => { s.ad = e.target.value; } }),
            s.urunId ? h('label', null, t('Adet ({b})', { b: birimAdi(urunler.find(x => x.id === s.urunId) || { birim: 'adet' }) }), h('input', { type: 'text', inputmode: 'decimal', value: s.adet, oninput: (e) => { s.adet = e.target.value; adetDegisti(s); } })) : null)
          : s.ek
            ? h('select', { 'aria-label': t('Hizmet'), onchange: (e) => { const hz = hizmetler.find(x => x.id === e.target.value); s.hizmetId = e.target.value; s.ad = hz ? hz.ad : ''; s.grup = hz && hz.oranGrup ? hz.oranGrup : ''; if (hz) s.tutar = String(hz.fiyat || 0).replace('.', ','); ciz(); } },
              h('option', { value: '', selected: !s.hizmetId }, t('Hizmet seçin…')),
              hizmetler.map(x => h('option', { value: x.id, selected: x.id === s.hizmetId }, x.ad)))
            : h('strong', null, s.ad),
        s.tur === 'urun' || s.ek ? h('button', { class: 'ikon-dugme', type: 'button', 'aria-label': t('Satırı sil'), onclick: () => { satirlar.splice(i, 1); ciz(); } }, '🗑') : null),
      h('div', { class: 'iki-sutun' },
        h('label', null, s.tur === 'urun' ? t('Satan') : t('Usta'),
          s.tur === 'urun' || s.ek
            ? h('select', { onchange: (e) => { s.ustaUid = e.target.value; } },
              ustaAday.map(x => h('option', { value: x.id, selected: x.id === s.ustaUid }, x.ad)),
              s.ek ? null : h('option', { value: '', selected: s.ustaUid === '' }, t('Salon (prim yok)')))
            : h('div', { class: 'salt-yazi' }, ad(s.ustaUid))),
        h('label', null, s.tur === 'urun' ? t('Satış fiyatı (₺)') : t('Tutar (₺)'), h('input', { type: 'text', inputmode: 'decimal', value: s.tutar, placeholder: '0',
          oninput: (e) => { s.tutar = e.target.value; ozetCiz(); } }))),
      s.ek && oranAy.caprazYuzde > 0 ? h('label', null, t('Hizmeti satan usta (çapraz satış primi alır)'),
        h('select', { 'aria-label': t('Satan usta'), onchange: (e) => { s.satanUid = e.target.value; ciz(); } },
          ustaAday.map(x => h('option', { value: x.id, selected: x.id === s.satanUid }, x.ad)),
          h('option', { value: '', selected: !s.satanUid }, t('Yok (prim yok)')))) : null,
      s.ek && oranAy.caprazYuzde > 0 && s.satanUid && s.satanUid !== s.ustaUid ? h('div', { class: 'kucuk' }, t('{ad} için %{o} çapraz satış primi yazılır (salonun payından).', { ad: ad(s.satanUid), o: String(oranAy.caprazYuzde).replace('.', ',') })) : null,
      s.tur === 'urun' ? h('label', null, t('Alış fiyatı (₺)'), h('input', { type: 'text', inputmode: 'decimal', value: s.alis, placeholder: '0',
        oninput: (e) => { s.alis = e.target.value; ozetCiz(); } })) : null,
      s.tur === 'urun' ? h('div', { class: 'kucuk urun-ozet', 'data-i': String(i) }) : null)),
      satirlar.length < 12 ? h('div', { class: 'dugme-satir sol' },
        randevu ? h('button', { class: 'dugme ikincil kucuk-dugme', type: 'button', onclick: () => { satirlar.push({ ustaUid: ustaAday[0] ? ustaAday[0].id : '', ad: '', hizmetId: '', tutar: '', alis: '', tur: 'hizmet', ek: true, satanUid: asilUsta }); ciz(); } }, t('+ Hizmet ekle')) : null,
        h('button', { class: 'dugme ikincil kucuk-dugme', type: 'button', onclick: () => { satirlar.push({ ustaUid: ustaAday[0] ? ustaAday[0].id : '', ad: '', tutar: '', alis: '', tur: 'urun', urunId: '', adet: '' }); ciz(); } }, t('+ Ürün satışı ekle'))) : null);
    ozetCiz();
  }
  // Ürün satırı dökümü: satış - komisyon - alış = kâr; kâr ustaya (ürün primi) ve kasaya bölünür.
  // Usta yüzdelerini yalnız yönetici/kıdemli/ortak görebilir; sekreterde yalnız kâr gösterilir.
  function urunOzetleri() {
    satirlar.forEach((s, i) => {
      if (s.tur !== 'urun') return;
      const el = satirKutu.querySelector('.urun-ozet[data-i="' + i + '"]'); if (!el) return;
      const tut = Math.max(0, sayi(s.tutar) || 0), al = Math.max(0, sayi(s.alis) || 0);
      if (!tut) { el.textContent = ''; return; }
      const o = { komisyonOrani: yontem === 'kart' ? oran : 0 }, k = { tutar: tut, alis: al };
      const kom = yuvarla(tut * o.komisyonOrani / 100), kar = urunKari(o, k);
      const mali = s.ustaUid ? u.mali[s.ustaUid] : null;
      let metin = t('Kâr: {kar} (satış {s}{k} − alış {a})', { kar: para(kar), s: para(tut), k: kom ? ' − ' + t('komisyon') + ' ' + para(kom) : '', a: para(al) });
      if (s.ustaUid === '') metin += ' · ' + t('tamamı kasaya');
      else if (mali) { const up = yuvarla(kar * (mali.urunPrimi || 0) / 100); metin += ' · ' + t('usta %{y}: {u}, kasa: {k}', { y: String(mali.urunPrimi || 0).replace('.', ','), u: para(up), k: para(yuvarla(kar - up)) }); }
      el.textContent = metin;
    });
  }
  // Stoktan ürün seçilince fiyatlar kartından gelir (adet × birim fiyat); elle değiştirilebilir
  function urunSec(s, id) {
    const x = urunler.find(y => y.id === id);
    if (!x) { s.urunId = ''; s.adet = ''; ciz(); return; }
    s.urunId = id; s.ad = x.ad; s.adet = '1';
    s.tutar = x.satis ? String(x.satis).replace('.', ',') : ''; s.alis = x.alis ? String(x.alis).replace('.', ',') : '';
    ciz();
  }
  function adetDegisti(s) {
    const x = urunler.find(y => y.id === s.urunId); const a = sayi(s.adet);
    if (!x || !(a > 0)) return;
    s.tutar = String(yuvarla((x.satis || 0) * a)).replace('.', ','); s.alis = String(yuvarla((x.alis || 0) * a)).replace('.', ',');
    ciz();
  }
  function ozetCiz() {
    urunOzetleri();
    const top = toplamHesapla(), kom = yontem === 'kart' ? yuvarla(top * oran / 100) : 0;
    doldur(ozet,
      h('div', { class: 'uye-ust' }, h('span', { class: 'soluk' }, t('Toplam')), h('strong', null, para(top))),
      yontem === 'kart' ? h('div', { class: 'uye-ust kucuk' }, h('span', null, t('Kart komisyonu (%{oran})', { oran: String(oran).replace('.', ',') })), h('span', null, '− ' + para(kom))) : null,
      yontem === 'kart' ? h('div', { class: 'uye-ust kucuk' }, h('span', null, t('Salona ve ustalara kalan')), h('span', null, para(top - kom))) : null,
      !ayar && yontem === 'kart' ? h('div', { class: 'hata' }, t('Kart komisyon oranı girilmemiş (Salon > Genel). Şimdilik %0 sayılır.')) : null);
  }

  const icerik = h('div', null);
  const pencere = pencereAc(randevu ? t('Ödeme al') : t('Ürün satışı'), icerik);
  icerik.append(h('form', { class: 'form', novalidate: true,
    onsubmit: (e) => { e.preventDefault(); hata.textContent = ''; kaydet(); } },
    randevu ? h('div', { class: 'soluk' }, dkMetin(randevu.bas) + ' · ' + randevu.tarih) : null,
    h('label', null, t('Müşteri'), musteri),
    h('h3', null, t('Kalemler')), satirKutu,
    h('h3', null, t('Ödeme yöntemi')), yontemKutu,
    ozet,
    randevu && randevu.musteriId ? h('label', null, t('Sonraki ziyaret önerisi (isteğe bağlı)'), sonraki) : null,
    hata, dugme));
  ciz();

  function kaydet() {
    const kalemler = [];
    for (const s of satirlar) {
      const v = s.tutar === '' ? 0 : sayi(s.tutar);
      if (!Number.isFinite(v) || v < 0) { hata.textContent = t('Tutarları sayı olarak yazın.'); return; }
      if (s.ek) {
        if (!s.ad) { if (v === 0) continue; hata.textContent = t('Eklenen hizmeti seçin.'); return; }
        if (!s.ustaUid) { hata.textContent = t('Eklenen hizmetin ustasını seçin.'); return; }
      }
      if (s.tur === 'urun') {
        if (!s.ad.trim()) { if (v === 0) continue; hata.textContent = t('Ürünün adını yazın.'); return; }
        if (v <= 0) { hata.textContent = t('Ürünün tutarını yazın.'); return; }
      }
      const al = s.tur === 'urun' ? (s.alis === '' ? 0 : sayi(s.alis)) : 0;
      if (!Number.isFinite(al) || al < 0) { hata.textContent = t('Alış fiyatını sayı olarak yazın (bilmiyorsanız 0).'); return; }
      kalemler.push({ ustaUid: s.ustaUid, ad: s.tur === 'urun' ? s.ad.trim() : s.ad, tutar: yuvarla(v), alis: yuvarla(al), tur: s.tur, ...(s.tur === 'hizmet' && s.grup ? { grup: s.grup } : {}), ...(s.ek ? { ek: true } : {}), ...(s.ek && s.satanUid && s.satanUid !== s.ustaUid && oranAy.caprazYuzde > 0 ? { satanUid: s.satanUid, caprazYuzde: oranAy.caprazYuzde } : {}), ...(s.tur === 'urun' && s.urunId && sayi(s.adet) > 0 ? { urunId: s.urunId, adet: sayi(s.adet), stokMiktar: yuvarla(sayi(s.adet) * paketBoyu(urunler.find(x => x.id === s.urunId) || { birim: 'adet' })) } : {}) });
    }
    if (!kalemler.length) { hata.textContent = t('En az bir kalem olmalı.'); return; }
    const toplam = yuvarla(kalemler.reduce((a, k) => a + k.tutar, 0));
    if (toplam <= 0 && !randevu) { hata.textContent = t('Toplam sıfır olamaz.'); return; }
    kilitli(dugme, async () => {
      try {
        const donem = await donemiYukle();
        const ayarTaze = await ayariYukle(true);
        const oranT = yontem === 'kart' && ayarTaze ? ayarTaze.posOrani : 0;
        const komisyon = yontem === 'kart' ? yuvarla(toplam * oranT / 100) : 0;
        const b = writeBatch(db);
        const ref = doc(collection(db, 'salons', S.salon.id, 'odemeler'));
        b.set(ref, {
          rid: randevu ? randevu.id : '', musteriId: randevu ? (randevu.musteriId || '') : '', tarih: tarihMetin(new Date()), donem, yontem, musteriAd: musteri.value.trim(), kalemler,
          ustalar: [...new Set(kalemler.flatMap(k => [k.ustaUid, k.satanUid]).filter(Boolean))], toplam, komisyonOrani: oranT, komisyon,
          durum: 'gecerli', alan: auth.currentUser.uid, zaman: serverTimestamp()
        });
        // Her ustanın kendi satırı ayrı belge: usta yalnız bunu okuyabilir
        kalemler.filter(k => k.ustaUid).forEach(k => b.set(doc(collection(db, 'salons', S.salon.id, 'ustaSatirlari')), {
          ustaUid: k.ustaUid, odemeId: ref.id, tarih: tarihMetin(new Date()), donem, musteriAd: musteri.value.trim(), ad: k.ad, tutar: k.tutar, alis: k.alis, tur: k.tur, ...(k.grup ? { grup: k.grup } : {}),
          yontem, komisyonOrani: oranT, durum: 'gecerli'
        }));
        // Çapraz satış: ek hizmeti sattıran ustanın prim satırı (tutar = satılan hizmet, yuzde = ödeme anındaki oran)
        kalemler.filter(k => k.satanUid).forEach(k => b.set(doc(collection(db, 'salons', S.salon.id, 'ustaSatirlari')), {
          ustaUid: k.satanUid, odemeId: ref.id, tarih: tarihMetin(new Date()), donem, musteriAd: musteri.value.trim(), ad: k.ad, tutar: k.tutar, alis: 0, tur: 'capraz', yuzde: k.caprazYuzde, yontem, komisyonOrani: oranT, durum: 'gecerli'
        }));
        satisStokYaz(b, ref.id, kalemler, false);
        if (randevu && randevu.musteriId) b.update(doc(db, 'salons', S.salon.id, 'musteriler', randevu.musteriId), { sonZiyaret: tarihMetin(new Date()), sonraki: sonraki.value || '', guncelleme: serverTimestamp() });
        if (randevu) b.update(doc(db, 'salons', S.salon.id, 'randevular', randevu.id), { durum: 'odendi', odemeId: ref.id, guncelleme: serverTimestamp() });
        b.set(doc(collection(db, 'salons', S.salon.id, 'kayitlar')), {
          uid: auth.currentUser.uid, islem: 'odeme', hedef: ref.id, ayrinti: (randevu ? 'Randevu ödemesi ' : 'Satış ') + toplam + ' ' + sembol() + ' ' + yontem, zaman: serverTimestamp()
        });
        await b.commit(); pencere.kapat(); bildir(t('Ödeme kaydedildi')); bitti();
      } catch (err) { console.error(err); hata.textContent = hataMetni(err); }
    });
  }
}

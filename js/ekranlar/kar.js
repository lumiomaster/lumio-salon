import { t } from '../i18n.js';
import { h, doldur, hataMetni, bildir, kilitli, sayi, para, pencereAc, onayIste, lisansDurumu } from '../util.js';
import { S } from '../durum.js';
import { yetkiliMi } from '../roller.js';
import { auth, db, doc, collection, writeBatch, serverTimestamp } from '../fb.js';
import {
  ustalariYukle, ayariYukle, urunleriYukle, giderleriYukle, aralikOdemeleriniYukle, aralikIslemleriniYukle, aralikHareketleriniYukle, aralikAlislariniYukle, ikramiyeleriYukle
} from '../veri.js';
import { tarihMetin, tarihYazi } from '../takvim-mantik.js';
import { tarihTR } from '../mesaj.js';
import { yuvarla } from '../kasa-mantik.js';
import { stokYazi } from '../stok-mantik.js';
import { karHesapla, hizmetKarliligi, ayAralik, ayEkle, ayYazi } from '../kar-mantik.js';
import { ustaOzetleri, gunOzeti } from '../kasa-mantik.js';
import { sembol } from '../ulke.js';
import { uyeleriYukle } from '../veri.js';
import { csvYap, dosyaAdi, odemeSatirlari, kalemSatirlari, ustaSatirlari, giderSatirlari, ozetSatirlari } from '../disa-aktar-mantik.js';

const bugun = () => tarihMetin(new Date());
const K = { ay: bugun().slice(0, 7), alt: 'ozet' };
const ALT = [['ozet', 'Özet'], ['hizmet', 'Hizmetler'], ['gider', 'Giderler'], ['fatura', 'Faturalar']];
const KATEGORI = ['Kira', 'Elektrik', 'Su', 'Doğalgaz', 'İnternet / telefon', 'Maaş / SGK', 'Malzeme', 'Reklam', 'Vergi / muhasebe', 'Bakım / onarım', 'Diğer'];

export function karEkrani() {
  const kutu = h('div', null, h('p', { class: 'soluk' }, t('Yükleniyor…')));
  const yenile = () => yukle(kutu, yenile);
  yenile();
  return kutu;
}

async function yukle(kutu, yenile) {
  try {
    const { bas, bit } = ayAralik(K.ay);
    const onc = ayAralik(ayEkle(K.ay, -1));
    const [odemeler, u, ayar, hareketler, urunler, giderler, islemler, alislar, ikramiyeler, oncekiOdemeler, uyeler] = await Promise.all([
      aralikOdemeleriniYukle(bas, bit), ustalariYukle(), ayariYukle(), aralikHareketleriniYukle(bas, bit), urunleriYukle(), giderleriYukle(),
      aralikIslemleriniYukle(bas, bit), aralikAlislariniYukle(bas, bit), ikramiyeleriYukle(K.ay).catch(() => []),
      aralikOdemeleriniYukle(onc.bas, onc.bit).catch(() => []), uyeleriYukle().catch(() => [])
    ]);
    ciz(kutu, { oncekiOdemeler, uyeler, odemeler, mali: u.mali, taban: (ayar && ayar.urunTaban) || 'kar', hareketler, urunler, giderler, islemler, alislar, ikramiyeler }, yenile);
  } catch (e) {
    console.error(e);
    kutu.replaceChildren(h('div', { class: 'uyari' }, hataMetni(e)), h('button', { class: 'dugme ikincil', type: 'button', onclick: yenile }, t('Tekrar dene')));
  }
}

function ciz(kutu, D, yenile) {
  const bolum = { ozet: ozet, hizmet: hizmetler, gider: giderBolumu, fatura: faturalar }[K.alt] || ozet;
  doldur(kutu,
    h('div', { class: 'ay-sec' },
      h('button', { class: 'ikon-dugme', type: 'button', 'aria-label': t('Önceki ay'), onclick: () => { K.ay = ayEkle(K.ay, -1); yenile(); } }, '‹'),
      h('strong', null, ayYazi(K.ay)),
      h('button', { class: 'ikon-dugme', type: 'button', 'aria-label': t('Sonraki ay'), disabled: K.ay >= bugun().slice(0, 7), onclick: () => { K.ay = ayEkle(K.ay, 1); yenile(); } }, '›')),
    yetkiliMi(S.profil.rol) ? h('div', { class: 'dugme-satir sol' }, h('button', { class: 'baglanti', type: 'button', onclick: () => disaAktar(D) }, '⬇ ' + t('Muhasebeye aktar (CSV / Excel)'))) : null,
    h('div', { class: 'sekme-cubugu dort' }, ALT.map(([id, ad]) => h('button', { type: 'button', class: id === K.alt ? 'secili' : '', onclick: () => { K.alt = id; ciz(kutu, D, yenile); } }, t(ad)))),
    bolum(D, yenile));
}

const sat = (a, b, sinif) => h('div', { class: 'hesap-satir' + (sinif ? ' ' + sinif : '') }, h('span', null, a), h('span', null, b));

function ozet(D) {
  const r = karHesapla({ ...D, ay: K.ay });
  const alisToplam = yuvarla(D.alislar.reduce((a, x) => a + (x.toplam || 0), 0));
  const marj = r.ciro > 0 ? Math.round(r.kar / r.ciro * 100) : null;
  const fiyatsiz = D.urunler.filter(u => u.aktif !== false && !(u.alis > 0)).length;
  return h('div', null,
    r.adet === 0 && r.gider === 0 ? h('p', { class: 'soluk' }, t('Bu ay için ödeme ya da gider kaydı yok.')) : null,
    h('div', { class: 'kart kasa-ozet' },
      h('h3', { class: 'ilk' }, t('Kâr özeti')),
      sat(t('Ciro ({n} ödeme)', { n: r.adet }), para(r.ciro)),
      h('div', { class: 'kucuk soluk' }, t('Hizmet {h} · Ürün satışı {u}', { h: para(r.hizmetCiro), u: para(r.urunCiro) })),
      sat(t('Kart komisyonu'), '− ' + para(r.komisyon)),
      sat(t('Ustaların hakedişi'), '− ' + para(r.hakedis)),
      sat(t('Salonda kalan'), para(r.salonPayi), 'ust-cizgi'),
      sat(t('Satılan ürünlerin alış maliyeti'), '− ' + para(r.urunMaliyet)),
      sat(t('Formülde kullanılan ürün maliyeti'), '− ' + para(r.formul.toplam)),
      sat(t('Giderler'), '− ' + para(r.gider)),
      r.ikramiye > 0 ? sat(t('Hedef ikramiyeleri'), '− ' + para(r.ikramiye)) : null,
      h('div', { class: 'hesap-satir ust-cizgi kar-satir' }, h('strong', null, t('Kâr')), h('strong', { class: r.kar < 0 ? 'eksi' : 'kar-artı' }, para(r.kar))),
      marj != null ? h('div', { class: 'kucuk soluk' }, t('Ciroya oranı: %{m}', { m: marj })) : null),
    grafikKarti(D),
    fiyatsiz ? h('div', { class: 'kart uyari' }, h('p', { class: 'kucuk' }, t('{n} ürünün alış fiyatı girilmemiş; formül maliyeti eksik hesaplanır. Salon > Stok bölümünden girin.', { n: fiyatsiz }))) : null,
    r.formul.kalemler.length ? h('div', { class: 'kart' }, h('strong', null, t('Formülde en çok kullanılan ürünler')),
      r.formul.kalemler.slice(0, 8).map(k => sat(k.urun.ad + ' · ' + stokYazi(k.urun, k.miktar), para(k.maliyet)))) : null,
    h('div', { class: 'kart' }, sat(t('Bu ay alınan mal (faturalar)'), para(alisToplam)),
      h('p', { class: 'kucuk' }, t('Kâr hesabında mal alımı değil, kullanılan/satılan ürünün maliyeti sayılır; stoktaki mal gider yazılmaz.'))));
}

function hizmetler(D) {
  const l = hizmetKarliligi(D);
  return h('div', null,
    h('p', { class: 'kucuk' }, t('Her hizmetin kâr payı: komisyon düşülmüş tutar − usta payı − formülde kullanılan ürün maliyeti.')),
    l.length === 0 ? h('p', { class: 'soluk' }, t('Bu ay hizmet ödemesi yok.')) : l.map(r => h('div', { class: 'kart' },
      h('div', { class: 'uye-ust' }, h('strong', null, r.ad), h('strong', { class: r.kar < 0 ? 'eksi' : '' }, para(r.kar))),
      h('div', { class: 'kucuk' }, t('{n} kez · ciro {c}', { n: r.adet, c: para(r.ciro) }) + ' · ' + t('usta {u}', { u: para(r.usta) }) + ' · ' + t('ürün {m}', { m: para(r.maliyet) })),
      r.adet ? h('div', { class: 'kucuk soluk' }, t('Ortalama kâr: {k}', { k: para(yuvarla(r.kar / r.adet)) })) : null)));
}

function giderBolumu(D, yenile) {
  const yazar = yetkiliMi(S.profil.rol) && lisansDurumu(S.salon).aktif;
  const gl = karHesapla({ ...D, ay: K.ay }).giderler;
  const toplam = yuvarla(gl.reduce((a, g) => a + g.tutar, 0));
  return h('div', null,
    h('div', { class: 'baslik-satir' }, h('strong', null, t('Toplam {t}', { t: para(toplam) })),
      yazar ? h('button', { class: 'dugme kucuk-dugme', type: 'button', onclick: () => giderFormu(yenile) }, t('+ Gider')) : null),
    gl.length === 0 ? h('p', { class: 'soluk' }, t('Bu ay gider yok. Kira, fatura gibi giderleri ekleyin; "her ay tekrarla" derseniz sonraki aylarda kendiliğinden sayılır.')) : gl.map(g => h('div', { class: 'kart' },
      h('div', { class: 'uye-ust' }, h('strong', null, g.kategori), h('span', null, para(g.tutar))),
      h('div', { class: 'kucuk' }, tarihTR(g.tarih) + (g.aylik ? ' · ' + t('her ay') : '') + (g.not ? ' · ' + g.not : '')),
      yazar ? h('div', { class: 'dugme-satir sol' }, h('button', { class: 'dugme ikincil kucuk-dugme', type: 'button', onclick: () => giderKapat(g, yenile) }, g.aylik ? t('Bu aydan sonra bitir') : t('İptal et'))) : null)));
}

function giderFormu(yenile) {
  const tarih = h('input', { type: 'date', value: bugun() });
  const kat = h('select', null, KATEGORI.map(x => h('option', { value: x }, t(x))));
  const ozel = h('input', { type: 'text', maxlength: 30, placeholder: t('Kendi kategoriniz (isteğe bağlı)') });
  const tutar = h('input', { type: 'text', inputmode: 'decimal', placeholder: '0' });
  const not = h('input', { type: 'text', maxlength: 100, placeholder: t('Not (isteğe bağlı)') });
  const aylik = h('input', { type: 'checkbox' });
  const hata = h('div', { class: 'hata', role: 'alert' });
  const dugme = h('button', { class: 'dugme', type: 'submit' }, t('Kaydet'));
  const icerik = h('div', null);
  const p = pencereAc(t('Yeni gider'), icerik);
  icerik.append(h('form', { class: 'form', novalidate: true,
    onsubmit: (e) => {
      e.preventDefault(); hata.textContent = '';
      const v = sayi(tutar.value); if (!(v > 0)) { hata.textContent = t('Tutarı yazın.'); return; }
      if (!tarih.value) { hata.textContent = t('Tarihi seçin.'); return; }
      const kategori = (ozel.value.trim() || kat.value).slice(0, 30);
      kilitli(dugme, async () => {
        try {
          const b = writeBatch(db);
          b.set(doc(collection(db, 'salons', S.salon.id, 'giderler')), { tarih: tarih.value, kategori, tutar: yuvarla(v), not: not.value.trim(), aylik: aylik.checked, uid: auth.currentUser.uid, zaman: serverTimestamp() });
          b.set(doc(collection(db, 'salons', S.salon.id, 'kayitlar')), { uid: auth.currentUser.uid, islem: 'gider', hedef: S.salon.id, ayrinti: kategori + ' ' + v + ' ' + sembol() + '', zaman: serverTimestamp() });
          await b.commit(); K.ay = tarih.value.slice(0, 7) > bugun().slice(0, 7) ? K.ay : tarih.value.slice(0, 7); p.kapat(); bildir(t('Gider kaydedildi')); yenile();
        } catch (err) { console.error(err); hata.textContent = hataMetni(err); }
      });
    } },
    h('label', null, t('Tarih'), tarih), h('label', null, t('Kategori'), kat), ozel, h('label', null, t('Tutar (₺)'), tutar), not,
    h('label', { class: 'onay-satir' }, aylik, t('Her ay tekrarla (kira, internet gibi)')), hata, dugme));
}

async function giderKapat(g, yenile) {
  const metin = g.aylik ? t('"{k}" gideri bu aydan sonra sayılmasın mı? Geçmiş aylar değişmez.', { k: g.kategori }) : t('"{k}" gideri iptal edilsin mi?', { k: g.kategori });
  if (!(await onayIste(metin, g.aylik ? t('Evet, bitir') : t('Evet, iptal et')))) return;
  try {
    const b = writeBatch(db);
    // Aylık gider: önceki ayın sonuna kadar sayılır. Bu ay ilk ayıysa tamamen iptal olur.
    if (g.aylik && K.ay > g.tarih.slice(0, 7)) b.update(doc(db, 'salons', S.salon.id, 'giderler', g.id), { bitis: ayEkle(K.ay, -1) });
    else b.update(doc(db, 'salons', S.salon.id, 'giderler', g.id), { iptal: true });
    await b.commit(); bildir(t('Güncellendi')); yenile();
  } catch (e) { console.error(e); bildir(hataMetni(e), 'hata'); }
}

function faturalar(D) {
  const l = [...D.alislar].sort((a, b) => (a.tarih < b.tarih ? 1 : -1));
  return h('div', null,
    h('p', { class: 'kucuk' }, t('Stok > Mal kabul / fatura ile girilen alış faturaları.')),
    l.length === 0 ? h('p', { class: 'soluk' }, t('Bu ay fatura yok.')) : l.map(x => h('button', { class: 'kart tikla', type: 'button', onclick: () => faturaDetay(x) },
      h('div', { class: 'uye-ust' }, h('strong', null, x.tedarikci || t('Tedarikçi yok')), h('span', null, para(x.toplam))),
      h('div', { class: 'kucuk' }, tarihTR(x.tarih) + (x.faturaNo ? ' · ' + x.faturaNo : '') + ' · ' + t('{n} kalem', { n: (x.kalemler || []).length }) + ' ›'))));
}

function faturaDetay(x) {
  pencereAc(t('Alış faturası'), h('div', { class: 'ayrinti' },
    h('div', null, h('strong', null, x.tedarikci || '—')), h('div', { class: 'soluk' }, tarihYazi(x.tarih) + (x.faturaNo ? ' · ' + x.faturaNo : '')),
    h('div', { class: 'kart kasa-ozet' }, (x.kalemler || []).map(k => sat(k.ad + ' · ' + k.miktar + ' ' + k.birim + ' × ' + para(k.birimFiyat), para(k.tutar))),
      h('div', { class: 'hesap-satir ust-cizgi' }, h('strong', null, t('Toplam')), h('strong', null, para(x.toplam))))));
}

// ---- Muhasebe için aylık dışa aktarma: yalnız yönetici, kıdemli ve ortak; CSV Excel'de doğrudan açılır ----
function indir(ad, icerik) {
  const a = h('a', { href: URL.createObjectURL(new Blob([icerik], { type: 'text/csv;charset=utf-8' })), download: ad });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => { try { URL.revokeObjectURL(a.href); } catch (_) { /* gerek yok */ } }, 4000);
}
async function disaAktar(D) {
  const uyeler = await uyeleriYukle().catch(() => []);
  const adOf = (uid) => { const u = uyeler.find(x => x.id === uid); return u ? u.ad : ''; };
  const ay = K.ay, salonAd = S.salon.ad;
  const T = { kart: t('Kart'), nakit: t('Nakit'), gecerli: t('Geçerli'), iptal: t('İptal'), urun: t('Ürün'), hizmet: t('Hizmet'), aylik: t('Her ay'), tek: t('Tek sefer'),
    ciro: t('Ciro'), komisyon: t('Kart komisyonu'), hakedis: t('Ustaların hakedişi'), salonPayi: t('Salonda kalan'), urunMaliyet: t('Satılan ürün alış maliyeti'),
    formulMaliyet: t('Formülde kullanılan ürün maliyeti'), gider: t('Giderler'), ikramiye: t('Hedef ikramiyeleri'), kar: t('Kâr'), adet: t('Ödeme sayısı') };
  const Dd = { ...D, ay };
  const dosyalar = [
    ['odemeler', t('Ödemeler'), () => csvYap([t('Tarih'), t('Müşteri'), t('Yöntem'), t('Hizmet / ürün'), t('Usta'), t('Toplam'), t('Komisyon oranı %'), t('Komisyon'), t('Net'), t('Durum')], odemeSatirlari(D.odemeler, adOf, T))],
    ['kalemler', t('Kalem dökümü (usta payıyla)'), () => csvYap([t('Tarih'), t('Müşteri'), t('Kalem'), t('Tür'), t('Usta'), t('Tutar'), t('Alış maliyeti'), t('Usta payı')], kalemSatirlari(D.odemeler, D.mali, D.taban, adOf, T))],
    ['usta-hakedis', t('Usta hakedişleri'), () => csvYap([t('Usta'), t('Hizmet cirosu'), t('Ürün satışı'), t('Çapraz satış primi'), t('Kart komisyonu payı'), t('Hakediş')], ustaSatirlari(D.odemeler, D.mali, D.taban, adOf))],
    ['giderler', t('Giderler'), () => csvYap([t('Tarih'), t('Kategori'), t('Tutar'), t('Not'), t('Tür')], giderSatirlari(D.giderler, ay, T))],
    ['ozet', t('Aylık özet'), () => csvYap([t('Kalem'), t('Tutar')], ozetSatirlari(Dd, T))]
  ];
  const icerik = h('div', null);
  const p = pencereAc(t('Muhasebeye aktar') + ' · ' + ayYazi(ay), icerik);
  const tek = (d) => { indir(dosyaAdi(salonAd, ay, d[0]), d[2]()); };
  icerik.append(
    h('p', { class: 'kucuk' }, t('CSV dosyaları Excel\'de doğrudan açılır (Türkçe karakterler bozulmaz). Dosyalar seçili aya aittir; iptal edilen ödemeler "Durum" sütunuyla görünür.')),
    ...dosyalar.map(d => h('div', { class: 'arama-satir' }, h('span', null, d[1]), h('button', { class: 'dugme ikincil kucuk-dugme', type: 'button', onclick: () => tek(d) }, t('İndir')))),
    h('div', { class: 'dugme-satir' }, h('button', { class: 'dugme', type: 'button', onclick: () => { dosyalar.forEach((d, i) => setTimeout(() => tek(d), i * 400)); } }, t('Hepsini indir'))));
  try { const b = writeBatch(db); b.set(doc(collection(db, 'salons', S.salon.id, 'kayitlar')), { uid: auth.currentUser.uid, islem: 'disa_aktar', hedef: ay, ayrinti: ay + ' muhasebe dışa aktarma açıldı', zaman: serverTimestamp() }); await b.commit(); } catch (e) { console.error(e); }
  void p;
}

// ---- Grafikler: bu ay / geçen ay, en çok satan hizmet, en çok kazandıran usta (saf CSS çubukları) ----
function cubuklar(satirlar) {
  const en = Math.max(1, ...satirlar.map(x => x.deger));
  return h('div', { class: 'cubuk-liste' }, satirlar.map(x => h('div', { class: 'cubuk-satir' },
    h('div', { class: 'cubuk-ust' }, h('span', null, x.etiket), h('span', { class: 'kucuk' }, x.yazi)),
    h('div', { class: 'cubuk-iz' }, h('div', { class: 'cubuk-dolu' + (x.sinif ? ' ' + x.sinif : ''), style: 'width:' + Math.max(2, Math.round(x.deger / en * 100)) + '%' })))));
}
export function grafikVerisi(D, ay) {
  const gec = D.odemeler.filter(o => o.durum === 'gecerli');
  const bu = gunOzeti(gec), once = gunOzeti((D.oncekiOdemeler || []).filter(o => o.durum === 'gecerli'));
  const hz = hizmetKarliligi(D).slice().sort((a, b) => b.adet - a.adet || b.ciro - a.ciro).slice(0, 5);
  const oz = ustaOzetleri(gec, D.mali, D.taban);
  const adOf = (uid) => { const u = (D.uyeler || []).find(x => x.id === uid); return u ? u.ad : t('(silinmiş)'); };
  const ustalar = Object.entries(oz).map(([uid, v]) => ({ ad: adOf(uid), ciro: yuvarla(v.hizmet + v.urun), hakedis: v.hakedis })).sort((a, b) => b.ciro - a.ciro).slice(0, 5);
  return { bu: yuvarla(bu.nakit + bu.kart), once: yuvarla(once.nakit + once.kart), buAdet: bu.adet, onceAdet: once.adet, hz, ustalar };
}
function grafikKarti(D) {
  const g = grafikVerisi(D, K.ay);
  if (!g.buAdet && !g.onceAdet) return null;
  const fark = g.once > 0 ? Math.round((g.bu - g.once) / g.once * 100) : null;
  return h('div', { class: 'kart grafik-kart' },
    h('h3', { class: 'ilk' }, t('Grafikler')),
    h('div', { class: 'kucuk soluk' }, t('Ciro: bu ay ve önceki ay')),
    cubuklar([{ etiket: ayYazi(K.ay), deger: g.bu, yazi: para(g.bu) + ' · ' + t('{n} ödeme', { n: g.buAdet }), sinif: 'vurgulu' }, { etiket: ayYazi(ayEkle(K.ay, -1)), deger: g.once, yazi: para(g.once) + ' · ' + t('{n} ödeme', { n: g.onceAdet }) }]),
    fark != null ? h('div', { class: 'kucuk ' + (fark < 0 ? 'eksi' : 'kar-artı') }, (fark >= 0 ? '▲ +' : '▼ ') + fark + '% ' + t('önceki aya göre')) : null,
    g.hz.length ? h('div', null, h('div', { class: 'kucuk soluk grafik-baslik' }, t('En çok yapılan hizmetler')), cubuklar(g.hz.map(x => ({ etiket: x.ad, deger: x.adet, yazi: t('{n} kez', { n: x.adet }) + ' · ' + para(x.ciro) })))) : null,
    g.ustalar.length ? h('div', null, h('div', { class: 'kucuk soluk grafik-baslik' }, t('En çok ciro getiren ustalar')), cubuklar(g.ustalar.map(x => ({ etiket: x.ad, deger: x.ciro, yazi: para(x.ciro) })))) : null);
}

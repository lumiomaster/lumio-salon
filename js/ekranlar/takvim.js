import { t } from '../i18n.js';
import { h, doldur, hataMetni, bildir, kilitli, para, pencereAc, onayIste, lisansDurumu, telNormalize, telGoster } from '../util.js';
import { S } from '../durum.js';
import { randevuYazarMi, odemeYazarMi } from '../roller.js';
import { odemeFormu } from './odeme-formu.js';
import { formulFormu, formulYazabilir, formulOkur } from './islem.js';
import { ilaveHizmetFormu } from './ilave.js';
import { mesajYap, waAc, waLink, hitap, tarihTR } from '../mesaj.js';
import { auth, db, doc, collection, writeBatch, serverTimestamp, arrayUnion } from '../fb.js';
import { uyeleriYukle, ustalariYukle, hizmetleriYukle, ayariYukle, randevulariYukle, kilitleriYukle, musterileriYukle, musteriGetir, musteriGeriGetir, islemleriYukle } from '../veri.js';
import {
  DILIM, hizmetUyarla, dkMetin, metinDk, tarihMetin, tarihEkle, tarihYazi, mesgulAraliklar, dilimler, kilitId, kalemYap,
  ustaDurumu, randevuKilitleri, izinCakisanKalemler
} from '../takvim-mantik.js';

// Ekranın hatırladığı seçimler (sekme değişince kaybolmasın)
const T = { tarih: tarihMetin(new Date()), usta: '', iptaller: false };

export function takvimEkrani() {
  const kutu = h('div', { class: 'sayfa' }, h('p', { class: 'soluk' }, t('Yükleniyor…')));
  const yenile = () => yukle(kutu, yenile);
  yenile();
  return kutu;
}

// Randevu formunun ve takvimin ihtiyaç duyduğu ortak veriler
export async function takvimCtx() {
  const [uyeler, u, hizmetler, ayar] = await Promise.all([uyeleriYukle(), ustalariYukle(), hizmetleriYukle(), ayariYukle()]);
  return { uyeler, profil: u.profil, hizmetler, ayar, ad: (uid) => (uyeler.find(x => x.id === uid) || { ad: '?' }).ad };
}

async function yukle(kutu, yenile) {
  try {
    const bugun = tarihMetin(new Date());
    const usta = S.profil.rol === 'usta';
    const [ctx, gun, yaklasan, kilit] = await Promise.all([
      takvimCtx(),
      randevulariYukle(T.tarih, T.tarih),
      randevulariYukle(bugun, tarihEkle(bugun, 30)),
      usta ? kilitleriYukle(T.tarih) : Promise.resolve({})
    ]);
    ciz(kutu, ctx, gun, yaklasan, kilit, yenile);
  } catch (e) {
    console.error(e);
    kutu.replaceChildren(h('div', { class: 'uyari' }, hataMetni(e)), h('button', { class: 'dugme ikincil', type: 'button', onclick: yenile }, t('Tekrar dene')));
  }
}

const ustalar = (ctx) => ctx.uyeler.filter(u => u.aktif && ctx.profil[u.id] && ctx.profil[u.id].calisir);
const telLink = (d) => d ? '+' + d : '';

function ciz(kutu, ctx, gun, yaklasan, kilit, yenile) {
  const yazar = randevuYazarMi(S.profil.rol);
  const lisansOk = lisansDurumu(S.salon).aktif;
  const bugun = tarihMetin(new Date());
  const ustaListe = ustalar(ctx);
  if (T.usta && !ustaListe.some(u => u.id === T.usta)) T.usta = '';

  let liste = gun.filter(r => T.iptaller || r.durum !== 'iptal');
  if (T.usta) liste = liste.filter(r => r.kalemler.some(k => k.ustaUid === T.usta));
  const iptalSayisi = gun.filter(r => r.durum === 'iptal').length;
  // Usta başkalarının randevu ayrıntısını görmez; yalnız "dolu" saatleri görür (slotlardan).
  const bloklar = S.profil.rol === 'usta' ? doluBloklar(kilit, gun, T.usta) : [];

  // O gün izinde olan ustalar
  const izinliler = ustaListe.filter(u => {
    const p = ctx.profil[u.id];
    return (p.izinler || []).some(i => i.bas <= T.tarih && T.tarih <= i.bit);
  });

  // Aranacak müşteriler: önümüzdeki 30 günde, izindeki ustaya denk gelen bekleyen randevular
  const aranacak = yaklasan.filter(r => izinCakisanKalemler(r, ctx.profil).length > 0);

  const tarihK = h('input', { type: 'date', value: T.tarih, 'aria-label': t('Tarih'), onchange: (e) => { if (e.target.value) { T.tarih = e.target.value; yenile(); } } });
  doldur(kutu,
    h('div', { class: 'baslik-satir' },
      h('h1', null, t('Takvim')),
      yazar && lisansOk ? h('button', { class: 'dugme kucuk-dugme', type: 'button', onclick: () => randevuFormu(null, ctx, T.tarih, yenile) }, t('+ Randevu')) : null),
    aranacak.length ? aramaKarti(aranacak, ctx, yazar && lisansOk, yenile) : null,
    h('div', { class: 'tarih-cubugu' },
      h('button', { class: 'ikon-dugme', type: 'button', 'aria-label': t('Önceki gün'), onclick: () => { T.tarih = tarihEkle(T.tarih, -1); yenile(); } }, '‹'),
      tarihK,
      h('button', { class: 'ikon-dugme', type: 'button', 'aria-label': t('Sonraki gün'), onclick: () => { T.tarih = tarihEkle(T.tarih, 1); yenile(); } }, '›')),
    h('div', { class: 'tarih-yazi' }, tarihYazi(T.tarih), T.tarih === bugun ? h('span', { class: 'rozet' }, t('Bugün')) : h('button', { class: 'baglanti', type: 'button', onclick: () => { T.tarih = bugun; yenile(); } }, t('Bugüne git'))),
    ustaListe.length > 1 ? h('div', { class: 'cipler' },
      h('button', { type: 'button', class: 'cip' + (T.usta === '' ? ' secili' : ''), onclick: () => { T.usta = ''; yenile(); } }, t('Tümü')),
      ustaListe.map(u => h('button', { type: 'button', class: 'cip' + (T.usta === u.id ? ' secili' : ''), onclick: () => { T.usta = u.id; yenile(); } }, u.ad.split(' ')[0]))) : null,
    izinliler.length ? h('div', { class: 'uyari' }, t('İzinli: {adlar}', { adlar: izinliler.map(u => u.ad).join(', ') })) : null,
    ustaListe.length === 0 ? h('div', { class: 'kart bilgi' }, h('p', null, t('Takvimde görünecek usta yok. Salon > Ustalar bölümünden "Randevu alıyor" işaretleyin.'))) : null,
    liste.length === 0 && bloklar.length === 0 ? h('p', { class: 'soluk' }, t('Bu gün için randevu yok.')) : null,
    S.profil.rol === 'usta'
      ? [...liste.map(r => ({ bas: r.bas, el: randevuKarti(r, ctx, yazar && lisansOk, yenile) })), ...bloklar.map(b => ({ bas: b.bas, el: doluKarti(b, ctx) }))].sort((a, b) => a.bas - b.bas).map(x => x.el)
      : liste.map(r => randevuKarti(r, ctx, yazar && lisansOk, yenile)),
    iptalSayisi ? h('label', { class: 'onay iptal-secim' },
      h('input', { type: 'checkbox', checked: T.iptaller, onchange: (e) => { T.iptaller = e.target.checked; yenile(); } }),
      h('span', null, t('İptal edilenleri de göster ({n})', { n: iptalSayisi }))) : null);
}

// Kilitlerden (kendi randevularım hariç): her randevu için tek kart. Bekleme aralarında usta boştur;
// o aralıklar "müsait" diye altında yazılır (başka randevu alınabilir).
function doluBloklar(kilit, benim, filtre) {
  const benimIdler = new Set(benim.map(r => r.id));
  const grup = {};
  Object.keys(kilit).forEach(id => {
    if (benimIdler.has(kilit[id])) return;
    const i = id.lastIndexOf('_'), uid = id.split('_')[0], dilim = Number(id.slice(i + 1));
    const g = uid + '|' + kilit[id];
    (grup[g] = grup[g] || { uid, dl: [] }).dl.push(dilim);
  });
  const sonuc = [];
  Object.values(grup).forEach(({ uid, dl }) => {
    if (filtre && filtre !== uid) return;
    dl.sort((a, b) => a - b);
    const parcalar = []; let bas = dl[0], son = dl[0];
    for (const d of dl.slice(1).concat([null])) {
      if (d !== null && d === son + 1) { son = d; continue; }
      parcalar.push([bas * DILIM, (son + 1) * DILIM]);
      bas = son = d;
    }
    const bosluklar = [];
    for (let i = 1; i < parcalar.length; i++) bosluklar.push([parcalar[i - 1][1], parcalar[i][0]]);
    sonuc.push({ uid, bas: parcalar[0][0], bit: parcalar[parcalar.length - 1][1], bosluklar });
  });
  return sonuc;
}

function doluKarti(b, ctx) {
  return h('div', { class: 'kart randevu dolu' },
    h('div', { class: 'uye-ust' }, h('strong', null, dkMetin(b.bas) + '–' + dkMetin(b.bit)), h('span', { class: 'rozet' }, t('Dolu'))),
    h('div', { class: 'kucuk' }, ctx.ad(b.uid)),
    b.bosluklar.length ? h('div', { class: 'dolu-bos' }, t('Bekleme arası müsait: ') + b.bosluklar.map(x => dkMetin(x[0]) + '–' + dkMetin(x[1])).join(', ')) : null);
}

function aramaKarti(aranacak, ctx, duzenleyebilir, yenile) {
  return h('div', { class: 'kart uyari' },
    h('strong', null, t('⚠ {n} randevu, izindeki ustaya denk geliyor — müşteriyi arayın', { n: aranacak.length })),
    aranacak.map(r => {
      const k = [...new Set(izinCakisanKalemler(r, ctx.profil).map(x => ctx.ad(x.ustaUid)))].join(', ');
      return h('div', { class: 'arama-satir' },
        h('div', null, h('strong', null, r.musteriAd), h('div', { class: 'kucuk' }, tarihYazi(r.tarih) + ' ' + dkMetin(r.bas) + ' · ' + t('{usta} izinli', { usta: k }))),
        h('div', { class: 'arama-dugmeler' },
          r.musteriTel ? h('a', { class: 'dugme ikincil kucuk-dugme', href: 'tel:' + telLink(r.musteriTel) }, t('Ara')) : h('span', { class: 'kucuk' }, t('Telefon yok')),
          duzenleyebilir ? h('button', { class: 'dugme ikincil kucuk-dugme', type: 'button', onclick: () => randevuFormu(r, ctx, r.tarih, yenile) }, t('Ertele')) : null));
    }));
}

function randevuKarti(r, ctx, yazar, yenile) {
  const flag = izinCakisanKalemler(r, ctx.profil).length > 0;
  return h('button', { class: 'kart randevu' + (r.durum === 'iptal' ? ' iptal' : '') + (flag ? ' izinli' : ''), type: 'button', onclick: () => ayrinti(r, ctx, yazar, yenile) },
    h('div', { class: 'uye-ust' }, h('strong', null, dkMetin(r.bas) + '–' + dkMetin(r.bit)), r.durum === 'iptal' ? h('span', { class: 'rozet pasif-rozet' }, t('İptal')) : (r.durum === 'odendi' ? h('span', { class: 'rozet odendi-rozet' }, t('Ödendi')) : null)),
    h('div', { class: 'randevu-musteri' }, r.musteriAd),
    h('div', { class: 'kucuk' }, r.kalemler.map(k => ctx.ad(k.ustaUid).split(' ')[0] + ': ' + k.ad).join(' · ')),
    flag ? h('div', { class: 'kucuk uyari-yazi' }, t('⚠ Usta izinli — müşteriyi arayın')) : null);
}

function ayrinti(r, ctx, yazar, yenile) {
  const icerik = h('div', null);
  const p = pencereAc(t('Randevu'), icerik);
  const aktif = r.durum === 'bekliyor';
  // Usta yalnızca kendi ustalığındaki randevuyu değiştirir; başka ustalı kalemi olan randevuyu yönetici/sekreter değiştirir
  const kendiRandevum = S.profil.rol !== 'usta' || (r.ustalar || []).length === 1;
  const toplam = r.kalemler.reduce((s, k) => s + (Number(k.fiyat) || 0), 0);
  const olusturan = ctx.uyeler.find(u => u.id === r.olusturan);
  doldur(icerik,
    h('div', { class: 'ayrinti' },
      h('div', null, h('strong', null, r.musteriAd), r.durum === 'iptal' ? h('span', { class: 'rozet pasif-rozet' }, t('İptal')) : (r.durum === 'odendi' ? h('span', { class: 'rozet odendi-rozet' }, t('Ödendi')) : null)),
      h('div', { class: 'soluk' }, tarihYazi(r.tarih) + ' · ' + dkMetin(r.bas) + '–' + dkMetin(r.bit)),
      r.musteriTel ? h('div', { class: 'dugme-satir sol' },
        h('span', { class: 'soluk' }, telGoster(r.musteriTel)),
        h('a', { class: 'dugme ikincil kucuk-dugme', href: 'tel:' + telLink(r.musteriTel) }, t('Ara')),
        h('a', { class: 'dugme ikincil kucuk-dugme', href: waLink(r.musteriTel), target: '_blank', rel: 'noopener' }, 'WhatsApp'),
        h('button', { class: 'dugme ikincil kucuk-dugme', type: 'button', onclick: () => waAc(r.musteriTel, mesajYap('onay', { MUSTERI_ADI: hitap(r.musteriAd), TARIH: tarihTR(r.tarih), SAAT: dkMetin(r.bas), HIZMET: r.kalemler.map(k => k.ad).join(' + ') })) }, t('Onay mesajı'))) : null,
      h('div', { class: 'kalemler' }, r.kalemler.map((k, i) => h('div', { class: 'kalem' },
        h('div', { class: 'uye-ust' }, h('strong', null, k.ad), h('span', null, k.fiyat > 0 ? para(k.fiyat) : '')),
        h('div', { class: 'kucuk' }, ctx.ad(k.ustaUid) + ' · ' + dkMetin(k.bas) + '–' + dkMetin(k.bit)),
        h('div', { class: 'formul-kutu', 'data-i': String(i) })))),
      h('div', { class: 'uye-ust' }, h('span', { class: 'soluk' }, t('Toplam')), h('strong', null, para(toplam))),
      r.not ? h('p', { class: 'kucuk' }, t('Not: ') + r.not) : null,
      r.iptalNedeni ? h('p', { class: 'kucuk' }, t('İptal nedeni: ') + r.iptalNedeni) : null,
      olusturan ? h('p', { class: 'kucuk' }, t('Randevuyu alan: ') + olusturan.ad) : null),
    aktif && odemeYazarMi(S.profil.rol) && lisansDurumu(S.salon).aktif ? h('div', { class: 'dugme-satir' },
      h('button', { class: 'dugme', type: 'button', onclick: () => { p.kapat(); odemeFormu(r, yenile); } }, t('Ödeme al'))) : null,
    aktif && yazar && kendiRandevum && lisansDurumu(S.salon).aktif ? h('div', { class: 'dugme-satir' },
      h('button', { class: 'dugme ikincil', type: 'button', onclick: () => { p.kapat(); ilaveHizmetFormu(r, ctx, yenile); } }, t('+ İlave hizmet / işlem'))) : null,
    aktif && yazar && kendiRandevum ? h('div', { class: 'dugme-satir' },
      h('button', { class: 'dugme ikincil', type: 'button', onclick: () => { p.kapat(); iptalFormu(r, ctx, yenile); } }, t('İptal et')),
      h('button', { class: 'dugme', type: 'button', onclick: () => { p.kapat(); randevuFormu(r, ctx, r.tarih, yenile); } }, t('Düzenle / ertele'))) : null);

  // Formül ve not: usta kendi kalemini yazar; yönetici/kıdemli hepsini; ortak okur; sekreter göremez
  const formulleriDoldur = () => {
    if (!formulOkur() || r.durum === 'iptal') return;
    islemleriYukle('rid', r.id).then(liste => {
      r.kalemler.forEach((k, i) => {
        const kutu = icerik.querySelector('.formul-kutu[data-i="' + i + '"]'); if (!kutu) return;
        const kayitli = liste.find(x => x.id === r.id + '_' + i);
        const yaz = formulYazabilir(k) && lisansDurumu(S.salon).aktif;
        doldur(kutu,
          kayitli && kayitli.formul ? h('div', { class: 'formul-yazi' }, h('b', null, t('Formül: ')), kayitli.formul) : null,
          kayitli && kayitli.not ? h('div', { class: 'kucuk' }, t('Not: ') + kayitli.not) : null,
          yaz ? h('button', { class: 'dugme ikincil kucuk-dugme', type: 'button', onclick: () => { p.kapat(); formulFormu(r, i, kayitli || null, yenile); } }, kayitli ? t('Formül / notu düzenle') : t('Formül / not ekle')) : null);
      });
    }).catch(e => console.error(e));
  };
  formulleriDoldur();
}

function kayit(b, ayrinti) {
  b.set(doc(collection(db, 'salons', S.salon.id, 'kayitlar')), {
    uid: auth.currentUser.uid, islem: 'randevu', hedef: S.salon.id, ayrinti, zaman: serverTimestamp()
  });
}
const kilitDoc = (kid) => doc(db, 'salons', S.salon.id, 'slotlar', kid);

export function iptalFormu(r, ctx, yenile) {
  const neden = h('input', { type: 'text', maxlength: 100, placeholder: t('İptal nedeni (isteğe bağlı)') });
  const hata = h('div', { class: 'hata', role: 'alert' });
  const dugme = h('button', { class: 'dugme', type: 'submit' }, t('Randevuyu iptal et'));
  const icerik = h('div', null);
  const p = pencereAc(t('Randevuyu iptal et'), icerik);
  icerik.append(h('form', { class: 'form', novalidate: true,
    onsubmit: (e) => {
      e.preventDefault(); hata.textContent = '';
      kilitli(dugme, async () => {
        try {
          const b = writeBatch(db);
          b.update(doc(db, 'salons', S.salon.id, 'randevular', r.id), { durum: 'iptal', iptalNedeni: neden.value.trim(), guncelleme: serverTimestamp() });
          (r.kilitler || []).forEach(k => b.delete(kilitDoc(k)));
          kayit(b, 'İptal: ' + r.musteriAd + ' ' + r.tarih + ' ' + dkMetin(r.bas));
          await b.commit(); p.kapat(); bildir(t('Randevu iptal edildi, saat boşaldı.')); yenile();
        } catch (err) { console.error(err); hata.textContent = hataMetni(err); }
      });
    } },
    h('p', null, t('{ad} için {saat} randevusu iptal edilecek. Ustanın saati hemen boşalır.', { ad: r.musteriAd, saat: dkMetin(r.bas) })),
    neden, hata, dugme));
}

// ---- Randevu formu: yeni, düzenleme ve erteleme aynı formdan ----
export function randevuFormu(mevcut, ctx, tarih0, yenile, onDolgu) {
  const yeni = !mevcut;
  const adim = (ctx.ayar && ctx.ayar.randevuAdimi) || 15;
  const aktifHizmetler = ctx.hizmetler.filter(x => x.aktif);
  // Usta yalnızca kendine randevu alabilir
  const ustaListe = ustalar(ctx).filter(u => S.profil.rol !== 'usta' || u.id === auth.currentUser.uid);
  let kilitHarita = {};      // sunucudaki dolu dilimler (kendi randevum hariç)
  let yuklemeNo = 0;

  const dolgu = onDolgu || {};
  let musteriId = mevcut ? (mevcut.musteriId || '') : (dolgu.musteriId || '');
  let kayitli = [];
  const musteriListe = h('datalist', { id: 'musteri-listesi' });
  const etiket = (m) => m.ad + (m.tel ? ' · ' + telGoster(m.tel) : '');
  const musteri = h('input', { type: 'text', maxlength: 60, list: 'musteri-listesi', value: mevcut ? mevcut.musteriAd : (dolgu.musteriAd || ''), placeholder: t('Müşterinin adı (kayıtlıysa seçin)'), autocomplete: 'off' });
  const tel = h('input', { type: 'tel', inputmode: 'tel', maxlength: 20, value: (mevcut ? mevcut.musteriTel : dolgu.musteriTel) ? telGoster(mevcut ? mevcut.musteriTel : dolgu.musteriTel) : '', placeholder: t('Telefon (isteğe bağlı)') });
  // Defterde kayıtlı müşteri seçilince telefon ve kimlik dolar
  musteri.addEventListener('change', () => {
    const m = kayitli.find(x => etiket(x) === musteri.value);
    if (m) { musteri.value = m.ad; tel.value = m.tel ? telGoster(m.tel) : ''; musteriId = m.id; }
    else musteriId = '';
  });
  tel.addEventListener('change', async () => {
    const d = telNormalize(tel.value);
    if (!d) { musteriId = ''; return; }
    try {
      const m = kayitli.find(x => x.tel === d) || await musteriGetir(d);
      if (m) { musteriId = m.id; if (!musteri.value.trim()) musteri.value = m.ad; } else musteriId = '';
    } catch (e) { console.error(e); }
  });
  musterileriYukle().then(l => { kayitli = l; doldur(musteriListe, l.map(m => h('option', { value: etiket(m) }))); }).catch(e => console.error(e));
  const tarihK = h('input', { type: 'date', value: tarih0 });
  const saatK = h('input', { type: 'time', step: String(adim * 60), value: mevcut ? dkMetin(mevcut.bas) : '10:00' });
  const notK = h('input', { type: 'text', maxlength: 200, value: mevcut ? (mevcut.not || '') : '', placeholder: t('Not (isteğe bağlı)') });
  const hata = h('div', { class: 'hata', role: 'alert' });
  const dugme = h('button', { class: 'dugme', type: 'submit' }, yeni ? t('Randevuyu kaydet') : t('Değişikliği kaydet'));
  const satirKutu = h('div', { class: 'satirlar' });
  const ozet = h('div', { class: 'randevu-ozet' });

  let satirlar = mevcut
    ? mevcut.kalemler.map((k, i) => ({ hizmetId: k.hizmetId, ustaUid: k.ustaUid, bas: k.bas, elle: i > 0 && k.bas !== mevcut.kalemler[i - 1].bit, ustaElle: true, snap: k, sureK: '', fiyatK: '' }))
    : [{ hizmetId: '', ustaUid: '', bas: null, elle: false, ustaElle: false, sureK: '', fiyatK: '' }];

  // Hizmetin taban değeri (kayıtlı randevuda o randevudaki değer)
  const hizmetTaban = (s) => {
    if (!s.hizmetId) return null;
    if (s.snap && s.snap.hizmetId === s.hizmetId) return { id: s.snap.hizmetId, ad: s.snap.ad, fiyat: s.snap.fiyat, sure: s.snap.sure, asamalar: s.snap.asamalar || [] };
    return ctx.hizmetler.find(x => x.id === s.hizmetId) || null;
  };
  // Bu randevu için süre ve ücret elle değiştirilmiş olabilir
  const hizmetOf = (s) => { const b = hizmetTaban(s); return b ? hizmetUyarla(b, s.sureK, s.fiyatK) : null; };

  // Her satırın başlangıcını, hizmetini, uygun ustalarını sırayla hesaplar
  function hesapla() {
    const tarih = tarihK.value;
    const alinmis = new Set(Object.keys(kilitHarita));
    const yerel = new Set();          // bu formda önceki satırların tuttuğu kilitler
    let onceki = null;
    const sonuc = [];
    satirlar.forEach((s, i) => {
      const hz = hizmetOf(s);
      let bas;
      if (i === 0) bas = metinDk(saatK.value);
      else if (!s.elle && onceki != null) bas = onceki;
      else bas = Number.isFinite(s.bas) ? s.bas : (onceki != null ? onceki : NaN);
      s.bas = bas;
      const r = { s, hz, bas, bit: hz && Number.isFinite(bas) ? bas + hz.sure : null, adaylar: [], secili: null };
      if (hz && Number.isFinite(bas) && tarih) {
        const ar = mesgulAraliklar(hz, bas), dl = dilimler(ar);
        r.dl = dl;
        r.adaylar = ustaListe.filter(u => (ctx.profil[u.id].hizmetler || []).includes(hz.id)).map(u => {
          const hepsi = new Set([...alinmis, ...yerel]);
          const d = ustaDurumu(ctx.profil[u.id], tarih, ar, dl, u.id, hepsi);
          const yuk = Object.keys(kilitHarita).filter(k => k.startsWith(u.id + '_')).length;
          return { u, ...d, yuk };
        });
        const uygun = (a) => a.durum === 'ok' || a.durum === 'disarda';
        const mevcutSecim = r.adaylar.find(a => a.u.id === s.ustaUid);
        if (mevcutSecim && uygun(mevcutSecim) && (s.ustaElle || mevcutSecim.durum === 'ok')) r.secili = mevcutSecim;
        else {
          const oner = r.adaylar.filter(a => a.durum === 'ok').sort((a, b) => a.yuk - b.yuk)[0];
          r.secili = oner || null;
          s.ustaElle = false;
        }
        s.ustaUid = r.secili ? r.secili.u.id : '';
        if (r.secili) dl.forEach(d => yerel.add(kilitId(s.ustaUid, tarih, d)));
      }
      onceki = r.bit != null ? r.bit : onceki;
      sonuc.push(r);
    });
    return sonuc;
  }

  const DURUM_YAZI = { ok: 'müsait', disarda: 'mesai dışı', izin: 'izinli', dolu: 'dolu' };

  function ciz() {
    const sonuc = hesapla();
    doldur(satirKutu, sonuc.map((r, i) => {
      const s = r.s;
      const hizSec = h('select', { 'aria-label': t('Hizmet'), onchange: (e) => { s.hizmetId = e.target.value; s.snap = null; s.ustaUid = ''; s.ustaElle = false; s.sureK = ''; s.fiyatK = ''; ciz(); } },
        h('option', { value: '' }, t('Hizmet seçin')),
        aktifHizmetler.map(x => h('option', { value: x.id, selected: x.id === s.hizmetId }, x.ad + ' · ' + x.sure + ' ' + t('dk'))),
        s.hizmetId && !aktifHizmetler.some(x => x.id === s.hizmetId) && r.hz ? h('option', { value: s.hizmetId, selected: true }, r.hz.ad + ' (' + t('pasif') + ')') : null);
      const ustaSec = h('select', { 'aria-label': t('Usta'), disabled: !r.hz || r.adaylar.length === 0, onchange: (e) => { s.ustaUid = e.target.value; s.ustaElle = true; ciz(); } },
        r.adaylar.map(a => h('option', { value: a.u.id, selected: a.u.id === s.ustaUid, disabled: a.durum === 'izin' || a.durum === 'dolu' },
          a.u.ad + ' · ' + t(DURUM_YAZI[a.durum]) + (a.durum === 'ok' && r.secili && a.u.id === r.secili.u.id && !s.ustaElle ? ' ★' : ''))));
      const notlar = [];
      if (r.hz && r.adaylar.length === 0) notlar.push(h('div', { class: 'hata' }, t('Bu hizmeti yapan, takvimde görünen usta yok. Salon > Ustalar bölümünden hizmet eşleştirin.')));
      else if (r.hz && !r.secili) notlar.push(h('div', { class: 'hata' }, t('Bu saatte uygun usta yok. Saati değiştirin ya da başka gün seçin.')));
      else if (r.secili && r.secili.durum === 'disarda') notlar.push(h('div', { class: 'uyari-yazi kucuk' }, t('Bu usta o saatte mesaide değil ({mesai}).', { mesai: r.secili.neden })));
      return h('div', { class: 'satir' },
        h('div', { class: 'satir-ust' }, hizSec,
          satirlar.length > 1 ? h('button', { class: 'ikon-dugme', type: 'button', 'aria-label': t('Kalemi sil'), onclick: () => { satirlar.splice(i, 1); ciz(); } }, '🗑') : null),
        r.hz ? h('div', { class: 'iki-sutun sure-fiyat' },
          h('label', null, t('Süre (dk)'), h('input', { type: 'number', inputmode: 'numeric', min: 5, max: 600, step: 5, value: r.hz.sure, onchange: (e) => { const v = Number(e.target.value); s.sureK = Number.isFinite(v) && v >= 5 ? Math.round(v / 5) * 5 : ''; ciz(); } })),
          h('label', null, t('Ücret (₺)'), h('input', { type: 'number', inputmode: 'decimal', min: 0, step: 'any', value: r.hz.fiyat, onchange: (e) => { const v = e.target.value === '' ? '' : Number(e.target.value); s.fiyatK = Number.isFinite(v) && v >= 0 ? v : ''; ciz(); } }))) : null,
        r.hz && hizmetTaban(s) && (r.hz.sure !== hizmetTaban(s).sure || r.hz.fiyat !== hizmetTaban(s).fiyat) ? h('div', { class: 'kucuk uyari-yazi' }, t('Bu randevuya özel: hizmet normalde {s} dk, {f}', { s: hizmetTaban(s).sure, f: para(hizmetTaban(s).fiyat) })) : null,
        i > 0 ? h('label', null, t('Başlangıç'), h('input', { type: 'time', step: String(adim * 60), value: Number.isFinite(r.bas) ? dkMetin(r.bas) : '',
          onchange: (e) => { const v = metinDk(e.target.value); if (Number.isFinite(v)) { s.bas = v; s.elle = true; ciz(); } } })) : null,
        h('label', null, t('Usta'), ustaSec),
        r.hz && r.bit != null ? h('div', { class: 'kucuk' }, dkMetin(r.bas) + '–' + dkMetin(r.bit) + ' · ' + r.hz.sure + ' ' + t('dk') + (r.hz.fiyat > 0 ? ' · ' + para(r.hz.fiyat) : '')) : null,
        notlar);
    }), satirlar.length < 6 ? h('button', { class: 'dugme ikincil kucuk-dugme', type: 'button', onclick: () => { satirlar.push({ hizmetId: '', ustaUid: '', bas: null, elle: false, ustaElle: false, sureK: '', fiyatK: '' }); ciz(); } }, t('+ Hizmet ekle')) : null);
    const bitler = sonuc.filter(r => r.bit != null).map(r => r.bit);
    const toplam = sonuc.reduce((a, r) => a + (r.hz ? Number(r.hz.fiyat) || 0 : 0), 0);
    doldur(ozet, bitler.length ? h('div', { class: 'uye-ust' }, h('span', { class: 'soluk' }, t('Bitiş {saat}', { saat: dkMetin(Math.max(...bitler)) })), h('strong', null, para(toplam))) : null);
    return sonuc;
  }

  async function kilitleriGetir() {
    const no = ++yuklemeNo;
    const tarih = tarihK.value;
    if (!tarih) { kilitHarita = {}; ciz(); return; }
    try {
      const m = await kilitleriYukle(tarih);
      if (no !== yuklemeNo) return;
      kilitHarita = {};
      Object.keys(m).forEach(k => { if (!mevcut || m[k] !== mevcut.id) kilitHarita[k] = m[k]; });
      ciz();
    } catch (e) { console.error(e); hata.textContent = hataMetni(e); }
  }

  tarihK.addEventListener('change', kilitleriGetir);
  saatK.addEventListener('change', ciz);

  const icerik = h('div', null);
  const pencere = pencereAc(yeni ? t('Yeni randevu') : t('Randevuyu düzenle / ertele'), icerik);
  icerik.append(h('form', { class: 'form', novalidate: true,
    onsubmit: (e) => { e.preventDefault(); hata.textContent = ''; kaydet(); } },
    h('label', null, t('Müşteri'), musteri), musteriListe,
    h('label', null, t('Telefon'), tel),
    h('div', { class: 'iki-sutun' }, h('label', null, t('Tarih'), tarihK), h('label', null, t('Saat'), saatK)),
    h('h3', null, t('Hizmetler')),
    satirKutu, ozet,
    h('label', null, t('Not'), notK),
    hata, dugme));

  async function kaydet() {
    const ad = musteri.value.trim();
    if (ad.length < 2) { hata.textContent = t('Müşterinin adını yazın.'); return; }
    let telD = '';
    if (tel.value.trim()) { telD = telNormalize(tel.value); if (!telD || telD.length > 20) { hata.textContent = t('Telefon numarası geçersiz.'); return; } }
    const tarih = tarihK.value;
    if (!tarih) { hata.textContent = t('Tarihi seçin.'); return; }
    if (!Number.isFinite(metinDk(saatK.value))) { hata.textContent = t('Saati seçin.'); return; }
    const sonuc = ciz();
    for (const r of sonuc) {
      if (!r.hz) { hata.textContent = t('Her kalem için hizmet seçin.'); return; }
      if (!r.secili) { hata.textContent = t('Her hizmet için uygun bir usta seçilmeli.'); return; }
      if (!Number.isFinite(r.bas) || r.bit > 1440) { hata.textContent = t('Randevu gün sonunu aşıyor. Saati erkene alın.'); return; }
    }
    const disarda = sonuc.some(r => r.secili.durum === 'disarda');
    if (disarda && !(await onayIste(t('Seçilen usta bu saatte mesaide değil. Yine de randevu verilsin mi?'), t('Evet, ver')))) return;

    kilitli(dugme, async () => {
      try {
        // Kaydetmeden hemen önce kilitleri taze oku (başkası aynı saati almış olabilir)
        const taze = await kilitleriYukle(tarih);
        const kalemler = sonuc.map(r => kalemYap(r.hz, r.secili.u.id, r.bas));
        const kilitler = randevuKilitleri(kalemler, tarih);
        if (new Set(kilitler).size !== kilitler.length) { hata.textContent = t('Aynı ustaya aynı anda iki iş verilemez. Saatleri ayarlayın.'); return; }
        if (kilitler.length > 400) { hata.textContent = t('Randevu çok uzun. Bölün.'); return; }
        const cakisan = kilitler.filter(k => taze[k] && (!mevcut || taze[k] !== mevcut.id));
        if (cakisan.length) { await kilitleriGetir(); hata.textContent = t('Bu saat az önce başka bir randevuya verildi. Yeni durum yüklendi; usta ya da saat seçin.'); return; }

        const b = writeBatch(db);
        const bas = Math.min(...kalemler.map(k => k.bas)), bit = Math.max(...kalemler.map(k => k.bit));
        // Müşteri defteri: kayıtlıysa ustaları ekle, değilse yeni kayıt aç (telefon varsa belge adı telefondur)
        const ustalarListe = [...new Set(kalemler.map(k => k.ustaUid))];
        let mid = musteriId;
        if (!mid && telD) { const var_ = await musteriGetir(telD); if (var_) mid = var_.id; }
        // Telefon yoksa aynı isimde tek kayıtlı müşteri varsa onunla eşleştir (aynı kişi için tekrar tekrar yeni kayıt açılmasın)
        if (!mid && !telD) {
          const norm = (x) => (x || '').toLocaleLowerCase('tr').replace(/\s+/g, ' ').trim();
          const ayni = (await musterileriYukle()).filter(m => norm(m.ad) === norm(ad));
          if (ayni.length === 1) mid = ayni[0].id;
        }
        if (mid) { const mm = await musteriGetir(mid); if (mm && mm.silindi) await musteriGeriGetir(mid); }
        if (mid) b.update(doc(db, 'salons', S.salon.id, 'musteriler', mid), { ustalar: arrayUnion(...ustalarListe), guncelleme: serverTimestamp() });
        else {
          const mref = telD ? doc(db, 'salons', S.salon.id, 'musteriler', telD) : doc(collection(db, 'salons', S.salon.id, 'musteriler'));
          mid = mref.id;
          b.set(mref, { ad, tel: telD, not: '', dogum: '', sonraki: '', sonZiyaret: '', ustalar: ustalarListe, olusturan: auth.currentUser.uid, olusturma: serverTimestamp(), guncelleme: serverTimestamp() });
        }
        const veri = { musteriAd: ad, musteriTel: telD, musteriId: mid, ustalar: ustalarListe, tarih, bas, bit, kalemler, kilitler, not: notK.value.trim() };
        let rid;
        if (yeni) {
          const ref = doc(collection(db, 'salons', S.salon.id, 'randevular'));
          rid = ref.id;
          b.set(ref, { ...veri, durum: 'bekliyor', olusturan: auth.currentUser.uid, olusturma: serverTimestamp(), guncelleme: serverTimestamp() });
          kilitler.forEach(k => b.set(kilitDoc(k), { rid, ustaUid: k.split('_')[0], tarih }));
        } else {
          rid = mevcut.id;
          b.update(doc(db, 'salons', S.salon.id, 'randevular', rid), { ...veri, guncelleme: serverTimestamp() });
          const eski = new Set(mevcut.kilitler || []), yeniSet = new Set(kilitler);
          eski.forEach(k => { if (!yeniSet.has(k)) b.delete(kilitDoc(k)); });
          kilitler.forEach(k => { if (!eski.has(k)) b.set(kilitDoc(k), { rid, ustaUid: k.split('_')[0], tarih }); });
        }
        kayit(b, (yeni ? 'Randevu: ' : 'Randevu değişti: ') + ad + ' ' + tarih + ' ' + dkMetin(bas));
        try { await b.commit(); }
        catch (err) {
          if (err && err.code === 'permission-denied') {
            // Çakışma mı, yetki/lisans mı? Kilitleri yenileyip bak.
            const t2 = await kilitleriYukle(tarih);
            if (kilitler.some(k => t2[k] && (!mevcut || t2[k] !== mevcut.id))) { await kilitleriGetir(); hata.textContent = t('Bu saat az önce başka bir randevuya verildi. Yeni durum yüklendi; usta ya da saat seçin.'); return; }
          }
          throw err;
        }
        tarihGit(tarih);
        pencere.kapat(); bildir(yeni ? t('Randevu kaydedildi') : t('Randevu güncellendi')); yenile();
      } catch (err) { console.error(err); hata.textContent = hataMetni(err); }
    });
  }
  const tarihGit = (x) => { T.tarih = x; };

  kilitleriGetir();
}

// Usta izne çıkarılınca çağrılır: o tarihlerde bekleyen randevusu olan müşterileri gösterir ("müşteriyi arayın").
export async function izinCakisanlariGoster(ustaUid, ustaAd, izinler) {
  if (!izinler.length) return;
  const bas = izinler.map(i => i.bas).sort()[0], bit = izinler.map(i => i.bit).sort().slice(-1)[0];
  const liste = (await randevulariYukle(bas, bit)).filter(r => r.durum === 'bekliyor'
    && r.kalemler.some(k => k.ustaUid === ustaUid)
    && izinler.some(i => i.bas <= r.tarih && r.tarih <= i.bit));
  if (!liste.length) return;
  pencereAc(t('Müşterileri arayın'), h('div', null,
    h('p', null, t('{ad} bu tarihlerde izinde. Aşağıdaki randevular için müşteriyi arayıp başka gün ya da başka usta önerin. Takvimde randevuyu "Düzenle / ertele" ile değiştirebilirsiniz.', { ad: ustaAd })),
    liste.map(r => h('div', { class: 'arama-satir' },
      h('div', null, h('strong', null, r.musteriAd), h('div', { class: 'kucuk' }, tarihYazi(r.tarih) + ' ' + dkMetin(r.bas))),
      r.musteriTel ? h('a', { class: 'dugme ikincil kucuk-dugme', href: 'tel:' + telLink(r.musteriTel) }, t('Ara')) : h('span', { class: 'kucuk' }, t('Telefon yok'))))));
}

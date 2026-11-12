import { t, yerel } from '../i18n.js';
import { mesajYap } from '../mesaj.js';
import { h, doldur, hataMetni, bildir, kilitli, para, sayi, pencereAc, onayIste, lisansDurumu } from '../util.js';
import { S } from '../durum.js';
import { yetkiliMi, gorenMi } from '../roller.js';
import { goster } from '../main.js';
import { kalemDetay } from './kalem-detay.js';
import { auth, db, doc, collection, writeBatch, serverTimestamp } from '../fb.js';
import {
  uyeleriYukle, ustalariYukle, donemiYukle, donemOdemeleriniYukle, avanslariYukle, devirleriYukle,
  gunMutabakatiniYukle, donemleriYukle, randevulariYukle, ayariYukle, oranAyariYukle, aralikOdemeleriniYukle, ikramiyeleriYukle
} from '../veri.js';
import { ayAralik, ayEkle, ayYazi } from '../kar-mantik.js';
import { ayOlculeri, ustaAyi } from '../hedef-mantik.js';
import { tarihMetin, tarihEkle, tarihYazi } from '../takvim-mantik.js';
import { ustaOzetleri, gunOzeti, odenecek, yuvarla, ustaGunSatirlari, satirDokumu } from '../kasa-mantik.js';
import { waAc, tarihTR } from '../mesaj.js';
import { sembol } from '../ulke.js';

const H = { tarih: tarihMetin(new Date()) };
let F = null; // yalnız bu ustalar gösterilsin (Ana ekrandan "onaylamayanları aç")

// Ana ekrandaki mutabakat kartından: o günün hesaplarını (isteğe bağlı yalnız onaylamayan ustalarla) açar
export function hesapAc(tarih, uids) {
  H.tarih = tarih; F = uids && uids.length ? uids : null;
  S.sekme = 'kasa'; S.kasaAlt = 'hesap'; goster();
}

export function hesapEkrani() {
  const kutu = h('div', null, h('p', { class: 'soluk' }, t('Yükleniyor…')));
  const yenile = () => yukle(kutu, yenile);
  yenile();
  return kutu;
}

async function yukle(kutu, yenile) {
  try {
    const bugun = tarihMetin(new Date());
    const donem = await donemiYukle();
    const [uyeler, u, odemeler, avanslar, devirler, mutabakat, donemler, randevular, ayar] = await Promise.all([
      uyeleriYukle(), ustalariYukle(), donemOdemeleriniYukle(donem), avanslariYukle(donem), devirleriYukle(),
      gunMutabakatiniYukle(H.tarih), donemleriYukle(), randevulariYukle(tarihEkle(bugun, -30), bugun), ayariYukle()
    ]);
    const oran = await oranAyariYukle();
    let ikr = null;
    if (oran.hedefler.length && yetkiliMi(S.profil.rol)) {
      try {
        const onceki = ayEkle(bugun.slice(0, 7), -1);
        const [od, iA] = await Promise.all([aralikOdemeleriniYukle(ayAralik(onceki).bas, ayAralik(onceki).bit), ikramiyeleriYukle(onceki)]);
        ikr = { ay: onceki, olc: ayOlculeri(od, onceki), verilen: iA };
      } catch (e) { console.error(e); }
    }
    ciz(kutu, { oran, ikr, taban: (ayar && ayar.urunTaban) || 'kar', donem, uyeler, u, odemeler, avanslar, devirler, mutabakat, donemler, bekleyen: randevular.filter(r => r.durum === 'bekliyor').length }, yenile);
  } catch (e) {
    console.error(e);
    kutu.replaceChildren(h('div', { class: 'uyari' }, hataMetni(e)), h('button', { class: 'dugme ikincil', type: 'button', onclick: yenile }, t('Tekrar dene')));
  }
}

// Her ustanın dönem özeti
function hesapla(D) {
  const ozet = ustaOzetleri(D.odemeler, D.u.mali, D.taban);
  const avans = {}; D.avanslar.forEach(a => { avans[a.ustaUid] = (avans[a.ustaUid] || 0) + a.tutar; });
  const idler = new Set([...Object.keys(ozet), ...Object.keys(avans), ...Object.keys(D.devirler),
    ...D.uyeler.filter(x => x.aktif && D.u.profil[x.id] && D.u.profil[x.id].calisir).map(x => x.id)]);
  const satirlar = [...idler].map(uid => {
    const o = ozet[uid] || { hizmet: 0, urun: 0, komisyon: 0, hakedis: 0, capraz: 0 };
    const av = yuvarla(avans[uid] || 0), dv = D.devirler[uid] || 0;
    return { uid, ad: (D.uyeler.find(x => x.id === uid) || { ad: '?' }).ad, ...o, avans: av, devir: dv, odenecek: odenecek(o.hakedis, av, dv), maliYok: !D.u.mali[uid] };
  }).sort((a, b) => a.ad.localeCompare(b.ad, yerel()));
  const gecerli = D.odemeler.filter(o => o.durum === 'gecerli');
  const z = gunOzeti(gecerli);
  const hakedis = yuvarla(satirlar.reduce((a, s) => a + s.hakedis, 0));
  return { satirlar, toplam: { brut: yuvarla(z.nakit + z.kart), komisyon: z.komisyon, net: z.net, hakedis, salon: yuvarla(z.net - hakedis) } };
}

function ciz(kutu, D, yenile) {
  const yetkili = yetkiliMi(S.profil.rol) && lisansDurumu(S.salon).aktif;
  const { satirlar, toplam } = hesapla(D);
  const mut = {}; D.mutabakat.forEach(m => { mut[m.ustaUid] = m; });
  const gorunen = F ? satirlar.filter(x => F.includes(x.uid) && !(mut[x.uid] && mut[x.uid].durum === 'onay')) : satirlar;
  doldur(kutu,
    h('p', { class: 'kucuk' }, t('Hesap dönemi {n}. Son "Hesabı kapat"tan bu yana alınan ödemeler.', { n: D.donem + 1 })),
    h('div', { class: 'kart kasa-ozet' },
      h('h3', { class: 'ilk' }, t('Salon toplamı (bu dönem)')),
      h('div', { class: 'uye-ust' }, h('span', null, t('Toplam ciro')), h('strong', null, para(toplam.brut))),
      h('div', { class: 'uye-ust kucuk' }, h('span', null, t('Kart komisyonu')), h('span', null, '− ' + para(toplam.komisyon))),
      h('div', { class: 'uye-ust kucuk' }, h('span', null, t('Ustaların hakedişi')), h('span', null, '− ' + para(toplam.hakedis))),
      h('div', { class: 'uye-ust ust-cizgi' }, h('span', null, t('Salonda kalan')), h('strong', null, para(toplam.salon)))),
    h('div', { class: 'baslik-satir' }, h('h2', { class: 'ilk' }, t('Ustalar')),
      h('label', { class: 'mut-gun' }, t('Mutabakat günü'), h('input', { type: 'date', value: H.tarih, onchange: (e) => { if (e.target.value) { H.tarih = e.target.value; F = null; yenile(); } } }))),
    F ? h('div', { class: 'kart bilgi' }, h('strong', null, t('Yalnız {gun} günü mutabakatını onaylamayan ustalar gösteriliyor.', { gun: tarihTR(H.tarih) })),
      gorunen.length ? null : h('p', null, t('Hepsi onaylamış.')),
      h('button', { class: 'dugme ikincil kucuk-dugme', type: 'button', onclick: () => { F = null; yenile(); } }, t('Hepsini göster'))) : null,
    satirlar.length === 0 ? h('p', { class: 'soluk' }, t('Henüz usta yok.')) : null,
    gorunen.map(s => ustaKart(s, mut[s.uid], yetkili, D, yenile)),
    yetkili ? ikramiyeKarti(D, yenile) : null,
    yetkili ? h('div', { class: 'kart bilgi' },
      h('strong', null, t('Hesabı kapat (sıfırla)')),
      h('p', null, t('Ustalarla hesaplaştıktan sonra dönemi kapatın. Ödenecek tutarlar kayda geçer, sayaçlar sıfırlanır. Ustanın hakedişinden fazla avansı varsa fark borç olarak bir sonraki döneme devreder.')),
      h('button', { class: 'dugme', type: 'button', onclick: () => kapatOnay(D, satirlar, toplam, yenile) }, t('Hesabı kapat'))) : null,
    D.donemler.length ? h('div', null, h('h2', null, t('Kapanmış dönemler')),
      D.donemler.map(d => h('button', { class: 'kart odeme', type: 'button', onclick: () => donemAyrinti(d) },
        h('div', { class: 'uye-ust' }, h('strong', null, t('Dönem {n}', { n: d.donem + 1 })), h('span', { class: 'soluk' }, d.zaman && d.zaman.toMillis ? tarihMetin(new Date(d.zaman.toMillis())) : '')),
        h('div', { class: 'kucuk' }, t('Ciro {c}, salonda kalan {s}', { c: para(d.toplam.brut), s: para(d.toplam.salon) }))))) : null);
}

// Geçen ayın hedef ikramiyeleri: yönetici "Hesaba ekle" der; ustanın bu dönem hesabına ek ödeme (eksi avans) yazılır, aynı ay için bir kez
function ikramiyeKarti(D, yenile) {
  if (!D.ikr) return null;
  const ad = (uid) => (D.uyeler.find(x => x.id === uid) || { ad: '?' }).ad;
  const verildi = new Set(D.ikr.verilen.map(x => x.ustaUid));
  const l = Object.entries(D.ikr.olc).map(([uid, o]) => ({ uid, a: ustaAyi(o, D.oran.hedefler) })).filter(x => x.a.ikramiye > 0 && D.uyeler.some(u => u.id === x.uid));
  if (!l.length) return null;
  return h('div', { class: 'kart bilgi' }, h('strong', null, '🎯 ' + ayYazi(D.ikr.ay) + ' ' + t('hedef ikramiyeleri')),
    l.map(({ uid, a }) => {
      const dugme = h('button', { class: 'dugme ikincil kucuk-dugme', type: 'button' }, t('Hesaba ekle'));
      dugme.addEventListener('click', () => kilitli(dugme, async () => {
        if (!(await onayIste(t('{ad} için {ay} ikramiyesi ({tutar}) bu dönem hesabına eklensin mi? Aynı ay için bir kez eklenebilir.', { ad: ad(uid), ay: ayYazi(D.ikr.ay), tutar: para(a.ikramiye) }), t('Evet, ekle')))) return;
        try {
          const b = writeBatch(db);
          b.set(doc(db, 'salons', S.salon.id, 'ikramiyeler', uid + '_' + D.ikr.ay), { ustaUid: uid, ay: D.ikr.ay, tutar: a.ikramiye, veren: auth.currentUser.uid, zaman: serverTimestamp() });
          b.set(doc(collection(db, 'salons', S.salon.id, 'avanslar')), { ustaUid: uid, tutar: -a.ikramiye, tarih: tarihMetin(new Date()), donem: D.donem, not: ('İkramiye ' + D.ikr.ay).slice(0, 100), veren: auth.currentUser.uid, zaman: serverTimestamp() });
          b.set(doc(collection(db, 'salons', S.salon.id, 'kayitlar')), { uid: auth.currentUser.uid, islem: 'ikramiye', hedef: uid, ayrinti: ad(uid) + ' ' + D.ikr.ay + ': ' + a.ikramiye + ' ' + sembol() + '', zaman: serverTimestamp() });
          await b.commit(); bildir(t('İkramiye hesaba eklendi')); yenile();
        } catch (err) { console.error(err); bildir(hataMetni(err), 'hata'); }
      }));
      const parca = [a.urun.ulasilan ? t('Ürün satışı') + ' ' + para(a.urun.deger) : null, a.capraz.ulasilan ? t('Çapraz satış') + ' ' + para(a.capraz.deger) : null].filter(Boolean).join(' · ');
      return h('div', { class: 'hesap-satir' },
        h('span', null, ad(uid) + ' · ' + para(a.ikramiye), h('div', { class: 'kucuk' }, parca)),
        verildi.has(uid) ? h('span', { class: 'rozet odendi-rozet' }, t('Eklendi')) : dugme);
    }));
}

function ustaKart(s, m, yetkili, D, yenile) {
  return h('div', { class: 'kart usta-hesap' },
    h('div', { class: 'uye-ust' }, h('strong', null, s.ad), h('strong', { class: s.odenecek < 0 ? 'eksi' : '' }, para(s.odenecek))),
    s.maliYok ? h('div', { class: 'hata' }, t('Yüzdesi girilmemiş (Salon > Ustalar).')) : null,
    h('button', { class: 'hesap-satir tikla', type: 'button', onclick: () => kalemListesi(s, D, 'hizmet') }, h('span', null, t('Hizmet cirosu') + ' ›'), h('span', null, para(s.hizmet))),
    s.urun > 0 ? h('button', { class: 'hesap-satir tikla', type: 'button', onclick: () => kalemListesi(s, D, 'urun') }, h('span', null, t('Ürün satışı') + ' ›'), h('span', null, para(s.urun))) : null,
    s.capraz > 0 ? h('div', { class: 'hesap-satir' }, h('span', null, t('Çapraz satış primi')), h('span', null, para(s.capraz))) : null,
    h('div', { class: 'hesap-satir' }, h('span', null, t('Hakediş (komisyon düşülmüş)')), h('span', null, para(s.hakedis))),
    s.avans !== 0 ? h('div', { class: 'hesap-satir' }, h('span', null, t('Verilen avans')), h('span', null, '− ' + para(s.avans))) : null,
    s.devir !== 0 ? h('div', { class: 'hesap-satir' }, h('span', null, t('Önceki dönemden borç')), h('span', null, para(s.devir))) : null,
    h('div', { class: 'hesap-satir mut' }, h('span', null, t('Mutabakat') + ' (' + tarihYazi(H.tarih).split(' ').slice(0, 2).join(' ') + ')'),
      m ? h('span', { class: 'rozet ' + (m.durum === 'onay' ? 'odendi-rozet' : 'uyari-rozet') }, m.durum === 'onay' ? t('Onayladı') : t('İtiraz var')) : h('span', { class: 'soluk kucuk' }, t('Bekliyor'))),
    m && m.durum === 'onay' && m.onaylayan ? h('div', { class: 'kucuk' }, t('Sözlü onay: {ad} işaretledi.', { ad: (D.uyeler.find(x => x.id === m.onaylayan) || { ad: '?' }).ad }) + (m.not ? ' — ' + m.not : '')) : null,
    m && m.durum === 'itiraz' && m.not ? h('div', { class: 'kucuk uyari-yazi' }, '“' + m.not + '”') : null,
    !m && yetkili ? h('div', { class: 'dugme-satir sol' },
      h('button', { class: 'dugme ikincil kucuk-dugme', type: 'button', onclick: () => mutabakatMesaji(s, D) }, t('WhatsApp ile hatırlat')),
      h('button', { class: 'dugme ikincil kucuk-dugme', type: 'button', onclick: () => yoneticiOnayi(s, D, yenile) }, t('Sözlü onayladı'))) : null,
    m && m.durum === 'itiraz' && yetkili ? h('div', { class: 'dugme-satir sol' },
      h('button', { class: 'dugme kucuk-dugme', type: 'button', onclick: () => itirazKapat(s, m, D, yenile) }, t('Sözlü mutabakat sağlandı')),
      h('button', { class: 'dugme ikincil kucuk-dugme', type: 'button', onclick: () => mutabakatMesaji(s, D) }, t('WhatsApp ile yaz'))) : null,
    yetkili ? h('button', { class: 'dugme ikincil kucuk-dugme', type: 'button', onclick: () => avansFormu(s, D, yenile) }, t('Avans ver')) : null);
}

// O günün usta payı (mutabakat günü)
function gunPayi(s, D) {
  const mali = D.u.mali[s.uid];
  const satirlar = ustaGunSatirlari(D.odemeler, s.uid, H.tarih, mali, D.taban);
  return { satirlar, pay: yuvarla(satirlar.reduce((a, x) => a + x.pay, 0)) };
}

// Dönemdeki hizmet ya da ürün kalemlerinin listesi; kaleme dokununca ayrıntı açılır
function kalemListesi(s, D, tur) {
  const ad = (uid) => (D.uyeler.find(x => x.id === uid) || { ad: '?' }).ad;
  const mali = D.u.mali[s.uid];
  const satirlar = [];
  D.odemeler.filter(o => o.durum === 'gecerli').forEach(o => (o.kalemler || []).forEach(k => { if (k.ustaUid === s.uid && (k.tur === 'urun') === (tur === 'urun')) satirlar.push({ o, k }); }));
  satirlar.sort((a, b) => (a.o.tarih < b.o.tarih ? 1 : -1));
  const icerik = h('div', null, satirlar.length ? [
    h('p', { class: 'kucuk' }, t('Ayrıntı için bir satıra dokunun.')),
    satirlar.map(({ o, k }) => {
      const d = satirDokumu(o, k, mali);
      return h('button', { class: 'kart odeme tikla', type: 'button', onclick: () => kalemDetay(o, k, ad, yetkiliMi(S.profil.rol) ? 'tam' : 'sekreter') },
        h('div', { class: 'uye-ust' }, h('strong', null, k.ad), h('span', null, para(k.tutar))),
        h('div', { class: 'kucuk' }, tarihYazi(o.tarih).split(' ').slice(0, 2).join(' ') + ' · ' + (o.musteriAd || '—') + ' · ' + (o.yontem === 'kart' ? t('Kart') : t('Nakit')) + ' · ' + t('ustaya {p}', { p: para(d.pay) })));
    })] : h('p', { class: 'soluk' }, t('Kayıt yok.')));
  pencereAc(s.ad + ' · ' + (tur === 'urun' ? t('Ürün satışları') : t('Hizmetler')), icerik);
}

const yontemAd = (o) => (o.yontem === 'kart' ? 'Kart' : 'Nakit');
const tl = (n) => para(n);

// Ustaya gönderilecek günlük hesap metni: müşteri müşteri döküm + ürün satışı + özet
export function mutabakatMetni(u, g, tarih, salonAd, mali) {
  const ad = (u.ad || '').split(' ')[0];
  const hizmet = new Map(), urunler = [], caprazlar = [];
  g.forEach(({ odeme: o, kalem: k }) => {
    if (k.tur === 'capraz') { caprazlar.push({ o, k }); return; }
    const d = satirDokumu(o, k, mali);
    if (k.tur === 'urun') { urunler.push({ o, k, d }); return; }
    const anahtar = o.duzeltmeOf || o.id;
    const m = hizmet.get(anahtar) || { o, kalemler: [], tutar: 0, kom: 0, pay: 0, yontemler: new Set() };
    m.yontemler.add(yontemAd(o)); m.kalemler.push(k.ad); m.tutar += d.tutar; m.kom += d.komisyon; m.pay += d.pay; hizmet.set(anahtar, m);
  });
  const hl = [...hizmet.values()];
  const hTop = yuvarla(hl.reduce((a, m) => a + m.tutar, 0)), hPay = yuvarla(hl.reduce((a, m) => a + m.pay, 0));
  const uTop = yuvarla(urunler.reduce((a, x) => a + x.d.tutar, 0)), uPay = yuvarla(urunler.reduce((a, x) => a + x.d.pay, 0));
  const r = [];
  r.push(mesajYap('mutabakatUst', { USTA_ADI: ad, TARIH: tarihTR(tarih) }), '');
  r.push('✂️ HİZMETLER');
  if (!hl.length) r.push('Bu gün hizmet kaydı yok.');
  hl.forEach((m, i) => {
    r.push((i + 1) + ') ' + (m.o.musteriAd || 'Müşteri') + ' — ' + m.kalemler.join(' + '));
    r.push('   Alınan: ' + tl(m.tutar) + ' (' + [...m.yontemler].join(' + ') + ')' + (m.kom > 0 ? ' · Komisyon: ' + tl(yuvarla(m.kom)) : '') + ' · Ustaya kalan: ' + tl(yuvarla(m.pay)));
  });
  if (hl.length) r.push('', '👥 ' + hl.length + ' müşteri · Alınan ' + tl(hTop) + ' · Ustaya kalan ' + tl(hPay));
  r.push('', '🛍️ ÜRÜN SATIŞI');
  if (!urunler.length) r.push(mesajYap('tesvik', { USTA_ADI: ad }));
  else {
    r.push(mesajYap('tebrik', { USTA_ADI: ad }));
    urunler.forEach(({ o, k, d }, i) => r.push((i + 1) + ') ' + k.ad + (o.musteriAd ? ' (' + o.musteriAd + ')' : '') + ' — Alınan: ' + tl(d.tutar) + ' (' + yontemAd(o) + ')' + (o.yontem === 'kart' ? ' · Komisyon: ' + tl(d.komisyon) : '') + ' · Ustaya kalan: ' + tl(d.pay)));
    r.push('', '📦 ' + urunler.length + ' ürün · Alınan ' + tl(uTop) + ' · Ustaya kalan ' + tl(uPay));
  }
  const cPay = yuvarla(caprazlar.reduce((a, x) => a + x.k.prim, 0));
  if (caprazlar.length) {
    r.push('', '🤝 ÇAPRAZ SATIŞ PRİMİ');
    caprazlar.forEach(({ o, k }, i) => r.push((i + 1) + ') ' + k.ad + ' (' + tl(k.satilan) + ')' + (o.musteriAd ? ' — ' + o.musteriAd : '') + ' · Prim: ' + tl(k.prim)));
  }
  r.push('', '━━━━━━━━━━', 'Hizmetlerden: ' + tl(hPay), 'Ürün satışından: ' + tl(uPay), ...(caprazlar.length ? ['Çapraz satış priminden: ' + tl(cPay)] : []), '💰 GENEL TOPLAM KAZANCINIZ: ' + tl(yuvarla(hPay + uPay + cPay)), '',
    mesajYap('mutabakatAlt', { USTA_ADI: ad, IMZA: salonAd || '' }));
  return r.join('\n');
}

// Ustaya mutabakat mesajı: önce önizleme, sonra WhatsApp
function mutabakatMesaji(s, D) {
  const u = D.uyeler.find(x => x.id === s.uid);
  const g = gunPayi(s, D);
  if (!u || !u.telefon) { bildir(t('Bu ustanın telefonu kayıtlı değil.'), 'hata'); return; }
  if (!g.satirlar.length) { bildir(t('Bu gün için ustanın işlemi yok.'), 'hata'); return; }
  const kutu = h('textarea', { rows: 16, class: 'mesaj-kutu' });
  kutu.value = mutabakatMetni(u, g.satirlar, H.tarih, S.salon ? S.salon.ad : '', D.u.mali[s.uid]);
  const kopya = h('button', { class: 'dugme ikincil', type: 'button', onclick: async () => { try { await navigator.clipboard.writeText(kutu.value); bildir(t('Kopyalandı')); } catch (e) { kutu.select(); } } }, t('Kopyala'));
  pencereAc(t('Mutabakat mesajı') + ' · ' + s.ad, h('div', { class: 'form' },
    h('p', { class: 'kucuk' }, t('Göndermeden önce metni düzenleyebilirsiniz.')), kutu,
    h('div', { class: 'dugme-satir' }, h('button', { class: 'dugme', type: 'button', onclick: () => waAc(u.telefon, kutu.value) }, t("WhatsApp'ta aç")), kopya)));
}

// İtiraz eden ustayla konuşulup çözüldüğünde yönetici kapatır: itiraz notu korunur, çözüm ve kapatan kişi kayda geçer
function itirazKapat(s, m, D, yenile) {
  const g = gunPayi(s, D);
  const cozum = h('textarea', { rows: 3, maxlength: 120, class: 'liste-metin', placeholder: t('Ne konuşuldu / ne düzeltildi? (örn. kaş işlemi eklendi, usta kabul etti)') });
  const hata = h('div', { class: 'hata', role: 'alert' });
  const dugme = h('button', { class: 'dugme', type: 'submit' }, t('Mutabakatı kapat'));
  const icerik = h('div', null);
  const p = pencereAc(s.ad + ' · ' + t('itiraz'), icerik);
  icerik.append(h('form', { class: 'form', novalidate: true,
    onsubmit: (e) => {
      e.preventDefault(); hata.textContent = '';
      if (cozum.value.trim().length < 3) { hata.textContent = t('Çözümü kısaca yazın.'); return; }
      kilitli(dugme, async () => {
        try {
          const not = ('İtiraz: ' + (m.not || '') + ' → Çözüm: ' + cozum.value.trim()).slice(0, 300);
          const b = writeBatch(db);
          b.update(doc(db, 'salons', S.salon.id, 'mutabakat', s.uid + '_' + H.tarih), { ustaUid: s.uid, tarih: H.tarih, durum: 'onay', not, tutar: g.pay, onaylayan: auth.currentUser.uid, guncelleme: serverTimestamp() });
          b.set(doc(collection(db, 'salons', S.salon.id, 'kayitlar')), { uid: auth.currentUser.uid, islem: 'mutabakat_itiraz_kapandi', hedef: s.uid, ayrinti: s.ad + ' ' + H.tarih + ': ' + cozum.value.trim().slice(0, 100), zaman: serverTimestamp() });
          await b.commit(); p.kapat(); bildir(t('Mutabakat kapatıldı')); yenile();
        } catch (err) { console.error(err); hata.textContent = hataMetni(err); }
      });
    } },
    h('p', null, t('Ustanın itirazı:') + ' “' + (m.not || '') + '”'),
    h('p', { class: 'kucuk' }, t('Ustayla konuşup konuyu çözdükten sonra buradan kapatın. İtiraz ve çözüm kayıtta kalır.')),
    h('label', null, t('Çözüm notu'), cozum), hata, dugme));
}

// Usta telefona bakmıyorsa yönetici sözlü onayı işaretler (kim işaretlediği kayda geçer)
async function yoneticiOnayi(s, D, yenile) {
  const g = gunPayi(s, D);
  if (!g.satirlar.length) { bildir(t('Bu gün için ustanın işlemi yok.'), 'hata'); return; }
  if (!(await onayIste(t('{ad} için {gun} günü hesabı ({tutar}) sözlü olarak onaylanmış sayılsın mı? Kayıtta sizin işaretlediğiniz görünür.', { ad: s.ad, gun: tarihTR(H.tarih), tutar: para(g.pay) }), t('Evet, onaylandı')))) return;
  try {
    const b = writeBatch(db);
    b.set(doc(db, 'salons', S.salon.id, 'mutabakat', s.uid + '_' + H.tarih), { ustaUid: s.uid, tarih: H.tarih, durum: 'onay', not: '', tutar: g.pay, onaylayan: auth.currentUser.uid, guncelleme: serverTimestamp() });
    b.set(doc(collection(db, 'salons', S.salon.id, 'kayitlar')), { uid: auth.currentUser.uid, islem: 'mutabakat_sozlu', hedef: s.uid, ayrinti: s.ad + ' ' + H.tarih + ': ' + g.pay + ' ' + sembol() + '', zaman: serverTimestamp() });
    await b.commit(); bildir(t('Onay kaydedildi')); yenile();
  } catch (err) { console.error(err); bildir(hataMetni(err), 'hata'); }
}

function avansFormu(s, D, yenile) {
  const tutar = h('input', { type: 'text', inputmode: 'decimal', placeholder: t('Tutar (₺)') });
  const not = h('input', { type: 'text', maxlength: 100, placeholder: t('Not (isteğe bağlı)') });
  const hata = h('div', { class: 'hata', role: 'alert' });
  const dugme = h('button', { class: 'dugme', type: 'submit' }, t('Avansı kaydet'));
  const icerik = h('div', null);
  const p = pencereAc(t('Avans: {ad}', { ad: s.ad }), icerik);
  icerik.append(h('form', { class: 'form', novalidate: true,
    onsubmit: (e) => {
      e.preventDefault(); hata.textContent = '';
      const v = sayi(tutar.value);
      if (!Number.isFinite(v) || v === 0 || Math.abs(v) > 1000000) { hata.textContent = t('Tutarı yazın. Yanlış girilen avansı düzeltmek için eksi (−) tutar yazın.'); return; }
      kilitli(dugme, async () => {
        try {
          const b = writeBatch(db);
          b.set(doc(collection(db, 'salons', S.salon.id, 'avanslar')), { ustaUid: s.uid, tutar: yuvarla(v), tarih: tarihMetin(new Date()), donem: D.donem, not: not.value.trim(), veren: auth.currentUser.uid, zaman: serverTimestamp() });
          b.set(doc(collection(db, 'salons', S.salon.id, 'kayitlar')), { uid: auth.currentUser.uid, islem: 'avans', hedef: s.uid, ayrinti: s.ad + ': ' + v + ' ' + sembol() + '', zaman: serverTimestamp() });
          await b.commit(); p.kapat(); bildir(t('Avans kaydedildi')); yenile();
        } catch (err) { console.error(err); hata.textContent = hataMetni(err); }
      });
    } },
    h('label', null, t('Tutar'), tutar), h('label', null, t('Not'), not), hata, dugme));
}

function kapatOnay(D, satirlar, toplam, yenile) {
  const hata = h('div', { class: 'hata', role: 'alert' });
  const dugme = h('button', { class: 'dugme', type: 'button' }, t('Evet, dönemi kapat'));
  const icerik = h('div', null);
  const p = pencereAc(t('Hesabı kapat'), icerik);
  doldur(icerik,
    D.bekleyen ? h('div', { class: 'uyari' }, t('Ödemesi alınmamış {n} randevu var. Önce Günlük kasa bölümünden ödemelerini alın ya da iptal edin.', { n: D.bekleyen })) : null,
    h('p', null, t('Ustalara ödenecek tutarlar:')),
    satirlar.map(s => h('div', { class: 'hesap-satir' }, h('span', null, s.ad), h('strong', null, s.odenecek < 0 ? t('Borç {tutar}', { tutar: para(-s.odenecek) }) : para(s.odenecek)))),
    h('p', { class: 'kucuk' }, t('Kapatınca bu dönemdeki ödemeler değiştirilemez ve sayaçlar sıfırlanır. Eksi bakiyeler bir sonraki döneme borç olarak devreder.')),
    hata, h('div', { class: 'dugme-satir' }, h('button', { class: 'dugme ikincil', type: 'button', onclick: p.kapat }, t('Vazgeç')), dugme));
  dugme.addEventListener('click', () => kilitli(dugme, async () => {
    try {
      const taze = await donemiYukle();
      if (taze !== D.donem) { hata.textContent = t('Dönem az önce başkası tarafından kapatıldı. Sayfa yenileniyor.'); yenile(); return; }
      const b = writeBatch(db);
      const ustalar = satirlar.map(s => ({ uid: s.uid, ad: s.ad, hizmet: s.hizmet, urun: s.urun, komisyon: s.komisyon, hakedis: s.hakedis, avans: s.avans, devir: s.devir, odenecek: s.odenecek, yeniDevir: Math.min(0, s.odenecek) }));
      b.set(doc(collection(db, 'salons', S.salon.id, 'donemler')), { donem: D.donem, ustalar, toplam, kapatan: auth.currentUser.uid, zaman: serverTimestamp() });
      b.set(doc(db, 'salons', S.salon.id, 'ayarlar', 'kapanis'), { donem: D.donem + 1, guncelleme: serverTimestamp() });
      ustalar.forEach(x => b.set(doc(db, 'salons', S.salon.id, 'ustaDevir', x.uid), { devir: x.yeniDevir, guncelleme: serverTimestamp() }));
      b.set(doc(collection(db, 'salons', S.salon.id, 'kayitlar')), { uid: auth.currentUser.uid, islem: 'donem_kapat', hedef: String(D.donem), ayrinti: 'Ciro ' + toplam.brut + ' ' + sembol() + ', salonda kalan ' + toplam.salon + ' ' + sembol() + '', zaman: serverTimestamp() });
      await b.commit(); p.kapat(); bildir(t('Hesap kapatıldı. Yeni dönem başladı.')); yenile();
    } catch (err) { console.error(err); hata.textContent = hataMetni(err); }
  }));
}

function donemAyrinti(d) {
  pencereAc(t('Dönem {n}', { n: d.donem + 1 }), h('div', null,
    d.ustalar.map(s => h('div', { class: 'kart' },
      h('div', { class: 'uye-ust' }, h('strong', null, s.ad), h('strong', null, para(s.odenecek))),
      h('div', { class: 'kucuk' }, t('Hizmet {h}, ürün {u}, hakediş {k}, avans {a}', { h: para(s.hizmet), u: para(s.urun), k: para(s.hakedis), a: para(s.avans) })),
      s.yeniDevir < 0 ? h('div', { class: 'kucuk uyari-yazi' }, t('Sonraki döneme devreden borç: {b}', { b: para(-s.yeniDevir) })) : null)),
    h('div', { class: 'uye-ust ust-cizgi' }, h('span', null, t('Ciro')), h('strong', null, para(d.toplam.brut))),
    h('div', { class: 'uye-ust' }, h('span', null, t('Salonda kalan')), h('strong', null, para(d.toplam.salon)))));
}

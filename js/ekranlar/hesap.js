import { t } from '../i18n.js';
import { h, doldur, hataMetni, bildir, kilitli, para, sayi, pencereAc, lisansDurumu } from '../util.js';
import { S } from '../durum.js';
import { yetkiliMi } from '../roller.js';
import { auth, db, doc, collection, writeBatch, serverTimestamp } from '../fb.js';
import {
  uyeleriYukle, ustalariYukle, donemiYukle, donemOdemeleriniYukle, avanslariYukle, devirleriYukle,
  gunMutabakatiniYukle, donemleriYukle, randevulariYukle
} from '../veri.js';
import { tarihMetin, tarihEkle, tarihYazi } from '../takvim-mantik.js';
import { ustaOzetleri, gunOzeti, odenecek, yuvarla } from '../kasa-mantik.js';

const H = { tarih: tarihMetin(new Date()) };

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
    const [uyeler, u, odemeler, avanslar, devirler, mutabakat, donemler, randevular] = await Promise.all([
      uyeleriYukle(), ustalariYukle(), donemOdemeleriniYukle(donem), avanslariYukle(donem), devirleriYukle(),
      gunMutabakatiniYukle(H.tarih), donemleriYukle(), randevulariYukle(tarihEkle(bugun, -30), bugun)
    ]);
    ciz(kutu, { donem, uyeler, u, odemeler, avanslar, devirler, mutabakat, donemler, bekleyen: randevular.filter(r => r.durum === 'bekliyor').length }, yenile);
  } catch (e) {
    console.error(e);
    kutu.replaceChildren(h('div', { class: 'uyari' }, hataMetni(e)), h('button', { class: 'dugme ikincil', type: 'button', onclick: yenile }, t('Tekrar dene')));
  }
}

// Her ustanın dönem özeti
function hesapla(D) {
  const ozet = ustaOzetleri(D.odemeler, D.u.mali);
  const avans = {}; D.avanslar.forEach(a => { avans[a.ustaUid] = (avans[a.ustaUid] || 0) + a.tutar; });
  const idler = new Set([...Object.keys(ozet), ...Object.keys(avans), ...Object.keys(D.devirler),
    ...D.uyeler.filter(x => x.aktif && D.u.profil[x.id] && D.u.profil[x.id].calisir).map(x => x.id)]);
  const satirlar = [...idler].map(uid => {
    const o = ozet[uid] || { hizmet: 0, urun: 0, komisyon: 0, hakedis: 0 };
    const av = yuvarla(avans[uid] || 0), dv = D.devirler[uid] || 0;
    return { uid, ad: (D.uyeler.find(x => x.id === uid) || { ad: '?' }).ad, ...o, avans: av, devir: dv, odenecek: odenecek(o.hakedis, av, dv), maliYok: !D.u.mali[uid] };
  }).sort((a, b) => a.ad.localeCompare(b.ad, 'tr'));
  const gecerli = D.odemeler.filter(o => o.durum === 'gecerli');
  const z = gunOzeti(gecerli);
  const hakedis = yuvarla(satirlar.reduce((a, s) => a + s.hakedis, 0));
  return { satirlar, toplam: { brut: yuvarla(z.nakit + z.kart), komisyon: z.komisyon, net: z.net, hakedis, salon: yuvarla(z.net - hakedis) } };
}

function ciz(kutu, D, yenile) {
  const yetkili = yetkiliMi(S.profil.rol) && lisansDurumu(S.salon).aktif;
  const { satirlar, toplam } = hesapla(D);
  const mut = {}; D.mutabakat.forEach(m => { mut[m.ustaUid] = m; });
  doldur(kutu,
    h('p', { class: 'kucuk' }, t('Hesap dönemi {n}. Son "Hesabı kapat"tan bu yana alınan ödemeler.', { n: D.donem + 1 })),
    h('div', { class: 'kart kasa-ozet' },
      h('h3', { class: 'ilk' }, t('Salon toplamı (bu dönem)')),
      h('div', { class: 'uye-ust' }, h('span', null, t('Toplam ciro')), h('strong', null, para(toplam.brut))),
      h('div', { class: 'uye-ust kucuk' }, h('span', null, t('Kart komisyonu')), h('span', null, '− ' + para(toplam.komisyon))),
      h('div', { class: 'uye-ust kucuk' }, h('span', null, t('Ustaların hakedişi')), h('span', null, '− ' + para(toplam.hakedis))),
      h('div', { class: 'uye-ust ust-cizgi' }, h('span', null, t('Salonda kalan')), h('strong', null, para(toplam.salon)))),
    h('div', { class: 'baslik-satir' }, h('h2', { class: 'ilk' }, t('Ustalar')),
      h('label', { class: 'mut-gun' }, t('Mutabakat günü'), h('input', { type: 'date', value: H.tarih, onchange: (e) => { if (e.target.value) { H.tarih = e.target.value; yenile(); } } }))),
    satirlar.length === 0 ? h('p', { class: 'soluk' }, t('Henüz usta yok.')) : null,
    satirlar.map(s => ustaKart(s, mut[s.uid], yetkili, D, yenile)),
    yetkili ? h('div', { class: 'kart bilgi' },
      h('strong', null, t('Hesabı kapat (sıfırla)')),
      h('p', null, t('Ustalarla hesaplaştıktan sonra dönemi kapatın. Ödenecek tutarlar kayda geçer, sayaçlar sıfırlanır. Ustanın hakedişinden fazla avansı varsa fark borç olarak bir sonraki döneme devreder.')),
      h('button', { class: 'dugme', type: 'button', onclick: () => kapatOnay(D, satirlar, toplam, yenile) }, t('Hesabı kapat'))) : null,
    D.donemler.length ? h('div', null, h('h2', null, t('Kapanmış dönemler')),
      D.donemler.map(d => h('button', { class: 'kart odeme', type: 'button', onclick: () => donemAyrinti(d) },
        h('div', { class: 'uye-ust' }, h('strong', null, t('Dönem {n}', { n: d.donem + 1 })), h('span', { class: 'soluk' }, d.zaman && d.zaman.toMillis ? tarihMetin(new Date(d.zaman.toMillis())) : '')),
        h('div', { class: 'kucuk' }, t('Ciro {c}, salonda kalan {s}', { c: para(d.toplam.brut), s: para(d.toplam.salon) }))))) : null);
}

function ustaKart(s, m, yetkili, D, yenile) {
  return h('div', { class: 'kart usta-hesap' },
    h('div', { class: 'uye-ust' }, h('strong', null, s.ad), h('strong', { class: s.odenecek < 0 ? 'eksi' : '' }, para(s.odenecek))),
    s.maliYok ? h('div', { class: 'hata' }, t('Yüzdesi girilmemiş (Salon > Ustalar).')) : null,
    h('div', { class: 'hesap-satir' }, h('span', null, t('Hizmet cirosu')), h('span', null, para(s.hizmet))),
    s.urun > 0 ? h('div', { class: 'hesap-satir' }, h('span', null, t('Ürün satışı')), h('span', null, para(s.urun))) : null,
    h('div', { class: 'hesap-satir' }, h('span', null, t('Hakediş (komisyon düşülmüş)')), h('span', null, para(s.hakedis))),
    s.avans !== 0 ? h('div', { class: 'hesap-satir' }, h('span', null, t('Verilen avans')), h('span', null, '− ' + para(s.avans))) : null,
    s.devir !== 0 ? h('div', { class: 'hesap-satir' }, h('span', null, t('Önceki dönemden borç')), h('span', null, para(s.devir))) : null,
    h('div', { class: 'hesap-satir mut' }, h('span', null, t('Mutabakat') + ' (' + tarihYazi(H.tarih).split(' ').slice(0, 2).join(' ') + ')'),
      m ? h('span', { class: 'rozet ' + (m.durum === 'onay' ? 'odendi-rozet' : 'uyari-rozet') }, m.durum === 'onay' ? t('Onayladı') : t('İtiraz var')) : h('span', { class: 'soluk kucuk' }, t('Bekliyor'))),
    m && m.durum === 'itiraz' && m.not ? h('div', { class: 'kucuk uyari-yazi' }, '“' + m.not + '”') : null,
    yetkili ? h('button', { class: 'dugme ikincil kucuk-dugme', type: 'button', onclick: () => avansFormu(s, D, yenile) }, t('Avans ver')) : null);
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
          b.set(doc(collection(db, 'salons', S.salon.id, 'kayitlar')), { uid: auth.currentUser.uid, islem: 'avans', hedef: s.uid, ayrinti: s.ad + ': ' + v + ' ₺', zaman: serverTimestamp() });
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
      b.set(doc(collection(db, 'salons', S.salon.id, 'kayitlar')), { uid: auth.currentUser.uid, islem: 'donem_kapat', hedef: String(D.donem), ayrinti: 'Ciro ' + toplam.brut + ' ₺, salonda kalan ' + toplam.salon + ' ₺', zaman: serverTimestamp() });
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

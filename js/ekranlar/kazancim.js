import { t } from '../i18n.js';
import { h, doldur, hataMetni, bildir, kilitli, para, lisansDurumu } from '../util.js';
import { S } from '../durum.js';
import { auth, db, doc, writeBatch, serverTimestamp } from '../fb.js';
import { ayariYukle, donemiYukle, ustaSatirlariniYukle, ustaGunSatirlariniYukle, avanslariYukle, devirleriYukle, benimMutabakatim, benimMalim } from '../veri.js';
import { tarihMetin, tarihEkle, tarihYazi } from '../takvim-mantik.js';
import { ustaOzetleri, ustaGunSatirlari, odenecek, yuvarla } from '../kasa-mantik.js';

const G = { tarih: tarihMetin(new Date()) };

// Usta rolündeki kişinin kendi kazancı ve akşam mutabakatı
export function kazancimEkrani() {
  const kutu = h('div', { class: 'sayfa' }, h('h1', null, t('Kazancım')), h('p', { class: 'soluk' }, t('Yükleniyor…')));
  const yenile = () => yukle(kutu, yenile);
  yenile();
  return kutu;
}

async function yukle(kutu, yenile) {
  const uid = auth.currentUser.uid;
  try {
    const donem = await donemiYukle();
    const [mali, odemeler, gunOdemeleri, avanslar, devirler, mut, ayar] = await Promise.all([
      benimMalim(uid), ustaSatirlariniYukle(donem, uid), ustaGunSatirlariniYukle(G.tarih, uid), avanslariYukle(donem, uid), devirleriYukle(uid), benimMutabakatim(uid, G.tarih), ayariYukle()
    ]);
    ciz(kutu, uid, { mali, odemeler, gunOdemeleri, avanslar, devir: devirler[uid] || 0, mut, taban: (ayar && ayar.urunTaban) || 'kar' }, yenile);
  } catch (e) {
    console.error(e);
    kutu.replaceChildren(h('h1', null, t('Kazancım')), h('div', { class: 'uyari' }, hataMetni(e)), h('button', { class: 'dugme ikincil', type: 'button', onclick: yenile }, t('Tekrar dene')));
  }
}

function ciz(kutu, uid, D, yenile) {
  const bugun = tarihMetin(new Date());
  const lisansOk = lisansDurumu(S.salon).aktif;
  const satirlar = ustaGunSatirlari(D.gunOdemeleri, uid, G.tarih, D.mali, D.taban);
  const gunPay = yuvarla(satirlar.reduce((a, s) => a + s.pay, 0));
  const ozet = ustaOzetleri(D.odemeler, { [uid]: D.mali }, D.taban)[uid] || { hizmet: 0, urun: 0, hakedis: 0 };
  const avans = yuvarla(D.avanslar.reduce((a, x) => a + x.tutar, 0));
  const not = h('input', { type: 'text', maxlength: 200, placeholder: t('İtiraz nedeni (örn. Ayşe Hanım\'ın boyası eksik yazılmış)') });
  const hata = h('div', { class: 'hata', role: 'alert' });

  const yaz = (durum) => {
    hata.textContent = '';
    if (durum === 'itiraz' && not.value.trim().length < 3) { hata.textContent = t('İtiraz nedenini yazın.'); return; }
    return (async () => {
      try {
        const b = writeBatch(db);
        b.set(doc(db, 'salons', S.salon.id, 'mutabakat', uid + '_' + G.tarih), { ustaUid: uid, tarih: G.tarih, durum, not: durum === 'itiraz' ? not.value.trim() : '', tutar: gunPay, guncelleme: serverTimestamp() });
        await b.commit(); bildir(durum === 'onay' ? t('Onayınız kaydedildi.') : t('İtirazınız yöneticiye iletildi.')); yenile();
      } catch (err) { console.error(err); hata.textContent = hataMetni(err); }
    })();
  };

  doldur(kutu,
    h('h1', null, t('Kazancım')),
    !D.mali ? h('div', { class: 'uyari' }, t('Yüzdeniz henüz girilmemiş. Yöneticinizle görüşün.')) : null,
    h('div', { class: 'tarih-cubugu' },
      h('button', { class: 'ikon-dugme', type: 'button', 'aria-label': t('Önceki gün'), onclick: () => { G.tarih = tarihEkle(G.tarih, -1); yenile(); } }, '‹'),
      h('input', { type: 'date', value: G.tarih, max: bugun, onchange: (e) => { if (e.target.value) { G.tarih = e.target.value; yenile(); } } }),
      h('button', { class: 'ikon-dugme', type: 'button', 'aria-label': t('Sonraki gün'), onclick: () => { if (G.tarih < bugun) { G.tarih = tarihEkle(G.tarih, 1); yenile(); } } }, '›')),
    h('div', { class: 'tarih-yazi' }, tarihYazi(G.tarih), G.tarih === bugun ? h('span', { class: 'rozet' }, t('Bugün')) : null),
    satirlar.length === 0 ? h('p', { class: 'soluk' }, t('Bu gün adınıza kayıtlı ödeme yok.')) : null,
    satirlar.map(s => h('div', { class: 'kart' },
      h('div', { class: 'uye-ust' }, h('strong', null, s.kalem.ad + (s.kalem.tur === 'urun' ? ' (' + t('ürün') + ')' : '')), h('strong', null, para(s.pay))),
      h('div', { class: 'kucuk' }, (s.odeme.musteriAd || t('Satış')) + ' · ' + t('tutar') + ' ' + para(s.kalem.tutar) + (s.odeme.yontem === 'kart' ? ' · ' + t('kart') : '')))),
    satirlar.length ? h('div', { class: 'kart kasa-ozet' },
      h('div', { class: 'uye-ust' }, h('span', null, t('Bugünkü payınız')), h('strong', { class: 'gun-pay' }, para(gunPay))),
      h('div', { class: 'kucuk' }, t('Kartla alınanlardan önce komisyon düşülür, kalan tutar yüzdenize göre hesaplanır.'))) : null,
    satirlar.length || D.mut ? h('div', { class: 'kart bilgi' },
      h('strong', null, t('Akşam mutabakatı')),
      D.mut ? h('p', null, D.mut.durum === 'onay' ? t('Bu günü onayladınız.') : t('İtirazınız var: ') + '“' + D.mut.not + '”') : h('p', null, t('Hesap doğruysa onaylayın; yanlışlık varsa itiraz edip nedenini yazın.')),
      lisansOk ? h('div', null,
        h('div', { class: 'dugme-satir sol' }, h('button', { class: 'dugme', type: 'button', onclick: (e) => kilitli(e.currentTarget, () => yaz('onay')) }, t('Onaylıyorum'))),
        not, h('div', { class: 'dugme-satir sol' }, h('button', { class: 'dugme ikincil', type: 'button', onclick: (e) => kilitli(e.currentTarget, () => yaz('itiraz')) }, t('İtirazım var'))),
        hata) : null) : null,
    h('h2', null, t('Bu dönem')),
    h('div', { class: 'kart kasa-ozet' },
      h('div', { class: 'hesap-satir' }, h('span', null, t('Hizmet cirosu')), h('span', null, para(ozet.hizmet))),
      ozet.urun > 0 ? h('div', { class: 'hesap-satir' }, h('span', null, t('Ürün satışı')), h('span', null, para(ozet.urun))) : null,
      h('div', { class: 'hesap-satir' }, h('span', null, t('Hakediş')), h('span', null, para(ozet.hakedis))),
      avans !== 0 ? h('div', { class: 'hesap-satir' }, h('span', null, t('Aldığınız avans')), h('span', null, '− ' + para(avans))) : null,
      D.devir !== 0 ? h('div', { class: 'hesap-satir' }, h('span', null, t('Önceki dönemden borç')), h('span', null, para(D.devir))) : null,
      h('div', { class: 'hesap-satir ust-cizgi' }, h('strong', null, t('Ödenecek')), h('strong', { class: 'odenecek' }, para(odenecek(ozet.hakedis, avans, D.devir))))),
    D.avanslar.length ? h('div', null, h('h3', null, t('Avanslarım')), D.avanslar.map(a => h('div', { class: 'hesap-satir' }, h('span', null, a.tarih + (a.not ? ' · ' + a.not : '')), h('span', null, para(a.tutar))))) : null);
}

import { t } from '../i18n.js';
import { h, doldur, hataMetni, bildir, kilitli, para, pencereAc } from '../util.js';
import { S } from '../durum.js';
import { auth, db, doc, collection, writeBatch, serverTimestamp, arrayUnion } from '../fb.js';
import { kilitleriYukle } from '../veri.js';
import { dkMetin, metinDk, hizmetUyarla, mesgulAraliklar, dilimler, kalemYap, ustaDurumu, randevuKilitleri } from '../takvim-mantik.js';
import { formulFormu, formulYazabilir } from './islem.js';

const DURUM_YAZI = { ok: 'müsait', disarda: 'mesai dışı', izin: 'izinli', dolu: 'dolu' };

// Müşteri salondayken, var olan randevuya ilave hizmet ekler (aynı ya da başka ustaya).
// Yeni randevu açmak gerekmez: tek randevu, birden çok kalem; ödeme de tek seferde alınır.
export function ilaveHizmetFormu(r, ctx, yenile) {
  const adim = (ctx.ayar && ctx.ayar.randevuAdimi) || 15;
  const hizmetler = ctx.hizmetler.filter(x => x.aktif);
  // Usta yalnızca kendine hizmet ekler
  const ustaListe = ctx.uyeler.filter(u => u.aktif && ctx.profil[u.id] && ctx.profil[u.id].calisir && (S.profil.rol !== 'usta' || u.id === auth.currentUser.uid));
  let harita = {};
  const son = r.kalemler[r.kalemler.length - 1];

  const hizSec = h('select', { 'aria-label': t('Hizmet') }, h('option', { value: '' }, t('Hizmet seçin')),
    hizmetler.map(x => h('option', { value: x.id }, x.ad + ' · ' + x.sure + ' ' + t('dk'))));
  const sureK = h('input', { type: 'number', inputmode: 'numeric', min: 5, max: 600, step: 5 });
  const fiyatK = h('input', { type: 'number', inputmode: 'decimal', min: 0, step: 'any' });
  const saatK = h('input', { type: 'time', step: String(adim * 60), value: dkMetin(Math.min(r.bit, 1435)) });
  const ustaSec = h('select', { 'aria-label': t('Usta'), disabled: true });
  const bilgi = h('div', { class: 'kucuk' });
  const hata = h('div', { class: 'hata', role: 'alert' });
  const dugme = h('button', { class: 'dugme', type: 'submit' }, t('Hizmeti ekle'));

  let adaylar = [];
  function hesapla() {
    const taban = hizmetler.find(x => x.id === hizSec.value);
    const hz = taban ? hizmetUyarla(taban, sureK.value === '' ? '' : Number(sureK.value), fiyatK.value === '' ? '' : Number(fiyatK.value)) : null;
    const bas = metinDk(saatK.value);
    adaylar = [];
    if (!hz || !Number.isFinite(bas)) { doldur(ustaSec); ustaSec.disabled = true; doldur(bilgi); return null; }
    const ar = mesgulAraliklar(hz, bas), dl = dilimler(ar), alinmis = new Set(Object.keys(harita));
    adaylar = ustaListe.filter(u => (ctx.profil[u.id].hizmetler || []).includes(hz.id))
      .map(u => ({ u, ...ustaDurumu(ctx.profil[u.id], r.tarih, ar, dl, u.id, alinmis) }));
    const onceki = ustaSec.value;
    const oner = adaylar.find(a => a.u.id === onceki && (a.durum === 'ok' || a.durum === 'disarda'))
      || adaylar.find(a => a.u.id === S.profil.id && a.durum === 'ok') || adaylar.find(a => a.u.id === son.ustaUid && a.durum === 'ok') || adaylar.find(a => a.durum === 'ok');
    doldur(ustaSec, adaylar.map(a => h('option', { value: a.u.id, selected: oner && a.u.id === oner.u.id, disabled: a.durum === 'izin' || a.durum === 'dolu' }, a.u.ad + ' · ' + t(DURUM_YAZI[a.durum]))));
    ustaSec.disabled = adaylar.length === 0;
    doldur(bilgi, h('span', null, dkMetin(bas) + '–' + dkMetin(bas + hz.sure) + ' · ' + hz.sure + ' ' + t('dk') + (hz.fiyat > 0 ? ' · ' + para(hz.fiyat) : '')));
    return { hz, bas, ar, dl };
  }
  const guncelle = () => { hata.textContent = ''; hesapla(); };
  // Hizmet seçilince süre ve ücret hizmetteki değerle dolar; bu randevu için değiştirilebilir
  hizSec.addEventListener('change', () => { const tb = hizmetler.find(x => x.id === hizSec.value); sureK.value = tb ? tb.sure : ''; fiyatK.value = tb ? tb.fiyat : ''; guncelle(); });
  sureK.addEventListener('change', guncelle); fiyatK.addEventListener('change', guncelle);
  saatK.addEventListener('change', guncelle); ustaSec.addEventListener('change', () => { hata.textContent = ''; });

  kilitleriYukle(r.tarih).then(m => { harita = m; hesapla(); }).catch(e => { console.error(e); hata.textContent = hataMetni(e); });

  const icerik = h('div', null);
  const p = pencereAc(t('İlave hizmet') + ' · ' + r.musteriAd, icerik);
  icerik.append(h('form', { class: 'form', novalidate: true,
    onsubmit: (e) => {
      e.preventDefault(); hata.textContent = '';
      const x = hesapla();
      if (!x) { hata.textContent = t('Hizmeti ve saati seçin.'); return; }
      const a = adaylar.find(y => y.u.id === ustaSec.value);
      if (!a || a.durum === 'izin' || a.durum === 'dolu') { hata.textContent = t('Bu saatte uygun usta yok. Saati değiştirin ya da başka usta seçin.'); return; }
      if (r.kalemler.length >= 6) { hata.textContent = t('Bir randevuya en fazla 6 hizmet eklenebilir.'); return; }
      if (x.bas + x.hz.sure > 1440) { hata.textContent = t('Randevu gün sonunu aşıyor. Saati erkene alın.'); return; }
      kilitli(dugme, async () => {
        try {
          const taze = await kilitleriYukle(r.tarih);
          const kalem = kalemYap(x.hz, a.u.id, x.bas);
          const yeniKilit = randevuKilitleri([kalem], r.tarih);
          if (yeniKilit.some(k => taze[k])) { harita = taze; hesapla(); hata.textContent = t('Bu saat dolu. Yeni durum yüklendi; saat ya da usta seçin.'); return; }
          const kalemler = [...r.kalemler, kalem];
          const kilitler = [...(r.kilitler || []), ...yeniKilit];
          if (kilitler.length > 400) { hata.textContent = t('Randevu çok uzun.'); return; }
          const ustalar = [...new Set(kalemler.map(k => k.ustaUid))];
          const bas = Math.min(r.bas, kalem.bas), bit = Math.max(r.bit, kalem.bit);
          const b = writeBatch(db);
          b.update(doc(db, 'salons', S.salon.id, 'randevular', r.id), { kalemler, kilitler, ustalar, bas, bit, guncelleme: serverTimestamp() });
          yeniKilit.forEach(k => b.set(doc(db, 'salons', S.salon.id, 'slotlar', k), { rid: r.id, ustaUid: k.split('_')[0], tarih: r.tarih }));
          if (r.musteriId) b.update(doc(db, 'salons', S.salon.id, 'musteriler', r.musteriId), { ustalar: arrayUnion(a.u.id), guncelleme: serverTimestamp() });
          b.set(doc(collection(db, 'salons', S.salon.id, 'kayitlar')), { uid: auth.currentUser.uid, islem: 'randevu', hedef: S.salon.id, ayrinti: 'İlave hizmet: ' + r.musteriAd + ' · ' + x.hz.ad + ' (' + a.u.ad + ')', zaman: serverTimestamp() });
          await b.commit();
          p.kapat(); bildir(t('Hizmet eklendi')); yenile();
          const guncel = { ...r, kalemler, kilitler, ustalar, bas, bit };
          if (formulYazabilir(kalem)) formulFormu(guncel, kalemler.length - 1, null, yenile);
        } catch (err) { console.error(err); hata.textContent = hataMetni(err); }
      });
    } },
    h('p', { class: 'kucuk' }, t('Müşteri zaten salonda: yeni randevu açmayın, hizmeti bu randevuya ekleyin. Başka bir ustanın işi de olabilir (örn. manikür).')),
    h('label', null, t('Hizmet'), hizSec),
    h('div', { class: 'iki-sutun' }, h('label', null, t('Süre (dk)'), sureK), h('label', null, t('Ücret (₺)'), fiyatK)),
    h('label', null, t('Başlangıç saati'), saatK),
    h('label', null, t('Usta'), ustaSec), bilgi, hata, dugme));
}

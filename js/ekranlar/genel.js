import { t } from '../i18n.js';
import { h, hataMetni, bildir, kilitli, sayi, lisansDurumu } from '../util.js';
import { S } from '../durum.js';
import { yetkiliMi } from '../roller.js';
import { auth, db, doc, collection, writeBatch, serverTimestamp } from '../fb.js';
import { ayariYukle } from '../veri.js';

const ADIMLAR = [5, 10, 15, 20, 30, 60];

export function genelEkrani() {
  const kutu = h('div', null, h('p', { class: 'soluk' }, t('Yükleniyor…')));
  ayariYukle().then(a => ciz(kutu, a)).catch(e => kutu.replaceChildren(h('div', { class: 'uyari' }, hataMetni(e))));
  return kutu;
}

function ciz(kutu, ayar) {
  const yetkili = yetkiliMi(S.profil.rol);
  const kapali = !yetkili || !lisansDurumu(S.salon).aktif;
  const pos = h('input', { type: 'text', inputmode: 'decimal', value: ayar ? String(ayar.posOrani).replace('.', ',') : '', placeholder: 'örn. 2,5', disabled: kapali });
  const adim = h('select', { disabled: kapali }, ADIMLAR.map(a => h('option', { value: String(a), selected: a === (ayar ? ayar.randevuAdimi : 15) }, a + ' ' + t('dakika'))));
  const tel = h('input', { type: 'tel', inputmode: 'tel', value: ayar ? ayar.salonTel : '', placeholder: t('Salonun telefonu (isteğe bağlı)'), maxlength: 30, disabled: kapali });
  const hata = h('div', { class: 'hata', role: 'alert' });
  const dugme = h('button', { class: 'dugme', type: 'submit', disabled: kapali }, t('Kaydet'));
  kutu.replaceChildren(h('form', { class: 'kart form', novalidate: true,
    onsubmit: (e) => {
      e.preventDefault(); hata.textContent = '';
      const p = sayi(pos.value);
      if (!Number.isFinite(p) || p < 0 || p > 20) { hata.textContent = t('Kart komisyon oranı 0 ile 20 arasında bir sayı olmalı. Yoksa 0 yazın.'); return; }
      kilitli(dugme, async () => {
        try {
          const veri = { posOrani: p, randevuAdimi: Number(adim.value), salonTel: tel.value.trim(), guncelleme: serverTimestamp() };
          const b = writeBatch(db);
          b.set(doc(db, 'salons', S.salon.id, 'ayarlar', 'genel'), veri);
          b.set(doc(collection(db, 'salons', S.salon.id, 'kayitlar')), {
            uid: auth.currentUser.uid, islem: 'ayar_genel', hedef: S.salon.id, ayrinti: 'Kart komisyonu %' + p + ', adım ' + adim.value + ' dk', zaman: serverTimestamp()
          });
          await b.commit();
          await ayariYukle(true);
          bildir(t('Kaydedildi'));
        } catch (err) { console.error(err); hata.textContent = hataMetni(err); }
      });
    } },
    h('h2', { class: 'ilk' }, t('Genel ayarlar')),
    h('label', null, t('Kart (POS) komisyon oranı, %'), pos),
    h('p', { class: 'kucuk' }, t('Kartla alınan ödemelerden bu oran önce düşülür, kalan tutar ustanın yüzdesine göre bölünür. Usta ve salon komisyonu birlikte taşır.')),
    h('label', null, t('Takvimde randevu adımı'), adim),
    h('label', null, t('Salon telefonu'), tel),
    hata, kapali ? null : dugme,
    yetkili ? null : h('p', { class: 'kucuk' }, t('Bu ayarları yönetici ya da kıdemli yetkili değiştirir.'))));
}

// Salon ilk açıldığında ülke ve para birimi seçimi (bir kez). Seçilene kadar salon kullanılmaz.
import { t } from '../i18n.js';
import { UYGULAMA } from '../config.js';
import { h, hataMetni, kilitli, onayIste } from '../util.js';
import { S } from '../durum.js';
import { yetkiliMi } from '../roller.js';
import { auth, db, signOut, doc, writeBatch } from '../fb.js';
import { ULKELER, PARALAR } from '../ulke.js';
import { oturumuYukle } from '../main.js';

export const ulkeSecilmeli = () => !!(S.salon && !S.salon.para);

export function ulkeSecEkrani() {
  const yetkili = yetkiliMi(S.profil.rol);
  const cikis = h('button', { class: 'baglanti', type: 'button', onclick: async () => { S.sekme = 'ana'; await signOut(auth); } }, t('Çıkış yap'));
  if (!yetkili) {
    return h('div', { class: 'giris' }, h('img', { src: 'icons/logo.png', alt: UYGULAMA.ad, class: 'giris-logo' }), h('h1', null, S.salon.ad),
      h('div', { class: 'kart bilgi' }, h('strong', null, t('Kurulum bekleniyor')), h('p', null, t('Salonunuzun yöneticisi ülke ve para birimini seçince uygulamayı kullanabilirsiniz.'))), cikis);
  }
  const ulke = h('select', null, Object.entries(ULKELER).map(([k, u]) => h('option', { value: k }, t(u.ad))));
  const para = h('select', null, Object.entries(PARALAR).map(([k, p]) => h('option', { value: k }, p.sembol + ' · ' + t(p.ad))));
  const ornek = h('p', { class: 'kucuk' });
  const guncelle = () => { para.value = ULKELER[ulke.value].para; ornek.textContent = t('Tutarlar şöyle görünür:') + ' ' + (1250).toLocaleString('tr-TR') + ' ' + PARALAR[para.value].sembol; };
  ulke.addEventListener('change', guncelle); para.addEventListener('change', guncelle);
  ulke.value = 'TR'; guncelle();
  const hata = h('div', { class: 'hata', role: 'alert' });
  const dugme = h('button', { class: 'dugme', type: 'submit' }, t('Kaydet ve başla'));
  return h('div', { class: 'giris' },
    h('img', { src: 'icons/logo.png', alt: UYGULAMA.ad, class: 'giris-logo' }), h('h1', null, S.salon.ad),
    h('form', { class: 'form', novalidate: true,
      onsubmit: async (e) => {
        e.preventDefault(); hata.textContent = '';
        if (!(await onayIste(t('{ulke} · {para} seçilsin mi? Bu seçim sonradan değiştirilemez; değiştirmek için destek gerekir.', { ulke: t(ULKELER[ulke.value].ad), para: PARALAR[para.value].sembol }), t('Evet, kaydet')))) return;
        kilitli(dugme, async () => {
          try {
            const b = writeBatch(db);
            b.update(doc(db, 'salons', S.salon.id), { ulke: ulke.value, para: para.value });
            await b.commit();
            await oturumuYukle();
          } catch (err) { console.error(err); hata.textContent = hataMetni(err); }
        });
      } },
      h('div', { class: 'kart bilgi' }, h('strong', null, t('Salonunuzu kuralım')), h('p', null, t('Önce salonunuzun bulunduğu ülkeyi ve kullanacağınız para birimini seçin. Telefon numaraları ve tutarlar buna göre yazılır.'))),
      h('label', null, t('Ülke'), ulke),
      h('label', null, t('Para birimi'), para), ornek,
      hata, dugme),
    cikis);
}

// Salon sahibi ilk girişte kullanım şartlarını ve gizlilik metnini kendi dilinde okuyup kabul eder.
// Kabul; sunucu saati, hesap ve dil ile salon belgesine yazılır (bir kez, sonradan değiştirilemez).
import { t, dilKodu } from '../i18n.js';
import { UYGULAMA, YASAL_SURUM } from '../config.js';
import { h, hataMetni, kilitli } from '../util.js';
import { S } from '../durum.js';
import { auth, db, signOut, doc, writeBatch, serverTimestamp } from '../fb.js';
import { dilSecici } from './dil-sec.js';
import { hukukGovdesi } from '../hukuk.js';
import { oturumuYukle } from '../main.js';

export const kabulGerekli = () => !!(S.salon && S.profil && S.salon.ownerUid === S.profil.id && !S.salon.kabul);

export function kabulEkrani() {
  const kutu = h('input', { type: 'checkbox', id: 'kabul-kutu' });
  const hata = h('div', { class: 'hata', role: 'alert' });
  const dugme = h('button', { class: 'dugme buyuk', type: 'submit' }, t('Kabul ediyorum ve devam et'));
  return h('div', { class: 'giris' },
    h('div', { class: 'dil-satir' }, dilSecici()),
    h('img', { src: 'icons/logo.png', alt: UYGULAMA.ad, class: 'giris-logo' }), h('h1', null, S.salon.ad),
    h('form', { class: 'form', novalidate: true,
      onsubmit: (e) => {
        e.preventDefault(); hata.textContent = '';
        if (!kutu.checked) { hata.textContent = t('Devam etmek için kutuyu işaretleyin.'); return; }
        kilitli(dugme, async () => {
          try {
            const b = writeBatch(db);
            b.update(doc(db, 'salons', S.salon.id), { kabul: { zaman: serverTimestamp(), uid: auth.currentUser.uid, dil: dilKodu(), surum: YASAL_SURUM } });
            await b.commit();
            await oturumuYukle();
          } catch (err) { console.error(err); hata.textContent = hataMetni(err); }
        });
      } },
      h('div', { class: 'kart bilgi' }, h('strong', null, t('Başlamadan önce')), h('p', null, t('Lütfen kullanım şartlarını ve gizlilik metnini okuyun. Devam etmek için kabul etmeniz gerekir.'))),
      h('div', { class: 'kart kabul-metin' }, hukukGovdesi('sartlar'), hukukGovdesi('gizlilik')),
      h('label', { class: 'onay', for: 'kabul-kutu' }, kutu, h('span', null, t('Okudum, anladım, kabul ediyorum.'))),
      hata, dugme),
    h('button', { class: 'baglanti', type: 'button', onclick: async () => { S.sekme = 'ana'; await signOut(auth); } }, t('Çıkış yap')));
}

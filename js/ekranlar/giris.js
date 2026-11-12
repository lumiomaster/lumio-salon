import { t } from '../i18n.js';
import { UYGULAMA } from '../config.js';
import { h, telNormalize, eposta, hataMetni, kilitli } from '../util.js';
import { S } from '../durum.js';
import { auth, signInWithEmailAndPassword } from '../fb.js';
import { dilSecici } from './dil-sec.js';

export function girisEkrani() {
  const kutu = h('div', { class: 'giris' });
  const ciz = () => {
    kutu.replaceChildren(...[
      h('div', { class: 'dil-satir' }, dilSecici()),
      h('img', { src: 'icons/logo.png', alt: UYGULAMA.ad, class: 'giris-logo' }),
      h('h1', null, UYGULAMA.ad),
      S.mesaj ? h('div', { class: 'uyari' }, S.mesaj) : null,
      girisFormu()].filter(Boolean));
  };
  ciz();
  return kutu;
}

function girisFormu() {
  const tel = h('input', { type: 'tel', inputmode: 'tel', autocomplete: 'username', placeholder: '05xx xxx xx xx', required: true });
  const sifre = h('input', { type: 'password', autocomplete: 'current-password', placeholder: t('Şifre'), required: true });
  const hata = h('div', { class: 'hata', role: 'alert' });
  const dugme = h('button', { class: 'dugme', type: 'submit' }, t('Giriş yap'));
  const form = h('form', { class: 'form', novalidate: true,
    onsubmit: (e) => {
      e.preventDefault(); hata.textContent = '';
      const d = telNormalize(tel.value);
      if (!d) { hata.textContent = t('Geçerli bir telefon numarası yazın.'); return; }
      if (!sifre.value) { hata.textContent = t('Şifrenizi yazın.'); return; }
      kilitli(dugme, async () => {
        try { await signInWithEmailAndPassword(auth, eposta(d), sifre.value); }
        catch (err) { hata.textContent = hataMetni(err); }
      });
    } },
    h('label', null, t('Telefon numarası'), tel),
    h('label', null, t('Şifre'), sifre),
    hata, dugme,
    h('p', { class: 'kucuk' }, t('Hesabınız yoksa ya da şifrenizi unuttuysanız salonunuzun yöneticisi veya destek ile iletişime geçin.')));
  return form;
}

import { t } from '../i18n.js';
import { UYGULAMA } from '../config.js';
import { h, telNormalize, eposta, hataMetni, kilitli } from '../util.js';
import { S } from '../durum.js';
import { auth, signInWithEmailAndPassword, TotpMultiFactorGenerator, getMultiFactorResolver } from '../fb.js';
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
        catch (err) {
          if (err && err.code === 'auth/multi-factor-auth-required') { ikinciAdim(form, err); return; }
          hata.textContent = hataMetni(err);
        }
      });
    } },
    h('label', null, t('Telefon numarası'), tel),
    h('label', null, t('Şifre'), sifre),
    hata, dugme,
    h('p', { class: 'kucuk' }, t('Hesabınız yoksa ya da şifrenizi unuttuysanız salonunuzun yöneticisi veya destek ile iletişime geçin.')));
  return form;
}

// Ek doğrulama açıksa: şifreden sonra doğrulama uygulamasındaki 6 haneli kod istenir
function ikinciAdim(form, err) {
  const cozucu = getMultiFactorResolver(auth, err);
  const ipucu = cozucu.hints.find(x => x.factorId === TotpMultiFactorGenerator.FACTOR_ID) || cozucu.hints[0];
  const kod = h('input', { type: 'text', inputmode: 'numeric', autocomplete: 'one-time-code', maxlength: 6, placeholder: '123456', required: true, 'aria-label': t('Doğrulama kodu') });
  const hata = h('div', { class: 'hata', role: 'alert' });
  const dugme = h('button', { class: 'dugme', type: 'submit' }, t('Doğrula ve gir'));
  const f2 = h('form', { class: 'form', novalidate: true,
    onsubmit: (e) => {
      e.preventDefault(); hata.textContent = '';
      const k = kod.value.replace(/\D/g, '');
      if (k.length !== 6) { hata.textContent = t('6 haneli kodu yazın.'); return; }
      kilitli(dugme, async () => {
        try { await cozucu.resolveSignIn(TotpMultiFactorGenerator.assertionForSignIn(ipucu.uid, k)); }
        catch (e2) { hata.textContent = e2 && e2.code === 'auth/invalid-verification-code' ? t('Kod yanlış ya da süresi geçti. Doğrulama uygulamasındaki güncel kodu yazın.') : hataMetni(e2); }
      });
    } },
    h('h2', null, t('Ek doğrulama')),
    h('p', { class: 'kucuk' }, t('Telefonunuzdaki doğrulama uygulamasında (Google Authenticator, Microsoft Authenticator vb.) LUMIO SALON için görünen 6 haneli kodu yazın.')),
    h('label', null, t('Doğrulama kodu'), kod), hata, dugme);
  form.replaceWith(f2);
  setTimeout(() => { try { kod.focus(); } catch (_) { /* odak yok */ } }, 50);
}

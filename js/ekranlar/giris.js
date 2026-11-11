import { t } from '../i18n.js';
import { UYGULAMA, YASAL_SURUM } from '../config.js';
import { hukukGoster } from '../hukuk.js';
import { h, telNormalize, eposta, hataMetni, bildir, kilitli } from '../util.js';
import { S } from '../durum.js';
import {
  auth, db, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  doc, collection, writeBatch, serverTimestamp
} from '../fb.js';
import { oturumuYukle } from '../main.js';

let mod = 'giris';

export function girisEkrani() {
  const kutu = h('div', { class: 'giris' });
  const ciz = () => {
    kutu.replaceChildren(...[
      h('img', { src: 'icons/logo.png', alt: UYGULAMA.ad, class: 'giris-logo' }),
      h('h1', null, UYGULAMA.ad),
      S.mesaj ? h('div', { class: 'uyari' }, S.mesaj) : null,
      h('div', { class: 'sekme-cubugu' },
        h('button', { type: 'button', class: mod === 'giris' ? 'secili' : '', onclick: () => { mod = 'giris'; S.mesaj = ''; ciz(); } }, t('Giriş yap')),
        h('button', { type: 'button', class: mod === 'kur' ? 'secili' : '', onclick: () => { mod = 'kur'; S.mesaj = ''; ciz(); } }, t('Salon kur'))),
      mod === 'giris' ? girisFormu() : kurFormu()].filter(Boolean));
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
    h('p', { class: 'kucuk' }, t('Şifrenizi unuttuysanız destek ile iletişime geçin. (Şifre sıfırlama sonraki teslimde eklenecek.)')));
  return form;
}

function kurFormu() {
  const ad = h('input', { type: 'text', autocomplete: 'name', placeholder: t('Adınız ve soyadınız'), required: true, maxlength: 60 });
  const salonAdi = h('input', { type: 'text', placeholder: t('Salonun adı'), required: true, maxlength: 80 });
  const tel = h('input', { type: 'tel', inputmode: 'tel', autocomplete: 'username', placeholder: '05xx xxx xx xx', required: true });
  const s1 = h('input', { type: 'password', autocomplete: 'new-password', placeholder: t('En az 6 karakter'), required: true });
  const s2 = h('input', { type: 'password', autocomplete: 'new-password', placeholder: t('Şifre tekrar'), required: true });
  const onay = h('input', { type: 'checkbox', id: 'yasal-onay' });
  const hata = h('div', { class: 'hata', role: 'alert' });
  const dugme = h('button', { class: 'dugme', type: 'submit' }, t('Salonu kur'));
  return h('form', { class: 'form', novalidate: true,
    onsubmit: (e) => {
      e.preventDefault(); hata.textContent = '';
      const d = telNormalize(tel.value);
      const adTemiz = ad.value.trim(), salonTemiz = salonAdi.value.trim();
      if (adTemiz.length < 2) { hata.textContent = t('Adınızı yazın.'); return; }
      if (salonTemiz.length < 2) { hata.textContent = t('Salonun adını yazın.'); return; }
      if (!d) { hata.textContent = t('Geçerli bir telefon numarası yazın.'); return; }
      if (s1.value.length < 6) { hata.textContent = t('Şifre en az 6 karakter olmalı.'); return; }
      if (s1.value !== s2.value) { hata.textContent = t('Şifreler aynı değil.'); return; }
      if (!onay.checked) { hata.textContent = t('Devam etmek için onay kutusunu işaretleyin.'); return; }
      kilitli(dugme, async () => {
        try { await salonKur({ ad: adTemiz, salonAdi: salonTemiz, tel: d, sifre: s1.value }); }
        catch (err) { console.error(err); hata.textContent = hataMetni(err); }
      });
    } },
    h('p', { class: 'kucuk' }, t('Siz salonun yöneticisi olursunuz. Ekibi giriş yaptıktan sonra eklersiniz. İlk 14 gün ücretsiz denemedir.')),
    h('label', null, t('Adınız ve soyadınız'), ad),
    h('label', null, t('Salonun adı'), salonAdi),
    h('label', null, t('Telefon numaranız (giriş için kullanılır)'), tel),
    h('label', null, t('Şifre'), s1),
    h('label', null, t('Şifre tekrar'), s2),
    h('label', { class: 'onay', for: 'yasal-onay' }, onay,
      h('span', null, t('Kullanım şartlarını ve gizlilik/KVKK metnini okudum, kabul ediyorum.'))),
    h('div', { class: 'kucuk' },
      h('button', { class: 'baglanti', type: 'button', onclick: () => hukukGoster('sartlar') }, t('Kullanım şartları')), ' · ',
      h('button', { class: 'baglanti', type: 'button', onclick: () => hukukGoster('gizlilik') }, t('Gizlilik / KVKK'))),
    hata, dugme);
}

async function salonKur({ ad, salonAdi, tel, sifre }) {
  S.kayitSuruyor = true;
  let cred = null;
  try {
    cred = await createUserWithEmailAndPassword(auth, eposta(tel), sifre);
    const uid = cred.user.uid;
    const salonRef = doc(collection(db, 'salons'));
    const b = writeBatch(db);
    b.set(salonRef, { ad: salonAdi, ownerUid: uid, durum: 'DENEME', paket: 'salon', olusturma: serverTimestamp() });
    b.set(doc(db, 'kullanicilar', uid), {
      salonId: salonRef.id, ad, telefon: tel, rol: 'yonetici', aktif: true,
      olusturma: serverTimestamp(), ekleyen: uid, yasalOnay: { surum: YASAL_SURUM }
    });
    await b.commit();
  } catch (e) {
    // Hesap açıldı ama salon yazılamadıysa hesabı geri al, kişi tekrar deneyebilsin
    if (cred && cred.user) { try { await cred.user.delete(); } catch (_) {} }
    throw e;
  } finally {
    S.kayitSuruyor = false;
  }
  mod = 'giris';   // sonraki çıkışta giriş formu açılsın
  bildir(t('Salonunuz kuruldu. Hoş geldiniz!'));
  await oturumuYukle();
}

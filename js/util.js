import { ALIAS_ALAN, DENEME_GUN } from './config.js';
import { paraBilgi } from './ulke.js';
import { t, yerel } from './i18n.js';

// Küçük yardımcı: h('div', {class:'x', onclick: fn}, 'metin', başkaDüğüm)
export function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, String(v));
  }
  const ekle = (c) => {
    if (c == null || c === false) return;
    if (Array.isArray(c)) { c.forEach(ekle); return; }
    el.append(c.nodeType ? c : document.createTextNode(String(c)));
  };
  kids.forEach(ekle);
  return el;
}

export { telNormalize, telGoster } from './ulke.js';
export function eposta(tel) { return tel + '@' + ALIAS_ALAN; }

export function hataMetni(e) {
  const kod = (e && e.code) || '';
  const harita = {
    'auth/invalid-credential': 'Telefon numarası ya da şifre yanlış.',
    'auth/invalid-login-credentials': 'Telefon numarası ya da şifre yanlış.',
    'auth/wrong-password': 'Telefon numarası ya da şifre yanlış.',
    'auth/user-not-found': 'Telefon numarası ya da şifre yanlış.',
    'auth/email-already-in-use': 'Bu telefon numarası zaten kayıtlı.',
    'auth/weak-password': 'Şifre en az 6 karakter olmalı.',
    'auth/too-many-requests': 'Çok fazla deneme yapıldı. Biraz bekleyip tekrar deneyin.',
    'auth/network-request-failed': 'İnternet bağlantısı yok ya da zayıf.',
    'auth/operation-not-allowed': 'Giriş yöntemi kapalı. Firebase > Authentication > E-posta/Şifre açılmalı.',
    'auth/requires-recent-login': 'Güvenlik için çıkış yapıp yeniden girin, sonra tekrar deneyin.',
    'auth/unauthorized-domain': 'Bu site adresi Firebase\'de yetkili alan adları listesinde yok.',
    'permission-denied': 'Bu işlem için yetkiniz yok ya da deneme/lisans süresi bitmiş.',
    'unavailable': 'Sunucuya ulaşılamıyor. İnternetinizi kontrol edin.'
  };
  const anahtar = kod.replace('firestore/', '');
  return t(harita[kod] || harita[anahtar] || ('Beklenmeyen hata: ' + (kod || (e && e.message) || 'bilinmiyor')));
}

export function lisansDurumu(salon) {
  const simdi = Date.now();
  if (!salon) return { aktif: false, kalan: 0, tur: '' };
  if (salon.durum === 'AKTIF' || salon.durum === 'DENEME') {
    let bitis = salon.bitisMs;
    if (typeof bitis !== 'number') {
      // Eski deneme salonları: kuruluştan DENEME_GUN gün
      const bas = salon.olusturma && salon.olusturma.toMillis ? salon.olusturma.toMillis() : simdi;
      bitis = salon.durum === 'DENEME' ? bas + DENEME_GUN * 864e5 : 0;
    }
    const kalan = Math.ceil((bitis - simdi) / 864e5);
    return { aktif: kalan > 0, kalan, tur: salon.durum, bitis };
  }
  return { aktif: false, kalan: 0, tur: salon.durum || '' };
}

// ---- Bildirim (toast) ve pencere (modal) ----
export function bildir(mesaj, tur) {
  let kutu = document.getElementById('bildirimler');
  if (!kutu) { kutu = h('div', { id: 'bildirimler', 'aria-live': 'polite' }); document.body.append(kutu); }
  const n = h('div', { class: 'bildirim ' + (tur || '') }, mesaj);
  kutu.append(n);
  setTimeout(() => n.remove(), tur === 'hata' ? 6000 : 3000);
}

import { girdiEkle, pencereGirdisiniBirak } from './gecmis.js';

// Açık pencereler (telefonun geri tuşu en üsttekini kapatır)
const ACIK = [];
export function ustPencereyiKapat() {
  const son = ACIK[ACIK.length - 1];
  if (!son) return false;
  const x = son.querySelector('.pencere-baslik .ikon-dugme');
  if (x) x.click(); else { ACIK.pop(); son.remove(); }
  return true;
}
export function pencereAc(baslik, icerik) {
  let girdi = false, kapali = false;
  const kapat = () => {
    if (kapali) return; kapali = true;
    const i = ACIK.indexOf(arka); if (i >= 0) ACIK.splice(i, 1);
    arka.remove(); pencereGirdisiniBirak(girdi);
  };
  const arka = h('div', { class: 'pencere-arka', onclick: (e) => { if (e.target === arka) kapat(); } },
    h('div', { class: 'pencere', role: 'dialog', 'aria-modal': 'true' },
      h('div', { class: 'pencere-baslik' }, h('h2', null, baslik), h('button', { class: 'ikon-dugme', type: 'button', onclick: kapat, 'aria-label': t('Kapat') }, '✕')),
      icerik));
  document.body.append(arka);
  ACIK.push(arka);
  girdi = girdiEkle();
  return { kapat };
}

export function onayIste(metin, evetMetni) {
  return new Promise((coz) => {
    const p = pencereAc(t('Emin misiniz?'), h('div', null,
      h('p', null, metin),
      h('div', { class: 'dugme-satir' },
        h('button', { class: 'dugme ikincil', type: 'button', onclick: () => { p.kapat(); coz(false); } }, t('Vazgeç')),
        h('button', { class: 'dugme', type: 'button', onclick: () => { p.kapat(); coz(true); } }, evetMetni || t('Evet')))));
  });
}

// Bir düğmeyi işlem sürerken kilitler (çift tıklama koruması)
// İnternet yokken kayıt başlatılmaz (Firebase yazıyı kuyruğa alıp sonra uygular; kişi tekrar bastıkça çift kayıt olurdu).
// Bağlantı yavaşsa 20 sn sonra "tekrar basmayın" uyarısı çıkar.
export async function kilitli(dugme, yap) {
  if (dugme.disabled) return;
  if (globalThis.__destekGorunumu && globalThis.__destekGorunumu()) { bildir(t('Destek görünümü salt okunurdur; değişiklik yapılamaz.'), 'hata'); return; }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) { bildir(t('İnternet yok; kayıt yapılmadı. Bağlantı gelince tekrar deneyin.'), 'hata'); return; }
  const eski = dugme.textContent;
  dugme.disabled = true; dugme.textContent = t('Bekleyin…');
  const bekci = setTimeout(() => bildir(t('Bağlantı yavaş. Kaydınız bağlantı gelince tamamlanır; lütfen tekrar basmayın.'), 'hata'), 20000);
  try { return await yap(); } finally { clearTimeout(bekci); dugme.disabled = false; dugme.textContent = eski; }
}

export function rastgeleSifre() {
  const a = new Uint32Array(1); crypto.getRandomValues(a);
  return String(100000 + (a[0] % 900000));
}

export function para(n) { const p = paraBilgi(); return (Number(n) || 0).toLocaleString(yerel(), { maximumFractionDigits: p.ondalik }) + ' ' + p.sembol; }
// "12,5" ve "12.5" ikisini de sayıya çevirir; geçersizse NaN
export function sayi(v) { const s = String(v == null ? '' : v).trim().replace(',', '.'); return s === '' ? NaN : Number(s); }

// Bir kutunun içini temizleyip yeni çocuklarla doldurur (dizi, null ve metin kabul eder)
export function doldur(el, ...kids) { const g = h('div', null, ...kids); el.replaceChildren(...g.childNodes); }

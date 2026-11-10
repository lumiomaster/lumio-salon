import { ALIAS_ALAN, DENEME_GUN } from './config.js';
import { t } from './i18n.js';

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

// Telefonu rakamlara çevirir. Türkiye numaraları 90 ile başlayacak biçime getirilir.
export function telNormalize(giris) {
  let d = String(giris || '').replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.length === 11 && d.startsWith('0')) d = '90' + d.slice(1);
  else if (d.length === 10 && d.startsWith('5')) d = '90' + d;
  if (d.length < 10 || d.length > 15) return '';
  return d;
}
export function telGoster(d) {
  if (/^90\d{10}$/.test(d)) return '0' + d.slice(2, 5) + ' ' + d.slice(5, 8) + ' ' + d.slice(8, 10) + ' ' + d.slice(10);
  return '+' + d;
}
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
  if (salon.durum === 'AKTIF') {
    const kalan = Math.ceil(((salon.bitisMs || 0) - simdi) / 864e5);
    return { aktif: kalan > 0, kalan, tur: 'AKTIF' };
  }
  if (salon.durum === 'DENEME') {
    const bas = salon.olusturma && salon.olusturma.toMillis ? salon.olusturma.toMillis() : simdi;
    const kalan = Math.ceil((bas + DENEME_GUN * 864e5 - simdi) / 864e5);
    return { aktif: kalan > 0, kalan, tur: 'DENEME' };
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
  const kapat = () => { const i = ACIK.indexOf(arka); if (i >= 0) ACIK.splice(i, 1); arka.remove(); };
  const arka = h('div', { class: 'pencere-arka', onclick: (e) => { if (e.target === arka) kapat(); } },
    h('div', { class: 'pencere', role: 'dialog', 'aria-modal': 'true' },
      h('div', { class: 'pencere-baslik' }, h('h2', null, baslik), h('button', { class: 'ikon-dugme', type: 'button', onclick: kapat, 'aria-label': t('Kapat') }, '✕')),
      icerik));
  document.body.append(arka);
  ACIK.push(arka);
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
export async function kilitli(dugme, yap) {
  if (dugme.disabled) return;
  const eski = dugme.textContent;
  dugme.disabled = true; dugme.textContent = t('Bekleyin…');
  try { return await yap(); } finally { dugme.disabled = false; dugme.textContent = eski; }
}

export function rastgeleSifre() {
  const a = new Uint32Array(1); crypto.getRandomValues(a);
  return String(100000 + (a[0] % 900000));
}

export function para(n) { return (Number(n) || 0).toLocaleString('tr-TR', { maximumFractionDigits: 2 }) + ' ₺'; }
// "12,5" ve "12.5" ikisini de sayıya çevirir; geçersizse NaN
export function sayi(v) { const s = String(v == null ? '' : v).trim().replace(',', '.'); return s === '' ? NaN : Number(s); }

// Bir kutunun içini temizleyip yeni çocuklarla doldurur (dizi, null ve metin kabul eder)
export function doldur(el, ...kids) { const g = h('div', null, ...kids); el.replaceChildren(...g.childNodes); }

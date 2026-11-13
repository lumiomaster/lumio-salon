// Worker ile konuşma + web bildirimi (push) aboneliği
import { SUNUCU } from './config.js';
import { auth } from './fb.js';
import { S } from './durum.js';
import { t } from './i18n.js';

export const sunucuHazir = () => !!(SUNUCU.url && SUNUCU.vapid);

export async function sunucuyaSor(yol, govde, sureMs) {
  if (!sunucuHazir()) throw new Error('Sunucu kurulmamış');
  const idToken = await auth.currentUser.getIdToken();
  // Cevap hiç gelmezse (zayıf bağlantı, yoğun yapay zekâ servisi) ekran sonsuza kadar "Düşünüyorum…" demesin
  let r;
  try {
    r = await fetch(SUNUCU.url.replace(/\/$/, '') + yol, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken, ...govde }), ...(sureMs && globalThis.AbortSignal && AbortSignal.timeout ? { signal: AbortSignal.timeout(sureMs) } : {}) });
  } catch (e) {
    const z = new Error(e && (e.name === 'TimeoutError' || e.name === 'AbortError') ? t('Cevap gecikti. Biraz sonra tekrar deneyin.') : t('Sunucuya ulaşılamadı')); z.kod = 0; throw z;
  }
  let j = null; try { j = await r.json(); } catch (e) { /* yanıt yok */ }
  if (!r.ok) { const e = new Error((j && j.hata) || 'Sunucuya ulaşılamadı'); e.kod = r.status; throw e; }
  return j;
}

// ---- Bildirim aboneliği ----
const destekVar = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
const iosMu = () => /iPhone|iPad|iPod/i.test(navigator.userAgent);
const kurulu = () => (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
// Servis çalışanı hazır değilse sonsuza kadar beklemesin
const swHazir = () => Promise.race([navigator.serviceWorker.ready, new Promise((_, red) => setTimeout(() => red(new Error('sw yok')), 2500))]);
// Tarayıcı bazı durumlarda (push servisi kapalı, desteklemeyen tarayıcı) hiç cevap vermez; sonsuza kadar beklemesin
const sureli = (p, sn, mesaj) => Promise.race([p, new Promise((_, red) => setTimeout(() => red(new Error(mesaj)), sn * 1000))]);
const anahtarBayt = (b64u) => { const s = (b64u + '='.repeat((4 - b64u.length % 4) % 4)).replace(/-/g, '+').replace(/_/g, '/'); const r = atob(s); return Uint8Array.from(r, c => c.charCodeAt(0)); };

// 'kapali' | 'acik' | 'izinsiz' (tarayıcıda engelli) | 'desteklenmiyor' | 'ekle' (iPhone: önce ana ekrana ekle) | 'sunucu-yok'
export async function bildirimDurumu() {
  if (!sunucuHazir()) return 'sunucu-yok';
  if (iosMu() && !kurulu()) return 'ekle';
  if (!destekVar()) return 'desteklenmiyor';
  if (Notification.permission === 'denied') return 'izinsiz';
  if (Notification.permission !== 'granted') return 'kapali';
  try { const reg = await swHazir(); return (await reg.pushManager.getSubscription()) ? 'acik' : 'kapali'; } catch (e) { return 'kapali'; }
}
export async function bildirimAc(adim) {
  const yaz = (m) => { if (adim) adim(m); };
  // İzin zaten verilmişse pencere açmaya çalışma (bazı telefonlarda istek sonsuza dek takılıyor)
  let durum = Notification.permission;
  yaz('1/4 · Bildirim izni kontrol ediliyor… (' + durum + ')');
  if (durum === 'denied') throw new Error('Bildirim izni kapalı. Telefon ayarları > Uygulamalar > Chrome (veya bu uygulama) > Bildirimler / Site ayarları bölümünden bu siteye izin verin, sonra tekrar deneyin.');
  if (durum !== 'granted') {
    yaz('1/4 · İzin penceresi bekleniyor… "İzin ver" deyin');
    try { durum = await sureli(new Promise((ok) => { const r = Notification.requestPermission(ok); if (r && r.then) r.then(ok); }), 20, 'x'); } catch (e) { durum = Notification.permission; }
    if (durum !== 'granted') throw new Error('İzin penceresi çıkmadı ya da cevaplanmadı (durum: ' + Notification.permission + '). Siteyi Chrome\'da açın, adres çubuğundaki kilit/ayar simgesinden Bildirimler\'e "İzin ver" deyin, uygulamayı kapatıp açın ve tekrar deneyin.');
  }
  yaz('2/4 · Uygulama arka plan servisi hazırlanıyor…');
  const reg = await sureli(navigator.serviceWorker.ready, 10, 'Uygulama arka plan servisi hazır değil. Sayfayı yenileyip (Ctrl+Shift+R) tekrar deneyin.');
  yaz('3/4 · Tarayıcı bildirim servisine bağlanılıyor…');
  let abone = await reg.pushManager.getSubscription();
  if (!abone) abone = await sureli(reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: anahtarBayt(SUNUCU.vapid) }), 20, 'Bu tarayıcı bildirim servisine bağlanamadı. Chrome (Android/bilgisayar) ya da ana ekrana eklenmiş uygulama ile deneyin; Opera/Brave gibi tarayıcılarda bildirim çalışmayabilir.');
  yaz('4/4 · Sunucuya kaydediliyor…');
  await sureli(sunucuyaSor('/abone', { abonelik: abone.toJSON() }), 20, 'Sunucuya ulaşılamadı. Biraz sonra tekrar deneyin.');
}
export async function bildirimKapat() {
  const reg = await swHazir();
  const abone = await reg.pushManager.getSubscription();
  if (!abone) return;
  try { await sunucuyaSor('/abone-sil', { abonelik: { endpoint: abone.endpoint } }); } catch (e) { /* sunucuya ulaşılamadı; yine de cihazdan kaldır */ }
  await abone.unsubscribe();
}
// Girişte: izin zaten varsa kaydı (rol/salon değişmiş olabilir) sessizce tazele
export async function bildirimTazele() {
  try { if ((await bildirimDurumu()) === 'acik') { const reg = await swHazir(); const a = await reg.pushManager.getSubscription(); if (a) await sunucuyaSor('/abone', { abonelik: a.toJSON() }); } } catch (e) { /* sessiz */ }
}

// ---- Bildirim gönder (hata olursa uygulamayı bozmaz) ----
export function bildirimYolla(hedef, baslik, govde, ek = {}) {
  if (!sunucuHazir() || !S.salon) return;
  sunucuyaSor('/bildir', { hedef, baslik, govde, ...ek }).catch(() => {});
}

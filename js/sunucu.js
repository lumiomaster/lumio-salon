// Worker ile konuşma + web bildirimi (push) aboneliği
import { SUNUCU } from './config.js';
import { auth } from './fb.js';
import { S } from './durum.js';

export const sunucuHazir = () => !!(SUNUCU.url && SUNUCU.vapid);

export async function sunucuyaSor(yol, govde) {
  if (!sunucuHazir()) throw new Error('Sunucu kurulmamış');
  const idToken = await auth.currentUser.getIdToken();
  const r = await fetch(SUNUCU.url.replace(/\/$/, '') + yol, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken, ...govde }) });
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
export async function bildirimAc() {
  const izin = await Notification.requestPermission();
  if (izin !== 'granted') throw new Error('İzin verilmedi');
  const reg = await swHazir();
  let abone = await reg.pushManager.getSubscription();
  if (!abone) abone = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: anahtarBayt(SUNUCU.vapid) });
  await sunucuyaSor('/abone', { abonelik: abone.toJSON() });
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

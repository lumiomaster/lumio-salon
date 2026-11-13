// Destek erişimi: salonun yetkilisi, platform yöneticisine SÜRELİ ve SALT OKUNUR bakma izni verir.
// - Gizli erişim yoktur: izin salon belgesinde (destek.bitisMs) durur, salon görür, istediği an kapatır, işlem kaydına yazılır.
// - Süre bitince izin kendiliğinden kalkar. Yazma izni hiçbir zaman verilmez (firestore.rules).
import { t, yerel } from './i18n.js';
import { h, doldur, bildir, kilitli, onayIste } from './util.js';
import { S } from './durum.js';
import { auth, db, doc, collection, writeBatch, serverTimestamp } from './fb.js';
import { goster } from './main.js';
import { veriSifirla } from './veri.js';
import { salonAyarla } from './ulke.js';
import { lisansDurumu } from './util.js';

const SAAT = 3600 * 1000;
export const SURELER = [[1, '1 saat'], [24, '24 saat'], [72, '3 gün'], [168, '7 gün']];

export const destekBitis = (salon) => (salon && salon.destek && Number(salon.destek.bitisMs) > Date.now() ? Number(salon.destek.bitisMs) : 0);
const saatYaz = (ms) => { const d = new Date(ms); return d.toLocaleString(yerel(), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); };

function kayit(b, islem, ayrinti) {
  if (!lisansDurumu(S.salon).aktif) return;   // lisansı biten salonda işlem kaydı yazılamaz; izin yine de verilebilir
  b.set(doc(collection(db, 'salons', S.salon.id, 'kayitlar')), { uid: auth.currentUser.uid, islem, hedef: '', ayrinti, zaman: serverTimestamp() });
}

// Ayarlar > Destek erişimi (yetkililer)
export function destekKarti() {
  const kutu = h('div', { class: 'kart' });
  const ciz = () => {
    const bit = destekBitis(S.salon);
    const sure = h('select', { 'aria-label': t('Süre') }, SURELER.map(([s, ad]) => h('option', { value: s, selected: s === 24 }, t(ad))));
    doldur(kutu, h('h2', null, t('Destek erişimi')),
      h('p', { class: 'kucuk' }, t('Bir sorun yaşarsanız LUMIO destek ekibinin salonunuza SALT OKUNUR bakmasına belirli bir süre izin verebilirsiniz. Değişiklik yapamaz; süre bitince izin kendiliğinden kalkar, istediğiniz an kapatabilirsiniz. Her açma ve görüntüleme işlem kaydına yazılır.')),
      bit
        ? h('div', null, h('div', { class: 'kart bilgi' }, h('strong', null, '🛟 ' + t('Destek erişimi açık')), h('p', { class: 'kucuk' }, t('Bitiş: {t}', { t: saatYaz(bit) }) + (S.salon.destek.verenAd ? ' · ' + t('Açan: {ad}', { ad: S.salon.destek.verenAd }) : ''))),
          h('div', { class: 'dugme-satir sol' }, h('button', { class: 'dugme ikincil', type: 'button', onclick: kapat }, t('Şimdi kapat'))))
        : h('div', null, h('label', null, t('Ne kadar süre?'), sure), h('div', { class: 'dugme-satir sol' }, h('button', { class: 'dugme', type: 'button', onclick: () => ac(Number(sure.value)) }, t('Destek erişimi ver')))));
  };
  const yaz = async (alan, mesaj, log) => {
    const b = writeBatch(db); b.update(doc(db, 'salons', S.salon.id), { destek: alan }); kayit(b, log.islem, log.ayrinti); await b.commit();
    S.salon = { ...S.salon, destek: alan }; bildir(mesaj); ciz(); goster();
  };
  const ac = async (saat) => {
    if (!(await onayIste(t('LUMIO destek ekibi salonunuzdaki verileri {sure} boyunca SALT OKUNUR görebilecek. Değişiklik yapamaz. İstediğiniz an kapatabilirsiniz. Devam edilsin mi?', { sure: t((SURELER.find(x => x[0] === saat) || [0, saat + ' saat'])[1]) }), t('Evet, izin ver')))) return;
    try { await yaz({ bitisMs: Date.now() + saat * SAAT, baslangicMs: Date.now(), veren: auth.currentUser.uid, verenAd: String(S.profil.ad || '').slice(0, 60) }, t('Destek erişimi açıldı'), { islem: 'destek_ac', ayrinti: saat + ' saat salt okunur destek erişimi verildi' }); }
    catch (e) { console.error(e); bildir(t('Destek erişimi açılamadı. İnternetinizi kontrol edin.'), 'hata'); }
  };
  const kapat = async () => {
    try { await yaz({ bitisMs: 0, baslangicMs: Date.now(), veren: auth.currentUser.uid, verenAd: String(S.profil.ad || '').slice(0, 60) }, t('Destek erişimi kapatıldı'), { islem: 'destek_kapat', ayrinti: 'destek erişimi kapatıldı' }); }
    catch (e) { console.error(e); bildir(t('Kapatılamadı. İnternetinizi kontrol edin.'), 'hata'); }
  };
  ciz();
  return kutu;
}

// Salon kullanıcılarına (destek açıkken) üstte görünen şerit; destek görünümündeki yöneticiye "salt okunur" uyarısı
export function destekSeridi() {
  if (S.destek) {
    return h('div', { class: 'destek-serit destek-gorunum', role: 'status' },
      h('span', null, '🛟 ' + t('DESTEK GÖRÜNÜMÜ · salt okunur · {salon}', { salon: S.salon ? S.salon.ad : '' }) + ' · ' + t('bitiş {t}', { t: saatYaz(S.destek.bitisMs) })),
      h('button', { class: 'dugme ikincil kucuk-dugme', type: 'button', onclick: destekCik }, t('Çık')));
  }
  const bit = S.profil && S.salon && !S.yonetici ? destekBitis(S.salon) : 0;
  if (!bit) return null;
  return h('div', { class: 'destek-serit', role: 'status' }, '🛟 ' + t('Destek erişimi açık · bitiş {t}', { t: saatYaz(bit) }));
}

// Platform yöneticisi: salonun açık izniyle salt okunur görünüm
export async function destekGoruntule(s) {
  const bit = destekBitis(s);
  if (!bit) { bildir(t('Bu salon destek erişimi vermemiş ya da süresi bitmiş.'), 'hata'); return; }
  try {
    const b = writeBatch(db);
    b.set(doc(collection(db, 'salons', s.id, 'kayitlar')), { uid: auth.currentUser.uid, islem: 'destek_goruntule', hedef: '', ayrinti: 'Destek görünümü açıldı: ' + String((S.yonetici && S.yonetici.ad) || ''), zaman: serverTimestamp() });
    await b.commit();
  } catch (e) { console.error(e); bildir(t('Destek görünümü açılamadı (izin bitmiş olabilir).'), 'hata'); return; }
  veriSifirla();
  S.destek = { salonId: s.id, bitisMs: bit };
  S.salon = s; salonAyarla(s);
  S.profil = { id: auth.currentUser.uid, salonId: s.id, ad: (S.yonetici && S.yonetici.ad) || 'Destek', telefon: (S.yonetici && S.yonetici.telefon) || '', rol: 'yonetici', aktif: true };
  S.sekme = 'ana';
  goster();
}

export function destekCik() {
  S.destek = null; S.profil = null; S.salon = null; S.sekme = 'yonetici';
  veriSifirla(); salonAyarla(null);
  goster();
}

// Süre dolunca destek görünümü kendiliğinden kapanır
export function destekBekci() {
  setInterval(() => { if (S.destek && Date.now() > S.destek.bitisMs) { bildir(t('Destek erişiminin süresi doldu.'), 'hata'); destekCik(); } }, 20000);
}

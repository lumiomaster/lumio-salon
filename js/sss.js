// SSS: arama, rol süzmesi ve yerel eşleştirme (Danışman önce buradan cevap arar).
import { dilKodu } from './i18n.js';
import { KATEGORILER, SSS_YAPI, SSS_ROL } from './sss-yapi.js';
import { auth, db, doc, collection, writeBatch, serverTimestamp } from './fb.js';

export { KATEGORILER };
const ONBELLEK = {};
export async function sssYukle(dil = dilKodu()) {
  if (ONBELLEK[dil]) return ONBELLEK[dil];
  let d;
  try { d = (await import('./sss-' + dil + '.js')).default; } catch (_) { d = null; }
  if (dil !== 'tr') {   // eksik maddeler Türkçeden tamamlanır
    const tr = (await import('./sss-tr.js')).default;
    d = d ? { ui: { ...tr.ui, ...d.ui }, kat: { ...tr.kat, ...d.kat }, m: { ...tr.m, ...d.m } } : tr;
  } else d = (await import('./sss-tr.js')).default;
  return (ONBELLEK[dil] = d);
}

const SESSIZ = new Set(['nasıl', 'nedir', 'neden', 'için', 'olur', 'yapılır', 'yapılıyor', 'yapmalıyım', 'ben', 'bir', 'bunu', 'şunu', 'ile', 'mı', 'mi', 'mu', 'mü', 'ne', 'var', 'yok', 'the', 'how', 'what', 'does', 'can', 'and', 'for', 'wie', 'was', 'ist', 'und', 'der', 'die', 'das', 'как', 'что', 'это', 'для', 'мне', 'или', 'как', 'қалай', 'деген', 'үшін', 'болады']);
export const duzle = (s) => String(s || '').toLocaleLowerCase('tr').replace(/ı/g, 'i').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss').replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
const kok = (w) => (w.length > 5 ? w.slice(0, 5) : w);
// Salon işletmeciliği tavsiyesi isteyen sorular SSS'ye değil Danışman'a gider
const TAVSIYE = /geri kazan|ne yapay|öner[ie]|tavsiye|strateji|artır|arttır|nasıl söyle|nasıl doldur|kaç olmalı|nasıl gidiyoruz|win back|should i|advice|strateg|raise price|вернуть клиент|стоит ли|совет|стратег|zurückgewinn|soll ich|empfehl|кеңес/i;
const SESSIZ_D = new Set([...SESSIZ].map(duzle));

export function rolMaddeleri(rol) {
  return SSS_YAPI.filter(x => !rol || SSS_ROL[x.r].includes(rol));
}

// Sorguya göre puanlı sonuç listesi: [{id, k, puan, kapsam}]
export function sssAra(sorgu, d, rol) {
  const kelimeler = duzle(sorgu).split(' ').filter(w => w.length >= 3 && !SESSIZ_D.has(w)).map(kok);
  if (!kelimeler.length) return [];
  const sonuc = [];
  for (const x of rolMaddeleri(rol)) {
    const m = d.m[x.id]; if (!m) continue;
    const s = duzle(m[0]), a = duzle(m[2]), c = duzle(m[1]);
    let puan = 0, eslesen = 0;
    for (const w of kelimeler) {
      let p = 0;
      if (s.includes(w)) p = 4; else if (a.includes(w)) p = 3; else if (c.includes(w)) p = 1;
      if (p) { eslesen++; puan += p; }
    }
    if (eslesen) sonuc.push({ id: x.id, k: x.k, puan, kapsam: eslesen / kelimeler.length });
  }
  return sonuc.sort((p, q) => q.puan - p.puan);
}

// Danışman için: yeterince güçlü bir eşleşme var mı?
export function sssEslestir(sorgu, d, rol) {
  if (TAVSIYE.test(String(sorgu))) return null;
  const r = sssAra(sorgu, d, rol);
  if (!r.length) return null;
  const e = r[0];
  return e.puan >= 6 && e.kapsam >= 0.6 ? e : null;
}

// Cevapsız soruyu kimliksiz kaydet (yalnız metin ve dil).
export async function eksikKaydet(metin) {
  try {
    if (!auth.currentUser) return;
    const b = writeBatch(db);
    b.set(doc(collection(db, 'sssEksik')), { metin: String(metin).trim().slice(0, 200), dil: dilKodu(), zaman: serverTimestamp() });
    await b.commit();
  } catch (_) { /* sessiz */ }
}

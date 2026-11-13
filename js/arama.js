// Ortak akıllı arama: müşteri ve ürün seçimi için.
// - Büyük/küçük harf, İ/ı, ş/s, ğ/g, ç/c, ö/o, ü/u farkını önemsemez
// - Ad, soyad, telefon ve notun herhangi bir yerinde arar; kelime sırası önemli değil
// - Küçük yazım hatalarına dayanıklıdır ("kondisyoner" → "Kondisyoner", "inçi" → "İnci")
// - "6 0", "6.0" ve "60" aynı şeyi bulur
import { h, doldur } from './util.js';
import { t } from './i18n.js';

const HARITA = { 'ı': 'i', 'ş': 's', 'ğ': 'g', 'ç': 'c', 'ö': 'o', 'ü': 'u', 'ə': 'a', 'ә': 'a', 'ғ': 'г', 'қ': 'к', 'ң': 'н', 'ө': 'о', 'ұ': 'у', 'ү': 'у', 'һ': 'х', 'і': 'и', 'ё': 'е', 'й': 'и' };

export function norm(x) {
  let s = String(x == null ? '' : x).replace(/İ/g, 'i').replace(/I/g, 'ı').toLowerCase();
  s = s.replace(/[ışğçöüəәғқңөұүһіёй]/g, (c) => HARITA[c] || c);
  try { s = s.normalize('NFD').replace(/[̀-ͯ]/g, ''); } catch (_) { /* eski tarayıcı */ }
  return s.replace(/[^\p{L}\p{N}%]+/gu, ' ').trim().replace(/\s+/g, ' ');
}

// Telefon için aranabilir biçimler: 905354049392 → 905354049392, 5354049392, 05354049392
function telBicimleri(tel) {
  const d = String(tel || '').replace(/\D/g, '');
  if (!d) return [];
  const son10 = d.slice(-10);
  return [d, son10, '0' + son10];
}

// İki kelime arasındaki düzenleme uzaklığı (en çok 'sinir' kadar; aşılırsa sinir+1)
function uzaklik(a, b, sinir) {
  if (Math.abs(a.length - b.length) > sinir) return sinir + 1;
  const n = a.length, m = b.length;
  let onceki = Array.from({ length: m + 1 }, (_, j) => j);
  for (let i = 1; i <= n; i++) {
    const simdi = [i];
    let enAz = i;
    for (let j = 1; j <= m; j++) {
      const mal = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(onceki[j] + 1, simdi[j - 1] + 1, onceki[j - 1] + mal);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, (onceki[j - 2] ?? 99) + 1);
      simdi.push(v); if (v < enAz) enAz = v;
    }
    if (enAz > sinir) return sinir + 1;
    onceki = simdi;
  }
  return onceki[m];
}

// Bir kayıt için puan: 0 = eşleşmedi. alanlar: ['İnci sert', '0535…', 'Saçında dorelik …'] (ilk alan en önemlisi)
export function puanla(sorgu, alanlar, telAlani) {
  const q = norm(sorgu);
  if (!q) return 1;
  const jetonlar = q.split(' ');
  const kayitlar = (alanlar || []).map(norm);
  const kelimeler = kayitlar.map(a => a.split(' ').filter(Boolean));
  const telB = telBicimleri(telAlani);
  const hepsi = kayitlar.join(' ');
  const yapisik = hepsi.replace(/ /g, '');
  let toplam = 0;
  for (const j of jetonlar) {
    let en = 0;
    // telefon
    if (/^\d{2,}$/.test(j)) { for (const tb of telB) { if (tb.startsWith(j)) en = Math.max(en, 3); else if (tb.includes(j)) en = Math.max(en, 2.2); } }
    kelimeler.forEach((kl, ai) => {
      const agirlik = ai === 0 ? 1 : 0.7;
      for (const k of kl) {
        let p = 0;
        if (k === j) p = 4; else if (k.startsWith(j)) p = 3; else if (k.includes(j)) p = j.length >= 2 ? 2 : 1.6;
        else if (j.length >= 4) {
          const sinir = j.length >= 7 ? 2 : 1;
          const d = Math.min(uzaklik(j, k, sinir), uzaklik(j, k.slice(0, j.length), sinir));
          if (d <= sinir) p = 1.2;
        }
        if (p) en = Math.max(en, p * agirlik);
      }
    });
    if (!en && j.length >= 2 && yapisik.includes(j)) en = 1.5;   // "60" ↔ "6 0"
    if (!en) return 0;
    toplam += en;
  }
  return toplam;
}

// Listeyi puana göre sıralar. oge → { alanlar:[…], tel?:'' }
export function ara(ogeler, sorgu, alanlarOf, sinir) {
  const q = norm(sorgu);
  const sonuc = [];
  for (const o of ogeler) {
    const a = alanlarOf(o);
    const p = puanla(q, a.alanlar, a.tel);
    if (p > 0) sonuc.push({ o, p });
  }
  if (q) sonuc.sort((x, y) => y.p - x.p || String(alanlarOf(x.o).alanlar[0]).localeCompare(String(alanlarOf(y.o).alanlar[0])));
  return (sinir ? sonuc.slice(0, sinir) : sonuc).map(x => x.o);
}

// ---- Giriş kutusunun altında açılan öneri listesi (müşteri seçimi) ----
// secenek: { liste:()=>[…], alanlar:(o)=>{alanlar,tel}, kart:(o)=>Node, bos:()=>[…] (kutu boşken), sec:(o)=>void, yeni:(metin)=>Node|null, sinir:4 }
export function oneriBagla(girdi, secenek) {
  const kutu = h('div', { class: 'oneri-kutu', hidden: true });
  let acik = false;
  const kapat = () => { acik = false; kutu.hidden = true; };
  const ciz = () => {
    const q = girdi.value;
    let l;
    if (!norm(q)) l = (secenek.bos ? secenek.bos() : secenek.liste()).slice(0, secenek.sinir || 4);
    else l = ara(secenek.liste(), q, secenek.alanlar, secenek.sinir || 4);
    const yeni = norm(q).length >= 2 && secenek.yeni ? secenek.yeni(q.trim(), l) : null;
    if (!l.length && !yeni) { kapat(); return; }
    doldur(kutu,
      l.map(o => h('button', { type: 'button', class: 'oneri-kart', onpointerdown: (e) => { e.preventDefault(); kapat(); secenek.sec(o); } }, secenek.kart(o))),
      yeni);
    if (!kutu.isConnected && girdi.parentNode) girdi.parentNode.insertBefore(kutu, girdi.nextSibling);
    kutu.hidden = false; acik = true;
  };
  girdi.addEventListener('input', ciz);
  girdi.addEventListener('focus', () => { ciz(); try { girdi.scrollIntoView({ block: 'start', behavior: 'smooth' }); } catch (_) { /* eski tarayıcı */ } });
  girdi.addEventListener('blur', () => setTimeout(kapat, 120));
  girdi.addEventListener('keydown', (e) => { if (e.key === 'Escape' && acik) { e.stopPropagation(); kapat(); } });
  return { kapat, yenile: ciz };
}

// ---- Tam ekran arama penceresi yardımcıları (ürün seçimi için) ----
export function aramaKutusu(onDegis, yerTutucu) {
  const k = h('input', { type: 'search', class: 'arama-girdi', placeholder: yerTutucu || t('Ara…'), autocomplete: 'off', autocapitalize: 'none', enterkeyhint: 'search', 'aria-label': t('Ara') });
  k.addEventListener('input', () => onDegis(k.value));
  return k;
}

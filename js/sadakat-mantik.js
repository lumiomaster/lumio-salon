// Sadakat: ödül hakkı ve indirim hesabı (ekrandan bağımsız, test edilebilir).
// Ölçü: ziyaret sayısı, toplam harcama ya da ikisi (hangisi önce dolarsa). Sayaç, müşterinin son sadakat ödülünü kullandığı ödemeden sonra yeniden başlar.
// İndirim yalnız HİZMET kalemlerinden düşer (ürün satışı hariç), kalemlere orantılı dağıtılır.
//   karsilar = 'birlikte': usta yüzdesi indirimli tutar üzerinden hesaplanır (salon da usta da payına düşeni taşır)
//   karsilar = 'salon'   : usta yüzdesi liste tutarı üzerinden hesaplanır (kalemde "hesap"), indirimi salon taşır
import { yuvarla } from './kasa-mantik.js';

export const SADAKAT_HAZIR = { acik: false, olcu: 'ziyaret', ziyaret: 10, harcama: 5000, odul: 'yuzde', deger: 10, karsilar: 'birlikte' };
export const OLCULER = ['ziyaret', 'harcama', 'ikisi'];
export const ODULLER = ['yuzde', 'tutar'];
export const KARSILAR = ['birlikte', 'salon'];

export function sadakatNormalle(v) {
  const x = { ...SADAKAT_HAZIR, ...(v && typeof v === 'object' ? v : {}) };
  if (!OLCULER.includes(x.olcu)) x.olcu = SADAKAT_HAZIR.olcu;
  if (!ODULLER.includes(x.odul)) x.odul = SADAKAT_HAZIR.odul;
  if (!KARSILAR.includes(x.karsilar)) x.karsilar = SADAKAT_HAZIR.karsilar;
  x.ziyaret = Number.isInteger(x.ziyaret) && x.ziyaret >= 1 && x.ziyaret <= 100 ? x.ziyaret : SADAKAT_HAZIR.ziyaret;
  x.harcama = typeof x.harcama === 'number' && x.harcama > 0 ? x.harcama : SADAKAT_HAZIR.harcama;
  x.deger = typeof x.deger === 'number' && x.deger > 0 ? x.deger : SADAKAT_HAZIR.deger;
  if (x.odul === 'yuzde' && x.deger > 100) x.deger = 100;
  x.acik = x.acik === true;
  return x;
}

const ms = (o) => { const z = o && o.zaman; if (z && typeof z.toMillis === 'function') return z.toMillis(); if (typeof z === 'number') return z; const p = Date.parse(o && o.tarih); return Number.isFinite(p) ? p : 0; };

// odemeler: müşterinin tüm ödemeleri. Dönüş: sayaçlar ve ödül hakkı.
export function ilerleme(ayar, odemeler) {
  const a = sadakatNormalle(ayar);
  const gec = (odemeler || []).filter(o => o.durum === 'gecerli').sort((p, q) => ms(p) - ms(q));
  let son = -1; gec.forEach((o, i) => { if (o.sadakat) son = i; });
  const sonra = gec.slice(son + 1);
  const ziyaret = sonra.length, harcama = yuvarla(sonra.reduce((t, o) => t + (o.toplam || 0), 0));
  const zOk = ziyaret >= a.ziyaret, hOk = harcama >= a.harcama;
  const hak = a.acik && (a.olcu === 'ziyaret' ? zOk : a.olcu === 'harcama' ? hOk : (zOk || hOk));
  const oran = a.olcu === 'ziyaret' ? ziyaret / a.ziyaret : a.olcu === 'harcama' ? harcama / a.harcama : Math.max(ziyaret / a.ziyaret, harcama / a.harcama);
  return { ziyaret, harcama, hak, oran: Math.min(1, oran), kullanilan: gec.filter(o => o.sadakat).length, ayar: a };
}

export function odulYazi(ayar, para) {
  const a = sadakatNormalle(ayar);
  return a.odul === 'yuzde' ? '%' + String(a.deger).replace('.', ',') : para(a.deger);
}

// kalemler: [{tur, tutar, ...}]. Dönüş: { indirim, kalemler } (yeni dizi; hizmet kalemlerinde tutar düşer, "liste" ve salon modunda "hesap" yazılır)
export function indirimUygula(ayar, kalemler) {
  const a = sadakatNormalle(ayar);
  const hizmet = kalemler.map((k, i) => [k, i]).filter(([k]) => k.tur === 'hizmet' && k.tutar > 0);
  const top = yuvarla(hizmet.reduce((t, [k]) => t + k.tutar, 0));
  if (!top) return { indirim: 0, kalemler };
  const indirim = Math.min(top, yuvarla(a.odul === 'yuzde' ? top * a.deger / 100 : a.deger));
  const yeni = kalemler.map(k => ({ ...k }));
  let kalan = indirim;
  hizmet.forEach(([k, i], n) => {
    const pay = n === hizmet.length - 1 ? kalan : Math.min(kalan, yuvarla(indirim * k.tutar / top));
    kalan = yuvarla(kalan - pay);
    yeni[i].liste = k.tutar;
    if (a.karsilar === 'salon') yeni[i].hesap = k.tutar;
    yeni[i].tutar = yuvarla(k.tutar - pay);
  });
  return { indirim, kalemler: yeni };
}

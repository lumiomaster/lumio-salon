// Stok hesapları (saf fonksiyonlar). Gram ürünlerde miktar gram, adet ürünlerde adet olarak tutulur;
// fiyatlar tüp/paket (gram ürün) ya da adet (adet ürün) başınadır.
const yv = (n) => Math.round((Number(n) || 0) * 100) / 100;
export const paketBoyu = (u) => (u.birim === 'gram' ? (u.paketGram || 1) : 1);
export const birimAdi = (u) => (u.birim === 'gram' ? 'tüp' : 'adet');

// 3 tüp 40 gr / 12 adet
export function stokYazi(u, miktar) {
  const m = Number(miktar) || 0, eksi = m < 0 ? '−' : '', a = Math.abs(m);
  if (u.birim !== 'gram') return eksi + yv(a) + ' adet';
  const tup = Math.floor(a / u.paketGram), gr = Math.round(a - tup * u.paketGram);
  const p = [];
  if (tup > 0) p.push(tup + ' tüp');
  if (gr > 0) p.push(gr + ' gr');
  return eksi + (p.length ? p.join(' ') : '0');
}
// Tüp ve gram girişinden temel birime (gram ya da adet)
export const miktarOlustur = (u, tup, gr) => (u.birim === 'gram' ? yv((Number(tup) || 0) * u.paketGram + (Number(gr) || 0)) : yv(Number(tup) || 0));
// Temel birimden {tup, gr}
export function miktarAyir(u, m) {
  if (u.birim !== 'gram') return { tup: yv(m), gr: 0 };
  const a = Math.abs(m), t = Math.floor(a / u.paketGram);
  return { tup: (m < 0 ? -t : t), gr: Math.round(a - t * u.paketGram) };
}
// Azalıyor mu? (en az stok girilmişse, stok ona eşit ya da altındaysa)
export const azMi = (u) => u.aktif !== false && Number(u.enAz) > 0 && Number(u.stok) <= Number(u.enAz);
// Önerilen sipariş (tüp/adet): stok en az stokun 2 katına çıksın
export function siparisOner(u) {
  const hedef = Math.max(Number(u.enAz) * 2, paketBoyu(u));
  return Math.max(1, Math.ceil((hedef - Number(u.stok)) / paketBoyu(u)));
}
// Gram başına / adet başına maliyet
export const birimMaliyet = (u) => (u.alis == null ? null : yv(u.alis / paketBoyu(u)));
export const birimSatis = (u) => (u.satis == null ? null : yv(u.satis / paketBoyu(u)));

// Abonelik fiyat hesabı (saf fonksiyonlar). Fiyatlar KDV hariçtir; KDV üstüne eklenir.
import { FIYAT, FIYAT_USD } from './config.js';

export function kademeBul(personel, f = FIYAT) {
  const n = Math.max(1, Math.floor(Number(personel) || 1));
  return f.kademeler.find(k => n <= k.max) || f.kademeler[f.kademeler.length - 1];
}

// ay: 1/3/6/12, satis: ek paket seçili mi
export function fiyatHesapla({ personel, ay, satis }, f = FIYAT) {
  const sure = f.sureler.find(x => x.ay === ay) || f.sureler[0];
  const k = kademeBul(personel, f);
  const ek = satis ? f.ekPaket.satis : 0;
  const brut = (k.aylik + ek) * sure.ay;
  const indirimTutar = Math.round(brut * sure.indirim / 100);
  const kdvHaric = brut - indirimTutar;
  const kdv = Math.round(kdvHaric * f.kdv / 100);
  return { kademe: k, aylik: k.aylik, ek, ay: sure.ay, gun: sure.gun, indirim: sure.indirim, brut, indirimTutar, kdvHaric, kdv, toplam: kdvHaric + kdv };
}

// Okunabilir, karıştırılmayan kısa referans (0/O/1/I yok)
export function referansUret(salonId, rastgele = Math.random) {
  const H = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let r = ''; for (let i = 0; i < 5; i++) r += H[Math.floor(rastgele() * H.length)];
  return 'LS-' + String(salonId || '').slice(0, 3).toUpperCase() + '-' + r;
}

// Dolar fiyatlarından yerel para tablosu: kur = 1 dolarin yerel karşılığı. Fiyatlar KDV hariçtir; KDV Türkiye'ye göre (FIYAT.kdv) üstüne eklenir.
export function fiyatTablosu(para, kur, usd = FIYAT_USD, taban = FIYAT) {
  if (!(kur > 0)) return null;
  const kat = (usd.yuvarla && usd.yuvarla[para]) || 1;
  const yer = (d) => Math.max(kat, Math.round(d * kur / kat) * kat);
  return { para, kdv: taban.kdv, kur, kademeler: usd.kademeler.map(k => ({ ...k, aylik: yer(k.aylik) })), ekPaket: { satis: yer(usd.ekPaket.satis) }, sureler: taban.sureler };
}

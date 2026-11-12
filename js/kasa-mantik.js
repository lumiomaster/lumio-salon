// Kasa hesapları: ekrandan bağımsız, saf fonksiyonlar (test edilebilir).
// Kural (LUMIO'daki gibi): kartla alınan ödemede komisyon ÖNCE düşülür, kalan tutar ustanın yüzdesine göre bölünür.
// Usta ve salon komisyonu birlikte taşır. Nakit ödemede komisyon yoktur.

export const yuvarla = (x) => Math.round((Number(x) || 0) * 100) / 100;

const gecerli = (o) => o.durum === 'gecerli';

// Satırın komisyon sonrası tutarı
export function satirNet(odeme, k) { return k.tutar * (1 - (odeme.komisyonOrani || 0) / 100); }
// Ustanın yüzdesinin esas aldığı tutar: sadakat indirimini salon karşılıyorsa (k.hesap) liste tutarı, değilse ödenen tutar
export function hesapNet(odeme, k) { return (k.hesap != null ? k.hesap : k.tutar) * (1 - (odeme.komisyonOrani || 0) / 100); }

// Ürün satışında kâr = satış - kart komisyonu - alış fiyatı (eksiye düşmez)
export function urunKari(odeme, k) { return Math.max(0, yuvarla(satirNet(odeme, k) - (k.alis || 0))); }

// Bir ödeme satırında (tek usta, tek kalem) ustanın payı.
//  Hizmet: komisyon düşülmüş tutarın ustanın yüzdesi.
//  Ürün  : (satış - komisyon - alış fiyatı) = kâr; ustanın ürün primi kâr üzerinden, kalanı kasaya.
export function satirPayi(odeme, k, mali) {
  if (k.tur === 'capraz') return yuvarla(k.prim || 0);   // çapraz satış primi mali ayardan bağımsızdır (ödeme anındaki oran kalemde saklıdır)
  if (!k.ustaUid || !mali) return 0;
  if (k.tur === 'urun') return yuvarla(urunKari(odeme, k) * (mali.urunPrimi || 0) / 100);
  return yuvarla(hesapNet(odeme, k) * hizmetYuzdesi(mali, k.grup) / 100);
}

// Çapraz satış: ek hizmeti başka ustaya sattıran ustaya, ek hizmet tutarının (komisyon sonrası) kalemde saklı yüzdesi kadar prim.
// Ustanın kendi yaptığı işte prim yoktur. Usta ekranlarında hazır liste ("caprazlar") yüklenir; yoksa kalemlerden türetilir.
// Her giriş: { ustaUid: primi alan, ad: hizmet, tutar: satılan hizmet tutarı, prim }
export function caprazListesi(o) {
  if (Array.isArray(o.caprazlar)) return o.caprazlar;
  return (o.kalemler || []).filter(k => k.tur !== 'urun' && k.satanUid && k.satanUid !== k.ustaUid && k.caprazYuzde > 0)
    .map(k => ({ ustaUid: k.satanUid, ad: k.ad, tutar: k.tutar, prim: yuvarla(satirNet(o, k) * k.caprazYuzde / 100) }));
}

// Ustanın hizmet yüzdesi: hizmetin oran grubuna özel yüzde varsa o, yoksa "Genel" yüzdesi.
// (grup boş ya da ustada o grup için yüzde yazılmamışsa Genel kullanılır; eski kayıtlarda grup yoktur = Genel)
export function hizmetYuzdesi(mali, grup) {
  const g = grup && mali && mali.oranlar ? mali.oranlar[grup] : undefined;
  const v = typeof g === 'number' && g >= 0 && g <= 100 ? g : (mali && mali.yuzde) || 0;
  return v;
}

// Ödeme listesinden usta usta özet. maliHarita: { uid: {yuzde, urunPrimi} }
export function ustaOzetleri(odemeler, maliHarita, taban) {
  const sonuc = {};
  const al = (uid) => (sonuc[uid] = sonuc[uid] || { hizmet: 0, urun: 0, komisyon: 0, hakedis: 0, capraz: 0 });
  for (const o of odemeler.filter(gecerli)) {
    for (const k of o.kalemler) {
      if (!k.ustaUid) continue;
      const s = al(k.ustaUid);
      if (k.tur === 'urun') s.urun += k.tutar; else s.hizmet += k.tutar;
      s.komisyon += k.tutar * (o.komisyonOrani || 0) / 100;
      s.hakedis += satirPayi(o, k, maliHarita[k.ustaUid], taban);
    }
    for (const c of caprazListesi(o)) { const s = al(c.ustaUid); s.capraz += c.prim; s.hakedis += c.prim; }
  }
  Object.values(sonuc).forEach(s => { s.capraz = yuvarla(s.capraz); s.hizmet = yuvarla(s.hizmet); s.urun = yuvarla(s.urun); s.komisyon = yuvarla(s.komisyon); s.hakedis = yuvarla(s.hakedis); });
  return sonuc;
}

// Günlük kasa: nakit, kart, komisyon, net
export function gunOzeti(odemeler) {
  const z = { nakit: 0, kart: 0, komisyon: 0, net: 0, adet: 0 };
  for (const o of odemeler.filter(gecerli)) {
    z.adet++;
    if (o.yontem === 'kart') z.kart += o.toplam; else z.nakit += o.toplam;
    z.komisyon += o.komisyon;
  }
  z.nakit = yuvarla(z.nakit); z.kart = yuvarla(z.kart); z.komisyon = yuvarla(z.komisyon);
  z.net = yuvarla(z.nakit + z.kart - z.komisyon);
  return z;
}

// Ustaya ödenecek: hakediş - avans + devir (devir eksiyse önceki dönemden kalan borç)
export const odenecek = (hakedis, avans, devir) => yuvarla(hakedis - avans + (devir || 0));

// Bir ustanın bir gündeki satırları: [{odeme, kalem, pay}]
export function ustaGunSatirlari(odemeler, uid, tarih, mali, taban) {
  const s = [];
  for (const o of odemeler.filter(x => gecerli(x) && x.tarih === tarih))
    {
      for (const k of o.kalemler) if (k.ustaUid === uid) s.push({ odeme: o, kalem: k, pay: satirPayi(o, k, mali, taban) });
      for (const c of caprazListesi(o)) if (c.ustaUid === uid) s.push({ odeme: o, kalem: { ustaUid: uid, ad: c.ad, tutar: 0, alis: 0, tur: 'capraz', prim: c.prim, satilan: c.tutar }, pay: c.prim });
    }
  return s;
}

// Bir kalemin dökümü: komisyon, komisyon sonrası, (ürünse) alış ve kâr, ustaya ve salona kalan
export function satirDokumu(odeme, k, mali) {
  const komisyon = yuvarla(k.tutar * (odeme.komisyonOrani || 0) / 100);
  const net = yuvarla(k.tutar - komisyon);
  const pay = satirPayi(odeme, k, mali);
  return {
    tutar: yuvarla(k.tutar), komisyon, net, alis: k.tur === 'urun' ? yuvarla(k.alis || 0) : 0,
    kar: k.tur === 'urun' ? urunKari(odeme, k) : null, pay, salon: yuvarla(net - pay)
  };
}

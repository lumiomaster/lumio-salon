// Abonelik: süre ve ek paket seçilir, tutar çıkar, ödeme bilgisi gösterilir, "Ödedim" ile talep yönetici onayına düşer.
// Kart ile anında ödeme için bir ödeme sağlayıcısı gerekir; sağlayıcı bağlanınca aynı ekrandaki "Ödedim" yerine ödeme başlatılır.
import { t } from '../i18n.js';
import { h, doldur, para, pencereAc, kilitli, hataMetni, bildir } from '../util.js';
import { S } from '../durum.js';
import { yetkiliMi } from '../roller.js';
import { FIYAT, ODEME_HESAPLARI, DESTEK_TEL } from '../config.js';
import { auth, db, doc, getDoc, collection, query, where, getDocs, writeBatch, serverTimestamp } from '../fb.js';
import { uyeleriYukle } from '../veri.js';
import { paraKodu, ulkeKodu } from '../ulke.js';
import { fiyatHesapla, fiyatTablosu, referansUret } from '../fiyat-mantik.js';
import { lisansDurumu } from '../util.js';

const DURUM_AD = { bekliyor: 'Onay bekliyor', onaylandi: 'Onaylandı', reddedildi: 'Reddedildi' };
const wa = (metin) => window.open('https://wa.me/' + DESTEK_TEL + '?text=' + encodeURIComponent(metin), '_blank', 'noopener');

export function abonelikKarti() {
  if (!S.profil || !yetkiliMi(S.profil.rol) || S.destek) return null;
  const l = lisansDurumu(S.salon);
  return h('div', { class: 'kart' }, h('strong', null, t('Abonelik')),
    h('p', { class: 'soluk' }, l.aktif ? t('{n} gün kaldı.', { n: l.kalan }) : t('Lisans süresi bitti')),
    h('button', { class: 'dugme ikincil kucuk-dugme', type: 'button', onclick: abonelikAc }, t('Süreyi uzat / öde')));
}

export async function abonelikAc() {
  const icerik = h('div', null, h('p', { class: 'soluk' }, t('Yükleniyor…')));
  const p = pencereAc(t('Abonelik'), icerik);
  try {
    let tablo = paraKodu() === FIYAT.para ? FIYAT : null;
    if (!tablo) {
      const kurlar = await getDoc(doc(db, 'platform', 'kurlar')).then(d => (d.exists() ? d.data() : {})).catch(() => ({}));
      tablo = fiyatTablosu(paraKodu(), kurlar[paraKodu()]);
    }
    if (!tablo) {
      doldur(icerik, h('p', null, t('Bu ülke için fiyat bilgisini destek ekibinden alın.')),
        h('button', { class: 'dugme', type: 'button', onclick: () => wa(t('Merhaba, {salon} için lisans yenilemek istiyorum.', { salon: S.salon.ad })) }, t('WhatsApp ile yaz')));
      return;
    }
    const hesapDoc = await getDoc(doc(db, 'platform', 'hesaplar')).then(d => (d.exists() ? d.data() : {})).catch(() => ({}));
    const uyeler = await uyeleriYukle();
    const personel = Math.max(1, uyeler.filter(u => u.aktif !== false && !u.silindi).length);
    const talepler = await getDocs(query(collection(db, 'odemeTalepleri'), where('salonId', '==', S.salon.id))).then(sn => sn.docs.map(d => ({ id: d.id, ...d.data() }))).catch(() => []);
    const st = { ay: 3, satis: S.salon.satis === true, adim: 1, referans: referansUret(S.salon.id), tablo, hesapDoc };
    const ciz = () => st.adim === 1 ? adim1(icerik, st, personel, talepler, ciz) : st.adim === 2 ? adim2(icerik, st, personel, ciz, () => { st.adim = 3; ciz(); }) : adim3(icerik, p);
    ciz();
  } catch (e) { console.error(e); doldur(icerik, h('div', { class: 'hata' }, hataMetni(e))); }
}

function toplamKutusu(f, kdvOran) {
  return h('div', { class: 'kart bilgi abonelik-toplam' },
    h('div', { class: 'hesap-satir' }, h('span', null, t('Ekip kademesi') + ' (' + t(f.kademe.ad) + ')'), h('span', null, para(f.aylik) + ' ' + t('/ ay'))),
    f.ek ? h('div', { class: 'hesap-satir' }, h('span', null, t('Satış ve analiz paketi')), h('span', null, para(f.ek) + ' ' + t('/ ay'))) : null,
    h('div', { class: 'hesap-satir' }, h('span', null, f.ay + ' ' + t('ay')), h('span', null, para(f.brut))),
    f.indirimTutar ? h('div', { class: 'hesap-satir' }, h('span', null, t('Uzun süre indirimi') + ' (%' + f.indirim + ')'), h('span', null, '− ' + para(f.indirimTutar))) : null,
    kdvOran > 0 ? h('div', { class: 'hesap-satir' }, h('span', null, t('KDV hariç')), h('span', null, para(f.kdvHaric))) : null,
    kdvOran > 0 ? h('div', { class: 'hesap-satir' }, h('span', null, t('KDV') + ' (%' + kdvOran + ')'), h('span', null, para(f.kdv))) : null,
    h('div', { class: 'hesap-satir ust-cizgi' }, h('strong', null, t('Ödenecek toplam')), h('strong', null, para(f.toplam))));
}

function adim1(icerik, st, personel, talepler, ciz) {
  const f = fiyatHesapla({ personel, ay: st.ay, satis: st.satis }, st.tablo);
  const l = lisansDurumu(S.salon);
  doldur(icerik,
    h('p', { class: 'kucuk' }, (l.aktif ? t('Süre, mevcut bitiş tarihinin üstüne eklenir.') : t('Süre onaydan itibaren başlar.')) + ' ' + t('Ekibiniz: {n} kişi.', { n: personel })),
    h('p', { class: 'kucuk' }, t('Süre')),
    h('div', { class: 'etiket-satir' }, st.tablo.sureler.map(s => h('button', { type: 'button', class: 'chip' + (s.ay === st.ay ? ' secili' : ''), onclick: () => { st.ay = s.ay; ciz(); } }, s.ay + ' ' + t('ay') + (s.indirim ? ' · %' + s.indirim : '')))),
    h('label', { class: 'onay-satir' }, h('input', { type: 'checkbox', checked: st.satis, onchange: (e) => { st.satis = e.target.checked; ciz(); } }), ' ', t('Satış ve analiz paketi') + ' (+' + para(st.tablo.ekPaket.satis) + ' ' + t('/ ay') + ')'),
    toplamKutusu(f, st.tablo.kdv),
    h('button', { class: 'dugme buyuk', type: 'button', onclick: () => { st.adim = 2; ciz(); } }, t('Ödemeye geç')),
    talepler.length ? h('div', { class: 'kart' }, h('strong', null, t('Önceki taleplerim')),
      talepler.sort((a, b) => ((b.olusturma && b.olusturma.toMillis ? b.olusturma.toMillis() : 0) - (a.olusturma && a.olusturma.toMillis ? a.olusturma.toMillis() : 0))).slice(0, 5).map(x =>
        h('div', { class: 'hesap-satir kucuk' }, h('span', null, x.ay + ' ' + t('ay') + ' · ' + para(x.toplam) + ' · ' + x.referans), h('span', { class: 'rozet' }, t(DURUM_AD[x.durum] || x.durum))))) : null);
}

function adim2(icerik, st, personel, ciz, bitti) {
  const f = fiyatHesapla({ personel, ay: st.ay, satis: st.satis }, st.tablo);
  // Yönetici panelinde girilen hesap (platform/hesaplar) önceliklidir; yoksa config.js'teki
  const girilen = (st.hesapDoc || {})[ulkeKodu()];
  const hesaplar = (ODEME_HESAPLARI[ulkeKodu()] || []).map((x, i) => (i === 0 && girilen && (girilen.iban || girilen.alici) ? { ...x, alici: girilen.alici || '', iban: girilen.iban || '' } : x)).filter(x => x.iban || x.alici);
  const hata = h('div', { class: 'hata', role: 'alert' });
  const dugme = h('button', { class: 'dugme buyuk', type: 'button' }, t('Ödemeyi yaptım'));
  dugme.addEventListener('click', () => kilitli(dugme, async () => {
    hata.textContent = '';
    try {
      const b = writeBatch(db);
      b.set(doc(collection(db, 'odemeTalepleri')), {
        salonId: S.salon.id, salonAd: String(S.salon.ad || '').slice(0, 80), ay: f.ay, gun: f.gun, satis: st.satis, personel, aylik: f.aylik, ek: f.ek,
        kdvHaric: f.kdvHaric, kdv: f.kdv, toplam: f.toplam, para: st.tablo.para, ...(st.tablo.kur ? { kur: st.tablo.kur } : {}), referans: st.referans, durum: 'bekliyor', olusturanUid: auth.currentUser.uid, olusturma: serverTimestamp()
      });
      await b.commit();
      bitti();
    } catch (e) { console.error(e); hata.textContent = hataMetni(e); }
  }));
  doldur(icerik,
    toplamKutusu(f, st.tablo.kdv),
    h('div', { class: 'kart' }, h('strong', null, t('Ödeme bilgileri')),
      hesaplar.length ? hesaplar.map(x => h('div', { class: 'kucuk' }, h('div', null, t(x.ad)), x.alici ? h('div', null, t('Alıcı') + ': ' + x.alici) : null, x.iban ? h('div', null, 'IBAN: ' + x.iban) : null))
        : h('p', { class: 'kucuk' }, t('Ödeme bilgilerini WhatsApp ile destek ekibinden alın.')),
      h('div', { class: 'hesap-satir' }, h('span', null, t('Açıklamaya yazın')), h('strong', null, st.referans)),
      h('p', { class: 'kucuk soluk' }, t('Ödemeyi yaptıktan sonra "Ödemeyi yaptım"a basın. Yönetici ödemeyi görünce süreniz uzar.'))),
    hata, dugme,
    h('div', { class: 'dugme-satir' },
      h('button', { class: 'dugme ikincil', type: 'button', onclick: () => { st.adim = 1; ciz(); } }, t('Geri')),
      DESTEK_TEL ? h('button', { class: 'dugme ikincil', type: 'button', onclick: () => wa(t('Merhaba, {salon} aboneliği için ödeme yaptım. Referans: {ref}', { salon: S.salon.ad, ref: st.referans })) }, t('Dekontu WhatsApp ile gönder')) : null));
}

function adim3(icerik, p) {
  doldur(icerik, h('div', { class: 'kart bilgi' }, h('strong', null, t('Talebiniz alındı')),
    h('p', null, t('Ödemeniz kontrol edilince süreniz uzar. Bu genellikle kısa sürer; gecikirse WhatsApp ile yazın.'))),
    h('button', { class: 'dugme', type: 'button', onclick: () => p.kapat() }, t('Tamam')));
  bildir(t('Ödeme talebiniz gönderildi.'));
}

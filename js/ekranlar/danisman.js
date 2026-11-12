// Usta Danışman: Worker üzerinden yapay zekâ ile sohbet. Salon verisinin kısa bir özeti her soruyla birlikte gider.
import { t, dilKodu } from '../i18n.js';
import { h, doldur, pencereAc } from '../util.js';
import { S } from '../durum.js';
import { yetkiliMi } from '../roller.js';
import { sunucuHazir, sunucuyaSor } from '../sunucu.js';
import {
  hizmetleriYukle, uyeleriYukle, ustalariYukle, ayariYukle, urunleriYukle, giderleriYukle, musterileriYukle, randevulariYukle,
  aralikOdemeleriniYukle, aralikIslemleriniYukle, aralikHareketleriniYukle
} from '../veri.js';
import { karHesapla, hizmetKarliligi, ayAralik, ayEkle } from '../kar-mantik.js';
import { tarihMetin, tarihEkle } from '../takvim-mantik.js';
import { azMi } from '../stok-mantik.js';

let GECMIS = { uid: null, liste: [] };
let OZET = { t: 0, uid: null, v: null };

export const danismanVar = () => sunucuHazir();

const dene = async (f, yedek) => { try { return await f(); } catch (e) { return yedek; } };

// Salon verisinin kısa özeti. Mali bölüm yalnız yetkililer için hazırlanır (Worker ayrıca süzer).
export async function salonOzeti() {
  const bugun = tarihMetin(new Date()), yarin = tarihEkle(bugun, 1), p = S.profil, yetkili = yetkiliMi(p.rol);
  const [hizmetler, uyeler, bugunR, yarinR] = await Promise.all([
    dene(hizmetleriYukle, []), dene(uyeleriYukle, []), dene(() => randevulariYukle(bugun, bugun), []), dene(() => randevulariYukle(yarin, yarin), [])
  ]);
  const say = (l) => l.filter(r => r.durum !== 'iptal').length;
  const v = {
    salon: S.salon.ad, bugun,
    ekip: uyeler.filter(u => u.aktif !== false).map(u => ({ ad: u.ad.split(' ')[0], rol: u.rol })),
    hizmetler: hizmetler.filter(x => x.aktif !== false).slice(0, 40).map(x => ({ ad: x.ad, sure: x.sure, fiyat: x.fiyat })),
    randevu: { bugun: say(bugunR), yarin: say(yarinR) }
  };
  if (!yetkili) return v;
  const ay = bugun.slice(0, 7), { bas, bit } = ayAralik(ay);
  const [odemeler, u, ayar, hareketler, urunler, giderler, islemler, musteriler] = await Promise.all([
    dene(() => aralikOdemeleriniYukle(bas, bit), []), dene(ustalariYukle, { mali: {} }), dene(ayariYukle, {}), dene(() => aralikHareketleriniYukle(bas, bit), []),
    dene(urunleriYukle, []), dene(giderleriYukle, []), dene(() => aralikIslemleriniYukle(bas, bit), []), dene(musterileriYukle, [])
  ]);
  const D = { odemeler, mali: u.mali || {}, taban: (ayar && ayar.urunTaban) || 'kar', hareketler, urunler, giderler, islemler };
  const r = karHesapla({ ...D, ay });
  const kar = hizmetKarliligi(D);
  const kayipGun = (ayar && ayar.kayipGun) || 60, esik = tarihEkle(bugun, -kayipGun);
  v.mali = {
    donem: ay + ' (bu ay, bugüne kadar)', odemeAdedi: r.adet, ciro: r.ciro, hizmetCirosu: r.hizmetCiro, urunCirosu: r.urunCiro,
    ustaHakedisi: r.hakedis, salonPayi: r.salonPayi, urunAlisMaliyeti: r.urunMaliyet, formulUrunMaliyeti: r.formul && r.formul.toplam, giderler: r.gider, kar: r.kar,
    enKarliHizmetler: kar.slice(0, 5).map(x => ({ ad: x.ad, adet: x.adet, kar: x.kar })),
    enDusukKarliHizmetler: kar.slice(-3).map(x => ({ ad: x.ad, adet: x.adet, kar: x.kar })),
    kayipMusteriSayisi: musteriler.filter(m => m.sonZiyaret && m.sonZiyaret < esik).length, kayipGun
  };
  v.azalanUrunler = urunler.filter(x => x.aktif !== false && azMi(x)).slice(0, 10).map(x => x.ad);
  return v;
}

const ONERI_ILK = ['Boş saatlerimi nasıl doldururum?', 'Müşteriye fiyat artışını nasıl söylerim?', 'Usta yüzdesi kaç olmalı?', 'Gelmeyen müşteriyi nasıl geri kazanırım?'];
const ONERI_MALI = 'Bu ay nasıl gidiyoruz, neye bakmalıyım?';

export function danismanAc() {
  const uid = S.profil.id;
  if (GECMIS.uid !== uid) GECMIS = { uid, liste: [] };
  const liste = h('div', { class: 'dan-liste' });
  const hata = h('div', { class: 'hata', role: 'alert' });
  const yaz = h('textarea', { class: 'dan-yaz', rows: 2, maxlength: 1000, placeholder: t('Meslektaşına danış… (örn. “dip boya fiyatını ne yapayım?”)') });
  const gonder = h('button', { class: 'dugme', type: 'button' }, t('Gönder'));
  let bekliyor = false;
  const balon = (m) => h('div', { class: 'dan-balon ' + (m.rol === 'asistan' ? 'dan-o' : 'dan-ben') }, m.metin);
  const ciz = () => {
    const oneriler = (yetkiliMi(S.profil.rol) ? [ONERI_MALI] : []).concat(ONERI_ILK).slice(0, 4);
    doldur(liste,
      GECMIS.liste.length ? GECMIS.liste.map(balon) : [
        h('div', { class: 'dan-balon dan-o' }, t('Hoş geldin, ben Usta Danışman. Salon işi, müşteri, fiyat, ekip, kimyasal… ne varsa dert yanabilirsin; elimden geldiğince tecrübemle yardım ederim.')),
        h('div', { class: 'etiket-satir' }, oneriler.map(o => h('button', { class: 'chip', type: 'button', onclick: () => sor(o) }, t(o))))],
      bekliyor ? h('div', { class: 'dan-balon dan-o dan-yaziyor' }, t('Düşünüyorum…')) : null);
    liste.scrollTop = liste.scrollHeight;
  };
  async function sor(metin) {
    metin = String(metin || '').trim();
    if (!metin || bekliyor) return;
    hata.textContent = ''; GECMIS.liste.push({ rol: 'kullanici', metin }); yaz.value = ''; bekliyor = true; gonder.disabled = true; ciz();
    try {
      if (!OZET.v || OZET.uid !== uid || Date.now() - OZET.t > 5 * 60e3) OZET = { t: Date.now(), uid, v: await salonOzeti() };
      const r = await sunucuyaSor('/ai', { mesajlar: GECMIS.liste.slice(-12), veri: OZET.v, dil: dilKodu() });
      GECMIS.liste.push({ rol: 'asistan', metin: r.cevap });
    } catch (e) {
      GECMIS.liste.pop(); yaz.value = metin;
      hata.textContent = e.kod === 429 ? e.message : t('Danışmana ulaşılamadı: {h}', { h: e.message || '' });
    }
    bekliyor = false; gonder.disabled = false; ciz(); yaz.focus();
  }
  gonder.onclick = () => sor(yaz.value);
  yaz.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey && !/Android|iPhone|iPad/i.test(navigator.userAgent)) { e.preventDefault(); sor(yaz.value); } });
  ciz();
  pencereAc('🤖 ' + t('Usta Danışman'), h('div', { class: 'dan' }, liste, hata, yaz, h('div', { class: 'dugme-satir' }, gonder),
    h('p', { class: 'kucuk' }, t('Yapay zekâ cevapları yol göstericidir; sağlık, hukuk ve vergi konularında uzmanına danışın.'))));
}

export function danismanKarti() {
  if (!danismanVar()) return null;
  return h('div', { class: 'kart bilgi' }, h('strong', null, '🤖 ' + t('Usta Danışman')),
    h('p', { class: 'kucuk' }, t('Fiyat, müşteri, ekip, kimyasal, işletme… meslektaşınla konuşur gibi danış.')),
    h('div', { class: 'dugme-satir sol' }, h('button', { class: 'dugme ikincil kucuk-dugme', type: 'button', onclick: danismanAc }, t('Danışmanla konuş'))));
}

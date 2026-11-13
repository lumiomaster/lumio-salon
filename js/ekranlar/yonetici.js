// Yönetici paneli (platform yöneticisi: sen ve vekilin). Salon açma, lisans süresi, aktif/pasif, hatırlatma.
// Güvenliği asıl sağlayan firestore.rules'tur (yoneticiler/{uid} belgesi olmayan bu işlemleri yapamaz).
import { t, yerel } from '../i18n.js';
import { UYGULAMA } from '../config.js';
import { girisMesajiYap, kabulMesajiYap, hatirlatMesajiYap, MESAJ_DILLERI, ULKE_DILI } from '../giris-mesaj.js';
import { h, telGoster, eposta, hataMetni, bildir, pencereAc, kilitli, rastgeleSifre, lisansDurumu, onayIste } from '../util.js';
import { S } from '../durum.js';
import {
  auth, auth2, db, createUserWithEmailAndPassword, signOut,
  doc, collection, getDocs, writeBatch, serverTimestamp
} from '../fb.js';
import { goster } from '../main.js';
import { sifreKarti, ekDogrulamaKarti } from './ayarlar.js';
import { sunucuyaSor } from '../sunucu.js';
import { destekBitis, destekGoruntule } from '../destek.js';
import { ULKELER, PARALAR, telNormalize as telNorm, telGirdi } from '../ulke.js';

const GUN = 864e5;
let alt = 'salonlar', suzgec = 'hepsi';
let salonlar = null, yoneticiler = null, yukleniyor = false, hata = '';
let uyeler = null, sorular = null, enCokPersonel = false;

// ---------- veri ----------
export async function salonlariYukle() {
  const sn = await getDocs(collection(db, 'salons'));
  return sn.docs.map(d => ({ id: d.id, ...d.data() }));
}
async function yukle(zorla) {
  if (yukleniyor) return;
  yukleniyor = true; hata = '';
  try {
    salonlar = await salonlariYukle();
    yoneticiler = (await getDocs(collection(db, 'yoneticiler'))).docs.map(d => ({ id: d.id, ...d.data() }));
    // Personel sayıları ve cevapsız sorular: kurallar henüz yayınlanmadıysa panel yine de çalışır
    try { uyeler = (await getDocs(collection(db, 'kullanicilar'))).docs.map(d => ({ id: d.id, ...d.data() })); } catch (_) { uyeler = []; }
    try { sorular = (await getDocs(collection(db, 'sssEksik'))).docs.map(d => ({ id: d.id, ...d.data() })); } catch (_) { sorular = []; }
  } catch (e) { console.error(e); hata = hataMetni(e); salonlar = salonlar || []; yoneticiler = yoneticiler || []; }
  yukleniyor = false;
  goster();
}
function yenile() { salonlar = null; yoneticiler = null; uyeler = null; sorular = null; goster(); }

// ---------- yardımcılar ----------
const tarihYaz = (ms) => new Date(ms).toLocaleDateString(yerel());
const kabulTarih = (k) => { const z = k && k.zaman; const ms = z && z.toMillis ? z.toMillis() : (typeof z === 'number' ? z : null); return ms ? tarihYaz(ms) : '✓'; };
function bilgi(s) {
  const l = lisansDurumu(s);
  let ad, tur;
  if (s.durum === 'PASIF') { ad = 'Pasif'; tur = 'PASIF'; }
  else if (!l.aktif) { ad = 'Süresi doldu'; tur = 'BITTI'; }
  else { ad = s.durum === 'AKTIF' ? 'Aktif' : 'Deneme'; tur = s.durum; }
  return { l, ad, tur, yaklasan: tur !== 'PASIF' && l.aktif && l.kalan <= 7 };
}
const sirala = (a, b) => {
  const x = bilgi(a), y = bilgi(b);
  const o = (z) => z.tur === 'PASIF' ? 2 : 0;
  return (o(x) - o(y)) || (x.l.kalan - y.l.kalan);
};
export async function yaklasanSay() {
  const l = await salonlariYukle();
  return l.filter(s => { const b = bilgi(s); return b.yaklasan || b.tur === 'BITTI'; }).length;
}
function whatsapp(tel, metin) {
  window.open('https://wa.me/' + tel + '?text=' + encodeURIComponent(metin), '_blank', 'noopener');
}
const DIL_AD = { tr: 'Türkçe', ru: 'Русский', kk: 'Қазақша', de: 'Deutsch', en: 'English' };
function mesajDegerleri(salonAdi, tel, sifre, o) {
  const adres = location.origin + location.pathname.replace(/[^/]*$/, '');
  return { salon: salonAdi, sahip: (o && o.sahip) || '', adres, tel: telGoster(tel), sifre, gun: o && o.gun };
}
const kopyala = async (metin) => { try { await navigator.clipboard.writeText(metin); bildir(t('Kopyalandı')); } catch (_) { bildir(t('Kopyalanamadı, elle yazın.'), 'hata'); } };

// ---------- ana ekran ----------
export function yoneticiEkrani() {
  if (salonlar === null && !yukleniyor) yukle();
  const adminSadece = !S.salon;   // yalnız yönetici hesabı (salona bağlı değil)
  const sekmeler = [['salonlar', 'Salonlar'], ['yeni', 'Yeni salon'], ['yonetici', 'Yöneticiler'], ['sorular', 'Sorular']];
  if (adminSadece) sekmeler.push(['hesap', 'Hesabım']);
  return h('div', { class: 'sayfa' },
    h('div', { class: 'baslik-satir' }, h('h1', null, t('Yönetici paneli')),
      h('button', { class: 'dugme ikincil kucuk-dugme', type: 'button', onclick: yenile }, t('Yenile'))),
    h('div', { class: 'sekme-cubugu ' + (sekmeler.length === 5 ? 'bes' : 'dort') },
      sekmeler.map(([id, ad]) => h('button', { type: 'button', class: alt === id ? 'secili' : '', onclick: () => { alt = id; goster(); } }, t(ad)))),
    hata ? h('div', { class: 'uyari' }, hata) : null,
    alt === 'salonlar' ? salonListesi() : alt === 'yeni' ? yeniSalonFormu() : alt === 'yonetici' ? yoneticiListesi() : alt === 'sorular' ? soruListesi() : hesapKarti());
}

export function yoneticiCikisKarti() {
  return h('div', { class: 'kart' },
    h('button', { class: 'dugme ikincil', type: 'button', onclick: async () => {
      if (await onayIste(t('Çıkış yapılsın mı?'), t('Çıkış yap'))) { alt = 'salonlar'; salonlar = null; yoneticiler = null; await signOut(auth); }
    } }, t('Çıkış yap')));
}
function hesapKarti() {
  return h('div', null, h('div', { class: 'kart' }, h('strong', null, S.yonetici ? S.yonetici.ad : ''), h('p', { class: 'soluk' }, t('Platform yöneticisi') + (S.yonetici && S.yonetici.telefon ? ' · ' + telGoster(S.yonetici.telefon) : ''))),
    sifreKarti(), ekDogrulamaKarti(), yoneticiCikisKarti(), h('p', { class: 'kucuk ortala' }, UYGULAMA.ad + ' · ' + UYGULAMA.surum));
}

// ---------- salon listesi ----------
function salonListesi() {
  if (salonlar === null) return h('p', { class: 'soluk' }, t('Yükleniyor…'));
  const say = { yaklasan: 0, bitti: 0, deneme: 0, aktif: 0, pasif: 0 };
  salonlar.forEach(s => { const b = bilgi(s); if (b.yaklasan) say.yaklasan++; if (b.tur === 'BITTI') say.bitti++; if (b.tur === 'DENEME') say.deneme++; if (b.tur === 'AKTIF') say.aktif++; if (b.tur === 'PASIF') say.pasif++; });
  const sUz = [['hepsi', 'Hepsi', salonlar.length], ['yaklasan', '7 gün içinde', say.yaklasan], ['bitti', 'Süresi doldu', say.bitti], ['deneme', 'Deneme', say.deneme], ['aktif', 'Aktif', say.aktif], ['pasif', 'Pasif', say.pasif]];
  const goster2 = salonlar.filter(s => {
    const b = bilgi(s);
    return suzgec === 'hepsi' || (suzgec === 'yaklasan' && b.yaklasan) || (suzgec === 'bitti' && b.tur === 'BITTI')
      || (suzgec === 'deneme' && b.tur === 'DENEME') || (suzgec === 'aktif' && b.tur === 'AKTIF') || (suzgec === 'pasif' && b.tur === 'PASIF');
  }).sort(enCokPersonel ? (a, b) => (personelSay(b.id).toplam - personelSay(a.id).toplam) || sirala(a, b) : sirala);
  return h('div', null,
    say.yaklasan + say.bitti > 0 ? h('div', { class: 'kart uyari' }, h('strong', null, t('Yenileme vakti')),
      h('p', null, t('{a} salonun süresi 7 gün içinde bitiyor, {b} salonun süresi dolmuş.', { a: say.yaklasan, b: say.bitti }))) : null,
    h('div', { class: 'yon-suz' }, sUz.map(([id, ad, n]) => h('button', { type: 'button', class: suzgec === id ? 'secili' : '', onclick: () => { suzgec = id; goster(); } }, t(ad) + ' (' + n + ')'))),
    h('div', { class: 'dugme-satir sol' }, h('button', { type: 'button', class: 'chip' + (enCokPersonel ? ' secili' : ''), onclick: () => { enCokPersonel = !enCokPersonel; goster(); } }, '👥 ' + t('En çok personel önce'))),
    goster2.length ? h('div', { class: 'liste' }, goster2.map(salonKarti)) : h('p', { class: 'soluk' }, t('Bu süzgeçte salon yok.')));
}

const YET = ['yonetici', 'kidemli', 'ortak'];
function personelSay(id) {
  const r = { yet: 0, sek: 0, usta: 0, toplam: 0, eski: 0 };
  (uyeler || []).forEach(u => {
    if (u.salonId !== id) return;
    if (u.silindi) { r.eski++; return; }
    if (u.aktif === false) return;
    r.toplam++;
    if (YET.includes(u.rol)) r.yet++; else if (u.rol === 'sekreter') r.sek++; else r.usta++;
  });
  return r;
}
function personelSatiri(s) {
  if (uyeler === null) return null;
  const c = personelSay(s.id);
  const parca = [];
  if (c.yet) parca.push(t('{n} yönetici/ortak', { n: c.yet }));
  if (c.sek) parca.push(t('{n} sekreter', { n: c.sek }));
  if (c.usta) parca.push(t('{n} usta', { n: c.usta }));
  if (c.eski) parca.push(t('{n} eski çalışan', { n: c.eski }));
  return h('p', { class: 'kucuk yon-personel' }, h('strong', null, '👥 ' + t('{n} personel', { n: c.toplam })), parca.length ? ' · ' + parca.join(' · ') : '');
}
function mesajSecimi(s) {
  const p = pencereAc(t('Mesaj gönder') + ' — ' + s.ad, h('div', { class: 'liste' },
    h('p', { class: 'kucuk' }, t('Hangi mesajı göndermek istiyorsunuz?')),
    s.ownerUid ? h('button', { class: 'dugme ikincil', type: 'button', onclick: () => { p.kapat(); sahipSifreSifirla(s); } }, t('Giriş bilgisini gönder')) : null,
    s.sahipTel ? h('button', { class: 'dugme ikincil', type: 'button', onclick: () => { p.kapat(); lisansHatirlat(s); } }, t('Lisans hatırlat')) : null,
    (s.ownerUid && !s.kabul && s.sahipTel) ? h('button', { class: 'dugme ikincil', type: 'button', onclick: () => { p.kapat(); kabulHatirlat(s); } }, t('Kabulü hatırlat')) : null));
}
function soruListesi() {
  if (sorular === null) return h('p', { class: 'soluk' }, t('Yükleniyor…'));
  const grup = new Map();
  sorular.forEach(q => {
    const k = String(q.metin || '').toLocaleLowerCase('tr').replace(/\s+/g, ' ').trim(); if (!k) return;
    const g = grup.get(k) || { metin: q.metin, dil: q.dil, n: 0, idler: [] };
    g.n++; g.idler.push(q.id); grup.set(k, g);
  });
  const liste = [...grup.values()].sort((a, b) => b.n - a.n);
  return h('div', null,
    h('p', { class: 'kucuk' }, t('Danışmana sorulup SSS\'de karşılığı bulunmayan sorular (kimliksiz). En çok sorulanlar üstte; bunlar için yeni SSS maddesi yazabilirsiniz.')),
    liste.length ? h('div', { class: 'liste' }, liste.map(g => h('div', { class: 'kart uye' },
      h('div', { class: 'uye-ust' }, h('strong', null, g.metin), h('span', { class: 'rozet' }, '×' + g.n + (g.dil ? ' · ' + g.dil : ''))),
      h('button', { class: 'dugme ikincil kucuk-dugme', type: 'button', onclick: async () => {
        try { const b = writeBatch(db); g.idler.forEach(i => b.delete(doc(db, 'sssEksik', i))); await b.commit(); sorular = sorular.filter(q => !g.idler.includes(q.id)); goster(); }
        catch (e) { console.error(e); bildir(hataMetni(e), 'hata'); }
      } }, t('Sil'))))) : h('p', { class: 'soluk' }, t('Cevapsız soru yok.')));
}
function salonKarti(s) {
  const b = bilgi(s);
  const bitisYazi = b.tur === 'PASIF' ? '' : (b.l.bitis ? t('Bitiş') + ': ' + tarihYaz(b.l.bitis) + (b.l.aktif ? ' (' + t('{n} gün', { n: b.l.kalan }) + ')' : '') : '');
  return h('div', { class: 'kart uye yon-salon' + (b.tur === 'PASIF' ? ' pasif' : '') },
    h('div', { class: 'uye-ust' }, h('strong', null, s.ad),
      h('span', { class: 'rozet durum-' + b.tur }, t(b.ad))),
    h('div', { class: 'uye-alt' },
      s.sahipAd ? h('span', null, s.sahipAd) : null,
      s.sahipTel ? h('a', { href: 'tel:+' + s.sahipTel }, telGoster(s.sahipTel)) : h('span', { class: 'soluk' }, t('Telefon kayıtlı değil')),
      s.satis === true ? h('span', { class: 'rozet' }, t('Satış paketi açık')) : null,
      destekBitis(s) ? h('span', { class: 'rozet kabul-tamam' }, t('Destek erişimi açık')) : null,
      bitisYazi ? h('span', { class: b.yaklasan ? 'rozet yaklasan' : 'soluk' }, bitisYazi) : null,
      s.ownerUid ? (s.kabul ? h('span', { class: 'rozet kabul-tamam' }, t('Kabul etti: {t}', { t: kabulTarih(s.kabul) })) : h('span', { class: 'rozet kabul-bekle' }, t('Kabul bekliyor'))) : null,
      h('span', { class: 'soluk' }, (s.ulke || s.ulkeKayit) && ULKELER[s.ulke || s.ulkeKayit] ? t(ULKELER[s.ulke || s.ulkeKayit].ad) + (PARALAR[s.para] ? ' · ' + PARALAR[s.para].sembol : ' · ' + t('para birimi seçilmedi')) : t('Ülke seçilmedi'))),
    personelSatiri(s),
    s.notlar ? h('p', { class: 'kucuk' }, s.notlar) : null,
    h('div', { class: 'dugme-satir sol' },
      h('button', { class: 'dugme kucuk-dugme', type: 'button', onclick: () => uzatFormu(s) }, t('Süre ekle')),
      b.tur === 'PASIF'
        ? h('button', { class: 'dugme ikincil kucuk-dugme', type: 'button', onclick: () => durumDegistir(s, 'AKTIF') }, t('Aktif yap'))
        : h('button', { class: 'dugme ikincil kucuk-dugme', type: 'button', onclick: () => durumDegistir(s, 'PASIF') }, t('Pasif yap')),
      (s.sahipTel || s.ownerUid) ? h('button', { class: 'dugme ikincil kucuk-dugme', type: 'button', onclick: () => mesajSecimi(s) }, t('Mesaj gönder')) : null,
      destekBitis(s) ? h('button', { class: 'dugme kucuk-dugme', type: 'button', onclick: () => destekGoruntule(s) }, '🛟 ' + t('Destek görünümü')) : null,
      h('button', { class: 'dugme ikincil kucuk-dugme', type: 'button', onclick: () => duzenleFormu(s) }, t('Düzenle'))));
}

async function guncelle(s, alanlar, mesaj) {
  const b = writeBatch(db);
  b.update(doc(db, 'salons', s.id), alanlar);
  await b.commit();
  bildir(mesaj || t('Kaydedildi')); yenile();
}

async function durumDegistir(s, yeni) {
  const b = bilgi(s);
  const soru = yeni === 'PASIF'
    ? t('"{ad}" salonu pasif yapılsın mı? Salon kayıt yapamaz; verileri silinmez.', { ad: s.ad })
    : t('"{ad}" salonu yeniden aktif yapılsın mı?', { ad: s.ad });
  if (!(await onayIste(soru, yeni === 'PASIF' ? t('Pasif yap') : t('Aktif yap')))) return;
  try {
    await guncelle(s, { durum: yeni, bitisMs: b.l.bitis || 0 }, yeni === 'PASIF' ? t('Salon pasif yapıldı.') : t('Salon aktif yapıldı.'));
    if (yeni === 'AKTIF' && !(b.l.bitis > Date.now())) bildir(t('Süresi dolmuş görünüyor; "Süre ekle" ile yeni süre verin.'), 'hata');
  } catch (e) { console.error(e); bildir(hataMetni(e), 'hata'); }
}

// ---------- süre ekle ----------
const PAKETLER = [[14, '14 gün'], [30, '1 ay (30 gün)'], [90, '3 ay (90 gün)'], [180, '6 ay (180 gün)'], [365, '1 yıl (365 gün)'], [3650, 'Süresiz (10 yıl)']];
function uzatFormu(s) {
  const b = bilgi(s);
  const gun = h('select', null, PAKETLER.map(([g, ad]) => h('option', { value: g, selected: g === 30 }, t(ad))), h('option', { value: 'ozel' }, t('Başka gün sayısı')));
  const ozel = h('input', { type: 'number', min: 1, max: 3650, placeholder: t('Gün sayısı') });
  ozel.style.display = 'none';
  gun.addEventListener('change', () => { ozel.style.display = gun.value === 'ozel' ? '' : 'none'; });
  const tur = h('select', null, h('option', { value: 'AKTIF' }, t('Ödemeli lisans (Aktif)')), h('option', { value: 'DENEME' }, t('Deneme')));
  const hataKutu = h('div', { class: 'hata', role: 'alert' });
  const dugme = h('button', { class: 'dugme', type: 'submit' }, t('Süreyi ekle'));
  const icerik = h('div', null);
  const p = pencereAc(t('Süre ekle') + ' · ' + s.ad, icerik);
  icerik.append(h('form', { class: 'form', novalidate: true,
    onsubmit: (e) => {
      e.preventDefault(); hataKutu.textContent = '';
      const g = gun.value === 'ozel' ? Math.floor(Number(ozel.value)) : Number(gun.value);
      if (!(g >= 1 && g <= 3650)) { hataKutu.textContent = t('Gün sayısı 1 ile 3650 arasında olmalı.'); return; }
      const taban = b.l.aktif && b.tur !== 'PASIF' ? b.l.bitis : Date.now();
      const yeni = taban + g * GUN;
      kilitli(dugme, async () => {
        try { await guncelle(s, { durum: tur.value, bitisMs: yeni }, t('Yeni bitiş') + ': ' + tarihYaz(yeni)); p.kapat(); }
        catch (err) { console.error(err); hataKutu.textContent = hataMetni(err); }
      });
    } },
    h('p', { class: 'kucuk' }, b.tur === 'PASIF' || !b.l.aktif ? t('Süre bugünden itibaren başlar.') : t('Süre, mevcut bitiş tarihinin ({d}) üstüne eklenir.', { d: tarihYaz(b.l.bitis) })),
    h('label', null, t('Eklenecek süre'), gun), ozel,
    h('label', null, t('Lisans türü'), tur),
    hataKutu, dugme));
}

// ---------- düzenle ----------
function duzenleFormu(s) {
  const b = bilgi(s);
  const ad = h('input', { type: 'text', value: s.ad, required: true, maxlength: 80 });
  const sahip = h('input', { type: 'text', value: s.sahipAd || '', maxlength: 60 });
  const tel = h('input', { type: 'tel', inputmode: 'tel', value: telGirdi(s.sahipTel), placeholder: '05xx xxx xx xx' });
  const notlar = h('input', { type: 'text', value: s.notlar || '', maxlength: 300, placeholder: t('Not (örn. ödeme şekli, anlaşma)') });
  const durum = h('select', null, [['DENEME', 'Deneme'], ['AKTIF', 'Aktif'], ['PASIF', 'Pasif']].map(([v, a]) => h('option', { value: v, selected: s.durum === v }, t(a))));
  const ulkeS = h('select', null, h('option', { value: '' }, t('Seçilmedi (sahibi seçsin)')), Object.entries(ULKELER).map(([k, u]) => h('option', { value: k, selected: (s.ulke || s.ulkeKayit) === k }, t(u.ad))));
  const satis = h('input', { type: 'checkbox', checked: s.satis === true });
  const dt = new Date(b.l.bitis || Date.now());
  const bitis = h('input', { type: 'date', value: dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0') });
  const hataKutu = h('div', { class: 'hata', role: 'alert' });
  const dugme = h('button', { class: 'dugme', type: 'submit' }, t('Kaydet'));
  const icerik = h('div', null);
  const p = pencereAc(t('Salonu düzenle'), icerik);
  icerik.append(h('form', { class: 'form', novalidate: true,
    onsubmit: (e) => {
      e.preventDefault(); hataKutu.textContent = '';
      const adT = ad.value.trim();
      if (adT.length < 2) { hataKutu.textContent = t('Salon adını yazın.'); return; }
      let telD = '';
      if (tel.value.trim()) { telD = telNorm(tel.value, ulkeS.value || s.ulke); if (!telD) { hataKutu.textContent = t('Geçerli bir telefon numarası yazın.'); return; } }
      if (!bitis.value) { hataKutu.textContent = t('Bitiş tarihini seçin.'); return; }
      const [y, m, g] = bitis.value.split('-').map(Number);
      const bitisMs = new Date(y, m - 1, g, 23, 59, 0).getTime();
      kilitli(dugme, async () => {
        try { const v = { ad: adT, sahipAd: sahip.value.trim(), sahipTel: telD, notlar: notlar.value.trim(), durum: durum.value, bitisMs, satis: satis.checked }; if (ulkeS.value && !s.para) v.ulkeKayit = ulkeS.value; await guncelle(s, v); p.kapat(); }
        catch (err) { console.error(err); hataKutu.textContent = hataMetni(err); }
      });
    } },
    h('label', null, t('Salon adı'), ad),
    h('label', null, t('Sahibinin adı'), sahip),
    h('label', null, t('Sahibinin telefonu'), tel),
    h('label', null, t('Not'), notlar),
    h('label', null, t('Salonun ülkesi'), ulkeS),
    h('label', null, t('Durum'), durum),
    h('label', null, t('Bitiş tarihi'), bitis),
    h('label', { class: 'onay-satir' }, satis, ' ', t('Satış ve analiz paketi (ek ücretli)')),
    h('p', { class: 'kucuk' }, t('Açıksa salon kendi ürün listesini yönetir ve fotoğraf analizi yapabilir. Yalnız platform yöneticisi açıp kapatır.')),
    hataKutu, dugme));
}

// ---------- yeni salon ----------
// "Bu numara zaten kayıtlı" hatasında: eski hesabı sunucuya sildirip numarayı serbest bırakır
function hataGoster(hataKutu, err, d) {
  hataKutu.textContent = hataMetni(err);
  if (!(err && err.code === 'auth/email-already-in-use')) return;
  hataKutu.append(' ', h('button', { class: 'dugme ikincil kucuk-dugme', type: 'button', onclick: () => serbestBirak(hataKutu, d) }, t('Bu numarayı serbest bırak')));
}
async function serbestBirak(hataKutu, d) {
  try {
    const o = await sunucuyaSor('/hesap-sil', { tel: d, onizle: true });
    const kim = o.ad + (o.rol ? ' (' + o.rol + ')' : '') + (o.salonAd ? ' · ' + o.salonAd : '');
    if (!(await onayIste(t('Bu numara şu hesaba ait: {kim}. Hesap silinsin ve numara serbest kalsın mı? Bu işlem geri alınamaz.', { kim }), t('Evet, serbest bırak')))) return;
    await sunucuyaSor('/hesap-sil', { tel: d });
    hataKutu.textContent = t('Numara serbest bırakıldı. Şimdi düğmeye tekrar basın.');
    bildir(t('Numara serbest bırakıldı'));
  } catch (e) { console.error(e); hataKutu.textContent = e.message || hataMetni(e); }
}
async function sahipSifreSifirla(s) {
  if (!s.ownerUid) return;
  if (!(await onayIste(t('{ad} için yeni geçici şifre oluşturulup giriş bilgisi hazırlansın mı? Eski şifresi geçersiz olur.', { ad: s.sahipAd || s.ad }), t('Evet, devam')))) return;
  try {
    const r = await sunucuyaSor('/sifre-sifirla', { uid: s.ownerUid });
    sonucPenceresi(s.ad, r.telefon, r.sifre, t('Giriş bilgisi'), { sahip: s.sahipAd, gun: bilgi(s).l.aktif ? bilgi(s).l.kalan : 0, s });
  } catch (e) { console.error(e); bildir(e.message || hataMetni(e), 'hata'); }
}

function yeniSalonFormu() {
  const salonAdi = h('input', { type: 'text', placeholder: t('Salonun adı'), required: true, maxlength: 80 });
  const sahip = h('input', { type: 'text', placeholder: t('Salon sahibinin adı soyadı'), required: true, maxlength: 60 });
  const tel = h('input', { type: 'tel', inputmode: 'tel', placeholder: '05xx xxx xx xx', required: true });
  const sifre = h('input', { type: 'text', value: rastgeleSifre(), autocomplete: 'off', required: true });
  const tur = h('select', null, h('option', { value: 'DENEME' }, t('Deneme')), h('option', { value: 'AKTIF' }, t('Ödemeli lisans (Aktif)')));
  const gun = h('input', { type: 'number', min: 1, max: 3650, value: 14, required: true });
  tur.addEventListener('change', () => { gun.value = tur.value === 'DENEME' ? 14 : 365; });
  const ulkeY = h('select', null, h('option', { value: '' }, t('Seçilmedi')), Object.entries(ULKELER).map(([k, u]) => h('option', { value: k }, t(u.ad))));
  const notlar = h('input', { type: 'text', maxlength: 300, placeholder: t('Not (isteğe bağlı)') });
  const hataKutu = h('div', { class: 'hata', role: 'alert' });
  const dugme = h('button', { class: 'dugme', type: 'submit' }, t('Salonu oluştur'));
  return h('form', { class: 'form', novalidate: true,
    onsubmit: (e) => {
      e.preventDefault(); hataKutu.textContent = '';
      const d = telNorm(tel.value, ulkeY.value || undefined), adT = salonAdi.value.trim(), sahipT = sahip.value.trim(), g = Math.floor(Number(gun.value));
      if (adT.length < 2) { hataKutu.textContent = t('Salonun adını yazın.'); return; }
      if (sahipT.length < 2) { hataKutu.textContent = t('Salon sahibinin adını yazın.'); return; }
      if (!d) { hataKutu.textContent = t('Geçerli bir telefon numarası yazın.'); return; }
      if (sifre.value.length < 6) { hataKutu.textContent = t('Şifre en az 6 karakter olmalı.'); return; }
      if (!(g >= 1 && g <= 3650)) { hataKutu.textContent = t('Gün sayısı 1 ile 3650 arasında olmalı.'); return; }
      kilitli(dugme, async () => {
        let cred = null;
        try {
          cred = await createUserWithEmailAndPassword(auth2, eposta(d), sifre.value);
          const sahipUid = cred.user.uid;
          const salonRef = doc(collection(db, 'salons'));
          const veri = { ad: adT, ownerUid: sahipUid, durum: tur.value, paket: 'salon', olusturma: serverTimestamp(), bitisMs: Date.now() + g * GUN, sahipAd: sahipT, sahipTel: d };
          if (ulkeY.value) veri.ulkeKayit = ulkeY.value;   // yalnız kayıt için; para birimini salon sahibi kendisi seçer
          if (notlar.value.trim()) veri.notlar = notlar.value.trim();
          const b = writeBatch(db);
          b.set(salonRef, veri);
          b.set(doc(db, 'kullanicilar', sahipUid), {
            salonId: salonRef.id, ad: sahipT, telefon: d, rol: 'yonetici', aktif: true,
            olusturma: serverTimestamp(), ekleyen: auth.currentUser.uid
          });
          await b.commit();
          await signOut(auth2);
          salonlar = null; suzgec = 'hepsi'; alt = 'salonlar';
          sonucPenceresi(adT, d, sifre.value, null, { sahip: sahipT, gun: g, s: { id: salonRef.id, ulkeKayit: ulkeY.value } });
          goster();
        } catch (err) {
          console.error(err);
          if (cred && cred.user) { try { await cred.user.delete(); } catch (_) {} }
          try { await signOut(auth2); } catch (_) {}
          hataGoster(hataKutu, err, d);
        }
      });
    } },
    h('p', { class: 'kucuk' }, t('Salonu siz açarsınız. Salon sahibi bu telefon ve şifreyle giriş yapar, ekibini kendisi ekler.')),
    h('label', null, t('Salonun adı'), salonAdi),
    h('label', null, t('Salon sahibinin adı soyadı'), sahip),
    h('label', null, t('Salon sahibinin telefonu (giriş için)'), tel),
    h('label', null, t('Geçici şifre'), sifre),
    h('label', null, t('Salonun ülkesi (kayıt ve telefon biçimi için)'), ulkeY), h('p', { class: 'kucuk' }, t('Para birimini ve dili salon sahibi ilk girişte kendisi seçer.')),
    h('label', null, t('Lisans türü'), tur),
    h('label', null, t('Süre (gün)'), gun),
    h('label', null, t('Not'), notlar),
    h('p', { class: 'kucuk' }, t('Salon sahibi ilk girişte kullanım şartlarını kendi dilinde okuyup kabul eder; kabul tarihi salon kartında görünür.')),
    hataKutu, dugme);
}

// Salon sahibine giden mesajlar için dil: son seçilen (salon başına hatırlanır), yoksa ülkeye göre
function salonDili(sl) {
  try { const k = localStorage.getItem('lumio-yon-dil:' + sl.id); if (k && DIL_AD[k]) return k; } catch (_) {}
  return ULKE_DILI[sl.ulke || sl.ulkeKayit || ''] || 'tr';
}
function mesajPenceresi(baslik, tel, sl, yap, ust) {
  const icerik = h('div', null);
  const p = pencereAc(baslik, icerik);
  const dil = h('select', null, MESAJ_DILLERI.map(k => h('option', { value: k }, DIL_AD[k])));
  dil.value = salonDili(sl);
  const kutu = h('textarea', { rows: 9, class: 'liste-metin' });
  const yaz = () => { kutu.value = yap(dil.value); try { if (sl.id) localStorage.setItem('lumio-yon-dil:' + sl.id, dil.value); } catch (_) {} };
  dil.addEventListener('change', yaz); yaz();
  icerik.append(ust || null,
    h('label', null, t('Mesaj dili'), dil), kutu,
    h('div', { class: 'dugme-satir' },
      h('button', { class: 'dugme ikincil', type: 'button', onclick: () => kopyala(kutu.value) }, t('Kopyala')),
      h('button', { class: 'dugme ikincil', type: 'button', onclick: () => whatsapp(tel, kutu.value) }, t('WhatsApp ile gönder')),
      h('button', { class: 'dugme', type: 'button', onclick: p.kapat }, t('Tamam'))));
}
function sonucPenceresi(salonAdi, tel, sifre, baslik, o) {
  const ust = h('div', null,
    h('div', { class: 'kart bilgi' }, h('strong', null, salonAdi),
      h('p', null, t('Telefon') + ': ' + telGoster(tel)), h('p', null, t('Geçici şifre') + ': ' + sifre)),
    h('p', { class: 'kucuk' }, t('Bu bilgiyi salon sahibine iletin. Şifre bir daha gösterilmez.')));
  mesajPenceresi(baslik || t('Salon oluşturuldu'), tel, (o && o.s) || {}, (dil) => girisMesajiYap(dil, mesajDegerleri(salonAdi, tel, sifre, o)), ust);
}
function kabulHatirlat(s) {
  mesajPenceresi(t('Kabulü hatırlat'), s.sahipTel, s, (dil) => kabulMesajiYap(dil, { salon: s.ad, sahip: s.sahipAd || '' }));
}
function lisansHatirlat(s) {
  const kalan = bilgi(s).l.aktif ? bilgi(s).l.kalan : 0;
  mesajPenceresi(t('WhatsApp hatırlat'), s.sahipTel, s, (dil) => hatirlatMesajiYap(dil, { sahip: s.sahipAd || s.ad, kalan }));
}

// ---------- yöneticiler (sen ve vekilin) ----------
function yoneticiListesi() {
  if (yoneticiler === null) return h('p', { class: 'soluk' }, t('Yükleniyor…'));
  const ben = auth.currentUser.uid;
  return h('div', null,
    h('div', { class: 'baslik-satir' }, h('strong', null, t('Platform yöneticileri')),
      h('button', { class: 'dugme kucuk-dugme', type: 'button', onclick: yoneticiEkleFormu }, t('+ Yönetici / vekil ekle'))),
    h('p', { class: 'kucuk' }, t('Yöneticiler salonları açabilir, lisans süresini değiştirebilir. İlk (sahip) yönetici panelden pasif yapılamaz.')),
    yoneticiler.filter(y => y.aktif).length < 2 ? h('div', { class: 'kart uyari' }, h('p', { class: 'kucuk' }, '⚠️ ' + t('Tek yönetici hesabı var. Telefonunuz kaybolursa ya da şifrenizi unutursanız panele giremezsiniz; güvendiğiniz birini vekil olarak ekleyin.'))) : null,
    h('div', { class: 'liste' }, yoneticiler.map(y => h('div', { class: 'kart uye' + (y.aktif ? '' : ' pasif') },
      h('div', { class: 'uye-ust' }, h('strong', null, y.ad, y.id === ben ? ' ' + t('(siz)') : ''),
        y.sahip ? h('span', { class: 'rozet' }, t('Sahip')) : null),
      h('div', { class: 'uye-alt' }, y.telefon ? h('a', { href: 'tel:+' + y.telefon }, telGoster(y.telefon)) : null,
        y.aktif ? null : h('span', { class: 'rozet pasif-rozet' }, t('Pasif'))),
      (y.id !== ben && !y.sahip)
        ? h('button', { class: 'dugme ikincil kucuk-dugme', type: 'button', onclick: async () => {
            const yeni = !y.aktif;
            if (!(await onayIste(yeni ? t('{ad} yeniden aktif yapılsın mı?', { ad: y.ad }) : t('{ad} pasif yapılsın mı? Panele giremez.', { ad: y.ad }), yeni ? t('Aktif yap') : t('Pasif yap')))) return;
            try { const b = writeBatch(db); b.update(doc(db, 'yoneticiler', y.id), { aktif: yeni }); await b.commit(); bildir(t('Kaydedildi')); yenile(); }
            catch (e) { console.error(e); bildir(hataMetni(e), 'hata'); }
          } }, y.aktif ? t('Pasif yap') : t('Aktif yap'))
        : null))));
}

function yoneticiEkleFormu() {
  const ad = h('input', { type: 'text', placeholder: t('Adı soyadı'), required: true, maxlength: 60 });
  const tel = h('input', { type: 'tel', inputmode: 'tel', placeholder: '05xx xxx xx xx', required: true });
  const sifre = h('input', { type: 'text', value: rastgeleSifre(), autocomplete: 'off', required: true });
  const hataKutu = h('div', { class: 'hata', role: 'alert' });
  const dugme = h('button', { class: 'dugme', type: 'submit' }, t('Yöneticiyi ekle'));
  const icerik = h('div', null);
  const p = pencereAc(t('Yönetici / vekil ekle'), icerik);
  icerik.append(h('form', { class: 'form', novalidate: true,
    onsubmit: (e) => {
      e.preventDefault(); hataKutu.textContent = '';
      const d = telNorm(tel.value), adT = ad.value.trim();
      if (adT.length < 2) { hataKutu.textContent = t('Adını yazın.'); return; }
      if (!d) { hataKutu.textContent = t('Geçerli bir telefon numarası yazın.'); return; }
      if (sifre.value.length < 6) { hataKutu.textContent = t('Şifre en az 6 karakter olmalı.'); return; }
      kilitli(dugme, async () => {
        let cred = null;
        try {
          cred = await createUserWithEmailAndPassword(auth2, eposta(d), sifre.value);
          const b = writeBatch(db);
          b.set(doc(db, 'yoneticiler', cred.user.uid), { ad: adT, telefon: d, aktif: true, olusturma: serverTimestamp(), ekleyen: auth.currentUser.uid });
          await b.commit();
          await signOut(auth2);
          yoneticiler = null; goster();
          const metin = 'Merhaba ' + adT + ',\n\n' + UYGULAMA.ad + ' yönetici hesabınız hazır.\n\nUygulama: ' + location.origin + location.pathname.replace(/[^/]*$/, '') + '\nTelefon: ' + telGoster(d) + '\nGeçici şifre: ' + sifre.value + '\n\nGiriş yaptıktan sonra Hesabım bölümünden şifrenizi değiştirin.';
          icerik.replaceChildren(
            h('div', { class: 'kart bilgi' }, h('strong', null, t('{ad} eklendi', { ad: adT })), h('p', null, t('Telefon') + ': ' + telGoster(d)), h('p', null, t('Geçici şifre') + ': ' + sifre.value)),
            h('p', { class: 'kucuk' }, t('Bu bilgiyi kişiye iletin. Şifre bir daha gösterilmez.')),
            h('div', { class: 'dugme-satir' },
              h('button', { class: 'dugme ikincil', type: 'button', onclick: () => kopyala(metin) }, t('Kopyala')),
              h('button', { class: 'dugme', type: 'button', onclick: p.kapat }, t('Tamam'))));
        } catch (err) {
          console.error(err);
          if (cred && cred.user) { try { await cred.user.delete(); } catch (_) {} }
          try { await signOut(auth2); } catch (_) {}
          hataGoster(hataKutu, err, d);
        }
      });
    } },
    h('p', { class: 'kucuk' }, t('Bu kişi için yeni bir hesap açılır. Başka bir hesapta kayıtlı olmayan bir telefon numarası kullanın.')),
    h('label', null, t('Adı soyadı'), ad),
    h('label', null, t('Telefon numarası'), tel),
    h('label', null, t('Geçici şifre'), sifre),
    hataKutu, dugme));
}

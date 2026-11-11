import { t } from '../i18n.js';
import { h, doldur, hataMetni, bildir, pencereAc, onayIste, lisansDurumu } from '../util.js';
import { S } from '../durum.js';
import { yetkiliMi } from '../roller.js';
import { auth, db, doc, getDoc, getDocs, collection, query, where, writeBatch, serverTimestamp } from '../fb.js';
import { uyeleriYukle } from '../veri.js';
import { tarihMetin, tarihEkle } from '../takvim-mantik.js';

// Ekip sohbeti: salondaki herkesin yazdığı tek ortak kanal. Son 14 gün görünür.
// Okunmamış sayısı için her yazışmada küçük bir "son" belgesi güncellenir (rozet için tek okuma yeter).
const OKU = 'lumio_salon_sohbet_okundu';
const okunduOku = () => { try { return Number((JSON.parse(localStorage.getItem(OKU) || '{}'))[S.salon.id]) || 0; } catch (e) { return 0; } };
const okunduYaz = (ms) => { try { const o = JSON.parse(localStorage.getItem(OKU) || '{}'); o[S.salon.id] = ms; localStorage.setItem(OKU, JSON.stringify(o)); } catch (e) { /* önemli değil */ } };
const ms = (z) => (z && z.toMillis ? z.toMillis() : (z && z.seconds ? z.seconds * 1000 : Date.now()));

let okunmamis = 0, sayacZaman = null, acik = false;

function rozetGuncelle() {
  document.querySelectorAll('.sohbet-rozet').forEach(e => { e.textContent = '●'; e.hidden = okunmamis === 0; });
}

// Başlıktaki 💬 düğmesi; rozet okunmamış mesaj olduğunu gösterir
export function sohbetDugmesi() {
  if (!S.salon || !S.profil) return null;
  const r = h('span', { class: 'sohbet-rozet', hidden: okunmamis === 0, 'aria-label': t('Yeni mesaj') }, '●');
  return h('button', { class: 'sohbet-dugme', type: 'button', 'aria-label': t('Ekip sohbeti'), onclick: sohbetAc }, '💬', r);
}

// Okunmamış var mı: "son" belgesine bakar (tek okuma)
async function kontrol() {
  if (!auth.currentUser || !S.salon || acik) return;
  try {
    const d = await getDoc(doc(db, 'salons', S.salon.id, 'sohbetDurum', 'son'));
    if (!d.exists()) { okunmamis = 0; }
    else { const v = d.data(); okunmamis = (v.uid !== auth.currentUser.uid && ms(v.zaman) > okunduOku()) ? Math.max(1, okunmamis || 1) : 0; }
    rozetGuncelle();
  } catch (e) { /* ağ ya da izin yoksa sessiz */ }
}
export function sohbetKontrolBaslat() {
  if (sayacZaman) return;
  sayacZaman = setInterval(() => { if (!document.hidden) kontrol(); }, 30000);
  kontrol();
}
export function sohbetKontrolDurdur() { if (sayacZaman) { clearInterval(sayacZaman); sayacZaman = null; } okunmamis = 0; }

async function mesajlariYukle() {
  const bas = tarihEkle(tarihMetin(new Date()), -14);
  const sn = await getDocs(query(collection(db, 'salons', S.salon.id, 'sohbet'), where('gun', '>=', bas)));
  return sn.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => ms(a.zaman) - ms(b.zaman));
}

export async function sohbetAc() {
  acik = true;
  const kutu = h('div', { class: 'sohbet-liste', 'aria-live': 'polite' }, h('p', { class: 'soluk' }, t('Yükleniyor…')));
  const yaz = h('textarea', { rows: 2, maxlength: 500, placeholder: t('Mesaj yazın…'), class: 'sohbet-giris' });
  const hata = h('div', { class: 'hata', role: 'alert' });
  const gonder = h('button', { class: 'dugme', type: 'submit' }, t('Gönder'));
  let uyeler = [], sonSayi = -1, zamanlayici = null, kapali = false;
  const ben = auth.currentUser.uid;
  const ad = (uid) => (uyeler.find(x => x.id === uid) || { ad: '?' }).ad;

  const ciz = (liste) => {
    if (liste.length === sonSayi) return; sonSayi = liste.length;
    const altta = kutu.scrollHeight - kutu.scrollTop - kutu.clientHeight < 80;
    let gun = '';
    doldur(kutu, liste.length === 0 ? h('p', { class: 'soluk' }, t('Henüz mesaj yok. İlk mesajı siz yazın.')) : liste.map(m => {
      const benim = m.uid === ben;
      const ayirac = m.gun !== gun ? h('div', { class: 'sohbet-gun' }, m.gun === tarihMetin(new Date()) ? t('Bugün') : m.gun.split('-').reverse().join('.')) : null; gun = m.gun;
      const saat = m.zaman && m.zaman.toMillis ? new Date(m.zaman.toMillis()).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '';
      return h('div', null, ayirac,
        h('div', { class: 'sohbet-mesaj' + (benim ? ' benim' : '') },
          benim ? null : h('div', { class: 'sohbet-ad' }, ad(m.uid)),
          h('div', { class: 'sohbet-metin' }, m.metin),
          h('div', { class: 'sohbet-alt' }, saat, benim || yetkiliMi(S.profil.rol) ? h('button', { class: 'sohbet-sil', type: 'button', 'aria-label': t('Sil'), onclick: () => sil(m) }, '🗑') : null)));
    }));
    if (altta || liste.length) kutu.scrollTop = kutu.scrollHeight;
  };
  const yenile = async () => {
    try {
      const liste = await mesajlariYukle(); if (kapali) return;
      ciz(liste);
      const son = liste.filter(m => m.uid !== ben).map(m => ms(m.zaman)).pop();
      okunduYaz(Math.max(okunduOku(), son || 0, liste.length ? ms(liste[liste.length - 1].zaman) : 0)); okunmamis = 0; rozetGuncelle();
    } catch (e) { console.error(e); if (!kapali) doldur(kutu, h('div', { class: 'uyari' }, hataMetni(e))); }
  };
  async function sil(m) {
    if (!(await onayIste(t('Bu mesaj silinsin mi?'), t('Evet, sil')))) return;
    try { const b = writeBatch(db); b.delete(doc(db, 'salons', S.salon.id, 'sohbet', m.id)); await b.commit(); sonSayi = -1; yenile(); }
    catch (e) { console.error(e); bildir(hataMetni(e), 'hata'); }
  }
  const aktif = lisansDurumu(S.salon).aktif;
  const icerik = h('div', { class: 'sohbet' }, kutu,
    aktif ? h('form', { class: 'sohbet-form', novalidate: true,
      onsubmit: async (e) => {
        e.preventDefault(); hata.textContent = '';
        const metin = yaz.value.trim(); if (!metin) return;
        gonder.disabled = true;
        try {
          const b = writeBatch(db);
          const gun = tarihMetin(new Date());
          b.set(doc(collection(db, 'salons', S.salon.id, 'sohbet')), { uid: ben, metin, gun, zaman: serverTimestamp() });
          b.set(doc(db, 'salons', S.salon.id, 'sohbetDurum', 'son'), { uid: ben, gun, zaman: serverTimestamp() });
          await b.commit(); yaz.value = ''; sonSayi = -1; await yenile();
        } catch (err) { console.error(err); hata.textContent = hataMetni(err); }
        gonder.disabled = false; yaz.focus();
      } }, yaz, hata, gonder) : h('p', { class: 'kucuk' }, t('Deneme/lisans süresi bittiği için yeni mesaj yazılamaz.')),
    h('p', { class: 'kucuk' }, t('Son 14 günün mesajları görünür. Bu bir ekip içi kanaldır; salondaki herkes okur.')));
  const p = pencereAc(t('Ekip sohbeti'), icerik);
  // pencere kapanınca yoklamayı durdur
  const arka = icerik.closest('.pencere-arka');
  const izle = new MutationObserver(() => { if (!document.body.contains(arka)) { kapali = true; acik = false; clearInterval(zamanlayici); izle.disconnect(); kontrol(); } });
  izle.observe(document.body, { childList: true });
  try { uyeler = await uyeleriYukle(); } catch (e) { console.error(e); }
  await yenile();
  zamanlayici = setInterval(() => { if (!document.hidden) yenile(); }, 8000);
  return p;
}

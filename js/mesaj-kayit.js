import { t } from './i18n.js';
import { onayIste, bildir } from './util.js';
import { S } from './durum.js';
import { auth, db, doc, getDoc, getDocs, collection, query, where, writeBatch, serverTimestamp } from './fb.js';
import { uyeleriYukle } from './veri.js';
import { tarihMetin, tarihEkle } from './takvim-mantik.js';
import { waAc, tarihTR, sablonDili, dilSorulsun, MESAJ_DILLERI } from './mesaj.js';
import { DILLER } from './i18n.js';
import { h, pencereAc } from './util.js';

// Müşteriye giden mesajların kaydı: aynı mesaj ikinci kez gitmesin, kim gönderdi görünsün.
// Kayıt adı: müşteri_tür_anahtar (doğum günü: yıl; sonraki ziyaret: tarih; davet: son ziyaret tarihi; onay: randevu no)
export const mesajAnahtar = (musteriId, tur, anahtar) => musteriId + '_' + tur + '_' + anahtar;

// Son 60 günde gönderilenler: { anahtar: { ad, gun } }
export async function gonderimleriYukle() {
  const bas = tarihEkle(tarihMetin(new Date()), -60);
  const [sn, uyeler] = await Promise.all([getDocs(query(collection(db, 'salons', S.salon.id, 'mesajlar'), where('gun', '>=', bas))), uyeleriYukle()]);
  const harita = {};
  sn.docs.forEach(d => { const v = d.data(); harita[d.id] = { ad: ((uyeler.find(u => u.id === v.gonderen) || { ad: '?' }).ad), gun: v.gun }; });
  return harita;
}

export async function gonderimVarMi(musteriId, tur, anahtar) {
  const d = await getDoc(doc(db, 'salons', S.salon.id, 'mesajlar', mesajAnahtar(musteriId, tur, anahtar)));
  if (!d.exists()) return null;
  const v = d.data();
  const uyeler = await uyeleriYukle();
  return { ad: (uyeler.find(u => u.id === v.gonderen) || { ad: '?' }).ad, gun: v.gun };
}

export const gonderilmisYazi = (g) => t('Gönderildi · {ad}, {gun}', { ad: g.ad.split(' ')[0], gun: tarihTR(g.gun).slice(0, 5) });

// Müşteri başına son seçilen mesaj dili bu cihazda hatırlanır
const dilAnahtar = (id) => 'mesajDil:' + (S.salon ? S.salon.id : '') + ':' + id;
const dilOku = (id) => { try { const d = localStorage.getItem(dilAnahtar(id)); return MESAJ_DILLERI.includes(d) ? d : null; } catch (e) { return null; } };
const dilYaz = (id, d) => { try { localStorage.setItem(dilAnahtar(id), d); } catch (e) { /* kayıt yok */ } };

// Gönderim öncesi: dili seç, metni gözden geçir, gönder
function metinSor(musteriId, yap) {
  return new Promise((coz) => {
    let dil = (musteriId && dilOku(musteriId)) || sablonDili();
    const yaz = h('textarea', { class: 'mesaj-kutu', rows: 10, maxlength: 2000 });
    const chipler = h('div', { class: 'etiket-satir' });
    const ciz = () => chipler.replaceChildren(...MESAJ_DILLERI.map(k => h('button', { class: 'chip' + (k === dil ? ' secili' : ''), type: 'button', onclick: () => { dil = k; yaz.value = yap(k); ciz(); } }, DILLER[k])));
    yaz.value = yap(dil); ciz();
    let bitti = false;
    const bitir = (v) => { if (bitti) return; bitti = true; coz(v); };
    const p = pencereAc(t('Mesaj gönder'), h('div', { class: 'form' },
      h('p', { class: 'kucuk' }, t('Mesaj dili')), chipler, yaz,
      h('p', { class: 'kucuk' }, t('Göndermeden önce metni düzenleyebilirsiniz.')),
      h('div', { class: 'dugme-satir' },
        h('button', { class: 'dugme ikincil', type: 'button', onclick: () => { p.kapat(); bitir(null); } }, t('Vazgeç')),
        h('button', { class: 'dugme', type: 'button', onclick: () => { if (musteriId) dilYaz(musteriId, dil); p.kapat(); bitir(yaz.value); } }, t("WhatsApp'ta aç")))));
  });
}

// WhatsApp'ı açar ve gönderimi kaydeder. onceki doluysa önce uyarır. yap(dil) verilmişse ve salon "dili seçtir" açtıysa dil sorulur.
export async function mesajGonder({ musteriId, tel, tur, anahtar, metin, yap, onceki, yenile }) {
  if (onceki && !(await onayIste(t('Bu mesaj {gun} günü {ad} tarafından zaten gönderilmiş. Yine de tekrar gönderilsin mi?', { gun: tarihTR(onceki.gun), ad: onceki.ad }), t('Evet, tekrar gönder')))) return;
  if (yap && dilSorulsun()) { const m = await metinSor(musteriId, yap); if (m == null || !String(m).trim()) return; metin = m; }
  waAc(tel, metin);
  if (onceki || !musteriId) return;
  try {
    const b = writeBatch(db);
    b.set(doc(db, 'salons', S.salon.id, 'mesajlar', mesajAnahtar(musteriId, tur, anahtar)), { musteriId, tur, anahtar, gonderen: auth.currentUser.uid, gun: tarihMetin(new Date()), zaman: serverTimestamp() });
    await b.commit();
    if (yenile) yenile();
  } catch (e) { console.error(e); bildir(t('Mesaj açıldı ama gönderim kaydı tutulamadı.'), 'hata'); }
}

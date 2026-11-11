// Ayarlar > Mesaj şablonları: salon, müşteriye ve ustalara giden hazır mesajların yazısını değiştirir.
import { t } from '../i18n.js';
import { h, doldur, hataMetni, bildir, kilitli, pencereAc, onayIste, lisansDurumu } from '../util.js';
import { S } from '../durum.js';
import { db, doc, writeBatch, serverTimestamp } from '../fb.js';
import { SABLON_BILGI, SABLON_ORNEK, sablonVarsayilan, sablonOzel, sablonOzelAyarla, mesajYap } from '../mesaj.js';

const DEGISKEN_AD = {
  MUSTERI_ADI: 'Müşteri adı', SALON_ADI: 'Salon adı', IMZA: 'İmza (salon adı)', TARIH: 'Tarih', SAAT: 'Saat',
  HIZMET: 'Hizmet', USTA_SATIR: 'Usta satırı', USTA_ADI: 'Usta adı', LISTE: 'Ürün listesi'
};

export function sablonKarti() {
  return h('div', { class: 'kart' },
    h('strong', null, t('Mesaj şablonları')),
    h('p', { class: 'soluk' }, t('Müşterilere ve ustalara giden hazır mesajların yazısını buradan değiştirebilirsiniz.')),
    h('button', { class: 'dugme ikincil', type: 'button', onclick: liste }, t('Şablonları düzenle')));
}

function liste() {
  const kutu = h('div', { class: 'form' });
  const ciz = () => {
    const oz = sablonOzel();
    doldur(kutu, SABLON_BILGI.map(b => h('button', { class: 'satir tikla', type: 'button', onclick: () => duzenle(b, ciz) },
      h('strong', null, t(b.ad)), h('div', { class: 'kucuk' }, t(b.ack)),
      oz[b.tur] ? h('span', { class: 'etiket' }, t('Düzenlendi')) : null)));
  };
  ciz();
  pencereAc(t('Mesaj şablonları'), kutu);
}

function duzenle(b, geri) {
  const yaz = h('textarea', { class: 'mesaj-kutu', rows: 12, maxlength: 1000 });
  yaz.value = sablonOzel()[b.tur] || sablonVarsayilan(b.tur);
  const onizle = h('pre', { class: 'mesaj-onizle' });
  const guncelle = () => { onizle.textContent = yaz.value.replace(/\{([A-Z_]+)\}/g, (m, k) => {
    const v = { SALON_ADI: S.salon.ad, IMZA: S.salon.ad, USTA_SATIR: SABLON_ORNEK.USTA_ADI ? '💇 Uzmanımız: ' + SABLON_ORNEK.USTA_ADI + '\n' : '', ...SABLON_ORNEK };
    return v[k] != null ? v[k] : m; }); };
  yaz.addEventListener('input', guncelle); guncelle();
  const hata = h('div', { class: 'hata', role: 'alert' });
  const ekle = (k) => { const a = yaz.selectionStart, z = yaz.selectionEnd; yaz.setRangeText('{' + k + '}', a, z, 'end'); yaz.focus(); guncelle(); };
  const kaydet = async (yeniMetin) => {
    if (!lisansDurumu(S.salon).aktif) { hata.textContent = t('Lisans süresi bittiği için değişiklik yapılamaz.'); return false; }
    const oz = sablonOzel();
    if (yeniMetin == null) delete oz[b.tur]; else oz[b.tur] = yeniMetin;
    try {
      const b2 = writeBatch(db);
      b2.set(doc(db, 'salons', S.salon.id, 'ayarlar', 'mesajlar'), { ...oz, guncelleme: serverTimestamp() });
      await b2.commit();
      sablonOzelAyarla(oz); return true;
    } catch (err) { console.error(err); hata.textContent = hataMetni(err); return false; }
  };
  const k = h('button', { class: 'dugme', type: 'button' }, t('Kaydet'));
  k.onclick = () => kilitli(k, async () => {
    hata.textContent = '';
    const m = yaz.value.trim();
    if (!m) { hata.textContent = t('Mesaj boş olamaz.'); return; }
    if (m === sablonVarsayilan(b.tur)) { if (await kaydet(null)) { bildir(t('Kaydedildi')); biter(); } return; }
    if (await kaydet(m)) { bildir(t('Kaydedildi')); biter(); }
  });
  const v = h('button', { class: 'dugme ikincil', type: 'button' }, t('Varsayılana dön'));
  v.onclick = async () => {
    if (!(await onayIste(t('Hazır metne dönülsün mü?'), t('Evet, dön')))) return;
    if (await kaydet(null)) { yaz.value = sablonVarsayilan(b.tur); guncelle(); bildir(t('Kaydedildi')); biter(); }
  };
  let pen = null;
  const biter = () => { if (pen) pen.kapat(); geri(); };
  pen = pencereAc(t(b.ad), h('div', { class: 'form' },
    h('p', { class: 'kucuk' }, t(b.ack)),
    h('div', { class: 'etiket-satir' }, b.degisken.map(d => h('button', { class: 'chip', type: 'button', onclick: () => ekle(d) }, t(DEGISKEN_AD[d] || d)))),
    yaz, h('strong', { class: 'kucuk' }, t('Önizleme (örnek bilgilerle)')), onizle, hata,
    h('div', { class: 'dugme-satir' }, k, v)));
}

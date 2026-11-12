// Ayarlar > Mesaj şablonları: salon, müşteriye ve ustalara giden hazır mesajların yazısını değiştirir.
import { t } from '../i18n.js';
import { h, doldur, hataMetni, bildir, kilitli, pencereAc, onayIste, lisansDurumu } from '../util.js';
import { S } from '../durum.js';
import { db, doc, writeBatch, serverTimestamp } from '../fb.js';
import { SABLON_BILGI, SABLON_ORNEK, MESAJ_DILLERI, sablonVarsayilan, sablonOzel, sablonOzelAyarla, sablonDili, dilSorulsun } from '../mesaj.js';
import { DILLER } from '../i18n.js';

const DEGISKEN_AD = {
  MUSTERI_ADI: 'Müşteri adı', SALON_ADI: 'Salon adı', IMZA: 'İmza (salon adı)', TARIH: 'Tarih', SAAT: 'Saat',
  HIZMET: 'Hizmet', USTA_SATIR: 'Usta satırı', USTA_ADI: 'Usta adı', LISTE: 'Ürün listesi',
  GOOGLE_LINK: 'Google puanlama linki', INSTAGRAM_LINK: 'Instagram adresi', BANKA_ADI: 'Banka adı', HESAP_SAHIBI: 'Hesap sahibi', IBAN_NO: 'IBAN / hesap no'
};

export function sablonKarti() {
  return h('div', { class: 'kart' },
    h('strong', null, t('Mesaj şablonları')),
    h('p', { class: 'soluk' }, t('Müşterilere ve ustalara giden hazır mesajların yazısını buradan değiştirebilirsiniz.')),
    h('button', { class: 'dugme ikincil', type: 'button', onclick: liste }, t('Şablonları düzenle')));
}

// Dil ayarı: "mesajlar" belgesi Türkçe metinleri ve ayarları birlikte tutar
async function ayarKaydet(yeni) {
  const oz = sablonOzel('tr');
  const b = writeBatch(db);
  b.set(doc(db, 'salons', S.salon.id, 'ayarlar', 'mesajlar'), { ...oz, ...yeni, guncelleme: serverTimestamp() });
  await b.commit();
  sablonOzelAyarla({ ...oz, ...yeni }, 'tr');
}

function liste() {
  const kutu = h('div', { class: 'form' });
  let duzDil = sablonDili();
  const ciz = () => {
    const oz = sablonOzel(duzDil);
    const varsayilanSec = h('select', { onchange: async (e) => {
      if (!lisansDurumu(S.salon).aktif) { bildir(t('Lisans süresi bittiği için değişiklik yapılamaz.'), 'hata'); e.target.value = sablonDili(); return; }
      try { await ayarKaydet({ sablonDil: e.target.value }); duzDil = e.target.value; bildir(t('Kaydedildi')); ciz(); } catch (err) { console.error(err); bildir(hataMetni(err), 'hata'); }
    } }, MESAJ_DILLERI.map(k => h('option', { value: k, selected: sablonDili() === k }, DILLER[k])));
    const sorKutu = h('input', { type: 'checkbox', id: 'dil-sor', checked: dilSorulsun(), onchange: async (e) => {
      try { await ayarKaydet({ dilSor: e.target.checked }); bildir(t('Kaydedildi')); } catch (err) { console.error(err); bildir(hataMetni(err), 'hata'); e.target.checked = !e.target.checked; }
    } });
    const duzSec = h('select', { onchange: (e) => { duzDil = e.target.value; ciz(); } }, MESAJ_DILLERI.map(k => h('option', { value: k, selected: duzDil === k }, DILLER[k])));
    doldur(kutu,
      h('label', null, t('Mesaj dili'), varsayilanSec),
      h('p', { class: 'kucuk' }, t('Müşterilere ve ustalara giden mesajların dili. Müşteri başına değiştirmek için aşağıdaki seçeneği açın.')),
      h('label', { class: 'onay', for: 'dil-sor' }, sorKutu, h('span', null, t('Göndermeden önce dili seçtir'))),
      h('label', null, t('Düzenlenen dil'), duzSec),
      SABLON_BILGI.map(b => h('button', { class: 'satir tikla', type: 'button', onclick: () => duzenle(b, ciz, duzDil) },
        h('strong', null, t(b.ad)), h('div', { class: 'kucuk' }, t(b.ack)),
        oz[b.tur] ? h('span', { class: 'etiket' }, t('Düzenlendi')) : null)));
  };
  ciz();
  pencereAc(t('Mesaj şablonları'), kutu);
}

function duzenle(b, geri, dil) {
  const yaz = h('textarea', { class: 'mesaj-kutu', rows: 12, maxlength: 1000 });
  yaz.value = sablonOzel(dil)[b.tur] || sablonVarsayilan(b.tur, dil);
  const onizle = h('pre', { class: 'mesaj-onizle' });
  const guncelle = () => { onizle.textContent = yaz.value.replace(/\{([A-Z_]+)\}/g, (m, k) => {
    const v = { SALON_ADI: S.salon.ad, IMZA: S.salon.ad, USTA_SATIR: SABLON_ORNEK.USTA_ADI ? '💇 Uzmanımız: ' + SABLON_ORNEK.USTA_ADI + '\n' : '', ...SABLON_ORNEK };
    return v[k] != null ? v[k] : m; }); };
  yaz.addEventListener('input', guncelle); guncelle();
  const hata = h('div', { class: 'hata', role: 'alert' });
  const ekle = (k) => { const a = yaz.selectionStart, z = yaz.selectionEnd; yaz.setRangeText('{' + k + '}', a, z, 'end'); yaz.focus(); guncelle(); };
  const kaydet = async (yeniMetin) => {
    if (!lisansDurumu(S.salon).aktif) { hata.textContent = t('Lisans süresi bittiği için değişiklik yapılamaz.'); return false; }
    const oz = sablonOzel(dil);
    if (yeniMetin == null) delete oz[b.tur]; else oz[b.tur] = yeniMetin;
    try {
      const b2 = writeBatch(db);
      // Türkçe metinler ve dil ayarları "mesajlar" belgesinde, diğer diller "mesajlar_<dil>" belgesinde
      const ek = dil === 'tr' ? { sablonDil: sablonDili(), dilSor: dilSorulsun() } : {};
      b2.set(doc(db, 'salons', S.salon.id, 'ayarlar', dil === 'tr' ? 'mesajlar' : 'mesajlar_' + dil), { ...oz, ...ek, guncelleme: serverTimestamp() });
      await b2.commit();
      sablonOzelAyarla({ ...oz, ...ek }, dil); return true;
    } catch (err) { console.error(err); hata.textContent = hataMetni(err); return false; }
  };
  const k = h('button', { class: 'dugme', type: 'button' }, t('Kaydet'));
  k.onclick = () => kilitli(k, async () => {
    hata.textContent = '';
    const m = yaz.value.trim();
    if (!m) { hata.textContent = t('Mesaj boş olamaz.'); return; }
    if (m === sablonVarsayilan(b.tur, dil)) { if (await kaydet(null)) { bildir(t('Kaydedildi')); biter(); } return; }
    if (await kaydet(m)) { bildir(t('Kaydedildi')); biter(); }
  });
  const v = h('button', { class: 'dugme ikincil', type: 'button' }, t('Varsayılana dön'));
  v.onclick = async () => {
    if (!(await onayIste(t('Hazır metne dönülsün mü?'), t('Evet, dön')))) return;
    if (await kaydet(null)) { yaz.value = sablonVarsayilan(b.tur, dil); guncelle(); bildir(t('Kaydedildi')); biter(); }
  };
  let pen = null;
  const biter = () => { if (pen) pen.kapat(); geri(); };
  pen = pencereAc(t(b.ad), h('div', { class: 'form' },
    h('p', { class: 'kucuk' }, t(b.ack)),
    h('div', { class: 'etiket-satir' }, b.degisken.map(d => h('button', { class: 'chip', type: 'button', onclick: () => ekle(d) }, t(DEGISKEN_AD[d] || d)))),
    yaz, h('strong', { class: 'kucuk' }, t('Önizleme (örnek bilgilerle)')), onizle, hata,
    h('div', { class: 'dugme-satir' }, k, v)));
}

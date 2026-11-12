// Satış ve analiz paketi: müşteri fotoğrafından kozmetik gözlem + salonun kendi ürünlerinden öneri, WhatsApp ile müşteriye gönderim.
// Fotoğraf uygulamada ve sunucuda SAKLANMAZ; yalnız sonuç ve müşterinin onay kaydı tutulur.
import { t } from '../i18n.js';
import { h, doldur, hataMetni, bildir, kilitli, pencereAc } from '../util.js';
import { S } from '../durum.js';
import { auth, db, doc, collection, writeBatch, serverTimestamp } from '../fb.js';
import { satisUrunleriYukle } from '../veri.js';
import { sunucuHazir, sunucuyaSor } from '../sunucu.js';
import { mesajGonder } from '../mesaj-kayit.js';
import { hitap, sablonDili, MESAJ_DILLERI } from '../mesaj.js';
import { TURLER, TUR_AD, analizUrunleri, analizMesaji } from '../analiz-mantik.js';
import { resimKucult } from '../analiz-resim.js';

const DIL_AD = { tr: 'Türkçe', ru: 'Русский', kk: 'Қазақша', de: 'Deutsch', en: 'English' };

export async function analizAc(m) {
  const icerik = h('div', null, h('p', { class: 'soluk' }, t('Yükleniyor…')));
  const p = pencereAc(t('Fotoğraf analizi') + ' · ' + m.ad, icerik);
  let urunler;
  try { urunler = await satisUrunleriYukle(); } catch (e) { console.error(e); doldur(icerik, h('div', { class: 'uyari' }, hataMetni(e))); return; }
  let tur = 'sac', resimler = [], onay = false, dil = MESAJ_DILLERI.includes(sablonDili()) ? sablonDili() : 'tr';
  const kutu = h('div', null);
  const dosya = h('input', { type: 'file', accept: 'image/*', capture: 'environment', class: 'gizli', 'aria-label': t('Fotoğraf'), onchange: async () => {
    const f = dosya.files && dosya.files[0]; dosya.value = '';
    if (!f) return;
    if (resimler.length >= 2) { bildir(t('En fazla 2 fotoğraf eklenebilir.'), 'hata'); return; }
    try { resimler.push(await resimKucult(f)); ciz(); } catch (e) { console.error(e); bildir(t('Fotoğraf okunamadı.'), 'hata'); }
  } });
  const ciz = () => {
    const uygun = analizUrunleri(urunler, tur);
    const dugme = h('button', { class: 'dugme', type: 'button', disabled: !onay || !resimler.length, onclick: () => kilitli(dugme, () => calistir(uygun)) }, t('Analiz et'));
    doldur(kutu,
      h('div', { class: 'chip-satir' }, TURLER.map(k => h('button', { type: 'button', class: 'chip' + (k === tur ? ' secili' : ''), onclick: () => { tur = k; ciz(); } }, t(TUR_AD[k])))),
      uygun.length ? null : h('p', { class: 'kucuk' }, t('Bu analiz türü için ürün eklenmemiş. Analiz yapılır ama ürün önerilmez (Salon > Genel > Satış ürünleri).')),
      h('div', { class: 'dugme-satir sol' }, h('button', { class: 'dugme ikincil kucuk-dugme', type: 'button', onclick: () => dosya.click() }, '📷 ' + t('Fotoğraf çek / seç') + ' (' + resimler.length + '/2)')),
      resimler.length ? h('div', { class: 'foto-serit' }, resimler.map((r, i) => h('div', { class: 'foto-kare' }, h('img', { src: r, alt: '' }), h('button', { type: 'button', 'aria-label': t('Kaldır'), onclick: () => { resimler.splice(i, 1); ciz(); } }, '✕')))) : null,
      h('label', null, t('Müşteriye gidecek mesajın dili'), h('select', { onchange: (e) => { dil = e.target.value; } }, MESAJ_DILLERI.map(d => h('option', { value: d, selected: d === dil }, DIL_AD[d])))),
      h('label', { class: 'onay-satir analiz-onay' }, h('input', { type: 'checkbox', checked: onay, onchange: (e) => { onay = e.target.checked; ciz(); } }), ' ',
        t('Müşteri onay verdi: fotoğrafı yalnız bu analiz için yapay zekâ servisine gönderilir, uygulamada ve sunucuda saklanmaz.')),
      dosya, dugme);
  };
  async function calistir(uygun) {
    if (!sunucuHazir()) { bildir(t('Bu özellik için sunucu kurulumu gerekli.'), 'hata'); return; }
    try {
      const s = await sunucuyaSor('/foto-analiz', { tur, resimler, urunler: uygun, dil, onay: true });
      const sec = (s.oneriler || []).map(o => ({ o, u: urunler.find(x => x.id === o.id) })).filter(x => x.u);
      try {
        const b = writeBatch(db);
        b.set(doc(collection(db, 'salons', S.salon.id, 'analizler')), { musteriId: m.id, tur, urunler: sec.map(x => x.u.id), alan: auth.currentUser.uid, onay: true, dil, zaman: serverTimestamp() });
        await b.commit();
      } catch (e) { console.error(e); bildir(t('Analiz yapıldı ama kaydı tutulamadı.'), 'hata'); }
      resimler = []; sonuc(s, sec);
    } catch (e) { console.error(e); bildir(hataMetni(e), 'hata'); }
  }
  function sonuc(s, sec) {
    const ogeler = sec.map(x => ({ ad: x.u.ad, gerekce: x.o.gerekce, kullanim: x.u.kullanim, link: x.u.link }));
    const metin = () => analizMesaji(dil, { ad: hitap(m.ad), tur, gozlem: s.gozlem, uyari: s.uyari, ogeler, salon: S.salon.ad, usta: (S.profil.ad || '').split(' ')[0] });
    doldur(kutu,
      h('div', { class: 'kart' }, h('h3', { class: 'ilk' }, t('Gözlem')), h('p', null, s.gozlem), s.uyari ? h('p', { class: 'uyari' }, s.uyari) : null),
      ogeler.length ? h('div', null, h('h3', null, t('Önerilen ürünler')), ogeler.map((o, i) => h('div', { class: 'kart' },
        h('strong', null, (i + 1) + '. ' + o.ad), o.gerekce ? h('p', { class: 'kucuk' }, o.gerekce) : null,
        o.kullanim ? h('p', { class: 'kucuk' }, t('Kullanım') + ': ' + o.kullanim) : null,
        o.link ? h('a', { class: 'kucuk', href: o.link, target: '_blank', rel: 'noopener noreferrer' }, '🔗 ' + t('Satın alma bağlantısı')) : null))) : h('p', { class: 'soluk' }, t('Bu gözleme uygun ürün listenizde bulunamadı.')),
      h('div', { class: 'dugme-satir sol' },
        m.tel ? h('button', { class: 'dugme', type: 'button', onclick: () => mesajGonder({ musteriId: m.id, tel: m.tel, tur: 'analiz', anahtar: new Date().toISOString().replace(/\D/g, '').slice(0, 14), metin: metin() }) }, t('WhatsApp ile müşteriye gönder')) : h('p', { class: 'kucuk' }, t('Müşterinin telefonu yok; mesaj gönderilemez.')),
        h('button', { class: 'dugme ikincil', type: 'button', onclick: () => { onay = false; ciz(); } }, t('Yeni analiz'))));
  }
  ciz();
  doldur(icerik, kutu);
}

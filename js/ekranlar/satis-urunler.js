// Satış ve analiz paketi: salonun kendi ürün listesi (ad, hangi konularda yardımcı olduğu, kullanım talimatı, serbest satın alma bağlantısı).
// Ürünler salona aittir; platform yalnız paketi açar/kapatır, ürün ya da toptancı dayatmaz.
import { t } from '../i18n.js';
import { h, doldur, hataMetni, bildir, kilitli, pencereAc } from '../util.js';
import { S } from '../durum.js';
import { auth, db, doc, collection, writeBatch, serverTimestamp } from '../fb.js';
import { satisUrunleriYukle } from '../veri.js';
import { TURLER, TUR_AD, ETIKETLER, etiketAd, linkDuzenle } from '../analiz-mantik.js';

export async function satisUrunleri() {
  const icerik = h('div', null, h('p', { class: 'soluk' }, t('Yükleniyor…')));
  pencereAc(t('Satış ürünleri'), icerik);
  const yenile = async () => {
    let liste;
    try { liste = await satisUrunleriYukle(); } catch (e) { console.error(e); doldur(icerik, h('div', { class: 'uyari' }, hataMetni(e))); return; }
    doldur(icerik,
      h('p', { class: 'kucuk' }, t('Müşteriye önermek istediğiniz bakım ürünlerini ekleyin. Fotoğraf analizinde yapay zekâ yalnız bu listeden seçer. Satın alma bağlantısını (mağazanız, pazaryeri, toptancınız) dilediğiniz gibi yazabilirsiniz.')),
      h('div', { class: 'dugme-satir sol' }, h('button', { class: 'dugme kucuk-dugme', type: 'button', onclick: () => urunFormu(null, yenile) }, t('+ Ürün ekle'))),
      liste.length ? liste.map(u => h('div', { class: 'satir tikla', onclick: () => urunFormu(u, yenile) },
        h('div', null, h('strong', null, u.ad), u.aktif === false ? h('span', { class: 'soluk' }, ' · ' + t('Pasif')) : null,
          h('div', { class: 'kucuk' }, (u.turler || []).map(k => t(TUR_AD[k])).join(', ') + (u.link ? ' · 🔗' : ''))))) : h('p', { class: 'soluk' }, t('Henüz ürün eklenmemiş.')));
  };
  await yenile();
}

function urunFormu(u, yenile) {
  const ad = h('input', { type: 'text', maxlength: 80, value: u ? u.ad : '', placeholder: t('Ürün adı') });
  const kullanim = h('textarea', { rows: 4, maxlength: 600, placeholder: t('Nasıl kullanılır? (örn. Nemli saça uygulayın, 3 dk bekletin, durulayın)') }, u ? u.kullanim : '');
  const link = h('input', { type: 'text', maxlength: 500, value: u ? u.link : '', placeholder: 'https://…' });
  const aktif = h('input', { type: 'checkbox', checked: u ? u.aktif !== false : true });
  const turSec = new Set(u ? u.turler : []), etSec = new Set(u ? u.etiketler : []);
  const turKutu = h('div', { class: 'chip-satir' }), etKutu = h('div', null);
  const ciz = () => {
    turKutu.replaceChildren(...TURLER.map(k => h('button', { type: 'button', class: 'chip' + (turSec.has(k) ? ' secili' : ''), onclick: () => { turSec.has(k) ? turSec.delete(k) : turSec.add(k); ciz(); } }, t(TUR_AD[k]))));
    etKutu.replaceChildren(...TURLER.filter(k => turSec.has(k)).map(k => h('div', null, h('p', { class: 'kucuk' }, t('Hangi konularda yardımcı olur?') + ' — ' + t(TUR_AD[k])),
      h('div', { class: 'chip-satir' }, Object.entries(ETIKETLER[k]).map(([id, a]) => h('button', { type: 'button', class: 'chip' + (etSec.has(k + ':' + id) ? ' secili' : ''), onclick: () => { const z = k + ':' + id; etSec.has(z) ? etSec.delete(z) : etSec.add(z); ciz(); } }, t(a)))))));
  };
  ciz();
  const hata = h('div', { class: 'hata', role: 'alert' });
  const dugme = h('button', { class: 'dugme', type: 'submit' }, t('Kaydet'));
  const icerik = h('div', null);
  const p = pencereAc(u ? u.ad : t('Yeni ürün'), icerik);
  icerik.append(h('form', { class: 'form', novalidate: true, onsubmit: (e) => {
    e.preventDefault(); hata.textContent = '';
    const a = ad.value.trim();
    if (a.length < 2) { hata.textContent = t('Ürün adını yazın.'); return; }
    if (!turSec.size) { hata.textContent = t('En az bir analiz türü seçin (saç, tırnak, kaş, cilt).'); return; }
    const l = linkDuzenle(link.value);
    if (l === null) { hata.textContent = t('Bağlantı https:// ile başlayan geçerli bir adres olmalı.'); return; }
    kilitli(dugme, async () => {
      try {
        const veri = { ad: a, turler: TURLER.filter(k => turSec.has(k)), etiketler: [...etSec].filter(z => turSec.has(z.split(':')[0]) && etiketAd(z)), kullanim: kullanim.value.trim(), link: l, aktif: aktif.checked, guncelleme: serverTimestamp() };
        const ref = u ? doc(db, 'salons', S.salon.id, 'satisUrunler', u.id) : doc(collection(db, 'salons', S.salon.id, 'satisUrunler'));
        const b = writeBatch(db);
        b.set(ref, veri);
        b.set(doc(collection(db, 'salons', S.salon.id, 'kayitlar')), { uid: auth.currentUser.uid, islem: u ? 'satis_urun_duzenle' : 'satis_urun_ekle', hedef: ref.id, ayrinti: a, zaman: serverTimestamp() });
        await b.commit(); p.kapat(); bildir(t('Kaydedildi')); yenile();
      } catch (err) { console.error(err); hata.textContent = hataMetni(err); }
    });
  } },
    h('label', null, t('Ürün adı'), ad),
    h('p', { class: 'kucuk' }, t('Hangi analizlerde önerilsin?')), turKutu, etKutu,
    h('label', null, t('Kullanım talimatı'), kullanim),
    h('label', null, t('Satın alma bağlantısı (isteğe bağlı)'), link),
    h('label', { class: 'onay-satir' }, aktif, ' ', t('Önerilebilir (aktif)')),
    hata, dugme));
}

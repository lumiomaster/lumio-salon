import { t } from '../i18n.js';
import { h, doldur, hataMetni, bildir, kilitli, sayi, para, pencereAc, lisansDurumu } from '../util.js';
import { S } from '../durum.js';
import { yetkiliMi } from '../roller.js';
import { auth, db, doc, collection, writeBatch, serverTimestamp } from '../fb.js';
import { hizmetleriYukle, oranAyariYukle } from '../veri.js';
import { oranKaydet, grupAdi, yeniGrupId } from '../oran-ayar.js';
import { sembol } from '../ulke.js';

// Hazır hizmet paketleri: fiyatlar 0 gelir, salon kendi fiyatını yazar.
const B = (ad, tur, sure) => ({ ad, tur, sure });
const PAKETLER = [
  { ad: 'Kadın kuaförü', hizmetler: [
    { ad: 'Saç kesimi', kategori: 'Kesim', sure: 45 },
    { ad: 'Fön', kategori: 'Şekillendirme', sure: 30 },
    { ad: 'Topuz ve şekillendirme', kategori: 'Şekillendirme', sure: 45 },
    { ad: 'Dip boya', kategori: 'Boya', sure: 90, asamalar: [B('Boyayı sür', 'mesgul', 30), B('Bekleme', 'bekleme', 30), B('Durula ve kurut', 'mesgul', 30)] },
    { ad: 'Komple boya', kategori: 'Boya', sure: 120, asamalar: [B('Boyayı sür', 'mesgul', 40), B('Bekleme', 'bekleme', 40), B('Durula ve kurut', 'mesgul', 40)] },
    { ad: 'Röfle', kategori: 'Boya', sure: 120, asamalar: [B('Uygulama', 'mesgul', 40), B('Bekleme', 'bekleme', 40), B('Durula ve kurut', 'mesgul', 40)] },
    { ad: 'Keratin bakım', kategori: 'Bakım', sure: 120 },
    { ad: 'Saç bakım maskesi', kategori: 'Bakım', sure: 30 }
  ] },
  { ad: 'Erkek berberi', hizmetler: [
    { ad: 'Saç kesimi', kategori: 'Kesim', sure: 30 },
    { ad: 'Sakal tıraşı', kategori: 'Kesim', sure: 20 },
    { ad: 'Saç ve sakal', kategori: 'Kesim', sure: 45 },
    { ad: 'Saç boyası', kategori: 'Boya', sure: 45 },
    { ad: 'Cilt bakımı', kategori: 'Bakım', sure: 30 }
  ] },
  { ad: 'Tırnak ve güzellik', hizmetler: [
    { ad: 'Manikür', kategori: 'Tırnak', sure: 45 },
    { ad: 'Pedikür', kategori: 'Tırnak', sure: 60 },
    { ad: 'Kalıcı oje', kategori: 'Tırnak', sure: 60 },
    { ad: 'Protez tırnak', kategori: 'Tırnak', sure: 90 },
    { ad: 'Kaş şekillendirme', kategori: 'Güzellik', sure: 20 },
    { ad: 'Cilt bakımı', kategori: 'Güzellik', sure: 60 }
  ] }
];

const TUR = { mesgul: 'Usta çalışıyor', bekleme: 'Bekleme (usta başka işe bakabilir)' };

export function hizmetlerEkrani() {
  const kutu = h('div', null, h('p', { class: 'soluk' }, t('Yükleniyor…')));
  const yenile = (zorla) => Promise.all([hizmetleriYukle(zorla), oranAyariYukle(zorla)]).then(([l, o]) => ciz(kutu, l, yenile, o)).catch(e => kutu.replaceChildren(h('div', { class: 'uyari' }, hataMetni(e))));
  yenile(false);
  return kutu;
}

function kayit(b, ayrinti) {
  b.set(doc(collection(db, 'salons', S.salon.id, 'kayitlar')), {
    uid: auth.currentUser.uid, islem: 'hizmet', hedef: S.salon.id, ayrinti, zaman: serverTimestamp()
  });
}

function ciz(kutu, liste, yenile, oran) {
  const yetkili = yetkiliMi(S.profil.rol);
  const lisansOk = lisansDurumu(S.salon).aktif;
  const duzenle = yetkili && lisansOk;
  const gruplar = {};
  liste.forEach(x => { (gruplar[x.kategori || t('Diğer')] = gruplar[x.kategori || t('Diğer')] || []).push(x); });
  doldur(kutu,
    h('div', { class: 'baslik-satir' },
      h('h2', { class: 'ilk' }, t('Hizmetler')),
      duzenle ? h('button', { class: 'dugme kucuk-dugme', type: 'button', onclick: () => hizmetFormu(null, yenile, oran) }, t('+ Hizmet')) : null),
    duzenle ? h('div', { class: 'dugme-satir sol' }, h('button', { class: 'baglanti', type: 'button', onclick: () => grupYonetimi(oran, yenile) }, t('Oran grupları') + ' (' + (1 + oran.gruplar.length) + ')')) : null,
    liste.length === 0 ? paketKarti(duzenle, yenile) : null,
    Object.keys(gruplar).map(k => h('div', { class: 'grup' },
      h('div', { class: 'grup-baslik' }, k),
      gruplar[k].map(x => hizmetKarti(x, duzenle, yenile, oran)))));
}

function hizmetKarti(x, duzenle, yenile, oran) {
  const bekleme = (x.asamalar || []).some(a => a.tur === 'bekleme');
  return h('div', { class: 'kart hizmet' + (x.aktif ? '' : ' pasif') },
    h('div', { class: 'uye-ust' }, h('strong', null, x.ad), h('span', null, x.fiyat > 0 ? para(x.fiyat) : h('span', { class: 'rozet uyari-rozet' }, t('Fiyat girin')))),
    h('div', { class: 'uye-alt' },
      h('span', { class: 'soluk' }, x.sure + ' ' + t('dk')),
      h('span', null, bekleme ? h('span', { class: 'rozet' }, t('Bekleme aşamalı')) : null, x.aktif ? null : h('span', { class: 'rozet pasif-rozet' }, t('Pasif')), x.oranGrup ? h('span', { class: 'rozet' }, grupAdi(oran.gruplar, x.oranGrup)) : null)),
    duzenle ? h('button', { class: 'dugme ikincil kucuk-dugme', type: 'button', onclick: () => hizmetFormu(x, yenile, oran) }, t('Düzenle')) : null);
}

function paketKarti(duzenle, yenile) {
  if (!duzenle) return h('p', { class: 'soluk' }, t('Henüz hizmet eklenmemiş.'));
  return h('div', { class: 'kart bilgi' },
    h('strong', null, t('Hızlı başla')),
    h('p', null, t('Hazır bir paketle başlayın, sonra fiyatları ve süreleri kendinize göre düzenleyin. Fiyatlar boş (0) gelir.')),
    h('div', { class: 'dugme-yigin' }, PAKETLER.map(p => h('button', { class: 'dugme ikincil', type: 'button',
      onclick: (e) => kilitli(e.currentTarget, async () => {
        try {
          const b = writeBatch(db);
          p.hizmetler.forEach(x => b.set(doc(collection(db, 'salons', S.salon.id, 'hizmetler')), {
            ad: t(x.ad), kategori: t(x.kategori), fiyat: 0, sure: x.sure, asamalar: (x.asamalar || []).map(a => ({ ...a, ad: t(a.ad) })), aktif: true, ...(x.kategori === 'Boya' ? { oranGrup: 'malzemeli' } : {}), guncelleme: serverTimestamp()
          }));
          kayit(b, 'Hazır paket: ' + p.ad);
          await b.commit(); bildir(t('Hizmetler eklendi. Fiyatları girmeyi unutmayın.')); yenile(true);
        } catch (err) { console.error(err); bildir(hataMetni(err), 'hata'); }
      }) }, t(p.ad) + ' (' + p.hizmetler.length + ')'))));
}

function hizmetFormu(x, yenile, oran) {
  const yeni = !x;
  const ad = h('input', { type: 'text', value: x ? x.ad : '', maxlength: 60, placeholder: t('örn. Dip boya'), required: true });
  const kat = h('input', { type: 'text', value: x ? x.kategori : '', maxlength: 40, placeholder: t('örn. Boya'), list: 'kategori-listesi' });
  const katListe = h('datalist', { id: 'kategori-listesi' }, ['Kesim', 'Şekillendirme', 'Boya', 'Bakım', 'Tırnak', 'Güzellik'].map(k => h('option', { value: k })));
  const fiyat = h('input', { type: 'text', inputmode: 'decimal', value: x ? String(x.fiyat).replace('.', ',') : '', placeholder: '0', required: true });
  const sure = h('input', { type: 'text', inputmode: 'numeric', value: x ? String(x.sure) : '30', required: true });
  const grupSec = h('select', { 'aria-label': t('Oran grubu') }, h('option', { value: '' }, t('Genel')), oran.gruplar.map(g => h('option', { value: g.id, selected: x && x.oranGrup === g.id }, g.ad)));
  const tekrar = h('input', { type: 'text', inputmode: 'numeric', value: x && x.tekrarHafta ? String(x.tekrarHafta) : '', placeholder: t('örn. 4 (boş bırakılabilir)'), maxlength: 2 });
  const aktif = h('input', { type: 'checkbox', id: 'hizmet-aktif', checked: x ? !!x.aktif : true });
  const asamaVar = h('input', { type: 'checkbox', id: 'asama-var', checked: !!(x && x.asamalar && x.asamalar.length) });
  let asamalar = x && x.asamalar ? x.asamalar.map(a => ({ ...a })) : [];
  const asamaKutu = h('div', { class: 'asamalar' });
  const hata = h('div', { class: 'hata', role: 'alert' });
  const dugme = h('button', { class: 'dugme', type: 'submit' }, t('Kaydet'));
  const toplam = () => asamalar.reduce((s, a) => s + (Number(a.sure) || 0), 0);

  const asamaCiz = () => {
    doldur(asamaKutu);
    if (!asamaVar.checked) { sure.disabled = false; return; }
    if (!asamalar.length) asamalar = [B('Hazırlık', 'mesgul', 30), B('Bekleme', 'bekleme', 30), B('Bitiş', 'mesgul', 30)];
    sure.disabled = true; sure.value = String(toplam());
    doldur(asamaKutu,
      h('p', { class: 'kucuk' }, t('Her aşamayı ve süresini yazın. "Bekleme" aşamasında usta başka bir müşteriye bakabilir; takvimde yalnız "Usta çalışıyor" aşamaları kilitlenir.')),
      asamalar.map((a, i) => {
        const adK = h('input', { type: 'text', value: a.ad, maxlength: 40, placeholder: t('Aşama adı'), oninput: (e) => { a.ad = e.target.value; } });
        const turK = h('select', { onchange: (e) => { a.tur = e.target.value; asamaCiz(); } }, Object.keys(TUR).map(k => h('option', { value: k, selected: k === a.tur }, t(TUR[k]))));
        const sK = h('input', { type: 'text', inputmode: 'numeric', value: String(a.sure), class: 'dar', 'aria-label': t('dakika'), oninput: (e) => { a.sure = parseInt(e.target.value, 10) || 0; sure.value = String(toplam()); } });
        return h('div', { class: 'asama' + (a.tur === 'bekleme' ? ' bekleme' : '') },
          h('div', { class: 'asama-ust' }, adK, sK, h('span', { class: 'kucuk' }, t('dk')),
            h('button', { class: 'ikon-dugme', type: 'button', 'aria-label': t('Aşamayı sil'), onclick: () => { asamalar.splice(i, 1); asamaCiz(); } }, '🗑')),
          turK);
      }),
      asamalar.length < 6 ? h('button', { class: 'dugme ikincil kucuk-dugme', type: 'button', onclick: () => { asamalar.push(B('', 'mesgul', 15)); asamaCiz(); } }, t('+ Aşama ekle')) : null);
  };
  asamaVar.addEventListener('change', asamaCiz);

  const icerik = h('div', null);
  const pencere = pencereAc(yeni ? t('Hizmet ekle') : t('Hizmeti düzenle'), icerik);
  icerik.append(h('form', { class: 'form', novalidate: true,
    onsubmit: (e) => {
      e.preventDefault(); hata.textContent = '';
      const adT = ad.value.trim(), f = sayi(fiyat.value);
      if (adT.length < 2) { hata.textContent = t('Hizmetin adını yazın.'); return; }
      if (!Number.isFinite(f) || f < 0) { hata.textContent = t('Fiyatı yazın (yoksa 0).'); return; }
      let s, as = [];
      if (asamaVar.checked) {
        for (const a of asamalar) {
          if (!a.ad.trim()) { hata.textContent = t('Her aşamanın adını yazın.'); return; }
          if (!(a.sure >= 5)) { hata.textContent = t('Her aşama en az 5 dakika olmalı.'); return; }
        }
        as = asamalar.map(a => ({ ad: a.ad.trim(), tur: a.tur, sure: a.sure }));
        s = toplam();
      } else s = parseInt(sure.value, 10);
      if (!Number.isInteger(s) || s < 5 || s > 600) { hata.textContent = t('Süre 5 ile 600 dakika arasında olmalı.'); return; }
      const th = tekrar.value.trim() === '' ? 0 : parseInt(tekrar.value, 10);
      if (!Number.isInteger(th) || th < 0 || th > 52) { hata.textContent = t('Tekrar süresi 1 ile 52 hafta arasında olmalı.'); return; }
      kilitli(dugme, async () => {
        try {
          const ref = x ? doc(db, 'salons', S.salon.id, 'hizmetler', x.id) : doc(collection(db, 'salons', S.salon.id, 'hizmetler'));
          const b = writeBatch(db);
          b.set(ref, { ad: adT, kategori: kat.value.trim(), fiyat: f, sure: s, asamalar: as, aktif: aktif.checked, ...(grupSec.value ? { oranGrup: grupSec.value } : {}), ...(th > 0 ? { tekrarHafta: th } : {}), guncelleme: serverTimestamp() });
          kayit(b, (yeni ? 'Eklendi: ' : 'Değişti: ') + adT + ' ' + f + ' ' + sembol() + ', ' + s + ' dk');
          await b.commit(); pencere.kapat(); bildir(t('Kaydedildi')); yenile(true);
        } catch (err) { console.error(err); hata.textContent = hataMetni(err); }
      });
    } },
    h('label', null, t('Hizmetin adı'), ad),
    h('label', null, t('Grup'), kat), katListe,
    h('label', null, t('Fiyat (₺)'), fiyat),
    h('label', null, t('Usta oran grubu'), grupSec), h('p', { class: 'kucuk' }, t('Ustanın bu hizmetten alacağı yüzde, seçilen gruba göre belirlenir (Ustalar bölümünde her usta için yüzdeleri yazarsınız).')),
    h('label', null, t('Toplam süre (dakika)'), sure),
    h('label', null, t('Genelde kaç haftada bir tekrarlanır?'), tekrar), h('p', { class: 'kucuk' }, t('Randevuda "Sonraki ziyaret" için bu süre önerilir (örn. dip boya 4 hafta).')),
    h('label', { class: 'onay', for: 'asama-var' }, asamaVar, h('span', null, t('Bu hizmet aşamalı (örn. boya: sür, bekle, durula)'))),
    asamaKutu,
    h('label', { class: 'onay', for: 'hizmet-aktif' }, aktif, h('span', null, t('Aktif (pasif hizmet takvimde seçilemez)'))),
    hata, dugme));
  asamaCiz();
}

// Oran grupları: "Genel" her zaman vardır; yenileri eklenir, adı değiştirilir (kayıtların bozulmaması için silinmez)
function grupYonetimi(oran, yenile) {
  let gruplar = oran.gruplar.map(g => ({ ...g }));
  const kutu = h('div', { class: 'form' });
  const hata = h('div', { class: 'hata', role: 'alert' });
  const ciz = () => doldur(kutu,
    h('p', { class: 'kucuk' }, t('Hizmetleri gruplara ayırarak ustaya farklı yüzdeler verebilirsiniz (örn. boya işlemlerinde %40, diğerlerinde %50). "Genel" her zaman vardır; ustanın bir grup için yüzdesi boşsa Genel yüzdesi geçerli olur.')),
    h('div', { class: 'satir' }, h('strong', null, t('Genel')), h('span', { class: 'kucuk' }, t('(silinemez, her hizmet varsayılan olarak buradadır)'))),
    gruplar.map(g => h('div', { class: 'satir' }, h('input', { type: 'text', value: g.ad, maxlength: 30, 'aria-label': t('Grup adı'), oninput: (e) => { g.ad = e.target.value; } }))),
    gruplar.length < 8 ? h('button', { class: 'dugme ikincil kucuk-dugme', type: 'button', onclick: () => { gruplar.push({ id: yeniGrupId(), ad: '' }); ciz(); } }, t('+ Oran grubu ekle')) : null,
    hata);
  ciz();
  const k = h('button', { class: 'dugme', type: 'button' }, t('Kaydet'));
  let pen = null;
  k.onclick = () => kilitli(k, async () => {
    hata.textContent = '';
    const adlar = gruplar.map(g => g.ad.trim());
    if (adlar.some(a => a.length < 2)) { hata.textContent = t('Her grubun adını yazın (en az 2 harf).'); return; }
    if (new Set(adlar.map(a => a.toLocaleLowerCase('tr-TR'))).size !== adlar.length || adlar.some(a => a.toLocaleLowerCase('tr-TR') === 'genel')) { hata.textContent = t('Grup adları birbirinden farklı olmalı.'); return; }
    try { await oranKaydet({ gruplar: gruplar.map((g, i) => ({ id: g.id, ad: adlar[i] })) }, 'Oran grupları: ' + adlar.join(', ')); pen.kapat(); bildir(t('Kaydedildi')); yenile(true); }
    catch (err) { console.error(err); hata.textContent = hataMetni(err); }
  });
  pen = pencereAc(t('Oran grupları'), h('div', null, kutu, h('div', { class: 'dugme-satir' }, k)));
}

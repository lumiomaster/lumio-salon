import { t } from '../i18n.js';
import { h, doldur, hataMetni, bildir, kilitli, pencereAc, sayi } from '../util.js';
import { S } from '../durum.js';
import { auth, db, doc, collection, writeBatch, serverTimestamp, arrayUnion } from '../fb.js';
import { urunleriYukle } from '../veri.js';
import { formulStokYaz } from '../stok-yaz.js';
import { stokYazi } from '../stok-mantik.js';
import { aramaKutusu, ara, norm } from '../arama.js';


// ---- Formülde kullanılan ürünler (stoktan düşer) ----
// Satır: ürün seç + miktar (gram ürünlerde gram, adet ürünlerde adet). Stok miktarı kayıtla birlikte otomatik düşer.
export function urunYazisi(kayit) {
  return (kayit && kayit.urunler && kayit.urunler.length) ? kayit.urunler.map(x => x.ad + ' ' + x.miktar + ' ' + (x.birim === 'gram' ? 'gr' : 'adet')).join(' + ') : '';
}
// Bu telefonda hangi ürünü ne kadar sık seçtiği (boş aramada en çok kullanılanlar üstte çıksın)
const kullanimAnahtar = () => 'lumio_urun_kul_' + (S.salon ? S.salon.id : '') + '_' + (auth.currentUser ? auth.currentUser.uid : '');
function kullanimOku() { try { return JSON.parse(localStorage.getItem(kullanimAnahtar()) || '{}') || {}; } catch (_) { return {}; } }
function kullanimYaz(id) { try { const k = kullanimOku(); k[id] = (k[id] || 0) + 1; localStorage.setItem(kullanimAnahtar(), JSON.stringify(k)); } catch (_) { /* depolama yok */ } }
const HIZLI = { gram: [10, 20, 30, 40, 50, 60], adet: [1, 2, 3] };

// Ürün arama penceresi: yazdıkça filtreler, ürüne basınca miktar sorar, arka arkaya ürün eklenebilir.
// eklendi({urunId, miktar}) her eklemede çağrılır.
export function urunAramaPenceresi(urunler, mevcutId, eklendi) {
  const aktifler = (urunler || []).filter(x => x.aktif !== false);
  const icerik = h('div', { class: 'urun-arama' });
  const p = pencereAc(t('Ürün ekle'), icerik);
  const eklenenler = [];
  const liste = h('div', { class: 'arama-liste' });
  const durum = h('div', { class: 'kucuk arama-durum' });
  const kutu = aramaKutusu((q) => listele(q), t('Ürün ara (örn. 6.0, oksidan)'));
  const alan = (u) => ({ alanlar: [u.ad, u.kategori || '', u.marka || ''] });
  const stokMetin = (u) => stokYazi(u, u.stok);
  function listele(q) {
    const kul = kullanimOku();
    let l;
    if (!norm(q)) l = aktifler.slice().sort((a, b) => (kul[b.id] || 0) - (kul[a.id] || 0) || a.ad.localeCompare(b.ad)).slice(0, 12);
    else l = ara(aktifler, q, alan, 20);
    doldur(liste,
      l.map(u => h('button', { type: 'button', class: 'urun-kart' + (Number(u.stok) <= 0 ? ' soluk' : ''), onclick: () => miktarGoster(u) },
        h('span', { class: 'urun-ad' }, u.ad, !norm(q) && kul[u.id] ? h('span', { class: 'rozet' }, '★') : null),
        h('span', { class: 'kucuk' }, t('Kalan') + ': ' + stokMetin(u)))),
      !l.length ? h('p', { class: 'kucuk' }, t('Bulunamadı. Başka bir yazımla deneyin; ürün listede yoksa Salon > Stok bölümünden ekleyin.')) : null);
    durum.textContent = !norm(q) ? t('En çok kullandıklarınız üstte. Aramak için yazın.') : '';
  }
  function miktarGoster(u) {
    const gram = u.birim === 'gram';
    const girdi = h('input', { type: 'text', inputmode: 'decimal', placeholder: gram ? t('gram') : t('adet'), 'aria-label': t('Miktar') });
    const hata = h('div', { class: 'hata', role: 'alert' });
    const ekle = () => {
      const m = sayi(girdi.value);
      if (!(m > 0)) { hata.textContent = t('Miktarı yazın.'); return; }
      kullanimYaz(u.id);
      eklendi({ urunId: u.id, miktar: String(Math.round(m * 100) / 100).replace('.', ',') });
      eklenenler.push(u.ad + ' ' + (Math.round(m * 100) / 100) + ' ' + (gram ? 'gr' : t('adet')));
      anaGoster();
    };
    doldur(icerik,
      h('div', { class: 'kart' }, h('strong', null, u.ad), h('div', { class: 'kucuk' }, t('Kalan') + ': ' + stokMetin(u))),
      h('div', { class: 'hizli-miktar' }, (gram ? HIZLI.gram : HIZLI.adet).map(n => h('button', { type: 'button', class: 'dugme ikincil kucuk-dugme', onclick: () => { girdi.value = String(n); ekle(); } }, n + (gram ? ' gr' : '')))),
      h('label', null, gram ? t('Başka miktar (gram)') : t('Başka miktar (adet)'), girdi),
      hata,
      h('div', { class: 'dugme-satir' },
        h('button', { type: 'button', class: 'dugme ikincil', onclick: anaGoster }, t('Geri')),
        h('button', { type: 'button', class: 'dugme', onclick: ekle }, t('Ekle'))));
    setTimeout(() => { try { girdi.focus(); } catch (_) { /* odak yok */ } }, 50);
  }
  function anaGoster() {
    doldur(icerik,
      kutu,
      eklenenler.length ? h('div', { class: 'kart bilgi kucuk' }, '✓ ' + eklenenler.join(' · ')) : null,
      durum, liste,
      h('div', { class: 'dugme-satir' }, h('button', { type: 'button', class: 'dugme', onclick: p.kapat }, eklenenler.length ? t('Bitti') : t('Kapat'))));
    kutu.value = ''; listele('');
    setTimeout(() => { try { kutu.focus(); } catch (_) { /* odak yok */ } }, 50);
  }
  anaGoster();
}

export function formulUrunleri(baslangic) {
  const satirlar = (baslangic || []).map(x => ({ urunId: x.urunId, miktar: String(x.miktar).replace('.', ',') }));
  let urunler = null, yuklendi = false;
  const kutu = h('div', { class: 'formul-urunler' });
  const uOf = (id) => (urunler || []).find(x => x.id === id);
  const ciz = () => {
    doldur(kutu,
      satirlar.map((s, i) => { const u = uOf(s.urunId); return h('div', { class: 'formul-urun-satir' },
        h('span', { class: 'urun-ad' }, u ? u.ad : t('(silinmiş ürün)')),
        h('input', { type: 'text', inputmode: 'decimal', placeholder: u && u.birim === 'gram' ? t('gram') : t('adet'), value: s.miktar, 'aria-label': t('Miktar'), oninput: (e) => { s.miktar = e.target.value; } }),
        h('span', { class: 'kucuk' }, u ? (u.birim === 'gram' ? 'gr' : t('adet')) : ''),
        h('button', { class: 'ikon-dugme', type: 'button', 'aria-label': t('Satırı sil'), onclick: () => { satirlar.splice(i, 1); ciz(); } }, '🗑')); }),
      urunler && urunler.some(x => x.aktif !== false) ? h('button', { class: 'dugme ikincil kucuk-dugme arama-dugme', type: 'button',
        onclick: () => urunAramaPenceresi(urunler, null, (e) => {
          const var_ = satirlar.find(x => x.urunId === e.urunId);
          if (var_) var_.miktar = String((sayi(var_.miktar) || 0) + sayi(e.miktar)).replace('.', ',');
          else satirlar.push({ urunId: e.urunId, miktar: e.miktar });
          ciz();
        }) }, '🔍 ' + t('+ Ürün ekle (stoktan)')) : (yuklendi ? h('p', { class: 'kucuk' }, t('Stoktan düşmek için önce Salon > Stok bölümüne ürün ekleyin.')) : null));
  };
  ciz();
  urunleriYukle().then(l => { urunler = l; yuklendi = true; ciz(); }).catch(() => { yuklendi = true; ciz(); });
  return {
    el: kutu,
    ata: (liste) => { satirlar.length = 0; (liste || []).forEach(x => satirlar.push({ urunId: x.urunId, miktar: String(x.miktar).replace('.', ',') })); ciz(); },
    oku: () => {
      const out = [];
      for (const s of satirlar) {
        if (!s.urunId && !s.miktar) continue;
        const u = uOf(s.urunId), m = sayi(s.miktar);
        if (!s.urunId || !(m > 0)) return { hata: t('Ürün satırlarında ürünü seçip miktarı yazın.') };
        out.push({ urunId: s.urunId, ad: u ? u.ad : '?', miktar: Math.round(m * 100) / 100, birim: u ? u.birim : 'adet' });
      }
      return { urunler: out };
    }
  };
}

// Seçilen ürünlerden otomatik formül yazısı: "6.0 Boya 40 gr + 9% Oksidan 60 ml"
export function formulMetni(urunler) { return urunYazisi({ urunler }); }

// Bir randevu kaleminin (hizmetin) formül ve notunu kaydeder. Kayıt adı: randevu_kalemSırası
// (Boya formülü şimdilik serbest yazı; 6. teslimde "ürün + gram" satırlarına dönüşecek.)
export function formulFormu(randevu, i, mevcut, bitti) {
  const k = randevu.kalemler[i];
  const formul = h('textarea', { rows: 4, maxlength: 500, class: 'liste-metin', placeholder: t('örn. 6.0 boya 40 gr + 6.34 20 gr + 9% oksidan 60 ml') }, mevcut ? mevcut.formul : '');
  const not = h('input', { type: 'text', maxlength: 300, value: mevcut ? mevcut.not : '', placeholder: t('Not (örn. 20 dk bekledi, saç dökülmesi şikâyeti)') });
  const hata = h('div', { class: 'hata', role: 'alert' });
  const fu = formulUrunleri(mevcut ? mevcut.urunler : []);
  const dugme = h('button', { class: 'dugme', type: 'submit' }, t('Kaydet'));
  const icerik = h('div', null);
  const p = pencereAc(k.ad + ' · ' + randevu.musteriAd, icerik);
  icerik.append(h('form', { class: 'form', novalidate: true,
    onsubmit: (e) => {
      e.preventDefault(); hata.textContent = '';
      const fo = fu.oku(); if (fo.hata) { hata.textContent = fo.hata; return; }
      kilitli(dugme, async () => {
        try {
          const b = writeBatch(db);
          const iid = randevu.id + '_' + i;
          b.set(doc(db, 'salons', S.salon.id, 'islemler', iid), {
            musteriId: randevu.musteriId || '', ustaUid: k.ustaUid, rid: randevu.id, tarih: randevu.tarih, hizmet: k.ad,
            formul: formul.value.trim(), not: not.value.trim(), urunler: fo.urunler, guncelleme: serverTimestamp()
          });
          formulStokYaz(b, [{ islemId: iid, eski: mevcut ? mevcut.urunler : [], yeni: fo.urunler, ad: k.ad }]);
          await b.commit(); p.kapat(); bildir(t('Kaydedildi')); bitti();
        } catch (err) { console.error(err); hata.textContent = hataMetni(err); }
      });
    } },
    h('label', null, t('Formül'), formul), h('label', null, t('Kullanılan ürünler (stoktan düşer)'), fu.el), h('label', null, t('Not'), not), hata, dugme));
}

// Bu kişi bu kalemin formül/notunu yazabilir mi? (usta yalnız kendi kalemini; yönetici ve kıdemli hepsini)
export function formulYazabilir(k) {
  const rol = S.profil.rol;
  return rol === 'yonetici' || rol === 'kidemli' || rol === 'ortak' || (rol === 'usta' && k.ustaUid === auth.currentUser.uid);
}
// Formül/notu okuyabilen roller (sekreter okuyamaz)
export const formulOkur = () => ['yonetici', 'kidemli', 'ortak', 'usta'].includes(S.profil.rol);

// ---- Randevusuz / geçmiş işlem kaydı (müşteri defteri) ----
// Yönetici ve kıdemli kimin yaptığını seçer; usta kendi adına yazar; sekreter yazamaz.
export const islemYazarMi = () => ['yonetici', 'kidemli', 'ortak', 'usta'].includes(S.profil.rol);

export function islemAlanlari(uyeler) {
  const ben = auth.currentUser.uid;
  const adaylar = uyeler.filter(u => u.aktif && ['usta', 'kidemli', 'ortak', 'yonetici'].includes(u.rol));
  const bugun = new Date(); const iso = bugun.getFullYear() + '-' + String(bugun.getMonth() + 1).padStart(2, '0') + '-' + String(bugun.getDate()).padStart(2, '0');
  const tarih = h('input', { type: 'date', value: iso, max: iso });
  const usta = h('select', { disabled: S.profil.rol === 'usta' }, adaylar.map(u => h('option', { value: u.id, selected: u.id === ben }, u.ad)));
  if (S.profil.rol === 'usta') usta.value = ben;
  const hizmet = h('input', { type: 'text', maxlength: 60, placeholder: t('Yapılan işlem (örn. Dip boya + kesim)') });
  const formul = h('textarea', { rows: 3, maxlength: 500, class: 'liste-metin', placeholder: t('Formül (örn. 6.0 boya 40 gr + 9% oksidan 60 ml)') });
  const not = h('input', { type: 'text', maxlength: 300, placeholder: t('Not (isteğe bağlı)') });
  const sonraki = h('input', { type: 'date' });
  const fu = formulUrunleri([]);
  const el = h('div', null,
    h('div', { class: 'iki-sutun' }, h('label', null, t('İşlem tarihi'), tarih), h('label', null, t('İşlemi yapan'), usta)),
    h('label', null, t('Yapılan işlem'), hizmet), h('label', null, t('Formül'), formul), h('label', null, t('Kullanılan ürünler (stoktan düşer)'), fu.el), h('label', null, t('Not'), not),
    h('label', null, t('Sonraki ziyaret önerisi'), sonraki));
  // Boşsa null; doluysa kayıt. Hata varsa { hata }.
  const oku = () => {
    const doluMu = hizmet.value.trim() || formul.value.trim() || not.value.trim() || fu.oku().urunler?.length;
    if (!doluMu) return null;
    if (!hizmet.value.trim()) return { hata: t('Yapılan işlemin adını yazın.') };
    if (!tarih.value) return { hata: t('İşlem tarihini seçin.') };
    const fo = fu.oku(); if (fo.hata) return { hata: fo.hata };
    return { urunler: fo.urunler, tarih: tarih.value, ustaUid: S.profil.rol === 'usta' ? ben : usta.value, hizmet: hizmet.value.trim(), formul: formul.value.trim(), not: not.value.trim(), sonraki: sonraki.value || '' };
  };
  return { el, oku };
}

export function islemBelgesi(musteriId, v) {
  return { musteriId, ustaUid: v.ustaUid, rid: '', tarih: v.tarih, hizmet: v.hizmet, formul: v.formul, not: v.not, urunler: v.urunler || [], guncelleme: serverTimestamp() };
}

// Randevusuz işlemi yazar ve kullanılan ürünleri stoktan düşer
export function islemYaz(b, ref, belge) {
  b.set(ref, belge);
  formulStokYaz(b, [{ islemId: ref.id, eski: [], yeni: belge.urunler || [], ad: belge.hizmet }]);
}

// Var olan müşteriye geçmiş / randevusuz işlem ekler
export function elleIslemFormu(m, uyeler, bitti) {
  const a = islemAlanlari(uyeler);
  const hata = h('div', { class: 'hata', role: 'alert' });
  const dugme = h('button', { class: 'dugme', type: 'submit' }, t('Kaydet'));
  const icerik = h('div', null);
  const p = pencereAc(t('İşlem kaydı') + ' · ' + m.ad, icerik);
  icerik.append(h('form', { class: 'form', novalidate: true,
    onsubmit: (e) => {
      e.preventDefault(); hata.textContent = '';
      const v = a.oku();
      if (!v) { hata.textContent = t('İşlemi yazın.'); return; }
      if (v.hata) { hata.textContent = v.hata; return; }
      kilitli(dugme, async () => {
        try {
          const rol = S.profil.rol;
          const b = writeBatch(db);
          islemYaz(b, doc(collection(db, 'salons', S.salon.id, 'islemler')), islemBelgesi(m.id, v));
          // Müşteri kaydı: yönetici/kıdemli son ziyareti de işler; usta yalnız sonraki ziyaret önerisini
          const mref = doc(db, 'salons', S.salon.id, 'musteriler', m.id);
          if (rol !== 'usta') b.update(mref, { sonZiyaret: (m.sonZiyaret && m.sonZiyaret > v.tarih) ? m.sonZiyaret : v.tarih, sonraki: v.sonraki || m.sonraki || '', guncelleme: serverTimestamp() });
          else if (v.sonraki) b.update(mref, { sonraki: v.sonraki, guncelleme: serverTimestamp() });
          await b.commit();
          if (!m.ustalar.includes(v.ustaUid)) { const b2 = writeBatch(db); b2.update(mref, { ustalar: arrayUnion(v.ustaUid), guncelleme: serverTimestamp() }); await b2.commit(); }
          p.kapat(); bildir(t('Kaydedildi')); bitti();
        } catch (err) { console.error(err); hata.textContent = hataMetni(err); }
      });
    } }, a.el, hata, dugme));
}

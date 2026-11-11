import { t } from '../i18n.js';
import { h, doldur, hataMetni, bildir, kilitli, para, pencereAc, onayIste, lisansDurumu, telNormalize, telGoster } from '../util.js';
import { S } from '../durum.js';
import { randevuYazarMi, yetkiliMi } from '../roller.js';
import { auth, db, doc, collection, writeBatch, serverTimestamp, arrayUnion } from '../fb.js';
import { musterileriYukle, musteriGetir, musteriGeriGetir, musteriGecmisi, uyeleriYukle, ayariYukle, islemleriYukle } from '../veri.js';
import { tarihMetin, tarihEkle, tarihYazi, dkMetin, metinTarih } from '../takvim-mantik.js';
import { mesajGonder, gonderilmisYazi, mesajAnahtar, gonderimleriYukle } from '../mesaj-kayit.js';
import { hitap, mesajYap, waAc, waLink, tarihTR, dogumDuzenle } from '../mesaj.js';
import { formulFormu, formulYazabilir, formulOkur, islemAlanlari, islemBelgesi, islemYazarMi, elleIslemFormu } from './islem.js';
import { randevuFormu, takvimCtx } from './takvim.js';

const M = { ara: '' };

export function musterilerEkrani() {
  const kutu = h('div', { class: 'sayfa' }, h('h1', null, t('Müşteriler')), h('p', { class: 'soluk' }, t('Yükleniyor…')));
  const yenile = () => yukle(kutu, yenile);
  yenile();
  return kutu;
}

async function yukle(kutu, yenile) {
  try {
    const [liste, uyeler, ayar, G] = await Promise.all([musterileriYukle(), uyeleriYukle(), ayariYukle(), gonderimleriYukle().catch(() => ({}))]);
    ciz(kutu, liste, uyeler, ayar, yenile, G);
  } catch (e) {
    console.error(e);
    kutu.replaceChildren(h('h1', null, t('Müşteriler')), h('div', { class: 'uyari' }, hataMetni(e)), h('button', { class: 'dugme ikincil', type: 'button', onclick: yenile }, t('Tekrar dene')));
  }
}

const telLink = (d) => d ? '+' + d : '';
const sade = (x) => String(x || '').toLocaleLowerCase('tr').replace(/\s+/g, ' ');

function ciz(kutu, liste, uyeler, ayar, yenile, G) {
  const rol = S.profil.rol;
  const yazar = randevuYazarMi(rol) && lisansDurumu(S.salon).aktif;
  const ad = (uid) => (uyeler.find(x => x.id === uid) || { ad: '?' }).ad;
  const ara = h('input', { type: 'text', value: M.ara, placeholder: t('Ad ya da telefonla ara'), autocomplete: 'off' });
  const kutuListe = h('div', null);
  const goster = () => {
    const q = sade(M.ara), qd = M.ara.replace(/\D/g, '');
    const f = liste.filter(m => !q || sade(m.ad).includes(q) || (qd.length >= 3 && m.tel.includes(qd)));
    doldur(kutuListe,
      f.length === 0 ? h('p', { class: 'soluk' }, liste.length === 0 ? (rol === 'usta' ? t('Henüz hizmet verdiğiniz müşteri yok.') : t('Henüz müşteri yok. Randevu aldıkça burada birikir.')) : t('Eşleşen müşteri yok.')) : null,
      f.map(m => h('button', { class: 'kart musteri', type: 'button', onclick: () => ayrinti(m, ctxAl, ad, yenile) },
        h('div', { class: 'uye-ust' }, h('strong', null, (dogumBugunMu(m) ? '🎂 ' : '') + m.ad), m.tel ? h('span', { class: 'soluk kucuk' }, telGoster(m.tel)) : null),
        m.not ? h('div', { class: 'kucuk' }, m.not.length > 70 ? m.not.slice(0, 70) + '…' : m.not) : null,
        yetkiliMi(rol) && m.ustalar.length ? h('div', { class: 'kucuk' }, m.ustalar.map(ad).join(', ')) : null)));
  };
  const ctxAl = () => takvimCtx();
  ara.addEventListener('input', () => { M.ara = ara.value; goster(); });
  doldur(kutu,
    h('div', { class: 'baslik-satir' }, h('h1', null, t('Müşteriler')),
      yazar ? h('button', { class: 'dugme kucuk-dugme', type: 'button', onclick: () => yeniMusteri(yenile, uyeler) }, t('+ Müşteri')) : null),
    h('p', { class: 'kucuk' }, rol === 'usta' ? t('Hizmet verdiğiniz müşteriler. Yeni randevu aldığınızda müşteri size eklenir.') : t('{n} müşteri. Salonun ortak defteri.', { n: liste.length })),
    hatirlatmaKarti(liste, ayar, ctxAl, yenile, G),
    ara, kutuListe,
    yetkiliMi(rol) && liste.length ? h('div', { class: 'dugme-satir sol' }, h('button', { class: 'dugme ikincil kucuk-dugme', type: 'button', onclick: () => rehberCsv(liste) }, t('Müşteri rehberini indir (CSV)'))) : null,
    yetkiliMi(rol) && lisansDurumu(S.salon).aktif ? h('div', { class: 'kart bilgi' },
      h('strong', null, t('Ustanın müşteri listesi')),
      h('p', null, t('Salondan ayrılan usta kendi müşterilerinin isim ve telefonunu isterse, onayınızla buradan liste verirsiniz. İşlem kayda geçer.')),
      h('button', { class: 'dugme ikincil', type: 'button', onclick: () => ustaListesi(liste, uyeler) }, t('Liste hazırla'))) : null);
  goster();
}

function kayit(b, islem, hedef, ayrinti) {
  b.set(doc(collection(db, 'salons', S.salon.id, 'kayitlar')), { uid: auth.currentUser.uid, islem, hedef, ayrinti, zaman: serverTimestamp() });
}

function yeniMusteri(yenile, uyeler) {
  const islemA = islemYazarMi() ? islemAlanlari(uyeler) : null;
  const ad = h('input', { type: 'text', maxlength: 60, placeholder: t('Adı soyadı') });
  const tel = h('input', { type: 'tel', inputmode: 'tel', maxlength: 20, placeholder: t('Telefon (isteğe bağlı)') });
  const dogum = h('input', { type: 'text', maxlength: 10, placeholder: t('Doğum günü (GG.AA, isteğe bağlı)') });
  const not = h('input', { type: 'text', maxlength: 500, placeholder: t('Not (örn. alerji, tercih)') });
  const hata = h('div', { class: 'hata', role: 'alert' });
  const dugme = h('button', { class: 'dugme', type: 'submit' }, t('Kaydet'));
  const icerik = h('div', null);
  const p = pencereAc(t('Yeni müşteri'), icerik);
  icerik.append(h('form', { class: 'form', novalidate: true,
    onsubmit: (e) => {
      e.preventDefault(); hata.textContent = '';
      const a = ad.value.trim();
      if (a.length < 2) { hata.textContent = t('Müşterinin adını yazın.'); return; }
      let d = '';
      if (tel.value.trim()) { d = telNormalize(tel.value); if (!d) { hata.textContent = t('Telefon numarası geçersiz.'); return; } }
      const dg = dogumDuzenle(dogum.value);
      if (dg === null) { hata.textContent = t('Doğum gününü GG.AA yazın (örn. 07.03).'); return; }
      const iv = islemA ? islemA.oku() : null;
      if (iv && iv.hata) { hata.textContent = iv.hata; return; }
      kilitli(dugme, async () => {
        try {
          const benUsta = S.profil.rol === 'usta' ? [auth.currentUser.uid] : [];
          const b = writeBatch(db);
          let var_ = d ? await musteriGetir(d) : null;
          if (var_ && var_.silindi) {
            // Daha önce listeden kaldırılmış: geri getir (eski kayıtları da döner)
            await musteriGeriGetir(var_.id);
            p.kapat(); bildir(t('Bu müşteri daha önce silinmişti; geri getirildi.')); yenile(); return;
          }
          let mid;
          if (var_) {
            if (!benUsta.length || var_.ustalar.includes(benUsta[0])) { hata.textContent = t('Bu telefon zaten kayıtlı: {ad}', { ad: var_.ad }); return; }
            b.update(doc(db, 'salons', S.salon.id, 'musteriler', var_.id), { ustalar: arrayUnion(...benUsta), guncelleme: serverTimestamp() });
            mid = var_.id;
          } else {
            const ref = d ? doc(db, 'salons', S.salon.id, 'musteriler', d) : doc(collection(db, 'salons', S.salon.id, 'musteriler'));
            mid = ref.id;
            const ustalar = [...new Set([...benUsta, ...(iv ? [iv.ustaUid] : [])])];
            b.set(ref, { ad: a, tel: d, not: not.value.trim(), dogum: dg, sonraki: iv ? iv.sonraki : '', sonZiyaret: iv ? iv.tarih : '', ustalar, olusturan: auth.currentUser.uid, olusturma: serverTimestamp(), guncelleme: serverTimestamp() });
          }
          // Randevusuz yapılmış işlem varsa aynı anda deftere yazılır
          if (iv) b.set(doc(collection(db, 'salons', S.salon.id, 'islemler')), islemBelgesi(mid, iv));
          kayit(b, 'musteri_ekle', d || '-', a);
          await b.commit(); p.kapat(); bildir(t('Müşteri kaydedildi')); yenile();
        } catch (err) { console.error(err); hata.textContent = hataMetni(err); }
      });
    } },
    h('label', null, t('Müşteri'), ad), h('label', null, t('Telefon'), tel), h('label', null, t('Doğum günü'), dogum), h('label', null, t('Not'), not),
    islemA ? h('details', { class: 'islem-ac' }, h('summary', null, t('Bu müşteriye işlem yaptım (isteğe bağlı)')), islemA.el) : null,
    hata, dugme));
}

async function ayrinti(m, ctxAl, ad, yenile) {
  const rol = S.profil.rol, uid = auth.currentUser.uid;
  const duzenle = randevuYazarMi(rol) && lisansDurumu(S.salon).aktif && (rol !== 'usta' || m.ustalar.includes(uid));
  const icerik = h('div', null, h('p', { class: 'soluk' }, t('Yükleniyor…')));
  const p = pencereAc(m.ad, icerik);
  let g, islemler = [];
  try {
    g = await musteriGecmisi(m.id);
    if (formulOkur()) islemler = await islemleriYukle('musteriId', m.id);
  } catch (e) { console.error(e); doldur(icerik, h('div', { class: 'uyari' }, hataMetni(e))); return; }
  const adK = h('input', { type: 'text', maxlength: 60, value: m.ad, disabled: !duzenle });
  const telK = h('input', { type: 'tel', inputmode: 'tel', maxlength: 20, value: m.tel ? telGoster(m.tel) : '', disabled: !duzenle || !!m.tel, placeholder: t('Telefon yok') });
  const dogumK = h('input', { type: 'text', maxlength: 10, value: m.dogum || '', placeholder: 'GG.AA', disabled: !duzenle });
  const sonrakiK = h('input', { type: 'date', value: m.sonraki || '', disabled: !duzenle });
  const notK = h('input', { type: 'text', maxlength: 500, value: m.not || '', placeholder: t('Not (alerji, tercih, hatırlatma)'), disabled: !duzenle });
  const hata = h('div', { class: 'hata', role: 'alert' });
  const dugme = h('button', { class: 'dugme', type: 'submit' }, t('Kaydet'));
  const harcama = g.odemeler.filter(o => o.durum === 'gecerli').reduce((a, o) => a + o.toplam, 0);
  const ziyaret = g.randevular.filter(r => r.durum === 'odendi').length;
  const islemMap = {}; islemler.forEach(x => { islemMap[x.id] = x; });
  doldur(icerik,
    m.tel ? h('div', { class: 'dugme-satir sol' },
      h('a', { class: 'dugme ikincil kucuk-dugme', href: 'tel:' + telLink(m.tel) }, t('Ara')),
      h('a', { class: 'dugme ikincil kucuk-dugme', href: waLink(m.tel), target: '_blank', rel: 'noopener' }, 'WhatsApp'),
      duzenle ? h('button', { class: 'dugme kucuk-dugme', type: 'button', onclick: async () => {
        const ctx = await ctxAl(); p.kapat();
        randevuFormu(null, ctx, tarihMetin(new Date()), () => { bildir(t('Takvimde görebilirsiniz.')); }, { musteriAd: m.ad, musteriTel: m.tel, musteriId: m.id });
      } }, t('Randevu al')) : null) : null,
    h('form', { class: 'form', novalidate: true,
      onsubmit: (e) => {
        e.preventDefault(); hata.textContent = '';
        const a = adK.value.trim();
        if (a.length < 2) { hata.textContent = t('Müşterinin adını yazın.'); return; }
        let d = m.tel;
        if (!m.tel && telK.value.trim()) { d = telNormalize(telK.value); if (!d) { hata.textContent = t('Telefon numarası geçersiz.'); return; } }
        const dg = dogumDuzenle(dogumK.value);
        if (dg === null) { hata.textContent = t('Doğum gününü GG.AA yazın (örn. 07.03).'); return; }
        kilitli(dugme, async () => {
          try {
            const b = writeBatch(db);
            b.update(doc(db, 'salons', S.salon.id, 'musteriler', m.id), { ad: a, tel: d, not: notK.value.trim(), dogum: dg, sonraki: sonrakiK.value || '', guncelleme: serverTimestamp() });
            kayit(b, 'musteri_duzenle', m.id, a);
            await b.commit(); p.kapat(); bildir(t('Kaydedildi')); yenile();
          } catch (err) { console.error(err); hata.textContent = hataMetni(err); }
        });
      } },
      h('label', null, t('Ad'), adK), h('label', null, t('Telefon'), telK),
      h('div', { class: 'iki-sutun' }, h('label', null, t('Doğum günü'), dogumK), h('label', null, t('Sonraki ziyaret önerisi'), sonrakiK)),
      h('label', null, t('Not'), notK),
      hata, duzenle ? dugme : null),
    rol === 'usta' ? null : h('div', { class: 'kart kasa-ozet' },
      h('div', { class: 'hesap-satir' }, h('span', null, t('Tamamlanan ziyaret')), h('strong', null, ziyaret)),
      m.sonZiyaret ? h('div', { class: 'hesap-satir' }, h('span', null, t('Son ziyaret')), h('strong', null, tarihTR(m.sonZiyaret))) : null,
      h('div', { class: 'hesap-satir' }, h('span', null, t('Toplam harcama')), h('strong', null, para(harcama)))),
    yetkiliMi(rol) && m.ustalar.length ? h('p', { class: 'kucuk' }, t('Hizmet veren ustalar: ') + m.ustalar.map(ad).join(', ')) : null,
    h('h3', null, t('İşlem geçmişi')),
    duzenle && islemYazarMi() ? h('div', { class: 'dugme-satir sol' }, h('button', { class: 'dugme ikincil kucuk-dugme', type: 'button', onclick: async () => { p.kapat(); elleIslemFormu(m, await uyeleriYukle(), () => { bildir(t('Müşteri ayrıntısını yeniden açın.')); yenile(); }); } }, t('+ İşlem kaydı ekle (randevusuz)'))) : null,
    islemler.filter(x => !x.rid).sort((a, b) => b.tarih.localeCompare(a.tarih)).map(x => h('div', { class: 'gecmis-satir' },
      h('div', { class: 'hesap-satir' }, h('span', null, tarihTR(x.tarih)), h('span', { class: 'kucuk' }, ad(x.ustaUid))),
      h('div', { class: 'gecmis-kalem' }, h('div', null, h('b', null, x.hizmet)),
        x.formul ? h('div', { class: 'formul-yazi' }, h('b', null, t('Formül: ')), x.formul) : null,
        x.not ? h('div', { class: 'kucuk' }, t('Not: ') + x.not) : null))),
    g.randevular.length === 0 && !islemler.some(x => !x.rid) ? h('p', { class: 'soluk kucuk' }, t('Kayıtlı randevu yok.')) : null,
    g.randevular.map(r => h('div', { class: 'gecmis-satir' },
      h('div', { class: 'hesap-satir' },
        h('span', null, tarihTR(r.tarih) + ' ' + dkMetin(r.bas)),
        h('span', { class: 'kucuk' }, r.durum === 'iptal' ? t('İptal') : r.durum === 'odendi' ? t('Ödendi') : t('Bekliyor'))),
      r.durum === 'iptal' ? null : r.kalemler.map((k, i) => {
        const x = islemMap[r.id + '_' + i];
        return h('div', { class: 'gecmis-kalem' },
          h('div', null, h('b', null, k.ad), rol === 'usta' ? '' : ' · ' + ad(k.ustaUid), k.fiyat > 0 && rol !== 'usta' ? ' · ' + para(k.fiyat) : ''),
          x && x.formul ? h('div', { class: 'formul-yazi' }, h('b', null, t('Formül: ')), x.formul) : null,
          x && x.not ? h('div', { class: 'kucuk' }, t('Not: ') + x.not) : null,
          formulYazabilir(k) && lisansDurumu(S.salon).aktif ? h('button', { class: 'baglanti kucuk', type: 'button', onclick: () => { p.kapat(); formulFormu(r, i, x || null, () => { bildir(t('Müşteri ayrıntısını yeniden açın.')); }); } }, x ? t('Formül / notu düzenle') : t('Formül / not ekle')) : null);
      }))),
    yetkiliMi(rol) && lisansDurumu(S.salon).aktif ? h('div', { class: 'tehlike-kutu' },
      h('button', { class: 'dugme tehlike', type: 'button', onclick: async () => {
        if (!(await onayIste(t('"{ad}" müşteri listesinden kaldırılsın mı? Geçmiş kayıtları sistemde saklanır, yalnız uygulamada görünmez.', { ad: m.ad }), t('Evet, sil')))) return;
        try {
          const b = writeBatch(db);
          b.update(doc(db, 'salons', S.salon.id, 'musteriler', m.id), { silindi: true, guncelleme: serverTimestamp() });
          kayit(b, 'musteri_sil', m.id, m.ad);
          await b.commit(); p.kapat(); bildir(t('Müşteri silindi')); yenile();
        } catch (err) { console.error(err); bildir(hataMetni(err), 'hata'); }
      } }, t('Müşteriyi sil'))) : null);
}

function dogumBugunMu(m) {
  const b = new Date();
  return (m.dogum || '') === String(b.getDate()).padStart(2, '0') + '.' + String(b.getMonth() + 1).padStart(2, '0');
}

// LUMIO'daki "bildirim merkezi": bugün doğum günü olanlar, sonraki ziyareti yaklaşanlar, uzun süredir gelmeyenler
const GIZLI = 'lumio_salon_gizli_kayip';
function gizliOku() { try { return JSON.parse(sessionStorage.getItem(GIZLI) || '[]'); } catch (e) { return []; } }
function gizliYaz(l) { try { sessionStorage.setItem(GIZLI, JSON.stringify(l)); } catch (e) { /* önemli değil */ } }

export function hatirlatmaHesapla(liste, ayar, bugunTarih) {
  const kayipGun = (ayar && ayar.kayipGun) || 60;
  const bugun = bugunTarih || tarihMetin(new Date());
  const b = metinTarih(bugun);
  const gunAy = String(b.getDate()).padStart(2, '0') + '.' + String(b.getMonth() + 1).padStart(2, '0');
  const gun = (iso) => Math.round((metinTarih(iso) - b) / 864e5);
  // Doğum günü: bugün ve önümüzdeki 7 gün (yıl dönümünü de hesaba katar)
  const doganlar = liste.filter(m => /^\d\d\.\d\d$/.test(m.dogum || '')).map(m => {
    const g = Number(m.dogum.slice(0, 2)), a = Number(m.dogum.slice(3, 5));
    let hedef = new Date(b.getFullYear(), a - 1, g);
    if (hedef < b) hedef = new Date(b.getFullYear() + 1, a - 1, g);
    return { m, kalan: Math.round((hedef - b) / 864e5) };
  }).filter(x => x.kalan <= 7).sort((x, y) => x.kalan - y.kalan);
  const hatirlat = liste.filter(m => m.sonraki && gun(m.sonraki) >= 0 && gun(m.sonraki) <= 3).map(m => ({ m, kalan: gun(m.sonraki) }));
  const kayip = liste.filter(m => m.sonZiyaret && !(m.sonraki && m.sonraki >= bugun) && -gun(m.sonZiyaret) >= kayipGun)
    .map(m => ({ m, gecen: -gun(m.sonZiyaret) })).sort((x, y) => y.gecen - x.gecen);
  return { doganlar, hatirlat, kayip, kayipGun };
}

export function hatirlatmaKarti(liste, ayar, ctxAl, yenile, G) {
  G = G || {};
  const H = hatirlatmaHesapla(liste, ayar);
  const gizli = gizliOku();
  const kayip = H.kayip.filter(x => !gizli.includes(x.m.id));
  if (!H.doganlar.length && !H.hatirlat.length && !kayip.length) return null;
  // anahtar: aynı mesajın tekrarını ayırt eder. Gönderilmişse rozet ve "tekrar" uyarısı çıkar.
  const wa = (m, tur, anahtar, vars) => {
    if (!m.tel) return h('span', { class: 'kucuk' }, t('Telefon yok'));
    const g = G[mesajAnahtar(m.id, tur, anahtar)] || null;
    return h('span', { class: 'gonder-kutu' },
      g ? h('span', { class: 'rozet odendi-rozet gonderildi' }, '✓ ' + gonderilmisYazi(g)) : null,
      h('button', { class: 'dugme kucuk-dugme' + (g ? ' ikincil' : ''), type: 'button',
        onclick: () => mesajGonder({ musteriId: m.id, tel: m.tel, tur, anahtar, metin: mesajYap(tur, { MUSTERI_ADI: hitap(m.ad), ...vars }), onceki: g, yenile }) }, g ? t('Tekrar') : 'WhatsApp'));
  };
  const yilDe = (kalan) => String(new Date(Date.now() + kalan * 864e5).getFullYear());
  const satir = (m, alt, dugme) => h('div', { class: 'arama-satir' }, h('div', null, h('strong', null, m.ad), h('div', { class: 'kucuk' }, alt)), h('div', { class: 'arama-dugmeler' }, dugme));
  return h('div', { class: 'kart bilgi hatirlatma' },
    h('strong', null, t('Hatırlatmalar')),
    H.doganlar.some(x => x.kalan === 0) ? h('div', null, h('div', { class: 'kucuk ust-baslik' }, '🎂 ' + t('Bugün doğum günü')), H.doganlar.filter(x => x.kalan === 0).map(({ m }) => satir(m, m.tel ? telGoster(m.tel) : t('Telefon yok'), wa(m, 'dogum', yilDe(0))))) : null,
    H.doganlar.some(x => x.kalan > 0) ? h('div', null, h('div', { class: 'kucuk ust-baslik' }, '🎈 ' + t('Yaklaşan doğum günleri')), H.doganlar.filter(x => x.kalan > 0).map(({ m, kalan }) => satir(m, m.dogum + ' (' + (kalan === 1 ? t('yarın') : t('{n} gün kaldı', { n: kalan })) + ')', wa(m, 'dogum', yilDe(kalan))))) : null,
    H.hatirlat.length ? h('div', null, h('div', { class: 'kucuk ust-baslik' }, '📅 ' + t('Sonraki ziyareti yaklaşanlar')),
      H.hatirlat.map(({ m, kalan }) => satir(m, tarihTR(m.sonraki) + ' (' + (kalan === 0 ? t('bugün') : kalan === 1 ? t('yarın') : t('{n} gün kaldı', { n: kalan })) + ')', wa(m, 'takip', m.sonraki, { TARIH: tarihTR(m.sonraki) })))) : null,
    kayip.length ? h('div', null, h('div', { class: 'kucuk ust-baslik' }, '☕ ' + t('{n} gündür gelmeyenler', { n: H.kayipGun })),
      kayip.map(({ m, gecen }) => satir(m, t('Son ziyaret: {t} ({n} gün önce)', { t: tarihTR(m.sonZiyaret), n: gecen }),
        h('span', { class: 'arama-dugmeler' }, wa(m, 'davet', m.sonZiyaret || 'x'), h('button', { class: 'ikon-dugme', type: 'button', 'aria-label': t('Gizle'), onclick: () => { gizliYaz([...gizli, m.id]); yenile(); } }, '✕'))))) : null);
}

function rehberCsv(liste) {
  const q = (v) => { let x = String(v == null ? '' : v); if (/^[=+\-@\t\r]/.test(x)) x = "'" + x; return '"' + x.replace(/"/g, '""') + '"'; };
  const csv = '\ufeff' + [['Ad', 'Telefon', 'Doğum günü', 'Son ziyaret', 'Sonraki ziyaret önerisi', 'Not'].map(q).join(';')]
    .concat(liste.map(m => [m.ad, m.tel ? '+' + m.tel : '', m.dogum || '', m.sonZiyaret ? tarihTR(m.sonZiyaret) : '', m.sonraki ? tarihTR(m.sonraki) : '', m.not || ''].map(q).join(';'))).join('\r\n');
  const a = h('a', { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })), download: 'musteri-rehberi.csv' });
  document.body.append(a); a.click(); a.remove();
}

// Ayrılan usta için isim ve telefon listesi (yalnız yönetici / kıdemli; işlem kaydı tutulur)
function ustaListesi(liste, uyeler) {
  const adaylar = uyeler.filter(u => u.rol !== 'sekreter');
  const sec = h('select', null, h('option', { value: '' }, t('Usta seçin')), adaylar.map(u => h('option', { value: u.id }, u.ad + (u.aktif ? '' : ' (' + t('pasif') + ')'))));
  const sonuc = h('div', null);
  const icerik = h('div', null, h('label', null, t('Usta'), sec), sonuc);
  pencereAc(t('Ustanın müşteri listesi'), icerik);
  sec.addEventListener('change', () => {
    const u = adaylar.find(x => x.id === sec.value);
    if (!u) { doldur(sonuc); return; }
    const l = liste.filter(m => m.ustalar.includes(u.id));
    const metin = l.map(m => m.ad + (m.tel ? ' - ' + telGoster(m.tel) : '')).join('\n');
    const dugme = h('button', { class: 'dugme', type: 'button' }, t('Listeyi ver ve kaydet'));
    const cikti = h('div', null);
    dugme.addEventListener('click', () => kilitli(dugme, async () => {
      try {
        const b = writeBatch(db);
        kayit(b, 'musteri_aktarim', u.id, u.ad + ': ' + l.length + ' müşteri');
        await b.commit();
        doldur(cikti,
          h('textarea', { class: 'liste-metin', readonly: true, rows: 8 }, metin),
          h('div', { class: 'dugme-satir sol' },
            h('button', { class: 'dugme ikincil kucuk-dugme', type: 'button', onclick: () => { try { navigator.clipboard.writeText(metin); bildir(t('Kopyalandı')); } catch (e) { bildir(t('Metni elle seçip kopyalayın.'), 'hata'); } } }, t('Kopyala')),
            h('button', { class: 'dugme ikincil kucuk-dugme', type: 'button', onclick: () => {
              const csv = '﻿Ad;Telefon\n' + l.map(m => '"' + m.ad.replace(/"/g, '""') + '";' + (m.tel ? '+' + m.tel : '')).join('\n');
              const a = h('a', { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })), download: 'musteriler-' + u.ad.split(' ')[0] + '.csv' });
              document.body.append(a); a.click(); a.remove();
            } }, t('CSV indir'))),
          h('p', { class: 'kucuk' }, t('Bu işlem kayıtlara yazıldı.')));
      } catch (err) { console.error(err); bildir(hataMetni(err), 'hata'); }
    }));
    doldur(sonuc,
      h('p', null, t('{ad} için {n} müşteri bulundu.', { ad: u.ad, n: l.length })),
      l.length ? dugme : null, cikti);
  });
}

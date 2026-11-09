import { t } from '../i18n.js';
import { h, doldur, hataMetni, bildir, kilitli, para, pencereAc, lisansDurumu, telNormalize, telGoster } from '../util.js';
import { S } from '../durum.js';
import { randevuYazarMi, yetkiliMi } from '../roller.js';
import { auth, db, doc, collection, writeBatch, serverTimestamp, arrayUnion } from '../fb.js';
import { musterileriYukle, musteriGetir, musteriGecmisi, uyeleriYukle } from '../veri.js';
import { tarihMetin, tarihYazi, dkMetin } from '../takvim-mantik.js';
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
    const [liste, uyeler] = await Promise.all([musterileriYukle(), uyeleriYukle()]);
    ciz(kutu, liste, uyeler, yenile);
  } catch (e) {
    console.error(e);
    kutu.replaceChildren(h('h1', null, t('Müşteriler')), h('div', { class: 'uyari' }, hataMetni(e)), h('button', { class: 'dugme ikincil', type: 'button', onclick: yenile }, t('Tekrar dene')));
  }
}

const telLink = (d) => d ? '+' + d : '';
const sade = (x) => String(x || '').toLocaleLowerCase('tr').replace(/\s+/g, ' ');

function ciz(kutu, liste, uyeler, yenile) {
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
        h('div', { class: 'uye-ust' }, h('strong', null, m.ad), m.tel ? h('span', { class: 'soluk kucuk' }, telGoster(m.tel)) : null),
        m.not ? h('div', { class: 'kucuk' }, m.not.length > 70 ? m.not.slice(0, 70) + '…' : m.not) : null,
        yetkiliMi(rol) && m.ustalar.length ? h('div', { class: 'kucuk' }, m.ustalar.map(ad).join(', ')) : null)));
  };
  const ctxAl = () => takvimCtx();
  ara.addEventListener('input', () => { M.ara = ara.value; goster(); });
  doldur(kutu,
    h('div', { class: 'baslik-satir' }, h('h1', null, t('Müşteriler')),
      yazar ? h('button', { class: 'dugme kucuk-dugme', type: 'button', onclick: () => yeniMusteri(yenile) }, t('+ Müşteri')) : null),
    h('p', { class: 'kucuk' }, rol === 'usta' ? t('Hizmet verdiğiniz müşteriler. Yeni randevu aldığınızda müşteri size eklenir.') : t('{n} müşteri. Salonun ortak defteri.', { n: liste.length })),
    ara, kutuListe,
    yetkiliMi(rol) && lisansDurumu(S.salon).aktif ? h('div', { class: 'kart bilgi' },
      h('strong', null, t('Ustanın müşteri listesi')),
      h('p', null, t('Salondan ayrılan usta kendi müşterilerinin isim ve telefonunu isterse, onayınızla buradan liste verirsiniz. İşlem kayda geçer.')),
      h('button', { class: 'dugme ikincil', type: 'button', onclick: () => ustaListesi(liste, uyeler) }, t('Liste hazırla'))) : null);
  goster();
}

function kayit(b, islem, hedef, ayrinti) {
  b.set(doc(collection(db, 'salons', S.salon.id, 'kayitlar')), { uid: auth.currentUser.uid, islem, hedef, ayrinti, zaman: serverTimestamp() });
}

function yeniMusteri(yenile) {
  const ad = h('input', { type: 'text', maxlength: 60, placeholder: t('Adı soyadı') });
  const tel = h('input', { type: 'tel', inputmode: 'tel', maxlength: 20, placeholder: t('Telefon (isteğe bağlı)') });
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
      kilitli(dugme, async () => {
        try {
          const benUsta = S.profil.rol === 'usta' ? [auth.currentUser.uid] : [];
          const b = writeBatch(db);
          const var_ = d ? await musteriGetir(d) : null;
          if (var_) {
            if (!benUsta.length || var_.ustalar.includes(benUsta[0])) { hata.textContent = t('Bu telefon zaten kayıtlı: {ad}', { ad: var_.ad }); return; }
            b.update(doc(db, 'salons', S.salon.id, 'musteriler', var_.id), { ustalar: arrayUnion(...benUsta), guncelleme: serverTimestamp() });
          } else {
            const ref = d ? doc(db, 'salons', S.salon.id, 'musteriler', d) : doc(collection(db, 'salons', S.salon.id, 'musteriler'));
            b.set(ref, { ad: a, tel: d, not: not.value.trim(), ustalar: benUsta, olusturan: auth.currentUser.uid, olusturma: serverTimestamp(), guncelleme: serverTimestamp() });
          }
          kayit(b, 'musteri_ekle', d || '-', a);
          await b.commit(); p.kapat(); bildir(t('Müşteri kaydedildi')); yenile();
        } catch (err) { console.error(err); hata.textContent = hataMetni(err); }
      });
    } },
    h('label', null, t('Müşteri'), ad), h('label', null, t('Telefon'), tel), h('label', null, t('Not'), not), hata, dugme));
}

async function ayrinti(m, ctxAl, ad, yenile) {
  const rol = S.profil.rol, uid = auth.currentUser.uid;
  const duzenle = randevuYazarMi(rol) && lisansDurumu(S.salon).aktif && (rol !== 'usta' || m.ustalar.includes(uid));
  const icerik = h('div', null, h('p', { class: 'soluk' }, t('Yükleniyor…')));
  const p = pencereAc(m.ad, icerik);
  let g;
  try { g = await musteriGecmisi(m.id); } catch (e) { console.error(e); doldur(icerik, h('div', { class: 'uyari' }, hataMetni(e))); return; }
  const adK = h('input', { type: 'text', maxlength: 60, value: m.ad, disabled: !duzenle });
  const telK = h('input', { type: 'tel', inputmode: 'tel', maxlength: 20, value: m.tel ? telGoster(m.tel) : '', disabled: !duzenle || !!m.tel, placeholder: t('Telefon yok') });
  const notK = h('input', { type: 'text', maxlength: 500, value: m.not || '', placeholder: t('Not (alerji, tercih, hatırlatma)'), disabled: !duzenle });
  const hata = h('div', { class: 'hata', role: 'alert' });
  const dugme = h('button', { class: 'dugme', type: 'submit' }, t('Kaydet'));
  const harcama = g.odemeler.filter(o => o.durum === 'gecerli').reduce((a, o) => a + o.toplam, 0);
  const ziyaret = g.randevular.filter(r => r.durum === 'odendi').length;
  doldur(icerik,
    m.tel ? h('div', { class: 'dugme-satir sol' },
      h('a', { class: 'dugme ikincil kucuk-dugme', href: 'tel:' + telLink(m.tel) }, t('Ara')),
      h('a', { class: 'dugme ikincil kucuk-dugme', href: 'https://wa.me/' + m.tel, target: '_blank', rel: 'noopener' }, 'WhatsApp'),
      duzenle ? h('button', { class: 'dugme kucuk-dugme', type: 'button', onclick: async () => {
        const ctx = await takvimCtx(); p.kapat();
        randevuFormu(null, ctx, tarihMetin(new Date()), () => { bildir(t('Takvimde görebilirsiniz.')); }, { musteriAd: m.ad, musteriTel: m.tel, musteriId: m.id });
      } }, t('Randevu al')) : null) : null,
    h('form', { class: 'form', novalidate: true,
      onsubmit: (e) => {
        e.preventDefault(); hata.textContent = '';
        const a = adK.value.trim();
        if (a.length < 2) { hata.textContent = t('Müşterinin adını yazın.'); return; }
        let d = m.tel;
        if (!m.tel && telK.value.trim()) { d = telNormalize(telK.value); if (!d) { hata.textContent = t('Telefon numarası geçersiz.'); return; } }
        kilitli(dugme, async () => {
          try {
            const b = writeBatch(db);
            b.update(doc(db, 'salons', S.salon.id, 'musteriler', m.id), { ad: a, tel: d, not: notK.value.trim(), guncelleme: serverTimestamp() });
            kayit(b, 'musteri_duzenle', m.id, a);
            await b.commit(); p.kapat(); bildir(t('Kaydedildi')); yenile();
          } catch (err) { console.error(err); hata.textContent = hataMetni(err); }
        });
      } },
      h('label', null, t('Ad'), adK), h('label', null, t('Telefon'), telK), h('label', null, t('Not'), notK),
      hata, duzenle ? dugme : null),
    rol === 'usta' ? null : h('div', { class: 'kart kasa-ozet' },
      h('div', { class: 'hesap-satir' }, h('span', null, t('Tamamlanan ziyaret')), h('strong', null, ziyaret)),
      h('div', { class: 'hesap-satir' }, h('span', null, t('Toplam harcama')), h('strong', null, para(harcama)))),
    yetkiliMi(rol) && m.ustalar.length ? h('p', { class: 'kucuk' }, t('Hizmet veren ustalar: ') + m.ustalar.map(ad).join(', ')) : null,
    h('h3', null, t('Randevu geçmişi')),
    g.randevular.length === 0 ? h('p', { class: 'soluk kucuk' }, t('Kayıtlı randevu yok.')) : null,
    g.randevular.map(r => h('div', { class: 'hesap-satir' },
      h('span', null, tarihYazi(r.tarih).split(' ').slice(0, 2).join(' ') + ' ' + dkMetin(r.bas) + ' · ' + r.kalemler.map(k => k.ad).join(', ')),
      h('span', { class: 'kucuk' }, r.durum === 'iptal' ? t('İptal') : r.durum === 'odendi' ? t('Ödendi') : t('Bekliyor')))));
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

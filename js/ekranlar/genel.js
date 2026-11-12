import { t } from '../i18n.js';
import { h, doldur, hataMetni, bildir, kilitli, sayi, lisansDurumu } from '../util.js';
import { S } from '../durum.js';
import { yetkiliMi } from '../roller.js';
import { auth, db, doc, collection, writeBatch, serverTimestamp } from '../fb.js';
import { ayariYukle, musterileriYukle, tumRandevulariYukle, eskiRandevulariYukle, donemiYukle, donemOdemeleriniYukle, donemUstaSatirBelgeleriniYukle, randevulariYukle, kilitleriYukle } from '../veri.js';
import { tarihMetin, tarihEkle } from '../takvim-mantik.js';
import { tesvikAyari } from '../tesvik.js';
import { sadakatAyari } from '../sadakat-ayar.js';
import { baglantiAyarla } from '../mesaj.js';

const ADIMLAR = [5, 10, 15, 20, 30, 60];

export function genelEkrani() {
  const kutu = h('div', null, h('p', { class: 'soluk' }, t('Yükleniyor…')));
  ayariYukle().then(a => ciz(kutu, a)).catch(e => kutu.replaceChildren(h('div', { class: 'uyari' }, hataMetni(e))));
  return kutu;
}

function ciz(kutu, ayar) {
  const yetkili = yetkiliMi(S.profil.rol);
  const kapali = !yetkili || !lisansDurumu(S.salon).aktif;
  const pos = h('input', { type: 'text', inputmode: 'decimal', value: ayar ? String(ayar.posOrani).replace('.', ',') : '', placeholder: 'örn. 2,5', disabled: kapali });
  const adim = h('select', { disabled: kapali }, ADIMLAR.map(a => h('option', { value: String(a), selected: a === (ayar ? ayar.randevuAdimi : 15) }, a + ' ' + t('dakika'))));
  const kayip = h('input', { type: 'text', inputmode: 'numeric', value: String(ayar && ayar.kayipGun ? ayar.kayipGun : 60), disabled: kapali });
  const tel = h('input', { type: 'tel', inputmode: 'tel', value: ayar ? ayar.salonTel : '', placeholder: t('Salonun telefonu (isteğe bağlı)'), maxlength: 30, disabled: kapali });
  const ig = h('input', { type: 'text', value: ayar && ayar.instagram || '', placeholder: 'instagram.com/hesabiniz', maxlength: 200, disabled: kapali });
  const gl = h('input', { type: 'text', value: ayar && ayar.googleLink || '', placeholder: 'https://g.page/r/...', maxlength: 300, disabled: kapali });
  const banka = h('input', { type: 'text', value: ayar && ayar.bankaAdi || '', placeholder: t('Banka adı'), maxlength: 80, disabled: kapali });
  const hsahip = h('input', { type: 'text', value: ayar && ayar.hesapSahibi || '', placeholder: t('Hesap sahibi'), maxlength: 80, disabled: kapali });
  const iban = h('input', { type: 'text', value: ayar && ayar.iban || '', placeholder: 'TR00 0000 0000 0000 0000 0000 00', maxlength: 60, disabled: kapali });
  const hata = h('div', { class: 'hata', role: 'alert' });
  const dugme = h('button', { class: 'dugme', type: 'submit', disabled: kapali }, t('Kaydet'));
  doldur(kutu, h('form', { class: 'kart form', novalidate: true,
    onsubmit: (e) => {
      e.preventDefault(); hata.textContent = '';
      const p = sayi(pos.value);
      const kg = parseInt(kayip.value, 10);
      if (!Number.isInteger(kg) || kg < 7 || kg > 730) { hata.textContent = t('Kayıp müşteri günü 7 ile 730 arasında olmalı.'); return; }
      if (!Number.isFinite(p) || p < 0 || p > 20) { hata.textContent = t('Kart komisyon oranı 0 ile 20 arasında bir sayı olmalı. Yoksa 0 yazın.'); return; }
      kilitli(dugme, async () => {
        try {
          const veri = { posOrani: p, randevuAdimi: Number(adim.value), salonTel: tel.value.trim(), kayipGun: parseInt(kayip.value, 10), instagram: ig.value.trim(), googleLink: gl.value.trim(), bankaAdi: banka.value.trim(), hesapSahibi: hsahip.value.trim(), iban: iban.value.trim(), guncelleme: serverTimestamp() };
          const b = writeBatch(db);
          b.set(doc(db, 'salons', S.salon.id, 'ayarlar', 'genel'), veri);
          b.set(doc(collection(db, 'salons', S.salon.id, 'kayitlar')), {
            uid: auth.currentUser.uid, islem: 'ayar_genel', hedef: S.salon.id, ayrinti: 'Kart komisyonu %' + p + ', adım ' + adim.value + ' dk', zaman: serverTimestamp()
          });
          await b.commit();
          await ayariYukle(true);
          baglantiAyarla(veri);
          bildir(t('Kaydedildi'));
        } catch (err) { console.error(err); hata.textContent = hataMetni(err); }
      });
    } },
    h('h2', { class: 'ilk' }, t('Genel ayarlar')),
    h('label', null, t('Kart (POS) komisyon oranı, %'), pos),
    h('p', { class: 'kucuk' }, t('Kartla alınan ödemelerden bu oran önce düşülür, kalan tutar ustanın yüzdesine göre bölünür. Usta ve salon komisyonu birlikte taşır.')),
    h('label', null, t('Takvimde randevu adımı'), adim),
    h('label', null, t('Kayıp müşteri alarmı (kaç gündür gelmeyen), gün'), kayip),
    h('p', { class: 'kucuk' }, t('Müşteriler sekmesinde, bu kadar gündür gelmeyen müşteriler "geri çağır" listesine düşer.')),
    h('label', null, t('Salon telefonu'), tel),
    h('h3', null, t('Mesajlarda kullanılan bağlantılar')),
    h('label', null, t('Instagram adresi'), ig),
    h('label', null, t('Google puanlama linki'), gl),
    h('p', { class: 'kucuk' }, t('Google Haritalar > işletmeniz > "Yorum isteyin" bölümündeki bağlantıdır. Müşteriye puanlama ve Instagram mesajlarında kullanılır.')),
    h('label', null, t('Banka adı'), banka),
    h('label', null, t('Hesap sahibi'), hsahip),
    h('label', null, t('IBAN / hesap no'), iban),
    h('p', { class: 'kucuk' }, t('Müşteriye ödeme bilgisi gönderirken kullanılır.')),
    hata, kapali ? null : dugme,
    yetkili ? null : h('p', { class: 'kucuk' }, t('Bu ayarları yönetici ya da kıdemli yetkili değiştirir.'))),
    yetkili && !kapali ? tesvikKarti() : null,
    yetkili && !kapali ? sadakatKarti() : null,
    yetkili && !kapali ? bakimKarti() : null);
}

// Çapraz satış primi ve aylık hedefler (ayar penceresini açar)
function tesvikKarti() {
  return h('div', { class: 'kart' }, h('h2', { class: 'ilk' }, t('Çapraz satış ve hedefler')),
    h('p', { class: 'kucuk' }, t('Müşteri yönlendiren ya da ürün satan ustaları teşvik edin: çapraz satış primi ve aylık hedef ödülleri.')),
    h('button', { class: 'dugme ikincil', type: 'button', onclick: () => tesvikAyari() }, t('Ayarla')));
}

// Sadakat ödülü: ziyaret sayısı / harcamaya bağlı indirim
function sadakatKarti() {
  return h('div', { class: 'kart' }, h('h2', { class: 'ilk' }, t('Sadakat ödülü')),
    h('p', { class: 'kucuk' }, t('Müşterilerinizi ziyaret sayısına ya da harcamasına göre ödüllendirin: ör. her 10 ziyarette %10 indirim.')),
    h('button', { class: 'dugme ikincil', type: 'button', onclick: () => sadakatAyari() }, t('Ayarla')));
}

// Eski (usta alanı eklenmeden önce alınmış) randevuları yeni düzene çevirir: ustalar kendi randevularını görebilsin.
function bakimKarti() {
  const durum = h('p', { class: 'kucuk' });
  const dugme = h('button', { class: 'dugme ikincil', type: 'button', onclick: () => kilitli(dugme, async () => {
    try {
      const eski = await eskiRandevulariYukle();
      if (!eski.length) { durum.textContent = t('Güncellenecek eski randevu yok.'); return; }
      for (let i = 0; i < eski.length; i += 400) {
        const b = writeBatch(db);
        eski.slice(i, i + 400).forEach(r => b.update(doc(db, 'salons', S.salon.id, 'randevular', r.id), { ustalar: [...new Set((r.kalemler || []).map(k => k.ustaUid))], guncelleme: serverTimestamp() }));
        await b.commit();
      }
      durum.textContent = t('{n} eski randevu güncellendi.', { n: eski.length });
    } catch (err) { console.error(err); durum.textContent = hataMetni(err); }
  }) }, t('Eski randevuları yeni düzene çevir'));
  // Eski ödemelerde ustaya ait satır belgesi yoksa usta kazancını ve mutabakat düğmesini göremez; bu düğme onları üretir.
  const durum2 = h('p', { class: 'kucuk' });
  const dugme2 = h('button', { class: 'dugme ikincil', type: 'button', onclick: () => kilitli(dugme2, async () => {
    try {
      const donem = await donemiYukle();
      const [odemeler, satirlar] = await Promise.all([donemOdemeleriniYukle(donem), donemUstaSatirBelgeleriniYukle(donem)]);
      const var_ = new Set(satirlar.map(x => x.odemeId));
      const eksik = odemeler.filter(o => o.durum === 'gecerli' && !var_.has(o.id));
      let sayac = 0;
      for (const o of eksik) {
        const b = writeBatch(db);
        (o.kalemler || []).filter(k => k.ustaUid).forEach(k => {
          b.set(doc(collection(db, 'salons', S.salon.id, 'ustaSatirlari')), { ustaUid: k.ustaUid, odemeId: o.id, tarih: o.tarih, donem, musteriAd: o.musteriAd || '', ad: k.ad, tutar: k.hesap != null ? k.hesap : k.tutar, alis: k.alis || 0, tur: k.tur === 'urun' ? 'urun' : 'hizmet', yontem: o.yontem, komisyonOrani: o.komisyonOrani || 0, durum: 'gecerli' });
          sayac++;
        });
        await b.commit();
      }
      durum2.textContent = eksik.length ? t('{n} eski ödeme ustalara yansıtıldı.', { n: eksik.length }) : t('Güncellenecek eski ödeme yok.');
    } catch (err) { console.error(err); durum2.textContent = hataMetni(err); }
  }) }, t('Eski ödemeleri ustalara yansıt'));
  // Takvim kilitleri: bekleyen randevuların kilitlerinden eksik olan varsa tamamlar (ustalar birbirinin dolu saatini doğru görsün)
  const durum3 = h('p', { class: 'kucuk' });
  const dugme3 = h('button', { class: 'dugme ikincil', type: 'button', onclick: () => kilitli(dugme3, async () => {
    try {
      const bugun = tarihMetin(new Date());
      const rs = (await randevulariYukle(tarihEkle(bugun, -1), tarihEkle(bugun, 90))).filter(r => r.durum === 'bekliyor' && Array.isArray(r.kilitler));
      let eklenen = 0;
      for (const g of [...new Set(rs.map(r => r.tarih))]) {
        const m = await kilitleriYukle(g);
        for (const r of rs.filter(x => x.tarih === g)) {
          const eksik = r.kilitler.filter(k => !m[k]);
          for (let i = 0; i < eksik.length; i += 10) {
            const b = writeBatch(db);
            eksik.slice(i, i + 10).forEach(k => b.set(doc(db, 'salons', S.salon.id, 'slotlar', k), { rid: r.id, ustaUid: k.split('_')[0], tarih: g }));
            await b.commit(); eklenen += Math.min(10, eksik.length - i);
          }
        }
      }
      durum3.textContent = eklenen ? t('{n} eksik takvim kilidi tamamlandı.', { n: eklenen }) : t('Eksik kilit yok, takvim sağlam.');
    } catch (err) { console.error(err); durum3.textContent = hataMetni(err); }
  }) }, t('Takvim kilitlerini kontrol et'));
  // Müşteri defteri: randevuda adı geçen ama defterde olmayan müşterileri ekler (aynı ad = aynı kişi, telefon varsa telefon esas)
  const durum4 = h('p', { class: 'kucuk' });
  const dugme4 = h('button', { class: 'dugme ikincil', type: 'button', onclick: () => kilitli(dugme4, async () => {
    try {
      const [rs, ms] = await Promise.all([tumRandevulariYukle(), musterileriYukle()]);
      const norm = (x) => (x || '').toLocaleLowerCase('tr').replace(/\s+/g, ' ').trim();
      const telVar = new Set(ms.map(m => m.tel).filter(Boolean)), adVar = new Set(ms.map(m => norm(m.ad)));
      const yeniler = new Map();
      rs.filter(r => r.durum !== 'iptal' && (r.musteriAd || '').trim().length >= 2).sort((a, b) => (a.tarih < b.tarih ? 1 : -1)).forEach(r => {
        const tel = r.musteriTel || '', anahtar = tel ? 't' + tel : 'a' + norm(r.musteriAd);
        if (tel ? telVar.has(tel) : adVar.has(norm(r.musteriAd))) return;
        const m = yeniler.get(anahtar) || { ad: r.musteriAd.trim(), tel, ustalar: new Set(), sonZiyaret: '' };
        (r.ustalar || (r.kalemler || []).map(k => k.ustaUid)).forEach(u => m.ustalar.add(u));
        if (r.durum === 'odendi' && r.tarih > m.sonZiyaret) m.sonZiyaret = r.tarih;
        yeniler.set(anahtar, m);
      });
      const liste = [...yeniler.values()];
      for (let i = 0; i < liste.length; i += 200) {
        const b = writeBatch(db);
        liste.slice(i, i + 200).forEach(m => {
          const ref = m.tel ? doc(db, 'salons', S.salon.id, 'musteriler', m.tel) : doc(collection(db, 'salons', S.salon.id, 'musteriler'));
          b.set(ref, { ad: m.ad, tel: m.tel, not: '', dogum: '', sonraki: '', sonZiyaret: m.sonZiyaret, ustalar: [...m.ustalar].filter(Boolean), olusturan: auth.currentUser.uid, olusturma: serverTimestamp(), guncelleme: serverTimestamp() });
        });
        await b.commit();
      }
      durum4.textContent = liste.length ? t('{n} müşteri deftere eklendi.', { n: liste.length }) : t('Eksik müşteri yok, defter tam.');
    } catch (err) { console.error(err); durum4.textContent = hataMetni(err); }
  }) }, t('Eski randevulardan müşteri defterini tamamla'));
  return h('div', { class: 'kart bilgi' }, h('strong', null, t('Bakım')),
    h('p', null, t('Yeni sürüme geçmeden önce alınmış randevuları ustalar göremiyorsa bir kez basın.')), dugme, durum,
    h('p', null, t('Eski bir günün ödemesi için usta "Kazancım"da mutabakat düğmesini göremiyorsa (günün tutarı boş görünüyorsa) bir kez basın.')), dugme2, durum2,
    h('p', null, t('Başka ustalar bir randevunun dolu saatini eksik görüyorsa bir kez basın.')), dugme3, durum3,
    h('p', null, t('Randevu aldığınız bir kişi Müşteriler listesinde yoksa bir kez basın.')), dugme4, durum4);
}

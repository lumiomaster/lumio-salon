import { t } from '../i18n.js';
import { h, doldur, hataMetni, bildir, kilitli, para, pencereAc, lisansDurumu } from '../util.js';
import { S } from '../durum.js';
import { gorenMi } from '../roller.js';
import { auth, db, doc, writeBatch, serverTimestamp } from '../fb.js';
import { ayariYukle, donemiYukle, ustaSatirlariniYukle, mutabakatlarimiYukle, benimMalim, gunOdemeleriniYukle, gunMutabakatiniYukle, uyeleriYukle } from '../veri.js';
import { tarihMetin, tarihEkle, tarihYazi } from '../takvim-mantik.js';
import { ustaGunSatirlari, yuvarla } from '../kasa-mantik.js';
import { tarihTR } from '../mesaj.js';
import { goster } from '../main.js';
import { hesapAc } from './hesap.js';

// Ana sayfadaki mutabakat kartı.
//  - Usta: onayını bekleyen günler, tek dokunuşla Onaylıyorum / İtirazım var
//  - Yönetici, kıdemli, ortak: bugün ve dün kaç usta onayladı, kim bekliyor, kim itiraz etti
export function mutabakatKarti() {
  const kutu = h('div', null);
  const rol = S.profil.rol;
  const yenile = () => (rol === 'usta' ? ustaKarti(kutu, yenile) : gorenMi(rol) ? yoneticiKarti(kutu) : Promise.resolve()).catch(e => console.error(e));
  if (rol === 'usta' || gorenMi(rol)) yenile();
  return kutu;
}

async function yaz(uid, tarih, durum, not, tutar) {
  const b = writeBatch(db);
  b.set(doc(db, 'salons', S.salon.id, 'mutabakat', uid + '_' + tarih), { ustaUid: uid, tarih, durum, not: durum === 'itiraz' ? not : '', tutar, guncelleme: serverTimestamp() });
  await b.commit();
}

async function ustaKarti(kutu, yenile) {
  const uid = auth.currentUser.uid;
  const donem = await donemiYukle();
  const [odemeler, mutlar, mali, ayar] = await Promise.all([ustaSatirlariniYukle(donem, uid), mutabakatlarimiYukle(uid), benimMalim(uid), ayariYukle()]);
  if (!mali) return doldur(kutu);
  const taban = (ayar && ayar.urunTaban) || 'kar';
  const mut = {}; mutlar.forEach(m => { mut[m.tarih] = m; });
  const sinir = tarihEkle(tarihMetin(new Date()), -14);
  const gunler = [...new Set(odemeler.filter(o => o.durum === 'gecerli' && o.tarih >= sinir).map(o => o.tarih))].sort().reverse();
  const bekleyen = gunler.filter(g => !mut[g]);
  const itirazli = gunler.filter(g => mut[g] && mut[g].durum === 'itiraz');
  if (!bekleyen.length && !itirazli.length) return doldur(kutu);
  const lisansOk = lisansDurumu(S.salon).aktif;
  const pay = (g) => yuvarla(ustaGunSatirlari(odemeler, uid, g, mali, taban).reduce((a, x) => a + x.pay, 0));
  doldur(kutu, h('div', { class: 'kart bilgi mut-kart' },
    h('strong', null, t('Onayınızı bekleyen gün')),
    bekleyen.length ? h('p', { class: 'kucuk' }, t('Hesabı kontrol edin; doğruysa onaylayın, yanlışlık varsa itiraz edin.')) : null,
    bekleyen.map(g => {
      const p = pay(g);
      return h('div', { class: 'mut-gun-satir' },
        h('div', { class: 'uye-ust' }, h('strong', null, tarihYazi(g)), h('strong', null, para(p))),
        h('div', { class: 'dugme-satir sol' },
          lisansOk ? h('button', { class: 'dugme kucuk-dugme', type: 'button', onclick: (e) => kilitli(e.currentTarget, async () => { try { await yaz(uid, g, 'onay', '', p); bildir(t('Onayınız kaydedildi.')); yenile(); } catch (err) { console.error(err); bildir(hataMetni(err), 'hata'); } }) }, t('Onaylıyorum')) : null,
          lisansOk ? h('button', { class: 'dugme ikincil kucuk-dugme', type: 'button', onclick: () => itirazFormu(uid, g, p, yenile) }, t('İtirazım var')) : null));
    }),
    itirazli.map(g => h('div', { class: 'kucuk uyari-yazi' }, tarihTR(g) + ': ' + t('İtirazınız yöneticiye iletildi.') + ' “' + (mut[g].not || '') + '”'))));
}

function itirazFormu(uid, tarih, tutar, yenile) {
  const not = h('input', { type: 'text', maxlength: 200, placeholder: t('İtiraz nedeni (örn. Ayşe Hanım\'ın boyası eksik yazılmış)') });
  const hata = h('div', { class: 'hata', role: 'alert' });
  const dugme = h('button', { class: 'dugme', type: 'submit' }, t('İtirazı gönder'));
  const icerik = h('div', null);
  const p = pencereAc(t('İtiraz') + ' · ' + tarihTR(tarih), icerik);
  icerik.append(h('form', { class: 'form', novalidate: true,
    onsubmit: (e) => {
      e.preventDefault(); hata.textContent = '';
      if (not.value.trim().length < 3) { hata.textContent = t('İtiraz nedenini yazın.'); return; }
      kilitli(dugme, async () => {
        try { await yaz(uid, tarih, 'itiraz', not.value.trim(), tutar); p.kapat(); bildir(t('İtirazınız yöneticiye iletildi.')); yenile(); }
        catch (err) { console.error(err); hata.textContent = hataMetni(err); }
      });
    } }, h('label', null, t('Neden'), not), hata, dugme));
}

async function yoneticiKarti(kutu) {
  const bugun = tarihMetin(new Date());
  const [uyeler, ...gunler] = await Promise.all([uyeleriYukle(), ...[bugun, tarihEkle(bugun, -1)].map(async (g) => ({ g, odemeler: await gunOdemeleriniYukle(g), mut: await gunMutabakatiniYukle(g) }))]);
  const ad = (u) => ((uyeler.find(x => x.id === u) || { ad: '?' }).ad).split(' ')[0];
  const satirlar = gunler.map(({ g, odemeler, mut }) => {
    const ustalar = [...new Set(odemeler.filter(o => o.durum === 'gecerli').flatMap(o => (o.kalemler || []).map(k => k.ustaUid).filter(Boolean)))];
    if (!ustalar.length) return null;
    const m = {}; mut.forEach(x => { m[x.ustaUid] = x; });
    return { g, onay: ustalar.filter(u => m[u] && m[u].durum === 'onay'), itiraz: ustalar.filter(u => m[u] && m[u].durum === 'itiraz').map(u => ({ u, not: m[u].not })), bekleyen: ustalar.filter(u => !m[u]) };
  }).filter(Boolean);
  if (!satirlar.length) return doldur(kutu);
  doldur(kutu, h('div', { class: 'kart bilgi mut-kart' },
    h('strong', null, t('Usta mutabakatları')),
    h('p', { class: 'kucuk' }, t('Bir güne dokunarak o günün onaylamayan ustalarını açabilirsiniz.')),
    satirlar.map(x => {
      const kalan = [...x.bekleyen, ...x.itiraz.map(i => i.u)];
      return h('button', { class: 'mut-ozet tikla', type: 'button', onclick: () => hesapAc(x.g, kalan.length ? kalan : null) },
        h('div', { class: 'uye-ust' }, h('strong', null, (x.g === bugun ? t('Bugün') : t('Dün')) + ' ›'), h('span', { class: 'kucuk' }, t('{a} onayladı · {b} bekliyor · {c} itiraz', { a: x.onay.length, b: x.bekleyen.length, c: x.itiraz.length }))),
        x.bekleyen.length ? h('div', { class: 'kucuk' }, t('Bekleyen: ') + x.bekleyen.map(ad).join(', ')) : null,
        x.itiraz.map(i => h('div', { class: 'kucuk uyari-yazi' }, ad(i.u) + ': “' + i.not + '”')));
    }),
    h('div', { class: 'mut-dugmeler' }, h('button', { class: 'dugme ikincil kucuk-dugme', type: 'button', onclick: () => hesapAc(satirlar[0].g, null) }, t('Tüm usta hesaplarını aç')))));
}

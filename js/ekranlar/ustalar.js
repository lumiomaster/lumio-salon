import { t } from '../i18n.js';
import { ROLLER } from '../config.js';
import { h, doldur, hataMetni, bildir, kilitli, sayi, pencereAc, lisansDurumu } from '../util.js';
import { S } from '../durum.js';
import { yetkiliMi } from '../roller.js';
import { auth, db, doc, collection, writeBatch, serverTimestamp } from '../fb.js';
import { uyeleriYukle, ustalariYukle, hizmetleriYukle } from '../veri.js';
import { izinCakisanlariGoster } from './takvim.js';

export const GUNLER = [
  ['pzt', 'Pazartesi'], ['sal', 'Salı'], ['car', 'Çarşamba'], ['per', 'Perşembe'], ['cum', 'Cuma'], ['cmt', 'Cumartesi'], ['paz', 'Pazar']
];
export function varsayilanMesai() {
  const m = {};
  GUNLER.forEach(([k]) => { m[k] = { acik: k !== 'paz', bas: '09:00', bit: '19:00' }; });
  return m;
}

export function ustalarEkrani() {
  const kutu = h('div', null, h('p', { class: 'soluk' }, t('Yükleniyor…')));
  const yenile = (zorla) => Promise.all([uyeleriYukle(zorla), ustalariYukle(zorla), hizmetleriYukle(zorla)])
    .then(([uyeler, u, hizmetler]) => ciz(kutu, uyeler, u.profil, u.mali, hizmetler, yenile))
    .catch(e => { console.error(e); kutu.replaceChildren(h('div', { class: 'uyari' }, hataMetni(e))); });
  yenile(false);
  return kutu;
}

function calisiyorMu(u, profil) { return profil ? !!profil.calisir : u.rol === 'usta'; }

function ciz(kutu, uyeler, P, M, hizmetler, yenile) {
  const yetkili = yetkiliMi(S.profil.rol);
  const adaylar = uyeler.filter(u => u.rol !== 'sekreter');
  doldur(kutu,
    h('h2', { class: 'ilk' }, t('Ustalar')),
    h('p', { class: 'kucuk' }, t('Randevu alacak herkesin hizmetlerini, mesaisini ve payını buradan ayarlarsınız. Salonda çalışan yönetici, kıdemli yetkili ve ortak da "randevu alıyor" olarak işaretlenebilir.')),
    adaylar.length === 0 ? h('p', { class: 'soluk' }, t('Önce Ekip bölümünden usta ekleyin.')) : null,
    adaylar.map(u => ustaKarti(u, P[u.id], M[u.id], hizmetler, uyeler, yetkili, yenile)));
}

function ustaKarti(u, profil, mali, hizmetler, uyeler, yetkili, yenile) {
  const calisir = calisiyorMu(u, profil);
  const ayarli = !!profil && profil.hizmetler.length > 0;
  return h('div', { class: 'kart uye' + (u.aktif ? '' : ' pasif') },
    h('div', { class: 'uye-ust' }, h('strong', null, u.ad), h('span', { class: 'rozet rol-' + u.rol }, t(ROLLER[u.rol] || u.rol))),
    h('div', { class: 'uye-alt' },
      h('span', { class: 'soluk' }, calisir ? (ayarli ? profil.hizmetler.length + ' ' + t('hizmet') : t('Hizmet seçilmedi')) : t('Randevu almıyor')),
      h('span', null, calisir && !ayarli ? h('span', { class: 'rozet uyari-rozet' }, t('Ayarlanmadı')) : null,
        mali ? h('span', { class: 'rozet' }, '%' + mali.yuzde) : null)),
    h('button', { class: 'dugme ikincil kucuk-dugme', type: 'button', onclick: () => ustaFormu(u, profil, mali, hizmetler, yetkili, yenile) }, yetkili ? t('Ayarla') : t('Gör')));
}

function ustaFormu(u, profil, mali, hizmetler, yetkili, yenile) {
  const duzenle = yetkili && lisansDurumu(S.salon).aktif;
  const kapali = !duzenle;
  const calisir = h('input', { type: 'checkbox', id: 'usta-calisir', checked: calisiyorMu(u, profil), disabled: kapali });
  const secili = new Set(profil ? profil.hizmetler : []);
  const mesai = profil ? JSON.parse(JSON.stringify(profil.mesai)) : varsayilanMesai();
  GUNLER.forEach(([k]) => { if (!mesai[k]) mesai[k] = { acik: false, bas: '09:00', bit: '19:00' }; });
  let izinler = profil ? profil.izinler.map(i => ({ ...i })) : [];
  const yuzde = h('input', { type: 'text', inputmode: 'decimal', value: mali ? String(mali.yuzde).replace('.', ',') : '', placeholder: 'örn. 40', disabled: kapali });
  const urun = h('input', { type: 'text', inputmode: 'decimal', value: mali ? String(mali.urunPrimi).replace('.', ',') : '0', placeholder: '0', disabled: kapali });
  const hata = h('div', { class: 'hata', role: 'alert' });
  const dugme = h('button', { class: 'dugme', type: 'submit' }, t('Kaydet'));

  // Hizmet eşleştirme
  const hizmetKutu = h('div', { class: 'secim-liste' });
  const hizmetCiz = () => {
    doldur(hizmetKutu, hizmetler.length === 0
      ? h('p', { class: 'kucuk' }, t('Önce Hizmetler bölümünden hizmet ekleyin.'))
      : hizmetler.map(x => h('label', { class: 'onay' },
        h('input', { type: 'checkbox', checked: secili.has(x.id), disabled: kapali, onchange: (e) => { e.target.checked ? secili.add(x.id) : secili.delete(x.id); } }),
        h('span', null, x.ad, x.aktif ? '' : ' (' + t('pasif') + ')', h('small', { class: 'soluk' }, ' · ' + (x.kategori || '')))))
    );
  };
  hizmetCiz();

  // Mesai
  const mesaiKutu = h('div', { class: 'mesai' });
  const mesaiCiz = () => {
    doldur(mesaiKutu, GUNLER.map(([k, ad]) => {
      const m = mesai[k];
      return h('div', { class: 'mesai-satir' + (m.acik ? '' : ' kapali') },
        h('label', { class: 'onay gun' }, h('input', { type: 'checkbox', checked: m.acik, disabled: kapali, onchange: (e) => { m.acik = e.target.checked; mesaiCiz(); } }), h('span', null, t(ad))),
        m.acik ? h('div', { class: 'saatler' },
          h('input', { type: 'time', value: m.bas, disabled: kapali, onchange: (e) => { m.bas = e.target.value; } }), h('span', null, '–'),
          h('input', { type: 'time', value: m.bit, disabled: kapali, onchange: (e) => { m.bit = e.target.value; } }))
          : h('span', { class: 'kucuk' }, t('İzinli gün')));
    }));
  };
  mesaiCiz();

  // İzinler
  const izinKutu = h('div', null);
  const izBas = h('input', { type: 'date', disabled: kapali }), izBit = h('input', { type: 'date', disabled: kapali });
  const izNot = h('input', { type: 'text', maxlength: 60, placeholder: t('Not (örn. hastalık, tatil)'), disabled: kapali });
  const izinCiz = () => {
    doldur(izinKutu,
      izinler.length === 0 ? h('p', { class: 'kucuk' }, t('Planlı izin yok.')) : null,
      izinler.map((i, n) => h('div', { class: 'izin-satir' },
        h('span', null, i.bas + (i.bit !== i.bas ? ' → ' + i.bit : ''), i.not ? ' · ' + i.not : ''),
        kapali ? null : h('button', { class: 'ikon-dugme', type: 'button', 'aria-label': t('İzni sil'), onclick: () => { izinler.splice(n, 1); izinCiz(); } }, '🗑'))),
      kapali ? null : h('div', { class: 'izin-ekle' },
        h('div', { class: 'iki-sutun' }, h('label', null, t('Başlangıç'), izBas), h('label', null, t('Bitiş'), izBit)),
        izNot,
        h('button', { class: 'dugme ikincil kucuk-dugme', type: 'button', onclick: () => {
          if (!izBas.value) { hata.textContent = t('İznin başlangıç tarihini seçin.'); return; }
          const bit = izBit.value || izBas.value;
          if (bit < izBas.value) { hata.textContent = t('Bitiş tarihi başlangıçtan önce olamaz.'); return; }
          hata.textContent = '';
          izinler.push({ bas: izBas.value, bit, not: izNot.value.trim() });
          izinler.sort((a, b) => a.bas.localeCompare(b.bas));
          izBas.value = izBit.value = izNot.value = ''; izinCiz();
        } }, t('+ İzin ekle'))));
  };
  izinCiz();

  const icerik = h('div', null);
  const pencere = pencereAc(u.ad, icerik);
  icerik.append(h('form', { class: 'form', novalidate: true,
    onsubmit: (e) => {
      e.preventDefault(); hata.textContent = '';
      const y = sayi(yuzde.value), p = sayi(urun.value === '' ? '0' : urun.value);
      if (!Number.isFinite(y) || y < 0 || y > 100) { hata.textContent = t('Usta yüzdesi 0 ile 100 arasında olmalı.'); return; }
      if (!Number.isFinite(p) || p < 0 || p > 100) { hata.textContent = t('Ürün primi 0 ile 100 arasında olmalı.'); return; }
      for (const [k, ad] of GUNLER) {
        const m = mesai[k];
        if (m.acik && (!m.bas || !m.bit || m.bas >= m.bit)) { hata.textContent = t('{gun} için bitiş saati başlangıçtan sonra olmalı.', { gun: t(ad) }); return; }
      }
      const idler = hizmetler.map(x => x.id).filter(id => secili.has(id));
      kilitli(dugme, async () => {
        try {
          const b = writeBatch(db);
          b.set(doc(db, 'salons', S.salon.id, 'ustalar', u.id), { calisir: calisir.checked, hizmetler: idler, mesai, izinler, guncelleme: serverTimestamp() });
          b.set(doc(db, 'salons', S.salon.id, 'ustaMali', u.id), { yuzde: y, urunPrimi: p, guncelleme: serverTimestamp() });
          b.set(doc(collection(db, 'salons', S.salon.id, 'kayitlar')), {
            uid: auth.currentUser.uid, islem: 'usta_ayar', hedef: u.id, ayrinti: u.ad + ': %' + y + ', ürün primi %' + p + ', ' + idler.length + ' hizmet', zaman: serverTimestamp()
          });
          await b.commit(); pencere.kapat(); bildir(t('Kaydedildi')); yenile(true);
          // Yeni eklenen izinlerin üstüne düşen randevular varsa müşteriyi aratmak için göster
          const eskiIzin = new Set((profil ? profil.izinler : []).map(i => i.bas + '|' + i.bit));
          const yeniIzin = izinler.filter(i => !eskiIzin.has(i.bas + '|' + i.bit));
          if (yeniIzin.length) izinCakisanlariGoster(u.id, u.ad, yeniIzin).catch(e2 => console.error(e2));
        } catch (err) { console.error(err); hata.textContent = hataMetni(err); }
      });
    } },
    h('label', { class: 'onay', for: 'usta-calisir' }, calisir, h('span', null, t('Randevu alıyor (takvimde görünür)'))),
    h('h3', null, t('Yaptığı hizmetler')),
    kapali ? null : h('div', { class: 'dugme-satir sol' },
      h('button', { class: 'baglanti', type: 'button', onclick: () => { hizmetler.forEach(x => secili.add(x.id)); hizmetCiz(); } }, t('Hepsini seç')),
      h('button', { class: 'baglanti', type: 'button', onclick: () => { secili.clear(); hizmetCiz(); } }, t('Temizle'))),
    hizmetKutu,
    h('h3', null, t('Çalışma saatleri')),
    h('p', { class: 'kucuk' }, t('Kapalı bırakılan gün o ustanın haftalık izin günüdür.')),
    mesaiKutu,
    h('h3', null, t('Planlı izinler')),
    izinKutu,
    h('h3', null, t('Pay oranları')),
    h('label', null, t('Hizmet kazancından usta yüzdesi, %'), yuzde),
    h('label', null, t('Ürün satışı primi, %'), urun),
    h('p', { class: 'kucuk' }, t('Bu oranları yalnızca yönetici, kıdemli yetkili, ortak ve ustanın kendisi görür.')),
    hata, kapali ? null : dugme,
    kapali && !yetkili ? h('p', { class: 'kucuk' }, t('Ayarları yönetici ya da kıdemli yetkili değiştirir.')) : null));
}

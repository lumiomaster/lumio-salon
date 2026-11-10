import { t } from '../i18n.js';
import { h, hataMetni, bildir, kilitli, pencereAc } from '../util.js';
import { S } from '../durum.js';
import { auth, db, doc, collection, writeBatch, serverTimestamp, arrayUnion } from '../fb.js';

// Bir randevu kaleminin (hizmetin) formül ve notunu kaydeder. Kayıt adı: randevu_kalemSırası
// (Boya formülü şimdilik serbest yazı; 6. teslimde "ürün + gram" satırlarına dönüşecek.)
export function formulFormu(randevu, i, mevcut, bitti) {
  const k = randevu.kalemler[i];
  const formul = h('textarea', { rows: 4, maxlength: 500, class: 'liste-metin', placeholder: t('örn. 6.0 boya 40 gr + 6.34 20 gr + 9% oksidan 60 ml') }, mevcut ? mevcut.formul : '');
  const not = h('input', { type: 'text', maxlength: 300, value: mevcut ? mevcut.not : '', placeholder: t('Not (örn. 20 dk bekledi, saç dökülmesi şikâyeti)') });
  const hata = h('div', { class: 'hata', role: 'alert' });
  const dugme = h('button', { class: 'dugme', type: 'submit' }, t('Kaydet'));
  const icerik = h('div', null);
  const p = pencereAc(k.ad + ' · ' + randevu.musteriAd, icerik);
  icerik.append(h('form', { class: 'form', novalidate: true,
    onsubmit: (e) => {
      e.preventDefault(); hata.textContent = '';
      kilitli(dugme, async () => {
        try {
          const b = writeBatch(db);
          b.set(doc(db, 'salons', S.salon.id, 'islemler', randevu.id + '_' + i), {
            musteriId: randevu.musteriId || '', ustaUid: k.ustaUid, rid: randevu.id, tarih: randevu.tarih, hizmet: k.ad,
            formul: formul.value.trim(), not: not.value.trim(), guncelleme: serverTimestamp()
          });
          await b.commit(); p.kapat(); bildir(t('Kaydedildi')); bitti();
        } catch (err) { console.error(err); hata.textContent = hataMetni(err); }
      });
    } },
    h('label', null, t('Formül'), formul), h('label', null, t('Not'), not), hata, dugme));
}

// Bu kişi bu kalemin formül/notunu yazabilir mi? (usta yalnız kendi kalemini; yönetici ve kıdemli hepsini)
export function formulYazabilir(k) {
  const rol = S.profil.rol;
  return rol === 'yonetici' || rol === 'kidemli' || (rol === 'usta' && k.ustaUid === auth.currentUser.uid);
}
// Formül/notu okuyabilen roller (sekreter okuyamaz)
export const formulOkur = () => ['yonetici', 'kidemli', 'ortak', 'usta'].includes(S.profil.rol);

// ---- Randevusuz / geçmiş işlem kaydı (müşteri defteri) ----
// Yönetici ve kıdemli kimin yaptığını seçer; usta kendi adına yazar; sekreter yazamaz.
export const islemYazarMi = () => ['yonetici', 'kidemli', 'usta'].includes(S.profil.rol);

export function islemAlanlari(uyeler) {
  const ben = auth.currentUser.uid;
  const adaylar = uyeler.filter(u => u.aktif && ['usta', 'kidemli', 'yonetici'].includes(u.rol));
  const bugun = new Date(); const iso = bugun.getFullYear() + '-' + String(bugun.getMonth() + 1).padStart(2, '0') + '-' + String(bugun.getDate()).padStart(2, '0');
  const tarih = h('input', { type: 'date', value: iso, max: iso });
  const usta = h('select', { disabled: S.profil.rol === 'usta' }, adaylar.map(u => h('option', { value: u.id, selected: u.id === ben }, u.ad)));
  if (S.profil.rol === 'usta') usta.value = ben;
  const hizmet = h('input', { type: 'text', maxlength: 60, placeholder: t('Yapılan işlem (örn. Dip boya + kesim)') });
  const formul = h('textarea', { rows: 3, maxlength: 500, class: 'liste-metin', placeholder: t('Formül (örn. 6.0 boya 40 gr + 9% oksidan 60 ml)') });
  const not = h('input', { type: 'text', maxlength: 300, placeholder: t('Not (isteğe bağlı)') });
  const sonraki = h('input', { type: 'date' });
  const el = h('div', null,
    h('div', { class: 'iki-sutun' }, h('label', null, t('İşlem tarihi'), tarih), h('label', null, t('İşlemi yapan'), usta)),
    h('label', null, t('Yapılan işlem'), hizmet), h('label', null, t('Formül'), formul), h('label', null, t('Not'), not),
    h('label', null, t('Sonraki ziyaret önerisi'), sonraki));
  // Boşsa null; doluysa kayıt. Hata varsa { hata }.
  const oku = () => {
    const doluMu = hizmet.value.trim() || formul.value.trim() || not.value.trim();
    if (!doluMu) return null;
    if (!hizmet.value.trim()) return { hata: t('Yapılan işlemin adını yazın.') };
    if (!tarih.value) return { hata: t('İşlem tarihini seçin.') };
    return { tarih: tarih.value, ustaUid: S.profil.rol === 'usta' ? ben : usta.value, hizmet: hizmet.value.trim(), formul: formul.value.trim(), not: not.value.trim(), sonraki: sonraki.value || '' };
  };
  return { el, oku };
}

export function islemBelgesi(musteriId, v) {
  return { musteriId, ustaUid: v.ustaUid, rid: '', tarih: v.tarih, hizmet: v.hizmet, formul: v.formul, not: v.not, guncelleme: serverTimestamp() };
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
          b.set(doc(collection(db, 'salons', S.salon.id, 'islemler')), islemBelgesi(m.id, v));
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

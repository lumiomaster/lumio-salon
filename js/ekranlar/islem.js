import { t } from '../i18n.js';
import { h, hataMetni, bildir, kilitli, pencereAc } from '../util.js';
import { S } from '../durum.js';
import { auth, db, doc, writeBatch, serverTimestamp } from '../fb.js';

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

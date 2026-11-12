import { t } from '../i18n.js';
import { UYGULAMA, ROLLER } from '../config.js';
import { h, doldur, telGoster, hataMetni, bildir, kilitli, lisansDurumu, onayIste } from '../util.js';
import { S } from '../durum.js';
import { yetkiliMi } from '../roller.js';
import {
  auth, db, signOut, updatePassword, EmailAuthProvider, reauthenticateWithCredential,
  doc, collection, writeBatch, serverTimestamp
} from '../fb.js';
import { goster } from '../main.js';
import { sablonKarti } from './sablonlar.js';
import { bildirimDurumu, bildirimAc, bildirimKapat } from '../sunucu.js';
import { hukukGoster } from '../hukuk.js';

export function ayarlarEkrani() {
  const p = S.profil;
  return h('div', { class: 'sayfa' },
    h('h1', null, t('Ayarlar')),
    h('div', { class: 'kart' },
      h('strong', null, p.ad),
      h('p', { class: 'soluk' }, t(ROLLER[p.rol] || p.rol) + ' · ' + telGoster(p.telefon))),
    yetkiliMi(p.rol) ? salonAdiKarti() : null,
    yetkiliMi(p.rol) ? sablonKarti() : null,
    bildirimKarti(),
    sifreKarti(),
    h('div', { class: 'kart' }, h('strong', null, t('Yasal metinler')),
      h('div', { class: 'dugme-satir sol' },
        h('button', { class: 'dugme ikincil kucuk-dugme', type: 'button', onclick: () => hukukGoster('sartlar') }, t('Kullanım şartları')),
        h('button', { class: 'dugme ikincil kucuk-dugme', type: 'button', onclick: () => hukukGoster('gizlilik') }, t('Gizlilik / KVKK')),
        yetkiliMi(p.rol) ? h('button', { class: 'dugme ikincil kucuk-dugme', type: 'button', onclick: () => hukukGoster('musteri') }, t('Müşteri aydınlatma şablonu')) : null)),
    h('div', { class: 'kart' },
      h('button', { class: 'dugme ikincil', type: 'button', onclick: async () => {
        if (await onayIste(t('Çıkış yapılsın mı?'), t('Çıkış yap'))) { S.sekme = 'ana'; await signOut(auth); }
      } }, t('Çıkış yap'))),
    h('p', { class: 'kucuk ortala' }, UYGULAMA.ad + ' · ' + UYGULAMA.surum));
}

function salonAdiKarti() {
  const ad = h('input', { type: 'text', value: S.salon.ad, maxlength: 80, required: true });
  const hata = h('div', { class: 'hata', role: 'alert' });
  const dugme = h('button', { class: 'dugme', type: 'submit' }, t('Kaydet'));
  return h('form', { class: 'kart form', novalidate: true,
    onsubmit: (e) => {
      e.preventDefault(); hata.textContent = '';
      const yeni = ad.value.trim();
      if (yeni.length < 2) { hata.textContent = t('Salon adı en az 2 harf olmalı.'); return; }
      if (yeni === S.salon.ad) return;
      if (!lisansDurumu(S.salon).aktif) { hata.textContent = t('Lisans süresi bittiği için değişiklik yapılamaz.'); return; }
      kilitli(dugme, async () => {
        try {
          const b = writeBatch(db);
          b.update(doc(db, 'salons', S.salon.id), { ad: yeni });
          b.set(doc(collection(db, 'salons', S.salon.id, 'kayitlar')), {
            uid: auth.currentUser.uid, islem: 'salon_adi', hedef: S.salon.id, ayrinti: S.salon.ad + ' → ' + yeni, zaman: serverTimestamp()
          });
          await b.commit();
          S.salon.ad = yeni; bildir(t('Kaydedildi')); goster();
        } catch (err) { console.error(err); hata.textContent = hataMetni(err); }
      });
    } },
    h('label', null, t('Salonun adı'), ad), hata, dugme);
}

export function sifreKarti() {
  const eski = h('input', { type: 'password', autocomplete: 'current-password', placeholder: t('Şu anki şifre'), required: true });
  const y1 = h('input', { type: 'password', autocomplete: 'new-password', placeholder: t('Yeni şifre (en az 6 karakter)'), required: true });
  const y2 = h('input', { type: 'password', autocomplete: 'new-password', placeholder: t('Yeni şifre tekrar'), required: true });
  const hata = h('div', { class: 'hata', role: 'alert' });
  const dugme = h('button', { class: 'dugme', type: 'submit' }, t('Şifreyi değiştir'));
  return h('form', { class: 'kart form', novalidate: true,
    onsubmit: (e) => {
      e.preventDefault(); hata.textContent = '';
      if (!eski.value) { hata.textContent = t('Şu anki şifrenizi yazın.'); return; }
      if (y1.value.length < 6) { hata.textContent = t('Şifre en az 6 karakter olmalı.'); return; }
      if (y1.value !== y2.value) { hata.textContent = t('Şifreler aynı değil.'); return; }
      kilitli(dugme, async () => {
        try {
          const u = auth.currentUser;
          await reauthenticateWithCredential(u, EmailAuthProvider.credential(u.email, eski.value));
          await updatePassword(u, y1.value);
          eski.value = y1.value = y2.value = '';
          bildir(t('Şifreniz değişti'));
        } catch (err) { console.error(err); hata.textContent = hataMetni(err); }
      });
    } },
    h('h2', null, t('Şifre değiştir')), eski, y1, y2, hata, dugme);
}

// ---- Bildirimler (telefona anlık bildirim) ----
export function bildirimKarti() {
  const kutu = h('div', { class: 'kart' });
  const ciz = async () => {
    const d = await bildirimDurumu();
    const yazi = {
      acik: t('Bu cihazda bildirimler açık.'),
      kapali: t('Yeni randevu, ekip sohbeti ve hesap itirazları telefonunuza bildirim olarak gelsin.'),
      izinsiz: t('Bildirimler tarayıcıdan engellenmiş. Telefonun ayarlarından bu uygulamaya bildirim iznini açın.'),
      ekle: t('iPhone\'da bildirim için önce uygulamayı ana ekrana ekleyin (Safari › Paylaş › Ana Ekrana Ekle), sonra buradan açın.'),
      desteklenmiyor: t('Bu tarayıcı bildirimleri desteklemiyor.'),
      'sunucu-yok': t('Bildirim sunucusu henüz kurulmadı.')
    }[d];
    const dugme = d === 'acik'
      ? h('button', { class: 'dugme ikincil', type: 'button', onclick: (e) => kilitli(e.currentTarget, async () => { try { await bildirimKapat(); bildir(t('Bildirimler kapatıldı')); } catch (err) { bildir(hataMetni(err), 'hata'); } ciz(); }) }, t('Bildirimleri kapat'))
      : d === 'kapali'
        ? h('button', { class: 'dugme', type: 'button', onclick: (e) => kilitli(e.currentTarget, async () => {
          // Hangi adımda beklediği ve varsa hata ekranda kalıcı yazılır (kısa bildirim kaçırılabiliyor)
          const durumYazi = kutu.querySelector('.bildirim-durum');
          const yaz = (m, hata) => { if (durumYazi) { durumYazi.textContent = m; durumYazi.className = 'kucuk bildirim-durum' + (hata ? ' uyari-yazi' : ''); } };
          try { await bildirimAc(yaz); bildir(t('Bildirimler açıldı')); } catch (err) {
            const m = err.message === 'İzin verilmedi' ? t('İzin verilmedi. Tarayıcı adres çubuğundaki kilit simgesinden bildirime izin verin.') : (err.kod || !err.code ? err.message : hataMetni(err));
            yaz(m, true); bildir(m, 'hata'); return;
          }
          ciz(); }) }, t('Bildirimleri aç'))
        : null;
    doldur(kutu, h('strong', null, t('Bildirimler')), h('p', { class: 'soluk' }, yazi), dugme, h('p', { class: 'kucuk bildirim-durum' }));
  };
  ciz();
  return kutu;
}

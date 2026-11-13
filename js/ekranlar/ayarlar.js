import { t } from '../i18n.js';
import { UYGULAMA, ROLLER } from '../config.js';
import { h, doldur, telGoster, hataMetni, bildir, kilitli, lisansDurumu, onayIste, pencereAc } from '../util.js';
import { sunucuHazir, sunucuyaSor } from '../sunucu.js';
import { destekKarti } from '../destek.js';
import { S } from '../durum.js';
import { yetkiliMi } from '../roller.js';
import {
  auth, db, signOut, updatePassword, EmailAuthProvider, reauthenticateWithCredential, multiFactor, TotpMultiFactorGenerator,
  doc, collection, writeBatch, serverTimestamp
} from '../fb.js';
import { goster } from '../main.js';
import { sablonKarti } from './sablonlar.js';
import { bildirimDurumu, bildirimAc, bildirimKapat } from '../sunucu.js';
import { hukukGoster } from '../hukuk.js';
import { dilKarti } from './dil-sec.js';
import { yardimKarti } from './yardim.js';
import { temaSecimi, yaziSecimi, temaKaydet, yaziKaydet } from '../tema.js';

export function ayarlarEkrani() {
  const p = S.profil;
  return h('div', { class: 'sayfa' },
    h('h1', null, t('Ayarlar')),
    h('div', { class: 'kart' },
      h('strong', null, p.ad),
      h('p', { class: 'soluk' }, t(ROLLER[p.rol] || p.rol) + ' · ' + telGoster(p.telefon))),
    yetkiliMi(p.rol) ? salonAdiKarti() : null,
    yetkiliMi(p.rol) ? sablonKarti() : null,
    dilKarti(),
    gorunumKarti(),
    yardimKarti(),
    bildirimKarti(),
    sifreKarti(),
    yetkiliMi(p.rol) ? ekDogrulamaKarti() : null,
    yetkiliMi(p.rol) && !S.destek ? destekKarti() : null,
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

// ---- Ek doğrulama (2 adım): doğrulama uygulamasındaki 6 haneli kod. Yalnız yetkililer (yönetici, kıdemli, ortak) ve platform yöneticisi.
// Firebase'de "Identity Platform + TOTP" açılmadıysa kart nedenini söyler, giriş akışına dokunmaz. ----
export function ekDogrulamaKarti() {
  const kutu = h('div', { class: 'kart' });
  const hataYaz = (e) => (e && (e.code === 'auth/operation-not-allowed' || e.code === 'auth/unsupported-first-factor' || e.code === 'auth/second-factor-limit-exceeded'))
    ? t('Ek doğrulama bu projede henüz açık değil. Firebase > Authentication > Gelişmiş (Identity Platform) bölümünden TOTP açılmalı; KURULUM.md\'deki "Ek doğrulama" adımına bakın.')
    : (e && e.code === 'auth/invalid-verification-code' ? t('Kod yanlış ya da süresi geçti. Doğrulama uygulamasındaki güncel kodu yazın.') : (e && e.message && e.kod ? e.message : hataMetni(e)));
  const faktorler = () => { try { return multiFactor(auth.currentUser).enrolledFactors || []; } catch (_) { return []; } };
  const ciz = () => {
    const acik = faktorler().length > 0;
    doldur(kutu, h('h2', null, t('Ek doğrulama (2 adım)')),
      h('p', { class: 'kucuk' }, t('Şifrenize ek olarak telefonunuzdaki doğrulama uygulamasının (Google Authenticator, Microsoft Authenticator vb.) 6 haneli kodu istenir. Şifreniz başkasının eline geçse bile hesabınıza giremez.')),
      acik ? h('div', { class: 'kart bilgi' }, '✓ ' + t('Ek doğrulama açık')) : null,
      h('div', { class: 'dugme-satir sol' }, acik
        ? h('button', { class: 'dugme ikincil kucuk-dugme tehlike', type: 'button', onclick: kapat }, t('Ek doğrulamayı kapat'))
        : h('button', { class: 'dugme', type: 'button', onclick: ac }, t('Ek doğrulamayı aç'))));
  };
  const sifreIste = (baslik, devam) => {
    const sifre = h('input', { type: 'password', autocomplete: 'current-password', placeholder: t('Şu anki şifre'), required: true });
    const hata = h('div', { class: 'hata', role: 'alert' });
    const dugme = h('button', { class: 'dugme', type: 'submit' }, t('Devam'));
    const icerik = h('div', null); const p = pencereAc(baslik, icerik);
    icerik.append(h('form', { class: 'form', novalidate: true, onsubmit: (e) => { e.preventDefault(); hata.textContent = '';
      if (!sifre.value) { hata.textContent = t('Şu anki şifrenizi yazın.'); return; }
      kilitli(dugme, async () => { try { const u = auth.currentUser; await reauthenticateWithCredential(u, EmailAuthProvider.credential(u.email, sifre.value)); await devam(icerik, p); } catch (err) { console.error(err); hata.textContent = hataYaz(err); } }); } },
      h('p', { class: 'kucuk' }, t('Güvenlik için şifrenizi yeniden yazın.')), sifre, hata, dugme));
  };
  const ac = () => sifreIste(t('Ek doğrulamayı aç'), async (icerik, p) => {
    if (sunucuHazir()) await sunucuyaSor('/mfa-hazirla', {});   // sentetik e-posta adresini "doğrulanmış" işaretler (Firebase MFA bunu ister)
    const u = auth.currentUser; await u.getIdToken(true);
    const oturum = await multiFactor(u).getSession();
    const gizli = await TotpMultiFactorGenerator.generateSecret(oturum);
    const url = gizli.generateQrCodeUrl(u.email.split('@')[0], 'LUMIO SALON');
    const kod = h('input', { type: 'text', inputmode: 'numeric', autocomplete: 'one-time-code', maxlength: 6, placeholder: '123456', required: true });
    const hata = h('div', { class: 'hata', role: 'alert' });
    const dugme = h('button', { class: 'dugme', type: 'submit' }, t('Doğrula ve aç'));
    const anahtar = String(gizli.secretKey || '').replace(/(.{4})/g, '$1 ').trim();
    icerik.replaceChildren(h('form', { class: 'form', novalidate: true, onsubmit: (e) => { e.preventDefault(); hata.textContent = '';
      const k = kod.value.replace(/\D/g, ''); if (k.length !== 6) { hata.textContent = t('6 haneli kodu yazın.'); return; }
      kilitli(dugme, async () => { try { await multiFactor(u).enroll(TotpMultiFactorGenerator.assertionForEnrollment(gizli, k), t('Doğrulama uygulaması')); p.kapat(); bildir(t('Ek doğrulama açıldı')); ciz(); } catch (err) { console.error(err); hata.textContent = hataYaz(err); } }); } },
      h('p', null, t('1) Telefonunuzda Google Authenticator ya da Microsoft Authenticator uygulamasını açın.')),
      h('p', null, t('2) "Kurulum anahtarı gir" deyin ve aşağıdaki anahtarı yazın (ya da bağlantıya dokunun):')),
      h('div', { class: 'kart bilgi anahtar-kutu' }, h('strong', null, anahtar)),
      h('a', { class: 'baglanti', href: url }, t('Doğrulama uygulamasında aç')),
      h('p', null, t('3) Uygulamanın gösterdiği 6 haneli kodu yazın:')), kod, hata, dugme));
  });
  const kapat = () => sifreIste(t('Ek doğrulamayı kapat'), async (icerik, p) => {
    const f = faktorler()[0]; if (f) await multiFactor(auth.currentUser).unenroll(f);
    p.kapat(); bildir(t('Ek doğrulama kapatıldı')); ciz();
  });
  ciz();
  return kutu;
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

// Görünüm: tema ve yazı boyutu (yalnız bu telefonda geçerli)
function gorunumKarti() {
  const kutu = h('div', { class: 'kart' });
  const ciz = () => {
    const tema = temaSecimi(), yazi = yaziSecimi();
    const sec = (liste, aktif, kaydet) => h('div', { class: 'chip-satir' }, liste.map(([k, ad]) => h('button', { type: 'button', class: 'chip' + (k === aktif ? ' secili' : ''), 'aria-pressed': k === aktif ? 'true' : 'false', onclick: () => { kaydet(k); ciz(); } }, t(ad))));
    doldur(kutu, h('strong', null, t('Görünüm')),
      h('p', { class: 'kucuk' }, t('Bu seçimler yalnızca bu telefonu etkiler.')),
      h('p', { class: 'kucuk' }, t('Tema')),
      sec([['sistem', 'Telefona uysun'], ['acik', 'Aydınlık'], ['koyu', 'Karanlık']], tema, temaKaydet),
      h('p', { class: 'kucuk' }, t('Yazı boyutu')),
      sec([['kucuk', 'Küçük'], ['normal', 'Normal'], ['buyuk', 'Büyük'], ['cokbuyuk', 'Çok büyük']], yazi, yaziKaydet));
  };
  ciz();
  return kutu;
}

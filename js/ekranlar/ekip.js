import { t, yerel } from '../i18n.js';
import { ROLLER } from '../config.js';
import { h, telNormalize, telGoster, eposta, hataMetni, bildir, pencereAc, kilitli, rastgeleSifre, lisansDurumu } from '../util.js';
import { S } from '../durum.js';
import { yetkiliMi, eklenebilirRoller, yonetebilir } from '../roller.js';
import {
  auth, auth2, db, createUserWithEmailAndPassword, signOut,
  doc, collection, getDocs, query, where, writeBatch, serverTimestamp
} from '../fb.js';
import { goster } from '../main.js';
import { uyelerGecersiz } from '../veri.js';
import { sunucuHazir, sunucuyaSor } from '../sunucu.js';
import { onayIste } from '../util.js';

const SIRA = { yonetici: 0, kidemli: 1, ortak: 2, sekreter: 3, usta: 4 };
let liste = null, listeSalon = null, yukleniyor = false, hata = '', eskiGoster = false;

async function yukle() {
  yukleniyor = true; hata = '';
  try {
    const sn = await getDocs(query(collection(db, 'kullanicilar'), where('salonId', '==', S.salon.id)));
    liste = sn.docs.map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (SIRA[a.rol] - SIRA[b.rol]) || a.ad.localeCompare(b.ad, yerel()));
    listeSalon = S.salon.id;
  } catch (e) { console.error(e); hata = hataMetni(e); liste = []; listeSalon = S.salon.id; }
  yukleniyor = false;
  goster();
}

function kayitEkle(b, islem, hedef, ayrinti) {
  b.set(doc(collection(db, 'salons', S.salon.id, 'kayitlar')), {
    uid: auth.currentUser.uid, islem, hedef, ayrinti, zaman: serverTimestamp()
  });
}

export function ekipEkrani() {
  const benRol = S.profil.rol;
  const yetkili = yetkiliMi(benRol);
  const lisansOk = lisansDurumu(S.salon).aktif;
  if (listeSalon !== S.salon.id) liste = null;
  if (liste === null && !yukleniyor) yukle();
  return h('div', { class: 'sayfa' },
    h('div', { class: 'baslik-satir' },
      h('h1', null, t('Ekip')),
      yetkili ? h('button', { class: 'dugme kucuk-dugme', type: 'button', disabled: !lisansOk, onclick: () => ekleFormu() }, t('+ Kişi ekle')) : null),
    hata ? h('div', { class: 'uyari' }, hata, ' ', h('button', { class: 'baglanti', type: 'button', onclick: () => { liste = null; goster(); } }, t('Tekrar dene'))) : null,
    liste === null ? h('p', { class: 'soluk' }, t('Yükleniyor…')) :
      h('div', null,
        h('div', { class: 'liste' }, liste.filter(k => !k.silindi).map(k => uyeKarti(k, benRol, lisansOk))),
        liste.some(k => k.silindi) ? h('div', null,
          h('button', { class: 'baglanti', type: 'button', onclick: () => { eskiGoster = !eskiGoster; goster(); } }, (eskiGoster ? t('Eski çalışanları gizle') : t('Eski çalışanlar')) + ' (' + liste.filter(k => k.silindi).length + ')'),
          eskiGoster ? h('div', { class: 'liste' }, liste.filter(k => k.silindi).map(k => uyeKarti(k, benRol, lisansOk))) : null) : null));
}

function uyeKarti(k, benRol, lisansOk) {
  const duzenlenebilir = lisansOk && k.id !== auth.currentUser.uid && yonetebilir(benRol, k.rol);
  return h('div', { class: 'kart uye' + (k.aktif ? '' : ' pasif') },
    h('div', { class: 'uye-ust' },
      h('strong', null, k.ad, k.id === auth.currentUser.uid ? ' ' + t('(siz)') : ''),
      h('span', { class: 'rozet rol-' + k.rol }, t(ROLLER[k.rol] || k.rol))),
    h('div', { class: 'uye-alt' },
      h('a', { href: 'tel:+' + k.telefon }, telGoster(k.telefon)),
      k.silindi ? h('span', { class: 'rozet pasif-rozet' }, t('Silindi')) : (k.aktif ? null : h('span', { class: 'rozet pasif-rozet' }, t('Pasif')))),
    duzenlenebilir && !k.silindi ? h('button', { class: 'dugme ikincil kucuk-dugme', type: 'button', onclick: () => duzenleFormu(k) }, t('Düzenle')) : null,
    k.silindi && yetkiliMi(benRol) && k.id !== auth.currentUser.uid && sunucuHazir() ? h('button', { class: 'dugme ikincil kucuk-dugme tehlike', type: 'button', onclick: () => kaliciSil(k) }, t('Kalıcı sil')) : null);
}

function rolSecimi(roller, secili) {
  return h('select', null, roller.map(r => h('option', { value: r, selected: r === secili }, t(ROLLER[r]))));
}

function ekleFormu() {
  const roller = eklenebilirRoller(S.profil.rol);
  const ad = h('input', { type: 'text', placeholder: t('Adı soyadı'), required: true, maxlength: 60 });
  const tel = h('input', { type: 'tel', inputmode: 'tel', placeholder: '05xx xxx xx xx', required: true });
  const rol = rolSecimi(roller, 'usta');
  const sifre = h('input', { type: 'text', value: rastgeleSifre(), autocomplete: 'off', required: true });
  const hataKutu = h('div', { class: 'hata', role: 'alert' });
  const dugme = h('button', { class: 'dugme', type: 'submit' }, t('Kişiyi ekle'));
  const icerik = h('div', null);
  const pencere = pencereAc(t('Kişi ekle'), icerik);
  icerik.append(h('form', { class: 'form', novalidate: true,
    onsubmit: (e) => {
      e.preventDefault(); hataKutu.textContent = '';
      const d = telNormalize(tel.value), adTemiz = ad.value.trim();
      if (adTemiz.length < 2) { hataKutu.textContent = t('Adını yazın.'); return; }
      if (!d) { hataKutu.textContent = t('Geçerli bir telefon numarası yazın.'); return; }
      if (sifre.value.length < 6) { hataKutu.textContent = t('Şifre en az 6 karakter olmalı.'); return; }
      kilitli(dugme, async () => {
        let cred = null;
        try {
          cred = await createUserWithEmailAndPassword(auth2, eposta(d), sifre.value);
          const uid = cred.user.uid;
          const b = writeBatch(db);
          b.set(doc(db, 'kullanicilar', uid), {
            salonId: S.salon.id, ad: adTemiz, telefon: d, rol: rol.value, aktif: true,
            olusturma: serverTimestamp(), ekleyen: auth.currentUser.uid
          });
          kayitEkle(b, 'uye_ekle', uid, adTemiz + ' (' + rol.value + ')');
          await b.commit();
          await signOut(auth2);
          liste = null; uyelerGecersiz();
          icerik.replaceChildren(sonuc(adTemiz, d, sifre.value, pencere));
          goster();
        } catch (err) {
          console.error(err);
          if (cred && cred.user) { try { await cred.user.delete(); } catch (_) {} }
          try { await signOut(auth2); } catch (_) {}
          hataKutu.textContent = hataMetni(err);
        }
      });
    } },
    h('label', null, t('Adı soyadı'), ad),
    h('label', null, t('Telefon numarası'), tel),
    h('label', null, t('Görevi'), rol),
    h('label', null, t('Geçici şifre'), sifre),
    h('p', { class: 'kucuk' }, t('Bu şifreyi kişiye siz iletirsiniz. Kişi giriş yaptıktan sonra Ayarlar bölümünden kendi şifresini belirler.')),
    hataKutu, dugme));
}

function sonuc(ad, tel, sifre, pencere) {
  const metin = ad + '\n' + t('Telefon') + ': ' + telGoster(tel) + '\n' + t('Geçici şifre') + ': ' + sifre;
  return h('div', null,
    h('div', { class: 'kart bilgi' }, h('strong', null, t('{ad} eklendi', { ad })),
      h('p', null, t('Telefon') + ': ' + telGoster(tel)), h('p', null, t('Geçici şifre') + ': ' + sifre)),
    h('p', { class: 'kucuk' }, t('Bu bilgiyi kişiye iletin. Şifre bir daha gösterilmez.')),
    h('div', { class: 'dugme-satir' },
      h('button', { class: 'dugme ikincil', type: 'button', onclick: async () => {
        try { await navigator.clipboard.writeText(metin); bildir(t('Kopyalandı')); } catch (_) { bildir(t('Kopyalanamadı, elle yazın.'), 'hata'); }
      } }, t('Kopyala')),
      h('button', { class: 'dugme', type: 'button', onclick: pencere.kapat }, t('Tamam'))));
}

function duzenleFormu(k) {
  const benRol = S.profil.rol;
  const roller = eklenebilirRoller(benRol);
  const ad = h('input', { type: 'text', value: k.ad, required: true, maxlength: 60 });
  const rol = rolSecimi(roller, k.rol);
  const aktif = h('input', { type: 'checkbox', id: 'uye-aktif', checked: !!k.aktif });
  const hataKutu = h('div', { class: 'hata', role: 'alert' });
  const dugme = h('button', { class: 'dugme', type: 'submit' }, t('Kaydet'));
  const icerik = h('div', null);
  const pencere = pencereAc(t('Kişiyi düzenle'), icerik);
  icerik.append(h('form', { class: 'form', novalidate: true,
    onsubmit: (e) => {
      e.preventDefault(); hataKutu.textContent = '';
      const adTemiz = ad.value.trim();
      if (adTemiz.length < 2) { hataKutu.textContent = t('Adını yazın.'); return; }
      kilitli(dugme, async () => {
        try {
          const b = writeBatch(db);
          b.update(doc(db, 'kullanicilar', k.id), { ad: adTemiz, rol: rol.value, aktif: aktif.checked });
          const degisen = [];
          if (adTemiz !== k.ad) degisen.push('ad');
          if (rol.value !== k.rol) degisen.push('rol: ' + k.rol + ' → ' + rol.value);
          if (aktif.checked !== !!k.aktif) degisen.push(aktif.checked ? 'aktif yapıldı' : 'pasif yapıldı');
          if (!degisen.length) { pencere.kapat(); return; }
          kayitEkle(b, 'uye_degistir', k.id, k.ad + ': ' + degisen.join(', '));
          await b.commit();
          pencere.kapat(); liste = null; uyelerGecersiz(); bildir(t('Kaydedildi')); goster();
        } catch (err) { console.error(err); hataKutu.textContent = hataMetni(err); }
      });
    } },
    h('div', { class: 'tel-satir' }, h('span', { class: 'soluk' }, telGoster(k.telefon)),
      sunucuHazir() ? h('button', { class: 'baglanti kucuk', type: 'button', onclick: () => telefonDegistir(k, pencere) }, t('Telefonu değiştir')) : null),
    h('label', null, t('Adı soyadı'), ad),
    h('label', null, t('Görevi'), rol),
    h('label', { class: 'onay', for: 'uye-aktif' }, aktif, h('span', null, t('Aktif (pasif yapılırsa uygulamaya giremez)'))),
    hataKutu, dugme),
    sunucuHazir() ? h('div', { class: 'tehlike-kutu' },
      h('p', { class: 'kucuk' }, t('Şifresini unuttuysa yeni bir geçici şifre verebilir, işten ayrıldıysa ekipten silebilirsiniz. Silinen kişi giriş yapamaz ve telefon numarası serbest kalır; geçmiş randevu ve kasa kayıtları durur.')),
      h('div', { class: 'dugme-satir sol' },
        h('button', { class: 'dugme ikincil kucuk-dugme', type: 'button', onclick: () => sifreSifirla(k, pencere) }, t('Şifreyi sıfırla')),
        h('button', { class: 'dugme ikincil kucuk-dugme tehlike', type: 'button', onclick: () => uyeSil(k, pencere) }, t('Ekipten sil')))) : null);
}

async function uyeSil(k, pencere) {
  if (!(await onayIste(t('{ad} ekipten silinsin mi? Hesabı kapanır, giriş yapamaz ve telefon numarası serbest kalır. Geçmiş randevu ve kasa kayıtları durur. Bu işlem geri alınamaz.', { ad: k.ad }), t('Evet, sil')))) return;
  try {
    await sunucuyaSor('/hesap-sil', { uid: k.id });
    pencere.kapat(); liste = null; uyelerGecersiz(); bildir(t('{ad} ekipten silindi.', { ad: k.ad })); goster();
  } catch (e) { console.error(e); bildir(e.message || hataMetni(e), 'hata'); }
}

async function sifreSifirla(k, pencere) {
  if (!(await onayIste(t('{ad} için yeni bir geçici şifre oluşturulsun mu? Eski şifresi geçersiz olur.', { ad: k.ad }), t('Evet, sıfırla')))) return;
  try {
    const r = await sunucuyaSor('/sifre-sifirla', { uid: k.id });
    pencere.kapat();
    const metin = r.ad + '\n' + t('Telefon') + ': ' + telGoster(r.telefon) + '\n' + t('Geçici şifre') + ': ' + r.sifre;
    const icerik = h('div', null);
    const p = pencereAc(t('Yeni şifre'), icerik);
    icerik.append(
      h('div', { class: 'kart bilgi' }, h('strong', null, r.ad), h('p', null, t('Telefon') + ': ' + telGoster(r.telefon)), h('p', null, t('Geçici şifre') + ': ' + r.sifre)),
      h('p', { class: 'kucuk' }, t('Bu şifreyi kişiye iletin. Bir daha gösterilmez.')),
      h('div', { class: 'dugme-satir' },
        h('button', { class: 'dugme ikincil', type: 'button', onclick: async () => { try { await navigator.clipboard.writeText(metin); bildir(t('Kopyalandı')); } catch (_) { bildir(t('Kopyalanamadı, elle yazın.'), 'hata'); } } }, t('Kopyala')),
        h('button', { class: 'dugme', type: 'button', onclick: p.kapat }, t('Tamam'))));
  } catch (e) { console.error(e); bildir(e.message || hataMetni(e), 'hata'); }
}

// Giriş telefonunu değiştirir: şifre, geçmiş randevu/kazanç ve müşteriler olduğu gibi kalır
function telefonDegistir(k, pencere) {
  pencere.kapat();
  const yeni = h('input', { type: 'tel', inputmode: 'tel', placeholder: '05xx xxx xx xx', required: true });
  const hataKutu = h('div', { class: 'hata', role: 'alert' });
  const dugme = h('button', { class: 'dugme', type: 'submit' }, t('Telefonu değiştir'));
  const icerik = h('div', null);
  const p = pencereAc(t('Telefonu değiştir') + ' · ' + k.ad, icerik);
  icerik.append(h('form', { class: 'form', novalidate: true,
    onsubmit: (e) => {
      e.preventDefault(); hataKutu.textContent = '';
      const d = telNormalize(yeni.value);
      if (!d) { hataKutu.textContent = t('Geçerli bir telefon numarası yazın.'); return; }
      if (d === k.telefon) { hataKutu.textContent = t('Yeni numara eskisiyle aynı.'); return; }
      kilitli(dugme, async () => {
        try {
          await sunucuyaSor('/telefon-degistir', { uid: k.id, yeniTel: d });
          try {
            const b = writeBatch(db); kayitEkle(b, 'uye_degistir', k.id, k.ad + ': telefon ' + k.telefon + ' → ' + d); await b.commit();
          } catch (e2) { console.error(e2); }
          liste = null; uyelerGecersiz();
          icerik.replaceChildren(
            h('div', { class: 'kart bilgi' }, h('strong', null, k.ad), h('p', null, t('Yeni giriş numarası') + ': ' + telGoster(d))),
            h('p', { class: 'kucuk' }, t('Şifresi değişmedi; kişi yeni numarasıyla eski şifresiyle girer. Açıksa oturumu kapanabilir, yeniden girmesi gerekir.')),
            h('div', { class: 'dugme-satir' }, h('button', { class: 'dugme', type: 'button', onclick: p.kapat }, t('Tamam'))));
          goster();
        } catch (err) { console.error(err); hataKutu.textContent = err.message || hataMetni(err); }
      });
    } },
    h('p', { class: 'soluk' }, t('Şu an') + ': ' + telGoster(k.telefon)),
    h('label', null, t('Yeni telefon numarası'), yeni),
    hataKutu, dugme));
}

// Eski çalışanı tamamen kaldırır (kişi kartı + giriş hesabı); randevu, ödeme ve kasa kayıtları durur
function kaliciSil(k) {
  const ad = h('input', { type: 'text', autocomplete: 'off', placeholder: k.ad });
  const hataKutu = h('div', { class: 'hata', role: 'alert' });
  const dugme = h('button', { class: 'dugme tehlike', type: 'submit', disabled: true }, t('Kalıcı olarak sil'));
  const norm = (x) => String(x || '').trim().toLocaleLowerCase(yerel());
  ad.addEventListener('input', () => { dugme.disabled = norm(ad.value) !== norm(k.ad); });
  const icerik = h('div', null);
  const p = pencereAc(t('Kalıcı sil') + ' · ' + k.ad, icerik);
  icerik.append(h('form', { class: 'form', novalidate: true,
    onsubmit: (e) => {
      e.preventDefault(); hataKutu.textContent = '';
      if (norm(ad.value) !== norm(k.ad)) return;
      kilitli(dugme, async () => {
        try {
          await sunucuyaSor('/hesap-sil', { uid: k.id, kalici: true });
          try { const b = writeBatch(db); kayitEkle(b, 'uye_kalici_sil', k.id, k.ad); await b.commit(); } catch (e2) { console.error(e2); }
          p.kapat(); liste = null; uyelerGecersiz(); bildir(t('{ad} kalıcı olarak silindi.', { ad: k.ad })); goster();
        } catch (err) { console.error(err); hataKutu.textContent = err.message || hataMetni(err); }
      });
    } },
    h('p', null, t('Bu kişinin kartı ve giriş hesabı tamamen silinir; geri alınamaz. Geçmiş randevu, ödeme ve kasa kayıtlarında adı kalır. Telefon numarası serbest kalır.')),
    h('label', null, t('Onay için adını yazın') + ': ' + k.ad, ad),
    hataKutu, dugme));
}

// Başka ekrandan dönünce liste yenilensin
export function ekipYenile() { liste = null; }

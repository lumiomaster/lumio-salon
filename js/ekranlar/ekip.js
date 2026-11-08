import { t } from '../i18n.js';
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

const SIRA = { yonetici: 0, kidemli: 1, ortak: 2, sekreter: 3, usta: 4 };
let liste = null, listeSalon = null, yukleniyor = false, hata = '';

async function yukle() {
  yukleniyor = true; hata = '';
  try {
    const sn = await getDocs(query(collection(db, 'kullanicilar'), where('salonId', '==', S.salon.id)));
    liste = sn.docs.map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (SIRA[a.rol] - SIRA[b.rol]) || a.ad.localeCompare(b.ad, 'tr'));
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
      h('div', { class: 'liste' }, liste.map(k => uyeKarti(k, benRol, lisansOk))),
    benRol === 'ortak' ? h('p', { class: 'kucuk' }, t('Ortak olarak ekibi görebilirsiniz; değişiklik yönetici ya da kıdemli yetkili tarafından yapılır.')) : null);
}

function uyeKarti(k, benRol, lisansOk) {
  const duzenlenebilir = lisansOk && k.id !== auth.currentUser.uid && yonetebilir(benRol, k.rol);
  return h('div', { class: 'kart uye' + (k.aktif ? '' : ' pasif') },
    h('div', { class: 'uye-ust' },
      h('strong', null, k.ad, k.id === auth.currentUser.uid ? ' ' + t('(siz)') : ''),
      h('span', { class: 'rozet rol-' + k.rol }, t(ROLLER[k.rol] || k.rol))),
    h('div', { class: 'uye-alt' },
      h('a', { href: 'tel:+' + k.telefon }, telGoster(k.telefon)),
      k.aktif ? null : h('span', { class: 'rozet pasif-rozet' }, t('Pasif'))),
    duzenlenebilir ? h('button', { class: 'dugme ikincil kucuk-dugme', type: 'button', onclick: () => duzenleFormu(k) }, t('Düzenle')) : null);
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
    h('p', { class: 'soluk' }, telGoster(k.telefon)),
    h('label', null, t('Adı soyadı'), ad),
    h('label', null, t('Görevi'), rol),
    h('label', { class: 'onay', for: 'uye-aktif' }, aktif, h('span', null, t('Aktif (pasif yapılırsa uygulamaya giremez)'))),
    hataKutu, dugme));
}

// Başka ekrandan dönünce liste yenilensin
export function ekipYenile() { liste = null; }

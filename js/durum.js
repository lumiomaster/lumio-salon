// Uygulamanın ortak durumu
export const S = {
  profil: null,        // giriş yapan kişinin üyelik belgesi { id, salonId, ad, telefon, rol, aktif }
  yonetici: null,      // platform yöneticisi ise yoneticiler/{uid} belgesi
  salon: null,         // { id, ad, durum, ... }
  sekme: 'ana',
  salonAlt: 'genel',   // Salon sekmesi içindeki bölüm: genel | hizmetler | ustalar
  kasaAlt: 'gun',      // Kasa sekmesi içindeki bölüm: gun | hesap
  kayitSuruyor: false, // salon kurulurken oturum olayını yok say
  mesaj: ''            // giriş ekranında gösterilecek bilgi
};

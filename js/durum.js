// Uygulamanın ortak durumu
export const S = {
  profil: null,        // giriş yapan kişinin üyelik belgesi { id, salonId, ad, telefon, rol, aktif }
  salon: null,         // { id, ad, durum, ... }
  sekme: 'ana',
  kayitSuruyor: false, // salon kurulurken oturum olayını yok say
  mesaj: ''            // giriş ekranında gösterilecek bilgi
};

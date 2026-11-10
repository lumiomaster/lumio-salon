// Telefonun geri tuşu: önce açık pencereyi kapatır, sonra Ana sayfaya döner;
// Ana sayfadayken ilk basışta "çıkmak için tekrar basın" der, 2,5 sn içinde tekrar basılırsa uygulamadan çıkar.
// (iPhone'da kenardan kaydırma aynı şekilde çalışır.)
import { t } from './i18n.js';
import { bildir, ustPencereyiKapat } from './util.js';
import { S } from './durum.js';
import { G, kokKur, girdiEkle, girdiGeriAl } from './gecmis.js';

let cikisZamani = 0;

// Alt menüden sekme değişince çağrılır
export function sekmeDegisti(id) {
  if (id !== 'ana' && !G.sekme) G.sekme = girdiEkle();
  else if (id === 'ana' && G.sekme) { G.sekme = false; girdiGeriAl(); }
}

export function geriTusunuBaslat(anaSayfayaDon) {
  try { history.replaceState({ lumio: 'taban' }, '', location.href); } catch (e) { return; }
  ['click', 'pointerup', 'touchend', 'keydown'].forEach(o => document.addEventListener(o, kokKur, true));

  window.addEventListener('popstate', () => {
    if (G.bekleyen > 0) { G.bekleyen--; return; }                       // kendi çağırdığımız geri
    G.pop = true;
    try {
      if (ustPencereyiKapat()) return;                                   // 1) açık pencere
      if (G.sekme) { G.sekme = false; G.ust--; anaSayfayaDon(); return; }   // 2) sekme -> Ana sayfa
      G.kok = false;                                                     // kök kaydı tüketildi
      if (S.sekme && S.sekme !== 'ana' && S.profil) { anaSayfayaDon(); kokKur(); return; }
      const simdi = Date.now();
      if (simdi - cikisZamani < 2500) { cikisZamani = 0; history.back(); return; }   // 3) ikinci basış: çık
      cikisZamani = simdi;
      bildir(t('Çıkmak için tekrar geri tuşuna basın'));
      kokKur();
    } finally { G.pop = false; }
  });
}

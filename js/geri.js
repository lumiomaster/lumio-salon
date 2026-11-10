// Telefonun geri tuşu: önce açık pencereyi kapatır, sonra Ana sayfaya döner;
// Ana sayfadayken ilk basışta "çıkmak için tekrar basın" der, 2,5 sn içinde tekrar basılırsa uygulamadan çıkar.
import { t } from './i18n.js';
import { bildir, ustPencereyiKapat } from './util.js';
import { S } from './durum.js';

let tuzak = false;       // geçmişte bizim eklediğimiz fazladan kayıt var mı
let cikisZamani = 0;

function tuzakKur() {
  if (tuzak) return;
  try { history.pushState({ lumio: 1 }, '', location.href); tuzak = true; } catch (e) { /* önemli değil */ }
}

export function geriTusunuBaslat(anaSayfayaDon) {
  try { history.replaceState({ lumio: 0 }, '', location.href); } catch (e) { return; }
  tuzakKur();
  // Bazı tarayıcılar, kullanıcı dokunmadan eklenen kayıtları atlar: ilk dokunuşta da emin ol.
  const dokunus = () => tuzakKur();
  document.addEventListener('pointerdown', dokunus, true);
  document.addEventListener('keydown', dokunus, true);

  window.addEventListener('popstate', () => {
    tuzak = false;
    if (ustPencereyiKapat()) { tuzakKur(); return; }
    if (S.sekme && S.sekme !== 'ana' && S.profil) { anaSayfayaDon(); tuzakKur(); return; }
    const simdi = Date.now();
    if (simdi - cikisZamani < 2500) { cikisZamani = 0; history.back(); return; }   // ikinci basış: çık
    cikisZamani = simdi;
    bildir(t('Çıkmak için tekrar geri tuşuna basın'));
    tuzakKur();
  });
}

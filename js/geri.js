// Telefonun geri tuşu: önce açık pencereyi kapatır, sonra Ana sayfaya döner;
// Ana sayfadayken ilk basışta "çıkmak için tekrar basın" der, 2,5 sn içinde tekrar basılırsa uygulamadan çıkar.
//
// Not: Chrome/Android, kullanıcı dokunmadan eklenen geçmiş kayıtlarını geri tuşunda atlar. Bu yüzden
// geçmişe "tuzak" kaydı sayfa açılırken değil, ilk gerçek dokunuşta (click/pointerup/touchend) eklenir;
// geri tuşundan sonra da yeniden eklenir (dokunuş olmuşsa tarayıcı bunu kabul eder).
import { t } from './i18n.js';
import { bildir, ustPencereyiKapat } from './util.js';
import { S } from './durum.js';

let tuzak = false;
let cikisZamani = 0;

function tuzakKur() {
  if (tuzak) return;
  try { history.pushState({ lumio: 1 }, '', location.href); tuzak = true; } catch (e) { /* önemli değil */ }
}

export function geriTusunuBaslat(anaSayfayaDon) {
  try { history.replaceState({ lumio: 0 }, '', location.href); } catch (e) { return; }
  ['click', 'pointerup', 'touchend', 'keydown'].forEach(o => document.addEventListener(o, tuzakKur, true));

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

// Telefonun geri tuşu için tarayıcı geçmişi sayacı (hiçbir şeye bağımlı değil).
// Kural: geçmişe her yeni kayıt, kullanıcının gerçek bir dokunuşu sırasında eklenir (Android Chrome,
// dokunuşsuz eklenen kayıtları geri tuşunda atlar). Pencere açılınca bir kayıt eklenir, kapanınca geri alınır.
export const G = {
  ust: 0,          // "kök" kaydının üstündeki kayıt sayısı (açık pencereler + sekme)
  bekleyen: 0,     // bizim çağırdığımız history.back() sayısı (popstate'ini yok say)
  kok: false,      // "çıkış uyarısı" kaydı eklendi mi
  pop: false,      // şu an popstate işleniyor mu
  sekme: false,    // ana sayfadan başka sekmeye geçince eklenen kayıt var mı
  borc: 0          // ✕ ile kapanmış ama geçmişten henüz çıkarılmamış kayıtlar
};
let zaman = null;

export function kokKur() {
  if (G.kok) return;
  try { history.pushState({ lumio: 'kok' }, '', location.href); G.kok = true; } catch (e) { /* önemli değil */ }
}

export function girdiEkle() {
  if (!G.kok) return false;
  if (G.borc > 0) { G.borc--; return true; }       // az önce kapanan pencerenin kaydını devral (geri/ileri yarışı olmasın)
  try { history.pushState({ lumio: 'g' }, '', location.href); G.ust++; return true; } catch (e) { return false; }
}

// Kullanıcı ✕ ile kapattı: kayıt hemen değil, kısa süre sonra geri alınır
// (arkasından hemen yeni pencere açılırsa o kaydı devralır).
export function girdiGeriAl() {
  if (G.ust - G.borc <= 0) return;
  G.borc++;
  clearTimeout(zaman); zaman = setTimeout(borcuOde, 80);
}
function borcuOde() {
  const n = Math.min(G.borc, G.ust);
  G.borc = 0;
  if (n <= 0) return;
  G.ust -= n; G.bekleyen++;
  try { history.go(-n); } catch (e) { G.bekleyen--; }
}

// Pencere kapandı: kayıt tarayıcı tarafından zaten çıkarıldıysa yalnız sayacı düşür
export function pencereGirdisiniBirak(girdi) {
  if (!girdi) return;
  if (G.pop) G.ust--; else girdiGeriAl();
}

// Satış ve analiz paketi: analiz türleri, konu etiketleri, ürün seçimi ve müşteriye giden mesaj (ekrandan bağımsız, test edilebilir).
// Tüm ifadeler KOZMETİK gözlemdir; tıbbi teşhis ya da tedavi vaadi içermez.
import { t } from './i18n.js';

export const TURLER = ['sac', 'tirnak', 'kas', 'cilt'];
export const TUR_AD = { sac: 'Saç', tirnak: 'Tırnak', kas: 'Kaş', cilt: 'Cilt' };
// Konu etiketleri: id → Türkçe ad (ekranda t() ile çevrilir; Worker'a Türkçe ad gider)
export const ETIKETLER = {
  sac: { kuru: 'Kuruluk', yagli: 'Yağlanma', hasarli: 'Yıpranmış / hasarlı', boyali: 'Boyalı saç bakımı', kirik_uc: 'Kırık uçlar', donuk: 'Matlık / donukluk', ince: 'İnce / zayıf tel', hacim: 'Hacim eksikliği', kivircik: 'Kıvırcık / elektriklenme', kepek: 'Kepek görünümü' },
  tirnak: { kirilgan: 'Kırılgan tırnak', katmanli: 'Katmanlı / soyulan', donuk: 'Matlık / donukluk', kutikul: 'Kuru kütikül', uzama: 'Uzama / güçlendirme' },
  kas: { seyrek: 'Seyrek kaş', sekil: 'Şekil / düzen', soluk: 'Soluk renk', kisa: 'Kısa / zayıf tüyler' },
  cilt: { kuru: 'Kuruluk', yagli: 'Yağlanma', donuk: 'Matlık / donukluk', hassas: 'Hassas görünüm', leke: 'Ton eşitsizliği / leke', kirisiklik: 'İnce çizgi / kırışıklık', gozenek: 'Gözenek', akne: 'Sivilceye eğilim' }
};
export const tumEtiketler = () => { const o = {}; TURLER.forEach(k => Object.entries(ETIKETLER[k]).forEach(([id, ad]) => { o[k + ':' + id] = ad; })); return o; };
export const etiketAd = (anahtar) => { const [k, id] = String(anahtar).split(':'); return (ETIKETLER[k] && ETIKETLER[k][id]) || ''; };

// Ürün bağlantısı: yalnız https; alan adı yazılmışsa https:// eklenir. Geçersizse null.
export function linkDuzenle(giris) {
  let u = String(giris || '').trim();
  if (!u) return '';
  if (/^http:\/\//i.test(u)) return null;
  if (!/^https:\/\//i.test(u)) { if (/^[a-z][a-z0-9+.-]*:/i.test(u) || /\s/.test(u)) return null; u = 'https://' + u; }
  if (u.length > 500 || /\s/.test(u)) return null;
  try { const x = new URL(u); if (x.protocol !== 'https:' || !x.hostname.includes('.')) return null; } catch (e) { return null; }
  return u;
}

// Bu analiz türüne uygun, aktif ürünler (Worker'a gidecek kısa liste)
export function analizUrunleri(urunler, tur) {
  return (urunler || []).filter(u => u.aktif !== false && (u.turler || []).includes(tur)).slice(0, 40)
    .map(u => ({ id: u.id, ad: u.ad, etiketler: (u.etiketler || []).filter(e => e.startsWith(tur + ':')).map(etiketAd).filter(Boolean) }));
}

// Müşteriye WhatsApp mesajı (5 dil). ogeler: { ad, kullanim, link, gerekce }
const M = {
  tr: { sel: (a) => `Merhaba ${a},`, giris: (s, tur) => `${s} salonunda yapılan ${tur} analizinin özeti:`, ne: 'Gözlem', uyari: 'Not', oneri: 'Size uygun bakım ürünleri', nasil: 'Kullanım', al: 'Satın alma', son: 'Bu bir bakım önerisidir, tıbbi değerlendirme değildir. Sorularınız için bize yazabilirsiniz.', tur: { sac: 'saç', tirnak: 'tırnak', kas: 'kaş', cilt: 'cilt' } },
  en: { sel: (a) => `Hello ${a},`, giris: (s, tur) => `Summary of your ${tur} analysis at ${s}:`, ne: 'Observation', uyari: 'Note', oneri: 'Care products suited to you', nasil: 'How to use', al: 'Buy', son: 'This is a care suggestion, not a medical assessment. Feel free to message us with any questions.', tur: { sac: 'hair', tirnak: 'nail', kas: 'eyebrow', cilt: 'skin' } },
  de: { sel: (a) => `Hallo ${a},`, giris: (s, tur) => `Zusammenfassung Ihrer ${tur}-Analyse bei ${s}:`, ne: 'Beobachtung', uyari: 'Hinweis', oneri: 'Passende Pflegeprodukte für Sie', nasil: 'Anwendung', al: 'Kaufen', son: 'Dies ist eine Pflegeempfehlung, keine medizinische Beurteilung. Bei Fragen schreiben Sie uns gern.', tur: { sac: 'Haar', tirnak: 'Nagel', kas: 'Augenbrauen', cilt: 'Haut' } },
  ru: { sel: (a) => `Здравствуйте, ${a}!`, giris: (s, tur) => `Итоги анализа (${tur}) в салоне ${s}:`, ne: 'Наблюдение', uyari: 'Примечание', oneri: 'Подходящие вам средства ухода', nasil: 'Применение', al: 'Купить', son: 'Это рекомендация по уходу, а не медицинское заключение. Если есть вопросы, напишите нам.', tur: { sac: 'волосы', tirnak: 'ногти', kas: 'брови', cilt: 'кожа' } },
  kk: { sel: (a) => `Сәлеметсіз бе, ${a}!`, giris: (s, tur) => `${s} салонында жасалған талдау (${tur}) қорытындысы:`, ne: 'Бақылау', uyari: 'Ескертпе', oneri: 'Сізге сай күтім құралдары', nasil: 'Қолдану', al: 'Сатып алу', son: 'Бұл күтім бойынша ұсыныс, медициналық қорытынды емес. Сұрағыңыз болса, бізге жазыңыз.', tur: { sac: 'шаш', tirnak: 'тырнақ', kas: 'қас', cilt: 'тері' } }
};
export function analizMesaji(dil, { ad, tur, gozlem, uyari, ogeler, salon, usta }) {
  const x = M[dil] || M.tr;
  const s = [x.sel(ad || ''), '', x.giris(salon || '', x.tur[tur] || ''), '', x.ne + ': ' + (gozlem || '')];
  if (uyari) s.push('', x.uyari + ': ' + uyari);
  if ((ogeler || []).length) {
    s.push('', x.oneri + ':');
    ogeler.forEach((o, i) => {
      s.push('', (i + 1) + '. ' + o.ad);
      if (o.gerekce) s.push('   ' + o.gerekce);
      if (o.kullanim) s.push('   ' + x.nasil + ': ' + o.kullanim);
      if (o.link) s.push('   ' + x.al + ': ' + o.link);
    });
  }
  s.push('', x.son);
  if (usta || salon) s.push('', [usta, salon].filter(Boolean).join(' • '));
  return s.join('\n');
}

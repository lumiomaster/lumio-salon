// Ana sayfa: yarınki randevular + müşteriye tek tıkla WhatsApp hatırlatma (gönderildi takibiyle)
import { t } from '../i18n.js';
import { h, doldur } from '../util.js';
import { S } from '../durum.js';
import { randevulariYukle, uyeleriYukle } from '../veri.js';
import { tarihMetin, tarihEkle, dkMetin } from '../takvim-mantik.js';
import { mesajYap, hitap, tarihTR } from '../mesaj.js';
import { gonderimleriYukle, mesajGonder, mesajAnahtar, gonderilmisYazi } from '../mesaj-kayit.js';

export function yarinKarti() {
  const kutu = h('div', null);
  const yarin = tarihEkle(tarihMetin(new Date()), 1);
  const yukle = () => Promise.all([randevulariYukle(yarin, yarin), gonderimleriYukle().catch(() => ({})), uyeleriYukle()]).then(([liste, G, uyeler]) => {
    const r = liste.filter(x => x.durum !== 'iptal' && x.durum !== 'odendi');
    if (!r.length) { doldur(kutu, null); return; }
    const ad = (uid) => (uyeler.find(u => u.id === uid) || { ad: '' }).ad;
    const bekleyen = r.filter(x => !G[mesajAnahtar(x.musteriId || '', 'hatirlatma', x.id)]).length;
    doldur(kutu, h('div', { class: 'kart bilgi' },
      h('strong', null, '⏰ ' + t('Yarınki randevular') + ' (' + r.length + ')'),
      h('p', { class: 'kucuk' }, bekleyen ? t('{n} müşteriye hatırlatma gönderilmedi.', { n: bekleyen }) : t('Hepsine hatırlatma gönderildi.')),
      r.map(x => {
        const g = x.musteriId ? G[mesajAnahtar(x.musteriId, 'hatirlatma', x.id)] : null;
        const usta = x.kalemler.map(k => ad(k.ustaUid).split(' ')[0]).filter((v, i, a) => v && a.indexOf(v) === i).join(', ');
        const hizmet = x.kalemler.map(k => k.ad).join(' + ');
        const dugme = h('button', { class: 'dugme ikincil kucuk-dugme', type: 'button', disabled: !x.musteriTel, onclick: () => mesajGonder({
          musteriId: x.musteriId || '', tel: x.musteriTel, tur: 'hatirlatma', anahtar: x.id, onceki: g,
          metin: mesajYap('hatirlatma', { MUSTERI_ADI: hitap(x.musteriAd), TARIH: tarihTR(x.tarih), SAAT: dkMetin(x.bas), HIZMET: hizmet, USTA_ADI: usta.includes(',') ? '' : usta }), yap: (d) => mesajYap('hatirlatma', { MUSTERI_ADI: hitap(x.musteriAd), TARIH: tarihTR(x.tarih), SAAT: dkMetin(x.bas), HIZMET: hizmet, USTA_ADI: usta.includes(',') ? '' : usta }, d),
          yenile: yukle }) }, x.musteriTel ? 'WhatsApp' : t('Telefon yok'));
        return h('div', { class: 'satir yarin-satir' },
          h('div', null, h('strong', null, dkMetin(x.bas) + ' · ' + x.musteriAd), h('div', { class: 'kucuk' }, hizmet + (usta ? ' · ' + usta : '')),
            g ? h('div', { class: 'kucuk gonderildi' }, '✓ ' + gonderilmisYazi(g)) : null),
          dugme);
      })));
  }).catch(() => {});
  yukle();
  return kutu;
}

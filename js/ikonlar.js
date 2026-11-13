// Alt menü ve ekranlar için tek stilli çizgi simgeler (24×24, çizgi kalınlığı 1.75). Emoji yerine kullanılır; renk yazı renginden gelir.
const YOL = {
  ana: ['M3.5 11.2 12 4l8.5 7.2', 'M5.8 9.8v9.7h12.4V9.8', 'M10 19.5v-5h4v5'],
  takvim: ['M4.5 6.5a2.5 2.5 0 0 1 2.5-2.5h10a2.5 2.5 0 0 1 2.5 2.5v11a2.5 2.5 0 0 1-2.5 2.5H7a2.5 2.5 0 0 1-2.5-2.5z', 'M4.5 9.8h15', 'M8.5 2.8v3', 'M15.5 2.8v3', 'M8.3 13.4h.01', 'M12 13.4h.01', 'M15.7 13.4h.01', 'M8.3 16.6h.01', 'M12 16.6h.01'],
  kasa: ['M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17z', 'M14.8 9.3c-.5-.9-1.5-1.4-2.7-1.4-1.5 0-2.6.8-2.6 2 0 2.6 5.2 1.4 5.2 4 0 1.2-1.2 2-2.7 2-1.2 0-2.3-.5-2.8-1.5', 'M12 6.2v1.7', 'M12 16.1v1.7'],
  musteri: ['M6 4.5A1.5 1.5 0 0 1 7.5 3h10A1.5 1.5 0 0 1 19 4.5v15a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 6 19.5z', 'M12.5 11.3a2.3 2.3 0 1 0 0-4.6 2.3 2.3 0 0 0 0 4.6z', 'M8.8 17c.7-1.7 2.1-2.5 3.7-2.5s3 .8 3.7 2.5', 'M3.5 8h2.5', 'M3.5 12h2.5', 'M3.5 16h2.5'],
  ekip: ['M9 11.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', 'M3.5 19.5c.6-3 2.8-4.8 5.5-4.8s4.9 1.8 5.5 4.8', 'M16.8 11a2.5 2.5 0 1 0 0-5', 'M17 14.8c1.9.3 3.1 1.8 3.5 4.2'],
  salon: ['M6.5 9a2.7 2.7 0 1 0 0-5.4 2.7 2.7 0 0 0 0 5.4z', 'M6.5 20.4a2.7 2.7 0 1 0 0-5.4 2.7 2.7 0 0 0 0 5.4z', 'M8.6 7.6 20 17.8', 'M8.6 16.4 20 6.2'],
  ayarlar: ['M4 7h8.2', 'M16.8 7H20', 'M4 12h3.2', 'M11.8 12H20', 'M4 17h9.2', 'M17.8 17H20', 'M14.5 9.2a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4z', 'M9.5 14.2a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4z', 'M15.5 19.2a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4z'],
  yonetici: ['M12 3.2 19 6v5.6c0 4.3-2.9 7.7-7 9.2-4.1-1.5-7-4.9-7-9.2V6z', 'M8.9 12.1l2.3 2.3 4-4.4']
};
const NS = 'http://www.w3.org/2000/svg';
export function ikon(ad, boyut = 24) {
  const yol = YOL[ad];
  if (!yol) return null;
  const s = document.createElementNS(NS, 'svg');
  s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('width', boyut); s.setAttribute('height', boyut);
  s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', '1.75');
  s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round'); s.setAttribute('aria-hidden', 'true'); s.setAttribute('class', 'cizgi-ikon');
  yol.forEach(d => { const p = document.createElementNS(NS, 'path'); p.setAttribute('d', d); s.append(p); });
  return s;
}

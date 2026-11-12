// Fotoğrafı göndermeden önce küçültür (hız, veri ve gizlilik için): en uzun kenar 1024 px, JPEG. Dosya hiçbir yere kaydedilmez.
export async function resimKucult(dosya, enBuyuk = 1024, kalite = 0.8) {
  const url = URL.createObjectURL(dosya);
  try {
    const img = await new Promise((ok, red) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => red(new Error('Fotoğraf okunamadı')); i.src = url; });
    const o = Math.min(1, enBuyuk / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(img.naturalWidth * o)); c.height = Math.max(1, Math.round(img.naturalHeight * o));
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', kalite);
  } finally { URL.revokeObjectURL(url); }
}

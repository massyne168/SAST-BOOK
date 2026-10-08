export const pageFiles = Array.from({length: 30}, (_, i) => `page-designs/page-${String(i + 1).padStart(2, '0')}.webp`);
export const pages = pageFiles.map((src, i) => `<article class="page image-page" data-page-index="${i}"><img src="${src}" width="1191" height="1685" alt="ELYSIUM record — page ${i + 1}" loading="lazy" decoding="async" draggable="false"></article>`);
const ready = new Map();
export function preparePage(index) {
  if (!ready.has(index)) {
    const image = new Image();
    image.src = pageFiles[index];
    const entry = {image, loaded: false};
    entry.promise = image.decode().then(() => { entry.loaded = true; }).catch(error => {
      if (ready.get(index) === entry) ready.delete(index);
      throw error;
    });
    ready.set(index, entry);
  }
  return ready.get(index).promise;
}
export function prepareSpread(spread) {
  return Promise.all([preparePage(spread * 2), preparePage(spread * 2 + 1)]);
}

export function nearbyPages(spread, direction = 1) {
  const target = spread + direction;
  const neighbor = target >= 0 && target < pageFiles.length / 2 ? target : spread - direction;
  return [...new Set([spread, neighbor]
    .filter(index => index >= 0 && index < pageFiles.length / 2)
    .flatMap(index => [index * 2, index * 2 + 1]))];
}

// Keep decoded image references only for this spread and its immediate neighbors.
// Failed speculative loads are harmless; explicit section/open requests can retry.
export function prepareNearby(spread, direction = 1) {
  const indices = nearbyPages(spread, direction);
  for (const [index, entry] of ready) if (!indices.includes(index)) {
    ready.delete(index);
    if (!entry.loaded) entry.image.src = 'data:,';
  }
  const current = indices.filter(index => Math.floor(index / 2) === spread);
  const next = indices.filter(index => Math.floor(index / 2) !== spread);
  return Promise.allSettled(current.map(preparePage)).then(() => Promise.allSettled(next.map(preparePage)));
}

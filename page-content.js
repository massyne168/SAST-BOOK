export const pageFiles = Array.from({length: 30}, (_, i) => `page-designs/page-${String(i + 1).padStart(2, '0')}.webp`);
export const pages = pageFiles.map((src, i) => `<article class="page image-page" data-page-index="${i}"><img src="${src}" width="1191" height="1685" alt="ELYSIUM record — page ${i + 1}" draggable="false"></article>`);
const ready = new Map();
export function preparePage(index) {
  if (!ready.has(index)) {
    const image = new Image();
    image.src = pageFiles[index];
    const entry = {image};
    entry.promise = image.decode().catch(error => {
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

export function nearbyPages(spread) {
  const first = Math.max(0, spread * 2 - 2);
  const last = Math.min(pageFiles.length - 1, spread * 2 + 3);
  return Array.from({length: last - first + 1}, (_, offset) => first + offset);
}

// Keep decoded image references only for this spread and its immediate neighbors.
// Failed speculative loads are harmless; explicit section/open requests can retry.
export function prepareNearby(spread) {
  const indices = nearbyPages(spread);
  for (const index of ready.keys()) if (!indices.includes(index)) ready.delete(index);
  return Promise.allSettled(indices.map(preparePage));
}

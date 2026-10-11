export const sourcePageCount = 30;
export const pageCount = 40;
export const pageFiles = Array.from({length: sourcePageCount}, (_, i) => `page-designs/page-${String(i + 1).padStart(2, '0')}.webp`);
const extensionPage = index => `<article class="page extension-page" data-page-index="${index}"><div class="extension-page__header"><span>ELYSIUM / SAST</span><span>ARMORY ARCHIVE EXTENSION</span></div><div class="extension-page__body"><p class="extension-page__eyebrow">CONTROLLED RECORD CONTINUATION</p><h2>ARMORY<br>RECORD</h2><div class="extension-page__number">${String(index + 1).padStart(3, '0')}</div><p class="extension-page__lead">Reserved for a future documented equipment issue.</p><div class="extension-page__rule"></div><dl><div><dt>DOCUMENT NUMBER</dt><dd>EL-TD-ARM-${String(index + 1).padStart(3, '0')}</dd></div><div><dt>RECORD STATUS</dt><dd>RESERVED / NOT ISSUED</dd></div><div><dt>ASSIGNED PERSONNEL</dt><dd>NOT RECORDED</dd></div><div><dt>INVENTORY DETAIL</dt><dd>AWAITING AUTHORIZED ENTRY</dd></div></dl></div><div class="extension-page__footer"><span>AUTHORIZED PERSONNEL ONLY</span><span>PAGE ${String(index + 1).padStart(2, '0')}</span></div></article>`;
export const pages = Array.from({length: pageCount}, (_, i) => i < sourcePageCount
  ? `<article class="page image-page" data-page-index="${i}"><img src="${pageFiles[i]}" width="1191" height="1685" alt="ELYSIUM record — page ${i + 1}" loading="lazy" decoding="async" draggable="false"><span class="page-fallback" aria-live="polite" hidden>PAGE DATA UNAVAILABLE</span></article>`
  : extensionPage(i));
const ready = new Map();
export function preparePage(index) {
  if (index >= sourcePageCount) return Promise.resolve();
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
  const neighbor = target >= 0 && target < pageCount / 2 ? target : spread - direction;
  return [...new Set([spread, neighbor]
    .filter(index => index >= 0 && index < pageCount / 2)
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

export const SPREAD_COUNT = 15;
export const STORAGE_KEY = 'armory-book.spread';
export function savedSpread(value) {
  if (typeof value !== 'string' && typeof value !== 'number') return 0;
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(14, Math.max(0, Math.trunc(number))) : 0;
}
export function canTurn(spread, direction, count = SPREAD_COUNT) {
  return Number.isInteger(spread) && (direction === 1 || direction === -1) &&
    spread >= 0 && spread < count && spread + direction >= 0 && spread + direction < count;
}
export function loadSpread(storage) {
  try { return savedSpread(storage.getItem(STORAGE_KEY)); } catch { return 0; }
}
export function saveSpread(storage, spread) {
  try { storage.setItem(STORAGE_KEY, String(savedSpread(spread))); } catch { /* Private browsing may deny storage. */ }
}

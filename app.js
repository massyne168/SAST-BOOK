import {FlipEngine} from './flip-engine.js';
import {pages, pageFiles, prepareSpread, prepareNearby} from './page-content.js';
import {loadSpread, saveSpread} from './reader-state.js';
import {setupZoom} from './zoom.js';
import {focusBook, isBookFocused, setBookFocused, setBookOpen, setBookOpening, resetBookFocus} from './book-focus.js';
const $ = selector => document.querySelector(selector);
const discord = $('.discord-link');
const discordUrl = discord?.dataset.discordUrl || 'https://discord.gg/YOUR-SERVER';
if (discord) discord.href = discordUrl;
const book = $('#book'), main = $('main'), cover = $('#archive-cover'), pair = $('.book-pair');
let selected = null, preparing = false, coverOpening = false, turning = false, lastTap = null, stampTimer;
book.addEventListener('error', event => {
  const image = event.target;
  if (!(image instanceof HTMLImageElement) || !image.matches('.image-page img')) return;
  const page = image.closest('.image-page');
  const fallback = page?.querySelector('.page-fallback');
  if (!page || !fallback) return;
  image.hidden = true;
  fallback.hidden = false;
  page.classList.add('page-unavailable');
}, true);
let storage;
try { storage = window.localStorage; } catch { /* Storage is optional. */ }
const status = message => { $('#reader-status').textContent = message; };
const busy = () => preparing || coverOpening || turning;
const blocked = () => preparing || coverOpening || main.classList.contains('archive-closed') || !!document.querySelector('dialog[open]');

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const carouselButtons = document.createElement('nav');
carouselButtons.className = 'carousel-controls';
carouselButtons.setAttribute('aria-label', 'Choose a book');
carouselButtons.innerHTML = '<button type="button" data-carousel-direction="-1" aria-label="Show the previous book">PREVIOUS BOOK</button><span aria-live="polite"></span><button type="button" data-carousel-direction="1" aria-label="Show the next book">NEXT BOOK</button>';
pair.insertAdjacentElement('afterend', carouselButtons);
let carouselIndex = pair.dataset.activeBook === 'directory' ? 1 : 0;
let carouselTimer, carouselTransitioning = false, wheelTotal = 0, wheelIdleTimer, wheelGestureLocked = false;
const carouselNames = ['ARMORY', 'RANK DIRECTORY'];
function syncCarousel() {
  pair.dataset.activeBook = carouselIndex === 0 ? 'archive' : 'directory';
  carouselButtons.querySelector('span').textContent = `${carouselNames[carouselIndex]} / 02`;
  carouselButtons.querySelectorAll('button').forEach(button => {
    button.disabled = (Number(button.dataset.carouselDirection) < 0 && carouselIndex === 0) ||
      (Number(button.dataset.carouselDirection) > 0 && carouselIndex === 1);
  });
  [['archive', $('#open-archive')], ['directory', $('#open-rank-directory')]].forEach(([bookName, button]) => {
    const inactive = bookName !== pair.dataset.activeBook;
    button.hidden = inactive;
    button.disabled = inactive;
  });
}
function setCarouselBook(index) {
  if (index < 0 || index > 1 || index === carouselIndex || carouselTransitioning) return false;
  carouselIndex = index;
  syncCarousel();
  if (reducedMotion.matches) return true;
  carouselTransitioning = true;
  pair.dataset.carouselTransitioning = 'true';
  clearTimeout(carouselTimer);
  carouselTimer = window.setTimeout(() => {
    carouselTransitioning = false;
    delete pair.dataset.carouselTransitioning;
  }, 520);
  return true;
}
syncCarousel();
carouselButtons.addEventListener('click', event => {
  const button = event.target.closest('[data-carousel-direction]');
  if (button && !button.disabled) setCarouselBook(carouselIndex + Number(button.dataset.carouselDirection));
});
pair.addEventListener('click', event => {
  const action = event.target.closest('#open-archive,#open-rank-directory');
  if (action) setCarouselBook(action.id === 'open-archive' ? 0 : 1);
}, true);
pair.addEventListener('wheel', event => {
  if (!main.classList.contains('archive-closed') || document.body.classList.contains('is-maintenance') ||
      !$('#maintenance-screen').hidden || document.querySelector('dialog[open]')) return;
  const direction = Math.sign(event.deltaY);
  if (!direction) return;
  const nextIndex = carouselIndex + direction;
  if (nextIndex < 0 || nextIndex > 1) {
    wheelTotal = 0;
    return;
  }
  event.preventDefault();
  clearTimeout(wheelIdleTimer);
  wheelIdleTimer = window.setTimeout(() => {
    wheelGestureLocked = false;
    wheelTotal = 0;
  }, 220);
  if (wheelGestureLocked || carouselTransitioning) return;
  wheelTotal += event.deltaY;
  if (Math.abs(wheelTotal) < 75) return;
  wheelGestureLocked = true;
  wheelTotal = 0;
  setCarouselBook(nextIndex);
}, {passive: false});
pair.addEventListener('transitionend', event => {
  if (event.target !== pair || event.propertyName !== 'opacity') return;
  clearTimeout(carouselTimer);
  carouselTransitioning = false;
  delete pair.dataset.carouselTransitioning;
});
function controls(spread) {
  document.querySelectorAll('.reader-controls button,#read-spread').forEach(button => { button.disabled = busy(); });
  $('#previous').disabled = busy() || spread === 0;
  $('#next').disabled = busy() || spread === 14;
  book.setAttribute('aria-busy', String(busy()));
}
function changed(spread) {
  selected = null; lastTap = null;
  $('#position').textContent = `${String(spread * 2 + 1).padStart(2, '0')} — ${String(spread * 2 + 2).padStart(2, '0')}`;
  $('#spread-progress').value = spread + 1;
  $('#progress-text').textContent = `SPREAD ${String(spread + 1).padStart(2, '0')} / 15`;
  book.setAttribute('aria-label', `Pages ${spread * 2 + 1} and ${spread * 2 + 2} of 30. Drag across the spine or use arrow keys. Double-click a page to zoom.`);
  saveSpread(storage, spread); controls(spread);
  if (!main.classList.contains('archive-closed')) void prepareNearby(spread, 1);
}
const engine = new FlipEngine(book, {
  spreadCount: 15, initialSpread: loadSpread(storage), render: i => pages[i], blocked,
  onChange: changed,
  onPrepareTurn: (direction, spread) => { void prepareNearby(spread, direction); },
  onBusyChange: value => { turning = value; if(value) lastTap = null; controls(engine.spread); },
  onSelect: (index, event) => {
    if (busy() || blocked()) return;
    selected = index;
    const now = performance.now();
    if (lastTap && lastTap.index === index && now - lastTap.time < 350 && Math.hypot(event.clientX-lastTap.x,event.clientY-lastTap.y)<24) {
      lastTap = null; zoom.open(index); return;
    }
    lastTap = {index,time:now,x:event.clientX,y:event.clientY};
  }
});
const zoom = setupZoom({pageFiles, onError: status});
book.addEventListener('dblclick', () => {
  if (lastTap && !busy() && !blocked()) { zoom.open(lastTap.index); lastTap = null; }
});
$('#previous').onclick = () => engine.turn(-1);
$('#next').onclick = () => engine.turn(1);
$('#previous').textContent = '← PREVIOUS';
$('#next').textContent = 'NEXT →';
$('#close-archive').textContent = 'RETURN TO BOOKS';
const readDialog = $('#read-dialog');
let rankDirectoryModule;
function currentDirectoryPage() {
  return rankDirectoryModule?.getCurrentSpread?.() || null;
}
function showReadSpread() {
  const directoryOpen = main.classList.contains('directory-open');
  if (directoryOpen) {
    const spread = currentDirectoryPage();
    if (!spread) return;
    $('#read-content').innerHTML = spread.pages.map((markup, index) => `<div class="reading-page" aria-label="Directory page ${index + 1}">${markup}</div>`).join('');
    $('#read-dialog h2').textContent = `${spread.title} — READING VIEW`;
  } else {
    if (busy()) return;
    const firstPage = engine.spread * 2;
    $('#read-content').innerHTML = [pages[firstPage], pages[firstPage + 1]].map((markup, index) => `<div class="reading-page" aria-label="Armory page ${firstPage + index + 1}">${markup}</div>`).join('');
    $('#read-dialog h2').textContent = `ARMORY SPREAD ${String(engine.spread + 1).padStart(2, '0')} — READING VIEW`;
  }
  readDialog.classList.toggle('directory-reading', directoryOpen);
  readDialog.showModal();
  $('#close-read').focus();
}
function zoomCurrentDirectoryPage() {
  const spread = currentDirectoryPage();
  if (spread) zoom.openContent(spread.pages[0], spread.title);
}
function downloadCurrentDirectoryPage() {
  const spread = currentDirectoryPage();
  if (!spread) return;
  const content = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${spread.title}</title><link rel="stylesheet" href="${new URL('styles.css', location.href).href}"><style>body{margin:24px;background:#170a0e}.downloaded-rank-page{width:min(100%,720px);aspect-ratio:1191/1685;margin:auto}.downloaded-rank-page>.rank-page{width:100%;height:100%}</style></head><body><main class="downloaded-rank-page">${spread.pages[0]}</main></body></html>`;
  const url = URL.createObjectURL(new Blob([content], {type: 'text/html'}));
  const link = document.createElement('a');
  link.href = url;
  link.download = `${spread.fileName}.html`;
  document.body.append(link); link.click(); link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
$('#read-spread').onclick = showReadSpread;
$('#rank-directory .rank-controls').addEventListener('click', event => {
  const action = event.target.closest('[data-reader-action]');
  if (!action || action.disabled) return;
  if (action.dataset.readerAction === 'read') showReadSpread();
  if (action.dataset.readerAction === 'zoom') zoomCurrentDirectoryPage();
  if (action.dataset.readerAction === 'download') downloadCurrentDirectoryPage();
});
$('#zoom-page').onclick = () => {
  if (busy()) return;
  if (main.classList.contains('directory-open')) zoomCurrentDirectoryPage();
  else zoom.open(selected ?? engine.spread * 2 + 1);
};
$('#download-page').onclick = () => {
  if (busy()) return;
  if (main.classList.contains('directory-open')) {
    downloadCurrentDirectoryPage();
    return;
  }
  const link = document.createElement('a');
  link.href = pageFiles[selected ?? engine.spread * 2 + 1];
  link.download = link.href.split('/').pop();
  document.body.append(link); link.click(); link.remove();
};
$('#close-read').onclick = () => readDialog.close();
readDialog.addEventListener('click', e => { if (e.target === readDialog) readDialog.close(); });
readDialog.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  event.preventDefault();
  readDialog.close();
});
async function openArchive() {
  if (coverOpening) return;
  if (!isBookFocused('archive')) {
    try { await focusBook('archive'); }
    catch (cause) {
      console.error('Unable to focus the Armory cover', cause);
      status('Unable to focus the archive cover. Please try again.');
    }
    return;
  }
  if (!setBookOpening('archive')) return;
  coverOpening = true; $('#open-archive').disabled = true;
  let pageDataUnavailable = false;
  let opened = false;
  try {
    await prepareSpread(engine.spread);
    void prepareNearby(engine.spread, 1);
  } catch {
    // Open the reader even when a page file is missing so its visible fallback can be shown.
    pageDataUnavailable = true;
  }
  try {
    cover.classList.add('opening');
    await new Promise(resolve => setTimeout(resolve, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 650));
    main.classList.remove('archive-closed');
    status(pageDataUnavailable ? 'PAGE DATA UNAVAILABLE' : ''); book.focus({preventScroll:true});
    const stamp = $('#access-stamp'); stamp.hidden = false;
    clearTimeout(stampTimer);
    stampTimer = setTimeout(() => { stamp.hidden = true; }, 1100);
    opened = true;
  } catch (cause) {
    console.error('Unable to open the archive', cause);
    status('Unable to load the archive pages. Please try again.');
  } finally {
    cover.classList.remove('opening');
    coverOpening = false;
    $('#open-archive').disabled = false;
    if (opened) setBookOpen('archive');
    else setBookFocused('archive');
    controls(engine.spread);
  }
}
$('#open-archive').addEventListener('click', openArchive);
$('#close-archive').onclick = async () => {
  if (busy() || engine.pending) return;
  clearTimeout(stampTimer); $('#access-stamp').hidden = true;
  main.classList.add('archive-closed');
  try { await resetBookFocus('archive'); }
  catch (cause) {
    console.error('Unable to restore the book overview', cause);
    status('Unable to restore the archive covers. Please try again.');
  } finally {
    $('#open-archive').focus({preventScroll:true});
  }
};
const fullscreen = $('#fullscreen');
function syncFullscreen() {
  fullscreen.hidden = !(document.fullscreenEnabled && document.documentElement.requestFullscreen && document.exitFullscreen);
  fullscreen.textContent = document.fullscreenElement ? 'EXIT FULLSCREEN' : 'FULLSCREEN';
  fullscreen.setAttribute('aria-label', document.fullscreenElement ? 'Exit fullscreen' : 'Enter fullscreen');
  fullscreen.setAttribute('aria-pressed', String(!!document.fullscreenElement));
}
fullscreen.onclick = async () => {
  if (busy()) return;
  try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); }
  catch { status('Fullscreen is unavailable in this browser or window.'); }
  syncFullscreen();
};
document.addEventListener('fullscreenchange', syncFullscreen);
syncFullscreen();

$('#open-rank-directory').addEventListener('click', async () => {
  if (!isBookFocused('directory')) {
    try { await focusBook('directory'); }
    catch (cause) {
      console.error('Unable to focus the Rank Directory cover', cause);
      status('Unable to focus the Rank Directory cover. Please try again.');
    }
    return;
  }
  if (!setBookOpening('directory')) return;
  try {
    rankDirectoryModule = await import('./rank-directory.js');
    main.classList.remove('archive-closed');
    main.classList.add('directory-open');
    rankDirectoryModule.openRankDirectory();
    setBookOpen('directory');
  } catch (cause) {
    console.error('Unable to open the Rank Directory', cause);
    main.classList.remove('directory-open');
    main.classList.add('archive-closed');
    $('#rank-directory').hidden = true;
    $('#rank-directory').inert = true;
    setBookFocused('directory');
    status('Unable to open the Rank Directory. Please try again.');
  }
});

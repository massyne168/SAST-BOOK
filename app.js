import {FlipEngine} from './flip-engine.js';
import {pages, pageFiles, pageCount, sourcePageCount, prepareSpread, prepareNearby} from './page-content.js';
import {loadSpread, saveSpread} from './reader-state.js';
import {setupZoom} from './zoom.js';
import {focusBook, isBookFocused, setBookFocused, setBookOpen, setBookOpening, resetBookFocus} from './book-focus.js';
import {ensureBookAccess} from './discord-access-client.js';
import {openClassifiedArchive, closeClassifiedArchive} from './classified-archive.js';
import {openBulletins, closeBulletins} from './bulletins.js';
import {initializeResignationForm} from './resignation-form.js';
import {openSupplementalReader, closeSupplementalReader} from './supplemental-readers.js';
import {bookConfig, getBook} from './book-config.js';
const $ = selector => document.querySelector(selector);
const spreadCount = pageCount / 2;
const setTheme = theme => {
  document.documentElement.dataset.theme = theme;
  if (theme === 'overview') delete document.documentElement.dataset.activeBook;
};
const setBookTheme = id => {
  const selectedBook = getBook(id);
  if (!selectedBook) return;
  document.documentElement.dataset.theme = selectedBook.theme;
  document.documentElement.dataset.activeBook = selectedBook.id;
};
setTheme('overview');
document.addEventListener('archive-overview-start', () => {
  setTheme('overview');
  hideOpeningButtons();
});
document.addEventListener('archive-overview-ready', () => {
  scheduleOpeningReveal(() => directoryOpeningButton.focus({preventScroll: true}));
});
document.addEventListener('archive-select-first', () => setCarouselBook(0));
const directoryOpeningButton = $('#open-rank-directory');
const classifiedOpeningButton = $('#open-classified-archive');
const resignationOpeningButton = $('#open-resignation-notices');
const bulletinOpeningButton = $('#open-command-bulletin');
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
let carouselIndex = Math.max(0, bookConfig.findIndex(book => book.id === pair.dataset.activeBook));
let carouselTimer, carouselTransitioning = false, wheelTotal = 0, wheelIdleTimer, wheelGestureLocked = false;
const openingButtons = bookConfig.map(book => [book.id, $(book.opener)]);
const carouselStages = new Map(bookConfig.map(book => [book.id, pair.querySelector(book.stage)]));
let openingRevealTimer, openingRevealGeneration = 0;
function cancelOpeningReveal() {
  window.clearTimeout(openingRevealTimer);
  openingRevealGeneration += 1;
}
function setOpeningButtonHidden(button, inactive = false) {
  button.hidden = false;
  button.disabled = true;
  button.tabIndex = -1;
  button.inert = true;
  button.setAttribute('aria-hidden', 'true');
  button.classList.remove('opening-button-revealed');
  button.classList.add(inactive ? 'opening-button-inactive' : 'opening-button-pending');
}
function hideOpeningButtons() {
  cancelOpeningReveal();
  openingButtons.forEach(([, button]) => setOpeningButtonHidden(button));
}
function revealOpeningButton(button) {
  button.classList.remove('opening-button-pending', 'opening-button-inactive');
  button.classList.add('opening-button-revealed');
  button.disabled = false;
  button.tabIndex = 0;
  button.inert = false;
  button.removeAttribute('aria-hidden');
}
function scheduleOpeningReveal(onReveal) {
  cancelOpeningReveal();
  const generation = openingRevealGeneration;
  const selectedBook = pair.dataset.activeBook;
  const button = openingButtons.find(([kind]) => kind === selectedBook)?.[1];
  if (!button || !main.classList.contains('archive-closed')) return;
  openingButtons.forEach(([kind, action]) => setOpeningButtonHidden(action, kind !== selectedBook));
  const reveal = () => {
    if (generation !== openingRevealGeneration || pair.dataset.activeBook !== selectedBook ||
        !main.classList.contains('archive-closed') || carouselTransitioning || document.querySelector('dialog[open]')) return;
    revealOpeningButton(button);
    onReveal?.();
  };
  if (reducedMotion.matches) {
    reveal();
    return;
  }
  openingRevealTimer = window.setTimeout(reveal, 1000);
}
reducedMotion.addEventListener?.('change', event => {
  if (event.matches && main.classList.contains('archive-closed')) scheduleOpeningReveal();
});
document.addEventListener('site-ready', () => scheduleOpeningReveal());
document.addEventListener('archive-panel-closed', () => scheduleOpeningReveal());
function syncCarousel() {
  const selectedBook = bookConfig[carouselIndex];
  pair.dataset.activeBook = selectedBook.id;
  pair.dataset.activeTheme = selectedBook.theme;
  bookConfig.forEach((book, index) => {
    const stage = carouselStages.get(book.id);
    const distance = index - carouselIndex;
    const visible = Math.abs(distance) <= 1;
    const position = distance === 0 ? 'active' : distance === -1 ? 'previous' : distance === 1 ? 'next' : 'hidden';
    stage.dataset.carouselPosition = position;
    stage.inert = !visible;
    stage.setAttribute('aria-hidden', String(!visible));
  });
  carouselButtons.querySelector('span').textContent = `${selectedBook.title} · ${String(carouselIndex + 1).padStart(2, '0')} / ${String(bookConfig.length).padStart(2, '0')}`;
  carouselButtons.querySelectorAll('button').forEach(button => {
    button.disabled = (Number(button.dataset.carouselDirection) < 0 && carouselIndex === 0) ||
      (Number(button.dataset.carouselDirection) > 0 && carouselIndex === bookConfig.length - 1);
  });
  openingButtons.forEach(([bookName, button]) => setOpeningButtonHidden(button, bookName !== selectedBook.id));
}
async function decodeCover(book) {
  const image = pair.querySelector(`${book.cover}:is(img)`);
  if (!image) return;
  const timeout = new Promise(resolve => window.setTimeout(resolve, 2500));
  const loaded = image.complete ? Promise.resolve() : new Promise(resolve => {
    image.addEventListener('load', resolve, {once:true}); image.addEventListener('error', resolve, {once:true});
  });
  await Promise.race([loaded, timeout]);
  try { await image.decode?.(); } catch { /* The fixed wrapper remains usable when artwork fails. */ }
}
async function initializeCarousel() {
  const visible = bookConfig.filter((_, index) => Math.abs(index - carouselIndex) <= 1);
  await Promise.all(visible.map(decodeCover));
  pair.dataset.carouselReady = 'true';
  bookConfig.filter(book => !visible.includes(book)).forEach(book => { void decodeCover(book); });
}
function setCarouselBook(index) {
  if (index < 0 || index >= bookConfig.length || index === carouselIndex || carouselTransitioning) return false;
  cancelOpeningReveal();
  carouselIndex = index;
  syncCarousel();
  if (reducedMotion.matches) {
    scheduleOpeningReveal();
    return true;
  }
  carouselTransitioning = true;
  pair.dataset.carouselTransitioning = 'true';
  clearTimeout(carouselTimer);
  carouselTimer = window.setTimeout(() => {
    carouselTransitioning = false;
    delete pair.dataset.carouselTransitioning;
    scheduleOpeningReveal();
  }, 520);
  return true;
}
syncCarousel();
void initializeCarousel();
if (document.body.classList.contains('site-ready')) scheduleOpeningReveal();
carouselButtons.addEventListener('click', event => {
  const button = event.target.closest('[data-carousel-direction]');
  if (button && !button.disabled) setCarouselBook(carouselIndex + Number(button.dataset.carouselDirection));
});
pair.addEventListener('click', event => {
  const selectedBook = bookConfig.find(book => event.target.closest(book.opener));
  if (selectedBook) setCarouselBook(bookConfig.indexOf(selectedBook));
}, true);
pair.addEventListener('wheel', event => {
  if (!main.classList.contains('archive-closed') || document.querySelector('dialog[open]')) return;
  const direction = Math.sign(event.deltaY);
  if (!direction) return;
  const nextIndex = carouselIndex + direction;
  if (nextIndex < 0 || nextIndex >= bookConfig.length) {
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
  scheduleOpeningReveal();
});
function controls(spread) {
  document.querySelectorAll('.reader-controls button,#read-spread').forEach(button => { button.disabled = busy(); });
  $('#previous').disabled = busy() || spread === 0;
  $('#next').disabled = busy() || spread === spreadCount - 1;
  book.setAttribute('aria-busy', String(busy()));
}
function changed(spread) {
  selected = null; lastTap = null;
  $('#position').textContent = `${String(spread * 2 + 1).padStart(2, '0')} — ${String(spread * 2 + 2).padStart(2, '0')}`;
  $('#spread-progress').value = spread + 1;
  $('#progress-text').textContent = `SPREAD ${String(spread + 1).padStart(2, '0')} / ${String(spreadCount).padStart(2, '0')}`;
  book.setAttribute('aria-label', `Pages ${spread * 2 + 1} and ${spread * 2 + 2} of ${pageCount}. Drag across the spine or use arrow keys. Double-click a page to zoom.`);
  saveSpread(storage, spread); controls(spread);
  if (!main.classList.contains('archive-closed')) void prepareNearby(spread, 1);
}
const engine = new FlipEngine(book, {
  spreadCount, initialSpread: loadSpread(storage), render: i => pages[i], blocked,
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
  else {
    const index = selected ?? engine.spread * 2 + 1;
    index < sourcePageCount ? zoom.open(index) : zoom.openContent(pages[index], `PAGE ${String(index + 1).padStart(2, '0')}`);
  }
};
$('#download-page').onclick = () => {
  if (busy()) return;
  if (main.classList.contains('directory-open')) {
    downloadCurrentDirectoryPage();
    return;
  }
  const index = selected ?? engine.spread * 2 + 1;
  if (index >= sourcePageCount) {
    const content = `<!doctype html><html lang="en"><meta charset="utf-8"><title>Armory page ${index + 1}</title><link rel="stylesheet" href="${new URL('styles.css', location.href).href}"><main class="downloaded-extension-page">${pages[index]}</main>`;
    const url = URL.createObjectURL(new Blob([content], {type: 'text/html'}));
    const link = document.createElement('a');
    link.href = url; link.download = `page-${String(index + 1).padStart(2, '0')}.html`;
    document.body.append(link); link.click(); link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }
  const link = document.createElement('a');
  link.href = pageFiles[index];
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
  if (!await ensureBookAccess('archive')) return;
  if (coverOpening) return;
  if (!isBookFocused('archive')) {
    try { await focusBook('archive'); }
    catch (cause) {
      console.error('Unable to focus the Armory cover', cause);
      status('Unable to focus the archive cover. Please try again.');
      return;
    }
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
    setBookTheme('archive');
    document.dispatchEvent(new CustomEvent('archive-section-selected', {detail:{section:'armory'}}));
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
async function closeArchive() {
  if (busy() || engine.pending) return;
  clearTimeout(stampTimer); $('#access-stamp').hidden = true;
  main.classList.add('archive-closed');
  hideOpeningButtons();
  setTheme('overview');
  try { await resetBookFocus('archive'); }
  catch (cause) {
    console.error('Unable to restore the book overview', cause);
    status('Unable to restore the archive covers. Please try again.');
  } finally {
    scheduleOpeningReveal(() => $('#open-archive').focus({preventScroll:true}));
  }
};
$('#close-archive').onclick = closeArchive;
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

async function openDirectory() {
  if (!await ensureBookAccess('directory')) return;
  if (!isBookFocused('directory')) {
    try { await focusBook('directory'); }
    catch (cause) {
      console.error('Unable to focus the Rank Directory cover', cause);
      status('Unable to focus the Rank Directory cover. Please try again.');
      return;
    }
  }
  if (!setBookOpening('directory')) return;
  try {
    rankDirectoryModule = await import('./rank-directory.js');
    main.classList.remove('archive-closed');
    main.classList.add('directory-open');
    setBookTheme('directory');
    document.dispatchEvent(new CustomEvent('archive-section-selected', {detail:{section:'directory'}}));
    rankDirectoryModule.openRankDirectory();
    setBookOpen('directory');
  } catch (cause) {
    console.error('Unable to open the Rank Directory', cause);
    main.classList.remove('directory-open');
    main.classList.add('archive-closed');
    setTheme('overview');
    $('#rank-directory').hidden = true;
    $('#rank-directory').inert = true;
    setBookFocused('directory');
    status('Unable to open the Rank Directory. Please try again.');
  }
}


async function openClassified() {
  if (!await ensureBookAccess('classified')) return;
  if (!isBookFocused('classified')) { await focusBook('classified'); return; }
  if (!setBookOpening('classified')) return;
  try {
    main.classList.remove('archive-closed');
    main.classList.add('classified-open');
    setBookTheme('classified');
    openSupplementalReader('classified');
    setBookOpen('classified');
  } catch {
    main.classList.remove('classified-open');
    main.classList.add('archive-closed');
    setTheme('overview');
    setBookFocused('classified');
    status('Unable to open the Classified Archive. Please try again.');
  }
}
async function closeClassified() {
  closeSupplementalReader('classified');
  main.classList.remove('classified-open');
  main.classList.add('archive-closed');
  setTheme('overview');
  await resetBookFocus('classified');
  scheduleOpeningReveal(() => classifiedOpeningButton.focus({preventScroll:true}));
}
$('#classified-close').addEventListener('click', () => { void closeClassified(); });
async function openResignationNotices() {
  if (!await ensureBookAccess('resignation')) return;
  if (!isBookFocused('resignation')) { await focusBook('resignation'); return; }
  if (!setBookOpening('resignation')) return;
  try {
    main.classList.remove('archive-closed'); main.classList.add('resignation-open'); setBookTheme('resignation');
    initializeResignationForm();
    openSupplementalReader('resignation');
    setBookOpen('resignation');
  } catch { setBookFocused('resignation'); status('Unable to open resignation notices. Please try again.'); }
}
async function closeResignationNotices() {
  closeSupplementalReader('resignation');
  main.classList.remove('resignation-open'); main.classList.add('archive-closed'); setTheme('overview');
  await resetBookFocus('resignation'); scheduleOpeningReveal(() => resignationOpeningButton.focus({preventScroll:true}));
}
async function openBulletinArchive() {
  if (!await ensureBookAccess('bulletins')) return;
  if (!isBookFocused('bulletins')) { await focusBook('bulletins'); return; }
  if (!setBookOpening('bulletins')) return;
  try { main.classList.remove('archive-closed'); main.classList.add('bulletins-open'); setBookTheme('bulletins'); openSupplementalReader('bulletins'); setBookOpen('bulletins'); }
  catch { setBookFocused('bulletins'); status('Unable to open command bulletins. Please try again.'); }
}
async function closeBulletinArchive() {
  closeSupplementalReader('bulletins'); main.classList.remove('bulletins-open'); main.classList.add('archive-closed'); setTheme('overview');
  await resetBookFocus('bulletins'); scheduleOpeningReveal(() => bulletinOpeningButton.focus({preventScroll:true}));
}
$('#bulletins-close').addEventListener('click', () => { void closeBulletinArchive(); });
document.addEventListener('supplemental-reader-close', event => {
  if (event.detail?.kind === 'classified') void closeClassified();
  if (event.detail?.kind === 'resignation') void closeResignationNotices();
  if (event.detail?.kind === 'bulletins') void closeBulletinArchive();
});
const bookOpenActions = {openArchive, openDirectory, openClassified, openResignationNotices, openBulletinArchive};
bookConfig.forEach(book => {
  $(book.opener)?.addEventListener('click', () => { void bookOpenActions[book.action]?.(); });
});
// Shared navigation adapter waits for existing animations before switching books.
let archiveNavigation = Promise.resolve();
export function navigateBook(kind, officerId) {
  archiveNavigation = archiveNavigation.catch(() => {}).then(async () => {
    const deadline = performance.now() + 15000;
    while ((busy() || engine.drag || engine.pending || carouselTransitioning) && performance.now() < deadline) {
      await new Promise(resolve => setTimeout(resolve, 40));
    }
    if (busy() || engine.drag || engine.pending || carouselTransitioning) throw new Error('Please finish the current page turn and try again.');
    const destinations = {archive:0,directory:1,classified:2,resignation:3,bulletins:4};
    if (!await ensureBookAccess(kind)) return;
    if (!Object.hasOwn(destinations,kind)) throw new Error('Unknown book destination.');
    const active = [
      ['directory','directory-open'],['classified','classified-open'],
      ['resignation','resignation-open'],['bulletins','bulletins-open']
    ].find(([,className])=>main.classList.contains(className))?.[0] ||
      (main.classList.contains('archive-closed') ? null : 'archive');
    if (active !== kind) {
      if (active === 'directory') await rankDirectoryModule.closeDirectory();
      else if (active === 'classified') await closeClassified();
      else if (active === 'resignation') await closeResignationNotices();
      else if (active === 'bulletins') await closeBulletinArchive();
      else if (active === 'archive') await closeArchive();
      setCarouselBook(destinations[kind]);
      if (!isBookFocused(kind)) await focusBook(kind);
      if (kind === 'directory') await openDirectory();
      else if (kind === 'classified') await openClassified();
      else if (kind === 'resignation') await openResignationNotices();
      else if (kind === 'bulletins') await openBulletinArchive();
      else await openArchive();
    }
    if (kind === 'directory' && officerId &&
        !await rankDirectoryModule.revealOfficer(officerId)) {
      throw new Error('Unable to locate the officer. Please try again.');
    }
    if (kind === 'resignation') {
      document.querySelector('.supplemental-reader--resignation [data-open-form]')?.click();
    }
  });
  return archiveNavigation;
}

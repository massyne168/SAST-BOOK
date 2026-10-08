import {FlipEngine} from './flip-engine.js';
import {pages, pageFiles, prepareSpread, prepareNearby} from './page-content.js';
import {loadSpread, saveSpread} from './reader-state.js';
import {setupZoom} from './zoom.js';
import {focusBook, isBookFocused, setBookFocused, setBookOpen, setBookOpening, resetBookFocus} from './book-focus.js';
const $ = selector => document.querySelector(selector);
const discord = $('.discord-link');
const discordUrl = discord?.dataset.discordUrl || 'https://discord.gg/YOUR-SERVER';
if (discord) discord.href = discordUrl;
const book = $('#book'), main = $('main'), cover = $('#archive-cover');
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
$('#zoom-page').onclick = () => { if (!busy()) zoom.open(selected ?? engine.spread * 2 + 1); };
$('#download-page').onclick = () => {
  if (busy()) return;
  const link = document.createElement('a');
  link.href = pageFiles[selected ?? engine.spread * 2 + 1];
  link.download = link.href.split('/').pop();
  document.body.append(link); link.click(); link.remove();
};
const readDialog = $('#read-dialog');
$('#read-spread').onclick = () => {
  if (busy()) return;
  $('#read-content').innerHTML = pages[engine.spread * 2] + pages[engine.spread * 2 + 1];
  readDialog.showModal();
};
$('#close-read').onclick = () => readDialog.close();
readDialog.addEventListener('click', e => { if (e.target === readDialog) readDialog.close(); });
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
    const {openRankDirectory} = await import('./rank-directory.js');
    main.classList.remove('archive-closed');
    main.classList.add('directory-open');
    openRankDirectory();
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

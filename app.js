import {FlipEngine} from './flip-engine.js';
import {pages, pageFiles, prepareSpread, prepareNearby} from './page-content.js';
import {loadSpread, saveSpread} from './reader-state.js';
import {setupZoom} from './zoom.js';
const $ = selector => document.querySelector(selector);
const book = $('#book'), main = $('main'), cover = $('#archive-cover');
let selected = null, preparing = false, coverOpening = false, turning = false, lastTap = null, stampTimer;
let storage;
try { storage = window.localStorage; } catch { /* Storage is optional. */ }
const status = message => { $('#reader-status').textContent = message; };
const busy = () => preparing || coverOpening || turning;
const blocked = () => preparing || coverOpening || main.classList.contains('archive-closed') || !!document.querySelector('dialog[open]');
function controls(spread) {
  document.querySelectorAll('.reader-controls button,.section-tabs button,#read-spread').forEach(button => { button.disabled = busy(); });
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
  document.querySelectorAll('.section-tabs button').forEach(button => {
    button.setAttribute('aria-current', Number(button.dataset.spread) === spread ? 'location' : 'false');
  });
  saveSpread(storage, spread); controls(spread);
  if (matchMedia('(any-pointer: coarse)').matches) void prepareNearby(spread);
}
const engine = new FlipEngine(book, {
  spreadCount: 15, initialSpread: loadSpread(storage), render: i => pages[i], blocked,
  onChange: changed,
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
document.querySelectorAll('.section-tabs button').forEach(button => {
  button.setAttribute('aria-label', `${button.textContent}, spread ${Number(button.dataset.spread) + 1}`);
  button.onclick = async () => {
    if (busy() || engine.pending) return;
    preparing = true; controls(engine.spread); status('Preparing section…');
    try { const target = Number(button.dataset.spread); await prepareSpread(target); engine.goTo(target); status(''); }
    catch { status('Unable to load this section. Please try again.'); }
    finally { preparing = false; controls(engine.spread); book.focus({preventScroll:true}); }
  };
});
const readDialog = $('#read-dialog');
$('#read-spread').onclick = () => {
  if (busy()) return;
  $('#read-content').innerHTML = pages[engine.spread * 2] + pages[engine.spread * 2 + 1];
  readDialog.showModal();
};
$('#close-read').onclick = () => readDialog.close();
readDialog.addEventListener('click', e => { if (e.target === readDialog) readDialog.close(); });
$('#open-archive').onclick = async () => {
  if (coverOpening) return;
  coverOpening = true; $('#open-archive').disabled = true;
  try {
    await prepareSpread(engine.spread);
    cover.classList.add('opening');
    await new Promise(resolve => setTimeout(resolve, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 650));
    main.classList.remove('archive-closed');
    status(''); book.focus({preventScroll:true});
    const stamp = $('#access-stamp'); stamp.hidden = false;
    clearTimeout(stampTimer);
    stampTimer = setTimeout(() => { stamp.hidden = true; }, 1100);
  } catch { status('Unable to load the archive pages. Please try again.'); }
  finally { cover.classList.remove('opening'); coverOpening = false; $('#open-archive').disabled = false; controls(engine.spread); }
};
$('#close-archive').onclick = () => {
  if (busy() || engine.pending) return;
  clearTimeout(stampTimer); $('#access-stamp').hidden = true;
  main.classList.add('archive-closed'); $('#open-archive').focus({preventScroll:true});
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

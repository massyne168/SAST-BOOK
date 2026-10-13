import {FlipEngine} from './flip-engine.js';
import {directoryPages, directoryPageCount, directoryRanks, rankDirectoryData, replaceDirectoryPersonnel} from './rank-directory-data.js';
import {resetBookFocus} from './book-focus.js';

const $ = selector => document.querySelector(selector);
const categoryCount = () => Math.ceil(directoryPageCount / 2);
let engine, rankBook, directory, initialized = false, switchingCategory = false;
let closingDirectory = false;
let archiveLeft, archiveRight, directoryLeft, directoryRight;
let adminToken = '', adminEnabled = false;
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const renderCategory = pageIndex => {
  const page = directoryPages[pageIndex];
  if (!page) return '<article class="rank-page" aria-label="End of directory"></article>';
  return `<article class="rank-page rank-personnel-list-page rank-roster-page">
    <header class="rank-list-heading"><span>RANK DIRECTORY</span><h2>${escapeHtml(page.rank)}${page.continued ? ' <small>(CONTINUED)</small>' : ''}</h2></header>
    <table class="rank-roster-table"><thead><tr><th scope="col">FULL NAME</th><th scope="col">BADGE NUMBER</th></tr></thead>
    <tbody>${page.people.length ? page.people.map(person => `<tr data-officer-id="${escapeHtml(person.id)}"><td><span class="officer-name">${escapeHtml(person.name)}</span></td><td>${escapeHtml(person.badge)}</td></tr>`).join('') : '<tr class="rank-empty"><td colspan="2">NO PERSONNEL ASSIGNED</td></tr>'}</tbody></table>
    <footer class="rank-roster-footer"><span>RANK DIRECTORY</span><span>${String(pageIndex + 1).padStart(2, '0')} / ${directoryPageCount}</span></footer>
  </article>`;
};

const updateAdminPanel = () => {
  const existing = $('#rank-admin-panel');
  if (!adminToken) { existing?.remove(); return; }
  const panel = existing || document.createElement('form');
  panel.id = 'rank-admin-panel';
  panel.className = 'rank-admin-panel';
  panel.innerHTML = `<label>PERSONNEL <select name="person">${rankDirectoryData.slice().sort((a,b) => a.name.localeCompare(b.name)).map(person => `<option value="${escapeHtml(person.id)}">${escapeHtml(person.name)} / ${escapeHtml(person.badge)}</option>`).join('')}</select></label><label>RANK <select name="rankId">${directoryRanks.map(rank => `<option value="${escapeHtml(rank)}">${escapeHtml(rank)}</option>`).join('')}</select></label><button type="submit">SAVE RANK</button>`;
  if (!existing) {
    panel.addEventListener('submit', saveRankChange);
    $('.rank-directory-heading').append(panel);
  }
};
const refreshRoster = () => {
  if (!initialized || engine.drag || engine.animating) return;
  engine.count = categoryCount();
  engine.spread = Math.min(engine.spread, engine.count - 1);
  $('#rank-category-list').innerHTML = directoryRanks.map((rank, index) =>
    `<button type="button" aria-label="${escapeHtml(rank)}" data-category-index="${Math.floor(directoryPages.findIndex(page => page.rank === rank) / 2)}">${String(index + 1).padStart(2, '0')} <span>${escapeHtml(rank)}</span></button>`
  ).join('');
  engine.draw(false);
  updateCategory(engine.spread);
  updateAdminPanel();
};
const loadRoster = async () => {
  try {
    const response = await fetch('/api/personnel', {headers:{Accept:'application/json'}});
    if (!response.ok) return;
    const payload = await response.json();
    if (!Array.isArray(payload.people)) return;
    adminEnabled = payload.adminEnabled === true;
    replaceDirectoryPersonnel(payload.people);
    refreshRoster();
  } catch { setRankStatus('Live roster service unavailable; showing the published directory.'); }
};
const openAdministratorAccess = async () => {
  if (!adminEnabled) { setRankStatus('Administrator editing is unavailable until the server ADMIN_TOKEN is configured.'); return; }
  const token = window.prompt('Administrator token');
  if (!token) return;
  try {
    const response = await fetch('/api/personnel/admin-session', {headers:{Authorization:`Bearer ${token}`}});
    if (!response.ok) throw new Error('Administrator authorization required.');
    adminToken = token;
    updateAdminPanel();
    setRankStatus('Administrator editing enabled for this session.');
  } catch (cause) { setRankStatus(cause.message); }
};
const saveRankChange = async event => {
  event.preventDefault();
  const form = event.currentTarget;
  const id = form.elements.person.value, rankId = form.elements.rankId.value;
  const person = rankDirectoryData.find(item => item.id === id);
  if (!person || person.rankId === rankId) { setRankStatus('No rank change to save.'); return; }
  try {
    const response = await fetch('/api/personnel/rank', {method:'PATCH', headers:{'Content-Type':'application/json','Authorization':`Bearer ${adminToken}`}, body:JSON.stringify({id, rankId})});
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'Unable to save rank change.');
    replaceDirectoryPersonnel(payload.people);
    refreshRoster();
    setRankStatus(`${person.name} moved to ${rankId}.`);
  } catch (cause) {
    if (/authorization/i.test(cause.message)) { adminToken = ''; updateAdminPanel(); }
    setRankStatus(cause.message);
  }
};

const updateCategory = index => {
  $('#rank-position').textContent = `${String(index * 2 + 1).padStart(2, '0')} — ${String(index * 2 + 2).padStart(2, '0')} / ${directoryPageCount}`;
  $('#rank-previous').disabled = index === 0;
  $('#rank-next').disabled = index === categoryCount() - 1;
  document.querySelectorAll('.rank-category-list button').forEach((button, buttonIndex) => button.setAttribute('aria-current', directoryPages.slice(index * 2, index * 2 + 2).some(page => page.rank === directoryRanks[buttonIndex]) ? 'page' : 'false'));
};
const setReaderActionsDisabled = disabled => {
  document.querySelectorAll('.rank-controls [data-reader-action]').forEach(button => { button.disabled = disabled; });
};
const setRankStatus = message => { $('#rank-status').textContent = message; };
let navigationTarget = null, navigationFrame = 0, sequenceStep = false;
let lastSpread = null;
const mobileIndex = matchMedia('(max-width: 700px)');
const setIndexExpanded = expanded => {
  const list = $('#rank-category-list');
  list.classList.toggle('rank-index-expanded', expanded);
  list.inert = mobileIndex.matches && !expanded;
  $('#rank-index-toggle').setAttribute('aria-expanded', String(expanded));
};
const stopNavigation = () => {
  cancelAnimationFrame(navigationFrame);
  navigationFrame = 0;
  navigationTarget = null;
  switchingCategory = false;
  setReaderActionsDisabled(false);
};
const advanceNavigation = () => {
  navigationFrame = 0;
  if (directory.hidden || navigationTarget === null) { stopNavigation(); return; }
  if (engine.spread === navigationTarget) { stopNavigation(); updateCategory(engine.spread); return; }
  if (engine.drag || engine.animating || engine.pending) { stopNavigation(); return; }
  sequenceStep = true;
  try { engine.turn(Math.sign(navigationTarget - engine.spread)); }
  catch (cause) { stopNavigation(); setRankStatus('Unable to turn to the selected rank. Please try again.'); console.error(cause); }
  finally { sequenceStep = false; }
};
const showCategory = index => {
  if (!Number.isInteger(index) || index < 0 || index >= categoryCount() || switchingCategory || engine.drag || engine.pending || engine.animating) return false;
  if (mobileIndex.matches && $('#rank-category-list').contains(document.activeElement)) $('#rank-index-toggle').focus({preventScroll:true});
  setIndexExpanded(false);
  if (index === engine.spread) return true;
  navigationTarget = index;
  switchingCategory = true;
  setReaderActionsDisabled(true);
  navigationFrame = requestAnimationFrame(advanceNavigation);
  return true;
};
const reflectCompletedTurn = index => {
  updateCategory(index);
  if (lastSpread !== null && lastSpread !== index && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    rankBook.querySelectorAll('.page-slot').forEach(slot => {
      slot.querySelector('.rank-paper-reflection')?.remove();
      const reflection = document.createElement('span');
      reflection.className = 'rank-paper-reflection';
      reflection.setAttribute('aria-hidden', 'true');
      reflection.addEventListener('animationend', () => reflection.remove(), {once:true});
      slot.append(reflection);
    });
  }
  lastSpread = index;
};
export const closeDirectory = async () => {
  if (directory.hidden || closingDirectory) return;
  stopNavigation();
  engine.cancel(true);
  setIndexExpanded(false);
  closingDirectory = true;
  try {
    directory.inert = true;
    directory.hidden = true;
    if (archiveLeft && archiveRight && directoryLeft && directoryRight) {
      directoryLeft.id = 'rank-left';
      directoryRight.id = 'rank-right';
      archiveLeft.id = 'left';
      archiveRight.id = 'right';
    }
    const main = document.querySelector('main');
    main.classList.remove('directory-open');
    main.classList.add('archive-closed');
    document.dispatchEvent(new Event('archive-overview-start'));
    await resetBookFocus('directory');
  } catch (cause) {
    console.error('Unable to restore the Rank Directory overview', cause);
    setRankStatus('Unable to restore the book overview. Please try again.');
  } finally {
    closingDirectory = false;
    document.dispatchEvent(new Event('archive-overview-ready'));
  }
};

function initialize() {
  directory = $('#rank-directory');
  rankBook = $('#rank-book');
  const rankControls = $('.rank-controls');
  archiveLeft = $('#book .page-slot.left');
  archiveRight = $('#book .page-slot.right');
  directoryLeft = rankBook.querySelector('.page-slot.left');
  directoryRight = rankBook.querySelector('.page-slot.right');
  archiveLeft.id = 'archive-left';
  archiveRight.id = 'archive-right';
  directoryLeft.id = 'left';
  directoryRight.id = 'right';
  directory.hidden = false;
  const indexToggle = document.createElement('button');
  indexToggle.id = 'rank-index-toggle';
  indexToggle.type = 'button';
  indexToggle.textContent = 'RANK INDEX';
  indexToggle.setAttribute('aria-expanded', 'false');
  indexToggle.setAttribute('aria-controls', 'rank-category-list');
  $('#rank-category-list').before(indexToggle);
  indexToggle.addEventListener('click', () => {
    setIndexExpanded(!$('#rank-category-list').classList.contains('rank-index-expanded'));
  });
  mobileIndex.addEventListener('change', () => setIndexExpanded(false));
  setIndexExpanded(false);
  $('#rank-category-list').addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      setIndexExpanded(false);
      indexToggle.focus();
    }
  });
  $('#rank-category-list').innerHTML = directoryRanks.map((rank, index) =>
    `<button type="button" aria-label="${escapeHtml(rank)}" data-category-index="${Math.floor(directoryPages.findIndex(page => page.rank === rank) / 2)}">${String(index + 1).padStart(2, '0')} <span>${escapeHtml(rank)}</span></button>`
  ).join('');
  engine = new FlipEngine(rankBook, {
    spreadCount: categoryCount(),
    initialSpread: 0,
    render: renderCategory,
    blocked: () => directory.hidden || (switchingCategory && !sequenceStep) || !!document.querySelector('dialog[open]'),
    onChange: reflectCompletedTurn,
    onBusyChange: busy => {
      if (busy) rankBook.querySelectorAll('.rank-paper-reflection').forEach(node => node.remove());
      if (!busy && navigationTarget !== null && !navigationFrame) navigationFrame = requestAnimationFrame(advanceNavigation);
      $('#rank-previous').disabled = engine.spread === 0 || engine.animating || switchingCategory;
      $('#rank-next').disabled = engine.spread === categoryCount() - 1 || engine.animating || switchingCategory;
      setReaderActionsDisabled(engine.animating || Boolean(engine.drag) || switchingCategory);
    }
  });
  $('#rank-close').addEventListener('click', closeDirectory);
  const adminAccess = document.createElement('button');
  adminAccess.type = 'button';
  adminAccess.id = 'rank-admin-access';
  adminAccess.className = 'rank-close';
  adminAccess.textContent = 'ADMINISTRATOR';
  adminAccess.addEventListener('click', openAdministratorAccess);
  $('#rank-close').before(adminAccess);
  $('#rank-return-first').addEventListener('click', () => {
    void closeDirectory().then(() => document.dispatchEvent(new Event('archive-select-first')));
  });
  $('#rank-previous').addEventListener('click', () => engine.turn(-1));
  $('#rank-next').addEventListener('click', () => engine.turn(1));
  const readerActions = [
    ['read', 'READ THIS SPREAD'],
    ['zoom', 'ZOOM PAGE'],
    ['download', 'DOWNLOAD PAGE']
  ];
  for (const [action, label] of readerActions) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.readerAction = action;
    button.textContent = label;
    rankControls.append(button);
  }
  $('#rank-category-list').addEventListener('click', event => {
    const button = event.target.closest('[data-category-index]');
    if (button) showCategory(Number(button.dataset.categoryIndex));
  });
  initialized = true;
  void loadRoster();
}

export function openRankDirectory() {
  if (!initialized) initialize();
  else {
    archiveLeft.id = 'archive-left';
    archiveRight.id = 'archive-right';
    directoryLeft.id = 'left';
    directoryRight.id = 'right';
  }
  directory.inert = false;
  directory.hidden = false;
  updateCategory(engine.spread);
  rankBook.focus({preventScroll: true});
}

export function getCurrentSpread() {
  if (!initialized || directory.hidden || switchingCategory || engine.animating || engine.drag) return null;
  const index = engine.spread;
  return {
    pages: [renderCategory(index * 2), renderCategory(index * 2 + 1)],
    title: `RANK DIRECTORY — PAGES ${index * 2 + 1}–${index * 2 + 2}`,
    fileName: `rank-directory-pages-${index * 2 + 1}-${index * 2 + 2}`
  };
}

// Wait for an in-flight drag/turn; always use the existing animated rank navigation.
let searchGeneration = 0, highlightTimer;
export async function revealOfficer(id) {
  const generation = ++searchGeneration;
  const page = directoryPages.findIndex(page => page.people.some(person => person.id === id));
  if (page < 0 || !initialized) return false;
  const target = Math.floor(page / 2);
  const deadline = performance.now() + 15000;
  while (!directory.hidden && generation === searchGeneration && performance.now() < deadline) {
    if (!switchingCategory && !engine.drag && !engine.pending && !engine.animating) {
      if (engine.spread === target) {
        clearTimeout(highlightTimer);
        rankBook.querySelectorAll('.officer-search-highlight').forEach(row => row.classList.remove('officer-search-highlight'));
        const row = rankBook.querySelector(`.page-slot [data-officer-id="${CSS.escape(id)}"]`);
        if (!row) return false;
        row.classList.add('officer-search-highlight');
        row.tabIndex = -1;
        row.focus({preventScroll: true});
        row.scrollIntoView({block:'nearest', inline:'nearest', behavior:'instant'});
        highlightTimer = setTimeout(() => row.classList.remove('officer-search-highlight'), 2000);
        setRankStatus('Located ' + directoryPages[page].people.find(person => person.id === id).name);
        return true;
      }
      showCategory(target);
    }
    await new Promise(resolve => setTimeout(resolve, 40));
  }
  return false;
}

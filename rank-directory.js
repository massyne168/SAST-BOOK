import {FlipEngine} from './flip-engine.js';
import {directoryPages, directoryPageCount, directoryRanks} from './rank-directory-data.js';
import {resetBookFocus} from './book-focus.js';

const $ = selector => document.querySelector(selector);
const categoryCount = Math.ceil(directoryPageCount / 2);
let engine, rankBook, directory, initialized = false, switchingCategory = false;
let closingDirectory = false;
let archiveLeft, archiveRight, directoryLeft, directoryRight;
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const renderCategory = pageIndex => {
  const page = directoryPages[pageIndex];
  if (!page) return '<article class="rank-page" aria-label="End of directory"></article>';
  return `<article class="rank-page rank-personnel-list-page rank-roster-page">
    <header class="rank-list-heading"><span>RANK DIRECTORY</span><h2>${escapeHtml(page.rank)}${page.continued ? ' <small>(CONTINUED)</small>' : ''}</h2></header>
    <table class="rank-roster-table"><thead><tr><th scope="col">OFFICER NAME</th><th scope="col">BADGE NUMBER</th></tr></thead>
    <tbody>${page.people.map(person => `<tr><td><span class="officer-name">${escapeHtml(person.name)}</span></td><td>${escapeHtml(person.badge)}</td></tr>`).join('')}</tbody></table>
    <footer class="rank-roster-footer"><span>RANK DIRECTORY</span><span>${String(pageIndex + 1).padStart(2, '0')} / ${directoryPageCount}</span></footer>
  </article>`;
};

const updateCategory = index => {
  $('#rank-position').textContent = `${String(index * 2 + 1).padStart(2, '0')} — ${String(index * 2 + 2).padStart(2, '0')} / ${directoryPageCount}`;
  $('#rank-previous').disabled = index === 0;
  $('#rank-next').disabled = index === categoryCount - 1;
  document.querySelectorAll('.rank-category-list button').forEach((button, buttonIndex) => button.setAttribute('aria-current', directoryPages.slice(index * 2, index * 2 + 2).some(page => page.rank === directoryRanks[buttonIndex]) ? 'page' : 'false'));
};
const setReaderActionsDisabled = disabled => {
  document.querySelectorAll('.rank-controls [data-reader-action]').forEach(button => { button.disabled = disabled; });
};
const setRankStatus = message => { $('#rank-status').textContent = message; };
let navigationTarget = null, navigationFrame = 0, sequenceStep = false;
let lastSpread = null;
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
  if (!Number.isInteger(index) || index < 0 || index >= categoryCount || switchingCategory || engine.drag || engine.pending || engine.animating) return false;
  $('#rank-category-list').classList.remove('rank-index-expanded');
  $('#rank-index-toggle').setAttribute('aria-expanded', 'false');
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
const closeDirectory = async () => {
  if (directory.hidden || closingDirectory) return;
  stopNavigation();
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
    const expanded = $('#rank-category-list').classList.toggle('rank-index-expanded');
    indexToggle.setAttribute('aria-expanded', String(expanded));
  });
  $('#rank-category-list').addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      $('#rank-category-list').classList.remove('rank-index-expanded');
      indexToggle.setAttribute('aria-expanded', 'false');
      indexToggle.focus();
    }
  });
  $('#rank-category-list').innerHTML = directoryRanks.map((rank, index) =>
    `<button type="button" aria-label="${escapeHtml(rank)}" data-category-index="${Math.floor(directoryPages.findIndex(page => page.rank === rank) / 2)}">${String(index + 1).padStart(2, '0')} <span>${escapeHtml(rank)}</span></button>`
  ).join('');
  engine = new FlipEngine(rankBook, {
    spreadCount: categoryCount,
    initialSpread: 0,
    render: renderCategory,
    blocked: () => directory.hidden || (switchingCategory && !sequenceStep) || !!document.querySelector('dialog[open]'),
    onChange: reflectCompletedTurn,
    onBusyChange: busy => {
      if (busy) rankBook.querySelectorAll('.rank-paper-reflection').forEach(node => node.remove());
      if (!busy && navigationTarget !== null && !navigationFrame) navigationFrame = requestAnimationFrame(advanceNavigation);
      $('#rank-previous').disabled = engine.spread === 0 || engine.animating || switchingCategory;
      $('#rank-next').disabled = engine.spread === categoryCount - 1 || engine.animating || switchingCategory;
      setReaderActionsDisabled(engine.animating || Boolean(engine.drag) || switchingCategory);
    }
  });
  $('#rank-close').addEventListener('click', closeDirectory);
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

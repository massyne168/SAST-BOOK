import {FlipEngine} from './flip-engine.js';
import {rankDirectoryData} from './rank-directory-data.js';
import {resetBookFocus} from './book-focus.js';

const $ = selector => document.querySelector(selector);
const categoryCount = rankDirectoryData.length;
let engine, rankBook, directory, initialized = false, switchingCategory = false;
let closingDirectory = false;
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const renderCategory = pageIndex => {
  const index = Math.floor(pageIndex / 2), category = rankDirectoryData[index];
  // One content page per category. The paired leaf face remains blank.
  if (pageIndex % 2 === 1 || !category) return '<article class="rank-page rank-blank" aria-hidden="true"></article>';
  const people = Array.isArray(category.people) ? category.people : [];
  const title = `${category.rank} / PERSONNEL LIST`;
  const rows = people.length
    ? people.map(person => `<div class="rank-person-row"><span>${escapeHtml(person.name || 'PERSON NAME')}</span><span>${escapeHtml(person.badge || '0000')}</span></div>`).join('')
    : '<div class="rank-list-empty">NO PERSONNEL ASSIGNED</div>';
  return `<article class="rank-page rank-personnel-list-page">
    <header class="rank-list-heading"><span>SAN ANDREAS STATE TROOPERS / OFFICIAL RECORD</span><h2>${escapeHtml(title).toUpperCase()}</h2></header>
    <div class="rank-personnel-table" role="table" aria-label="${escapeHtml(title)}">
      <div class="rank-person-row rank-person-head" role="row"><span role="columnheader">FULL NAME</span><span role="columnheader">BADGE NO.</span></div>
      <div class="rank-person-rows">${rows}</div>
    </div>
  </article>`;
};
const updateCategory = index => {
  $('#rank-position').textContent = `${String(index + 1).padStart(2, '0')} / ${String(categoryCount).padStart(2, '0')}`;
  $('#rank-previous').disabled = index === 0;
  $('#rank-next').disabled = index === categoryCount - 1;
  document.querySelectorAll('.rank-category-list button').forEach((button, buttonIndex) => button.setAttribute('aria-current', buttonIndex === index ? 'page' : 'false'));
};
const showCategory = index => {
  if (switchingCategory || index === engine.spread || engine.drag || engine.animating) return false;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return engine.goTo(index);
  switchingCategory = true;
  rankBook.classList.add('rank-fade-out');
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const moved = engine.goTo(index);
    if (!moved) { rankBook.classList.remove('rank-fade-out'); switchingCategory = false; return; }
    rankBook.classList.remove('rank-fade-out');
    rankBook.classList.add('rank-fade-in');
    requestAnimationFrame(() => { rankBook.classList.remove('rank-fade-in'); switchingCategory = false; });
  }));
  return true;
};
const closeDirectory = async () => {
  if (directory.hidden || closingDirectory) return;
  closingDirectory = true;
  directory.inert = true;
  directory.classList.add('book-directory-closing');
  await resetBookFocus('directory', 360);
  directory.hidden = true;
  directory.classList.remove('book-directory-closing');
  closingDirectory = false;
  $('#open-rank-directory').focus({preventScroll: true});
};

function initialize() {
  directory = $('#rank-directory');
  rankBook = $('#rank-book');
  directory.hidden = false;
  engine = new FlipEngine(rankBook, {
    spreadCount: categoryCount,
    initialSpread: 0,
    render: renderCategory,
    blocked: () => directory.hidden || !!document.querySelector('dialog[open]'),
    onChange: updateCategory,
    onBusyChange: () => {
      $('#rank-previous').disabled = engine.spread === 0 || engine.animating;
      $('#rank-next').disabled = engine.spread === categoryCount - 1 || engine.animating;
    }
  });
  $('#rank-close').addEventListener('click', closeDirectory);
  $('#rank-return-first').addEventListener('click', async () => {
    await closeDirectory();
    const target = document.querySelector('main').classList.contains('archive-closed') ? $('#open-archive') : $('#book');
    target.scrollIntoView({block: 'center', behavior: 'smooth'});
    target.focus({preventScroll: true});
  });
  $('#rank-previous').addEventListener('click', () => engine.turn(-1));
  $('#rank-next').addEventListener('click', () => engine.turn(1));
  document.querySelectorAll('.rank-category-list button').forEach(button => button.addEventListener('click', () => {
    showCategory(Number(button.dataset.categoryIndex));
  }));
  initialized = true;
}

export function openRankDirectory() {
  if (!initialized) initialize();
  directory.inert = false;
  directory.hidden = false;
  updateCategory(engine.spread);
  rankBook.focus({preventScroll: true});
}

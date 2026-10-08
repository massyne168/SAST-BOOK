import {FlipEngine} from './flip-engine.js';
import {rankDirectoryData} from './rank-directory-data.js';

const $ = selector => document.querySelector(selector);
const categoryCount = rankDirectoryData.length;
let engine, rankBook, directory, initialized = false, switchingCategory = false;
let closingDirectory = false;
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const peoplePerPage = 8;
const personnelPages = rankDirectoryData.map(() => 0);
const personRows = (categoryIndex, pageIndex = 0) => {
  const people = Array.isArray(rankDirectoryData[categoryIndex]?.people) ? rankDirectoryData[categoryIndex].people : [];
  if (!people.length) return '<div class="rank-list-empty">NO PERSONNEL ASSIGNED</div>';
  return people.slice(pageIndex * peoplePerPage, (pageIndex + 1) * peoplePerPage)
    .map(person => `<div class="rank-person-row" role="row"><span>${escapeHtml(person.name || 'PERSON NAME')}</span><span>${escapeHtml(person.badge || '0000')}</span></div>`).join('');
};
const pagination = categoryIndex => {
  const count = Array.isArray(rankDirectoryData[categoryIndex]?.people) ? rankDirectoryData[categoryIndex].people.length : 0;
  const pages = Math.ceil(count / peoplePerPage);
  if (pages < 2) return '';
  const page = personnelPages[categoryIndex] || 0;
  return `<nav class="rank-person-pagination" aria-label="Personnel list pages"><button type="button" data-person-page="prev" ${page === 0 ? 'disabled' : ''}>&#8592; PREV</button><span>PAGE ${String(page + 1).padStart(2, '0')} / ${String(pages).padStart(2, '0')}</span><button type="button" data-person-page="next" ${page >= pages - 1 ? 'disabled' : ''}>NEXT &#8594;</button></nav>`;
};
const renderCategory = pageIndex => {
  const index = Math.floor(pageIndex / 2), category = rankDirectoryData[index];
  if (!category) return '<article class="rank-page rank-selection-back"><span>RANK DIRECTORY</span><strong>SELECT A RANK TO VIEW PERSONNEL</strong><i>CONTROLLED RECORDS / SAST</i></article>';
  // The verso remains useful and intentional while the personnel list occupies one page.
  if (pageIndex % 2 === 1) return '<article class="rank-page rank-selection-back"><span>RANK DIRECTORY</span><strong>SELECT A RANK TO VIEW PERSONNEL</strong><i>CONTROLLED RECORDS / SAST</i></article>';
  const people = Array.isArray(category.people) ? category.people : [];
  const title = `${category.rank} / PERSONNEL LIST`;
  const page = personnelPages[index] || 0;
  return `<article class="rank-page rank-personnel-list-page">
    <header class="rank-list-heading"><span>SAN ANDREAS STATE TROOPERS / OFFICIAL RECORD</span><h2>${escapeHtml(title).toUpperCase()}</h2></header>
    <div class="rank-personnel-table" role="table" aria-label="${escapeHtml(title)}">
      <div class="rank-person-row rank-person-head" role="row"><span role="columnheader">FULL NAME</span><span role="columnheader">BADGE NO.</span></div>
      <div class="rank-person-rows">${personRows(index, page)}</div>
    </div>
    ${pagination(index)}
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
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const moved = engine.goTo(index);
    return moved;
  }
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
const closeDirectory = () => {
  if (directory.hidden || closingDirectory) return;
  closingDirectory = true;
  directory.inert = true;
  directory.hidden = true;
  document.querySelector('main').classList.remove('directory-open');
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
  $('#rank-return-first').addEventListener('click', () => {
    closeDirectory();
    const target = document.querySelector('main').classList.contains('archive-closed') ? $('#open-archive') : $('#book');
    target.focus({preventScroll: true});
  });
  $('#rank-previous').addEventListener('click', () => engine.turn(-1));
  $('#rank-next').addEventListener('click', () => engine.turn(1));
  document.querySelectorAll('.rank-category-list button').forEach(button => button.addEventListener('click', () => {
    showCategory(Number(button.dataset.categoryIndex));
  }));
  rankBook.addEventListener('click', event => {
    const button = event.target.closest('[data-person-page]');
    if (!button || button.disabled || switchingCategory || engine.animating || engine.drag) return;
    const index = engine.spread;
    const pages = Math.ceil((rankDirectoryData[index]?.people?.length || 0) / peoplePerPage);
    const next = (personnelPages[index] || 0) + (button.dataset.personPage === 'next' ? 1 : -1);
    if (next < 0 || next >= pages) return;
    personnelPages[index] = next;
  const page = rankBook.querySelector('.page-slot.left .rank-page');
    const rows = page?.querySelector('.rank-person-rows');
    const oldPager = page?.querySelector('.rank-person-pagination');
    if (!rows) return;
    rows.innerHTML = personRows(index, next);
    const newPager = document.createElement('div');
    newPager.innerHTML = pagination(index);
    if (oldPager) oldPager.replaceWith(newPager.firstElementChild);
  });
  initialized = true;
}

export function openRankDirectory() {
  if (!initialized) initialize();
  directory.inert = false;
  directory.hidden = false;
  updateCategory(engine.spread);
  rankBook.focus({preventScroll: true});
}

import {FlipEngine} from './flip-engine.js';
import {rankDirectoryData} from './rank-directory-data.js';

const $ = selector => document.querySelector(selector);
const rankBook = $('#rank-book');
const directory = $('#rank-directory');
const categoryCount = rankDirectoryData.length;
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const recordMarkup = (person, index) => `<article class="rank-record">
  ${person.portrait ? `<img class="rank-portrait" src="${escapeHtml(person.portrait)}" alt="Portrait of ${escapeHtml(person.fullName)}" loading="lazy">` : '<div class="rank-portrait rank-portrait-empty" aria-label="No portrait supplied">ID<br>PHOTO</div>'}
  <div class="rank-record-main"><div class="rank-record-name"><span>PERSONNEL RECORD ${String(index + 1).padStart(2, '0')}</span><strong>${escapeHtml(person.fullName || 'UNASSIGNED')}</strong></div>
   <div class="rank-fields">
    <div><small>RANK</small><strong>${escapeHtml(person.rank || '')}</strong></div><div><small>BADGE NUMBER</small><strong>${escapeHtml(person.badgeNumber || '')}</strong></div>
    <div><small>DEPARTMENT / UNIT</small><strong>${escapeHtml(person.departmentUnit || '')}</strong></div><div><small>CALL SIGN</small><strong>${escapeHtml(person.callSign || '')}</strong></div>
    <div><small>STATUS</small><strong>${escapeHtml(person.status || '')}</strong></div><div><small>JOIN DATE</small><strong>${escapeHtml(person.joinDate || '')}</strong></div>
   </div><p class="rank-profile"><small>PROFILE / NOTES</small>${escapeHtml(person.profile || 'No profile notes recorded.')}</p>
   <div class="rank-signature"><small>SIGNATURE / AUTHORIZATION</small><strong>${escapeHtml(person.signature || 'Pending authorization')}</strong></div>
  </div></article>`;
const renderCategory = pageIndex => {
  const index = Math.floor(pageIndex / 2);
  const category = rankDirectoryData[index];
  const personnel = Array.isArray(category.personnel) ? category.personnel : [];
  const number = String(category.categoryNumber ?? index + 1).padStart(2, '0');
  const body = personnel.length ? `<div class="rank-record-grid">${personnel.map(recordMarkup).join('')}</div>` : '<div class="rank-empty"><span>NO PERSONNEL ASSIGNED</span><p>This category is awaiting an official personnel record.</p></div>';
  return `<article class="rank-page"><header class="rank-page-head"><div><span>DEPARTMENT OF PUBLIC SAFETY / SAST</span><strong>OFFICIAL PERSONNEL DIRECTORY</strong></div><span class="rank-document">RD-${number} / 26</span></header>
    <div class="rank-category-title"><div><span>CATEGORY ${number} / ${String(categoryCount).padStart(2, '0')}</span><h2>${escapeHtml(category.title)}</h2></div><span class="rank-count">${personnel.length} ${personnel.length === 1 ? 'RECORD' : 'RECORDS'}</span></div>
    <div class="rank-tactical-rule"><i></i><span>CONTROLLED PERSONNEL RECORD</span><i></i></div>${body}
    <div class="rank-page-foot"><span>SAN ANDREAS STATE TROOPERS</span><span>DOCUMENT REF. RD-${number}-SAST</span><span>PAGE ${String(index + 1).padStart(2, '0')}</span></div></article>`;
};
const updateCategory = index => {
  $('#rank-position').textContent = `${String(index + 1).padStart(2, '0')} / ${String(categoryCount).padStart(2, '0')}`;
  $('#rank-previous').disabled = index === 0;
  $('#rank-next').disabled = index === categoryCount - 1;
  document.querySelectorAll('.rank-category-list button').forEach((button, buttonIndex) => button.setAttribute('aria-current', buttonIndex === index ? 'page' : 'false'));
};
const engine = new FlipEngine(rankBook, {
  spreadCount: categoryCount,
  initialSpread: 0,
  render: renderCategory,
  blocked: () => directory.hidden || !!document.querySelector('dialog[open]'),
  onChange: updateCategory,
  onBusyChange: () => { $('#rank-previous').disabled = engine.spread === 0 || engine.animating; $('#rank-next').disabled = engine.spread === categoryCount - 1 || engine.animating; }
});
let switchingCategory = false;
const showCategory = index => {
  if (switchingCategory || index === engine.spread || engine.drag || engine.animating) return false;
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
  directory.hidden = true;
  $('#open-rank-directory').focus({preventScroll: true});
};
$('#open-rank-directory').addEventListener('click', () => { directory.hidden = false; updateCategory(engine.spread); rankBook.focus({preventScroll: true}); });
$('#rank-close').addEventListener('click', closeDirectory);
$('#rank-return-first').addEventListener('click', () => {
  closeDirectory();
  const target = document.querySelector('main').classList.contains('archive-closed') ? $('#open-archive') : $('#book');
  target.scrollIntoView({block: 'center', behavior: 'smooth'});
  target.focus({preventScroll: true});
});
$('#rank-previous').addEventListener('click', () => engine.turn(-1));
$('#rank-next').addEventListener('click', () => engine.turn(1));
document.querySelectorAll('.rank-category-list button').forEach(button => button.addEventListener('click', () => {
  showCategory(Number(button.dataset.categoryIndex));
}));

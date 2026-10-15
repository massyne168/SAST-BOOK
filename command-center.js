import {rankDirectoryData, directoryRanks} from './rank-directory-data.js';
import {navigateBook} from './app.js';

const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const entry = document.createElement('button');
entry.type = 'button'; entry.className = 'command-center-entry'; entry.textContent = 'COMMAND CENTER';
entry.setAttribute('aria-label', 'Open Command Center');
entry.title = 'Open Command Center';
document.querySelector('.masthead .header-utilities').prepend(entry);
const dialog = document.createElement('dialog');
dialog.className = 'command-center'; dialog.setAttribute('aria-labelledby','command-center-title');
dialog.innerHTML = `<header><div><span>SAST / HIGH COMMAND VIEW</span><h2 id="command-center-title">COMMAND CENTER</h2></div><button type="button" data-close> CLOSE × </button></header><div class="command-summary" id="command-summary"></div><div class="command-shortcuts"><button type="button" data-open-directory>RANK DIRECTORY</button><button type="button" data-open-resignation>TROOPER RESIGNATION NOTICE</button></div><label class="command-search-label">PERSONNEL SEARCH<input id="command-personnel-query" type="search" autocomplete="off" placeholder="Name or badge number"></label><p id="command-search-status" role="status">Enter a name or badge number to search personnel.</p><ul id="command-personnel-results"></ul>`;
document.body.append(dialog);
const input = dialog.querySelector('#command-personnel-query');
const list = dialog.querySelector('#command-personnel-results');
const status = dialog.querySelector('#command-search-status');
function renderDashboard() {
  const counts = directoryRanks.map(rank => [rank, rankDirectoryData.filter(person => person.rankId === rank).length]).filter(([,count]) => count);
  dialog.querySelector('#command-summary').innerHTML = `<section><span>TOTAL PERSONNEL</span><strong>${rankDirectoryData.length}</strong></section><section class="command-ranks"><span>PERSONNEL BY RANK</span>${counts.map(([rank,count]) => `<div><b>${escape(rank)}</b><strong>${count}</strong></div>`).join('')}</section>`;
}
function search() {
  const query = input.value.trim().toLowerCase();
  if (!query) { list.innerHTML = ''; status.textContent = 'Enter a name or badge number to search personnel.'; return; }
  const matches = rankDirectoryData.filter(person => person.name.toLowerCase().includes(query) || String(person.badge).toLowerCase().includes(query));
  status.textContent = matches.length ? `${matches.length} personnel record${matches.length === 1 ? '' : 's'} found.` : 'No personnel records match that search.';
  list.innerHTML = matches.map(person => `<li><button type="button" data-officer="${escape(person.id)}"><strong>${escape(person.name)}</strong><span>BADGE ${escape(person.badge)} · ${escape(person.rankId)}</span></button></li>`).join('');
}
entry.addEventListener('click', () => { renderDashboard(); input.value = ''; search(); dialog.showModal(); input.focus(); });
dialog.addEventListener('click', event => {
  if (event.target === dialog || event.target.closest('[data-close]')) dialog.close();
  const officer = event.target.closest('[data-officer]');
  if (officer) { dialog.close(); void navigateBook('directory', officer.dataset.officer); }
  if (event.target.closest('[data-open-directory]')) { dialog.close(); void navigateBook('directory'); }
  if (event.target.closest('[data-open-resignation]')) { dialog.close(); void navigateBook('resignation'); }
});
input.addEventListener('input', search);

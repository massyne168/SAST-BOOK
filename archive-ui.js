import {officers, weapons, activities, statuses, searchOfficers, filterWeapons, calculateStatistics, filterActivities} from './archive-data.js';
import {navigateBook} from './app.js';
const escape = value => String(value ?? 'Not recorded').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const titles = {search:'Trooper search', inventory:'Armory inventory', statistics:'Department statistics', activity:'Archive activity log'};
const homepageHeadings = {directory:'Official Trooper Rank Records', inventory:'Official Armory Records', armory:'Official Armory Records', search:'Trooper Records Database', statistics:'Department Overview', activity:'Official Archive Activity'};
const nav = document.createElement('nav');
nav.className = 'archive-navigation'; nav.setAttribute('aria-label','Central archive navigation');
nav.innerHTML = '<a href="#directory" style="--nav-delay:0ms"><span class="archive-nav-float"><span class="archive-nav-number">01</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h9l3 3v15H6z"/><path d="M9 10h6M9 14h6M9 18h4"/></svg><span>RANK DIRECTORY</span></span></a><a href="#inventory" style="--nav-delay:150ms"><span class="archive-nav-float"><span class="archive-nav-number">02</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14v13H5zM8 7V4h8v3"/><path d="M9 12h6M9 16h6"/></svg><span>ARMORY ARCHIVE</span></span></a><a href="#search" style="--nav-delay:300ms"><span class="archive-nav-float"><span class="archive-nav-number">03</span><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/></svg><span>TROOPER SEARCH</span></span></a><a href="#statistics" style="--nav-delay:450ms"><span class="archive-nav-float"><span class="archive-nav-number">04</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19V10M12 19V5M19 19v-7"/><path d="M3 20h18"/></svg><span>DEPARTMENT STATISTICS</span></span></a><a href="#activity" style="--nav-delay:600ms"><span class="archive-nav-float"><span class="archive-nav-number">05</span><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/></svg><span>ACTIVITY LOG</span></span></a>';
document.querySelector('.record-heading').after(nav);
const navToggle = document.createElement('button');
navToggle.className = 'archive-navigation-toggle';
navToggle.type = 'button';
navToggle.setAttribute('aria-expanded', 'false');
navToggle.setAttribute('aria-controls', 'archive-navigation-list');
navToggle.innerHTML = '<span>ARCHIVE NAVIGATION</span><span aria-hidden="true">+</span>';
nav.id = 'archive-navigation-list';
nav.before(navToggle);
navToggle.addEventListener('click', () => {
  const expanded = navToggle.getAttribute('aria-expanded') === 'true';
  navToggle.setAttribute('aria-expanded', String(!expanded));
  nav.classList.toggle('archive-navigation-expanded', !expanded);
});
const dialog = document.createElement('dialog');
dialog.id = 'archive-panel'; dialog.className = 'archive-panel'; dialog.setAttribute('aria-labelledby','archive-panel-title');
dialog.innerHTML = '<div class="archive-panel-head"><div><span class="archive-kicker">ELYSIUM / DEPARTMENT RECORDS</span><h2 id="archive-panel-title"></h2></div><button type="button" id="archive-panel-close" aria-label="Close archive panel">CLOSE ×</button></div><div id="archive-panel-content"></div>';
document.body.append(dialog);
const content = dialog.querySelector('#archive-panel-content');
const status = document.createElement('p'); status.className = 'archive-navigation-status'; status.setAttribute('role','status'); nav.after(status);
let panel = '', returnFocus;
const stats = calculateStatistics(); // Immutable source snapshot; derive once, not on every keypress.
const homepageHeading = document.querySelector('.record-heading h1');
function setHomepageHeading(key = 'inventory') {
  if (!homepageHeading) return;
  if (homepageHeading.dataset.collectionTitle === 'true') return;
  const next = homepageHeadings[key] || homepageHeadings.inventory;
  if (homepageHeading.textContent === next) return;
  homepageHeading.textContent = next;
  homepageHeading.classList.remove('heading-enter');
  void homepageHeading.offsetWidth;
  homepageHeading.classList.add('heading-enter');
}
function setActiveNavigation(key) {
  nav.querySelectorAll('a').forEach(link => link.toggleAttribute('aria-current', link.hash.slice(1) === key));
  setHomepageHeading(key);
}
const field = (label, input) => `<label>${label}${input}</label>`;
const options = values => values.map(value => `<option value="${escape(value)}">${escape(value)}</option>`).join('');
const searchInput = (id, placeholder) => `<input id="${id}" type="search" autocomplete="off" placeholder="${placeholder}">`;
const select = (id, label, values) => `<select id="${id}"><option value="">${label}</option>${options(values)}</select>`;
const value = id => content.querySelector('#' + id)?.value ?? '';
function dismiss() {
  if (dialog.open) {
    dialog.close();
    document.dispatchEvent(new Event('archive-panel-closed'));
  }
  panel = '';
  setActiveNavigation('inventory');
}
function closePanel() {
  if (history.state?.archivePanel) history.back();
  else { history.replaceState(null,'',location.pathname + location.search); dismiss(); }
  returnFocus?.focus({preventScroll:true});
}
dialog.querySelector('#archive-panel-close').onclick = closePanel;
dialog.addEventListener('cancel', event => { event.preventDefault(); closePanel(); });
async function openBook(kind, id) {
  dismiss();
  status.textContent = 'Opening ' + (kind === 'directory' ? 'Rank Directory…' : 'Armory Archive…');
  try { await navigateBook(kind, id); status.textContent = ''; }
  catch (error) { status.textContent = error.message; }
}
function searchResults() {
  const results = searchOfficers(value('trooper-query'));
  content.querySelector('#trooper-count').textContent = `${results.length} troopers found`;
  content.querySelector('#trooper-results').innerHTML = results.length ? results.map(person => `<li><button type="button" data-officer="${escape(person.id)}"><strong>${escape(person.name)}</strong><span>${escape(person.rank)}</span><small>Badge: ${escape(person.badge)}</small><span class="result-arrow" aria-hidden="true">↗</span></button></li>`).join('') : '<li class="archive-empty">No troopers match your search.</li>';
}
const summary = items => `<div class="archive-stat-grid">${items.map(([label,count]) => `<div class="archive-stat"><span>${escape(label)}</span><strong>${count}</strong></div>`).join('')}</div>`;
function inventoryResults() {
  const records = filterWeapons(weapons,{query:value('weapon-query'),status:value('weapon-status'),assignedName:value('weapon-trooper'),category:value('weapon-category')});
  content.querySelector('#inventory-count').textContent = `${records.length} of ${weapons.length} records`;
  content.querySelector('#weapon-rows').innerHTML = records.map(record => `<tr><td><button class="weapon-detail-link" data-weapon="${record.id}">${escape(record.name)}<small>${record.id}</small></button></td><td>${escape(record.serialNumber)}</td><td>${escape(record.assignedName)}<small>Badge: ${escape(record.assignedBadgeNumber)}</small></td><td><span class="equipment-status status-${record.status.toLowerCase()}">${record.status}</span></td></tr>`).join('');
  content.querySelector('#inventory-empty').hidden = !!records.length;
}
function details(id) {
  const record = weapons.find(record => record.id === id);
  if (!record) return;
  const target = content.querySelector('#weapon-details');
  const fields = [['Weapon',record.name],['Category',record.category],['Serial number',record.serialNumber],['Assigned trooper (as recorded)',record.assignedName],['Assigned badge (as recorded)',record.assignedBadgeNumber],['Issue date',record.issuedAt],['Return date',record.returnedAt],['Equipment status',record.status],['Original record status',record.sourceStatus],['Administrative notes',record.notes],['Record identifier',record.id]];
  target.hidden = false;
  target.innerHTML = `<div class="archive-detail-head"><h3>Weapon record</h3><button id="close-weapon-details">CLOSE DETAILS</button></div><dl>${fields.map(([label,data]) => `<div><dt>${label}</dt><dd>${escape(data)}</dd></div>`).join('')}</dl><a href="${record.sourceUrl}" target="_blank" rel="noopener">View original issue form · file page ${record.sourcePage} ↗</a>`;
  target.focus(); target.scrollIntoView({block:'nearest'});
  target.querySelector('button').onclick = () => { target.hidden = true; content.querySelector(`[data-weapon="${id}"]`)?.focus(); };
}
function bars(records) {
  const max = Math.max(1,...records.map(record => record.count));
  return `<ul class="archive-bars">${records.map(record => `<li><span>${escape(record.label)}</span><span class="archive-bar-track" aria-hidden="true"><i style="width:${record.count / max * 100}%"></i></span><b>${record.count}</b></li>`).join('')}</ul>`;
}
function activityResults() {
  const records = filterActivities(activities,{query:value('activity-query'),group:value('activity-group'),from:value('activity-from'),to:value('activity-to'),order:value('activity-order')});
  content.querySelector('#activity-results').innerHTML = records.length ? `<ol class="archive-timeline">${records.map(record => `<li><strong>${escape(record.eventType)}</strong><h3>${escape(record.relatedLabel ?? record.entityId)}</h3><time datetime="${escape(record.timestamp)}">${escape(record.timestamp)}</time><p>Previous: ${escape(JSON.stringify(record.oldValue))}<br>New: ${escape(JSON.stringify(record.newValue))}</p><small>Record: ${escape(record.entityId)}${record.actorId ? ' · Administrator: ' + escape(record.actorId) : ''}</small></li>`).join('')}</ol>` : `<p class="archive-empty">${activities.length ? 'No activity matches your filters.' : 'No archive activity recorded yet.'}</p>`;
}
function render(kind) {
  panel = kind;
  dialog.querySelector('h2').textContent = titles[kind];
  if (kind === 'search') {
    content.innerHTML = `<p class="archive-subtitle">Find a trooper and turn directly to their place in the directory.</p>${field('Name, badge number or rank', searchInput('trooper-query','Search the Rank Directory'))}<p id="trooper-count" role="status"></p><ul id="trooper-results" class="trooper-results"></ul>`;
    searchResults();
  } else if (kind === 'inventory') {
    content.innerHTML = `<p class="archive-subtitle">Equipment as recorded in the original issue forms. Historical names and badges are preserved.</p><button type="button" data-open-armory>OPEN ARCHIVE BOOK ↗</button>${summary([['Registered weapons',stats.totalWeapons],['Currently issued',stats.byStatus.find(s => s.label === 'ISSUED').count],['Available',stats.byStatus.find(s => s.label === 'AVAILABLE').count]])}<div class="archive-filters">${field('Weapon or serial',searchInput('weapon-query','Search weapons, serials or records'))}${field('Equipment status',select('weapon-status','All statuses',statuses))}${field('Assigned trooper',select('weapon-trooper','All troopers',[...new Set(weapons.map(w => w.assignedName))].sort()))}${field('Weapon category',select('weapon-category','All categories',[...new Set(weapons.map(w => w.category ?? 'Not recorded'))]))}</div><p id="inventory-count" role="status"></p><div class="archive-table-wrap"><table class="archive-inventory"><caption class="visually-hidden">Registered equipment</caption><thead><tr><th scope="col">Weapon name</th><th scope="col">Serial</th><th scope="col">Assigned to</th><th scope="col">Status</th></tr></thead><tbody id="weapon-rows"></tbody></table></div><p class="archive-empty" id="inventory-empty" hidden>No weapons match your filters.</p><section id="weapon-details" class="weapon-details" tabindex="-1" aria-label="Weapon details" hidden></section>`;
    inventoryResults();
  } else if (kind === 'statistics') {
    content.innerHTML = `<p class="archive-subtitle">Calculated from the current directory and registered issue forms.</p>${summary([['Total troopers',stats.totalTroopers],['Department ranks',stats.totalRanks],['Senior leadership',stats.leadership]])}<p class="archive-note">Leadership includes Commissioner, Chief, Assistant Chief, Captain and Lieutenant.</p><div class="archive-chart-grid"><section><h3>Troopers per rank</h3>${bars(stats.byRank)}</section><section><h3>Weapon status distribution</h3>${weapons.length ? bars(stats.byStatus) : '<p>No registered weapons available.</p>'}<p class="archive-note">Status reflects the archived forms; no live equipment updates are connected.</p></section></div>${summary([['Registered weapons',stats.totalWeapons],...stats.byStatus.map(s => [s.label,s.count])])}`;
  } else {
    content.innerHTML = `<p class="archive-subtitle">Confirmed changes to department records.</p><div class="archive-filters">${field('Search records',searchInput('activity-query','Record name or identifier'))}${field('Activity type','<select id="activity-group"><option value="">All activity</option><option value="trooper">Rank Directory</option><option value="weapon">Armory</option><option value="assignments">Equipment assignments</option></select>')}${field('From date (record timestamp)', '<input type="date" id="activity-from">')}${field('To date (record timestamp)', '<input type="date" id="activity-to">')}${field('Order','<select id="activity-order"><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select>')}</div><div id="activity-results" role="status"></div>`;
    activityResults();
  }
  content.insertAdjacentHTML('beforeend','<p class="archive-note archive-public-note">PUBLIC ARCHIVE · READ-ONLY</p>');
}
content.addEventListener('input',() => { if(panel === 'search') searchResults(); else if(panel === 'inventory') inventoryResults(); else if(panel === 'activity') activityResults(); });
content.addEventListener('click', event => {
  const officer = event.target.closest('[data-officer]');
  if (officer) { history.pushState(null,'','#directory'); void openBook('directory',officer.dataset.officer); }
  const weapon = event.target.closest('[data-weapon]'); if(weapon) details(weapon.dataset.weapon);
  if(event.target.closest('[data-open-armory]')) { history.pushState(null,'','#armory'); void openBook('archive'); }
});
function route() {
  const key = location.hash.slice(1);
  if (titles[key]) {
    if (!dialog.open) returnFocus = document.activeElement;
    render(key);
    if (!dialog.open) dialog.showModal();
    (content.querySelector('input') ?? dialog.querySelector('button')).focus();
    setActiveNavigation(key);
  } else {
    dismiss();
    if(key === 'directory' || key === 'armory') {
      void openBook(key === 'directory' ? 'directory' : 'archive');
      setActiveNavigation(key);
    }
  }
}
nav.addEventListener('click', event => {
  const link = event.target.closest('a');
  if(!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  event.preventDefault(); history.pushState({archivePanel:!!titles[link.hash.slice(1)]},'',link.hash); route();
  navToggle.setAttribute('aria-expanded', 'false');
  nav.classList.remove('archive-navigation-expanded');
});
window.addEventListener('popstate',route);
window.addEventListener('hashchange',() => { if (location.hash.slice(1) !== panel && titles[location.hash.slice(1)]) route(); });
document.addEventListener('archive-section-selected', event => setActiveNavigation(event.detail?.section));
if (document.body.classList.contains('site-ready')) route(); else document.addEventListener('site-ready',route,{once:true});
setHomepageHeading(location.hash.slice(1) || 'inventory');

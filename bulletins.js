import {fetchBulletins,currentBulletins} from './bulletin-store.js';
const archive = document.querySelector('#bulletins-archive');
const query = document.querySelector('#bulletin-query');
const type = document.querySelector('#bulletin-type');
const list = document.querySelector('#bulletin-results');
const empty = document.querySelector('#bulletin-empty');
const detail = document.querySelector('#bulletin-detail');
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
function render() {
  const text = query.value.trim().toLowerCase();
  const matches = currentBulletins().filter(item => (!type.value || item.type === type.value) && (!text || `${item.title} ${item.reference}`.toLowerCase().includes(text))).slice().sort((a,b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) || String(b.publishedDate).localeCompare(String(a.publishedDate)));
  list.innerHTML = matches.map(item => `<button type="button" data-bulletin="${escape(item.reference)}"><strong>${item.pinned ? 'PINNED · ' : ''}${escape(item.title)}</strong><span>${escape(item.type)} · ${escape(item.reference)} · ${escape(item.publishedDate)} · ${escape(item.priority)}</span></button>`).join('');
  empty.hidden = matches.length > 0;
  detail.hidden = true;
}
export function openBulletins() {
  archive.hidden = false; archive.inert = false; render();
  fetchBulletins().then(render).catch(()=>{empty.textContent='Unable to load the current bulletin register.';});
  query.focus({preventScroll:true});
}
export function closeBulletins() { archive.hidden = true; archive.inert = true; }
query.addEventListener('input', render); type.addEventListener('change', render);
list.addEventListener('click', event => { const button = event.target.closest('[data-bulletin]'); const item = currentBulletins().find(record => record.reference === button?.dataset.bulletin); if (!item) return; detail.hidden = false; detail.innerHTML = `<button type="button" data-close-bulletin>CLOSE DOCUMENT</button><dl>${[['TITLE',item.title],['TYPE',item.type],['REFERENCE NUMBER',item.reference],['PUBLISHED DATE',item.publishedDate],['ISSUED BY',item.issuedBy],['PRIORITY',item.priority],['EXPIRY DATE',item.expiryDate || 'Not set']].map(([label,value]) => `<div><dt>${label}</dt><dd>${escape(value)}</dd></div>`).join('')}</dl><article>${escape(item.message)}</article>`; detail.focus({preventScroll:true}); });
detail.addEventListener('click', event => { if (event.target.closest('[data-close-bulletin]')) detail.hidden = true; });

document.addEventListener('bulletins-updated',()=>{if(!archive.hidden)render();});

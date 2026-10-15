import {classifiedDecisions} from './classified-decisions.js';

const archive = document.querySelector('#classified-archive');
const search = document.querySelector('#decision-query');
const results = document.querySelector('#decision-results');
const empty = document.querySelector('#decision-empty');
const detail = document.querySelector('#decision-detail');
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

function render() {
  const query = search.value.trim().toLowerCase();
  const matches = classifiedDecisions.filter(item => !query || [item.title,item.reference,item.status].some(value => String(value).toLowerCase().includes(query)));
  results.innerHTML = matches.map(item => `<button type="button" data-decision="${escape(item.reference)}"><strong>${escape(item.title)}</strong><span>${escape(item.reference)} · ${escape(item.issueDate)} · ${escape(item.status)}</span></button>`).join('');
  empty.hidden = matches.length > 0;
  detail.hidden = true;
}
function showDecision(reference) {
  const item = classifiedDecisions.find(decision => decision.reference === reference);
  if (!item) return;
  detail.hidden = false;
  detail.innerHTML = `<button type="button" data-close-decision>CLOSE DOCUMENT</button><dl><div><dt>REFERENCE NUMBER</dt><dd>${escape(item.reference)}</dd></div><div><dt>TITLE</dt><dd>${escape(item.title)}</dd></div><div><dt>ISSUED BY</dt><dd>${escape(item.issuedBy)}</dd></div><div><dt>ISSUE DATE</dt><dd>${escape(item.issueDate)}</dd></div><div><dt>EFFECTIVE DATE</dt><dd>${escape(item.effectiveDate)}</dd></div><div><dt>STATUS</dt><dd>${escape(item.status)}</dd></div></dl><article>${escape(item.text)}</article>`;
  detail.focus({preventScroll:true});
}
export function openClassifiedArchive() { archive.hidden = false; archive.inert = false; render(); search.focus({preventScroll:true}); }
export function closeClassifiedArchive() { archive.hidden = true; archive.inert = true; }
search.addEventListener('input', render);
results.addEventListener('click', event => { const button = event.target.closest('[data-decision]'); if (button) showDecision(button.dataset.decision); });
detail.addEventListener('click', event => { if (event.target.closest('[data-close-decision]')) detail.hidden = true; });

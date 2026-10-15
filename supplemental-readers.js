const escape = value => String(value).replace(/[&<>'"]/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[character]));

const drafts = {
  classified: [
    ['CONTROLLED DOSSIER', 'CLASSIFIED ARCHIVE', 'HIGH COMMAND DECISIONS', 'This volume is a controlled working archive. No command decisions have been published in the connected data file.'],
    ['01 / INTAKE', 'DECISION REGISTER', 'EDITABLE DRAFT GUIDANCE', 'Record only verified decisions in classified-decisions.js. Each entry requires a reference number, issuing authority, issue date, effective date, status, and full text.'],
    ['02 / AUTHORITY', 'ISSUANCE CHECKLIST', 'DOCUMENT TEMPLATE', 'Confirm the issuing authority and approval chain before publication. Drafts must not be represented as active decisions.'],
    ['03 / REFERENCE', 'NUMBERING PROTOCOL', 'DOCUMENT TEMPLATE', 'Reference format: HC-YYYY-###. Reserve a number only after an authorized decision exists.'],
    ['04 / EFFECTIVE DATE', 'IMPLEMENTATION RECORD', 'DOCUMENT TEMPLATE', 'State the effective date, affected units, required actions, and review date. Leave blank when not supplied by High Command.'],
    ['05 / STATUS', 'STATUS CONTROL', 'DOCUMENT TEMPLATE', 'Use Active, Superseded, or Revoked. Link any replacement or revocation reference when it is officially issued.'],
    ['06 / DISTRIBUTION', 'ACCESS NOTES', 'EDITABLE DRAFT GUIDANCE', 'Record authorised distribution channels only. This static project has no server-side High Command editor.'],
    ['07 / SEARCH', 'PUBLISHED DECISIONS', 'NO COMMAND DECISIONS PUBLISHED', 'No official decision records are present. Add verified records to the documented data file; do not use this page to create unverified decisions.'],
    ['08 / REVIEW', 'PERIODIC REVIEW', 'DOCUMENT TEMPLATE', 'Review active entries for supersession, expiry, or revocation. Preserve the historical status rather than deleting a record.'],
    ['09 / CLOSING', 'ARCHIVE CUSTODY', 'CONTROLLED COPY', 'This is an editable archive template, not an official decision. Return to the overview to leave the controlled volume.']
  ],
  resignation: [
    ['PERSONNEL CORRESPONDENCE', 'RESIGNATION NOTICES', 'TROOPER RESIGNATION NOTICE', 'This volume provides the official notice workflow. It does not alter a personnel record or rank status.'],
    ['01 / ELIGIBILITY', 'NOTICE REQUIREMENTS', 'GUIDANCE', 'Use the form only for a voluntary separation notice. Provide accurate identifying details and an effective date.'],
    ['02 / IDENTITY', 'PERSONNEL DETAILS', 'FORM PREPARATION', 'Prepare full name, badge number, and current rank from the existing Rank Directory. No personnel data is copied into this volume.'],
    ['03 / TIMING', 'EFFECTIVE DATE', 'FORM PREPARATION', 'Select the intended effective resignation date. The form validates the supplied date before review.'],
    ['04 / REASON', 'STATEMENT GUIDANCE', 'FORM PREPARATION', 'Provide a concise voluntary reason. Do not include credentials, webhook details, or other sensitive material.'],
    ['05 / REVIEW', 'CONFIRMATION STEP', 'WORKFLOW', 'Review validates the notice and presents a summary before submission. Correct errors before submitting.'],
    ['06 / DELIVERY', 'SERVER-SIDE DELIVERY', 'INTEGRATION NOTE', 'Delivery uses the existing server endpoint. The Discord webhook remains server-side and is never exposed to the browser.'],
    ['07 / RECORDS', 'NOTICE HISTORY', 'NOT AVAILABLE', 'No persistent history is shown because this project has no authorised storage and review permission model for submitted notices.'],
    ['08 / PRIVACY', 'PERSONNEL PRIVACY', 'GUIDANCE', 'Do not share another person’s notice. A submitted notice is handled by the configured server-side delivery flow.'],
    ['09 / NOTICE FORM', 'SUBMIT A NOTICE', 'INTERACTIVE FORM', 'Complete the existing validated form below. Its review, confirmation, error, and success handling are preserved.']
  ],
  bulletins: [
    ['OFFICIAL COMMAND BULLETIN', 'ANNOUNCEMENTS & ORDERS', 'COMMAND COMMUNICATIONS', 'This volume separates operational bulletins from formal High Command decisions, which remain in Classified Archive.'],
    ['01 / PUBLICATION', 'BULLETIN REGISTER', 'EDITABLE DRAFT GUIDANCE', 'Store verified announcements and orders in bulletins-data.js. Each entry needs a title, type, reference, dates, issuer, message, priority, and optional expiry.'],
    ['02 / TYPE', 'ANNOUNCEMENT OR ORDER', 'DOCUMENT TEMPLATE', 'Announcements inform; orders direct action. Select one type and avoid restating a formal High Command decision.'],
    ['03 / PRIORITY', 'PRIORITY CONTROL', 'DOCUMENT TEMPLATE', 'Use Normal, Important, or Urgent. Set priority from the authorised source, not from inference.'],
    ['04 / REFERENCES', 'REFERENCE CONTROL', 'DOCUMENT TEMPLATE', 'Use a stable reference number and retain it if a bulletin is amended or expires.'],
    ['05 / EXPIRY', 'EXPIRY REVIEW', 'DOCUMENT TEMPLATE', 'Add an expiry date only when supplied. Expiry does not erase the record; it changes its operational relevance.'],
    ['06 / PINNING', 'PINNED ITEMS', 'DISPLAY RULE', 'Pinned entries are displayed first. Pinning is a data property, not a substitute for priority.'],
    ['07 / SEARCH', 'PUBLISHED BULLETINS', 'NO BULLETINS PUBLISHED', 'No official bulletin records are present. Add verified entries to the documented data file instead of inventing operational instructions.'],
    ['08 / DISTRIBUTION', 'COMMUNICATION NOTE', 'GUIDANCE', 'This static archive does not automatically post to Discord or any external channel.'],
    ['09 / CLOSING', 'BULLETIN CUSTODY', 'CONTROLLED COPY', 'Return to the overview to leave the command bulletin volume.']
  ]
};

const roots = new Map();
function buildPage([eyebrow, title, label, body], index, kind) {
  const formSlot = kind === 'resignation' && index === 9 ? '<div class="supplemental-form-slot" data-form-slot></div>' : '';
  return `<article class="supplemental-page"><header><span>${escape(eyebrow)}</span><b>${String(index + 1).padStart(2,'0')} / 10</b></header><div class="supplemental-page-body"><p class="supplemental-label">${escape(label)}</p><h2>${escape(title)}</h2><div class="supplemental-rule"></div><p>${escape(body)}</p>${formSlot}</div><footer>SAST CLASSIFIED RECORDS <span>${escape(kind.toUpperCase())}</span></footer></article>`;
}
function create(kind) {
  const pages = drafts[kind];
  const root = document.createElement('section');
  root.className = `supplemental-reader supplemental-reader--${kind}`;
  root.hidden = true; root.inert = true;
  root.innerHTML = `<header class="supplemental-reader-head"><div><span>${escape(kind.toUpperCase())} / INTERNAL PAGES</span><h2>${escape(pages[0][1])}</h2></div><button type="button" data-supplemental-close>RETURN TO OVERVIEW</button></header><div class="supplemental-book-frame"><div class="supplemental-page-stack">${pages.map((page,index) => buildPage(page,index,kind)).join('')}</div></div><nav class="supplemental-reader-controls" aria-label="${escape(pages[0][1])} page navigation"><button type="button" data-page-prev>PREVIOUS</button><output aria-live="polite">01 / 10</output><button type="button" data-page-next>NEXT</button></nav>`;
  document.querySelector('main').append(root); roots.set(kind, {root, index:0});
  root.addEventListener('click', event => {
    if (event.target.closest('[data-page-prev]')) show(kind, roots.get(kind).index - 1);
    if (event.target.closest('[data-page-next]')) show(kind, roots.get(kind).index + 1);
    if (event.target.closest('[data-supplemental-close]')) document.dispatchEvent(new CustomEvent('supplemental-reader-close',{detail:{kind}}));
  });
  return roots.get(kind);
}
function show(kind, index) {
  const state = roots.get(kind); if (!state) return;
  state.index = Math.max(0, Math.min(9,index));
  state.root.querySelectorAll('.supplemental-page').forEach((page,pageIndex) => page.hidden = pageIndex !== state.index);
  state.root.querySelector('output').textContent = `${String(state.index + 1).padStart(2,'0')} / 10`;
  state.root.querySelector('[data-page-prev]').disabled = state.index === 0;
  state.root.querySelector('[data-page-next]').disabled = state.index === 9;
}
export function openSupplementalReader(kind) {
  const state = roots.get(kind) || create(kind); state.root.hidden = false; state.root.inert = false; show(kind, 0);
  if (kind === 'resignation') state.root.querySelector('[data-form-slot]').append(document.querySelector('#resignation-notice'));
  state.root.querySelector('[data-page-next]').focus({preventScroll:true});
}
export function closeSupplementalReader(kind) {
  const state = roots.get(kind); if (!state) return;
  if (kind === 'resignation') document.body.append(document.querySelector('#resignation-notice'));
  state.root.hidden = true; state.root.inert = true;
}

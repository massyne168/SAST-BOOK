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
    ['08 / NOTICE FORM', 'COMPLETE THE NOTICE', 'VALIDATED PERSONNEL FORM', 'Fill in the original resignation form below. Review it before submitting; nothing is sent until you confirm submission.'],
    ['09 / PREVIEW', 'NOTICE DOCUMENT', 'LIVE PERSONAL COPY', 'Your details appear below automatically as you fill the form on the facing page. This remains a draft until submitted.']
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
  const formSlot = kind === 'resignation' && index === 8 ? '<div class="supplemental-form-slot" data-form-slot></div>' : '';
  const previewSlot = kind === 'resignation' && index === 9 ? "<section class=\"resignation-live-sheet\" data-resignation-preview aria-label=\"Live notice preview\"><div class=\"resignation-live-sheet__top\"><span>SAST / PERSONNEL DIVISION</span><strong data-notice-phase>DRAFT · NOT SUBMITTED</strong></div><h3>TROOPER RESIGNATION NOTICE</h3><p class=\"resignation-live-sheet__subtitle\">Personal notice • Preview generated from the form on the left</p><dl><div><dt>OFFICER NAME</dt><dd data-notice-field=\"fullName\">—</dd></div><div><dt>BADGE NUMBER</dt><dd data-notice-field=\"badgeNumber\">—</dd></div><div><dt>CURRENT RANK</dt><dd data-notice-field=\"currentRank\">—</dd></div><div><dt>EFFECTIVE DATE</dt><dd data-notice-field=\"effectiveDate\">—</dd></div><div class=\"resignation-live-sheet__wide\"><dt>STATEMENT OF RESIGNATION</dt><dd data-notice-field=\"reason\">—</dd></div><div class=\"resignation-live-sheet__wide\"><dt>ADDITIONAL NOTES</dt><dd data-notice-field=\"notes\">—</dd></div></dl><p class=\"resignation-live-sheet__foot\" data-notice-reference>UNSUBMITTED DRAFT · NOT A PERSONNEL STATUS CHANGE</p></section>" : '';
  return `<article class="supplemental-page" data-supplemental-page-index="${index}"><header><span>${escape(eyebrow)}</span><b>${String(index + 1).padStart(2,'0')} / 10</b></header><div class="supplemental-page-body"><p class="supplemental-label">${escape(label)}</p><h2>${escape(title)}</h2><div class="supplemental-rule"></div><p>${escape(body)}</p>${formSlot}${previewSlot}</div><footer>SAST CLASSIFIED RECORDS <span>${escape(kind.toUpperCase())}</span></footer></article>`;
}
function create(kind) {
  const pages = drafts[kind];
  const root = document.createElement('section');
  root.className = `supplemental-reader supplemental-reader--${kind}`;
  root.hidden = true; root.inert = true;
  root.innerHTML = `<header class="supplemental-reader-head"><div><span>${escape(kind.toUpperCase())} / INTERNAL PAGES</span><h2>${escape(pages[0][1])}</h2></div>${kind === 'resignation' ? '<button type="button" class="supplemental-open-form" data-open-form>GO TO NOTICE FORM →</button>' : ''}<button type="button" data-supplemental-close>RETURN TO OVERVIEW</button></header><div class="supplemental-book-frame"><div class="supplemental-page-stack">${pages.map((page,index) => buildPage(page,index,kind)).join('')}</div></div><nav class="supplemental-reader-controls" aria-label="${escape(pages[0][1])} page navigation"><button type="button" data-page-prev>PREVIOUS</button><output aria-live="polite">01 / 10</output><button type="button" data-page-next>NEXT</button></nav>`;
  document.querySelector('main').append(root); roots.set(kind, {root, index:0});
  root.addEventListener('click', event => {
    if (event.target.closest('[data-page-prev]')) turn(kind, -1);
    if (event.target.closest('[data-page-next]')) turn(kind, 1);
    if (event.target.closest('[data-open-form]')) { show(kind, 4); root.querySelector('#resignation-form [name=fullName]')?.focus({preventScroll:true}); }
    if (event.target.closest('[data-supplemental-close]')) document.dispatchEvent(new CustomEvent('supplemental-reader-close',{detail:{kind}}));
  });
  root.querySelector('.supplemental-page-stack').addEventListener('pointerdown', event => startPageDrag(kind, event));
  root.addEventListener('keydown', event => {
    if (event.target.closest('input,textarea,select,button,[contenteditable]')) return;
    if (event.key === 'ArrowRight') { event.preventDefault(); turn(kind, 1); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); turn(kind, -1); }
  });
  return roots.get(kind);
}
function show(kind, index) {
  const state = roots.get(kind); if (!state) return;
  if (state.drag || state.busy) return;
  state.index = Math.max(0, Math.min(4,index));
  const first = state.index * 2;
  state.root.querySelectorAll('.supplemental-page').forEach((page,pageIndex) => page.hidden = pageIndex !== first && pageIndex !== first + 1);
  state.root.querySelector('output').textContent = `SPREAD ${String(state.index + 1).padStart(2,'0')} / 05`;
  state.root.querySelector('[data-page-prev]').disabled = state.index === 0;
  state.root.querySelector('[data-page-next]').disabled = state.index === 4;
}

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const turnDuration = 440;
function turn(kind, direction) {
  const state = roots.get(kind);
  if (!state || state.busy || state.drag || ![-1, 1].includes(direction)) return false;
  const target = state.index + direction;
  if (target < 0 || target > 4) return false;
  if (reducedMotion.matches) { show(kind, target); return true; }
  state.busy = true;
  const page = state.root.querySelectorAll('.supplemental-page')[state.index * 2 + (direction === 1 ? 1 : 0)];
  const angle = direction === 1 ? -162 : 162;
  page.classList.add('is-turning');
  page.style.setProperty('--page-turn-angle', '0deg');
  requestAnimationFrame(() => page.style.setProperty('--page-turn-angle', angle + 'deg'));
  window.setTimeout(() => {
    page.classList.remove('is-turning');
    page.style.removeProperty('--page-turn-angle');
    state.busy = false;
    if (!state.root.hidden) show(kind, target);
  }, turnDuration);
  return true;
}
function startPageDrag(kind, event) {
  const state = roots.get(kind), stack = event.currentTarget;
  if (!state || state.busy || state.drag || event.button !== 0 || event.target.closest('input,textarea,select,button,a,label,form,[contenteditable]')) return;
  const shown = [...stack.querySelectorAll('.supplemental-page:not([hidden])')];
  const candidates = [
    {direction:1, page:shown[1], enabled:state.index < 4},
    {direction:-1, page:shown[0], enabled:state.index > 0}
  ];
  const candidate = candidates.find(item => {
    if (!item.enabled || !item.page || !item.page.contains(event.target)) return false;
    const rect = item.page.getBoundingClientRect();
    const edge = item.direction === 1 ? rect.right : rect.left;
    return Math.abs(event.clientX - edge) <= Math.min(115, rect.width * .32);
  });
  if (!candidate) return;
  const rect = candidate.page.getBoundingClientRect();
  state.drag = {id:event.pointerId, startX:event.clientX, width:Math.max(rect.width,1), ...candidate, progress:0};
  candidate.page.classList.add('is-turning','is-page-dragging');
  candidate.page.style.setProperty('--page-turn-angle','0deg');
  stack.setPointerCapture?.(event.pointerId);
  const move = e => {
    if (!state.drag || e.pointerId !== state.drag.id) return;
    const d = state.drag;
    const distance = d.direction * (d.startX - e.clientX);
    d.progress = Math.min(1, Math.max(0, distance / d.width));
    d.page.style.setProperty('--page-turn-angle', (d.direction === 1 ? -162 : 162) * d.progress + 'deg');
  };
  const finish = (e, cancelled = false) => {
    if (!state.drag || e.pointerId !== state.drag.id) return;
    const d = state.drag;
    const complete = !cancelled && d.progress > .5;
    state.drag = null; state.busy = true;
    d.page.classList.remove('is-page-dragging');
    d.page.style.setProperty('--page-turn-angle', (complete ? (d.direction === 1 ? -162 : 162) : 0) + 'deg');
    stack.removeEventListener('pointermove', move);
    stack.removeEventListener('pointerup', onUp);
    stack.removeEventListener('pointercancel', onCancel);
    if (stack.hasPointerCapture?.(e.pointerId)) stack.releasePointerCapture(e.pointerId);
    window.setTimeout(() => {
      d.page.classList.remove('is-turning');
      d.page.style.removeProperty('--page-turn-angle');
      state.busy = false;
      if (complete && !state.root.hidden) show(kind, state.index + d.direction);
    }, reducedMotion.matches ? 0 : Math.max(180, 340 * (1 - Math.abs(d.progress - (complete ? 1 : 0)))));
  };
  const onUp = e => finish(e);
  const onCancel = e => finish(e, true);
  stack.addEventListener('pointermove', move);
  stack.addEventListener('pointerup', onUp);
  stack.addEventListener('pointercancel', onCancel);
}
function updateNoticePreview(event) {
  const state = roots.get('resignation');
  if (!state) return;
  const data = event.detail?.data ?? {};
  const preview = state.root.querySelector('[data-resignation-preview]');
  if (!preview) return;
  for (const key of ['fullName','badgeNumber','currentRank','effectiveDate','reason','notes']) {
    const element = preview.querySelector('[data-notice-field="' + key + '"]');
    if (element) element.textContent = String(data[key] || '—');
  }
  const phase = event.detail?.phase || 'draft';
  const labels = {
    draft:'DRAFT · NOT SUBMITTED', reviewed:'REVIEWED · NOT SUBMITTED',
    sending:'SENDING · PENDING', delivered:'NOTICE DELIVERED',
    error:'DELIVERY NOT CONFIRMED'
  };
  preview.querySelector('[data-notice-phase]').textContent = labels[phase] || labels.draft;
  preview.querySelector('[data-notice-reference]').textContent =
    phase === 'delivered' && event.detail?.reference
      ? 'SERVER REFERENCE: ' + String(event.detail.reference)
      : 'UNSUBMITTED DRAFT · NOT A PERSONNEL STATUS CHANGE';
}
document.addEventListener('resignation-notice-updated', updateNoticePreview);

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

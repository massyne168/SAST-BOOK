import {FlipEngine} from './flip-engine.js';
import {createBulletinEditor} from './bulletin-editor.js';
import {buildBulletinPages} from './bulletin-pages.js';
import {fetchBulletins,currentBulletins,updateBulletins,bulletinConfig} from './bulletin-store.js';
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
// All five books now share the same multi-strip curl mesh and drag physics.
let latestNotice = null;
function parkNotice(state) {
  const notice = state.notice;
  if (notice && notice.parentNode !== document.body) document.body.append(notice);
}
function mountNotice(state) {
  if (state.kind !== 'resignation') return;
  const slot = state.index === 4 ? state.root.querySelector('.supplemental-slot-left [data-form-slot]') : null;
  const notice = state.notice;
  if (notice && slot && notice.parentNode !== slot) slot.append(notice);
}
function parkBulletinEditor(state) {
  if(state.kind!=='bulletins'||!state.editor)return;
  const editor=state.editor.element;
  if(editor.parentNode!==state.editorParking)state.editorParking.append(editor);
}
function mountBulletinEditor(state) {
  if(state.kind!=='bulletins'||!state.editor)return;
  const slot=state.index===state.documentPages.length/2-1
    ? state.root.querySelector('.supplemental-slot-left [data-bulletin-editor-slot]'):null;
  if(slot&&state.editor.element.parentNode!==slot)slot.append(state.editor.element);
}
function previewBulletin(state) {
  if(state.kind!=='bulletins')return;
  const preview=state.root.querySelector('.supplemental-slot-right [data-bulletin-preview]');
  if(!preview)return;
  const draft=state.draft||{};
  for(const key of ['type','title','issuedBy','priority','expiryDate','message']){
    const target=preview.querySelector('[data-preview-field="'+key+'"]');
    if(target)target.textContent=String(draft[key]||'—');
  }
  const phase=preview.querySelector('[data-preview-phase]');
  if(phase)phase.textContent=({draft:'DRAFT · NOT PUBLISHED',reviewed:'REVIEWED · NOT PUBLISHED',
    publishing:'SAVING...',error:'NOT PUBLISHED',published:'PUBLISHED'})[draft.phase]||'DRAFT · NOT PUBLISHED';
}
function refreshBulletinBook(state,goToIndex=null) {
  if(!state||state.kind!=='bulletins')return;
  if(state.engine.drag||state.engine.pending||state.engine.animating){
    state.refreshIndex=goToIndex;
    state.needsRefresh=true;
    return;
  }
  parkBulletinEditor(state);
  state.documentPages=buildBulletinPages(currentBulletins());
  state.engine.count=state.documentPages.length/2;
  state.engine.goTo(Math.min(state.engine.count-1,Math.max(0,goToIndex??state.index)));
  mountBulletinEditor(state);previewBulletin(state);
}
function updateControls(state) {
  const {root,index,engine} = state;
  root.querySelector('output').textContent = `SPREAD ${String(index+1).padStart(2,'0')} / ${String(engine?.count||5).padStart(2,'0')}`;
  const busy = Boolean(engine?.drag || engine?.pending || engine?.animating);
  root.querySelector('[data-page-prev]').disabled = busy || index === 0;
  root.querySelector('[data-page-next]').disabled = busy || index === (engine?.count||5)-1;
  const jump = root.querySelector('[data-open-form]');
  if (jump) jump.disabled = busy;
  const bulletinJump=root.querySelector('[data-bulletin-open-form]');
  if(bulletinJump)bulletinJump.disabled=busy;
  root.querySelector('.supplemental-flip-book').setAttribute('aria-busy', String(busy));
}
function create(kind) {
  const pages = drafts[kind];
  const root = document.createElement('section');
  root.className = `supplemental-reader supplemental-reader--${kind}`;
  root.hidden = true; root.inert = true;
  root.innerHTML = `<header class="supplemental-reader-head"><div><span>${escape(kind.toUpperCase())} / INTERNAL PAGES</span><h2>${escape(pages[0][1])}</h2></div>${kind === 'resignation' ? '<button type="button" class="supplemental-open-form" data-open-form>GO TO NOTICE FORM →</button>' : ''}${kind === 'bulletins' ? '<button type="button" class="supplemental-open-form" data-bulletin-open-form>HIGH COMMAND / PUBLISH →</button>' : ''}<button type="button" data-supplemental-close>RETURN TO OVERVIEW</button></header><div class="supplemental-book-frame"><div class="supplemental-page-stack supplemental-flip-book book" role="group" tabindex="0" aria-label="Interactive hardcover book. Drag across the spine to flip; arrow keys also turn pages."><div class="board"><span class="board-label">SAST / CONTROLLED RECORDS</span></div><div class="paper-stack"></div><div class="page-slot left supplemental-slot supplemental-slot-left"></div><div class="page-slot right supplemental-slot supplemental-slot-right"></div><div class="spine"></div><div class="supplemental-turn-layer" aria-hidden="true"></div></div></div><nav class="supplemental-reader-controls" aria-label="${escape(pages[0][1])} page navigation"><button type="button" data-page-prev>PREVIOUS</button><output aria-live="polite">SPREAD 01 / 05</output><button type="button" data-page-next>NEXT</button></nav>`;
  document.querySelector('main').append(root);
  const state = {root,kind,index:0,engine:null,notice:kind === 'resignation' ? document.querySelector('#resignation-notice') : null,
    documentPages:kind === 'bulletins' ? buildBulletinPages(currentBulletins()) : null,
    editor:null,editorParking:null,draft:null,needsRefresh:false,refreshIndex:null};
  roots.set(kind,state);
  const book = root.querySelector('.supplemental-flip-book');
  state.engine = new FlipEngine(book,{
    spreadCount:kind === 'bulletins'?state.documentPages.length/2:5, initialSpread:0,
    render:index=>kind === 'bulletins'?state.documentPages[index]:buildPage(pages[index],index,kind),
    slots:{layer:'.supplemental-turn-layer',left:'.supplemental-slot-left',right:'.supplemental-slot-right'},
    blocked:()=>root.hidden || root.inert || !!document.querySelector('dialog[open]'),
    onChange:index=>{
      state.index=index;
      updateControls(state);
      mountNotice(state);
      mountBulletinEditor(state);previewBulletin(state);
      if (kind === 'resignation' && latestNotice) updateNoticePreview({detail:latestNotice});
    },
    onBusyChange:busy=>{
      if(busy) {if(kind==='resignation')parkNotice(state);if(kind==='bulletins')parkBulletinEditor(state);}
      if(!busy) {mountNotice(state);mountBulletinEditor(state);previewBulletin(state);}
      updateControls(state);
      if(!busy&&state.needsRefresh){const target=state.refreshIndex;state.needsRefresh=false;state.refreshIndex=null;refreshBulletinBook(state,target);}

    }
  });
  if(kind==='bulletins'){
    const parking=document.createElement('div');
    parking.hidden=true;
    parking.className='bulletin-editor-parking';
    document.body.append(parking);
    state.editorParking=parking;
    state.editor=createBulletinEditor({
      onDraft:draft=>{state.draft=draft;previewBulletin(state);},
      onPublished:bulletin=>{
        updateBulletins([bulletin,...currentBulletins()],{publishingConfigured:true});
        refreshBulletinBook(state,1);
      }
    });
    parking.append(state.editor.element);
  }
  updateControls(state);
  root.addEventListener('click',event=>{
    if (event.target.closest('[data-page-prev]')) state.engine.turn(-1);
    if (event.target.closest('[data-page-next]')) state.engine.turn(1);
    if (event.target.closest('[data-bulletin-open-form]') && kind==='bulletins') {
      const last=state.documentPages.length/2-1;
      if(show(kind,last))root.querySelector('.supplemental-slot-left [name=title]')?.focus({preventScroll:true});
    }
    if (event.target.closest('[data-open-form]')) {
      if (show(kind,4)) root.querySelector('.supplemental-slot-left #resignation-form [name=fullName]')?.focus({preventScroll:true});
    }
    if (event.target.closest('[data-supplemental-close]')) document.dispatchEvent(new CustomEvent('supplemental-reader-close',{detail:{kind}}));
  });
  return state;
}
function show(kind,index) {
  const state = roots.get(kind);
  if (!state || !Number.isInteger(index) || index < 0 || index >= (state.engine?.count||5)) return false;
  if (state.index === index) { mountNotice(state); return true; }
  if (state.engine.drag || state.engine.animating || state.engine.pending) return false;
  if (kind === 'resignation') parkNotice(state);
  if (kind === 'bulletins') parkBulletinEditor(state);
  const moved = state.engine.goTo(index);
  if (!moved) {mountNotice(state);mountBulletinEditor(state);}
  return moved;
}
function updateNoticePreview(event) {
  latestNotice = event.detail || null;
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
  const state = roots.get(kind) || create(kind);
  state.engine.cancel(true);
  state.root.hidden = false; state.root.inert = false;
  state.engine.refreshMetrics();
  show(kind,0);
  mountNotice(state);
  mountBulletinEditor(state);previewBulletin(state);
  if(kind==='bulletins')fetchBulletins().then(()=>{
    refreshBulletinBook(state);
    if(!bulletinConfig().publishingConfigured){
      const status=state.editor?.element.querySelector('[data-bulletin-status]');
      if(status)status.textContent='Server publishing is not configured yet. High Command must set its private access key and connect persistent storage in Vercel.';
    }
  }).catch(error=>{
    const target=state.root.querySelector('[data-bulletin-open-form]');
    if(target)target.title='Could not sync published bulletins: '+error.message;
  });
  state.root.querySelector('.supplemental-flip-book').focus({preventScroll:true});
}
export function closeSupplementalReader(kind) {
  const state = roots.get(kind); if (!state) return;
  state.engine.cancel(true);
  if (kind === 'resignation') parkNotice(state);
  if (kind === 'bulletins') {
    parkBulletinEditor(state);
    if(state.editor?.form){
      state.editor.form.elements.secret.value='';
      state.editor.form.dispatchEvent(new Event('input',{bubbles:true}));
    }
  }
  state.root.hidden = true; state.root.inert = true;
}

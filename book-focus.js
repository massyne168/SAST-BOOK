const pair = document.querySelector('.book-pair');
const primary = document.querySelector('.primary-book');
const directoryTeaser = document.querySelector('.rank-cover-stage-teaser');
const archiveCover = document.querySelector('#archive-cover');
const rankCover = document.querySelector('#rank-cover');
const archiveAction = document.querySelector('#open-archive');
const rankAction = document.querySelector('#open-rank-directory');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let transitionPending = false;
const nodes = {archive: archiveCover, directory: rankCover};
const wrappers = {archive: primary, directory: directoryTeaser};
const labels = {archive: 'OPEN ARCHIVE', directory: 'ENTER DIRECTORY'};
const idleLabels = {archive: 'OPEN THE ARCHIVE', directory: 'OPEN DIRECTORY'};
const actions = {archive: archiveAction, directory: rankAction};
const buttonText = {archive: archiveAction?.querySelector('.access-copy strong'), directory: rankAction?.querySelector('span')};

function setState(kind, state) {
  const node = nodes[kind];
  if (!node) return;
  node.dataset.bookState = state;
  const action = actions[kind];
  const actionLabel = {
    'book-focused': `${labels[kind]} — selected book, activate again to open`,
    'book-opening': `${kind === 'archive' ? 'Opening archive' : 'Opening directory'}`,
    'book-open': `${kind === 'archive' ? 'Archive' : 'Directory'} open`,
    'book-closing': `Closing ${kind === 'archive' ? 'archive' : 'directory'}`,
    'book-hover': `${idleLabels[kind]}; activate to focus`,
    'book-idle': `${idleLabels[kind]}; focus the book first`
  }[state] || idleLabels[kind];
  action?.setAttribute('aria-label', actionLabel);
  if (buttonText[kind]) buttonText[kind].textContent = state === 'book-focused' ? labels[kind] : state === 'book-opening' ? 'OPENING…' : state === 'book-open' ? 'IN DIRECTORY' : idleLabels[kind];
}
function settleTransition(duration = 480) {
  if (reducedMotion.matches) return Promise.resolve();
  return new Promise(resolve => window.setTimeout(resolve, duration));
}

export function isBookFocused(kind) {
  return pair?.dataset.focusedBook === kind && nodes[kind]?.dataset.bookState === 'book-focused';
}
export function bookTransitioning() { return transitionPending; }

export async function focusBook(kind) {
  if (!pair || !nodes[kind] || transitionPending || isBookFocused(kind)) return false;
  transitionPending = true;
  pair.classList.add('book-focus-transition');
  pair.dataset.focusedBook = kind;
  pair.dataset.bookState = 'book-focused';
  setState(kind, 'book-focused');
  setState(kind === 'archive' ? 'directory' : 'archive', 'book-idle');
  for (const wrapper of Object.values(wrappers)) if (wrapper) wrapper.style.willChange = 'transform, opacity';
  await settleTransition();
  pair.classList.remove('book-focus-transition');
  for (const wrapper of Object.values(wrappers)) if (wrapper) wrapper.style.willChange = '';
  transitionPending = false;
  return true;
}

export function setBookOpening(kind) {
  if (transitionPending || !isBookFocused(kind)) return false;
  transitionPending = true;
  pair.classList.add('book-opening-lock');
  setState(kind, 'book-opening');
  pair.dataset.bookState = 'book-opening';
  return true;
}
export function setBookFocused(kind) {
  setState(kind, 'book-focused');
  pair.dataset.bookState = 'book-focused';
  pair.classList.remove('book-opening-lock');
  transitionPending = false;
}
export function setBookOpen(kind) {
  setState(kind, 'book-open');
  pair.dataset.bookState = 'book-open';
  pair.classList.remove('book-opening-lock');
  transitionPending = false;
}

export async function resetBookFocus(kind, duration = 480) {
  if (!pair) return;
  transitionPending = true;
  pair.classList.add('book-focus-transition');
  pair.dataset.bookState = 'book-closing';
  for (const key of Object.keys(nodes)) setState(key, 'book-closing');
  for (const wrapper of Object.values(wrappers)) if (wrapper) wrapper.style.willChange = 'transform, opacity';
  await settleTransition(duration);
  delete pair.dataset.focusedBook;
  pair.dataset.bookState = 'book-idle';
  pair.classList.remove('book-focus-transition');
  for (const key of Object.keys(nodes)) setState(key, 'book-idle');
  for (const wrapper of Object.values(wrappers)) if (wrapper) wrapper.style.willChange = '';
  transitionPending = false;
}

function observeHover(kind) {
  const node = nodes[kind];
  node?.addEventListener('pointerenter', event => {
    if (event.pointerType === 'mouse' && !pair.dataset.focusedBook && !transitionPending) setState(kind, 'book-hover');
  });
  node?.addEventListener('pointerleave', () => {
    if (node.dataset.bookState === 'book-hover') setState(kind, 'book-idle');
  });
}
observeHover('archive');
observeHover('directory');

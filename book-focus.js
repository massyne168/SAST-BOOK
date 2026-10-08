const pair = document.querySelector('.book-pair');
const primary = document.querySelector('.primary-book');
const directoryTeaser = document.querySelector('.rank-cover-stage-teaser');
const archiveCover = document.querySelector('#archive-cover');
const rankCover = document.querySelector('#rank-cover');
const archiveBook = document.querySelector('#book');
const rankBook = document.querySelector('#rank-book');
const archiveAction = document.querySelector('#open-archive');
const rankAction = document.querySelector('#open-rank-directory');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let transitionPending = false;
let nearestBook = null;
let observerFrame = 0;
let scrollDebounce = 0;
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

function scrollBlocked() {
  return !!document.querySelector('.book.turning, .book-dragging') || document.body.classList.contains('book-drag-active');
}
function waitForScrollEnd() {
  if (reducedMotion.matches) return Promise.resolve();
  return new Promise(resolve => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      document.removeEventListener('scrollend', finish);
      resolve();
    };
    const timer = window.setTimeout(finish, 900);
    document.addEventListener('scrollend', finish, {once: true});
  });
}
function scrollTargetToCenter(element) {
  if (!element || !element.getClientRects().length || scrollBlocked()) return Promise.resolve(false);
  const rect = element.getBoundingClientRect();
  const dx = Math.abs(rect.left + rect.width / 2 - innerWidth / 2);
  const dy = Math.abs(rect.top + rect.height / 2 - innerHeight / 2);
  const xThreshold = Math.max(36, innerWidth * .055);
  const yThreshold = Math.max(32, innerHeight * .065);
  if (dx < xThreshold && dy < yThreshold) return Promise.resolve(false);
  element.scrollIntoView({behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'center', inline: 'center'});
  return waitForScrollEnd();
}
export function centerBook(kind, opened = false) {
  const target = opened ? (kind === 'archive' ? archiveBook : rankBook) : nodes[kind];
  return scrollTargetToCenter(target);
}
export function centerOverview() {
  const mainIsOpen = !document.querySelector('main')?.classList.contains('archive-closed');
  const target = matchMedia('(max-width: 999px)').matches ? (mainIsOpen ? archiveBook : archiveCover) : pair;
  return scrollTargetToCenter(target);
}

function updateNearestBook() {
  observerFrame = 0;
  if (!pair || pair.dataset.focusedBook || transitionPending || scrollBlocked()) return;
  const centerX = innerWidth / 2, centerY = innerHeight / 2;
  const candidates = [
    ['archive', archiveCover], ['archive', archiveBook],
    ['directory', rankCover], ['directory', rankBook]
  ];
  let best = null;
  for (const [kind, element] of candidates) {
    if (!element?.getClientRects().length) continue;
    const rect = element.getBoundingClientRect();
    const x = (rect.left + rect.width / 2 - centerX) / Math.max(centerX, 1);
    const y = (rect.top + rect.height / 2 - centerY) / Math.max(centerY, 1);
    const score = x * x + y * y;
    if (!best || score < best.score) best = {kind, score};
  }
  if (!best) return;
  if (nearestBook && nearestBook !== best.kind) {
    const current = candidates.find(([kind, element]) => kind === nearestBook && element?.getClientRects().length);
    if (current) {
      const rect = current[1].getBoundingClientRect();
      const x = (rect.left + rect.width / 2 - centerX) / Math.max(centerX, 1);
      const y = (rect.top + rect.height / 2 - centerY) / Math.max(centerY, 1);
      if (best.score > x * x + y * y - .08) return;
    }
  }
  nearestBook = best.kind;
  pair.dataset.nearCenter = best.kind;
}
function scheduleNearestUpdate() {
  if (!observerFrame) observerFrame = requestAnimationFrame(updateNearestBook);
}
const visibilityObserver = 'IntersectionObserver' in window ? new IntersectionObserver(scheduleNearestUpdate, {
  root: null,
  rootMargin: '0px',
  threshold: [0, .2, .45, .7, 1]
}) : null;
for (const element of [archiveCover, archiveBook, rankCover, rankBook]) visibilityObserver?.observe(element);
window.addEventListener('resize', scheduleNearestUpdate, {passive: true});
window.addEventListener('scroll', () => {
  clearTimeout(scrollDebounce);
  scrollDebounce = window.setTimeout(scheduleNearestUpdate, 90);
}, {passive: true});

export function isBookFocused(kind) {
  return pair?.dataset.focusedBook === kind && nodes[kind]?.dataset.bookState === 'book-focused';
}
export function bookTransitioning() { return transitionPending; }

export async function focusBook(kind) {
  if (!pair || !nodes[kind] || transitionPending || isBookFocused(kind)) return false;
  transitionPending = true;
  pair.classList.add('book-scroll-pending');
  await centerBook(kind);
  pair.classList.remove('book-scroll-pending');
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

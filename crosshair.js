// Decorative pointer only: all input remains on the real underlying controls.
const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const cursor = document.createElement('div');
cursor.className = 'tactical-cursor';
cursor.setAttribute('aria-hidden', 'true');
cursor.innerHTML = '<span class="cursor-ring"></span><span class="cursor-cross"></span><span class="cursor-dot"></span>';
document.body.append(cursor);
let x = 0, y = 0, trailX = 0, trailY = 0, frame = 0, lastMove = 0;
let visible = false;
function hide() {
  visible = false;
  cursor.classList.remove('visible', 'moving', 'pressed', 'interactive');
  document.documentElement.classList.remove('crosshair-active');
  cancelAnimationFrame(frame);
  frame = 0;
}
function draw(now) {
  frame = 0;
  if (!visible) return;
  cursor.style.setProperty('--pointer-x', `${x}px`);
  cursor.style.setProperty('--pointer-y', `${y}px`);
  const moving = now - lastMove < 110;
  const ease = reducedMotion.matches ? 1 : .23;
  trailX += (x - trailX) * ease;
  trailY += (y - trailY) * ease;
  cursor.style.setProperty('--trail-x', `${trailX - x}px`);
  cursor.style.setProperty('--trail-y', `${trailY - y}px`);
  cursor.classList.toggle('moving', moving && !reducedMotion.matches);
  if (moving || Math.abs(x - trailX) + Math.abs(y - trailY) > .15) frame = requestAnimationFrame(draw);
}
document.addEventListener('pointermove', event => {
  if (!finePointer.matches || event.pointerType !== 'mouse') { hide(); return; }
  x = event.clientX; y = event.clientY;
  if (!visible) { trailX = x; trailY = y; }
  visible = true;
  lastMove = performance.now();

  cursor.classList.add('visible');
  // Keep the native pointer inside top-layer dialogs, above the body cursor.
  const inDialog = Boolean(event.target.closest('dialog[open]'));
  cursor.classList.toggle('over-dialog', inDialog);
  document.documentElement.classList.toggle('crosshair-active', !inDialog);
  cursor.classList.toggle('interactive', Boolean(event.target.closest('button, a, #book')));
  if (!frame) frame = requestAnimationFrame(draw);
}, { passive: true });
document.addEventListener('pointerdown', event => {
  if (event.pointerType !== 'mouse' || !visible) return;
  cursor.classList.add('pressed');
});
document.addEventListener('pointerup', () => cursor.classList.remove('pressed'));
document.addEventListener('pointercancel', hide);
document.documentElement.addEventListener('pointerleave', hide);
window.addEventListener('blur', hide);
document.addEventListener('visibilitychange', () => { if (document.hidden) hide(); });
document.addEventListener('keydown', event => { if (event.key === 'Tab') hide(); });
finePointer.addEventListener('change', hide);
reducedMotion.addEventListener('change', hide);

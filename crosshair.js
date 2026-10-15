const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const cursor = document.createElement('div');
cursor.className = 'tactical-cursor';
cursor.setAttribute('aria-hidden', 'true');
cursor.innerHTML = '<span class="cursor-ring"></span><span class="cursor-dot"></span>';
document.body.append(cursor);
let x = 0, y = 0, ringX = 0, ringY = 0, frame = 0, visible = false;
function draw() {
  frame = 0;
  if (!visible) return;
  const ease = reducedMotion.matches ? 1 : .24;
  ringX += (x - ringX) * ease; ringY += (y - ringY) * ease;
  cursor.style.transform = `translate3d(${x}px,${y}px,0)`;
  cursor.style.setProperty('--ring-x', `${ringX - x}px`);
  cursor.style.setProperty('--ring-y', `${ringY - y}px`);
  if (Math.abs(x - ringX) + Math.abs(y - ringY) > .15) frame = requestAnimationFrame(draw);
}
function hide() { visible = false; cursor.classList.remove('visible','interactive','pressed'); document.documentElement.classList.remove('crosshair-active'); cancelAnimationFrame(frame); frame = 0; }
document.addEventListener('pointermove', event => {
  if (!finePointer.matches || event.pointerType !== 'mouse') return hide();
  x = event.clientX; y = event.clientY;
  if (!visible) { ringX = x; ringY = y; }
  visible = true; cursor.classList.add('visible');
  const editable = event.target.closest('input,textarea,select,[contenteditable="true"]');
  document.documentElement.classList.toggle('crosshair-active', !editable && !event.target.closest('dialog[open]'));
  cursor.classList.toggle('interactive', Boolean(event.target.closest('button,a,#book,.rank-book')));
  if (!frame) frame = requestAnimationFrame(draw);
}, {passive:true});
document.addEventListener('pointerdown', event => { if (event.pointerType === 'mouse' && visible) cursor.classList.add('pressed'); });
document.addEventListener('pointerup', () => cursor.classList.remove('pressed'));
document.addEventListener('pointercancel', hide); document.documentElement.addEventListener('pointerleave', hide); window.addEventListener('blur', hide);
finePointer.addEventListener('change', hide); reducedMotion.addEventListener('change', hide);
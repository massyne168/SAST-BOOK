export function setupZoom({pageFiles, onError}) {
  const dialog = document.querySelector('#zoom-dialog');
  const viewport = document.querySelector('#zoom-viewport');
  const image = document.querySelector('#zoom-image');
  const level = document.querySelector('#zoom-level');
  const pointers = new Map();
  let scale = 1, x = 0, y = 0, previousFocus, gesture;
  function paint() {
    const maxX = Math.max(0, (image.clientWidth * scale - viewport.clientWidth) / 2);
    const maxY = Math.max(0, (image.clientHeight * scale - viewport.clientHeight) / 2);
    x = Math.min(maxX, Math.max(-maxX, x)); y = Math.min(maxY, Math.max(-maxY, y));
    image.style.transform = `translate(${x}px,${y}px) scale(${scale})`;
    level.value = `${Math.round(scale * 100)}%`;
    document.querySelector('#zoom-out').disabled = scale <= 1;
    document.querySelector('#zoom-in').disabled = scale >= 5;
  }
  function setScale(value) { scale = Math.max(1, Math.min(5, value)); paint(); }
  function reset() { scale = 1; x = y = 0; paint(); }
  document.querySelector('#zoom-close').onclick = () => dialog.close();
  document.querySelector('#zoom-in').onclick = () => setScale(scale * 1.25);
  document.querySelector('#zoom-out').onclick = () => setScale(scale / 1.25);
  document.querySelector('#zoom-reset').onclick = reset;
  viewport.addEventListener('wheel', event => { event.preventDefault(); setScale(scale * Math.exp(-event.deltaY * .002)); }, {passive:false});
  function baseline() {
    const values = [...pointers.values()];
    gesture = values.length > 1 ? {distance:Math.hypot(values[0].x-values[1].x, values[0].y-values[1].y),scale} : values[0] ? {...values[0],panX:x,panY:y} : null;
  }
  viewport.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    viewport.setPointerCapture(event.pointerId); pointers.set(event.pointerId,{x:event.clientX,y:event.clientY}); baseline();
  });
  viewport.addEventListener('pointermove', event => {
    if (!pointers.has(event.pointerId)) return;
    pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
    const values = [...pointers.values()];
    if (values.length > 1) {
      const distance = Math.hypot(values[0].x-values[1].x,values[0].y-values[1].y);
      if (gesture.distance > 0) setScale(gesture.scale * distance / gesture.distance);
    } else { x = gesture.panX + event.clientX - gesture.x; y = gesture.panY + event.clientY - gesture.y; paint(); }
  });
  for (const type of ['pointerup','pointercancel','lostpointercapture']) viewport.addEventListener(type,event => { pointers.delete(event.pointerId); baseline(); });
  dialog.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); dialog.close(); }
    if (event.key !== 'Tab') return;
    const buttons = [...dialog.querySelectorAll('button:not(:disabled)')];
    const first = buttons[0], last = buttons.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  dialog.addEventListener('close', () => { pointers.clear(); gesture = null; previousFocus?.focus({preventScroll:true}); });
  image.onload = paint;
  image.onerror = () => { dialog.close(); onError('Unable to load the selected page. Please try again.'); };
  new ResizeObserver(() => { if (dialog.open) paint(); }).observe(viewport);
  return {open(index) {
    if (dialog.open) return;
    previousFocus = document.activeElement;
    image.src = pageFiles[index]; image.alt = `ELYSIUM record — page ${index + 1}`;
    document.querySelector('#zoom-title').textContent = `PAGE ${String(index + 1).padStart(2,'0')}`;
    dialog.showModal(); reset(); document.querySelector('#zoom-close').focus();
  }};
}

import {canTurn} from './reader-state.js';
export const clamp = (n, a = 0, b = 1) => Math.min(b, Math.max(a, n));
export function progressFor(startX, x, width, direction) { return clamp((startX - x) * direction / (width * 2)); }
export function shouldComplete(progress) { return progress > 0.5; }

/** Renderer is injected: the engine never knows page IDs, content or design. */
export class FlipEngine {
  constructor(book, {render, spreadCount, onChange, onBusyChange, onSelect, blocked = () => false, initialSpread = 0}) {
    Object.assign(this, {book, render, count: spreadCount, onChange, onBusyChange, onSelect, blocked});
    this.spread = clamp(Number.isFinite(initialSpread) ? Math.trunc(initialSpread) : 0, 0, spreadCount - 1);
    this.layer = book.querySelector('#turn-layer');
    this.left = book.querySelector('#left');
    this.right = book.querySelector('#right');
    this.motion = matchMedia('(prefers-reduced-motion: reduce)');
    this.touchDevice = matchMedia('(pointer: coarse)');
    this.frame = this.settleFrame = 0;
    this.draw();
    book.addEventListener('pointerdown', e => this.down(e), {passive: true});
    book.addEventListener('pointermove', e => this.move(e), {passive: true});
    book.addEventListener('pointerup', e => this.up(e), {passive: true});
    book.addEventListener('pointercancel', e => {
      if (e.pointerId === this.pending?.id || e.pointerId === this.drag?.id) this.cancel();
    }, {passive: true});
    book.addEventListener('lostpointercapture', e => {
      if (e.pointerId === this.pending?.id || (e.pointerId === this.drag?.id && !this.animating)) this.cancel();
    }, {passive: true});
    book.addEventListener('dragstart', e => e.preventDefault());
    book.addEventListener('contextmenu', e => { if (this.pending || this.drag) e.preventDefault(); });
    book.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault(); this.turn(e.key === 'ArrowRight' ? 1 : -1);
      }
    });
    this.resize = new ResizeObserver(() => { if (this.drag || this.pending) this.cancel(true); });
    this.resize.observe(book);
    window.addEventListener('blur', () => this.cancel(true));
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.cancel(true); });
    this.motion.addEventListener('change', () => this.cancel(true));
  }

  draw(notify = true) {
    this.left.innerHTML = this.render(this.spread * 2);
    this.right.innerHTML = this.render(this.spread * 2 + 1);
    if (notify) this.onChange?.(this.spread);
  }
  valid(d) { return canTurn(this.spread, d, this.count); }

  // Geometry and detached leaf DOM are prepared once, before pointermove.
  prepare(d, rect, lightweight) {
    const count = lightweight ? 6 : 20;
    const width = rect.width / 2, stripWidth = width / count;
    const front = this.render(this.spread * 2 + (d === 1 ? 1 : 0));
    const back = this.render((this.spread + d) * 2 + (d === 1 ? 0 : 1));
    const underneath = this.render((this.spread + d) * 2 + (d === 1 ? 1 : 0));
    const fragment = document.createDocumentFragment(), strips = [];
    for (let i = 0; i < count; i++) {
      const strip = document.createElement('div');
      strip.className = 'leaf-strip';
      strip.style.width = `${stripWidth + 0.65}px`;
      strip.innerHTML = `<div class="leaf-face front"><div class="leaf-content">${front}</div></div><div class="leaf-face back"><div class="leaf-content">${back}</div></div>`;
      const offset = d === 1 ? i : count - 1 - i;
      strip.querySelector('.front .leaf-content').style.left = `${-offset * stripWidth}px`;
      strip.querySelector('.back .leaf-content').style.left = `${-(count - 1 - offset) * stripWidth}px`;
      strip.querySelectorAll('.leaf-content').forEach(el => { el.style.width = `${width}px`; });
      fragment.append(strip); strips.push(strip);
    }
    return {d, p: 0, y: 0, width, height: this.book.clientHeight, lightweight, count, strips, fragment, underneath};
  }

  begin(d, prepared) {
    if (this.blocked() || this.animating || this.drag || !this.valid(d)) return false;
    const leaf = prepared ?? this.prepare(d, this.book.getBoundingClientRect(), this.touchDevice.matches);
    this.drag = leaf;
    this.book.classList.add('turning');
    this.book.classList.toggle('turning-touch', leaf.lightweight);
    this.onBusyChange?.(true);
    (d === 1 ? this.right : this.left).innerHTML = leaf.underneath;
    this.layer.replaceChildren(leaf.fragment);
    this.paint(0);
    return true;
  }

  down(e) {
    if (e.button !== 0 || e.isPrimary === false || this.blocked() || this.drag || this.animating || this.pending || e.target.closest('a,button,input')) return;
    const rect = this.book.getBoundingClientRect(), center = rect.left + rect.width / 2;
    const d = e.clientX >= center ? 1 : -1;
    this.pending = {
      id: e.pointerId, x: e.clientX, y: e.clientY, d, center, moved: false,
      leaf: this.valid(d) ? this.prepare(d, rect, e.pointerType === 'touch' || this.touchDevice.matches) : null
    };
    this.book.focus({preventScroll: true});
    this.book.setPointerCapture(e.pointerId);
  }

  // No layout reads, DOM construction or per-strip work in this event handler.
  move(e) {
    if (this.animating || e.pointerId !== (this.pending?.id ?? this.drag?.id)) return;
    this.sample = {x: e.clientX, y: e.clientY};
    if (!this.frame) this.frame = requestAnimationFrame(() => { this.frame = 0; this.flush(); });
  }

  flush() {
    const sample = this.sample;
    this.sample = null;
    if (!sample) return;
    if (this.pending) {
      const pending = this.pending;
      if (Math.hypot(sample.x - pending.x, sample.y - pending.y) < 8) return;
      pending.moved = true;
      if (!pending.leaf) return;
      this.pending = null;
      if (!this.begin(pending.d, pending.leaf)) { this.release(pending.id); return; }
      Object.assign(this.drag, {radius: Math.max(12, Math.abs(pending.x - pending.center)), startX: pending.x, startY: pending.y, id: pending.id});
    }
    if (!this.drag || this.animating) return;
    this.drag.y = clamp((sample.y - this.drag.startY) / this.drag.height, -.3, .3);
    this.paint(progressFor(this.drag.startX, sample.x, this.drag.radius, this.drag.d));
  }

  paint(p) {
    if (!this.drag) return;
    this.drag.p = p;
    const {d, width, y, count, strips, lightweight} = this.drag;
    const angle = Math.acos(1 - 2 * p), curl = Math.sin(Math.PI * p), w = width / count;
    let x = 0, z = 0;
    for (let i = 0; i < count; i++) {
      const bend = curl * .34 * Math.sin((i / (count - 1) - .5) * Math.PI);
      const a = angle + bend, cos = Math.cos(a), sin = Math.sin(a);
      const xx = d === 1 ? x : -x - w * cos, zz = d === 1 ? z : z + w * sin;
      strips[i].style.transform = `translate3d(${xx}px,${curl * y * (i * 19 / (count - 1)) * 1.5}px,${zz + 2}px) rotateY(${d === 1 ? -a : a}rad)`;
      if (!lightweight) strips[i].style.setProperty('--shade', .16 * sin);
      x += w * cos; z += w * sin;
    }
    if (!lightweight) this.book.style.setProperty('--turn-shadow', curl * .3);
  }

  up(e) {
    if (this.animating || e.pointerId !== (this.pending?.id ?? this.drag?.id)) return;
    // A release can arrive before the queued frame: always use its final position.
    cancelAnimationFrame(this.frame); this.frame = 0;
    this.sample = {x: e.clientX, y: e.clientY}; this.flush();
    if (this.pending) {
      const pending = this.pending; this.pending = null; this.release(pending.id);
      if (!pending.moved) this.onSelect?.(this.spread * 2 + (pending.d === 1 ? 1 : 0), e);
      return;
    }
    if (this.drag) this.settle(shouldComplete(this.drag.p));
  }

  settle(complete) {
    if (!this.drag) return;
    cancelAnimationFrame(this.frame); this.frame = 0; this.sample = null;
    cancelAnimationFrame(this.settleFrame);
    this.animating = true;
    if (this.motion.matches) { this.finish(complete); return; }
    const active = this.drag, from = active.p, to = complete ? 1 : 0, start = performance.now();
    const tick = now => {
      this.settleFrame = 0;
      if (this.drag !== active) return;
      const t = clamp((now - start) / 430);
      this.paint(from + (to - from) * (1 - (1 - t) ** 3));
      if (t < 1) this.settleFrame = requestAnimationFrame(tick);
      else this.finish(complete);
    };
    this.settleFrame = requestAnimationFrame(tick);
  }

  release(id) {
    if (id !== undefined && this.book.hasPointerCapture(id)) this.book.releasePointerCapture(id);
  }

  finish(complete) {
    const active = this.drag;
    if (!active) return;
    cancelAnimationFrame(this.frame); cancelAnimationFrame(this.settleFrame);
    this.frame = this.settleFrame = 0; this.sample = null;
    if (complete) this.spread += active.d;
    this.drag = null; this.animating = false;
    this.layer.replaceChildren();
    this.book.classList.remove('turning', 'turning-touch');
    this.book.style.setProperty('--turn-shadow', 0);
    this.draw(complete); this.onBusyChange?.(false); this.release(active.id);
  }

  cancel(immediate = false) {
    cancelAnimationFrame(this.frame); this.frame = 0; this.sample = null;
    const pending = this.pending; this.pending = null;
    if (pending) this.release(pending.id);
    if (!this.drag) return;
    if (immediate) this.finish(false); else this.settle(false);
  }
  turn(d) { if (this.pending || this.animating || !this.begin(d)) return; this.settle(true); }
  goTo(spread) {
    if (this.pending || this.drag || this.animating || !Number.isInteger(spread) || spread < 0 || spread >= this.count) return false;
    this.spread = spread; this.draw(); return true;
  }
}

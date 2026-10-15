import {canTurn} from './reader-state.js';
export const clamp = (n, a = 0, b = 1) => Math.min(b, Math.max(a, n));
export function progressFor(startX, x, width, direction) { return clamp((startX - x) * direction / (width * 2)); }
export function shouldComplete(progress) { return progress > 0.5; }

/** Reusable page-turn mesh. Rendering stays injected and page agnostic. */
export class FlipEngine {
  constructor(book, {render, spreadCount, onChange, onBusyChange, onSelect, onPrepareTurn, blocked = () => false, initialSpread = 0}) {
    Object.assign(this, {book, render, count: spreadCount, onChange, onBusyChange, onSelect, onPrepareTurn, blocked});
    this.spread = clamp(Number.isFinite(initialSpread) ? Math.trunc(initialSpread) : 0, 0, spreadCount - 1);
    this.layer = book.querySelector('#turn-layer');
    this.left = book.querySelector('#left');
    this.right = book.querySelector('#right');
    this.motion = matchMedia('(prefers-reduced-motion: reduce)');
    this.touchDevice = matchMedia('(pointer: coarse)');
    this.lowPower = this.touchDevice.matches || matchMedia('(max-width: 600px)').matches ||
      (navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 4) || !!navigator.connection?.saveData;
    this.stripCount = this.lowPower ? 6 : 8;
    this.frame = this.settleFrame = 0;
    this.pageMarkup = [];
    this.refreshMetrics();
    this.createReusableStrips();
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
    this.resize = new ResizeObserver(() => { this.refreshMetrics(); if (this.drag || this.pending) this.cancel(true); });
    this.resize.observe(book);
    window.addEventListener('blur', () => this.cancel(true));
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.cancel(true); });
    this.motion.addEventListener('change', () => this.cancel(true));
  }

  refreshMetrics() {
    const rect = this.book.getBoundingClientRect();
    this.metrics = {left: rect.left, centerX: rect.left + rect.width / 2, width: rect.width, height: rect.height};
  }

  createReusableStrips() {
    const fragment = document.createDocumentFragment();
    this.strips = Array.from({length: this.stripCount}, () => {
      const strip = document.createElement('div');
      strip.className = 'leaf-strip';
      strip.innerHTML = '<div class="leaf-face front"><div class="leaf-content"></div></div><div class="leaf-face back"><div class="leaf-content"></div></div>';
      const entry = {
        element: strip,
        front: strip.querySelector('.front'),
        back: strip.querySelector('.back'),
        frontContent: strip.querySelector('.front .leaf-content'),
        backContent: strip.querySelector('.back .leaf-content')
      };
      fragment.append(strip);
      return entry;
    });
    this.layer.replaceChildren(fragment);
  }

  configureFace(face, content, pageOffset, width, height) {
    // Archive pages are single WebP images. A CSS background avoids cloning an img per strip.
    if (content.includes('class="page image-page"')) {
      const src = content.match(/<img\b[^>]*\bsrc="([^"]+)"/i)?.[1];
      if (src) {
        face.classList.add('leaf-image-face');
        face.style.backgroundImage = `url(${JSON.stringify(src)})`;
        face.style.backgroundSize = `${width}px ${height}px`;
        face.style.backgroundPosition = `${-pageOffset}px 0px`;
        return;
      }
    }
    face.classList.remove('leaf-image-face');
    face.style.backgroundImage = '';
    face.style.backgroundSize = '';
    face.style.backgroundPosition = '';
    const inner = face.firstElementChild;
    inner.style.width = `${width}px`;
    inner.style.left = `${-pageOffset}px`;
    inner.innerHTML = content;
  }

  removeTurnImages(content) {
    if (!content.includes('<img')) return content;
    const template = document.createElement('template');
    template.innerHTML = content;
    template.content.querySelectorAll('img').forEach(image => {
      const portrait = document.createElement('div');
      portrait.className = image.className;
      portrait.setAttribute('role', image.getAttribute('alt') ? 'img' : 'presentation');
      if (image.getAttribute('alt')) portrait.setAttribute('aria-label', image.getAttribute('alt'));
      portrait.style.backgroundImage = `url(${JSON.stringify(image.getAttribute('src') || '')})`;
      portrait.style.backgroundSize = 'cover';
      portrait.style.backgroundPosition = 'center';
      image.replaceWith(portrait);
    });
    return template.innerHTML;
  }

  draw(notify = true) {
    const leftIndex = this.spread * 2, rightIndex = leftIndex + 1;
    this.pageMarkup = [this.render(leftIndex), this.render(rightIndex)];
    this.left.innerHTML = this.pageMarkup[0];
    this.right.innerHTML = this.pageMarkup[1];
    if (notify) this.onChange?.(this.spread);
  }

  valid(d) { return canTurn(this.spread, d, this.count); }

  prepare(d) {
    const {width: bookWidth, height} = this.metrics;
    if (!bookWidth || !height) return null;
    const count = this.strips.length, width = bookWidth / 2, stripWidth = width / count;
    const target = (this.spread + d) * 2;
    const front = this.removeTurnImages(this.pageMarkup[d === 1 ? 1 : 0]);
    const back = this.removeTurnImages(this.render(target + (d === 1 ? 0 : 1)));
    const underneath = this.render(target + (d === 1 ? 1 : 0));
    for (let i = 0; i < count; i++) {
      const strip = this.strips[i], offset = d === 1 ? i : count - 1 - i;
      strip.element.style.width = `${stripWidth + 0.65}px`;
      strip.front.style.transform = '';
      strip.back.style.transform = 'rotateY(180deg)';
      this.configureFace(strip.front, front, offset * stripWidth, width, height);
      this.configureFace(strip.back, back, (count - 1 - offset) * stripWidth, width, height);
    }
    return {d, p: 0, y: 0, width, height, count, strips: this.strips, stripWidth, underneath};
  }

  begin(d, pointerType = 'mouse') {
    if (this.blocked() || this.animating || this.drag || !this.valid(d)) return false;
    const leaf = this.prepare(d);
    if (!leaf) return false;
    this.drag = leaf;
    this.book.classList.add('turning');
    this.book.classList.toggle('turning-touch', pointerType === 'touch' || this.lowPower);
    if (pointerType === 'touch') document.body.classList.add('book-drag-active');
    leaf.underlyingSlot = d === 1 ? this.right : this.left;
    leaf.originalContent = document.createDocumentFragment();
    try {
      while (leaf.underlyingSlot.firstChild) leaf.originalContent.append(leaf.underlyingSlot.firstChild);
      leaf.underlyingSlot.innerHTML = leaf.underneath;
      this.paint(0);
      this.onBusyChange?.(true);
      return true;
    } catch (cause) {
      try { this.finish(false); }
      catch (cleanupCause) { throw new AggregateError([cause, cleanupCause], 'Unable to start or clean up the page turn'); }
      throw cause;
    }
  }

  down(e) {
    if (e.button !== 0 || e.isPrimary === false || this.blocked() || this.drag || this.animating || this.pending || e.target.closest('a,button,input')) return;
    const {left, centerX, width} = this.metrics;
    if (!width) return;
    const d = e.clientX >= centerX ? 1 : -1;
    if (this.valid(d)) this.onPrepareTurn?.(d, this.spread);
    this.pending = {id: e.pointerId, x: e.clientX, y: e.clientY, d, center: centerX, moved: false, pointerType: e.pointerType, lightweight: e.pointerType === 'touch' || this.lowPower, width};
    this.book.focus({preventScroll: true});
    this.book.setPointerCapture(e.pointerId);
  }

  // Pointer events only replace a sample; all visual work is coalesced into one frame.
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
      const dx = sample.x - pending.x, dy = sample.y - pending.y;
      if (Math.hypot(dx, dy) < 8) return;
      if (pending.pointerType === 'touch' && Math.abs(dy) > Math.abs(dx) * 1.25) {
        this.pending = null; this.release(pending.id); return;
      }
      pending.moved = true;
      this.pending = null;
      if (!this.begin(pending.d, pending.pointerType)) { this.release(pending.id); return; }
      Object.assign(this.drag, {radius: Math.max(12, Math.abs(pending.x - pending.center)), startX: pending.x, startY: pending.y, id: pending.id, pointerType: pending.pointerType, lightweight: pending.lightweight});
    }
    if (!this.drag || this.animating) return;
    this.drag.y = this.drag.lightweight ? 0 : clamp((sample.y - this.drag.startY) / this.drag.height, -.24, .24);
    this.paint(progressFor(this.drag.startX, sample.x, this.drag.radius, this.drag.d));
  }

  paint(p) {
    if (!this.drag) return;
    this.drag.p = p;
    const {d, width, y, count, strips, stripWidth, lightweight} = this.drag;
    const angle = Math.acos(1 - 2 * p), curl = Math.sin(Math.PI * p), w = stripWidth;
    let x = 0, z = 0;
    for (let i = 0; i < count; i++) {
      const bend = curl * (lightweight ? .12 : .25) * Math.sin((i / (count - 1) - .5) * Math.PI);
      const a = angle + bend, cos = Math.cos(a), sin = Math.sin(a);
      const xx = d === 1 ? x : -x - w * cos, zz = d === 1 ? z : z + w * sin;
      strips[i].element.style.transform = `translate3d(${xx}px,${curl * y * (i * 12 / (count - 1))}px,${zz + 1}px) rotateY(${d === 1 ? -a : a}rad)`;
      x += w * cos; z += w * sin;
    }
    this.book.style.setProperty('--turn-shadow', lightweight ? 0 : curl * .2);
  }

  up(e) {
    if (this.animating || e.pointerId !== (this.pending?.id ?? this.drag?.id)) return;
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
    const duration = active.lightweight ? 280 : 390;
    const tick = now => {
      this.settleFrame = 0;
      if (this.drag !== active) return;
      const t = clamp((now - start) / duration);
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
    const previousSpread = this.spread;
    const failures = [];
    let completed = false;
    try {
      if (complete) {
        const nextSpread = previousSpread + active.d;
        if (active.d === 1) {
          const leftMarkup = this.render(nextSpread * 2);
          this.pageMarkup = [leftMarkup, active.underneath];
          this.left.innerHTML = leftMarkup;
        } else {
          const rightMarkup = this.render(nextSpread * 2 + 1);
          this.pageMarkup = [active.underneath, rightMarkup];
          this.right.innerHTML = rightMarkup;
        }
        this.spread = nextSpread;
        completed = true;
      } else {
        active.underlyingSlot.replaceChildren(active.originalContent);
      }
    } catch (cause) {
      this.spread = previousSpread;
      failures.push(cause);
      try { active.underlyingSlot.replaceChildren(active.originalContent); }
      catch (cleanupCause) { failures.push(cleanupCause); }
    } finally {
      this.drag = null; this.animating = false;
      this.book.classList.remove('turning', 'turning-touch');
      document.body.classList.remove('book-drag-active');
      this.book.style.setProperty('--turn-shadow', 0);
      try {
        if (completed) this.onChange?.(this.spread);
      } catch (cause) {
        failures.push(cause);
      } finally {
        try { this.onBusyChange?.(false); }
        catch (cause) { failures.push(cause); }
        finally {
          try { this.release(active.id); }
          catch (cause) { failures.push(cause); }
        }
      }
    }
    if (failures.length === 1) throw failures[0];
    if (failures.length > 1) throw new AggregateError(failures, 'Unable to finish or clean up the page turn');
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

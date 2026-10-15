import test from 'node:test';
import assert from 'node:assert/strict';
import {FlipEngine} from '../flip-engine.js';
import {pages} from '../page-content.js';

const engine = Object.create(FlipEngine.prototype);
const makeFace = () => {
  const attrs = new Set();
  const inner = {style:{},innerHTML:'previous turn content',replaceChildren(){this.innerHTML='';this.cleared=true}};
  return {
    classList:{add:x=>attrs.add(x),remove:x=>attrs.delete(x),contains:x=>attrs.has(x)},
    style:{},firstElementChild:inner
  };
};
const makeStrip = () => ({element:{style:{}},front:makeFace(),back:makeFace()});

test('Armory page images survive the turn-image preparation unchanged', () => {
  for (const i of [0,15,16,29]) {
    const markup = pages[i];
    assert.match(markup,/class="page image-page"/);
    assert.equal(engine.removeTurnImages(markup),markup);
    assert.equal(engine.imagePageSource(markup),`page-designs/page-${String(i+1).padStart(2,'0')}.webp`);
  }
});

test('the visual front and back strip faces use real WebP pages rather than blank paper', () => {
  const strips = Array.from({length:8},makeStrip);
  const mock = Object.assign(Object.create(FlipEngine.prototype),{
    metrics:{width:1200,height:850},strips,spread:7,
    pageMarkup:[pages[14],pages[15]],render:i=>pages[i]
  });
  const turn = mock.prepare(1);
  assert.equal(turn.strips.length,8);
  assert.equal(turn.underneath,pages[17]);
  for (const [i,strip] of strips.entries()) {
    assert.equal(strip.front.classList.contains('leaf-image-face'),true);
    assert.equal(strip.back.classList.contains('leaf-image-face'),true);
    assert.match(strip.front.style.backgroundImage,/page-16\.webp/);
    assert.match(strip.back.style.backgroundImage,/page-17\.webp/);
    assert.equal(strip.front.style.backgroundSize,'600px 850px');
    assert.equal(strip.back.style.backgroundSize,'600px 850px');
    assert.equal(strip.front.style.backgroundRepeat,'no-repeat');
    assert.equal(strip.front.firstElementChild.cleared,true);
    assert.equal(strip.back.firstElementChild.cleared,true);
    assert.equal(strip.front.style.backgroundPosition,`${-i*75}px 0px`);
    assert.equal(strip.back.style.backgroundPosition,`${-(7-i)*75}px 0px`);
  }
});

test('reverse turns paint both archive images rather than an empty light-colored back', () => {
  const strips=Array.from({length:8},makeStrip);
  const mock=Object.assign(Object.create(FlipEngine.prototype),{
    metrics:{width:1200,height:850},strips,spread:8,
    pageMarkup:[pages[16],pages[17]],render:i=>pages[i]
  });
  const turn=mock.prepare(-1);
  assert.equal(turn.underneath,pages[14]);
  for (const strip of strips) {
    assert.match(strip.front.style.backgroundImage,/page-17\.webp/);
    assert.match(strip.back.style.backgroundImage,/page-16\.webp/);
  }
});

test('switching from image to a text leaf removes stale image CSS', () => {
  const mock = Object.create(FlipEngine.prototype);
  const face=makeFace();
  mock.configureFace(face,pages[1],0,500,720);
  assert.ok(face.style.backgroundImage.includes('page-02.webp'));
  const paper='<article class="rank-page">Officer details</article>';
  mock.configureFace(face,paper,0,500,720);
  assert.equal(face.classList.contains('leaf-image-face'),false);
  assert.equal(face.style.backgroundImage,'');
  assert.equal(face.style.backgroundColor,'');
  assert.equal(face.firstElementChild.innerHTML,paper);
});

test('archive records and drag-completion threshold are unaffected', () => {
  assert.equal(pages.length,40);
  assert.equal(engine.imagePageSource(pages[30]),null);
  assert.equal(engine.removeTurnImages(pages[30]),pages[30]);
});

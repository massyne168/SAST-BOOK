import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {progressFor,shouldComplete} from '../flip-engine.js';

const read = name => readFileSync(new URL('../' + name, import.meta.url),'utf8');
const reader = read('supplemental-readers.js');
const engine = read('flip-engine.js');
const palette = read('tactical-palette.css');

test('Classified, Resignation and Bulletins all instantiate the original strip-based flip engine', () => {
  assert.match(reader,/import \{FlipEngine\} from '\.\/flip-engine\.js'/);
  assert.match(reader,/state\.engine = new FlipEngine\(book,/);
  assert.match(reader,/render:index=>buildPage\(pages\[index\],index,kind\)/);
  assert.match(reader,/spreadCount:5/);
  assert.match(reader,/slots:\{layer:'\.supplemental-turn-layer',left:'\.supplemental-slot-left',right:'\.supplemental-slot-right'\}/);
  assert.match(engine,/this\.stripCount = this\.lowPower \? 6 : 8/);
  assert.match(engine,/Math\.acos\(1 - 2 \* p\)/);
});

test('release before or at the midpoint restores the page; after midpoint finishes', () => {
  assert.equal(progressFor(200,100,100,1),.5);
  assert.equal(shouldComplete(progressFor(200,100,100,1)),false);
  assert.equal(shouldComplete(progressFor(200,80,100,1)),true);
  assert.equal(shouldComplete(progressFor(200,160,100,1)),false);
  assert.match(reader,/state\.engine\.turn\(-1\)/);
  assert.match(reader,/state\.engine\.turn\(1\)/);
});

test('controls and real forms stay clickable while book gestures ignore interactive inputs', () => {
  assert.match(engine,/e\.target\.closest\('a,button,input,textarea,select,label,form,\[contenteditable\]'\)/);
  assert.match(engine,/e\.target\.closest\('input,textarea,select,button,\[contenteditable\]'\)/);
  assert.match(reader,/root\.querySelector\('\[data-page-next\]'\)\.disabled = busy/);
  assert.match(reader,/root\.querySelector\('\.supplemental-flip-book'\)\.setAttribute\('aria-busy'/);
});

test('live resignation form survives being detached by the shared mesh and restores with its listeners', () => {
  const body = {append(node) {node.parentNode=this;}};
  const originalForm = {parentNode:{nodeType:11}};
  const slot = {append(node) {node.parentNode=this;}};
  const fakeDoc = {body,addEventListener() {}};
  const exports = runInNewContext(reader.replace(/^import .*;\s*$/gm,'').replace(/^export /gm,'') + '\n({parkNotice,mountNotice})',{document:fakeDoc});
  const state = {kind:'resignation',index:4,notice:originalForm,root:{querySelector:()=>slot}};
  exports.parkNotice(state);
  assert.equal(originalForm.parentNode,body);
  exports.mountNotice(state);
  assert.equal(originalForm.parentNode,slot);
  state.index=3;
  exports.parkNotice(state);
  exports.mountNotice(state);
  assert.equal(originalForm.parentNode,body,'form parks safely while reading other spreads');
  assert.match(reader,/if \(kind === 'resignation' && latestNotice\) updateNoticePreview/);
});

test('new book panels have physical cover boards, paper stacks, spines and curl strips', () => {
  for (const cls of ['supplemental-turn-layer','supplemental-slot-left','supplemental-slot-right','paper-stack','spine']) assert.ok(reader.includes(cls));
  for (const cls of ['.supplemental-flip-book>.board','.supplemental-flip-book>.paper-stack','.supplemental-flip-book>.supplemental-turn-layer','.supplemental-flip-book.turning>.supplemental-turn-layer']) assert.ok(palette.includes(cls));
  assert.match(palette,/\.supplemental-flip-book \.leaf-content \[data-form-slot\] \{display:none\}/);
});

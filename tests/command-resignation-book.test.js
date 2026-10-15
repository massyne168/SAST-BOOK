import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const read = filename => readFileSync(new URL('../' + filename, import.meta.url), 'utf8');
const readers = read('supplemental-readers.js');
const ranks = read('rank-directory.js');
const command = read('command-center.js');
const form = read('resignation-form.js');
const css = read('styles.css');
const engine = read('flip-engine.js');
const palette = read('tactical-palette.css');

const {drafts, buildPage} = runInNewContext(
  readers.replace(/^import .*;\s*$/gm, '').replace(/^export /gm, '') + '\n({drafts, buildPage})',
  {document:{addEventListener(){}}, matchMedia:()=>({matches:true}), requestAnimationFrame:fn=>fn(), window:{}}
);

test('new books retain exactly ten pages each', () => {
  for (const name of ['classified','resignation','bulletins']) {
    assert.equal(drafts[name].length,10);
    const pages = drafts[name].map((data,index)=>buildPage(data,index,name));
    assert.equal(pages.filter(page=>page.includes('data-form-slot')).length, name === 'resignation' ? 1 : 0);
    assert.equal(pages.filter(page=>page.includes('data-resignation-preview')).length, name === 'resignation' ? 1 : 0);
  }
});
test('resignation form and generated notice occupy facing pages in same book', () => {
  assert.match(buildPage(drafts.resignation[8],8,'resignation'),/data-form-slot/);
  assert.match(buildPage(drafts.resignation[9],9,'resignation'),/data-resignation-preview/);
  assert.match(readers,/state\.notice/);
  assert.match(readers,/slot\.append\(notice\)/);
  assert.match(readers,/parkNotice\(state\)/);
  assert.doesNotMatch(ranks,/directory\.append\(document\.querySelector\('#resignation-notice'\)\)/);
  assert.doesNotMatch(ranks,/initializeResignationForm\(/);
});
test('the form fills a live preview but still requires validated submission', () => {
  assert.match(form,/resignation-notice-updated/);
  assert.match(form,/notify\('reviewed', data\)/);
  assert.match(form,/notify\('delivered', data, payload\.reference\)/);
  assert.match(form,/fetch\('\/api\/resignation'/);
  assert.match(readers,/\.textContent = String\(data\[key\] \|\| '—'\)/);
});
test('all three new books share the original realistic FlipEngine physics', () => {
  assert.match(readers,/import \{FlipEngine\} from '\.\/flip-engine\.js'/);
  assert.match(readers,/new FlipEngine\(book/);
  assert.match(readers,/spreadCount:5/);
  assert.match(readers,/slots:\{layer:'\.supplemental-turn-layer'/);
  assert.match(readers,/state\.engine\.turn\(-1\)/);
  assert.match(readers,/state\.engine\.turn\(1\)/);
  assert.match(engine,/setPointerCapture/);
  assert.match(engine,/shouldComplete\(this\.drag\.p\)/);
  assert.match(engine,/Math\.acos\(1 - 2 \* p\)/);
  assert.match(engine,/this\.stripCount = this\.lowPower \? 6 : 8/);
  assert.match(palette,/\.supplemental-flip-book\.turning>\.supplemental-turn-layer/);
});
test('Command Center is anchored to header utilities and cannot cover the book chooser', () => {
  assert.match(command,/\.masthead \.header-utilities'\)\.prepend\(entry\)/);
  assert.doesNotMatch(command,/\.record-heading'\)\.after\(entry\)/);
  assert.match(css,/\.masthead \.header-utilities \.command-center-entry/);
});

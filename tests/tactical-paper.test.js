import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source = readFileSync(new URL('../tactical-palette.css', import.meta.url), 'utf8');
const section = source.slice(source.indexOf('/* SAST internal paper / restrained tactical-edge treatment'));
const original = readFileSync(new URL('../supplemental-readers.js', import.meta.url), 'utf8');
const mesh = readFileSync(new URL('../flip-engine.js', import.meta.url), 'utf8');

test('all supplemental book pages receive unobtrusive tactical edge treatment', () => {
  assert.match(section,/\.supplemental-page::before\s*\{/);
  assert.match(section,/pointer-events:none/);
  assert.match(section,/var\(--sast-bright-blue\)/);
  assert.match(section,/linear-gradient\(#57c9f1,#57c9f1\) left top/);
});

test('page content stays above noninteractive corner decorations', () => {
  assert.match(section,/\.supplemental-page > \.supplemental-page-body/);
  assert.match(section,/z-index:1/);
  assert.match(section,/overflow-wrap:anywhere/);
});

test('form spread and live resignation sheet remain accessible', () => {
  assert.match(section,/\.supplemental-page:has\(\.supplemental-form-slot\)::before/);
  assert.match(section,/\.supplemental-flip-book \.supplemental-slot>\.supplemental-page\s*\{[^}]*overflow-y:auto/);
  assert.match(section,/\.supplemental-flip-book>\.supplemental-turn-layer \.leaf-content>\.supplemental-page\s*\{[^}]*overflow:hidden/);
  assert.match(original,/data-form-slot/);
  assert.match(original,/data-resignation-preview/);
});

test('cursor-driven page turns and physical book page placement are unchanged', () => {
  assert.match(section,/\.supplemental-page\.is-turning\s*\{/);
  assert.match(section,/\.supplemental-page\.is-turning:nth-child\(odd\)/);
  assert.match(original,/new FlipEngine\(book/);
  assert.match(mesh,/setPointerCapture/);
  assert.match(mesh,/shouldComplete\(this\.drag\.p\)/);
});

test('Rank Directory and Armory art are retained while decorative edges are styled', () => {
  assert.match(section,/#rank-directory \.rank-page::before/);
  assert.match(section,/#rank-directory \.rank-book \.board/);
  assert.match(section,/\.reading-room #book \.board/);
});

test('CSS block syntax is balanced', () => {
  const cleaned = section.replace(/\/\*[\s\S]*?\*\//g,'').replace(/"[^"]*"|'[^']*'/g,'""');
  let depth=0;
  for (const ch of cleaned) {
    if (ch==='{') depth++;
    else if (ch==='}') {depth--;assert.ok(depth>=0)}
  }
  assert.equal(depth,0);
});

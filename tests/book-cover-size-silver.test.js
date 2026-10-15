import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const css=readFileSync(new URL('../book-cover-size-silver.css',import.meta.url),'utf8');
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const glass=readFileSync(new URL('../liquid-glass.css',import.meta.url),'utf8');

test('silver cover stylesheet follows glass and base tactical theme',()=>{
  assert.ok(html.indexOf('tactical-palette.css')<html.indexOf('liquid-glass.css'));
  assert.ok(html.indexOf('liquid-glass.css')<html.indexOf('book-cover-size-silver.css'));
});

test('all five books display original artwork without external blue or red borders',()=>{
  assert.match(css,/main\.archive-closed \.archive-cover\.webp-cover \{/);
  assert.match(css,/background-image:url\("assets\/cover\.webp"\)!important/);
  assert.match(css,/background-image:url\("assets\/rank-directory-cover\.webp"\)!important/);
  assert.match(css,/main\.archive-closed \.shared-cover-art \{/);
  assert.match(css,/border:0!important/);
  assert.match(css,/box-shadow:none!important/);
  assert.match(css,/display:none!important/);
  assert.match(css,/shared-cover-spine/);
  assert.match(css,/shared-cover-pages/);
  assert.match(css,/rank-cover-binding/);
  for(const id of ['archive-cover','rank-cover','classified-cover','resignation-cover','bulletins-cover']) {
    assert.ok(html.includes('id="'+id+'"'));
  }
});

test('all five visible cover surfaces share the silver light orbit',()=>{
  for (const selector of [
    '.archive-cover.webp-cover::before',
    '.rank-cover-stage-teaser .rank-cover::before',
    '.shared-cover-shell::after'
  ]) assert.ok(css.includes(selector));
  assert.match(css,/@property --book-light-angle/);
  assert.match(css,/animation:sast-book-silver-orbit 18s linear infinite!important/);
  assert.match(css,/rgba\(247,250,252,\.95\)/);
  assert.match(css,/pointer-events:none!important/);
  assert.match(css,/mask-composite:exclude!important/);
});

test('covers use aspect ratio and natural wrapper sizing, not an extra cover board',()=>{
  assert.match(css,/aspect-ratio:1191\/1685!important/);
  assert.match(css,/width:min\(100%,330px\)!important/);
  assert.match(css,/object-fit:contain!important/);
  assert.match(css,/filter:drop-shadow/);
  assert.doesNotMatch(css,/position:\s*fixed/);
});

test('mobile and reduced-motion behaviors remain supported',()=>{
  assert.match(css,/@media\(max-width:700px\)/);
  assert.match(css,/width:min\(300px,74vw\)!important/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
  assert.match(css,/animation:none!important/);
  assert.match(glass,/@media \(prefers-reduced-motion:reduce\)/);
});

test('new styles are syntactically balanced and do not require remote assets',()=>{
  const clean=css.replace(/\/\*[\s\S]*?\*\//g,'').replace(/"[^"]*"|'[^']*'/g,'""');
  let count=0;
  for (const ch of clean) {
    if (ch==='{')count++;
    if (ch==='}'){count--;assert.ok(count>=0)}
  }
  assert.equal(count,0);
  assert.doesNotMatch(css,/@import|url\(\s*["']?https?:/);
});

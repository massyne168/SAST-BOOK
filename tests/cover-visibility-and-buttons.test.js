import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const css = readFileSync(new URL('../tactical-palette.css', import.meta.url), 'utf8');
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const markupIds = ['open-archive','open-rank-directory','open-classified-archive','open-resignation-notices','open-command-bulletin'];

test('all five original cover files remain referenced in markup and CSS',()=>{
  for (const id of markupIds) assert.ok(html.includes('id="' + id + '"'));
  for (const id of ['classified-cover','resignation-cover','bulletins-cover']) assert.ok(html.includes('id="' + id + '"'));
  assert.ok(styles.includes('assets/cover.webp'));
  assert.ok(css.includes('assets/rank-directory-cover.webp'));
  for (const file of ['classified-archive-cover.png','resignation-notices-cover.png','announcements-orders-cover.png']) assert.ok(html.includes(file));
});

test('dark overlays and grayscale are removed from the fresh artworks',()=>{
  assert.match(css,/\.archive-cover\.webp-cover::after\s*\{\s*content:none!important;\s*display:none!important/);
  assert.match(css,/\.rank-cover-stage-teaser \.rank-cover::after\s*\{\s*content:none!important;\s*display:none!important/);
  assert.match(css,/\.shared-cover-shell::after\s*\{\s*content:none!important;\s*display:none!important/);
  assert.match(css,/main\.archive-closed \.shared-cover-art\s*\{[^}]*filter:none!important/);
  assert.match(css,/background-image:url\("assets\/rank-directory-cover\.webp"\)/);
  assert.doesNotMatch(css,/filter:grayscale\(/);
  assert.doesNotMatch(css,/mix-blend-mode:color/);
});

test('opening buttons of all five books are independent from artwork frames',()=>{
  const anchor=css.slice(css.indexOf('/* Cover artwork and opening actions:'));
  assert.match(anchor,/\.book-opening-tab\s*\{\s*box-sizing:border-box;\s*position:relative!important/);
  assert.match(anchor,/inset:auto!important/);
  assert.match(anchor,/flex-direction:column!important/);
  assert.match(anchor,/gap:clamp\(/);
  assert.match(anchor,/min-height:50px!important/);
  for (const id of markupIds) assert.ok(anchor.includes('#'+id),id);
});

test('button labels wrap and arrows stay visible without blocking clicks',()=>{
  const a=css.slice(css.indexOf('/* Cover artwork and opening actions:'));
  assert.match(a,/\.opening-tab-label\s*\{[^}]*white-space:normal!important/);
  assert.match(a,/\.opening-tab-arrow\s*\{[^}]*flex:0 0 auto/);
  assert.match(a,/\.book-opening-tab::before,[\s\S]*pointer-events:none!important/);
  assert.match(a,/data-carousel-position="active"/);
});

test('mobile book open buttons stay below images without carousel clipping',()=>{
  assert.match(css,/@media\(max-width:700px\)\s*\{\s*main\.archive-closed \.book-pair \{min-height:585px!important;overflow:visible!important\}/);
  assert.match(css,/width:min\(300px,75vw\)!important/);
});

test('stylesheet braces balanced',()=>{
  const clear=css.replace(/\/\*[\s\S]*?\*\//g,'').replace(/"[^"]*"|'[^']*'/g,'""');
  let depth=0;
  for (const chr of clear) {if(chr==='{') ++depth; else if(chr==='}') {--depth; assert.ok(depth>=0)}}
  assert.equal(depth,0);
});

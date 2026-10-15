import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const css=readFileSync(new URL('../liquid-glass.css',import.meta.url),'utf8');
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');

test('Liquid Glass theme is loaded after original tactical palette',()=>{
  assert.ok(html.includes('href="liquid-glass.css"'));
  assert.ok(html.indexOf('tactical-palette.css')<html.indexOf('liquid-glass.css'));
});

test('all actual site buttons receive translucent frosted silver styling',()=>{
  assert.match(css,/^button \{/m);
  assert.match(css,/backdrop-filter:blur\(15px\) saturate\(150%\)/);
  assert.match(css,/rgba\(238,246,252,\.16\)/);
  assert.match(css,/box-shadow:[\s\S]*inset 0 1px 0 rgba\(248,252,255,\.32\)/);
  assert.match(css,/button:focus-visible \{/);
});

test('all five books use the same silver glass CTA without covering images',()=>{
  for (const id of ['open-archive','open-rank-directory','open-classified-archive','open-resignation-notices','open-command-bulletin']) {
    assert.ok(css.includes('#'+id));
    assert.ok(html.includes('id="'+id+'"'));
  }
  assert.match(css,/main\.archive-closed :is\(#open-archive[^{}]+\.book-opening-tab \{/);
  assert.doesNotMatch(css,/object-fit:|shared-cover-art|cover\.webp|rank-directory-cover\.webp/);
});

test('slow silver edge light keeps existing opening animation and is reduced-motion-safe',()=>{
  assert.match(css,/--opening-angle/);
  assert.match(css,/animation-duration:14s!important/);
  assert.match(css,/#eff5f9/);
  assert.match(css,/animation-iteration-count:infinite!important/);
  assert.match(css,/@media \(prefers-reduced-motion:reduce\)/);
  assert.match(css,/animation:none!important/);
});

test('no layout, clickability, form, or hidden state changes are introduced',()=>{
  assert.doesNotMatch(css,/\bpointer-events:\s*none\b(?![^{}]*::before)/); // no element-level pointer suppression
  assert.doesNotMatch(css,/\bdisplay:\s*(none|flex|grid|block)\b/);
  assert.doesNotMatch(css,/\bposition:\s*(absolute|fixed|sticky)\b/);
  assert.doesNotMatch(css,/\btransform:\s*translate/);
  assert.match(css,/button:disabled/);
  assert.match(css,/button\[aria-disabled="true"\]/);
});

test('balanced CSS braces and no external asset loads',()=>{
  const clean=css.replace(/\/\*[\s\S]*?\*\//g,'').replace(/"[^"]*"|'[^']*'/g,'""');
  let depth=0;
  for(const ch of clean) {if(ch==='{') depth++;if(ch==='}') {depth--;assert.ok(depth>=0)}}
  assert.equal(depth,0);
  assert.doesNotMatch(css,/@import|url\(\s*["']?https?:/);
});

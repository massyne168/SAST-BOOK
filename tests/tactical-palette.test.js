import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const palette = read('tactical-palette.css');
const html = read('index.html');
const config = read('book-config.js');

test('new palette loads after all legacy style files', () => {
  const linked = [...html.matchAll(/<link rel="stylesheet" href="([^"]+\.css)">/g)].map(match => match[1]);
  assert.equal(linked.at(-1), 'tactical-palette.css');
  assert.ok(linked.includes('styles.css'));
  assert.ok(linked.includes('archive.css'));
});

test('homepage uses black and paper white rather than an open-book accent', () => {
  assert.match(palette, /--sast-black:\s*#080b0e/);
  assert.match(palette, /--sast-white:\s*#f2f3ef/);
  assert.match(palette, /html\[data-theme="overview"\]/);
  assert.match(palette, /html\[data-theme="overview"\]\s+body:not\(\.is-loading\)/);
});

test('five registered books all use the unified navy/blue/silver accent set', () => {
  for (const theme of ['armory','directory','classified','resignation','bulletins']) {
    assert.match(config, new RegExp("theme: '" + theme + "'"));
    assert.ok(palette.includes('[data-theme="' + theme + '"]'));
  }
  assert.match(palette, /--theme-accent:\s*var\(--sast-blue\)/);
  assert.match(palette, /--theme-muted:\s*var\(--sast-silver\)/);
});

test('all cover types receive a unified palette without replacing image sources', () => {
  for (const selector of ['archive-cover.webp-cover','rank-cover-stage-teaser .rank-cover','.shared-cover-art','.shared-cover-shell::after']) {
    assert.ok(palette.includes(selector));
  }
  assert.match(palette, /assets\/cover\.webp/);
  assert.match(palette, /assets\/rank-directory-cover\.webp/);
  for (const src of ['classified-cover','resignation-cover','bulletins-cover']) assert.ok(html.includes('id="' + src + '"'));
});

test('each reader surface, resignation form, and command panel has a dark blue/silver treatment', () => {
  for (const selector of ['#rank-directory .rank-page','.supplemental-page:nth-child','.supplemental-reader-controls','.resignation-live-sheet','.command-center']) {
    assert.ok(palette.includes(selector));
  }
  assert.match(palette, /--active-accent:\s*var\(--sast-blue\)/);
});

test('stylesheet has balanced block delimiters and no remote asset references', () => {
  const clean = palette.replace(/\/\*[\s\S]*?\*\//g, '').replace(/"[^"]*"|'[^']*'/g, '""');
  let depth = 0;
  for (const ch of clean) {
    if (ch === '{') depth++;
    if (ch === '}') {
      depth--;
      assert.ok(depth >= 0, 'unexpected closing brace');
    }
  }
  assert.equal(depth, 0);
  assert.doesNotMatch(palette, /@import\b|url\(\s*["']?https?:/i);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {bookConfig} from '../book-config.js';

const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const markup = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('all five configured books keep their own interior target', () => {
  assert.deepEqual(bookConfig.map(book => book.id), ['archive', 'directory', 'classified', 'resignation', 'bulletins']);
  for (const book of bookConfig) {
    assert.match(markup, new RegExp('id="' + book.cover.slice(1) + '"'));
    assert.match(markup, new RegExp('id="' + book.opener.slice(1) + '"'));
  }
  for (const id of ['book', 'rank-directory', 'classified-archive', 'resignation-notice', 'bulletins-archive']) {
    assert.match(markup, new RegExp('id="' + id + '"'));
  }
});

test('open books hide the cover chooser while preserving the archive and directory readers', () => {
  assert.match(css, /main:not\(\.archive-closed\) > \.carousel-controls\s*\{\s*display: none !important/);
  assert.match(css, /main:is\(\.classified-open,\.resignation-open,\.bulletins-open\) > \.book-pair\s*\{\s*display: none !important/);
  assert.match(css, /main\.directory-open \.book-pair > \.shared-cover-stage\s*\{\s*display: none !important/);
  assert.match(css, /main:not\(\.archive-closed\) \.book-pair > \.shared-cover-stage\s*\{\s*display: none !important/);
});

test('supplemental titles, artwork, palettes and navigation have safe styles', () => {
  for (const declaration of ['--active-bg: var(--theme-bg)', '--active-frame: var(--theme-border-strong)', '--active-text: var(--theme-text)']) {
    assert.ok(css.includes(declaration), declaration);
  }
  assert.match(css, /\.supplemental-page h2\s*\{\s*font-size: clamp\(/);
  assert.match(css, /overflow-wrap: anywhere/);
  assert.match(css, /main\.archive-closed \.shared-cover-art\s*\{[^}]*max-width: 100%;[^}]*max-height: 100%/);
  assert.match(css, /\.supplemental-reader-controls\s*\{[^}]*pointer-events: auto/);
});

# Armory Book

Blue tactical archive with 30 replaceable WebP pages and a physical drag-to-flip engine. No audio, external JavaScript libraries, or runtime dependencies are used.

## Run locally

Use Node.js 20 or newer and run `npm start` (or `node server.js`). Open **http://127.0.0.1:8080**. Any static HTTP server also works. Serve the site over HTTP/HTTPS rather than opening `index.html` as a file, because the scripts use ES modules. Deploy the root HTML, CSS, JavaScript, `assets/`, and `page-designs/` to your static host. Existing Google Fonts stylesheets are optional; local font fallbacks remain available.

## Controls

- **OPEN THE ARCHIVE** prepares the current pages, opens the cover, and briefly shows AUTHORIZED ACCESS. **COVER** returns to the artwork without losing your place.
- Drag the right page toward the left to go forward; drag the left page toward the right to go backward. Release before or exactly at the midpoint to return, or beyond it to finish. The arrow buttons and Left/Right arrow keys while the book is focused also navigate.
- The blue bar and **SPREAD 04 / 15** indicator update when navigation finishes. The browser stores the zero-based spread under `armory-book.spread`. Reopening the archive restores it. Numbers are truncated and clamped to 0–14; missing or non-finite values become 0. Reading still works when storage is denied.
- **FULLSCREEN**, beside COVER, toggles browser fullscreen. Its label reflects changes, including browser-controlled exits. Unsupported browsers hide the button; rejected requests show a short status message. All controls work with Tab and Enter/Space.
- Single-click or tap a page to select it. **DOWNLOAD PAGE** downloads that one original WebP with its original filename, such as `page-03.webp`. With no selected page, it downloads the current right-hand page. Selection resets after navigation.
- Double-click or double-tap a page to zoom. **ZOOM PAGE** provides a keyboard-accessible alternative for the selected page, or the right-hand page by default. The dialog displays the original 1191×1685 image. Use **+**, **−**, **RESET**, the mouse wheel, or a two-finger pinch to zoom from 100% to 500%. Drag to pan while enlarged. **CLOSE** or Escape returns focus to the reader; Tab stays inside the dialog.
- **Read this spread** keeps the existing two-page reading dialog.
- Right-edge section tabs prepare their images before navigating: **ARMORY → 0**, **RULES → 2**, **RECORDS → 5**, **SANCTIONS → 7** (zero-based spreads). Tabs are hidden at widths of 420px or less to keep pages clear.

Controls cannot interrupt a page turn or section preparation. The cover scan appears only with a hovering mouse. The pointer light ignores input and disappears when the pointer leaves. Reduced-motion settings disable the scan, animated stamp, pointer light, and animated cover/page transitions. Pointer updates stop once movement settles.

## Replace artwork

Keep the filenames `page-designs/page-01.webp` through `page-30.webp`, with dimensions **1191×1685**. Pages 16–30 retain their original blank designs. Replace `assets/cover.webp` for cover artwork and `assets/logo.webp` for the logo. Page content and image preparation live in `page-content.js`; `flip-engine.js` handles physical turning without knowing the artwork or filenames.

## Validation

Run `npm run check` for JavaScript syntax checks and `npm test` for saved-position, storage-failure, boundary, and midpoint tests. This checkout originally contained no tests.

`npm run test:browser` runs the optional Playwright integration suite against installed Microsoft Edge. For development only, provide Playwright through your environment (or install it with `npm install --no-save playwright`). `PLAYWRIGHT_PATH` can point to its `index.mjs`; `BROWSER_CHANNEL=chrome` selects installed Chrome instead. The runner starts and stops its own local server and creates screenshots in `test-results/`.

Browser coverage includes cover/stamp, all tabs, both drag directions and cancellation, arrows, downloads and selection, zoom/wheel/focus/Escape, reading view, fullscreen/fallback, restoration/clamping, touch double-tap/pinch, narrow layout, reduced motion, and all 30 image dimensions. Browser tests use emulated touch; real-device testing is recommended for device-specific browser fullscreen behavior.

## Project ZIP

`dist/Armory-Book.zip` is the complete deliverable, including artwork, source, documentation, and tests. Git metadata, generated screenshots, and the ZIP itself are excluded from the archive.

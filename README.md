# Armory Book

Blue tactical archive with 30 source WebP pages plus 10 reserved continuation records (pages 31–40), all in a physical drag-to-flip engine. No audio, external JavaScript libraries, or runtime dependencies are used.

## Run locally

Use Node.js 20 or newer and run `npm start` (or `node server.js`). Open **http://127.0.0.1:8080**. The local server serves this project root. The documented static-host payload is the root HTML, CSS, JavaScript, `assets/`, and `page-designs/`; `dist/` is the matching runtime copy included with the deliverable. Keep its runtime files synchronized when changing the site. No separate build/deploy command is configured. Serve the site over HTTP/HTTPS rather than opening `index.html` as a file, because the scripts use ES modules. Existing Google Fonts stylesheets are optional; local font fallbacks remain available.

## Controls

- In the closed-book overview, use **PREVIOUS BOOK** or **NEXT BOOK** to select and center a cover. After the selected cover settles, its opening button appears after one second (immediately with reduced motion); only that button is enabled. Activate it once to focus the book, then again to open it. **COVER** returns to the overview without losing your place. The Rank Directory keeps its printed cover artwork and lists the selected rank's personnel by Full Name and Badge Number.
- The interface follows the active view: the closed-book overview uses navy, the open Armory uses blue/cyan, and the open Rank Directory uses crimson/burgundy. Returning to the overview restores navy. Both books and all archive panels are public and password-free.
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

Run `npm run check` for JavaScript syntax checks and `npm test` for saved-position, storage-failure, boundary, and midpoint tests.

`npm run test:browser` runs the optional Playwright integration suite against installed Microsoft Edge. For development only, provide Playwright through your environment (or install it with `npm install --no-save playwright`). `PLAYWRIGHT_PATH` can point to its `index.mjs`; `BROWSER_CHANNEL=chrome` selects installed Chrome instead. The runner starts and stops its own local server and creates screenshots in `test-results/`.

Browser coverage includes public startup, password-free Directory access, two-step cover focus/open, both book flows, rank switching, both drag directions and cancellation, arrows, downloads and selection, zoom/wheel/focus/Escape, reading view, fullscreen/fallback, restoration/clamping, touch double-tap/pinch, narrow layout, reduced motion, and all 30 image dimensions. Browser tests use emulated touch; real-device testing is recommended for device-specific browser fullscreen behavior.

## Project ZIP

`dist/Armory-Book.zip` is the complete deliverable, including artwork, source, documentation, and tests. Git metadata, generated screenshots, and the ZIP itself are excluded from the archive.


## Department archive extension

The original covers, image pages, rank order, names, badges, and FlipEngine are retained. Stable `id` fields were added to the roster; preserve these IDs when names, badges or ranks change. Never reuse an ID or identify a person by badge alone.

- `archive-ui.js` and `archive.css`: compact central navigation, accessible modal search, inventory and details, calculated charts, activity filters, and hash-based Back/Forward navigation. Search uses the original animated rank navigation and highlights the exact row for two seconds.
- `archive-data.js`: shared search/filter/statistics functions. The senior leadership reporting definition is Commissioner, Chief, Assistant Chief, Captain and Lieutenant, disclosed in the dashboard.
- `armory-data.js`: 25 existing issue forms transcribed from `page-designs/page-02.webp` through `page-26.webp`, with a source link on every detail panel. `ACTIVE / RETURN PENDING` maps to `ISSUED`. No blank form is counted. Dates retain date-only precision. No return dates, categories or administrative notes are supplied by these forms, so they remain null. The unknown badge on form 014 is null, displayed as ?Not recorded.? Historical names and badge formatting intentionally differ from the current roster; no automatic identity reconciliation is performed. `assignedOfficerId` remains null pending verified reconciliation. The original forms are unchanged and authoritative.
- `archive-management.js`: pure validation and activity construction helpers for future server integration, with no exposed editing controls or mutation endpoints. `activities` is empty because no genuine audit history exists. Browsing, transcribing forms and viewing an officer do not create activity entries.

The Rank Directory now exposes a server-backed personnel endpoint. Set `ADMIN_TOKEN` before starting the server to enable the protected administrator rank editor; without it, all visitors remain browse-only. Rank changes are written atomically to `data/personnel.json`, retain the stable personnel ID, name, and badge, and are returned to every connected visitor on their next directory load. Do not use this filesystem store on ephemeral/serverless hosting: connect the same API to durable shared database storage before treating edits as persistent across deployments or server instances. Existing localStorage saves only the reader's page position.

## Resignation notices

The Rank Directory includes a separate **Trooper Resignation Notice** form. It does not remove personnel or change a directory status. On Vercel, `api/resignation.js` is the serverless endpoint. Add `DISCORD_RESIGNATION_WEBHOOK_URL` as an encrypted Vercel environment variable for the appropriate Production/Preview environment, then redeploy; do not put that webhook URL in a browser file, `.env` committed to Git, or this repository. Until it is configured, the endpoint deliberately returns a clear configuration error and no notice can be delivered. The endpoint validates requests, disables Discord mentions, limits requests per IP, and rejects recently identical notices. No Discord test notice was sent by this project.

Before enabling administrative writes, connect durable storage and verified server-side permissions. In one database transaction, lock/re-read the serialized weapon, check the allowed transition and active assignment uniqueness, validate officer identity by stable ID, update the record, and append an immutable audit event. Enforce a database uniqueness constraint for an active assignment per normalized serial; client validation alone cannot prevent races. The event ID, actor identity and timestamp must come from the trusted server, not public request fields. Preserve previous assignments and source forms, and do not backfill invented audit events. On Vercel use a persistent database, never the temporary server filesystem. The helpers intentionally perform no writes and provide no authorization boundary.

Validation: `npm run check`, `npm test`, `npm run test:browser`, and `npm run test:archive-browser`. Browser scripts use optional externally installed Playwright and Microsoft Edge (see `PLAYWRIGHT_PATH` above), with no new production dependencies. The archive suite covers real searches, duplicate badges, exact animated page navigation, highlight cleanup, weapon filters/details, derived statistics, history, keyboard/mouse/touch navigation, reduced motion and responsive widths. Test-only assignment and activity fixtures never enter production data. There is no build step or lint configuration for this buildless site.

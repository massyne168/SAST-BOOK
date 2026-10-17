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


## Announcements & Orders: High Command publishing

The **Announcements & Orders** book now includes an authenticated publishing form on its final two-page spread. The facing page is a live **draft preview**; typing does **not** publish. An authorized High Command officer enters a title, notice type (Announcement/Order), issuing officer, priority, full message, optional expiry date, optional pin, and the private High Command access key, confirms approval, clicks **REVIEW DRAFT**, and finally **PUBLISH TO BOOK**.

A successful server response generates an immutable `AO-YYYY-...` reference and saves the publication. Each published announcement occupies its own page, the register is updated, and the book adds additional spreads automatically when needed. Search/detail views share the same server data. The editor access key is never stored in localStorage, never rendered on the preview, and never returned in GET responses. Server authorization is mandatory; hiding a form is not used as an access control.

**Set these private server environment variables for Vercel:**

- `HIGH_COMMAND_TOKEN`: a strong private token known only to High Command (the existing `ADMIN_TOKEN` may be used as a fallback).
- `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`: a durable Upstash Redis/Marketplace database, or use `KV_REST_API_URL` and `KV_REST_API_TOKEN` for the same integration.

These variables must be configured in the Vercel project's server environment, **not** embedded in website JavaScript or a public repository. Redeploy after configuring them. Without server-side Redis, Vercel serves a read-only empty register and rejects publication with a clear configuration error. A GitHub commit or static file cannot act as a safe shared multi-user publishing database.

Local Node development uses `HIGH_COMMAND_TOKEN=...` and an automatically created `data/bulletins.json` file. The file is ignored by Git and persists across local restarts. Production Redis writes and reads are shared across clients and deployments. A successfully created notice is kept in history; no automatic deletion is performed. The GET endpoint `/api/bulletins` is readable without a password, whereas the POST endpoint requires a server-verified Bearer token.

Test with `npm test` (including `tests/bulletin-publishing.test.js`) and optionally `npm run test:browser` in a development environment equipped with Playwright. Neither the Armory nor Rank Directory data files are altered by this feature.


## Phase 01 — Secure Command Foundation

The header Command Center now uses server-verified access-key login and an eight-hour signed HttpOnly cookie. Existing five-book designs, original Armory and Rank Directory data, page-turn engine, resignation form and public reader access remain unchanged.

### Production / Vercel configuration

Set these **server-side secrets** in Vercel Environment Variables (never place them in the repository or browser):

- `COMMAND_SESSION_SECRET`: random, unique signing string of 32+ characters. Changing it revokes all sessions.
- `HIGH_COMMAND_TOKEN`: High Command department access key (12+ characters); enables authorized announcement publication.
- `ADMIN_TOKEN`: Administrator access key (12+ characters). Existing personnel editing endpoints retain their separate Bearer authentication.
- `ARMORY_TOKEN`: optional access key (12+ characters) for read-only Phase 01 dashboard sign-in as Armory Officer.
- `TROOPER_TOKEN`: optional access key (12+ characters) for read-only Phase 01 dashboard sign-in as Trooper.
- `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` (or `KV_REST_API_URL` and `KV_REST_API_TOKEN`): durable database shared by Vercel deployments for the bulletin archive.

Redeploy after adding secrets. These environment values cannot be configured automatically by a GitHub code commit. When unconfigured, login and publication fail safely, and the dashboard shows a storage warning instead of false bulletin totals.

### Roles and endpoints

| Role | View Command Dashboard | Publish bulletins | Future management permission |
|---|---|---|---|
| Administrator | Yes | Yes | Personnel + Armory + approvals |
| High Command | Yes | Yes | Approvals |
| Armory Officer | Yes | No | Armory |
| Trooper | Yes | No | None |

Management permissions are **reserved for future phases**, not new editing API endpoints. The current sign-in keys are shared by role, not individual officer accounts; user-specific accountability will require per-officer identities.

`GET/POST/DELETE /api/command-session` checks, creates, or clears the signed cookie. Login/logout requests must have `X-SAST-Request: command-ui`. `GET /api/command-overview` requires a valid signed session and returns verified personnel, weapon and bulletin statistics. Publishing within Announcements & Orders uses the signed High Command/Administrator session; the original Bearer-key method remains backward compatible. Credentials are not persisted in browser storage. Access checks occur on the server, not only in the UI.

The local Node server continues to use the append-only bulletin JSON store, and Vercel requires Upstash Redis. No existing bulletin is deleted or replaced; if persistence is missing, the server refuses publication.

## Permanent Resignation Notices — Book pages

After a validated resignation notice is submitted and the API confirms it was saved, the Resignation Notices book creates one permanent paper page per official notice with officer name, badge number, current rank, effective date, reason, optional notes, a server reference, and submission date. These notices are **publicly visible inside the shared book**. They are receipt records, not approvals and never alter the Rank Directory. The original validated form and live preview remain together on the final spread, which moves forward automatically as history grows.

The book fetches real stored records from `GET /api/resignation-records` every time it opens. A newly saved notice immediately appears on an official paper page. The book expands to accommodate all saved notices in pairs of pages without changing the physical flip engine or other books. It never presents unconfirmed drafts as saved records.

On Vercel, the **existing** `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` (or `KV_REST_API_URL`/`KV_REST_API_TOKEN`) are required. The resignations use their own list key, `sast:resignations:v1`, and do not overwrite announcements or staff data. Local Node saves notices in ignored `data/resignations.json`. When storage is unconfigured or unreachable, submission is blocked with an explicit error instead of showing a false permanent record. Discord forwarding remains supported through the existing `DISCORD_RESIGNATION_WEBHOOK_URL`; if no webhook is configured, successful archival is still possible and is explicitly marked book-only. If Discord confirms delivery but archive writing fails, the error warns that Discord may have received the record and includes a reference. Ensure the existing webhook is configured if Discord delivery is required.

The official pages can show sensitive text submitted in the reason/notes fields to visitors of the shared site. Do not submit private credentials or personal information not intended for display. Keep the server-side archive protected and never commit runtime storage files.


## Discord Role Access — per-book authorization (2026-10-16)

The five books are now gated through **Login with Discord**. The browser does not decide who is authorized: on every opening attempt, the server calls Discord's `/users/@me/guilds/{guild.id}/member` using the authenticated member's OAuth token, reads the current **role IDs** and compares them against a separate allowlist for the selected book. The OAuth grant requests `identify` and `guilds.members.read` only. OAuth state uses a short-lived sealed cookie; the server session uses an encrypted `HttpOnly; SameSite=Lax` cookie with a two-hour maximum lifetime. No Discord Client Secret or OAuth access token is sent to application JavaScript or stored in localStorage.

### Required Vercel environment variables

- `DISCORD_CLIENT_ID`: Application ID from Discord Developer Portal.
- `DISCORD_CLIENT_SECRET`: **secret** from the same application.
- `DISCORD_GUILD_ID`: optional override; defaults to ELYSIUM guild `1541899063501529178` from `discord-elysium-roles.js`.
- `DISCORD_REDIRECT_URI`: exact callback URL registered in Discord OAuth2 Redirects, e.g. `https://YOUR-PROJECT.vercel.app/api/discord` (no query parameters).
- `DISCORD_SESSION_SECRET`: independent random secret string, **32+ characters**.
- `DISCORD_BOOK_ROLES_JSON`: optional **complete override** of the book allowlist in `discord-elysium-roles.js`. If set, it replaces the committed defaults. Invalid or omitted book role lists fail closed.

### ELYSIUM owner-provided identifiers and default permissions

The real Server ID and all 13 rank role IDs supplied by the SAST project owner on 2026-10-16 are recorded as exact **strings** in `discord-elysium-roles.js`. Those identifiers are not secrets.

Default access mapping:

| Book | Allowed ELYSIUM Discord roles |
|---|---|
| Armory | High Command, Chief of Police, Assistant Chief of Police |
| Rank Directory | All 13 named leadership, sergeant and trooper roles |
| Classified Archive | High Command, Chief of Police, Assistant Chief of Police |
| Resignation Notices | All 13 named leadership, sergeant and trooper roles |
| Announcements & Orders | All 13 named leadership, sergeant and trooper roles |

The configured full-rank list includes High Command, Chief of Police, Assistant Chief of Police, Captain, Lieutenant, Master Sergeant, Staff Sergeant, Sergeant, Master Trooper, Senior Trooper, Trooper First Class, Trooper and Law Enforcement Trooper. Book access is allowed if the user has **at least one** role in the selected book's list. These are deliberately conservative initial defaults for the sensitive books; request a change if Captains, Lieutenants or dedicated Armory staff should have access.

An existing Vercel `DISCORD_BOOK_ROLES_JSON` setting overrides the new repository defaults. **Delete an outdated placeholder override or replace it with actual IDs**; otherwise that older environment value takes precedence and can leave users locked out. `DISCORD_GUILD_ID` similarly overrides the built-in ELYSIUM guild ID. No secrets are committed to the repository.

### Discord Developer Portal steps

1. Create/select a Discord OAuth2 application in Discord Developer Portal.
2. Add the exact `DISCORD_REDIRECT_URI` from above under **OAuth2 → Redirects**.
3. Set the private variables on Vercel for Production, Preview if needed, then redeploy.
4. Visit the site and click **LOGIN WITH DISCORD**. After authorizing `identify` + `guilds.members.read`, the home page will show the connected account. When opening any book, the server checks the appropriate allowlist.

Only guild membership is sufficient for a login session; **the individual book role is still required**, and the site rejects all undefined/invalid permissions. Removing or changing a role takes effect on the next server access check. `GET /api/discord?action=session` returns only permitted book booleans and display username; `GET /api/discord?action=access&book=archive` performs an authoritative book check. `GET /api/resignation-records`, `POST /api/resignation`, and `GET/POST /api/bulletins` additionally require the corresponding current Discord role.

**Security limitation:** Armory WebP images, Rank Directory source records, and some static book source files are still part of a public GitHub-backed static website. Hiding a book in the UI is **not** sufficient to keep those raw files confidential: someone can request their URLs directly or view the public repository. These role gates control the site interface and the protected dynamic API endpoints; true confidentiality requires moving protected source records/media to private server-side storage with authenticated file-serving or restricting repository visibility. No existing files are deleted or relocated by this change.

Run `npm run check` and `npm test`. OAuth integration also requires real Discord configuration for an end-to-end browser sign-in test.

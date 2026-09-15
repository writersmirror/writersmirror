# Plotto Navigator — PRD

## Original Problem Statement
Use the public-domain source text *Plotto* by William Wallace Cook (1928) and make it simple to
choose plots, clauses and navigate the original text in a user-friendly way.

## User Choices
- Both browse & builder experiences
- Save/bookmark with user accounts (email + password JWT, with captcha)
- No AI features — pure Plotto system
- Modern clean writing-tool look
- Accent: emerald green; Fonts: Antonio (headings) / Saira (body)
- Auth pages: centered form, no image

## Architecture
- Frontend: React 19 + CRA/craco, Tailwind, shadcn/ui, framer-motion, react-router 7. Contexts: Auth, Plotto (static data), Builder (localStorage draft).
- Backend: FastAPI + Motor (MongoDB). Plotto reference data loaded in-memory from `/app/backend/data/plotto.json` (1,852 conflicts, 15 A / 62 B / 15 C clauses, 54 character symbols) parsed from the eykd/plottoxml transcription.
- Auth: JWT (httpOnly cookies + Bearer), bcrypt, self-hosted math captcha, brute-force lockout.
- Data models: users (ObjectId), bookmarks + plots (uuid, user-scoped).

## User Personas
- Fiction writers / screenwriters seeking plot structure and inspiration.
- Students of narrative studying Cook's combinatorial plot system.

## Core Requirements (static)
- Browse & search 1,852 conflicts with category/subcategory filters and pagination.
- Conflict detail with permutations + lead-up / carry-on cross-reference navigation.
- A·B·C clause reference; character-symbol legend.
- Plot Builder: pick A/B/C, collect/reorder conflicts, notes, save.
- Accounts: bookmark conflicts, save/edit/delete plots.

## Implemented (2026-06)
- [x] Full Plotto dataset parsed to JSON + backend endpoints (2026-06)
- [x] Browse (search, category rail, pagination) + Conflict detail with cross-refs (2026-06)
- [x] A/B/C Clauses page, Character Symbols legend (2026-06)
- [x] Plot Builder with clause selects, skeleton preview, reorderable conflict timeline, notes, save (2026-06)
- [x] JWT email/password auth with captcha; bookmarks & saved plots (user-scoped) (2026-06)
- [x] Landing page; responsive layout with sidebar + mobile drawer (2026-06)
- [x] Roll the Dice — random plot suggestion (A/B/C + coherent opening conflict), re-roll, send-to-builder (2026-06)
- [x] Restyle: emerald accent, Antonio/Saira fonts; auth image removed (centered form) (2026-06)
- [x] Cosmetic fixes: no double character badge on clause lines; Library empty-state icon; captcha input (2026-06)
- [x] Story-tree navigation: parent (lead-ups, above) & child (carry-ons, below) option panels in Builder + Conflict detail — all options surfaced, up to 5+ each (2026-06)
- [x] Character-change transforms shown as badges (e.g. A → A-3); story-beginning / possible-ending flags (2026-06)
- [x] Story-completeness prompts (missing A-clause beginning / C-clause conclusion; opening can begin earlier / closing can continue) (2026-06)
- [x] PRIORITY: plain-English character key ("cast") — every Plotto symbol translated (A-5 = male criminal) in Builder final step and on Conflict detail (2026-06)
- [x] Fixed auth login brute-force lockout tz-aware datetime comparison (2026-06)
- [x] Hardened login captcha ("re-capture"): stable after render (StrictMode guard), re-issues after failed attempt, manual refresh — QA verified (2026-06)
- [x] Transform Applied: character changes flow through the whole plot with consistent identities (recursive nested-symbol resolution; refineAlias prevents merging co-occurring roles) (2026-06)
- [x] Full Conclusion View: Final Presentation renders every step in plain English through to Conc., with cast list and completeness prompts (2026-06)
- [x] Save Folders: plots carry a folder; Library groups saved plots by folder; open resumes into builder (2026-06)
- [x] Connection Hunt: scored/cited candidate finder surfaced 18 links Cook didn't list; report at /app/frontend/public/plotto_connections.md (served at /plotto_connections.md) (2026-06)

## Connection Hunt — method & result
18 candidate connections (from public URL `/plotto_connections.md`). Method: pairs of conflicts NOT already in each other's lead-ups/carry-ons, sharing ≥2 specific character symbols (generic A/B/X excluded) AND thematic keyword overlap (Jaccard ≥ 0.12); scored sharedSymbols×3 + overlap×20 + cross-category bonus. Flagged as candidates for human review, not authoritative.

## Deeper categories + X symbols (2026-06)
- [x] 3-level browse tree: group (category) › classification (subcategory) › B-heading (masterplot). Parsed from garykac/plotto prose; all 1,852 conflicts mapped to a B-heading (163 leaves). Backend CATEGORY_TREE nested; conflicts endpoint has `heading` filter and returns `b_heading`. Verified: Enterprise › Personal Limitations › "Seeking Against Difficulties to Realize a Cherished Ideal" → 17 incl 1107a/1107b.
- [x] Browse rail drills 3 levels; b_heading shown on cards + ConflictDetail breadcrumb.
- [x] X-modifier symbols: `<base>X` (AX, BX, ChX) render as "mysterious <role>"; standalone X = unknown/McGuffin (from legend). Handled in plottoSymbols (regex + baseDesc), ClauseText highlighting, CharacterKey/cast, and plain-English presentation.

## Known data nit
- A few conflict texts use bare `SN`/`CH` where the legend key is `SN-A`/`CH`; those specific tokens aren't chipped/translated. RESOLVED 2026-06: added generic symbols (SN, D, SR, U, CN, NW, GCH, AUX, CH-1/2, X-1/2) to the legend so they chip + translate; fixed "U. S." false positive in #1108→#673.
- Conflict #259 summary is truncated ("...becomes") — upstream parse artifact, low priority.

## Guided Story Studio — number-free explorer (2026-06)
User (Scott) reframed the core experience into a guided, fun, number-free plot explorer. Overhauled `/builder` → `GuidedBuilder` ("Story Studio"); old linear builder kept at `/builder-classic`.
- [x] Primer accordion: How to play · Character symbols · About the asterisks (Cook's exact *,**,*** stage-break meaning, sourced from plotto-mf.html).
- [x] Column A progressive drill-down (Group › Classification › Masterplot heading), levels open one after another (DrillDownTree.js).
- [x] Plot-point results box: shows a curated handful (6) with "Show all N" toggle; NO Plotto #reference numbers shown.
- [x] Stepping View (SteppingView.js): Story Past = Parent options numbered 1..N above; spine in center; Story Future = Child options numbered 1..N below. #ids hidden; ordinals only. Child options show plain-English "becomes …" character-change notes. 0 lead-ups → "natural beginning"; 0 carry-ons → "conclusion".
- [x] Process Steps review drawer (ProcessStepsReview.js, shadcn Sheet): cast list + full story in plain English (symbols spelled out, transforms consistent), no code numbers; save into folders (registered users).
- [x] Number-hiding helpers (plottoText.js): stripRefNumbers strips embedded cross-ref numbers/`[n]` markers, keeps genuine story numbers; transformNotes glosses expand nested symbols (no raw `A` leak).
- NOTE: Browse/ConflictDetail remain the "reference" views and still show #ids + Suggested connections (algorithmic 18 links, hidden-number treatment pending Scott's call). Guided flow is the number-free skin.
- Verified by testing agent iteration_8 (frontend 95%, no criticals); two flagged UX nits fixed (results cap + gloss expansion).

## Number-free skin + Library + Session Save (2026-06, round 2)
Scott asked to make the whole app read number-free plus 3 more features. All shipped & tested (backend curl-verified; frontend testing agent iteration_9 = 100% on the 3 interactive flows).
- [x] HIDE REFERENCE NUMBERS everywhere user-facing: Browse cards (no #id, keyword-only search), Conflict Detail (no #id header, lead-ups/carry-ons shown as ordinal 1..N badges, "Part N" instead of "Permutation N"), Suggested connections (`hideNumbers` → ordinals, no score), Library bookmark cards. `stripRefNumbers` cleans embedded cross-ref numbers from prose. NOTE: /conflict/:id URLs still carry the id (needed for routing) — that's fine, it's not shown as content.
- [x] EXPORT STORY: `export-story-button` in the Process Steps drawer downloads a plain-English Markdown outline (title + cast + numbered steps + change notes). Works for anonymous users too. (ProcessStepsReview.js exportOutline)
- [x] RENAME FOLDERS + MOVE plots in My Library: inline folder rename (PATCH /api/library/folders/rename bulk-updates plots), move via dropdown (move-target-*) and native drag-and-drop onto folder groups (PATCH /api/library/plots/{id}/move). Folders are derived from plot.folder, so empty folders disappear (expected).
- [x] SESSION SAVE (cross-device): signed-in writer's in-progress spine syncs to the account (GET/PUT /api/library/draft; debounced 800ms). Restored on re-login even with localStorage cleared. On logout the local draft is cleared so a second account on the same browser can't inherit it.
- Backend: library_router.py added PATCH /folders/rename, PATCH /plots/{id}/move, GET/PUT /draft (db.drafts, one doc per user).

## Known Notes
- Backend brute-force lockout keys on ip:email; behind ingress the client IP rotates so the 5-attempt threshold may not trigger via the public URL (login itself works fine). Low priority.
- Dev-mode visual-edits overlay intercepts clicks in the main agent's own screenshot browser only (not real users / QA agent).

## Backlog (prioritized)
- P1: Mobile/tablet category filter for Browse (currently hidden < lg).
- P2: Export a saved plot as text/Markdown outline.
- P2: Visual "conflict path" walking lead-ups/carry-ons into a chain.
- P2: Migrate FastAPI on_event startup/shutdown to lifespan.

## Test Credentials
- Admin: admin@plotto.app / PlottoAdmin123
- See /app/memory/test_credentials.md

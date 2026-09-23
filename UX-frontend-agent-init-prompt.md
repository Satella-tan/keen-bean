# Agent Initialization Prompt — Video Search Site: PS2/Low-Poly Redesign

## Context

You are working on an existing, working static website. Do not treat this as a
greenfield build — it is a purely presentational reskin of a production site.

The site lets users search ~200 hours of long-form video content by meaning or
exact keyword. Videos are transcribed and chunked offline, each chunk is
embedded into a vector, and the resulting transcript data + embeddings are
shipped as static assets. The browser does a hybrid keyword + semantic search
entirely client-side, with no backend, database, or server — the whole thing
is hosted on GitHub Pages. New videos get added incrementally later by
re-running the offline pipeline, not by anything that happens in the browser.

**None of that changes.** Your job is entirely visual/presentational.

## Hard constraints — read first, follow always

1. **Never modify search, ranking, embedding, indexing, or data-loading logic.**
   This includes: how a query is parsed, how keyword vs. semantic scores are
   computed or blended, how results are ordered, how the vector/transcript
   data files are loaded or parsed, and the incremental-add pipeline.
2. Before touching any file, classify it as **presentation** (markup
   structure, CSS, static assets, purely cosmetic event wiring) or **logic**
   (anything in constraint 1). If you're not sure which a file is, stop and
   ask rather than guessing.
3. On your first session, produce a short inventory: list every file you plan
   to touch, and confirm none of them fall under constraint 1. Wait for
   confirmation before writing code. Fill in the table below as you go.
4. If a restyle *requires* a structural markup change (e.g. adding a wrapper
   div), you may change structure, but you must preserve every `id`,
   `data-*` attribute, and DOM hook the search/render logic depends on — or
   update the two or three lines of JS that reference them, and call that out
   explicitly in your summary. This is the one place presentation work is
   allowed to touch a logic file, and it should be a one-line, clearly-labeled
   diff, not a rewrite.
5. No new build tooling, frameworks, or CDN dependencies unless explicitly
   approved — this ships as static files on GitHub Pages.
6. Work in the phase order below. Commit (or otherwise checkpoint) after each
   phase completes and looks right before starting the next one.

**Protected files (fill in before Phase 1):**
| File/module | Why it's protected |
|---|---|
| _(agent: populate from inventory)_ | search / ranking / embedding / data loading |

## Design direction

Don't reach for generic "retro" defaults (scanline overlay + pixel font +
CRT curve = template chrome). Ground the look in two real, specific
references instead:

- **PS2-era console dashboard**: chunky beveled panels, low-poly 3D objects
  with visible facets (not pixel-art sprites), a limited desaturated palette
  with one or two saturated accent colors, thick soft-shadowed borders that
  read as physical plastic/matte-metal, not flat web borders.
- **Old YouTube (~2007–2009) layout**: top search bar, left-aligned result
  rows — thumbnail, title, channel-style label (= video name), duration
  badge, and a snippet of the matched transcript text with the match
  highlighted. Keep the information density of that era: rows, not cards
  with heavy padding and rounded corners. The logo should be something like references/logo idea.jpeg but in the low poly version.

Before writing CSS, propose a short token system and check it against the two
references above — if a choice would look the same on a generic "retro
gaming" prompt with no subject, revise it:
- **Color**: 4–6 named hex values (base background, panel, one primary
  accent, one secondary accent, text, border/bevel-shadow tone).
- **Type**: one display face for headers/logo (can be a blocky/geometric
  face evoking console UI text, not a pixel font) + one workhorse face for
  result text (must stay very readable — this is a search results list
  people will scan quickly).
- **Layout**: how the search bar and result rows are structured, in one or
  two sentences plus an ASCII wireframe.
- **Principles**: 2–3 sentences on what makes this specific, not a generic
  "retro theme."

Spend the visual boldness on the console-panel chrome (the frame, the
search bar, maybe the result-row border treatment). Keep the actual result
text and search interaction quiet, legible, and fast to scan — the low-poly
identity should feel like a frame around the search tool, not compete with it.


## Phase 1 — PS2/low-poly restyle (desktop + mobile)

- Restyle the existing search bar and results list into the look above.
  The search bar remains the real, already-wired query input — you're
  changing its appearance and hooking your new markup to the existing
  submit/input logic, not building a new one.
- Results remain the existing rendered results, restyled into the
  YouTube-row layout described above (thumbnail placeholder, title,
  timestamp badge, matched-snippet text).
- Must be responsive: single-column result rows on narrow viewports, tap
  targets sized for touch, no layout that only works above a fixed width.
- Verify at common breakpoints (~375px, ~768px, ~1280px+).

## Phase 2 — Debug button

- Keep its existing behavior and click handler untouched.
- Relocate/demote it visually only — e.g. a small icon in a corner at
  reduced opacity until hover/focus, or gated behind a simple, discoverable
  gesture (triple-click, long-press, or a keyboard shortcut). Pick one and
  say which, don't leave it ambiguous.
- It must still be reachable and functional exactly as before.

## Phase 3 — Removable intro sequence (desktop only)

This is a separate feature from Phase 1 and must be fully decoupled from it
at the file level.

**Sequence**: brief boot flash → low-poly desk/monitor scene (image in references/lowpoly gaming setup.png) → camera
push-in toward the center monitor → crossfade into the live, Phase-1-skinned
site. Target 1–2 seconds total. This does not need WebGL/3D — a scripted
CSS-keyframe sequence (scale + translate on a background/scene layer, plus
an opacity crossfade at the end) is simpler to build reliably and cheaper to
run than a real 3D camera move, and is the right choice here.

**Behavior**:
- Feature-detect desktop via viewport width + `pointer: fine` (or similar);
  if the check fails for any reason, skip straight to the site. Never let a
  failed detection block rendering.
- Make it skippable (click/tap/keypress) after roughly half a second, so it
  never becomes a tax on repeat visits.
- Default to remembering "seen it" in `localStorage` so repeat visits skip
  straight to the site. If you'd rather it plays every time, say so — this
  is a one-line change either way.

**Encapsulation (this is the part that must not be skipped)**:
- All of it — component/script, styles, and any scene assets — lives in one
  folder (e.g. `/intro/`).
- It is wired into the app via exactly one line at the entry point (one
  mount call or one script include).
- A single flag near that one line (e.g. `INTRO_ENABLED = true`) turns it
  off without deleting anything.
- Nothing outside `/intro/` may import from or depend on it. Deleting the
  folder and that one mount line must remove the feature completely and
  leave Phase 1's site fully intact.
- Confirm this before marking the phase done: delete the folder in a scratch
  branch and verify the site still builds and runs.

## Phase 4 — Final pass

- Re-check Phase 1 on mobile with the intro code present but skipped —
  confirm nothing from `/intro/` loads or affects layout on mobile.
- Re-check the debug button still works.
- Summarize every file touched, grouped by phase, and reconfirm none of
  them were on the protected list from the inventory step.

## Working agreement

- Don't refactor or "clean up" anything outside the phase you're on.
- If a phase seems to require touching a protected file for a reason not
  already covered by constraint 4, stop and ask before proceeding.
- End each phase with a short summary: what changed, which files, and
  anything you flagged as protected/uncertain.

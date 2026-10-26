# Calamity Watch Post — design brief v3 (two candidate themes)

Status: active. Supersedes DESIGN-BRIEF.md (v2, "chart room") wherever the two disagree. The product, the data rules and
the integrity rules of v2 stand; the visual language changes. Two full-site versions are built from this brief, **A** and
**B**. Aman chooses one; the loser's tokens and fonts are then removed.

## 1. What Aman asked for (26 Oct 2026)

- Rename the product **Calamity Watch Post**. Set it plainly: no italic *Watch*, no coloured word, no outlined word, no
  stacked-and-indented wordmark, none of the "typographic contrast" moves that read as AI output.
- Header type like the sample `attached_assets/image_1793045176741.png` ("AI Harness Library."): a heavy, tight
  grotesk, off-white on a green-black ground. The H1 is **not** poster-sized; the wordmark carries the hero and the
  tagline is one quiet sentence under it.
- The landing page is dark, "like watching something during the night": a world map with much lighter country
  borders than the reference screenshot (`attached_assets/image_1793045409997.png`) and glows that are subtle but
  **clearly, slowly increase**:
  - green dots multiplying between India and Nepal (flood: negative sentiment about rainfall and flooding),
  - blue dots around Florida (hurricane),
  - golden dots around California (wildfire),
  - each region starting at a different moment, not together.
- Bottom right of the hero: a terminal-style readout typed out with a cursor, naming the hazard, the fear / negative
  sentiment, the coordinates, and growing as the dots grow.
- "The UI looks directly copied from loicdjayep.com. Remove those similarities." (Section 3.)
- Keep the recorder ("fear mass, all places, last 24 hours, UTC") but: default to **72 h**, keep the 24 h option, change
  the edges, show no grid, use the glowing-dot language for the traces, and let the tape reveal slowly from left to
  right. The three hazards should be seen rising at different times across the three days: this is fixed with a real
  backfill of the Bluesky week (api-server `live:backfill`), never by shaping the data.
- Scrolling down from the dark hero, the site is in "white mode"; every other page shares the theme.

## 2. Two versions, one engine

Both versions share one codebase, one component set and one hero sequence; they differ in tokens (palette, type,
rules, radii), in the hero composition, and in a few section treatments. The version is selected by `?v=a` / `?v=b`
(remembered in `localStorage`, applied before first paint through a `data-variant` attribute on `<html>`), and a small
fixed switch in the footer corner lets Aman flip between them on any page. Nothing else about the two sites differs:
same copy, same data, same routes.

### 2.1 Version A — "Night watch" (cool, neutral, instrument-like)

| token | night (hero, dark) | day (everything else) |
| --- | --- | --- |
| ground | `#0A0B0D` | `#FAFAF8` |
| raised / sheet | `#121316` | `#FFFFFF` |
| ink | `#ECECE8` | `#121316` |
| ink muted | `#9A9C9A` | `#5C5E5A` |
| hairline | `rgba(236,236,232,0.10)` | `#E4E4E0` |
| strong rule | `rgba(236,236,232,0.22)` | `#C9C9C4` |
| land | `rgba(236,236,232,0.045)` fill, no coast stroke | `#F0F0EC` |
| borders | `rgba(236,236,232,0.13)` 0.6 px | `#DADAD5` |
| flood | `#3FD68F` | `#1F9D62` |
| cyclone | `#5AA9FF` | `#2F7FE0` |
| wildfire | `#F5B942` | `#C98A12` |
| fear reading (pen) | `#FF6B5A` | `#D9361E` |
| elevated / high / severe | glyph + word, ink | glyph + word, ink |

Type: **Inter Tight** (variable, OFL) for everything proportional; wordmark 800 at `clamp(40px, 5.2vw, 76px)`,
`letter-spacing -0.045em`, `line-height 0.95`; H2 700 at `clamp(28px, 2.6vw, 40px)` `-0.03em`; body 400 16/24;
**Geist Mono** (variable, OFL) for the readout, axes, timestamps and figures, 12.5–13 px, no uppercase tracking labels.
Rules: hairlines only where they separate data rows; sections are separated by space (120 px desktop / 72 px phone),
not by heavy top rules; no corner brackets, no numbered headings, no rotated stamps, no chart-paper grid. Radii 0 on
instruments, 4 px on buttons and inputs. Buttons: ink-filled primary, hairline secondary, both 40 px tall.

Hero composition: full-viewport (min 640 px, `100svh` cap 900 px) night ground; wordmark top-left over the map with the
tagline beneath (max 46ch, muted); nav links top-right in the same bar; the map is equirectangular, clipped to
lat −56…78, land as a faint fill, borders as 0.6 px lines, a 30° graticule at 5% ink; the readout sits bottom-right
as a borderless mono block, three lines plus a header line, cursor a 7×14 block blinking at 1 Hz on the active line;
"Scripted illustration, not live data" and a replay / pause control sit in the readout header. Below the hero the page
is day: the recorder first, then the board, how it works, models, lineage, classifier, subscribe.

### 2.2 Version B — "Night desk" (warm green-black, editorial, wire-service)

| token | night (hero, dark) | day (everything else) |
| --- | --- | --- |
| ground | `#111814` | `#F4F1EA` |
| raised / sheet | `#182019` | `#FBF9F4` |
| ink | `#EEF0E8` | `#1B1D18` |
| ink muted | `#A3AA9D` | `#5F655B` |
| hairline | `rgba(238,240,232,0.12)` | `#DAD6CB` |
| strong rule | `rgba(238,240,232,0.26)` | `#B8B3A4` |
| land | `rgba(238,240,232,0.06)` fill | `#EAE6DC` |
| borders | `rgba(238,240,232,0.11)` 0.6 px | `#CFCABD` |
| flood | `#67D28A` | `#2B8A4E` |
| cyclone | `#6FB5F0` | `#2A6FC2` |
| wildfire | `#E8B04B` | `#B57A12` |
| fear reading (pen) | `#FF7A66` | `#C8381F` |
| elevated / high / severe | glyph + word, ink | glyph + word, ink |

Type: **Schibsted Grotesk** (variable 400–900, OFL) for proportional text; wordmark 800 at `clamp(40px, 5.2vw, 76px)`
`-0.035em`; H2 700 `clamp(28px, 2.6vw, 40px)` `-0.025em`; body 400 16/24; **Fragment Mono** (OFL) for figures,
axes, the readout and datelines, 12.5–13 px. Rules: B uses hairline rules as a newspaper does: a rule above each
section head with a small mono dateline (section name left, UTC right); column rules between lineage items; the
recorder sits on the sheet with a rule above and below, no frame on the sides. Radii 0 everywhere. Buttons: ink
primary, hairline secondary, 40 px.

Hero composition: the wordmark and tagline sit in a top block on the night ground (the sample's arrangement: heavy
title, one line beneath); below them the map fills the width as a "desk sheet" with a hairline above and below and a
mono dateline row (left "World · scripted illustration", right "UTC" clock); the readout is bottom-right **inside**
the sheet, set as a wire dispatch: a two-column mono block with a hairline on its left edge. The night block ends with
a hard edge; the day page begins with the recorder.

### 2.3 Shared hazard language

The three hero hazards and the recorder dots use one scale in both versions: a crisp core dot (r 2.4 px on the map,
3 px on the recorder) and a soft halo (radial gradient of the same hue, r 5× core, peak alpha 0.35 on night and 0.22
on day). Halo radius grows with the quantity (posts on the map, fear mass on the recorder) on a square-root scale.
Hazard hue and risk level never share a channel: levels are glyph + word in ink. The fear reading (the pen hue) is
only used where fear itself is plotted or stated.

## 3. Resemblances to loicdjayep.com, removed in both versions

| on loicdjayep.com and on our v2 | v3 |
| --- | --- |
| warm light-grey ground with a sheet-white card | night hero; day ground is near-white (A) or warm bone (B) without card framing of sections |
| heavy, wide grotesk display with tight tracking as the only large element | wordmark in Inter Tight (A) / Schibsted Grotesk (B); H1 small; the map is the large element |
| small uppercase mono labels with tracking, in plates above content | mono labels are sentence case, untracked, and sit as datelines or axis text; no plate strips |
| blueprint corner brackets around images and instruments | none |
| numbered section headings ("01 The board") | unnumbered heads; B adds a dateline rule, A uses space |
| `>_` prompt glyphs before headings | none |
| three coloured dots (traffic lights) in the header | none; the status control is a text button |
| monochrome plate-and-rule "schematic" look of the pipeline list | pipeline list set as a plain two-column table with hairlines |

## 4. The hero sequence (shared engine)

A scripted illustration. The caption says so in the readout header and the `aria-label` of the scene says
"Illustration of how a signal grows; not live data". It never reads from the API.

- Regions and their sources of truth for the choreography (not real events): flood over the Nepal–Bihar border
  (centre 27.2°N 85.3°E, ellipse 3.2° × 1.6°, rotated 15°), cyclone around Florida (27.6°N 81.6°W, ellipse 2.6° ×
  3.2°), wildfire over southern-central California (36.0°N 119.6°W, ellipse 2.2° × 3.6°, rotated −30°). Dot positions
  are drawn from a seeded generator so every load is the same picture.
- Timing, seconds from scene start: flood begins at 1.5 s, cyclone at 10 s, wildfire at 19 s; the whole run lasts
  48 s, then holds 12 s, then fades and starts again (pause control; `prefers-reduced-motion` and `?motion=reduce`
  show the final frame, no cursor blink). Each region's spawn gap shrinks from 2.6 s to 0.55 s over its run (a slow
  start that visibly accelerates), reaching 26 (flood), 18 (cyclone) and 14 (wildfire) dots. A dot appears with a
  260 ms fade and its halo grows for 1.2 s; existing halos widen a little with every new neighbour so the region reads
  as one brightening cloud, not a sprinkle.
- The readout types with a 28 ms per character cadence (first line "signal growth · scripted illustration" is static).
  Each region gets a block when its first dot appears: `flood  ·  Nepal–Bihar border  ·  27.2°N 85.3°E`, then a figure
  line `posts 1  fear 0.42  rainfall · flooding` whose numbers are retyped as the count grows (`posts 14  fear 0.63`).
  Fear starts 0.38–0.46 and rises to 0.60–0.70 with the count. The cursor sits at the end of the last typed line.
  Keywords per region: flood `rainfall · flooding`, cyclone `hurricane · landfall`, wildfire `wildfire · smoke`.
- Nothing else moves: no camera, no pan, no pulsing rings, no scanning lines.

## 5. The recorder, restyled (shared engine)

- Default window 72 h, 24 h available; the switch is text, not a pill.
- No grid, no chart-paper, no frame marks, no plate strip; the instrument sits on the day ground with lane labels in
  the left margin and the time axis beneath (UTC, day labels at midnight).
- Each hour is a glowing dot: core in the hazard hue, halo radius ∝ √fearMass, halo alpha steps with level
  (insufficient/low 0.10, elevated 0.18, high 0.26, severe 0.34 of the hue). A hairline trace (ink at 18%) connects the
  cores so the shape reads at a glance; the baseline stays a dashed hairline; the in-progress hour is a hollow dot.
- Official records are small ink-outlined chips in the lane's top margin (no green, no rotation); the hover/keyboard
  readout keeps every figure it has today.
- Reveal: a clip wipes left to right at a constant speed, 1.8 s for 72 h and 1.1 s for 24 h, easing out; reduced
  motion shows the tape at once.
- "Change the edges": the lanes have no outer border; lane separators are 1 px hairlines at 40% that stop short of the
  margins by 12 px.

## 6. Elsewhere

- Top bar: wordmark text only (no glyph); on the home hero it is light on night ground and becomes dark on day ground
  as the hero scrolls out (`data-nav` switches at the hero's bottom edge). Other pages: day from the top.
- Alerts, Replay, Model, Subscribe, About and the evidence pages keep their structure; Plate becomes a hairline
  section with a sentence-case mono header line; stamps become chips; numbered heads are removed; copy keeps the
  v2 integrity rules (lead/lag wording, "experimental research system" line on every page).
- Footer: a single row of small text, the two licences updated to the chosen fonts (both named while two versions
  exist), the A/B switch at its right end.

## 7. Done means

- `?v=a` and `?v=b` both pass the slop catalogue and the uniqueness review; three fresh reviewers per round.
- Screenshots at 1440, 1024 and 390 for both versions, home and one evidence page each, in `generated-artifacts/council/`.
- Lighthouse-level sanity: fonts preloaded for the active version only, hero geometry lazy-loaded, no layout shift
  from the typed readout (fixed-height block).
- Reduced motion verified with `?motion=reduce`.

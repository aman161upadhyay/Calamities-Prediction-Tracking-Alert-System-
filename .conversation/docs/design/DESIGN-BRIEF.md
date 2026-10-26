# Design brief and token plan

Written against `reference/ai-skills/03-agents/design-agent/` (system prompt, slop catalogue, checklists) and the `frontend-design` and `emil-design-eng` skills. The uniqueness review in section 5 is the gate before implementation.

## 1. Brief

- Users: visitors to Aman's portfolio (engineers, recruiters, researchers) who need to understand the system in seconds, and anyone checking a place for current hazard chatter.
- Primary job on `/`: see what is happening now on the map and understand how the number was produced. Completion event: the visitor opens an alert or a hazard and reads its evidence.
- Secondary jobs: run the classifier on their own text, replay a known disaster, subscribe for a place.
- Platform: web. Viewports: 1440, 1024, 390. Desktop first for the board; narrow screens keep the map, the alert list and the primary actions.
- Content: real posts, real scores, real official events, real model metrics. No invented numbers anywhere. When nothing is live, the UI says so and offers the replay.
- Constraints: dark basemap tiles (OpenFreeMap or CARTO dark) so coloured hazard signals stay legible; open-source fonts; no paid assets; WCAG 2.2 AA floor from `accessibility-floor.md`.

## 2. Concept

An emergency operations centre wall at night: the map is the instrument and everything else is calibrated readout around it. The memorable element is the live map with hazard hotspots whose ring intensity is the anomaly score. Everything around it is quiet, dense and labelled. Boldness is spent once.

## 3. Tokens

Colour (semantic pairs, all measured for contrast before use):

| Token | Hex | Role | Contrast note |
|---|---|---|---|
| `bg` | `#0C1424` | page | deep blue-black, matches dark basemap |
| `surface` | `#131C2E` | panels | |
| `surface-2` | `#1A2539` | raised rows, inputs | |
| `line` | `#263247` | borders, grid | 3:1 against `surface` for UI boundaries to be verified |
| `text` | `#E6EBF2` | primary text | 14.6:1 on `bg` |
| `text-muted` | `#9DA9BC` | secondary text | 7.3:1 on `bg`, 6.4:1 on `surface` |
| `hazard-water` | `#3D9BFF` | flood, heavy rain, tsunami | chips, series lines, map points |
| `hazard-wind` | `#A78BFA` | cyclone, hurricane, storm | |
| `hazard-fire` | `#FF8A3D` | wildfire | |
| `hazard-ground` | `#D4A24C` | earthquake, landslide | |
| `hazard-heat` | `#F5C542` | heatwave, drought | |
| `signal-fear` | `#FF5C7A` | fear index line and ring | distinct from `hazard-fire` in hue and used only for the fear channel |
| `official` | `#5EEAD4` | official feed markers and the "corroborated" label | the only teal; never used for generic success |
| `risk-low` | `#8A97AB` | level text and badge | |
| `risk-elevated` | `#E8B04B` | | |
| `risk-high` | `#FF6B3D` | | |
| `risk-severe` | `#FF2E55` | | |

Risk is encoded three ways at once: text label, badge colour and a shape glyph (dash for low, diamond for elevated, circle for high, triangle for severe), so colour is never the only carrier. Hazard hue and risk colour are never used in the same channel.

Type:

- `Atkinson Hyperlegible Next` (Google Fonts, OFL) for UI and display, weights 400, 500, 700. Chosen because it was designed for legibility under poor conditions, which is the job of an alert system. Display headings at 700 with `-0.015em` tracking.
- `Atkinson Hyperlegible Mono` for timestamps, coordinates, identifiers and metric tables, with `tabular-nums`. Not for labels.
- Scale (px / line-height): 12/16 caption, 14/20 body-dense, 16/24 body, 20/28 section, 28/34 page title, 40/44 display. Reading measure 65 to 72 characters. Left aligned throughout; nothing centred except the map's empty-state message.

Spacing: 4-base scale (4, 8, 12, 16, 24, 32, 48). Within-group gap 8, between-group gap 24, section gap 48. Radius: 4 for chips and inputs, 8 for panels, 0 for the map frame and tables. One elevation level (the detail drawer); panels sit flat on `bg` with a `line` border.

Motion: page-load sequence once (map fades 200 ms, hotspots pulse one time, feed rows stagger 40 ms, max 8 rows). Panel and drawer open 160 ms `cubic-bezier(0.23, 1, 0.32, 1)`; close 120 ms. New feed rows enter with opacity and height. No count-up numbers, no infinite pulses, no scroll reveals on sections. `prefers-reduced-motion`: no transforms, opacity only, hotspots static.

## 4. Layout

Desktop 1440, the board fills the first viewport under a 40 px status bar and a one-line statement:

```
┌──────────────────────────────────────────────────────────────────────┐
│ Calamity Watch   live · last ingest 12:40 UTC · X ok · Bluesky ok ·   │
│                  4 official feeds · model v1.0 · experimental         │
├──────────────────────────────────────────────────────────────────────┤
│ Reads public posts about floods, fires, storms and quakes, scores     │
│ fear and relevance with two models, and raises an alert when a place  │
│ breaks from its own baseline.  How it works ↓                         │
├────────────┬───────────────────────────────────────┬─────────────────┤
│ Hazards    │                                       │ Signal feed      │
│ Flood  3 ▲ │        Map (MapLibre, dark style)     │ 12:39 Bluesky    │
│ Fire   1 ● │   point size = relevant posts/hour    │ "water in the…"  │
│ Storm  0 – │   colour = hazard, ring = fear z      │ flood .91 fear .77│
│ Quake  0 – │   official events as teal outlines    │ Kochi, IN        │
│ Heat   0 – │                                       │ ─────────────    │
│ Open alerts│                                       │ 12:38 X …        │
│ Kochi flood│                                       │                  │
│  high ●    │                                       │                  │
├────────────┴───────────────────────────────────────┴─────────────────┤
│ Fear index, last 72 h, one small multiple per hazard, official-event  │
│ ticks on the axis, hover and keyboard readout with units and time     │
└──────────────────────────────────────────────────────────────────────┘
```

Below the board on `/`: How it works (the six real pipeline stages with the actual counts from the last run), Model (metrics table from `metrics.json`, link to `/model`), Lineage (2018 CodeFunDo++ to 2026, three sentences and the old screenshot if Aman supplies one), Try the classifier (textarea, result table), Subscribe (email, place, hazard, minimum level), Footer (sources, licences, "not an official warning source").

1024: the right feed becomes a tab beside "Alerts" under the map; the hazard rail stays. 390: status bar collapses to one line with a disclosure; map 55 vh; tabs Alerts, Feed, Hazards; the timeline becomes a horizontally scrollable strip of small multiples. The primary action on every width is opening an alert's evidence.

Copy rules: buttons name results ("Open alert evidence", "Classify this text", "Get alerts for Kochi", "Replay Kerala floods 2018"). Empty state names the absence and the next action ("No scored posts in the last hour for Delhi · flood. Bluesky ok, X not configured. Replay a past event."). Errors keep the last good result visible ("Couldn't refresh. Showing 12:25 UTC. Retry."). Sentence case. No all-caps labels, no eyebrows, no arrows glued to buttons.

## 5. Uniqueness review (choice to brief)

| Choice | Supporting fact from the brief | Catalogue IDs checked | Decision |
|---|---|---|---|
| Dark, blue-tinted base | dark basemap tiles make coloured hazard signals legible; the EOC night-wall concept | C03, K02 | keep; base is blue-tinted `#0C1424`, no acid accent, no glass |
| Hazard hues from water, wind, fire, ground, heat | hazards are the content's categories; hues follow their physical referents | C06, C07 | keep; always paired with text and icon |
| Separate fear colour and official teal | two signal channels the user must tell apart | C07 | keep; teal reserved for official corroboration only |
| Atkinson Hyperlegible family | legibility is the stated job; designed for low-vision reading | T01, T02, T08 | keep; mono only for data |
| Map as hero, no KPI row | the characteristic artifact is the live map; numbers without the map are decoration | L02, L07, P01 | keep; stats live in the rail with units |
| Small multiples timeline | eight hazards cannot share one y-axis honestly | D01, D05 | keep; each has units and period |
| One page-load sequence, no scroll reveals | frequent surface; content must be readable before scripts run | M01, M02, M04 | keep |
| Flat panels, one elevation | operational density; elevation only for the drawer | K01, K03, K04 | keep |
| Left-aligned statement under status bar | scan-heavy reading; first view exposes job and action | T07, L02 | keep |
| Risk glyphs plus text | status must not depend on colour alone | C06 | keep |

Checked against an unrelated product (a fintech dashboard): the dark base and dense panels would survive unchanged there, so the justification rests on the basemap and the EOC concept, both specific to this subject. The hazard palette, the fear channel, the official teal, the map hero and the small multiples would not survive, which is the intended distinctiveness. The remaining risk is that the dark base still reads as a default; the mitigation is that no decorative gradient, glow or glass appears anywhere, and the light basemap variant is a single toggle away if Aman prefers it after seeing screenshots.

## 6. Open questions for Aman

1. Product name: "Calamity Watch" is the working title. Any preference?
2. Light theme for the portfolio embed, or dark only?
3. Should the 2018 team ("Sacred Gamers") and the hackathon be named on the About page?

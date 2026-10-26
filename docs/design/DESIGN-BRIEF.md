# Design brief v2: the chart room

Second brief, written 2026-10-26 after Aman rejected the first build ("I hate the UI, it's like AI slop") and pointed at loicdjayep.com as the bar. The first brief (dark emergency-operations wall) is kept in git history; its own uniqueness review already flagged the risk that came true: "the dark base still reads as a default". This brief replaces it. It is written against `reference/ai-skills/03-agents/design-agent/` (system prompt, workflow, slop catalogue, checklists), the `emil-design-eng`, `frontend-design` and `web-design-guidelines` skills, and the reference study in section 2.

## 1. Brief

- Users: visitors to Aman's portfolio (engineers, recruiters, researchers) who need to understand the system in seconds and judge the craft; anyone checking a place for current hazard chatter.
- Primary job on `/`: see what the system is recording right now and understand how an alert is produced. Completion event: the visitor opens an alert and reads its evidence (posts, baseline, official corroboration, lead time).
- Secondary jobs: replay a known disaster, run the classifier on their own text, subscribe for a place.
- Platform: web, React 19 + Vite + Tailwind 4, wouter, TanStack Query, MapLibre, Recharts, framer-motion (already installed; no new UI libraries without a reason). Viewports: 1440, 1024, 390.
- Content: real posts, real scores, real official events, real model metrics. No invented numbers, logos or testimonials anywhere. When nothing is live the UI says so and offers the replay.
- Constraints: open-source fonts; no paid assets; WCAG 2.2 AA floor (`accessibility-floor.md`); the WebGL-less static map fallback must look designed, not like an error; everything readable before scripts run; `prefers-reduced-motion` preserves every piece of information.
- Aman's words, which outrank everything below: "I hate the UI its like AI slop"; "it should look incredible"; "build UI design elements which are as complex as these websites" (loicdjayep.com); "use UIs available from 21st.dev and Dribbble"; earlier: "keep the scope similar to the previous one", "focus on natural calamities", never claim a lead over official records.

## 2. Reference study

loicdjayep.com (fetched 2026-10-26, screenshot in `generated-artifacts/design-refs/loicdjayep-home.png`): light warm grey `#EFEFF0`, ink `#14130F`, one blue `#0B3FCF`, one green `#07BE43`; Söhne for display, Array/Spline Sans Mono for labels; 0 to 6 px radii; one metaphor (a terminal prompt) carried through every element: a typed prompt that morphs into the hero name on load, `>_` glyphs on section headings with a blinking underscore, `>` prefixed buttons, macOS window chrome on cards, blueprint corner brackets on the portrait, a logo marquee, a numbered project explorer with a preview pane, and "motion signatures" (a routing trace along diagram nodes, a dossier visiting pipeline stages) that are progressive enhancements, interruptible, and absent under reduced motion. What makes it good is not the terminal; it is that one subject-specific metaphor decides every component, the motion explains content, and the type has real hierarchy.

Dribbble (`dribbble-earthquake-search.png`, `dribbble-flood-map.png`, `dribbble-seismic-monitoring.png`): almost everything is the dark glowing dashboard we are leaving. Kept: epicentre rings and light flood-depth bands on pale basemaps as marker language. Rejected: glass panels, neon gradients, floating 3D devices.

21st.dev (`21st-animated-hero.png`, component listings for maps, backgrounds, ASCII art): marketing blocks with gradient blobs and globes, which the slop catalogue names directly. Kept as technique ideas only: a split-flap departures board (becomes our printed alert ledger), topographic contour backgrounds (becomes chart-paper grid), paper-themed route maps (confirms the light basemap). Nothing is copied.

## 3. Concept: the chart room

A monitoring station's light table. Public chatter is recorded the way a seismograph pen records the ground: a continuous trace on chart paper. Every alert is a red ink mark on that trace, and an official event can later stamp it as corroborated. The site is the room where those charts are read.

The memorable element is the **strip-chart recorder**: a full-width pen trace of the fear index with alert ticks and official stamps, drawn live on paper-grid. Everything else is quiet instrument furniture around it: plates, ledgers, stamps, dials. Boldness is spent on the recorder and on the display type; nothing else shouts.

Why this subject and not another: the system's whole claim is "a signal recorded before the sirens". Recorders are how hazards have always been measured (seismograph, barograph, tide gauge, rain gauge chart). The social signal is a new instrument in the same room. The metaphor also gives every data type a native form: time series are pen traces, alerts are ink marks, official records are stamps, the model is a calibration certificate, the replay is a playback console, the classifier is a test bench with needle gauges.

## 4. Tokens

Colour, light only (decision: the dark theme is dropped; a chart room is lit). Measured contrast against paper `#F3F2EE` unless noted.

| Token | Hex | Role | Contrast |
|---|---|---|---|
| `paper` | `#F3F2EE` | page | |
| `sheet` | `#FFFFFF` | plates, the map frame, inputs | |
| `rule` | `#DAD7CE` | hairlines, table rules | 1.5:1 decorative only |
| `rule-strong` | `#B9B5A9` | frames, focusable borders | 3.0:1 UI boundary |
| `grid` | `rgba(31,77,184,0.12)` | chart-paper grid, recorder only | decorative |
| `ink` | `#15140F` | text, primary button fill | 17.4:1 |
| `ink-muted` | `#5B5A54` | secondary text | 6.0:1 |
| `pen` | `#C8102E` | the fear/alert channel: traces, ticks, "alert" text, high level | 5.9:1 |
| `pen-deep` | `#7A0C1E` | severe level, pressed pen | 10.8:1 |
| `stamp` | `#1E7A4A` | official corroboration only: stamp, official markers, official ticks | 5.0:1 |
| `ochre` | `#9A6700` | elevated level | 4.9:1 |
| `hz-water` | `#1D5FBF` | flood, heavy rain, tsunami | fill only |
| `hz-wind` | `#6D4CC4` | cyclone, hurricane, storm | fill only |
| `hz-fire` | `#E25822` | wildfire | fill only |
| `hz-ground` | `#7C4A1E` | earthquake, landslide | fill only |
| `hz-heat` | `#B45309` | heatwave, drought | fill only |

Channel rules, which replace the old "teal is official" rule:

- The pen channel (red) is always a line, a tick or a level word. It never fills a button, a chip or a background.
- The stamp channel (green) is always a stamp form: a 1.5 px bordered box, slightly rotated, with the feed name, magnitude or severity, and UTC time. Nothing else is green. Success states use ink text and the word, not green.
- Hazard hues appear only as marker fills, chip glyphs and series fills; hazard names are always written next to them. Hazard hue and risk colour never share a channel.
- Risk level is carried three ways: word, colour, glyph (dash low, diamond elevated, circle high, triangle severe). Levels use ink-muted, ochre, pen, pen-deep.
- Focus ring: 2 px ink, 2 px offset. Links: ink with a 1 px underline that becomes 2 px on hover; no coloured links.

Type (Google Fonts, OFL, loaded with `<link rel="preload">` and `font-display: swap`):

- Display and UI: **Archivo** variable (`wdth 62–125`, `wght 100–900`). Display roles use `wdth 118`, `wght 800`, tracking `-0.03em`: H1 `clamp(44px, 6.2vw, 92px)/0.95`, section titles `clamp(30px, 3.4vw, 48px)/1.02`, card titles `22/26`. UI and body use `wdth 100`: 16/24 body, 14/20 dense, 500 for emphasis.
- Readouts and plates: **Martian Mono** variable (`wdth 75–112.5`). 12/16 and 13/18 at `wdth 90`, `tabular-nums`, for timestamps, coordinates, scores, z-values, identifiers and the plate labels. Plate labels (uppercase, `.08em` tracking) are the one allowed use of tracked capitals: one plate per instrument, never above every heading.
- No serif anywhere. No Inter, Space Grotesk, Space Mono or JetBrains Mono.
- Reading measure 60–72 characters, left aligned. Nothing centred except the 404 and empty-state messages inside instruments.

Spacing and surfaces: 4-base scale (4, 8, 12, 16, 24, 32, 48, 72, 120). Within-group 8, between-group 24, between-instrument 48, between-sections 120 on desktop and 72 on narrow. Radii: 0 for recorders, frames, tables and stamps; 3 px for inputs and chips; 6 px for buttons; nothing larger. Elevation: none in the page; one soft shadow (`0 8px 24px rgba(21,20,15,.12)`) only for popovers, the map tooltip plate and the replay transport when it is sticky. Plates are `sheet` with a `rule-strong` 1 px frame; sections sit directly on paper and are separated by a single hairline and space, not by boxes (slop L06, K01).

Chart paper: the recorder background is `sheet` with a 24 px `grid` lattice and a heavier line every 120 px (one per 6 hours at the default scale), plus a `rule` margin strip at the top that carries official stamps. The grid is drawn with CSS gradients, not an image. It appears only inside recorders.

## 5. The instruments

These are the components that make the site specific. All live under `src/components/instruments/`.

1. **Recorder** (`Recorder`): SVG strip chart of `TimelinePoint[]` (hour, fearMass, baselineMedian, zScore, level) with a baseline band, a red pen trace, alert ticks (vertical red marks with the level glyph) and official stamps in the top margin at the event's time. A pen head sits at the latest point; while live it blinks at 1.2 s steps. Hover and keyboard (arrow keys over a focusable readout) show a plate with time, posts, fear mass, z and level. Used at full width on `/` (last 72 h, one lane per hazard with open alerts, stacked), in `/hazards/:hazard`, `/places/:id` (one per hazard), `/alerts/:id` (alert window shaded), and `/replay` (with a time cursor).
2. **Station marker** (`StationMarker`): a map glyph modelled on meteorological station plots. Circle fill = hazard hue; diameter = relevant posts per hour on a square-root scale; a red ring whose arc length = fear z-score (0 to 3 sigma = 0 to 360 degrees); a small stamp square beside it when an official event within 72 h is nearby. A legend plate explains the three encodings with the three real values of the strongest place. The static (no-WebGL) fallback draws the same glyphs on an equirectangular paper grid, so both looks are the same instrument.
3. **Ledger** (`Ledger`): the table form for alerts, posts and official events. Hairline rows, mono timestamp column, level glyph column, sentence-case text, no zebra stripes, no card per row. New rows enter with height and opacity in 180 ms and only when they are new, never on refetch of unchanged rows.
4. **Stamp** (`Stamp`): the official corroboration mark. Rotated -1.5 degrees, 1.5 px `stamp` border, mono caps "USGS M6.1" and "14:02 UTC", a second line "lead 41 min" when the alert opened first and "after official by 12 min" when it did not. Presses in once when it enters view (scale 1.06 to 1, 180 ms, ease-out). Never claims a lead that the data does not show.
5. **Plate** (`Plate`, `PlateLabel`): the mono label strip that titles an instrument ("RECORDER / FEAR INDEX / LAST 72 H / UTC") and the sheet surface it sits on. One per instrument.
6. **Dial** (`Dial`): a 180-degree needle gauge for the classifier: relevance and fear 0 to 1 with a printed scale, needle driven by a spring (stiffness 170, damping 18); under reduced motion the needle is set directly. The numeric value is always printed beside it.
7. **Schematic** (`PipelineSchematic`): the six real pipeline stages as plates joined by a line, with their last-24 h counts and units. A single dot travels the line once when the schematic enters view; counts never animate.
8. **Transport** (`ReplayTransport`): play, pause, speed, scrub, mono clock readout in UTC, scenario name; sticky under the header on `/replay` while the replay runs.
9. **Frame marks**: four corner brackets drawn on the map frame and on the recorder only (the two instruments that "plot"), not on every card.

## 6. Motion signatures

Each one explains content; all respect `prefers-reduced-motion`; none hides content before scripts run; all are interruptible and clean up on route change (Emil's framework, `motion-principles.md`).

| Signature | Where | Behaviour | Reduced motion |
|---|---|---|---|
| Pen draw | every Recorder | the trace draws left to right over 900 ms `cubic-bezier(0.77,0,0.175,1)` once per data load; stamps and ticks appear as the pen passes them | final trace shown at once |
| Pen head | live Recorder only | 1.2 s step blink at the latest point | static dot |
| Stamp press | Stamp | scale 1.06 to 1 and opacity, 180 ms ease-out, once in view | appears without transform |
| Log print | Ledger | new rows grow in, 180 ms | opacity only |
| Pipeline pulse | Schematic | one dot along the line, 2.4 s, once per entry into view | dot rests at the last stage |
| Needle | Dial | spring to value, interruptible on new input | set directly |
| Transport cursor | Replay | cursor and clock move with playback; markers update in place | same, no easing |
| Press | every button | `scale(.97)` 160 ms ease-out on `:active` | colour change only |
| Tab indicator | tabs | clip-path copy technique, 200 ms | instant |

Not allowed: scroll-triggered section reveals, count-up numbers, infinite pulses, parallax, tilt on hover, gradient text, glass, blur backgrounds, typing effects (that is Loïc's signature, not ours), emoji anywhere, an arrow glued to every call to action.

## 7. Pages

Composition is the designer's; the content and the instrument each page must carry is fixed.

- `/` Home: station header (wordmark, status plate with live or replay, last ingest, source health, links). Hero: the tagline as H1 over the full-width live Recorder (72 h, stacked lanes, alert ticks, stamps) with a legend plate and two actions ("Open the latest alert" when one exists, otherwise "See the board"; "Replay Kerala 2018"). The board: light map (OpenFreeMap `positron` style) with station markers, the hazard rail, and the signal feed as a Ledger. How it works: Schematic. The models: calibration plates with real metrics and a link to `/model`. Lineage: 2018 to 2026 as a short strip. Try the classifier: textarea plate and two Dials. Get alerts by email. Footer: sources, licences, "not an official warning source".
- `/alerts`: Ledger of all alerts with status, level, hazard and place filters that persist in the URL; a mini stamp glyph in the corroboration column.
- `/alerts/:id`: the evidence dossier. Header plate (place, hazard, status, opened, peak); Recorder with the alert window shaded; the Stamp or the sentence "No official record matched within 72 h"; posts as a Ledger with scores; alert events timeline; map crop.
- `/places/:id`: place plate (admin1, country, coordinates, population, featured), one Recorder per hazard with signal, weather context plate, posts Ledger, nearby official events.
- `/hazards/:hazard`: hazard plate (definition, model class), Recorder, top places table, official events Ledger.
- `/model`: the calibration certificate: version plate, datasets, per-class metrics, confusion matrix as a printed grid, cross-dataset results, geoparser and detector settings, limitations written plainly, examples, and the classifier bench.
- `/replay`: scenario plates (Harvey 2017, Kerala 2018, California 2018, Puebla 2017, Idai 2019 with real post counts and states), Transport, Recorder with cursor, map, alerts opening into a Ledger, key moments with the first-alert and official times side by side.
- `/subscribe`, `/subscribe/verify`, `/subscribe/unsubscribe`: one form plate each; pending until the server confirms; errors keep input.
- `/about`: what it is, what it is not, lineage, sources and licences, the team question left as Aman decides.
- 404: "No such chart." with links to the board and the alerts ledger.

Narrow (390): the header collapses to wordmark plus a status disclosure; the Recorder keeps full width with a horizontal scroll of the last 24 h and a fixed readout; the board becomes tabs (Map, Alerts, Feed, Hazards); ledgers drop secondary columns, never the timestamp, the place or the level; the Transport docks to the bottom.

Copy: sentence case; buttons name results ("Open alert evidence", "Classify this text", "Get alerts for Kochi", "Replay Kerala floods 2018"); errors keep the last good data visible and say what to do; empty states name the absence and the next action. The old X and Bluesky configuration notes stay but move into the status disclosure, not the first viewport.

## 8. Uniqueness review (choice to brief)

| Choice | Supporting fact | Catalogue IDs | Decision |
|---|---|---|---|
| Light paper base with a blue chart grid inside recorders | the subject is a recorded trace on chart paper; Aman rejected the dark default | C02, C03, L06 | keep; grid only inside instruments, no cream-serif pairing |
| Red pen channel | ink marks on a recorder; the alert is literally a mark | C06, C07 | keep; always with word and glyph |
| Green stamp channel | official records are stamps; green is otherwise absent so it stays semantic | C07 | keep; nothing else is green |
| Archivo wide display plus Martian Mono readouts | instrument plates and heavy station lettering; both OFL | T01, T02, T03, T08 | keep; mono only for data and one plate per instrument |
| Recorder as hero instead of a map or KPIs | the claim is a signal over time; the map is secondary evidence | L02, L07, P01, D01 | keep; every recorder has units, period and a readout |
| Station-plot markers | hazard, volume, fear and corroboration must be read at once on a map; meteorology already solved this | C06, D02 | keep; legend plate with real values |
| Ledger instead of cards | alerts and posts are records; relationship is sequence | K01, K04 | keep |
| Corner marks only on the two plotting instruments | they are the plotted sheets; elsewhere it is decoration | K01 | keep |
| One page-load draw, no scroll reveals | frequent surface; content must stand without scripts | M01, M02, M04 | keep |
| Stamps, dials, schematic, transport | each maps to a data type the product actually has | I04, D04 | keep; none shows invented data |

Checked against an unrelated product (a fintech ledger app): the paper base and the wide grotesque could survive there, which is why neither is the signature. The recorder, the pen channel, the stamps, the station markers and the calibration certificate could not survive; that is the intended distinctiveness.

## 9. Decisions recorded for Aman

1. Light theme only; the dark theme and the dark basemap are removed. The reference is light and the metaphor needs paper.
2. Fonts change from Atkinson Hyperlegible to Archivo and Martian Mono.
3. "Teal is official" becomes "the green stamp is official"; the semantic separation of official evidence from everything else is kept.
4. Basemap changes from OpenFreeMap `dark` to OpenFreeMap `positron`.
5. Still open from before: the product name, whether to name the 2018 team on the About page, and an X bearer token.
6. Phase A implementation notes: `sheet` is `#FCFBF8`, not `#FFFFFF` (pure white glared against paper and broke the warm-paper read; contrast figures are unchanged within 0.1). API-supplied hazard colours are ignored; the UI always uses the `hz-*` tokens so hazard hues stay in their fill-only channel.

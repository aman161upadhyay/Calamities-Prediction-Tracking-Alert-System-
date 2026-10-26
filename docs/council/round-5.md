# Round 5, 2026-10-26, mirror d9c3dc8 (reviewed) → repaired in the following commit

Scope: the redesigned home page `/` only (Phase A of `docs/design/REDESIGN-PLAN.md`): the station shell, the recorder hero with its 24 h / 72 h switch, the paper board with the static plotting sheet (the screenshot browser has no WebGL, so the MapLibre map was reviewed from code), the hazard rail, the signal and alert ledgers, the pipeline schematic, the classifier and the calibration blocks, the footer. Files: `artifacts/calamity-watch/{index.html,src/index.css,src/pages/home.tsx,src/components/layout/shell.tsx,src/components/instruments/*.tsx,src/components/board/*.tsx,src/components/map/static-map.tsx,src/components/sections/*.tsx,src/components/kit.tsx,src/lib/format.ts}` and the API routes behind them by curl.
Deterministic checks: tsc ok (`pnpm --filter @workspace/calamity-watch run typecheck`, run by the builder after repairs and again by the verifier); vite build ok (`PORT=5173 BASE_PATH=/ pnpm --filter @workspace/calamity-watch run build`, 1,844 kB main chunk, the code-splitting is Phase D work); curl reproductions of the API-backed findings on the repaired tree; the verifier executed `stampLead` directly (bundled with esbuild into node) for hour, minute and day precision at positive, zero and negative values; secrets scan clean (mirror script grep). No pytest suite exists and axe was not run; keyboard, screen-reader and contrast were checked by reading the source; the reviewers saw JPEG screenshots at 1440 and 390 (the 1024 capture was also supplied) plus curl output, so hover states, focus rings, the pen-draw motion and the live map stayed unreviewed.

Three fresh reviewers ran as separate subagents with no sight of rounds 1 to 4 or of each other: R-slop (design and writing slop catalogues, uniqueness review), R-user (user advocate plus attacker), R-skeptic (domain expert plus source verifier). Probe counts: R-slop 23, R-user 24, R-skeptic 33. All three answered the direct question "is this AI slop" with no: R-slop called the composition "distinctive, evidence-led" and failed to find a catalogue tell beyond the headline; the objections were to claims and labels, not to the design. The builder (design subagent) repaired the accepted findings in one pass; the main agent fixed the readout overflow at 390 that the repair introduced, the aggregate-only scope of the "(lane, not an alert)" suffix, and the zero case of `stampLead`; a fourth subagent reran every retest on the repaired tree.

Decision of the reviewers before repair: R-slop REVISE, R-user REVISE, R-skeptic REVISE (zero blockers, six majors that collapse to three distinct issues, seven minors; round 4 had zero majors and five minors, but round 4 reviewed the previous design, so this is the first round on the chart room). After repair and verification: ten fixed, three owner-decided (the headline). The round therefore does not meet the README exit rule on the major count and Phase B's round 6 must come back with no new major.

Repairs beyond the findings, made in the same pass: the recorder readout wraps within its frame at 390 (the "(lane, not an alert)" suffix had pushed the rows past the right edge); the suffix now appears only on all-places lanes, because on a place recorder the level is the detector's own; failure states across the app (status bar, status button, board refresh, replay preparation, subscribe form, unsubscribe) speak in ink instead of pen red, so red stays with fear and alerts; the board readout's feed label and the "Official match" glyph put the green on the stamp form and the words in ink; `stampLead` says "same hour as official" when an hour-dated record and the opening fall in the same hour.

## Findings

```json
[
 {
  "id": "r5-slop-01",
  "persona": "R-slop",
  "severity": "major",
  "confidence": 0.99,
  "criterion": "Writing rubric: factual fidelity; catalogue W01/W05; brief §1 explicitly says never claim a lead over official records.",
  "location": "artifacts/calamity-watch/src/pages/home.tsx:84; artifacts/calamity-watch/index.html description, Open Graph and Twitter descriptions; hero at all three supplied widths",
  "observed": "The H1 says 'Hazard warnings read from what people post, before the sirens.' The same unconditional temporal advantage is repeated in page metadata.",
  "expected": "Describe recording and comparing hazard chatter without promising that it precedes official warnings. Any lead claim must be tied to attributable, measured alert and official timestamps.",
  "evidence": [
   "home.tsx:84 contains the quoted H1, visibly dominant in home-1440.jpg, home-1024.jpg and home-390-part-0.jpg.",
   "Read-only /api/alerts returned []; /api/status reported openAlerts: 0 and alerts opened in the last 24 hours: 0. These responses supply no demonstrated live lead.",
   "/api/replay/scenarios describes Kerala as beginning two days after the worst rainfall, California two days after the fires began, and Puebla about 21 hours after the earthquake. These scenarios do not substantiate an unconditional early-warning claim.",
   "/api/model explicitly says a corroboration match shows that an official event existed near an alert, not that the alert caused or predicted it."
  ],
  "reproduction": "Read the H1 and metadata, then GET /api/alerts, /api/model and /api/replay/scenarios and compare their qualifications with the headline.",
  "impact": "A portfolio visitor's first takeaway is a predictive advantage the evidence does not establish. The later research disclaimer does not remove that material claim.",
  "fix": "Replace the final temporal promise with a recording/comparison description, such as 'Hazard chatter, recorded and checked against official reports.' Change the metadata consistently. Preserve actual lead/lag wording where individual evidence establishes it.",
  "falsifier": "A clearly scoped headline connected to independently attributable alert and official-warning timestamps demonstrating the claimed lead would defeat this finding; a general research disclaimer would not.",
  "retest": "Compare H1, description and social metadata with the alert evidence and replay limitations. Confirm that no unconditional lead or prediction claim remains and that genuine measured lead/lag values are preserved.",
  "status": "reproduced",
  "disposition": "owner-decided"
 },
 {
  "id": "r5-slop-02",
  "persona": "R-slop",
  "severity": "minor",
  "confidence": 0.99,
  "criterion": "Catalogue D03/T06/N01; brief §4 readable measure and §7 narrow composition; uniqueness review requires task fit, not just distinctive styling.",
  "location": "artifacts/calamity-watch/src/components/sections/model-blocks.tsx:18-28; generated-artifacts/council/round-5/home-390-part-1.jpg and home-390-part-2.jpg, The models",
  "observed": "The desktop three-column calibration table survives unchanged on mobile. Accuracy and F1 cells are nowrap, leaving the long dataset label wrapping into a very narrow column. The first cross-dataset label runs through many short lines and across the supplied screenshot-part boundary.",
  "expected": "Keep the dataset identity, evaluation qualifications and paired metrics readable together at 390px without allocating almost all usable width to the numeric cells.",
  "evidence": [
   "ModelSummary renders the full API dataset description in the row header and applies whitespace-nowrap to both metric columns, with no narrow-layout alternative.",
   "home-390-part-1.jpg visibly wraps the HumAID evaluation label into roughly two- or three-word lines while the metrics remain on a single line; part-2 continues the table.",
   "The source API label importantly discloses that held-out events were used to pick the shipped candidate; this qualification must not be lost merely to shorten the row."
  ],
  "reproduction": "Inspect the supplied 390px model screenshots and compare the row structure with ModelSummary's three-column table and nowrap metric cells.",
  "impact": "The secondary job of judging model quality becomes disproportionately laborious on a phone, despite the rest of the page's deliberate mobile treatment.",
  "fix": "At narrow widths, give each dataset label its full available row width and place its named accuracy/F1 values together below it. Keep concise evaluation labels and preserve the selection-use qualification in nearby readable text or the linked certificate.",
  "falsifier": "A 390px rendering in which dataset names and evaluation qualifications retain a normal reading measure while their metrics remain adjacent would defeat this finding.",
  "retest": "Inspect the revised calibration section at 390, 1024 and 1440. Check the longest cross-dataset label, both metric values and the held-out-selection qualification; do not solve the problem by shrinking type or deleting caveats.",
  "status": "reproduced",
  "disposition": "fixed"
 },
 {
  "id": "r5-slop-03",
  "persona": "R-slop",
  "severity": "minor",
  "confidence": 1,
  "criterion": "Catalogue C06/C07 and brief §4: red belongs to fear/alerts; green must remain a stamp form, not a general text accent.",
  "location": "artifacts/calamity-watch/src/components/instruments/schematic.tsx:27; components/board/board.tsx compact legend and official readout; components/instruments/legend.tsx:23; components/instruments/recorder.tsx:387; components/kit.tsx:101; components/sections/classifier.tsx error state",
  "observed": "The pipeline traversal dot is red despite representing processing, and generic operational failures use the fear/alert red. Official legend words and recorder official-readout text use green without the bordered stamp form. The compact mobile legend visibly colours the words 'green square' green.",
  "expected": "Use ink for processing and operational errors with explicit error words/glyphs. Reserve red for the measured fear/alert channel and green for actual stamp-shaped official marks; explanatory prose can stay ink beside the appropriate glyph.",
  "evidence": [
   "PipelineSchematic uses a bg-pen dot for its pipeline-pulse; the reduced-motion CSS leaves that dot at the final stage rather than removing its colour.",
   "ErrorState renders 'Couldn't load {what}.' with text-pen; ClassifierDemo applies #C8102E to the whole classification error paragraph.",
   "LegendPlate renders the plain-text dt 'Square' with text-stamp; Recorder Readout gives its official list text-stamp without a stamp border.",
   "home-390-part-0.jpg shows green text in the compact map legend, matching board.tsx's text-stamp font-semibold span."
  ],
  "reproduction": "Inspect the named source branches and the compact legend in the supplied mobile screenshot; compare their roles against the brief's pen and stamp rules. Error branches were source-inspected, not induced.",
  "impact": "These bounded exceptions dilute the semantic instrument language that makes the redesign distinctive: red can mean pipeline activity or API failure, and green can become ordinary accent text.",
  "fix": "Make the pipeline dot and operational error prose ink. Put an actual small stamp glyph beside ink official explanations, or render official records as the approved bordered stamp. Keep fear traces, alert levels and official marks in their existing channels.",
  "falsifier": "A revised brief explicitly assigning these additional meanings to the channels, or revised source/rendering that eliminates these exceptions, would defeat the finding.",
  "retest": "Audit initial, cursor/readout, status-disclosure and error states for every red/green use. Confirm each red item denotes fear/alerts and each green item is an official stamp form; verify hazards still use labelled fill-only hues.",
  "status": "supported-not-executed",
  "disposition": "fixed"
 },
 {
  "id": "r5-R-user-01",
  "persona": "R-user",
  "severity": "major",
  "confidence": 1,
  "criterion": "Brief §1 forbids claiming a lead over official records; material claims need evidence.",
  "location": "artifacts/calamity-watch/src/pages/home.tsx:84; artifacts/calamity-watch/index.html description and social metadata",
  "observed": "The dominant headline calls these hazard warnings and says they arrive before the sirens, without qualifying that timing as a question being measured.",
  "expected": "Describe experimental detection from public posts without asserting advance warning. Report lead or lag only for individually evidenced comparisons.",
  "evidence": [
   "The supplied 1440, 1024 and 390-top screenshots all prominently display the before-the-sirens assertion.",
   "GET /api/replay/scenarios returned 200: Kerala collection begins after the worst rainfall; several other collections also begin after onset.",
   "GET /api/alerts/396 returned 200 with officialAt 2018-08-20T13:15:00.000Z, openedAt 2018-08-22T03:00:00.000Z and leadMinutes -2265. This is lag, not demonstrated advance warning."
  ],
  "reproduction": "Read the homepage H1 at either supplied width and compare its unconditional timing claim with the replay descriptions and alert 396 comparison.",
  "impact": "A first-time visitor can mistake a retrospective research signal for a proven early-warning service; the footer qualification does not substantiate the headline.",
  "fix": "Replace the warning/advance-timing claim in the H1 and metadata with accurate experimental-monitoring language. Keep evidence-specific lead/lag in alert dossiers.",
  "falsifier": "An explicitly qualified headline that asks whether signals precede warnings, rather than asserts they do, would remove this finding.",
  "retest": "Review H1, description and social metadata; independently compare every remaining advance-timing assertion with its cited alert and official timestamp.",
  "status": "reproduced",
  "disposition": "owner-decided"
 },
 {
  "id": "r5-R-user-02",
  "persona": "R-user",
  "severity": "major",
  "confidence": 0.96,
  "criterion": "Primary job: understand how an alert is produced; chart scope, baseline and alert-level marks must not be confused with the actual per-place detector.",
  "location": "artifacts/calamity-watch/src/pages/home.tsx:73-105; src/components/instruments/recorder.tsx:295-307; artifacts/api-server/src/queries/series.ts:buildTimeline",
  "observed": "The introduction explains each place's baseline, but hero requests omit placeId, producing a global hazard aggregate with its own recomputed baseline, levels and alert ticks. Neither the instrument nor its readout identifies that different scope.",
  "expected": "Explicitly distinguish the global overview's aggregate threshold marks from actual per-place alerts, or plot actual place-level detector series.",
  "evidence": [
   "GET /api/hazards/cyclone/timeline?hours=24 returned 200 with placeId null, placeName null and latest zScore 2.08 / elevated.",
   "GET /api/board returned 200 with openAlerts empty and cyclone maxLevel insufficient. Thus the displayed aggregate level is not the maximum place-level detector state.",
   "The supplied 1024 and 390-top screenshots show cyclone Elevated and historical threshold ticks while the accompanying text says no alert is open, but do not identify global aggregation as another distinction beyond the two-hour rule.",
   "Recorder creates threshold marks from TimelinePoint levels rather than linked alert records."
  ],
  "reproduction": "Compare the two GET responses above, then read the hero explanation and instrument labels. Trace the no-placeId request through buildTimeline's hazardSeries branch.",
  "impact": "The primary explanatory instrument teaches a different baseline/threshold computation without naming it; visitors cannot reliably infer which visible marks represent actual place alerts or open their evidence.",
  "fix": "Label the recorder as a global hazard overview, name its aggregate baseline and distinguish threshold excursions from actual alerts. Prefer actual alert ticks with evidence links and place names if claiming to show alert production.",
  "falsifier": "A visible scope explanation, distinct labeling of aggregate threshold marks, and an unambiguous connection to actual per-place alerts would resolve the issue without changing the aggregate calculation.",
  "retest": "With aggregate elevated but all places insufficient, ask an unfamiliar visitor to identify chart scope and explain why no place alert exists; verify every actual-alert mark opens the corresponding evidence.",
  "status": "supported-not-executed",
  "disposition": "fixed"
 },
 {
  "id": "r5-R-user-03",
  "persona": "R-user",
  "severity": "minor",
  "confidence": 1,
  "criterion": "Brief §1 WCAG AA floor and reviewed fallback parity: interactive map markers need keyboard activation and accessible names.",
  "location": "artifacts/calamity-watch/src/components/map/static-map.tsx:events and ordered marker rendering",
  "observed": "Static official and place markers are SVG groups with click handlers and titles, but no tabIndex, button semantics or keyboard handlers; their enclosing SVG is a single role=img.",
  "expected": "Every actionable marker can be focused, identified and activated by keyboard, or has a complete equivalent accessible control list.",
  "evidence": [
   "Both static marker loops attach onClick to nonfocusable SVG g elements without onKeyDown.",
   "The alternative Places panel supplies place buttons, but the Board does not provide an equivalent list of official-event controls.",
   "The supplied screenshots use this no-WebGL fallback; the normal MapLibre path instead constructs named native buttons."
  ],
  "reproduction": "Inspect the static marker groups and the board's alternative panels. In a no-WebGL browser, Tab through the map and attempt to open an official record without a pointer (interactive reproduction not available in this review).",
  "impact": "Keyboard users lose direct station selection and cannot open official-event readouts through the fallback map.",
  "fix": "Expose semantic focusable marker controls with Enter/Space support and visible focus, or supply an equivalent named list for both places and official events. Avoid hiding interactive descendants under a single image role.",
  "falsifier": "A complete keyboard-operable official-event alternative available on this page would materially narrow the finding; native accessible controls for both marker types would resolve it.",
  "retest": "Disable WebGL at 390 and 1440; use only keyboard and a screen reader to identify and open one place and one official marker, then close the readout and verify focus restoration.",
  "status": "supported-not-executed",
  "disposition": "fixed"
 },
 {
  "id": "r5-R-user-04",
  "persona": "R-user",
  "severity": "minor",
  "confidence": 0.99,
  "criterion": "Brief requires readable content at 390; calibration values must remain available without page-wide overflow.",
  "location": "artifacts/calamity-watch/src/components/sections/model-blocks.tsx:ModelSummary; generated-artifacts/council/round-5/home-390-part-1.jpg and part-2.jpg",
  "observed": "The calibration table's metric columns extend beyond its sheet and the right edge of the narrow screenshot. Long row labels collapse into very narrow vertical stacks while accuracy and F1 cells refuse wrapping.",
  "expected": "All calibration values fit a narrow layout or live in an explicitly scrollable, labeled table region.",
  "evidence": [
   "The 390 part-1 and part-2 images show rightmost F1 content continuing past the calibration frame and being clipped at the image edge.",
   "ModelSummary gives both metric columns whitespace-nowrap and padding, with no overflow wrapper or narrow alternative layout."
  ],
  "reproduction": "Inspect the models section in the supplied narrow screenshots and compare the table cell styles in ModelSummary.",
  "impact": "Visitors on phones cannot read the complete calibration certificate summary and must decipher severely fragmented labels.",
  "fix": "Use stacked labeled metrics on narrow screens, or a contained accessible horizontal-scroll table with a useful first-column width.",
  "falsifier": "An unscaled 390 render showing every value inside a usable contained region would disprove the visual overflow claim.",
  "retest": "Check 390 and 320 widths at default text size and enlarged text; confirm every row label, accuracy and F1 is readable without page-wide horizontal scrolling.",
  "status": "reproduced",
  "disposition": "fixed"
 },
 {
  "id": "r5-skeptic-01",
  "persona": "R-skeptic",
  "severity": "major",
  "confidence": 1,
  "criterion": "Brief §§1, 5: never claim a lead over official records without evidence.",
  "location": "artifacts/calamity-watch/src/pages/home.tsx:84; artifacts/calamity-watch/index.html description, Open Graph and Twitter descriptions",
  "observed": "The primary headline says hazard warnings are read from posts ‘before the sirens’, without qualifying this as an aim or hypothesis.",
  "expected": "The home page describes measured social signals without promising earlier warnings; any lead claim identifies the particular evidence and comparison timestamp.",
  "evidence": [
   "The phrase dominates the supplied 1024 and 390 screenshots and is repeated in all three metadata descriptions.",
   "The live /api/alerts response was []; /api/status reported zero open alerts.",
   "/api/replay/scenarios says Kerala collection begins after the worst rainfall, California begins two days after ignition, and Puebla begins about 21 hours after the earthquake.",
   "src/pages/about.tsx explicitly calls the line an aim and says first replay alerts usually follow official records by hours to days; that qualification is absent from home."
  ],
  "reproduction": "Read the home headline and metadata, then compare the replay descriptions and About-page qualification.",
  "impact": "Visitors receive an unsupported early-warning performance claim at the most prominent point of the portfolio.",
  "fix": "Replace the unconditional temporal promise with observational language, or visibly identify it as the research question. Update metadata too.",
  "falsifier": "A prominently qualified home headline, or published evaluations supporting the stated general early-warning promise, would remove this finding.",
  "retest": "Search public copy and metadata for before/ahead/lead and verify each surviving performance claim against timestamped evidence.",
  "status": "reproduced",
  "disposition": "owner-decided"
 },
 {
  "id": "r5-skeptic-02",
  "persona": "R-skeptic",
  "severity": "major",
  "confidence": 1,
  "criterion": "Brief §1 primary job: understand how an alert is produced; displayed signal scope must match its explanation.",
  "location": "artifacts/calamity-watch/src/pages/home.tsx:73,84–105; artifacts/api-server/src/queries/series.ts:hazardSeries/buildTimeline",
  "observed": "The hero says posts are plotted against each place’s own baseline, but requests hazard timelines without a place. Their baseline and level are calculated over all posts for that hazard, not any individual place. The global level is presented beside the actual per-place alert system without explaining the distinction.",
  "expected": "Either plot identified place/hazard series that actually drive alerts, or explicitly identify the hero as a worldwide aggregate whose levels do not open place alerts.",
  "evidence": [
   "Home requests getGetHazardTimelineQueryOptions(h, { hours: win }); API timeline returns placeId:null and placeName:null.",
   "buildTimeline chooses hazardSeries when placeId is null and computes its own median, robust z and level from that aggregate.",
   "The supplied 1024 screenshot shows Cyclone Elevated, fear 3.08, z 2.1, posts 9 while saying no alert is open.",
   "API cyclone latest point is fearMass 3.083, zScore 2.08, level elevated; /api/board cyclone maxLevel is insufficient and openAlerts is 0. Board levels derive from place series, not this global series."
  ],
  "reproduction": "Compare home’s request and explanatory copy with /api/hazards/cyclone/timeline?hours=24 and /api/board; inspect the two aggregation paths.",
  "impact": "The centerpiece teaches the wrong relationship between the trace, baseline, level and actionable alert evidence.",
  "fix": "Label the aggregate scope and its non-alerting role beside the readout, or show named per-place detector lanes instead.",
  "falsifier": "Evidence that the displayed global series is the series used to open the advertised place alerts, or an explicit adjacent scope distinction, would invalidate this finding.",
  "retest": "Use a case with global elevated and all places insufficient; the page must clearly explain why that global level does not represent an opened place alert.",
  "status": "reproduced",
  "disposition": "fixed"
 },
 {
  "id": "r5-skeptic-03",
  "persona": "R-skeptic",
  "severity": "major",
  "confidence": 1,
  "criterion": "Official corroboration must not be asserted by a feed event’s mere presence; brief requires real evidence rather than assumed confirmation.",
  "location": "artifacts/calamity-watch/src/pages/home.tsx:86; src/components/instruments/recorder.tsx:153–170,253–273; artifacts/api-server/src/queries/series.ts:buildTimeline official marker query",
  "observed": "‘Official records stamp what they confirm’ describes hero stamps that are merely same-hazard records anywhere in the world during the window. No alert or social-post match is required.",
  "expected": "Distinguish contextual official records from spatial/temporal corroboration, and explain that even a matched record is not validation of prediction or of individual posts.",
  "evidence": [
   "For the global timeline, buildTimeline filters official events by scenario, hazard, time and non-null latitude; its distance filter runs only when a place is supplied.",
   "Recorder renders every returned official marker independently of any corroboration state or alert identifier.",
   "Live board has no open alerts, yet the hero displays GDACS and NWS stamps.",
   "Cyclone official records include ARNAB at 15.9,87.2 and THREE-C at 14.9,-176.6; current cyclone place signals include Florida and Charleston. Presence on the same global lane does not establish a match.",
   "/api/model limitations explicitly say a corroboration match shows an official event existed nearby, not that the alert caused or predicted it."
  ],
  "reproduction": "Read the hero confirmation sentence; inspect buildTimeline with placeId:null and the recorder’s stamp rendering.",
  "impact": "The green authority channel lends apparent validation to an aggregate social signal without corresponding evidence.",
  "fix": "Change adjacent copy to ‘Official records shown for context; not matched to this global trace’. Reserve confirmation/corroboration wording for identified matches with their criteria.",
  "falsifier": "A demonstrated matching procedure linking each hero stamp to the displayed social series, with appropriately limited copy, would remove the finding.",
  "retest": "Use distant same-hazard official events and verify that the home page does not call their presence confirmation.",
  "status": "reproduced",
  "disposition": "fixed"
 },
 {
  "id": "r5-skeptic-04",
  "persona": "R-skeptic",
  "severity": "minor",
  "confidence": 1,
  "criterion": "Brief §8: every recorder has units, period and readout; numbers must disclose their meaning.",
  "location": "artifacts/calamity-watch/src/components/instruments/recorder.tsx:201–209,347–378",
  "observed": "The plate says ‘fear index’, the key says ‘fear mass’, and readouts say ‘fear’, but none prints the API’s hourly weighted-sum unit or a numeric baseline median.",
  "expected": "An adjacent explanation defines fear mass per hour as sum(p_relevant × p_fear); the readout exposes the baseline used for comparison.",
  "evidence": [
   "Timeline API unit is ‘fear mass per hour (sum of p_relevant x p_fear)’.",
   "Recorder ignores timeline.unit and prints fearMass, zScore and nRelevant only; baselineMedian is drawn but omitted from Readout.",
   "Supplied 1024 and 390 screenshots show the same abbreviated labels without a visible unit definition."
  ],
  "reproduction": "Compare timeline.unit and baselineMedian with Recorder’s label, legend and Readout fields.",
  "impact": "A visitor cannot tell whether the number is a probability, normalized danger index or accumulated model output, or numerically inspect the comparison baseline.",
  "fix": "Print the weighted hourly-sum definition and add baseline median to the cursor readout.",
  "falsifier": "A visible adjacent definition and baseline value accessible for each selected hour would resolve this.",
  "retest": "Read the recorder without visiting another page and identify the numerator, aggregation period and selected-hour baseline.",
  "status": "reproduced",
  "disposition": "fixed"
 },
 {
  "id": "r5-skeptic-05",
  "persona": "R-skeptic",
  "severity": "minor",
  "confidence": 0.99,
  "criterion": "Source-verification contract: accurately identify the static plotting-sheet land source and map provenance.",
  "location": "artifacts/calamity-watch/src/components/map/static-map.tsx final note; src/components/map/land-110m.ts:1; src/components/layout/shell.tsx:178–184",
  "observed": "The fallback draws Natural Earth land outlines but says ‘no basemap in this browser’; footer map credits list tile-stack sources only and omit Natural Earth.",
  "expected": "State that interactive tiles are unavailable, identify the static Natural Earth plotting sheet, and credit its public-domain provenance separately from tile sources.",
  "evidence": [
   "land-110m.ts identifies Natural Earth 110m public-domain polygons via world-atlas@2.",
   "StaticMap imports these rings and renders a land path, visible in supplied screenshots.",
   "Footer names OpenFreeMap, OpenMapTiles and OpenStreetMap ODbL, but not Natural Earth."
  ],
  "reproduction": "Read fallback note, land module header and footer map credits together.",
  "impact": "The reviewed fallback’s actual geographic source is obscured. This is provenance clarity, not an allegation that public-domain attribution is legally mandatory.",
  "fix": "Use ‘Static plotting sheet · Natural Earth land outlines · interactive tiles unavailable’ and add the public-domain source credit.",
  "falsifier": "Visible fallback-specific Natural Earth provenance elsewhere on the reviewed page would remove the omission.",
  "retest": "Inspect the no-WebGL page and verify its geographic source is identifiable without reading code.",
  "status": "reproduced",
  "disposition": "fixed"
 },
 {
  "id": "r5-skeptic-06",
  "persona": "R-skeptic",
  "severity": "minor",
  "confidence": 0.98,
  "criterion": "Lead/lag wording must respect official timestamp precision.",
  "location": "artifacts/calamity-watch/src/lib/format.ts:187–196 (stampLead)",
  "observed": "stampLead handles day precision specially but ignores hour precision, unlike leadText. An hour-resolution record with leadMinutes:90 becomes ‘lead 90 min’; 150 becomes ‘lead 2.5 h’, implying finer precision than recorded.",
  "expected": "Hour-resolution records use approximate whole-hour wording and retain their precision qualification.",
  "evidence": [
   "leadText checks officialTimePrecision === 'hour' and formats ‘about N h’.",
   "stampLead checks only 'day' before formatting all remaining values as minutes or decimal hours.",
   "Stamp delegates displayed timing to stampLead. No live alert existed to exercise this edge in the supplied home screenshots."
  ],
  "reproduction": "Inspect stampLead with {officialTimePrecision:'hour', leadMinutes:90}; its unconditional formatting path yields ‘lead 90 min’.",
  "impact": "The evidence component can overstate the precision of timing comparisons. This is an inspected edge case, not an observed live-home stamp.",
  "fix": "Share precision-aware duration formatting with leadText and preserve the hour-level approximation in stamp wording.",
  "falsifier": "A validated invariant that hour-precision records can never reach Stamp would make this unreachable.",
  "retest": "Test positive, zero and negative lead values for minute, hour and day precision.",
  "status": "supported-not-executed",
  "disposition": "fixed"
 }
]
```

## Coverage ledger

| Reviewer | Probe | Location | Outcome |
|---|---|---|---|
| R-slop | Persona, catalogue, writing rubric, uniqueness procedure | Four requested reference documents, read with one shell command | Read all criteria. Findings require demonstrated brief conflict, not an authorship guess. |
| R-slop | Supplied 1440 visual | ReadFile home-1440.jpg | Distinctive evidence-led composition. Recorder dominates; map, ledgers and sections have differentiated forms. Full-page image is scaled, so fine text legibility was not inferred from it. |
| R-slop | Supplied 1024 visual | ReadFile home-1024.jpg | Strong left-aligned hierarchy and readable recorder. No first-viewport overflow observed. No claim about unseen lower-page rendering at this width. |
| R-slop | Supplied 390 visuals | Separate ReadFile calls for parts 0, 1, 2 and 3 | Header, recorder, map, stacked pipeline and forms hold together. Model table compression found (02). No emoji or CTA-arrow ornament visible. |
| R-slop | Home content and composition | Shell: list component directories; read home.tsx | Specific lineage, real instrument placement and named actions retained. Unsupported headline found (01). Default recorder is 24h, not the brief's 72h, but the visible switch explicitly discloses the selected window; not inflated into a slop finding. |
| R-slop | Palette audit: C01–C07 | index.css, format usage, instrument and board source, screenshots | No unrelated purple gradient, cream/serif cure, dark/acid-green default or positive-green metric wash. Labels/glyphs supplement levels. C04/C05: no obvious visible failure, but numerical contrast was not independently measured. Channel exceptions found (03). |
| R-slop | Typography audit: T01–T08 | index.css, index.html, home/model source; all images | Archivo and Martian Mono have documented roles; wide display/operational numerals are differentiated. No Inter, gradient word, centred body or indiscriminate tracked-caps heading system. Mono is mostly data/plates. T06/D03 mobile table defect found (02). Fonts are preloaded with swap. |
| R-slop | Layout audit: L01–L07 | Home and board source; 1440/390 images | No repeated three-column feature-grid template or giant KPI hero. Rules fit the record-reading subject (L03 keep). Section/group gaps are deliberate; instrument frames have a functional reason. No additional finding. |
| R-slop | Components audit: K01–K05, K13–K14 | Board, kit, classifier, subscribe and ledger source | Ledgers are rows, not rounded cards; no glass or repeated elevation. Persistent field labels. Static ruled loading feedback exists but no evidence of unnecessary short-action skeleton use. No destructive operation on the reviewed home surface. |
| R-slop | Interaction-source audit: K06–K12 | SubscribeForm, ClassifierDemo, board/readout, kit focus rules | Success follows mutation responses; pending/unconfigured email is explicit; handlers present; focus styling and readout Escape/restoration present. No modal trap demonstrated. Back/filter preservation not applicable to this home review. Source checks only—not interactive verification. |
| R-slop | Motion audit: M01–M07 | CSS, schematic, recorder, dial references | No section reveals, tilt, scroll hijack or count-up. Reduced-motion path leaves content present. Live pen blink has a reduced-motion override. Queue cancellation and normal-motion interaction were not browser-tested; no speculative finding. |
| R-slop | Copy audit: W01–W07 | Home, classifier, subscription, status and footer | Mechanism-specific prose and result-naming buttons retained. Error recovery and empty-state explanation present. No pricing/auth surface. W01/W05 material overclaim found (01); model metrics themselves match API values. |
| R-slop | Imagery/icons audit: P01–P04, I01–I04 | All supplied images; shell and instrument source | Hero is an actual recorder, not floating dashboard art. No logo wall, stock hero, generated lettering, emoji system or glued CTA arrows. Pipeline numbers encode a real stage sequence. Section numbers are editorial navigation, not fabricated process steps. |
| R-slop | Chart audit: D01–D05 | Recorder, station marker, legend and model summary source | Time period, fear readouts and UTC supplied; keyboard chart readout and separate place list exist. Real API data feeds traces. No pie chart. Mobile evaluation-label problem found (02). |
| R-slop | Mobile audit: N01–N05 | 390 images and responsive classes | Sidebar replaced by panel tabs; forms stack and dials wrap. Model table is the residual desktop carryover (02). Native-app permission/back conventions not applicable; keyboard-visible and enlarged-text states not tested. |
| R-slop | Live data authenticity and material claims | curl /api/status, /api/board, /api/alerts, /api/model | Status/model/alerts succeeded. Board output was intentionally cut by head, producing curl's downstream write error; a subsequent full parsed request succeeded. Live alerts empty; model metrics and source limitations authentic. No synthetic KPI finding. |
| R-slop | Recorder/replay corroboration | Node fetch: /api/board, /api/hazards/cyclone/timeline?hours=24, /api/replay/scenarios | All 200. Board had 78 place-signal rows, 148 official events and no open alerts. Timeline included real fear/baseline/readout fields and GDACS records. Scenario timing qualifications support finding 01. |
| R-slop | Semantic token search | rg for plate labels, uppercase/tracking, red/green, arrows/emoji and motion patterns across scoped home components | No emoji/CTA-arrow match. Most hues obey fill-only hazard encoding. Red processing/error and green prose exceptions confirmed (03). Footer Sources/Licences and disclosure sublabels are limited navigation labels, not an eyebrow above every section. |
| R-slop | Ledger duplication check | ReadFile instruments/ledger.tsx | Ledger label is aria-label only, not another visible plate. Suspected duplicate visible plate label disproved; no finding. |
| R-slop | Static fallback specificity | static-map.tsx and supplied board images | Designed graticule, land outlines, shared station geometry and explicit browser-fallback caption—not an error panel. Keep. Fine map labels are small at 390; place-list alternative exists, so no untested primary-job failure asserted. |
| R-slop | Uniqueness: palette/type/density/grouping | Brief §§3–5, CSS and screenshots | Keep paper/ink and wide Archivo as instrument furniture; they are generic alone but justified here. Keep ledger density for records and separate instruments instead of identical cards. No new aesthetic replacement proposed. |
| R-slop | Uniqueness: hero/artifact/motion | Recorder, stamps, station glyphs, schematic and dials | Keep hazard-specific recording/calibration metaphor. A fintech app could retain paper, rules and form controls, but not this recorder/station/feed/calibration composition unchanged. Revise unsupported temporal copy and semantic leaks, not the whole design. |
| R-slop | Pre-script content limitation | index.html | React root is empty before scripts; no server-rendered reading surface. This is a brief constraint mismatch outside the decisive slop findings; observed in source, not tested with JavaScript disabled. |
| R-user | P01: first supplied desktop image | home-1440.jpg | Inspected full composition; distinctive recorder, primary board/replay actions and honest empty alert ledger. Headline finding 01. |
| R-user | P02: narrow first screen and board | home-390-part-0.jpg | Actions and empty-state explanation remain visible. Map has compact legend. No overlapping header controls observed. |
| R-user | P03: narrow lower content | home-390-part-2.jpg | Inspected model continuation, lineage and classifier input; metric overflow supports 04. |
| R-user | P04: persona instructions and source inventory/search | Both persona documents; component directories; source-wide `dangerouslySetInnerHTML`, `innerHTML`, `focus-visible` search | Read both personas. Found global ink focus styling; two map innerHTML assignments and one chart style sink required tracing. No other matching HTML sinks found in app source. |
| R-user | P05: server route, parser, subscriptions and error-handler inspection | routes/index.ts, routes/helpers.ts, queries/subscriptions.ts, app.ts | Actual classifier route is /model/classify, not supplied /classify. Found schema checks, generic 500 response, 64 kB JSON cap, subscription token withholding and pending-only no-email behavior. No issue established. |
| R-user | P06: map and board implementation | hazard-map.tsx, static-map.tsx, board.tsx | Native MapLibre markers have names. Fallback markers fail keyboard parity: 03. Readout has close name, Escape handler and focus restoration. Board tabs have arrow/Home/End logic. |
| R-user | P07: classifier, subscription, metrics, post/alert rows and HTML | sections/*.tsx, board/rows.tsx, index.html | Form labels and explicit errors exist; classifier retains text, subscription errors retain input. Posts/titles use escaped React text. Bare root means no pre-script readable page, contrary to brief, but no additional finding padded. Narrow table supports 04. |
| R-user | P08: live controls and metrics | GET /status; /board; /alerts?limit=1; /model; /replay/scenarios | All 200. Status: live, model ready, email delivery false, zero open alerts. Latest alert body was []; replay scenarios ready and provide historical escape path. Model rule: 7 days, minimum five relevant posts/hour, thresholds 1.5/3/5, two-hour opening. |
| R-user | P09: requested classifier route control and attacks | POST /classify with {text:"Heavy rain in Kochi has flooded the road."}, {}, {text:null}, {text:{$gt:""}}, {text:"   "}, {text:"x".repeat(1001)} | Each 404, error `No route for POST /api/classify`. This is an input endpoint mismatch, not a broken homepage classifier: client uses /model/classify. |
| R-user | P10: parser limits on requested route | POST /classify with {text:"x".repeat(66000)}; raw body `{"text":` | Respectively 413 `Body is larger than 64 kB`; 400 `Body must be valid JSON`. |
| R-user | P11: real classifier control | POST /model/classify with {text:"Heavy rain in Kochi has flooded the road."} | 200; hazard flood, relevance .9454, fear .2689; explanation says Kochi confidence .49 does not feed a place series. No fabricated successful place attribution. |
| R-user | P12: real classifier malformed/oversized inputs | POST /model/classify: {}; {text:null}; {text:{$gt:""}}; {text:"   "}; {text:"x".repeat(1001)}; {text:"x".repeat(66000)}; raw `{"text":` | In order: 400 `text: Required`; 400 `text: Expected string, received null`; 400 `text: Expected string, received object`; 400 `text must contain something other than whitespace`; 400 `text: String must contain at most 1000 character(s)`; 413 `Body is larger than 64 kB`; 400 `Body must be valid JSON`. No bypass. |
| R-user | P13: board query controls and injection | GET /board?hazard=flood; ?hazard=not-a-hazard; ?limit=-1; ?limit=1000000000; ?hazard='%20OR%201%3D1--; ?scenario='%20OR%201%3D1--; ?asOf=not-a-date | First five 200, same 78 place/hazard rows and eight hazards: board ignores unsupported hazard/limit keys rather than using them in SQL. Scenario injection: 400 unknown replay scenario. Invalid date: 400 `asOf must be an ISO 8601 timestamp`. No injection effect. |
| R-user | P14: alert query attacks, paired control | GET /alerts with each exact query from P13 | hazard=flood: 200 []; bad/injected hazard: 400 hazard enum error; limit=-1: 400 `limit: Number must be greater than or equal to 1`; huge limit: 400 `limit: Number must be less than or equal to 200`; injected scenario and invalid date: same scope errors as P13. |
| R-user | P15: post query attacks, paired control | GET /posts with each exact query from P13 | hazard=flood: 200 with 40 rows (first id 31063). All malformed/injection queries rejected with corresponding P14 errors; no SQL effect. |
| R-user | P16: subscription malformed fields | POST /subscriptions bodies {}, {email:"not-an-email",minLevel:"high"}, {email:"r5-user@example.invalid",hazard:"' OR 1=1--",minLevel:"high"}, {email:"r5-user@example.invalid",placeId:-1,minLevel:"high"}, same with placeId:2147483647, {email:"r5-user@example.invalid",minLevel:"root"} | All 400. Respectively email required; invalid email; hazard invalid input; unknown place; unknown place; minLevel invalid enum. No persisted success claimed for invalid requests. |
| R-user | P17: benign subscription and duplicate privacy control | POST /subscriptions {email:"r5-user@example.invalid",minLevel:"high"}, repeated later | Both 201 with id:null, status:pending_verification, emailDeliveryConfigured:false and identical all-places/all-hazards/high-and-above pending message. No token or subscription identifier disclosed. Synthetic pending row remains; no real delivery attempted. |
| R-user | P18: remaining responsive screenshots | home-1024.jpg; home-390-part-1.jpg; home-390-part-3.jpg | Desktop recorder and CTA coherent. Narrow metrics clip (04). Classifier dials, subscription warning and footer remain readable. No additional visual finding. |
| R-user | P19: SVG interpolation, recorder and scope tracing | station-marker.tsx; board.tsx; queries/common.ts | Marker HTML contains calculated numbers and fixed local colors, not post text or official titles. Names use setAttribute; text uses React. No executable untrusted-title interpolation found. Board scope rejects repeated/bracketed known scope fields statically. |
| R-user | P20: alert detail path lookup and corrected inspection | Tried nonexistent pages/alert-detail.tsx; then inspected actual pages/alert.tsx | Initial filename guess failed; no artifact inference from failure. Actual dossier includes summary, corroboration timing/precision, evidence posts and event log. No browser-based navigation performed. |
| R-user | P21: remaining sink, rate limiter, timeline implementation | ui/chart.tsx; lib/rate-limit.ts; queries/series.ts; CSS focus rule | Only dangerous HTML React sink is chart CSS configuration; no untrusted post/title flow found. Fixed-window address limiter exists; flood/bypass not exercised. Timeline no-placeId branch confirms global scope in 02. |
| R-user | P22: live timeline/official/post and replay evidence controls | GET /hazards/cyclone/timeline?hours=24; /official-events?limit=1; /posts?limit=1; /alerts?scenario=kerala-floods-2018&limit=1; /alerts/396 | All 200. Global cyclone elevated while board places insufficient supports 02. Real post and NWS title returned as data. Replay alert 396 has negative lead and detailed events. Evidence API works; no live alert existed to open. |
| R-user | P23: subscription size/parser limits | POST /subscriptions {email:"x".repeat(255)+"@example.invalid",minLevel:"high"}; raw `{"email":`; {email:"x".repeat(66000),minLevel:"high"} | 400 `email: String must contain at most 254 character(s)`; 400 `Body must be valid JSON`; 413 `Body is larger than 64 kB`. No bypass. |
| R-user | P24: harmless HTML canary | POST /model/classify {text:'<img src=x onerror=alert("r5-user")> Flooding in Kochi.'} | 200 JSON; text echoed as data, flood relevance .8492. No browser execution attempted. Combined with sink tracing, no demonstrated stored/DOM XSS; this is not a claim of exhaustive XSS safety. |
| R-skeptic | Read review stances and inspect available inputs | skeptic.md, domain-expert.md; component, ML and screenshot directory listings | Applied strongest-claim, units and boundary-case tests; all supplied screenshots present. |
| R-skeptic | Inspect desktop full-page evidence | home-1440.jpg | Recorder, board, pipeline, metrics, lineage and footer present; no generic-data fabrication established. |
| R-skeptic | Inspect medium hero evidence | home-1024.jpg | Read actual fear/z/post/level figures and GDACS/NWS labels; supports findings 01–04. |
| R-skeptic | Inspect mobile top | home-390-part-0.jpg | Same headline and numeric readout; compact NWS stamps shorten to feed name; global/local scope remains unexplained. |
| R-skeptic | Inspect mobile pipeline/models | home-390-part-1.jpg | Counts 484,484,195,133,106,0,554 and units agree with API. |
| R-skeptic | Inspect mobile models/lineage | home-390-part-2.jpg | Model values and lineage copy checked; no invented metric found. |
| R-skeptic | Inspect mobile bottom/footer | home-390-part-3.jpg | Email provider limitation disclosed; Natural Earth omitted from credits. |
| R-skeptic | Fetch live status | /api/status | isStale:false, last ingest 14:21 UTC, Bluesky/model ready, X/FIRMS unconfigured, email unconfigured; Live state supported. |
| R-skeptic | Fetch board | /api/board | 78 place/hazard rows, 148 official events, no open alerts; per-place maximum levels insufficient at observation. |
| R-skeptic | Fetch 24-hour flood timeline | /api/hazards/flood/timeline?hours=24 | 24 points; latest 1.059 fear, .71 z, 2 relevant posts, insufficient; plotted/readout rounding supported. |
| R-skeptic | Fetch alert evidence availability | /api/alerts | Empty array; no live lead-time claim could be validated from alerts. |
| R-skeptic | Fetch public posts | /api/posts | 50 returned records; real scored posts rather than placeholders. No text redistribution failure established by this probe. |
| R-skeptic | Fetch official events | /api/official-events | 148 records; feed/title/severity/time fields support stamp source labels, not implied global corroboration. |
| R-skeptic | Fetch model | /api/model | Metrics, detector thresholds, limitations and GeoNames count available; general-purpose fear is explicitly not danger in limitations. |
| R-skeptic | Fetch replay catalogue | /api/replay/scenarios | Kerala exists and ready with 7,984 posts; replay CTA valid; most collections explicitly start after onset. |
| R-skeptic | Read model and pipeline rendering | model-blocks.tsx; schematic.tsx | All figures are API-driven, counts do not animate; seven supplied stages rather than hardcoded invented stages. No count/unit discrepancy found. |
| R-skeptic | Inspect status implementations | shell.tsx StatusPlate; status-bar.tsx | Home Live/Stale follows isStale; Replay is route-derived. No current-state contradiction found; inactive-source details live in disclosure. |
| R-skeptic | Inspect static projection and land source | static-map.tsx; land-110m.ts | Longitude/latitude mappings are linear, consistent with equirectangular description; land source is Natural Earth. ‘No basemap’ and credit wording need refinement. |
| R-skeptic | Inspect marker geometry and legend | station-marker.tsx; legend.tsx; board.tsx | Square-root post-size and z/3 ring encodings match legend; 300 km is explicitly disclosed. Board supplies the 72-hour event window. No encoding mismatch found. |
| R-skeptic | Inspect hazard rail | board.tsx HazardRailRow; /api/board | Fear is rolling last hour, delta compares same rolling hour yesterday, rel/24h is relevant count; query implementation supports titles. No arithmetic defect found. |
| R-skeptic | Search temporal claims | src copy and format.ts via lead/before/ahead search | Found unqualified home/metadata headline; About qualifies it. stampLead precision edge recorded separately. |
| R-skeptic | Locate local model evidence | services/ml search | No MODEL-CARD.md found; metrics located at services/ml/model/metrics.json, not services/ml/metrics.json. |
| R-skeptic | Compare local metrics to API | Node deep comparison of every local metrics key against stageOne | Zero differing keys; displayed rounded accuracy/F1 values supported. |
| R-skeptic | Check both recorder windows | Eight /api/hazards/{hazard}/timeline?hours=72 requests; home.tsx window wiring | All eight returned hours:72 and 72 points, 23 Oct 15h–26 Oct 14h; 24-hour flood/cyclone return 24 points. Same win variable drives request and plate; no label/data-hours mismatch found. Default 24 h differs from brief’s 72 h, but is not a false plate. |
| R-skeptic | Inspect aggregate versus place derivations | API queries series.ts, board.ts, hazards.ts | Confirmed distinct global and place baseline/level paths; contextual stamps are not corroboration matches. |
| R-skeptic | Inspect pipeline derivation | API queries/status.ts | Counts query their stated populations; fetched/scored use processing timestamps while relevant/placed use post timestamps. No fabricated total found; these are operational counts, not a strict cohort funnel. |
| R-skeptic | Fetch 24-hour cyclone timeline and compare place geography | /api/hazards/cyclone/timeline?hours=24; saved board response | Latest fear 3.083, z 2.08, Elevated while place maxima insufficient. GDACS events in Indian/Pacific oceans cannot establish confirmation of global chatter by placement alone. |
| R-skeptic | Verify 2018 lineage | reference/original-2018/README.md, tweet_extracter.py, __init__.py, result.csv; about.tsx | Four cities, Azure sentiment/key phrases, .45 threshold, CSV output and Flask interface supported; no lineage fabrication found. |
| R-skeptic | Check font provenance | index.html font URLs; upstream Google Fonts archivo and martianmono OFL.txt | Actual families match credits; both upstream licence files identify SIL OFL 1.1. |
| R-skeptic | Check map source stack | hazard-map.tsx; upstream world-atlas@2/land-110m.json | MapLibre uses OpenFreeMap positron with attribution control. Upstream land file is a Topology with land object and 130 arcs; local source header names it. No claim of a coordinate-by-coordinate ring audit. |
| R-skeptic | Check dataset licence routing | model page dataset section; /api/model datasets | Footer routes to dataset cards/licences; HumAID confidentiality/research-use restrictions and TweetEval/Kaggle provenance are surfaced. No unsupported blanket open licence found. |
| R-skeptic | Inspect timing-stamp boundary | stamp.tsx; format.ts; alert-detail/replay searches | Day precision guarded; hour precision ignored in stampLead. Finding 06 is supported by code, not a live-home observation. |
| R-skeptic | Final source/reference search and worktree inspection | Original key-phrase search, model dataset section, index.css, git status | Read-only inspection; no app/workflow execution or edits. Worktree contains pre-existing modifications/untracked material; none attributed to this review. |

## Dispositions

Verified by a fourth subagent on the repaired tree (checks: the five repaired screenshots, source reads of every touched component, `rg` for `text-pen|text-stamp|#C8102E|#1E7A4A`, two curl GETs of `/api/model`, `stampLead` executed in node, typecheck).

- r5-slop-01, r5-R-user-01, r5-skeptic-01 (the headline claims a lead): owner-decided. The H1 is Aman's tagline for the project and stays. Mitigation present and verified: `index.html` description, og:description and twitter:description describe the comparison with official records without promising a lead; the hero statement says that whether the posts came first is measured per alert and the lag printed when they did not. The question is put to Aman in the next status message.
- r5-R-user-02, r5-skeptic-02 (the hero recorder is a global aggregate without saying so): fixed. Plate reads "all places"; the caption says each lane sums every place for one hazard against the hazard's own 7-day baseline, that a level mark is not an alert and that alerts open per place; the legend says "level mark"; the readout prefixes "All places" and marks lane levels "(lane, not an alert)". Verified in `home.tsx` and `recorder.tsx` and in the 1440 screenshot.
- r5-skeptic-03 (hero stamps read as confirmation): fixed. The statement no longer says records stamp what they confirm; aggregate lanes carry "official record (context)" in the legend; the caption says the stamps are the feeds' records for that hazard, from anywhere, not matches to this trace.
- r5-slop-03 (semantic colour leaks): fixed after a second pass. The verifier found the specified spots repaired (schematic dot, ErrorState, classifier error, map and board legends, readout official list) but the wider grep still showed red failure text in the status bar, status button, board refresh, replay preparation and subscribe flows, and green text without a stamp form on the board readout and the dossier; all of those are now ink or stamp forms. Remaining red outside traces and glyphs encodes fear (post rows, the fear dial, the classifier bar, the legend words "red ring"), which is the channel's meaning.
- r5-slop-02, r5-R-user-04 (calibration table clipped at 390): fixed. Below 640 px the table stacks with every caveat kept; verified in the 390 captures and against `/api/model`.
- r5-R-user-03 (static map markers not keyboard reachable): fixed in source. Markers are focusable buttons with names, open on Enter and Space, the svg is a group, focus returns to the marker when the readout closes. Not exercised with a real keyboard.
- r5-skeptic-04 (units and baseline): fixed. "fear mass" everywhere; the caption defines it as the sum over relevant posts of p_relevant × p_fear; the readout prints the hour's baseline median.
- r5-skeptic-05 (Natural Earth provenance): fixed. Note on the static map and credit in the footer.
- r5-skeptic-06 (hour-dated records printed to the minute): fixed. `stampLead` prints "about N h" for hour precision and "same hour as official" when the difference rounds to zero; verified by executing the function.

Decision: REVISE before repair (all three reviewers); after repair and verification, ten findings fixed and three owner-decided. No reviewer called the page AI slop. Round 6 reviews Phase B.

# Round 3, 2026-10-26, tree ffa4780 (reviewed) → repaired in the following commit

Scope: `/` at 1440 and 390, `/replay` (Kerala at 1440, Harvey at 1024), `/alerts`, `/alerts/:id` and `/places/:id` scoped from replay, `/model`, `/subscribe`, `/about`; every `/api` route by curl; `artifacts/api-server/src/{routes/index.ts,routes/helpers.ts,queries/common.ts,queries/replay.ts,queries/status.ts,queries/subscriptions.ts,services/replay.ts,services/detector.ts,services/signals.ts,lib/hazards.ts,lib/rate-limit.ts,app.ts}`; `artifacts/calamity-watch/src/{pages/*.tsx,components/board/*.tsx,components/sections/*.tsx,components/layout/*.tsx,components/charts/charts.tsx}`; `services/ml/model/metrics.json`; `services/ml/scripts/{prepare_data.py,train_stage_one.py}`; HumAID terms of use and the Cardiff emotion model card (fetched).
Deterministic checks: tsc ok (`pnpm -w run typecheck:libs`, `pnpm run typecheck`); vite build ok (bundle unchanged from round 2); confusion-matrix sums by python3 (13,343 test rows, 28,118 held-out rows, every per-class figure agrees with the page); scenario alert counts at each scenario's end equal `alertsOpened` for all five scenarios (after repair); secrets scan clean (mirror script grep). Still no pytest suite and axe was not run; keyboard, screen-reader, zoom and contrast were checked by reading the source, not with assistive technology; the reviewers see JPEGs and curl output, so hover states, focus rings and map interaction stayed unreviewed.

Three fresh reviewers ran as separate subagents with no sight of rounds 1 and 2 or of each other: R-slop (design and writing slop catalogues, uniqueness review), R-user (user advocate plus attacker), R-skeptic (domain expert plus source verifier). Each recorded nine to eleven probes. The builder repaired all seven findings in one pass; a fourth subagent reran every reproduction on the repaired tree (dispositions below carry its evidence) and found no regression.

Decision of the reviewers before repair: R-slop ACCEPT, R-user REVISE, R-skeptic REVISE (two majors, five minors; round 2 had three majors and six minors). After repair and verification: all seven fixed. Both majors were correctness and authorisation defects behind the interface, not presentation: the level shown at a replay playhead lagged the hour the timeline and event log already showed, and the public prepare route accepted `force=true`, which let any visitor delete and renumber a scenario's alerts. This is the third consecutive round that found majors, which the README names as the point to stop and ask; because every finding is closed and nothing is open, one confirmation round (round 4) runs before the question goes to Aman, and it is the last round either way.

## Findings

```json
[
 {
  "id": "R-skeptic-1",
  "severity": "major",
  "confidence": 1,
  "status": "reproduced",
  "location": "artifacts/api-server/src/queries/common.ts:125-142",
  "criterion": "An alert's current level at the replay playhead must reflect the latest completed hour, consistently with its signal and event log.",
  "observed": "Current level reports the preceding hour's classification, contradicting already-known completed-hour data and recorded transitions.",
  "expected": "At these playheads alert 265 should report elevated and alert 280 insufficient.",
  "evidence": [
   "GET /api/alerts/265?asOf=2018-08-18T11:00:00Z returned currentLevel high, while its latest timeline point (10:00 UTC, eight relevant posts, z=1.69) was elevated and its 11:00 event explicitly recorded high to elevated.",
   "GET /api/alerts/280?asOf=2017-08-27T07:00:00Z returned currentLevel elevated despite the latest completed hour (06:00 UTC) being insufficient and the 07:00 event recording elevated to insufficient.",
   "knownHour already subtracts one hour for replays; asOfAdjustments excludes that known hour again at line 126 by subtracting HOUR_MS, then preferentially selects the preceding row."
  ],
  "fix": "Derive currentLevel directly for knownHour(scope), without subtracting a second hour. Treat an absent row for that hour as insufficient, as the detector does, rather than borrowing a prior row or inventing low.",
  "disposition": "fixed"
 },
 {
  "id": "R-user-1",
  "severity": "major",
  "confidence": 0.99,
  "status": "supported-not-executed",
  "location": "artifacts/api-server/src/routes/index.ts:116-122; queries/replay.ts:46-52; services/replay.ts:311-328",
  "criterion": "An anonymous visitor must not be able to invalidate other visitors' replay evidence or trigger administrative rebuilds.",
  "observed": "Source permits anonymous forced rebuilds of shared ready scenarios, including deletion and replacement of the alerts behind evidence URLs.",
  "expected": "Public replay controls reuse ready data; administrative forced rebuilds require authorization and preserve or atomically replace reader-visible data.",
  "evidence": [
   "The public prepare route has no authentication or rate-limit middleware and passes req.query.force === \"true\" to startScenario.",
   "startScenario starts prepareScenario when force is true even if the scenario is already ready.",
   "prepareScenario force-regeoparses posts, then unconditionally deletes scenario alerts and hourly signals before rebuilding; alert events reference alerts with cascading deletion.",
   "The running API returned ready replay data and functioning evidence URL /alerts/265, establishing the shared asset affected. The destructive call was deliberately not executed."
  ],
  "fix": "Reject force on the anonymous route and move forced rebuilds behind an authenticated administrative operation or offline command. Make public preparation idempotent for ready scenarios. Prefer atomic replacement and stable alert identifiers for authorized rebuilds.",
  "disposition": "fixed"
 },
 {
  "id": "R-user-2",
  "severity": "minor",
  "confidence": 1,
  "status": "reproduced",
  "location": "artifacts/api-server/src/queries/common.ts:20-29 (parseScope)",
  "criterion": "Malformed scenario/asOf parameters must fail explicitly rather than silently change the requested data scope.",
  "observed": "200 live snapshot for malformed replay scope.",
  "expected": "400 explaining that scenario and asOf must each be a single valid string when supplied.",
  "evidence": [
   "GET /api/board?scenario=kerala-floods-2018&scenario=nope returned 200 with scenario:null and a current asOf.",
   "GET /api/board?scenario[]=nope and /api/board?asOf[]=bad both returned 200 live snapshots.",
   "Benign single-valued replay parameters returned historical data; ordinary invalid scalar scenario and timestamp returned 400.",
   "parseScope accepts only string values but silently defaults other present types to live/current time."
  ],
  "fix": "Reject present non-string scenario/asOf values, including repeated query parameters, before applying defaults; share this validation with alert asOf parsing.",
  "disposition": "fixed"
 },
 {
  "id": "R-skeptic-2",
  "severity": "minor",
  "confidence": 1,
  "status": "reproduced",
  "location": "artifacts/calamity-watch/src/pages/replay.tsx:138-140,158-168,197-202; artifacts/api-server/src/services/replay.ts:324-328",
  "criterion": "The replay's complete-run alert total must be reachable within its playable time span.",
  "observed": "Fourteen alerts are counted, but only thirteen have opened by the latest playable instant.",
  "expected": "The playable endpoint and full-run query should include the completed final hour and all fourteen counted alerts.",
  "evidence": [
   "GET /api/replay/scenarios reports Harvey endsAt 2017-09-01T23:59:46.094Z and alertsOpened 14.",
   "GET /api/alerts?scenario=hurricane-harvey-2017&asOf=2017-09-01T23:59:46.094Z&limit=200 returns 13 alerts; querying at 2017-09-30T00:00:00Z returns 14, including Houston cyclone alert 284 opened 2017-09-02T00:00:00Z.",
   "The detector processes through the end of the final post's hour, but the player clamps to the final post timestamp and floors the request time to a 15-minute boundary. Its full-run alert query also uses the unextended endsAt."
  ],
  "fix": "Expose a separate replay completion timestamp at the next hour boundary after the final post and use it for the player's maximum clock and final-alert query; retain the last-post timestamp for collection-span descriptions.",
  "disposition": "fixed"
 },
 {
  "id": "R-slop-1",
  "severity": "minor",
  "confidence": 1,
  "status": "reproduced",
  "location": "artifacts/api-server/src/queries/status.ts:72; artifacts/calamity-watch/src/components/board/status-bar.tsx:62; / desktop status bar",
  "criterion": "Every number must have a truthful label; distinguish official hazard corroboration feeds from weather context.",
  "observed": "Weather context increases both the numerator and denominator of the 'official feeds' coverage count.",
  "expected": "Show '3 of 4 official hazard feeds ok' for the observed state, with Open-Meteo separately labelled as weather context.",
  "evidence": [
   "board-1440.jpg displays '4 of 5 official feeds ok'.",
   "GET /api/status returned officialFeeds containing GDACS, USGS, NWS, FIRMS and Open-Meteo; FIRMS was not_configured and the other four were ok.",
   "queries/status.ts:72 includes openmeteo in officialFeeds, while detector.ts:211-221 matches officialEventsTable and the displayed corroboration copy names GDACS, USGS, NWS and FIRMS. Open-Meteo is separately described as forecast context."
  ],
  "fix": "Exclude Open-Meteo from the official hazard-feed count while retaining its separately labelled health information.",
  "disposition": "fixed"
 },
 {
  "id": "R-slop-2",
  "severity": "minor",
  "confidence": 1,
  "status": "reproduced",
  "location": "artifacts/calamity-watch/src/components/board/board.tsx:278-284; / at 390px",
  "criterion": "Design catalogue D01 and responsive-content floor: the map-as-instrument must retain its encoding explanation on a phone.",
  "observed": "The map encodings remain, but their only legend is hidden on phones.",
  "expected": "Keep a readable legend or an explicitly labelled, keyboard-accessible legend disclosure at narrow widths.",
  "evidence": [
   "board-1440.jpg has a three-line map legend naming relevant posts/hour, hazard fill, fear z-score rings and official-event outlines over 72 hours.",
   "board-390.jpg and a fresh 390×844 preview screenshot show no corresponding legend.",
   "MapLegend applies 'hidden sm:block'; the explanation is therefore removed below the small-screen breakpoint in either rendering mode."
  ],
  "fix": "Place a compact legend beneath the phone map, or expose the same text through a labelled disclosure; do not obscure the map or remove its decoding information.",
  "disposition": "fixed"
 },
 {
  "id": "R-slop-3",
  "severity": "minor",
  "confidence": 1,
  "status": "supported-not-executed",
  "location": "artifacts/calamity-watch/src/pages/home.tsx:43; components/sections/model-blocks.tsx:9-12",
  "criterion": "Copy must match the code and every explicit number must be supported.",
  "observed": "The introduction promises six stages while its data-driven list renders seven.",
  "expected": "The introductory count and rendered structure agree, with official-feed ingestion distinguished if it is parallel rather than a sequential stage.",
  "evidence": [
   "Home's How it works lead says 'Six stages run every few minutes.'",
   "GET /api/status returned seven pipeline entries: fetched, scored, relevant, geolocated, series, alerts and official.",
   "PipelineList numbers every returned entry as Stage i+1; fix-model-caption-1440.jpg visibly includes Stage 7, Official events."
  ],
  "fix": "Remove the hard-coded count ('The pipeline runs every few minutes'), or separate six post-processing stages from official-feed ingestion and label that relationship explicitly.",
  "disposition": "fixed"
 }
]
```

## Coverage ledger

| Reviewer | Probe | Location | Outcome |
|---|---|---|---|
| R-slop | Apply design catalogue and uniqueness review to desktop board and Kerala replay screenshots. | generated-artifacts/council/round-3/board-1440.jpg; replay-kerala-1440.jpg | Map occupies the principal workspace; dense hazard/alert rails support it. Flat surfaces, legible operational typography, labelled risk badges and subject-specific encodings retained. No decorative gradient, glow, glass, centred marketing hero or decorative KPI row found. |
| R-slop | Compare narrow board with desktop and capture a fresh narrow preview. | generated-artifacts/council/round-3/board-390.jpg; / at 390×844; components/board/board.tsx | Intentional tabs replace desktop rails and navigation collapses. Missing phone legend reproduced as R-slop-2. WebGL fallback itself excluded by instruction; GPU rendering and touch interaction not verified. |
| R-slop | Review intermediate replay layout, timeline labelling and copy. | generated-artifacts/council/round-3/replay-harvey-1024.jpg; pages/replay.tsx; components/charts/charts.tsx | Map, replay clock, speed units, key moments and historical/live distinction remain visible. Timeline names metric and period and offers a table alternative. No generic hero or ornamental chart found. Playback interaction not executed. |
| R-slop | Review alerts and subscription screenshots and their rendered-copy sources. | generated-artifacts/council/round-3/alerts-1440.jpg; subscribe-1440.jpg; pages/alerts.tsx; pages/subscribe.tsx; components/sections/subscribe-form.tsx | Empty alerts explain absence and link to replay. Subscription has persistent labels and clearly discloses missing email provider before entry. No unsupported delivery-success claim observed. No subscription requests made. |
| R-slop | Apply catalogues to all four supplied About, alert-detail and Model reference screenshots. | generated-artifacts/council/round-2/fix-about-1440.jpg; fix-alert-related-1440.jpg; fix-model-caption-1440.jpg; model-1440-full.jpg | Left-aligned reading copy and evidence-led tables fit their tasks. Limitations, historical-text withholding and related-hazard qualification are explicit rather than placeholder prose. Older Model screenshot treated as pre-caption-change context, not evidence against the current caption. |
| R-slop | Audit rendered strings across every pages/*.tsx and components/{board,sections,layout}/*.tsx file. | artifacts/calamity-watch/src/pages; artifacts/calamity-watch/src/components/board; components/sections; components/layout | Concrete task-oriented CTAs, recovery text and measured limitations largely retained. Six-versus-seven pipeline count supported as R-slop-3. Fear index headings are accompanied by fear-mass units; level badges and z-score values are separately labelled. |
| R-slop | Verify status-bar coverage numbers against the live response and source classifications. | GET /api/status; queries/status.ts; components/board/status-bar.tsx | R-slop-1 reproduced: Open-Meteo weather context is included in the official-feed count. X unconfigured and FIRMS unconfigured are disclosed; absence of an X token is not a finding. |
| R-slop | Read model API copy, detector/replay implementation strings and summary generator; compare live scenario metadata. | queries/model.ts; services/detector.ts; services/replay.ts; lib/summary.ts; GET /api/replay/scenarios | Five scenario post counts and date spans agree with their returned descriptions. Summaries explicitly label peak-hour count, timestamp and robust z comparison. Limitations disclose general-purpose fear probabilities, sparse coverage, replay collection delays and corroboration not implying prediction. External historical claims were not independently source-verified. |
| R-slop | Inspect source accessibility and state affordances without claiming interaction completion. | components/board/board.tsx; components/charts/charts.tsx; components/sections/classifier.tsx; components/layout/shell.tsx; index.css | Found explicit focus outline, board-tab arrow-key handling, chart table alternatives, labelled classifier input, retained classifier result on error and reduced-motion rules. Manual keyboard, screen-reader, zoom and measured contrast tests not executed; no accessibility compliance claim made. |
| R-user | Phone/desktop board reading, menu, tab focus order and evidence entry points | board-390.jpg; board-1440.jpg; components/board/board.tsx; components/layout/shell.tsx | 390 px screenshot retained map and Alerts/Feed/Places/Hazards controls. Source provides arrow/Home/End tab navigation, native alert links and a place list alternative. Desktop layout readable. No interactive keyboard or assistive-technology execution was available. |
| R-user | Replay selection, controls, playhead and evidence links | /replay; pages/replay.tsx; replay-kerala-1440.jpg; replay-harvey-1024.jpg | Source supplies buttons, labelled range input, speed pressed states and bounded restored playhead. Scenario/model/example endpoints returned 200. Forced administrative preparation was reviewed only, yielding R-user-1; no training or preparation was started. |
| R-user | Replay alert, evidence and return navigation; fresh full-page 390 px screenshot | /alerts/265?scenario=kerala-floods-2018&asOf=2018-08-18T12:00:00Z; pages/alert.tsx; components/board/rows.tsx | API returned alert 265 with 20 evidence posts, three events and 50 timeline points. Phone rendering showed replay disclaimer, corroboration, evidence and event log without visible clipping. Source preserves scenario/playhead in Back to replay and place links; timeline has a table control. |
| R-user | Place reached from alert and onward navigation | /places/286?scenario=kerala-floods-2018&asOf=2018-08-18T12:00:00Z; pages/place.tsx | 200 Kerala detail with four alerts, 20 recent posts and null historical weather. Source preserves replay scope for alerts/posts and back link; table is horizontally scrollable and subscription link carries the place ID. |
| R-user | Classifier labels, keyboard controls, HTML, non-English, empty, whitespace, wrong types, 5,000-character and oversized input | components/sections/classifier.tsx; POST /api/model/classify | Empty/5,000-character/number/null inputs returned 400; HTML and Spanish returned 200 scores. React text rendering provides no HTML execution sink. Whitespace-only API text returned misleading 503 after trimming, but the UI disables such input. A 70,011-byte JSON body returned 413; malformed JSON returned 400. Result region is polite live and retains prior successful output on failure. |
| R-user | Subscription form, duplicate enumeration and invalid place | subscribe-1440.jpg; components/sections/subscribe-form.tsx; POST /api/subscriptions | Exactly three requests, all using council-r-user@example.invalid: valid and duplicate returned identical 201 pending responses with id:null and no token; invalid place returned 400. Form labels and error/status regions exist. Screenshot and API explicitly disclose absent email delivery, so completed confirmation/delivery could not be tested. |
| R-user | Confirmation/unsubscribe token handling and response leakage | /api/subscriptions/verify; /api/subscriptions/unsubscribe; queries/subscriptions.ts | Synthetic invalid tokens returned generic invalid responses with id:null; missing verification token also returned invalid. Source uses random 24-byte tokens and parameterized equality lookups; no email/filter details returned. Valid-token ownership flow was not executed because delivery is unavailable. |
| R-user | Route validation, enumeration, injection and replay/asOf isolation | routes/index.ts; routes/helpers.ts; queries/common.ts; queries/places.ts | Unknown scalar scenario/hazard, malformed scalar timestamps, negative timeline/event hours, excessive post limit, negative place ID and invalid alert status returned 400. SQL-like place search returned an empty array, not expanded results. Valid board/hazards/posts/model/official-events requests returned 200. Repeated/array scopes yielded R-user-2. |
| R-user | Missing resources, future replay evidence and error recovery | /api/healthz; /api/missing; /api/places/999999999; /api/alerts/999999999; pages/not-found.tsx; components/error-boundary.tsx | Health returned 200; missing route/place/alert and alert before its opening returned 404. Invalid alert asOf returned 400. Source maps resource 404s to a recovery page with board/alerts links, supplies retry controls and resets the error boundary on route change. Rendered 404 interaction was not exercised. |
| R-user | Rate limits, request-size limits, token logging and preparation authorization | lib/rate-limit.ts; app.ts; routes/index.ts | Source limits classification to 30/minute and subscriptions to 10/15 minutes per proxy-derived IP; exhaustion/IP-spoofing was not tested against the shared deployment. JSON 64 kB rejection was executed. Normal request serializer strips query strings. Verify/unsubscribe have no limiter but use unguessable bearer tokens; no enumeration leak reproduced. Public force preparation lacks equivalent protection. |
| R-skeptic | Independently recompute headline and per-class metrics from both confusion matrices with python3 and compare source/API populations. | services/ml/model/metrics.json; artifacts/calamity-watch/src/pages/model.tsx; GET /api/model | Passed: test n=13,343, accuracy=0.9549576557, macro-F1=0.9197824709; relevant-only n=8,343, accuracy=0.9289224500; generic n=5,000. Every class precision/recall/F1/support agrees. Unseen relevant n=28,118, accuracy=0.8062451099, four-supported-class macro-F1=0.8371569402. Relevance's 14,133-row population is distinguished correctly; no relevance confusion matrix is supplied for independent recomputation. |
| R-skeptic | Check training, evaluation and candidate-selection descriptions against implementation. | services/ml/scripts/prepare_data.py; services/ml/scripts/train_stage_one.py; artifacts/calamity-watch/src/pages/model.tsx | No material contradiction: 14 events train/dev versus supplied test splits, five events held out of training but used for candidate selection, and separate Kaggle relevance evaluation are disclosed. No training executed. |
| R-skeptic | Compare detector rule, units, thresholds, baseline and persistence with user-facing explanations. | artifacts/api-server/src/services/detector.ts; services/signals.ts; lib/config.ts; lib/stats.ts; board/alerts/model copy | No additional finding: seven-day zero-filled robust baseline, MAD floor, five relevant posts, elevated z>=1.5, consecutive elevated hours and three low/insufficient hours to close are implemented. Live may use the current partial hour; copy does not promise two fully completed live hours. |
| R-skeptic | Trace corroboration's radius, active interval, compatible hazard mapping, and displayed precision/relation. | artifacts/api-server/src/lib/hazards.ts; queries/common.ts; services/detector.ts; pages/alert.tsx | No additional finding: matching uses max(250 km, place extent), active-interval overlap with -24/+48 h, 72-hour missing-end fallback and configured directed compatibility lists. Alert copy distinguishes related hazards and day/hour precision rather than presenting matches as predictions. |
| R-skeptic | Compare full-run outcome counts, earliest alerts, official source metadata and time precision. | GET /api/replay/scenarios; GET /api/alerts for all five scenarios; services/replay.ts; pages/replay.tsx | First-alert timestamps agree across metadata and API. Counts at supplied late checkpoints are Harvey 14, Kerala 8, California 9, Puebla 6, Idai 1. Source metadata distinguishes historical records; Idai day-only timing avoids minute lead claims. Actual terminal-playhead queries expose R-skeptic-2. |
| R-skeptic | Inspect all 150 returned posts' places against their local replay texts, including names, homonyms and low-confidence scenario anchors. | GET /api/posts?scenario=hurricane-harvey-2017&asOf=2017-08-28T12:00:00Z&limit=50; analogous Kerala and California requests | No systematic geographic error established in these samples. Texas/Louisiana, Kerala/local cities and California/Paradise resolve plausibly. Some place mentions are missed. Posts without resolved mentions have confidence-0.3 scenario anchors, excluded from signals by the confidence floor. Public API text is withheld as promised. |
| R-skeptic | Inspect board place lists for implausible destinations and compare signal data with alert hydration. | GET /api/board for Harvey 2017-08-28T12:00Z, Kerala 2018-08-18T12:00Z, California 2018-11-12T12:00Z | Primary place clusters are appropriate. Secondary donor/news locations alone do not establish wrong resolution; isolated Qods/Metro entries are insufficient evidence of a systematic defect. Hydration cross-check produced R-skeptic-1. |
| R-skeptic | Verify HumAID confidentiality and research-use statements against publisher terms and API handling. | https://crisisnlp.qcri.org/terms-of-use.html; https://crisisnlp.qcri.org/humaid_dataset.html; queries/common.ts; model datasets table | Passed for checked claims: publisher requires humanitarian research use and confidential contents, expressly permitting tweet IDs; mapPost withholds replay text. Dataset citations and licence links are present. No broader legal-compliance conclusion claimed. |
| R-skeptic | Verify pretrained emotion metrics and inspect About's numerical claims. | Cardiff emotion model README; GET /api/model; pages/about.tsx | Cardiff README reports micro-F1 0.7169 and macro-F1 0.5464, consistent with displayed rounding. About's five-replay and seven-day claims agree with code; all five first alerts occur after the first listed historical record. Historical 2018 lineage was not independently authenticated beyond source copy. |
| R-skeptic | Capture already-running page to check that the reviewed model surface renders. | Running /model preview; artifacts/calamity-watch/src/pages/model.tsx | Model page rendered with labelled pipeline counts and timestamp; no manifest rendering failure. No browser interaction or keyboard/mobile testing performed under this persona. |
| R-skeptic | Challenge temporal consistency between current severity, completed-hour timeline and event log. | GET /api/alerts/265 and /api/alerts/280 at transition playheads; queries/common.ts | Reproduced R-skeptic-1 on two independent scenarios, including a nonempty elevated hour and a silent insufficient hour. |

## Dispositions

- **R-skeptic-1**: fixed. GET /api/alerts/265?asOf=2018-08-18T11:00:00Z returned elevated, matching its 10:00 timeline point and 11:00 high-to-elevated event. At 10:00,12:00,13:00 playheads it returned high,elevated,insufficient, respectively, matching completed-hour points. GET /api/alerts/280?asOf=2017-08-27T07:00:00Z returned insufficient, matching its empty 06:00 hour and 07:00 transition. At 06:00,08:00,09:00 playheads it returned elevated,high,insufficient, matching timeline/events. artifacts/api-server/src/queries/common.ts:131-158 selects exactly knownHour and defaults missing rows to insufficient. GET /api/board and /api/alerts without asOf both returned 200; live alerts were empty.
- **R-user-1**: fixed. POST /api/replay/scenarios/kerala-floods-2018/prepare?force=true and the same URL with force=false both returned 403 with an operator-action explanation. POST /api/replay/scenarios/kerala-floods-2018/prepare returned 202, state ready. GET /api/alerts?scenario=kerala-floods-2018&asOf=2018-09-12T14:00:00Z&limit=200 was identical before/after, including IDs [271,270,269,268,265,267,264,266]. artifacts/api-server/src/routes/index.ts:119-122 rejects force; queries/replay.ts:49-56 reuses ready scenarios and checks preparationInProgress before starting work. services/replay.ts:368-370 recognizes fresh cross-process progress. artifacts/api-server/src/cli/replay-rebuild.ts:1-10,31-34 confines explicit forced rebuilding to the workspace operator command and documents alert renumbering; lib/api-spec/openapi.yaml:419 documents the same limitation.
- **R-user-2**: fixed. GET /api/board?scenario=kerala-floods-2018&scenario=nope, /api/board?scenario[]=nope and /api/board?asOf[]=bad each returned 400 explaining the parameter must be given once as a plain string. GET /api/alerts/265?asOf[]=bad, /api/alerts?scenario[]=x and repeated scalar asOf on /api/alerts/265 returned 400; bracketed probes on hazards, hazard detail/timeline, places/detail, posts and official-events also returned 400. GET /api/board?scenario=kerala-floods-2018&asOf=2018-08-18T11:00:00Z returned 200 with the requested historical scope; invalid scalar scenario/asOf still returned 400.
- **R-skeptic-2**: fixed. GET /api/replay/scenarios reports Harvey endsAt=2017-09-02T00:00:00.000Z; GET /api/alerts?scenario=hurricane-harvey-2017&asOf=2017-09-02T00:00:00.000Z&limit=200 returned 14, including alert 284. Endpoint queries /api/alerts?scenario=kerala-floods-2018&asOf=2018-09-12T14:00:00.000Z&limit=200, scenario=california-wildfires-2018 at 2018-12-07T17:00:00.000Z, scenario=cyclone-idai-2019 at 2019-04-16T10:00:00.000Z and scenario=puebla-earthquake-2017 at 2017-10-06T08:00:00.000Z returned 8,9,1,6 respectively, each equal to alertsOpened. artifacts/api-server/src/queries/replay.ts:24-26 extends endsAt to the next hour boundary; artifacts/calamity-watch/src/pages/replay.tsx:135-145,158-168 uses it for playback clamping and full-run queries. Hour-aligned endpoints survive the 15-minute request floor unchanged.
- **R-slop-1**: fixed. generated-artifacts/council/round-3/fix-board-1440.jpg visibly reports '3 of 4 hazard feeds ok · weather ok'. artifacts/calamity-watch/src/components/board/status-bar.tsx:38-41,65 excludes openmeteo from both hazard-feed counts and labels weather separately; GET /api/status returned GDACS/USGS/NWS ok, FIRMS not_configured, Open-Meteo ok.
- **R-slop-2**: fixed. generated-artifacts/council/round-3/fix-board-390.jpg shows a readable two-line legend immediately below the map explaining size, fill, ring and official outline/72 h. artifacts/calamity-watch/src/components/board/board.tsx:188-190 supplies the sm:hidden compact legend; :281-286 retains the desktop legend, also visible in fix-board-1440.jpg.
- **R-slop-3**: fixed. artifacts/calamity-watch/src/pages/home.tsx:43 removes the six-stage claim and explicitly says official feeds are read 'alongside' the pipeline. GET /api/status still returns seven pipeline entries; artifacts/calamity-watch/src/components/sections/model-blocks.tsx:9-12 renders those seven numbered entries without contradicting an introductory count.

Verifier's residual note: an operator rebuild (`pnpm --filter @workspace/api-server run replay:rebuild`) still renumbers a scenario's alert ids. Accepted as documented destructive maintenance; evidence URLs are stable across restarts and public requests, not across operator rebuilds.

Repairs beyond the findings, made in the same files: the API reports a scenario as preparing (not failed) while the operator command is writing progress from another process, so a visitor's retry cannot start a second concurrent rebuild; `POST /api/model/classify` with whitespace-only text returns 400 instead of a misleading 503 (R-user's coverage ledger noted it without filing a finding); the OpenAPI prepare operation documents the 202 and 403 responses and the `endsAt` semantics.

Decision: REVISE → fixed; confirmation round 4 follows.

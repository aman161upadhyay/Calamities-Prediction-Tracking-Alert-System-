# Round 4, 2026-10-26, tree 8ca5276 (reviewed) → repaired in the following commit

Scope: `/` at 1440 and 390, `/replay` (Kerala at 1440, Harvey at its end at 1024), `/alerts`, `/alerts/:id` scoped from the Kerala replay, `/model` and `/about` at full height, `/subscribe` at 390; every `/api` route by curl, including malformed-parameter and oversized-body probes; `artifacts/api-server/src/{routes/index.ts,routes/helpers.ts,queries/common.ts,queries/replay.ts,queries/subscriptions.ts,queries/status.ts,services/replay.ts,services/detector.ts,services/signals.ts,lib/hazards.ts,lib/rate-limit.ts}`; `artifacts/calamity-watch/src/{pages/*.tsx,components/board/*.tsx,components/sections/*.tsx,components/layout/*.tsx,components/charts/charts.tsx,components/map/*.tsx}`; `services/ml/calamity_ml/geoparse.py`; `services/ml/model/metrics.json`; the CAL FIRE Camp Fire incident page, the GDACS/ECHO Idai update and the NHC Harvey report (fetched by the reviewers).
Deterministic checks: tsc ok (`pnpm run typecheck`, run by the builder and again by the verifier); vite build ok (`PORT=5173 BASE_PATH=/ pnpm --filter @workspace/calamity-watch run build`; the verifier's own attempt failed only because the config requires those two variables); every scenario's alert count at its end still equals `alertsOpened` (Harvey 14, Kerala 8, California 9, Puebla 6, Idai 1) after the Camp Fire and Idai rebuilds; curl reproductions of all five findings on the repaired tree; secrets scan clean (mirror script grep). Still no pytest suite and axe was not run; keyboard, screen-reader, zoom and contrast were checked by reading the source, not with assistive technology; the reviewers see JPEGs and curl output, so hover states, focus rings and map interaction stayed unreviewed.

Three fresh reviewers ran as separate subagents with no sight of rounds 1 to 3 or of each other: R-slop (design and writing slop catalogues, uniqueness review), R-user (user advocate plus attacker), R-skeptic (domain expert plus source verifier). Probe counts: R-slop 20, R-user 29, R-skeptic 21. The builder repaired all five findings in one pass; a fourth subagent reran every reproduction on the repaired tree (dispositions below carry its evidence) and found no regression.

Decision of the reviewers before repair: R-slop ACCEPT, R-user ACCEPT, R-skeptic ACCEPT (zero blockers, zero majors, five minors; round 3 had two majors and five minors). After repair and verification: all five fixed. This is the first round with no major, so the exit rule in the README is met: no new blocker or major, no more new minors than the previous round, and every minor closed with evidence. It is the final round of the overnight build, as round 3 said it would be.

Repairs beyond the findings, made in the same files: the optimism line of the emotion chart also left the official teal (it was the one remaining non-official use); the emotion chart's first x-axis label no longer clips at the left edge; a scenario rebuild of California and Idai upserted the corrected official events, which renumbered those two scenarios' alert ids (documented operator behaviour; the other three scenarios kept their ids).

## Findings

```json
[
 {
  "confidence": 0.98,
  "criterion": "Design brief token official (#5EEAD4) is reserved for official markers/corroboration, never generic success; design catalogue C07 requires semantic colour meaning.",
  "evidence": [
   "DESIGN-BRIEF.md:36 reserves #5EEAD4 for official markers/corroboration and says never generic success.",
   "SourceChip renders state=ok dots in #5EEAD4; the non-stale Live dot uses the same value.",
   "Supplied board screenshots show teal Live/healthy-source dots alongside teal official-event outlines."
  ],
  "expected": "Health status uses a neutral or separately specified token; official teal remains an evidence-channel colour.",
  "falsifier": "An approved revised brief explicitly permitting the shared semantic colour would remove this contract violation.",
  "fix": "Use the existing muted neutral for healthy source/live dots, retaining the explicit Live/ok labels and stale warning colour.",
  "id": "r4-slop-01",
  "impact": "A deliberately reserved evidence colour also means service health, weakening the distinction between operational availability and official corroboration. Explicit labels bound the confusion.",
  "location": "artifacts/calamity-watch/src/components/board/status-bar.tsx:20,56; board-1440.jpg and board-390.jpg",
  "observed": "Official teal is reused for generic healthy/live status.",
  "persona": "R-slop",
  "reproduction": "Read the two status-bar colour expressions and compare the Live/source dots with the official-event legend in board-1440.jpg.",
  "retest": "Inspect desktop/mobile board status bars and an alert corroboration panel: generic health dots should no longer use #5EEAD4, while official evidence should.",
  "severity": "minor",
  "status": "reproduced",
  "disposition": "fixed"
 },
 {
  "confidence": 0.99,
  "criterion": "Navigation from a replay signal should preserve its historical context or explicitly identify a switch to live data.",
  "evidence": [
   "replay-kerala-1440.jpg shows Flood Severe and a Detail link at playhead 18 Aug 2018 12:00 UTC.",
   "HazardRailRow builds /hazards/${h.hazard} without scope; Readout's hazard links do the same.",
   "HazardInner calls useGetHazard(hazard, undefined) and builds timeline and event parameters without scenario/asOf.",
   "GET /api/board?scenario=kerala-floods-2018&asOf=2018-08-18T12:00:00Z returned flood maxLevel severe; GET /api/hazards/flood returned maxLevel insufficient and zero open alerts."
  ],
  "expected": "The detail route and API calls retain the selected scenario and time, or the action explicitly says it opens live hazard data.",
  "falsifier": "A scope-preserving navigation layer outside the inspected components intercepts these targets, or the rendered actions explicitly identify the live switch.",
  "fix": "Pass scope through HazardRailRow and Readout hazard links and consume it in HazardPage; alternatively explicitly label these actions as live-only.",
  "id": "r4-user-01",
  "impact": "A visitor following the replay's hazard Detail action sees unrelated present-day measurements instead of further explanation of the historical signal.",
  "location": "artifacts/calamity-watch/src/components/board/board.tsx: HazardRailRow and Readout; artifacts/calamity-watch/src/pages/hazard.tsx: HazardInner",
  "observed": "The historical context is dropped with no live-switch label on the Detail action.",
  "persona": "R-user / user advocate",
  "reproduction": "Open /replay?s=kerala-floods-2018&t=2018-08-18T12:00:00Z and follow Flood Detail. Inspect its target /hazards/flood and the unscoped API calls in HazardInner.",
  "retest": "From Kerala replay, follow each hazard-detail entry point and confirm historical scope and a return link survive, or that live navigation is explicitly announced.",
  "severity": "minor",
  "status": "supported-not-executed",
  "disposition": "fixed"
 },
 {
  "confidence": 0.95,
  "criterion": "Opening a dialog from a keyboard control should expose its content with predictable focus and dismissal.",
  "evidence": [
   "Place buttons only call setSel({ kind: 'place', signal: p }).",
   "Readout renders role='dialog' with an accessible name but no focus effect, ref, Escape handler or focus restoration.",
   "Readout is rendered inside the map before the mobile tabpanel containing the place-selection buttons.",
   "board-390.jpg confirms the map precedes the tabbed controls on the phone layout."
  ],
  "expected": "Focus enters the named readout when opened, Escape closes it, and closing restores the invoking control, without unnecessarily trapping a nonmodal dialog.",
  "falsifier": "An ancestor or imported behavior moves and restores focus for this exact readout, demonstrated by an interaction trace.",
  "fix": "Track the invoking element, move focus to a readout heading or first control on open, support Escape, and restore focus on close.",
  "id": "r4-user-02",
  "impact": "Keyboard and screen-reader users selecting a place on the phone layout remain after the newly inserted readout in DOM order, making its details and Open-place action difficult to discover.",
  "location": "artifacts/calamity-watch/src/components/board/board.tsx: placeList, Readout and mobile tabpanel",
  "observed": "Dialog state changes without managed focus or keyboard dismissal; this conclusion is static, not a browser-executed interaction.",
  "persona": "R-user / user advocate",
  "reproduction": "At 390px, keyboard-select the Places tab, focus a place button and activate it. The source inserts Readout earlier in the DOM while leaving focus on the triggering button; there is no focus-management code.",
  "retest": "Keyboard and screen-reader test at 390px: activate a place, hear/read the dialog, follow its place link, and separately close with Escape and the close button.",
  "severity": "minor",
  "status": "supported-not-executed",
  "disposition": "fixed"
 },
 {
  "confidence": 0.99,
  "criterion": "Public subscription input must reject email addresses that cannot be delivered before recording them.",
  "evidence": [
   "POST /api/subscriptions with email equal to 'a'.repeat(10000)+'@example.invalid' and minLevel='high' returned HTTP 201, status pending_verification and message 'Recorded as pending (all places, all hazards, high and above).'.",
   "createSubscription inserts a new pending row when no provider is configured and no duplicate exists.",
   "A numeric email and an email containing CRLF/Bcc were rejected with 400; a 66,000-character body was rejected with 413, showing the gap is address validation below the body-size cap.",
   "Subscription throttling returned 429 after the configured window threshold, bounding this defect's severity."
  ],
  "expected": "A 400 validation response for an overlength email, with no subscription insertion or delivery attempt.",
  "falsifier": "Evidence that this accepted input is not persisted and is explicitly rejected before any subscription can be recorded; the current source and response indicate otherwise.",
  "fix": "Enforce practical email total-length and local-part limits in the API schema and mirror them in the form; validate before persistence.",
  "id": "r4-user-03",
  "impact": "Anonymous callers can consume pending-subscription storage with impossible addresses and receive apparent acceptance; ordinary accidental overlength addresses also cannot complete confirmation.",
  "location": "POST /api/subscriptions; artifacts/api-server/src/queries/subscriptions.ts: createSubscription",
  "observed": "The impossible email is accepted and reported recorded as pending rather than rejected.",
  "persona": "R-user / security attacker",
  "reproduction": "Before exhausting the per-address rate limit, curl POST /api/subscriptions with JSON {email: 'a'.repeat(10000)+'@example.invalid', minLevel:'high'}. Use only a reserved example.invalid domain.",
  "retest": "Test valid ordinary addresses, a 65-character local part, an over-254-character total address and the 10,000-character input; invalid cases must return 400 without creating pending records.",
  "severity": "minor",
  "status": "reproduced",
  "disposition": "fixed"
 },
 {
  "confidence": 0.99,
  "criterion": "Curated historical timestamps and source descriptions should agree with the cited public record, or explicitly explain uncertainty.",
  "evidence": [
   "GET https://www.fire.ca.gov/incidents/2018/11/8/camp-fire/ reports Date Contained 11/25/2018 8:00 AM; California was on PST, yielding 2018-11-25T16:00:00Z. replay.ts sets endsAt and the fully-contained moment to 2018-11-25T18:00:00Z.",
   "GET https://www.gdacs.org/report.aspx?eventid=1000552&eventtype=TC contains the ECHO 15 Mar 2019 update: 'Tropical Cyclone IDAI made landfall on 14 March at 23.30 UTC close to Beira City.' replay.ts uses 2019-03-14T22:30:00Z and says the hour is not fixed by the source.",
   "GET /api/replay/scenarios exposes the 18:00 Camp containment and 22:30 Idai landfall key moments.",
   "Counterevidence limiting severity: /api/board for California at 2018-11-25T15:59:59Z, 17:00:00Z and 18:01:00Z returned no officialEvents; Idai's first-alert API returns officialTimePrecision day and leadMinutes null."
  ],
  "expected": "Camp containment at 16:00 UTC and Idai's cited landfall at 23:30 UTC, or an explicit explanation citing alternative records for different timestamps.",
  "falsifier": "An identified authoritative alternative record supporting the chosen times, accompanied by corrected source citations and a clear explanation of which event definition is used, would invalidate the mismatch.",
  "fix": "Reconcile both fixtures and their key moments with the cited sources. Explain any retained uncertainty rather than asserting the source lacks an hour.",
  "id": "r4-skeptic-01",
  "impact": "Replay milestone navigation contains bounded historical timing errors (two hours for Camp containment, one hour for Idai landfall). No failed primary job or safety consequence was demonstrated.",
  "location": "artifacts/api-server/src/services/replay.ts:118,125,142,146",
  "observed": "The curated timestamps differ from the cited records; the Idai source note also incorrectly states that no hour is fixed.",
  "persona": "R-skeptic",
  "reproduction": "Fetch the two cited public pages with curl, extract Date Contained and landfall text, convert Camp's local PST time to UTC, and compare with replay.ts and GET /api/replay/scenarios.",
  "retest": "Fetch the cited records again and compare all corresponding official-event and key-moment timestamps; ensure any uncertainty labels and lead-time suppression remain consistent.",
  "severity": "minor",
  "status": "reproduced",
  "disposition": "fixed"
 }
]
```

## Coverage ledger

| Reviewer | Probe | Location | Outcome |
|---|---|---|---|
| R-slop | Inventory allowed source directories, catalogue lengths and supplied images | artifacts/calamity-watch/src/pages; src/components; generated-artifacts/council/round-4 | Located requested files only; no earlier council material opened. |
| R-slop | Read design/writing catalogues and uniqueness procedure against supplied brief | reference/ai-skills/03-agents/design-agent/design-slop/catalogue.md; writing-agent/ai-slop/catalogue.md; design-agent/skills/uniqueness-review/SKILL.md; supplied DESIGN-BRIEF.md | Applied task-fit standard rather than treating familiar controls or all dark palettes as findings. |
| R-slop | Desktop board visual review | generated-artifacts/council/round-4/board-1440.jpg | Map dominates; hazard/feed lists and numeric labels fit operational brief. Minor teal health-token reuse recorded. |
| R-slop | Mobile board visual review | generated-artifacts/council/round-4/board-390.jpg | Map retained, sidebar replaced by tabs, disclosure and specific empty state visible; intended static fallback not flagged. |
| R-slop | Kerala replay visual review | generated-artifacts/council/round-4/replay-kerala-1440.jpg | Historical scope, playhead, event milestones and after-event timing explicit; no unsupported early-warning claim. |
| R-slop | Harvey end-state visual review | generated-artifacts/council/round-4/replay-harvey-end-1024.jpg | Play again and final playhead are clear; 14-alert outcome says first alert followed record by 12 hours. |
| R-slop | Alert evidence visual review | generated-artifacts/council/round-4/alert-392-kerala-1440.jpg | Summary, status, sourced corroboration, units/timeframe and evidence log have distinct roles; text withholding is explained. |
| R-slop | Alerts index visual review | generated-artifacts/council/round-4/alerts-1440.jpg | Empty state explains absence and links to replay; no invented KPI or decorative empty illustration. |
| R-slop | Model full-page visual review | generated-artifacts/council/round-4/model-1440-full.jpg | Tables and ordered pipeline serve actual comparisons; dense long-page copy checked separately in source/API because image is scaled. |
| R-slop | About full-page visual review | generated-artifacts/council/round-4/about-1440-full.jpg | Specific lineage table, limits and live source-state table replace generic marketing sections. |
| R-slop | Mobile subscription visual review | generated-artifacts/council/round-4/subscribe-390.jpg | Persistent field labels and result-naming button; missing provider warning visible before submission. |
| R-slop | Read page copy and data bindings | artifacts/calamity-watch/src/pages/{about,model,replay,alert,alerts,home,place,hazard,subscribe}.tsx | Read concatenated sources then separately inspected About/Model. Mechanism-led copy, scoped replay disclosures and source-bound metrics; no material unsupported claim established. |
| R-slop | Search lexical/claim cues and inventory components | artifacts/calamity-watch/src/pages and src/components | Search for seamless/robust/empower/delve/before/predict/warning/em dash found legitimate robust-z terminology and explicit warning qualifications, not generic slop. |
| R-slop | Read reusable rendered-copy components | artifacts/calamity-watch/src/components/sections/*.tsx; board/rows.tsx; board/status-bar.tsx; kit.tsx; layout/shell.tsx | Specific classifier, error, empty, subscription and evidence language. Pipeline grid represents actual stages, not a feature triplet. Identified minor official-colour reuse. |
| R-slop | GET /api/status | Running app /api/status | modelReady=true, emailDeliveryConfigured=false, X/FIRMS not_configured, three hazard feeds healthy, openAlerts=0; supports visible deployment disclosures. |
| R-slop | GET /api/model | Running app /api/model | Metrics and detector settings supplied; limitations explicitly distinguish fear from danger, selection from blind evaluation, cold starts, weak hazard classes, duplicate witnesses and place-resolution errors. |
| R-slop | GET scoped Kerala alert 392 | Running app /api/alerts/392?scenario=kerala-floods-2018&asOf=2018-08-18T12:00:00Z | Opened 18 Aug 09:00, official record 15 Aug 08:30, leadMinutes=-4350; approximately 73 hours after agrees with screenshot and event log. Summary reports 133 posts and z17.2. |
| R-slop | GET Harvey final alerts | Running app /api/alerts?scenario=hurricane-harvey-2017&asOf=2017-09-02T00:00:00Z | 14 alerts; earliest 397 opened 26 Aug 15:00 against 03:00 record, leadMinutes=-720. Screenshot's 12 hours after is supported. |
| R-slop | GET live alerts | Running app /api/alerts | Zero alerts; index empty-state claim consistent with API. |
| R-slop | GET Kerala final alerts | Running app /api/alerts?scenario=kerala-floods-2018&asOf=2018-09-12T14:00:00Z | Eight alerts; earliest 389 opened 17 Aug 11:00, leadMinutes=-3030. Screenshot's approximately 51 hours after and eight-alert total are supported. |
| R-user | Read the two assigned persona guides and supplied brief; enumerate allowed source directories. | reference/ai-skills/03-agents/adversarial-council-agent/personas/{user-advocate,security-attacker}.md and assigned frontend/server directories | Established user-job and harmless-canary boundaries. No earlier council material or forbidden directory was opened. |
| R-user | Inspect desktop and phone board screenshots. | generated-artifacts/council/round-4/board-1440.jpg; board-390.jpg | Live status, unavailable feeds, hazard readouts, zero-alert explanation and phone tabs are visible. Intended non-WebGL fallback is not a finding. |
| R-user | Compare live board and alerts API with screenshots. | GET /api/status; GET /api/board; GET /api/alerts | 200 responses; status identifies Bluesky working, X/FIRMS unconfigured, model ready and email provider absent. Board returned 46 place-hazard signals and no open alerts; alerts returned []. No secret values or stack traces observed. |
| R-user | Inspect live alert-list empty state and filter implementation. | alerts-1440.jpg; artifacts/calamity-watch/src/pages/alerts.tsx | Empty state explains absence and links to replay. Filter groups use buttons, aria-pressed and URL state, with a clear-filters recovery. |
| R-user | Inspect Kerala replay screenshot and scoped board response. | replay-kerala-1440.jpg; GET /api/board?scenario=kerala-floods-2018&asOf=2018-08-18T12:00:00Z | Historical status and playhead explicit. API returned open alerts 392 and 390, flood severe and cyclone elevated, matching screenshot. |
| R-user | Inspect alert evidence and scoped place drilldown. | alert-392-kerala-1440.jpg; GET /api/alerts/392?scenario=kerala-floods-2018&asOf=2018-08-18T12:00:00Z; GET /api/places/286?scenario=kerala-floods-2018&asOf=2018-08-18T12:00:00Z | Alert 392 open/severe, peak z 17.217, 516 counted posts, 20 evidence entries; opening log gives consecutive-hour z values. Historical corroboration and approximately 73 hours after the record are explicit. Place endpoint returned Kerala and scoped sections. |
| R-user | Inspect Harvey end state and alert lifecycle API. | replay-harvey-end-1024.jpg; GET /api/alerts?scenario=hurricane-harvey-2017&asOf=2017-09-02T00:00:00Z | Screenshot labels end-of-scenario and offers Play again. API returned 14 alerts: two open and twelve closed with closedAt values. An ended replay need not imply every alert has closed. |
| R-user | Inspect scenario controls and available scenarios. | artifacts/calamity-watch/src/pages/replay.tsx; GET /api/replay/scenarios; GET /api/replay/scenarios/kerala-floods-2018 | Five ready scenarios; named controls, range label/aria-valuetext, speed pressed state, preparation failure recovery, and key-moment buttons exist. Kerala's pre-collection official milestone is explicitly labeled before collection. No preparation request was made. |
| R-user | Inspect model/about screenshots and limitations API. | model-1440-full.jpg; about-1440-full.jpg; GET /api/model; pages/model.tsx; pages/about.tsx; components/sections/model-blocks.tsx | Research/not-official limits, lack of prediction proof, training population, selection-set caveat, baseline cold start and place-resolution limitations are disclosed. Full-page model image is small; source/API supplied legible text. |
| R-user | Inspect phone subscription form and its source. | subscribe-390.jpg; components/sections/subscribe-form.tsx; pages/subscribe.tsx | Email/place/hazard/minimum-level controls are labeled; provider absence is disclosed before submission. Errors and pending outcomes are explicit. Actual delivery is unavailable on this deployment, not falsely reported successful. |
| R-user | Inspect keyboard handling, focus, link targets and error states across all assigned frontend files. | pages/*.tsx; components/board/*.tsx; components/layout/shell.tsx; components/sections/*.tsx | Tabs implement roving focus and arrow/Home/End handling; main disclosure has an accessible label; classifier result is live-announced; primary alert/place replay links retain scope. Found readout focus omission and hazard-detail scope loss. Browser/assistive-technology interaction was unavailable. |
| R-user | Compare replay hazard link destination with live API. | components/board/board.tsx; pages/hazard.tsx; GET /api/hazards/flood | Hazard links omit replay scope and destination queries live data. Live flood response was insufficient with zero alerts, unlike severe Kerala replay; finding r4-user-01. |
| R-user | Read server routing, parsers, error middleware, rate limiter and subscription persistence logic. | artifacts/api-server/src/routes/{index,helpers,health}.ts; app.ts; lib/rate-limit.ts; queries/{common,subscriptions}.ts; lib/api-spec/openapi.yaml | Parameter parsing and generic error responses present; JSON capped at 64kB. Forced rebuild route explicitly refuses force; subscription responses omit token/row ID; tokens use randomBytes(24). No unauthorized rebuild or credential access attempted. |
| R-user | Unknown, repeated and bracketed scenario values. | GET /api/board?scenario=no-such-scenario; ?scenario=kerala-floods-2018&scenario=hurricane-harvey-2017; ?scenario%5B%5D=x | All returned 400 with explicit unknown/single-string validation errors; no silent live fallback. |
| R-user | Malformed timestamp. | GET /api/board?asOf=garbage | 400: asOf must be an ISO 8601 timestamp. |
| R-user | Huge and repeated limits. | GET /api/alerts?limit=999999999999; GET /api/alerts?limit=2&limit=3 | 400 for both; max 200 enforced and repeated limit rejected. |
| R-user | Negative and enormous identifiers. | GET /api/alerts/-1; GET /api/places/99999999999999999999999 | Negative alert ID returned 400. Enormous place ID returned generic 500 rather than validation 400; no stack trace or internal path disclosed. |
| R-user | Unknown replay scenario detail. | GET /api/replay/scenarios/no-such-scenario | 404 Scenario not found. |
| R-user | Classifier benign control and supplied-path discrepancy. | POST /api/classify; POST /api/model/classify with text 'Flood water rising in Kerala.' | Supplied shorthand /api/classify returned 404. Actual OpenAPI/frontend route /api/model/classify returned 200, flood relevance .9928, fear .8091 and Kerala; no product route defect claimed. |
| R-user | Classifier wrong type, excessive text, excessive body and malformed JSON. | POST /api/model/classify with text 42; 1001 x characters; 66000 x characters; raw body {"text": | 400 expected string; 400 maximum 1000 characters; 413 body larger than 64kB; 400 valid-JSON error. No internals leaked. |
| R-user | Subscription wrong type, overlength address and excessive body. | POST /api/subscriptions with numeric email; 10000-character local part at example.invalid; 66000-character local part at example.invalid; minLevel high | Numeric email returned 400; 10000-character address returned 201 pending (r4-user-03); excessive body returned 413. No third-party mailbox targeted. |
| R-user | Subscription email header injection. | POST /api/subscriptions with email 'canary@example.invalid\r\nBcc: other@example.invalid' and minLevel high | 400 Invalid email; injection rejected. |
| R-user | Encoded CRLF query injection. | GET /api/board?scenario=x%0D%0AX-Canary%3A%20injected | 400 unknown-scenario JSON with escaped CRLF; no injected response header observed. |
| R-user | Benign synthetic subscription and duplicate response. | POST /api/subscriptions twice with email r4-user-canary@example.invalid and minLevel high | Both returned identical 201 pending responses with id null, no token and emailDeliveryConfigured false. Source supports one pending insertion, not verification; persistence was not queried directly. |
| R-user | Invalid verification and removal tokens. | GET /api/subscriptions/verify?token=harmless-canary; POST /api/subscriptions/unsubscribe with token harmless-canary | Both returned status invalid and id null; no target subscription disclosed or modified. |
| R-user | Subscription rate limit and spoofed proxy headers. | POST /api/subscriptions with numeric email, seven additional requests; then headers X-Forwarded-For: 198.51.100.42 and 198.51.100.43 | Following five earlier counted requests, additional requests 1–5 returned 400 and 6–7 returned 429 with Retry-After 877. Both spoofed-header requests remained 429; no bypass reproduced. |
| R-user | Classifier rate limit with cheap validation failures. | POST /api/model/classify with {text:42}, 32 additional requests | Requests 1–27 returned 400; requests 28–32 returned 429 after earlier counted requests in the window. Repeated invalid requests did not invoke expensive classification. |
| R-user | HTTP availability of all primary page paths. | GET /; /alerts; /alerts/392?scenario=kerala-floods-2018&asOf=2018-08-18T12:00:00Z; /places/286; /replay?s=kerala-floods-2018&t=2018-08-18T12:00:00Z; /model; /subscribe; /about | All returned HTTP 200 text/html. These are route-availability checks, not browser interaction or rendered UI tests. |
| R-user | Review test boundaries and unavailable checks. | Review execution | Used supplied screenshots only; no browser, new screenshot, workflow restart, file edit, forced prepare, third-party email or database inspection. Actual email delivery and interactive keyboard behavior remain unverified. Two reserved-domain pending requests were recorded. |
| R-skeptic | Read persona contracts and verify allowed source paths | reference/ai-skills/03-agents/adversarial-council-agent/personas/{domain-expert,skeptic}.md; six named implementation/model files | Completed; no excluded review directories opened. |
| R-skeptic | Inspect Model and About presentation | generated-artifacts/council/round-4/model-1440-full.jpg; about-1440-full.jpg | Research framing and limitations are visible. Model full-page image is small; detailed figures cross-checked through API and metrics file. |
| R-skeptic | Compare served model figures with artifact | /api/model; services/ml/model/metrics.json | Per-class values, confusion matrix, cross-dataset rows and candidate values match. |
| R-skeptic | Recompute matrix totals and headline metrics | services/ml/model/metrics.json | Row sums 5809,1282,536,5000,716; total 13343; accuracy 0.9549576557; macro-F1 0.9197824709. Unseen matrix totals 28118. No arithmetic defect. |
| R-skeptic | Verify preparation and evaluation denominators | services/ml/scripts/prepare_data.py; train_stage_one.py | Fourteen events train/dev; five replay events excluded from fitting; 20000 generic training negatives and 5000 test negatives. Hazard evaluation excludes non-humanitarian HumAID rows, explaining difference from 14133 overall test rows. |
| R-skeptic | Verify candidate-selection claim | train_stage_one.py:105-116; /api/model | Selection uses unseen-event macro-F1, disclosed in API cross-dataset description. Word candidate 0.837 beats word+char 0.833. Stale script header mentions another rule, but executable code and public claim agree. |
| R-skeptic | Verify detector description against implementation | detector.ts; signals.ts; lib/hazards.ts; /api/model; About screenshot | Seven-day zero-filled per-series baseline, relevance-weighted fear mass, consecutive-hour alert state machine, related-hazard matching and geographic extent matching agree with disclosed behavior. Cold start, copied posts and uncertainty limitations are disclosed. |
| R-skeptic | Fetch HumAID dataset page and terms | https://crisisnlp.qcri.org/humaid_dataset; https://crisisnlp.qcri.org/terms-of-use.html | Terms require humanitarian research use and confidentiality of contents, permitting tweet IDs. Replay withholding and dataset statements are consistent. |
| R-skeptic | Fetch Cardiff emotion model card | https://huggingface.co/cardiffnlp/twitter-roberta-base-emotion-multilabel-latest/raw/main/README.md | Eleven labels and reported micro-F1 0.7169/macro-F1 0.5464 support UI/API rounded claims. No unsupported licence assertion established. |
| R-skeptic | Fetch Cardiff sentiment model card | https://huggingface.co/cardiffnlp/twitter-roberta-base-sentiment-latest/raw/main/README.md | Card confirms approximately 124M tweets, Jan 2018–Dec 2021, TweetEval fine-tuning and three sentiment labels; licence metadata CC BY 4.0. |
| R-skeptic | Inspect replay geographic screenshots and board coordinates | replay-harvey-end-1024.jpg; replay-kerala-1440.jpg; /api/board?scenario=kerala-floods-2018&asOf=2018-08-18T12:00:00Z; /api/board?scenario=hurricane-harvey-2017&asOf=2017-09-02T00:00:00Z | Houston, Texas, Kochi, Kerala and other sampled coordinates/countries are geographically consistent. Distant low-volume mentions do not establish systematic geoparsing error without underlying text. Static fallback is intentional. |
| R-skeptic | Compare all scenario metadata and first alert calculations | /api/replay/scenarios; /api/replay/scenarios/kerala-floods-2018; /api/alerts at scenario ends | Counts 14/8/9/1/6 and first openings agree with scenario summaries. Harvey first alert is 12h after matched landfall; Kerala 50.5h after airport event; California 32h36m after Woolsey start; Puebla 22h45m after quake. Idai suppresses numeric lead for day precision. |
| R-skeptic | Verify rendered first-alert sentences where available | Harvey and Kerala replay screenshots; GET /replay?s=california-wildfires-2018, cyclone-idai-2019, puebla-earthquake-2017 | Harvey 12h and Kerala about 51h sentences agree with API arithmetic. Other three GETs returned client shells, not rendered prose; their UI sentences remain unverified. |
| R-skeptic | Inspect Harvey final alert list | /api/alerts?scenario=hurricane-harvey-2017&asOf=2017-09-02T00:00:00Z | Fourteen alerts; related-hazard corroborations explicitly labeled; leads recompute from opening and official event timestamps. |
| R-skeptic | Test alert-opening boundary in board and alert list | /api/alerts and /api/board, scenario=hurricane-harvey-2017, asOf=2017-08-27T04:59:59Z and 05:00:00Z | 398/404 absent before opening and present exactly at 05:00; pending corroboration and historical peaks rather than eventual peaks. |
| R-skeptic | Test corroboration boundary and next completed hour | /api/alerts and /api/board, Harvey, asOf=2017-08-27T06:29:59Z, 06:30:00Z and 07:00:00Z | 398/404 remain pending before 06:30, become corroborated at 06:30 with +90-minute lead; subsequent counts/levels evolve. No future corroboration leak reproduced. |
| R-skeptic | Fetch NHC Harvey report and NWS summary | https://www.nhc.noaa.gov/data/tcr/AL092017_Harvey.pdf; https://www.weather.gov/hgx/hurricaneharvey | NHC text confirms 26 Aug 0300 UTC and 30 Aug 0800 UTC landfalls. NWS summary supports overnight Houston flooding; extracted text did not independently establish exact 06:30 emergency issuance. Warning-table grep yielded no matching line; exact warning time not independently verified. |
| R-skeptic | Fetch Kerala airport citation | Indian Express URL cited at replay.ts:94 | 403 request blocked, including repeat request. Exact airport closure time not independently verified; no adverse finding inferred. |
| R-skeptic | Fetch CAL FIRE incident records | https://www.fire.ca.gov/incidents/2018/11/8/camp-fire/; https://www.fire.ca.gov/incidents/2018/11/8/woolsey-fire/ | Start times support fixtures. Camp containment yields minor finding. Woolsey current page lists Jan 2019 containment, inconsistent with familiar November containment history; not treated as established defect without resolving record semantics. |
| R-skeptic | Fetch Idai and Puebla records | GDACS event 1000552 TC; USGS FDSN event us2000ar20 | GDACS explicitly supplies 23:30 UTC landfall, contrary to fixture hour/source note. USGS origin epoch 1505844878090 supports 18:14:38 UTC; current nearby-place title differs but is not a material error. |
| R-skeptic | Check Camp containment-boundary board consequences | /api/board?scenario=california-wildfires-2018 at 2018-11-25T15:59:59Z, 17:00:00Z, 18:01:00Z | officialEvents empty at all three times; no board-state consequence reproduced. Finding remains bounded to historical fixture/key-moment accuracy. |

## Dispositions

- **r4-slop-01**: fixed. StatusBar uses #9DA9BC for healthy source dots, #E6EBF2 for Live and #E8B04B for stale. Supplied desktop screenshot visibly separates neutral health from teal official outlines. Shared SourceChip also supplies mobile styling. Frontend grep leaves teal only in official map outlines, chart official-reference lines, event Readout colour, logo mark and --cw-official; optimism is #9AD86B. Alert corroboration panel retains text-official. Mobile and corroboration styling were source-verified, not browser-executed.
- **r4-user-01**: fixed. Source confirms HazardRailRow and both Readout hazard links preserve scenario/asOf with scopeQuery; HazardPage forwards scope to detail, timeline and official-event hooks, preserves place/post links and supplies a scoped replay return link. Supplied hazard screenshot shows replay context, Severe and one alert. Curl detail HTTP 200 returned severe/openAlerts=1; timeline HTTP 200 returned 168 points from 2018-08-11T12:00Z through 2018-08-18T11:00Z. Requested 72-hour events returned []; closure at 2018-08-15T08:30Z is outside that window. A 96-hour window and an earlier scoped 72-hour request both returned the Kerala closure, confirming historical scope/time filtering. Navigation was source-verified, not browser-executed.
- **r4-user-02**: fixed. Readout has tabIndex=-1, dialog role/name and a ref. Its effect captures the previous active HTMLElement, focuses the readout, installs Escape dismissal through an updated onClose ref, and removes the listener/restores connected prior focus during cleanup. Dependency is the primitive selection key (place ID/hazard or event ID), not changing callbacks or refetched objects; ordinary 60-second refetch renders cannot rerun it and steal focus. No focus trap is introduced. Static verification only; keyboard/screen-reader interaction was not browser-executed.
- **r4-user-03**: fixed. Curl POSTs returned HTTP 400 for the 10,000-character local part, 65-character local part, and over-254 total addresses (255/256 tested). Ordinary reserved-domain address and an exactly 254-character total address with a 64-character local part returned HTTP 201 pending. OpenAPI/generated Zod enforce max 254; query validation rejects local parts over 64 before database access, insertion or delivery; form mirrors both limits. Non-insertion is supported by 400 responses and source ordering, not direct database inspection.
- **r4-skeptic-01**: fixed. Fresh CAL FIRE fetch states containment 11/25/2018 8:00 AM (PST = 16:00 UTC); GDACS ECHO 15 March update states landfall 14 March 23.30 UTC. Current fixtures and GET /api/replay/scenarios key moments agree. Requested official-event APIs return Camp endsAt 2018-11-25T16:00:00Z and Idai startsAt 2019-03-14T23:30:00Z. Fixture notes now cite those times and Idai uses hour precision. Idai alerts endpoint returns first alert 420 corroborated by Mozambique national emergency, a related flood record dated 2019-03-19, officialTimePrecision=day and leadMinutes=null, preserving honest timing suppression.

Verifier's checks, in its words:
- pnpm run typecheck: Passed (exit 0): library build and API server, frontend, scripts and mockup-sandbox typechecks completed.
- pnpm --filter @workspace/calamity-watch run build: Failed (exit 1): Vite could not load vite.config.ts because 'PORT environment variable is required but was not provided.' No environment-adjusted retry performed.
- Verification scope: Live API curl reproductions, fresh public-source curl fetches, frontend/source regression inspection and both supplied screenshots completed. No browser interactions executed; no files edited, servers restarted or prepare routes called.

Decision: ACCEPT (all three reviewers); five minors fixed and verified; no further round scheduled.

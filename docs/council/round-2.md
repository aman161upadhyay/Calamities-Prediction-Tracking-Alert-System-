# Round 2, 2026-10-26, tree 4307204 (reviewed) → repaired in the following commit

Scope: `/`, `/alerts/:id` (scoped from replay), `/replay` (Kerala, Harvey, California), `/model`, `/subscribe`, `/about`; `artifacts/api-server/src/{queries/alerts.ts,queries/common.ts,queries/subscriptions.ts,queries/model.ts,routes/index.ts,app.ts}`; `artifacts/calamity-watch/src/{pages/about.tsx,pages/model.tsx,pages/alert.tsx,pages/place.tsx,components/board/board.tsx,components/board/rows.tsx,components/sections/subscribe-form.tsx}`; `services/ml/calamity_ml/{geoparse.py,gazetteer.py,preprocess.py}`; `services/ml/model/metrics.json`.
Deterministic checks: tsc ok (`pnpm -w run typecheck:libs`, `pnpm run typecheck`); vite build ok (2.06 MB bundle, 580 kB gzipped; the map and chart libraries are needed on the first screen, so route splitting would not shrink the first load, accepted); geoparser checks by script (Paradise + California, Texas, Kochi airport, Cali vs Cali/Colombia, "Hurricane-ravaged Houston", "Hurricane, Utah", "George R. Brown", "Florence, South Carolina", the "Man found dead" sentence); confusion-matrix sums by python3 (13,343 test rows, 28,118 held-out rows); secrets scan clean (mirror script grep). Still no pytest suite and axe was not run; the tab pattern was checked by reading the source, not with a screen reader.

Three fresh reviewers ran as separate subagents with no sight of round 1 or of each other: R-slop (design and writing slop catalogues, uniqueness review), R-user (user advocate plus attacker), R-skeptic (domain expert plus source verifier). Each recorded at least four probes. The builder repaired all nine findings in one pass; a fourth subagent reran every reproduction on the repaired tree (dispositions below carry its evidence).

Decision of the reviewers before repair: REVISE (three majors, six minors). After repair and verification: all nine fixed. Because this round found majors, round 3 follows.

## Findings

```json
[
 {
  "confidence": 0.98,
  "criterion": "Material claims must be supported; writing catalogue A04/R07 and consistency of voice.",
  "evidence": [
   "Rendered /about says “Hazard warnings read from what people post, before the sirens” and “whether each alert was later confirmed by an official feed and how far ahead it was.”",
   "GET /api/alerts?scenario=california-wildfires-2018&asOf=2018-12-08T00:00:00Z&limit=200 returned the first alert opened 2018-11-10T07:00:00Z with officialAt 2018-11-08T22:24:00Z and leadMinutes -1956.",
   "GET /api/model explicitly says corroboration shows an event existed nearby, “not that the alert caused or predicted it.”"
  ],
  "expected": "About should distinguish the early-detection hypothesis from demonstrated results and allow alerts to follow official records.",
  "falsifier": "A cited evaluation demonstrating the stated before-warning capability, with defined warning timestamps and scope, would support appropriately scoped wording.",
  "fix": "Describe measuring hazard-related posts and comparing alert timing with official records; replace “how far ahead” with “how long before or after,” and remove or explicitly frame “before the sirens” as an unproven goal.",
  "id": "R-slop-01",
  "impact": "A portfolio visitor receives a materially stronger account of the system's demonstrated capability than the evidence supports.",
  "location": "artifacts/calamity-watch/src/pages/about.tsx:22-25",
  "observed": "The introductory slogan and narrative presume warnings precede official response, whereas the demonstrated first California alert follows its matched record and the model page rejects predictive interpretation.",
  "persona": "R-slop",
  "reproduction": "Screenshot /about, then fetch the California replay alerts at scenario end and /api/model; compare the opening claims with the negative lead time and corroboration limitation.",
  "retest": "Read About beside Model and replay outcomes: all three should preserve the difference between anomaly detection, temporal matching and demonstrated early warning.",
  "severity": "major",
  "status": "reproduced",
  "disposition": "fixed",
  "resolution_evidence": "About source and fresh screenshot distinguish 'before the sirens' as the aim, say 'how long before or after', and acknowledge first replay alerts usually open hours to days after official records. README Alerts bullet makes the same before/after and usually-after qualification."
 },
 {
  "confidence": 0.97,
  "criterion": "Empty-state copy must report the actual absence, not infer an unsupported conclusion.",
  "evidence": [
   "The live empty state reads “No open alerts. No place has broken from its own 7-day baseline.”",
   "Current supplied round-2/board-1440.jpg shows that sentence alongside Cyclone “Elevated” and Teresina “z 3.0.”",
   "GET /api/model reports openAfterHours 2, and detector.ts:110 describes “Two consecutive hours at elevated or above.”"
  ],
  "expected": "Zero open alerts should describe the alert state without ruling out single-hour anomalies or previously closed alerts.",
  "falsifier": "If this branch also verified that no place had crossed baseline, its stronger conclusion could be justified; it currently does not.",
  "fix": "Keep “No open alerts” and explain that opening requires two qualifying hours, rather than asserting no baseline break.",
  "id": "R-slop-02",
  "impact": "Readers can mistake an unconfirmed spike for no anomaly at all, contradicting the nearby signal readout.",
  "location": "artifacts/calamity-watch/src/components/board/board.tsx:89-90",
  "observed": "The empty-state branch tests only openAlerts.length, then asserts that no place has broken baseline.",
  "persona": "R-slop",
  "reproduction": "View a live board with an elevated place but no open alert; the supplied current screenshot captures this state, although the live API no longer returned it during my checks.",
  "retest": "Check zero-alert states with an elevated single-hour signal, after an alert closes, and with no signals; none should make a false historical or current anomaly claim.",
  "severity": "minor",
  "status": "supported-not-executed",
  "disposition": "fixed",
  "resolution_evidence": "Live Board screenshot and board.tsx show the two-consecutive-hours requirement and explain single-hour spikes; the old no-place-broke-baseline empty-state claim is gone."
 },
 {
  "confidence": 1,
  "criterion": "Every material model-performance claim must describe the population actually evaluated.",
  "evidence": [
   "Screenshot and source state: 'Hazard-type figures are computed on the relevant posts of that split.'",
   "Python sums the confusion matrix to 13,343, including a none row of 5,000; hazard_mask in train_stage_one.py explicitly includes tweet_eval_sentiment.",
   "Accuracy over relevant hazard rows alone is 92.8922%, versus the displayed mixed-population 95.4958%; /api/model matches metrics.json."
  ],
  "expected": "Describe the mixed evaluation population explicitly, distinguishing relevant HumAID posts from TweetEval negatives.",
  "falsifier": "The finding would fail if the displayed accuracy excluded generic negatives or the explanatory sentence explicitly included them.",
  "fix": "Correct the headline caption to name both populations and their supports; optionally display relevant-only accuracy separately.",
  "id": "R-skeptic-1",
  "impact": "Readers are given a materially inflated impression of hazard discrimination on relevant disaster posts.",
  "location": "artifacts/calamity-watch/src/pages/model.tsx:38",
  "observed": "The page says hazard-type figures are computed on relevant posts of the 14-event test split, but its 95.5% accuracy includes 5,000 generic no-hazard tweets.",
  "persona": "R-skeptic",
  "reproduction": "Read /model, sum metrics.json confusion rows with python3, and recompute diagonal accuracy excluding the none row.",
  "retest": "Recompute the 13,343 total and 8,343 relevant-post support independently and verify the rendered caption matches the metric denominator.",
  "severity": "major",
  "status": "reproduced",
  "disposition": "fixed",
  "resolution_evidence": "Python calculation from metrics.json: 8,343 relevant + 5,000 generic = 13,343 hazard rows; excluding the none row gives 7,750/8,343 = 92.8922%; full accuracy is 95.4958%; relevance covers 14,133 rows. testPopulation implements this calculation, and the fresh Model screenshot displays these counts and 92.9%."
 },
 {
  "confidence": 0.99,
  "criterion": "Place signals should represent geographic mentions rather than hazard names mistaken for towns.",
  "evidence": [
   "/api/board?scenario=hurricane-harvey-2017&asOf=2017-08-30T12:00:00Z returns Hurricane at 37.17526,-113.28995 with relevantPostsLast24h 14.",
   "The place-filtered posts endpoint returns tweet 902837763707457536 with Houston and Hurricane both at confidence 0.9; local replay inspection identifies Hurricane as the modifier of ravaged Houston.",
   "The resolver treats same-country context as support, lifting the minor-town confidence cap; Hurricane is not excluded by the common-word guard."
  ],
  "expected": "A hazard modifier should not generate a remote town signal merely because another mention establishes the same country.",
  "falsifier": "A genuine reference to the Utah town in that post, or exclusion of that resolution from signal aggregation, would disprove this example.",
  "fix": "Require explicit geographic evidence for hazard-name homonyms and avoid treating country agreement alone as sufficient support for these minor towns.",
  "id": "R-skeptic-2",
  "impact": "The map and place series acquire geographically false activity, although this observed series remains insufficient rather than opening an alert.",
  "location": "services/ml/calamity_ml/geoparse.py:157-205",
  "observed": "Harvey replay assigns Hurricane-ravaged Houston to Hurricane, Utah, with confidence 0.9, and the board counts 14 relevant cyclone posts there in 24 hours.",
  "persona": "R-skeptic",
  "reproduction": "Fetch the Harvey board at the stated time, then /api/posts with the same scope, placeId=1557 and limit=5; compare tweet 902837763707457536 with the local replay record.",
  "retest": "Test Hurricane-ravaged Houston versus Hurricane, Utah; the former should resolve only Houston and the latter should retain the town.",
  "severity": "minor",
  "status": "reproduced",
  "disposition": "fixed",
  "resolution_evidence": "Specified Harvey board returned 200 with neither Hurricane nor Harvey in places. geoparse.py requires strong state-level support for HAZARD_WORD_NAMES and locality cues for STORM_NAMES. George persists only as insufficient with one relevant post/24h; see caveat."
 },
 {
  "confidence": 1,
  "criterion": "Alert evidence must actually support the signal it claims to explain.",
  "evidence": [
   "GET /api/alerts/154?asOf=2018-08-18T12:00:00Z returned post 12144 with Kerala confidence 0.3 and method 'scenario'.",
   "services/signals.ts:56 requires pp.confidence >= DETECTOR.placeConfidenceMin; the evidence query has no confidence or relevance threshold."
  ],
  "expected": "The panel labelled 'the posts that counted toward this alert' must use the detector's eligibility predicates.",
  "falsifier": "Show that these 0.3-confidence associations contributed to this place's detector series.",
  "fix": "Reuse the aggregation eligibility predicates for evidence selection, including place confidence and any relevant-post threshold.",
  "id": "R-user-1",
  "impact": "Excluded posts are presented as contributing evidence and displace actual contributors in the twenty-post sample.",
  "location": "artifacts/api-server/src/queries/alerts.ts:63-64",
  "observed": "Alert 154 includes six posts whose only Kerala attribution has confidence 0.3, although aggregation excludes place confidence below 0.5.",
  "persona": "R-user",
  "reproduction": "Fetch that alert and inspect evidencePosts 12144, 12199, 12019, 12155, 12307 and 11743.",
  "retest": "Assert every returned evidence post meets the same place/hazard eligibility rules as the triggering signal.",
  "severity": "major",
  "status": "reproduced",
  "disposition": "fixed",
  "resolution_evidence": "Evidence query uses both DETECTOR thresholds, each configured as 0.5. All eight Kerala alert details returned 200; all 160 returned evidence entries satisfied pRelevant >=0.5 and had the alert place at confidence >=0.5."
 },
 {
  "confidence": 1,
  "criterion": "Official corroboration claims must describe the match actually performed.",
  "evidence": [
   "Alert 154 has hazard 'cyclone' and corroborating officialEventId 1257; /api/official-events identifies 1257 as hazard 'flood'.",
   "lib/hazards.ts:53-61 permits cyclone/flood/storm and other cross-hazard matches; /api/model limitations also say 'same hazard'."
  ],
  "expected": "Disclose cross-hazard matching and distinguish related-event context from confirmation of the detected hazard.",
  "falsifier": "Demonstrate the cited historical record establishes a cyclone rather than only flooding.",
  "fix": "Expose the matched hazard and matching rule, qualify related-hazard corroboration, and correct model/alert explanations.",
  "id": "R-user-2",
  "impact": "A classifier's wrong hazard can appear independently confirmed by an official source.",
  "location": "artifacts/calamity-watch/src/pages/alert.tsx:79",
  "observed": "A Kerala cyclone alert is labelled corroborated by an airport flood closure while the explanation promises an official record 'of the same hazard'.",
  "persona": "R-user",
  "reproduction": "Compare /api/alerts/154?asOf=2018-08-18T12:00:00Z with /api/official-events?scenario=kerala-floods-2018&asOf=2018-08-18T12:00:00Z&hours=120.",
  "retest": "The Kerala cyclone alert must either remain uncorroborated for cyclone or explicitly say it matches a related flood event.",
  "severity": "major",
  "status": "reproduced",
  "disposition": "fixed",
  "resolution_evidence": "Kerala cyclone alerts located by scenario/time (currently 227 and 228) carry officialHazard=flood and hazardRelation=related. Fresh alert screenshot explicitly says flood record, not cyclone, and explains related matching. Rows name the flood record; /model limitations explain compatible hazards. Web-source grep found no unqualified same-hazard claim."
 },
 {
  "confidence": 1,
  "criterion": "Subscribing from a place page must visibly preserve the selected place.",
  "evidence": [
   "Current 390px screenshot of /subscribe?place=286 shows an empty Place control.",
   "GET /api/places/286 returns Kerala with featured:false; /api/places?featured=true excludes 286."
  ],
  "expected": "Show Kerala as the selected place, including when it is outside the featured list.",
  "falsifier": "The initial non-featured place renders its name in the selector.",
  "fix": "Fetch and merge the initial place into the options, or provide searchable place selection.",
  "id": "R-user-3",
  "impact": "The form submits an invisible place selection that the subscriber cannot verify.",
  "location": "artifacts/calamity-watch/src/components/sections/subscribe-form.tsx:36-40",
  "observed": "Opening /subscribe?place=286 renders a blank Place selector and generic submit label because Kerala is not featured.",
  "persona": "R-user",
  "reproduction": "Follow the Kerala place page's subscription link or open /subscribe?place=286.",
  "retest": "Open subscription links for both featured and non-featured places and verify visible names and submitted IDs.",
  "severity": "minor",
  "status": "reproduced",
  "disposition": "fixed",
  "resolution_evidence": "SubscribeForm fetches initial place using useGetPlace and merges its name into selector options without duplication. GET /places/286 returned 200: Kerala, featured=false. Selector interaction was source-verified only."
 },
 {
  "confidence": 0.99,
  "criterion": "Declared tabs should support the expected keyboard and assistive-technology pattern.",
  "evidence": [
   "Each tab has aria-selected and onClick only; the single role=tabpanel has neither id association nor aria-labelledby."
  ],
  "expected": "Provide an accessible tabs implementation or use ordinary labelled toggle buttons instead.",
  "falsifier": "An enclosing component supplies keyboard navigation and tab/panel associations at runtime.",
  "fix": "Use the existing accessible tabs primitive or implement the complete tab pattern.",
  "id": "R-user-4",
  "impact": "Keyboard/screen-reader users encounter tab semantics without their expected navigation and relationships.",
  "location": "artifacts/calamity-watch/src/components/board/board.tsx:169-184",
  "observed": "Board buttons declare role=tab but lack arrow-key handling, roving tabindex, aria-controls and labelled panel association.",
  "persona": "R-user",
  "reproduction": "At narrow width, focus Alerts and attempt ArrowRight to reach Feed; source contains no handler for this action.",
  "retest": "Verify Left/Right and Home/End navigation, selected-tab tab order, and panel accessible name with assistive technology.",
  "severity": "minor",
  "status": "supported-not-executed",
  "disposition": "fixed",
  "resolution_evidence": "Source confirms stable tab ids, selected-only tabIndex=0, aria-controls, labelled tabpanel, and ArrowLeft/ArrowRight/Home/End handling that updates selection and moves focus, skipping hidden tabs."
 },
 {
  "confidence": 1,
  "criterion": "Anonymous subscription creation should not disclose whether someone already subscribed.",
  "evidence": [
   "First POST returned 'Recorded as pending' and id 2; the second returned 'This address already has a subscription with these filters' and id 2.",
   "No inbound rate-limiting middleware was found in the API source."
  ],
  "expected": "Give an indistinguishable public acknowledgement for existing and new requests.",
  "falsifier": "Existing and new subscriptions yield indistinguishable public responses.",
  "fix": "Return generic acknowledgements without existing IDs and rate-limit subscription creation.",
  "id": "R-user-5",
  "impact": "An anonymous caller can test candidate email/place/hazard subscriptions, though this probe did not reveal any other person's email.",
  "location": "artifacts/api-server/src/queries/subscriptions.ts:28-35",
  "observed": "Submitting the same synthetic address twice distinguishes a new request from an existing subscription and returns its stable ID.",
  "persona": "R-user",
  "reproduction": "POST email council-r-user-round2@example.invalid, placeId 286, hazard flood, minLevel high twice; no ownership proof is required.",
  "retest": "Compare fresh, pending and verified synthetic addresses with identical filters; responses must not reveal membership.",
  "severity": "minor",
  "status": "reproduced",
  "disposition": "fixed",
  "resolution_evidence": "First and duplicate submissions using one unique @example.invalid address returned identical 201 bodies with id=null. Source enforces per-address 10/15-minute limiting and 429 afterward; limit not exhausted. Oversized classify JSON returned 413; alerts/1?asOf=yesterday returned 400."
 }
]
```

## Coverage ledger
| Reviewer | Probe | Location | Outcome |
|---|---|---|---|
| R-slop | Inspected all three screenshots against visual tells: gradients, glass, card grids, decorative icons, purple defaults, centred hero copy, numbers and synthetic-looking data. | generated-artifacts/council/round-2/*.jpg | No generic visual-template finding: the map, hazard palette, labelled scores, source state and replay clock serve this specific task; the board empty-state contradiction is reported separately. |
| R-slop | Opened all eight screenshots, treating fix-prefixed images as current and the others only as layout references. | generated-artifacts/council/round-1/*.jpg | Current phone and tablet replay layouts retain controls and alert evidence; no missing-basemap finding or obsolete-state finding raised. |
| R-slop | Read page and application-component copy and scanned UI primitives for marketing adjectives, forced triads, hedges, dash cadence, summaries and repeated disclaimers. | artifacts/calamity-watch/src/pages/*.tsx and components | No pervasive writing-template defect; technical “robust z” and repeated local-authority warnings are justified, while About's unsupported timing claim is not. |
| R-slop | Applied the unrelated-product substitution test to palette, typography, density, grouping and primary artifact. | docs/design/DESIGN-BRIEF.md; board, replay and model screenshots | Dark panels alone are reusable, but fear-weighted geographic signals, official-event outlines, hazard-specific timelines and disaster replay make the experience recognisably job-specific; retain these choices. |
| R-slop | Compared the board's mechanical explanation, the model's limitations and the rendered About narrative. | /about; artifacts/calamity-watch/src/pages/home.tsx:37; /api/model | Live About screenshot reproduced an early-warning promise inconsistent with the more careful board/model voice; R-slop-01. |
| R-slop | Checked whether the replay evidence supports the About page's temporal claims. | /api/replay/scenarios; /api/alerts?scenario=california-wildfires-2018&asOf=2018-12-08T00:00:00Z&limit=200 | First California alert has negative leadMinutes (-1956), matching the screenshot's 32.6 hours after the record; this is evidence of comparison, not demonstrated advance warning. |
| R-slop | Attempted to reproduce the screenshot's simultaneous elevated signal and no-alert empty state through API reads. | /api/board and /api/board?asOf=2026-10-26T08:57:00Z | Neither response reproduced the elevated state during review; R-slop-02 is explicitly supported by current supplied imagery and source, not marked executed. |
| R-skeptic | Compare API metrics and rendered claims with training logic and sum both confusion matrices using python3. | /model; services/ml/model/metrics.json; services/ml/scripts/train_stage_one.py | API numbers match the file; matrix totals are 13,343 and 28,118, with matching accuracies. Held-out-event selection and Kaggle non-selection are honestly described; the headline population caption fails. |
| R-skeptic | Fetch all eight Kerala and nine California alerts at scenario end and compare their peak hours, counts and z-scores against detail timelines; inspect opening and closing rules. | /api/alerts and /api/alerts/{id}; detector.ts; signals.ts; lib/stats.ts | All 17 peak rows match the summaries within display rounding; sampled event histories agree with two elevated hours and three low/insufficient hours. Thresholds 1.5/3/5 and minimum five agree with the model API. |
| R-skeptic | Inspect official timestamps, precision, matching windows and lead-time rendering against returned Kerala and California corroborations. | services/replay.ts; services/official/index.ts; queries/alerts.ts; lib/format.ts | Observed comparisons say after the historical event, not prediction; day-level precision suppresses minute leads and region-radius expansion explains California's 292-km match. External historical sources were not independently exhaustively verified. |
| R-skeptic | Inspect geographic outliers and trace Hurricane, Utah through place-filtered API evidence and local replay text. | /api/board?scenario=hurricane-harvey-2017&asOf=2017-08-30T12:00:00Z; geoparse.py; gazetteer.py | Confirmed hazard-name false resolution with confidence 0.9; reported as a bounded geoparsing defect. |
| R-skeptic | Inspect California place outliers and trace Kobe through the place-filtered posts API and local replay record. | /api/board?scenario=california-wildfires-2018&asOf=2018-11-13T06:00:00Z | Kobe, Japan appears at confidence 0.9 for a basketball-context post, consistent with the resolver's single-candidate confidence rule; Paradise resolves correctly to California. Remote places were not presumed wrong merely because they were remote. |
| R-skeptic | Check actual served replay posts against HumAID confidentiality statements. | /api/posts?scenario=kerala-floods-2018&asOf=2018-08-18T12:00:00Z&limit=5 | All five returned texts are the explicit withholding notice; IDs, links and scores remain available. No text disclosure found. |
| R-skeptic | Inspect supplied full-page image and take a fresh 1440px model-page screenshot. | /model; generated-artifacts/council/round-2/model-1440-full.jpg | Page renders successfully and exposes the disputed caption directly; no separate visual defect identified. |
| R-user | Walked the live-board job via curl and inspected board/alert navigation source. | /api/board, /api/status, /api/alerts, /api/posts, /api/hazards/flood/timeline | Live APIs succeeded, zero open alerts was consistent with status, and empty alerts offer replay; no fabricated live alert found. |
| R-user | Followed Kerala replay alerts into scoped detail, checked timestamps and the return-link construction. | /api/replay/scenarios and /api/alerts/154 | Evidence stayed before the requested playhead and the return link preserves it; found excluded evidence and misleading cross-hazard corroboration. |
| R-user | Compared replay-scoped and live place endpoints against alert-to-place navigation. | /api/places/286 and pages/alert.tsx, pages/place.tsx | The link drops replay scope: live Kerala returns no alerts while the scoped endpoint returns replay alerts; place UI always queries live data without a replay return link. |
| R-user | Read model explanations and limitations, compared headline metrics with the artifact, and classified one benign flood example. | /api/model, /api/model/classify, services/ml/model/metrics.json | Accuracy/F1 matched the artifact; classification returned real scores and Kerala resolution; limitations explicitly discuss weak generalization and empty replay baselines. |
| R-user | Created one synthetic pending subscription, repeated it, tested bogus verification/unsubscribe tokens, and captured the current phone form. | /api/subscriptions and /subscribe?place=286 | Bogus tokens returned invalid without secrets; email delivery is explicitly unconfigured so end-to-end confirmation is unavailable; found enumeration and blank place selection. |
| R-user | Inspected focus order, skip link, labels, slider ARIA, chart alternatives, map alternatives and tabs. | App.tsx, board.tsx, charts.tsx, replay.tsx, hazard-map.tsx, shell.tsx | Skip link, labelled range with date-valuetext, labelled menu, chart tables and place-list alternatives exist; tabs are incomplete; interactive keyboard/AT execution was unavailable. |
| R-user | Viewed both phone images and checked responsive classes against current source. | generated-artifacts/council/round-1/fix-replay-390.jpg and board-390.jpg | Replay controls, map, alert action and horizontally scrollable hazard strip fit the phone layout; older board image was used only for layout, not current-state claims. |
| R-user | Sent malformed timestamps/scenarios, SQL-looking strings, negative/huge limits, pre-opening timestamps and mismatched scenario enumeration. | /api/board, /api/posts, /api/places, /api/alerts/154 | Board scope/limits were rejected, SQL-looking search returned empty, and pre-opening alert access returned 404; alert detail ignores scenario and silently treats malformed asOf as now, but returned only public replay data. |
| R-user | Sent one 66KB JSON body to each POST endpoint and inspected error handling and rate-limit middleware. | /api/model/classify, /api/subscriptions, app.ts | Bodies were bounded but returned generic 500 rather than 413; no stack trace, secret or foreign email appeared; no inbound limiter was found, and no load test was attempted. |
| R-user | Read model-down and empty-database recovery paths without interrupting services or deleting data. | queries/model.ts, ml/client.ts, queries/places.ts and React error/empty states | Classifier failures become explicit 503s with retry guidance, board retains prior data on refresh failure, and empty lists provide guidance; model-down/empty-DB behavior was source-reviewed, not induced. |

## Dispositions

- **R-slop-01**: fixed. About source and fresh screenshot distinguish 'before the sirens' as the aim, say 'how long before or after', and acknowledge first replay alerts usually open hours to days after official records. README Alerts bullet makes the same before/after and usually-after qualification.
- **R-slop-02**: fixed. Live Board screenshot and board.tsx show the two-consecutive-hours requirement and explain single-hour spikes; the old no-place-broke-baseline empty-state claim is gone.
- **R-skeptic-1**: fixed. Python calculation from metrics.json: 8,343 relevant + 5,000 generic = 13,343 hazard rows; excluding the none row gives 7,750/8,343 = 92.8922%; full accuracy is 95.4958%; relevance covers 14,133 rows. testPopulation implements this calculation, and the fresh Model screenshot displays these counts and 92.9%.
- **R-skeptic-2**: fixed. Specified Harvey board returned 200 with neither Hurricane nor Harvey in places. geoparse.py requires strong state-level support for HAZARD_WORD_NAMES and locality cues for STORM_NAMES. George persists only as insufficient with one relevant post/24h; see caveat.
- **R-user-1**: fixed. Evidence query uses both DETECTOR thresholds, each configured as 0.5. All eight Kerala alert details returned 200; all 160 returned evidence entries satisfied pRelevant >=0.5 and had the alert place at confidence >=0.5.
- **R-user-2**: fixed. Kerala cyclone alerts located by scenario/time (currently 227 and 228) carry officialHazard=flood and hazardRelation=related. Fresh alert screenshot explicitly says flood record, not cyclone, and explains related matching. Rows name the flood record; /model limitations explain compatible hazards. Web-source grep found no unqualified same-hazard claim.
- **R-user-3**: fixed. SubscribeForm fetches initial place using useGetPlace and merges its name into selector options without duplication. GET /places/286 returned 200: Kerala, featured=false. Selector interaction was source-verified only.
- **R-user-4**: fixed. Source confirms stable tab ids, selected-only tabIndex=0, aria-controls, labelled tabpanel, and ArrowLeft/ArrowRight/Home/End handling that updates selection and moves focus, skipping hidden tabs.
- **R-user-5**: fixed. First and duplicate submissions using one unique @example.invalid address returned identical 201 bodies with id=null. Source enforces per-address 10/15-minute limiting and 429 afterward; limit not exhausted. Oversized classify JSON returned 413; alerts/1?asOf=yesterday returned 400.

Verifier's residual notes, both addressed after its run: the About bullet "did not break from the baseline" now reads "did not stay above their baseline long enough to open an alert"; George, South Africa remains on the Harvey board at one relevant post in 24 h (a post that names the convention centre without the initial), below every threshold, accepted.

Repairs beyond the findings, made while in the same files: place pages opened from a replay now read as of the playhead (`/places/:id?scenario=&asOf=`) with a link back, and every place link from scoped alerts, posts and the map readout carries the scope; alert evidence panel states "20 of the N that counted" when truncated; oversized bodies return 413; malformed `asOf` on the alert endpoint returns 400; storm names (Harvey, Florence, Idai, ...) resolve as places only with a locality cue; "First R. Last" mentions are read as people; "Florence, South Carolina" spans are split into two mentions.

Decision: REVISE → fixed; round 3 required.

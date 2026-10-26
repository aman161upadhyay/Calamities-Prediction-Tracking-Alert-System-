# Round 6, 2026-10-26, mirror 6d2193f (reviewed) → repaired in the following commit

Scope: the Phase B evidence pages of `docs/design/REDESIGN-PLAN.md`: `/alerts` (the ledger with URL-persisted record, status and hazard filters), `/alerts/:id` (the dossier: figures, recorder with the alert window shaded, stamp, posts ledger, event line), `/places/:id` (place plate, one recorder lane per hazard with signal, signal-by-hazard table, alert and official ledgers), `/hazards/:hazard` (hazard plate, recorder, top places, official ledger), each under live scope and under the Kerala 2018 replay at its end and at a playhead. Files: `artifacts/calamity-watch/src/pages/{alerts,alert,place,hazard}.tsx`, `src/components/evidence/parts.tsx`, `src/components/kit.tsx`, `src/lib/format.ts`, the shared instruments, and the API routes behind them by curl.
Deterministic checks: tsc ok (`pnpm --filter @workspace/calamity-watch run typecheck` and `pnpm --filter @workspace/api-server run typecheck`, after repairs); vite build ok (`PORT=5173 BASE_PATH=/ pnpm --filter @workspace/calamity-watch run build`, 1,846 kB main chunk, code-splitting remains Phase D work); OpenAPI codegen rerun after the spec change (`pnpm --filter @workspace/api-spec run codegen`); curl reproductions of every API-backed finding on the repaired tree; the verifier bundled `src/lib/format.ts` with esbuild and executed `leadText` and `stampLead` for 21 inputs; secrets scan clean (mirror script grep). No pytest suite exists and axe was not run; keyboard behaviour was checked by reading the source (the reviewers had no browser); the reviewers saw JPEG screenshots at 1440, 1024 and 390 plus curl output, so hover states, focus rings and the live map stayed unreviewed. Two of the listed 1440 captures (the dossier and the Kerala ledger) were missing from the reviewers' directory, so their desktop compositions were checked only by the main agent, and re-captured after repair.

Three fresh reviewers ran as separate subagents with no sight of rounds 1 to 5 or of each other: R-slop, R-user (user advocate plus attacker), R-skeptic (domain expert plus source verifier). Probe counts: R-slop 5, R-user 5, R-skeptic 6, each probe recorded whether or not it found anything. All three answered "is this AI slop" with no: R-slop found "one recognisable product idea" and "records rather than interchangeable rounded cards"; the objections were, as in round 5, to labels, scope and claims. The builder (design subagent) repaired the five findings in its files in one pass; the main agent fixed the API bound, the `leadText` wording and the `HazardTag` scope plumbing, then rebalanced the ledger columns when the qualifier collided with the next column at 1024 and 1440; a fourth subagent reran every retest on the repaired tree.

Decision of the reviewers before repair: R-slop REVISE, R-user REVISE, R-skeptic REVISE (zero blockers, two majors, five minors; round 5 had three distinct majors and seven minors, so both counts fell). After repair and verification: seven fixed, none deferred. The round does not meet the README exit rule on the major count (two new majors), so Phase C's round 7 must come back with no new major; the two majors here were a dropped replay scope on one link group and a label that called a frozen closing level the current one, both classes already in the pre-round checklist, which the main agent will now grep for before spawning reviewers rather than after.

Repairs beyond the findings, made in the same pass: the ledger's desktop column template was retuned (140 px time column so "22 Aug 03:00 UTC" never wraps; a 124 px level column with the qualifier on its own line; 56 px peak-z and posts columns) after the first repair produced a collision at 1024; the place page under a playhead was screenshotted for the first time at 1440 and shows four signal lanes with their level marks.

## Findings

```json
[
  {
    "id": "r6-slop-01",
    "persona": "R-slop",
    "severity": "minor",
    "confidence": 0.98,
    "criterion": "Narrow layouts must preserve the meaning of retained data, not just its value (design catalogue D03; brief §7 narrow-layout rule).",
    "location": "/alerts?scenario=kerala-floods-2018 at 390px; components/evidence/parts.tsx:98–126",
    "observed": "The replay ledger shows an unlabeled Low or Not enough posts beside each historical alert. The explanatory Level at end header exists only in the desktop header, which is hidden below md. Nothing in the narrow row identifies these as end-state levels rather than the alert's peak severity.",
    "expected": "The narrow ledger explicitly identifies the retained level as its end/playhead/current level, according to scope.",
    "evidence": [
      "alerts-kerala-390.jpg shows the 22 Aug 03:00 UTC Kerala flood row with Low and no level-time label.",
      "parts.tsx:101–109 renders levelLabel inside a hidden md:grid header; line 126 renders currentLevel without an equivalent narrow label.",
      "Read-only GET /api/alerts?scenario=kerala-floods-2018 returned alert 396 with peakLevel severe and currentLevel low, establishing that the distinction materially changes the interpretation of this row."
    ],
    "reproduction": "Inspect the supplied 390px Kerala ledger capture and compare its first row with alert 396 in the alerts API; inspect the responsive header and row rendering in AlertLedger.",
    "impact": "A phone visitor scanning the historical evidence can mistake a severe alert for an alert that was only Low. Opening its dossier resolves the ambiguity, so this is bounded to ledger scanning.",
    "fix": "Add a compact narrow-layout level label using the existing levelLabel prop, either once above the rows or alongside the level; preserve the glyph, word and timestamp.",
    "falsifier": "A visible narrow-layout label elsewhere in the ledger that explicitly identifies these values as end-state/playhead levels would disprove the finding; none appears in the supplied capture or current component.",
    "retest": "Inspect 390px live, replay-at-end and replay-with-asOf ledgers. Each retained level must visibly identify its temporal meaning, including the severe-peak/low-end alert 396.",
    "status": "reproduced",
    "disposition": "fixed"
  },
  {
    "id": "r6-user-01",
    "persona": "R-user / user advocate",
    "severity": "major",
    "confidence": 1,
    "criterion": "Place-to-hazard navigation preserves replay scenario and playhead.",
    "location": "src/pages/place.tsx, Signal by hazard; src/components/kit.tsx:35-45",
    "observed": "Both narrow and desktop hazard links use HazardTag, whose href is only /hazards/{hazard}; it drops scenario and asOf.",
    "expected": "Following Flood from a replay place opens the flood evidence for that same replay and playhead, not live ingestion.",
    "evidence": [
      "place.tsx uses HazardTag without scope in both list-place-hazards and table-place-hazards.",
      "kit.tsx:44 constructs href={`/hazards/${hazard}`}.",
      "place-286-1440.jpg identifies Kerala replay at its end and presents these hazard links."
    ],
    "reproduction": "Read /places/286?scenario=kerala-floods-2018&asOf=2018-08-22T12:00:00Z; follow Flood in Signal by hazard. Source resolves the destination to /hazards/flood.",
    "impact": "A primary evidence-navigation job silently switches from historical Kerala evidence to unrelated live data.",
    "fix": "Allow HazardTag to receive a scoped href, and pass the place page's scopeQuery(scope).",
    "falsifier": "A routing layer demonstrably reattaches the original query parameters to this explicit href.",
    "retest": "Follow every hazard link at desktop and phone widths, with scenario alone and with an explicit asOf; assert both parameters survive.",
    "status": "supported-not-executed",
    "disposition": "fixed"
  },
  {
    "id": "r6-user-02",
    "persona": "R-user / attacker",
    "severity": "minor",
    "confidence": 1,
    "criterion": "Invalid identifier filters receive bounded validation errors rather than server failures.",
    "location": "GET /api/alerts?placeId=9999999999999999999999999999999; src/pages/alerts.tsx:21-28",
    "observed": "The huge positive placeId returns HTTP 500 with the generic server-error body. Negative placeId returns HTTP 200 and an empty array.",
    "expected": "Reject out-of-range and nonpositive identifiers with HTTP 400 before querying storage.",
    "evidence": [
      "Read-only curl GET with the huge placeId returned 500: Something went wrong on the server.",
      "GET /api/alerts?placeId=-1 returned 200 [].",
      "alerts.tsx accepts any Number.isInteger(pid) greater than zero; it does not constrain safe integer or database range."
    ],
    "reproduction": "GET the cited API URL; alternatively load the ledger with that placeId, which source forwards as a numeric filter.",
    "impact": "A malformed shared ledger URL produces an unrecoverable-by-retry error instead of explaining the bad filter. No internal details leaked in the observed response.",
    "fix": "Validate identifier bounds consistently at the API and normalize/reject unsafe identifiers in the page.",
    "falsifier": "The same out-of-range input consistently returns a descriptive 400 without reaching storage.",
    "retest": "Exercise -1, zero, fractional, maximum supported, maximum plus one, and huge identifiers against ledger and detail routes.",
    "status": "reproduced",
    "disposition": "fixed"
  },
  {
    "id": "r6-user-03",
    "persona": "R-user / keyboard user and attacker",
    "severity": "minor",
    "confidence": 0.99,
    "criterion": "Keyboard users can recover from an unknown scenario URL using the Record control.",
    "location": "src/pages/alerts.tsx:23,56-62; src/components/evidence/parts.tsx:67-76",
    "observed": "An unknown scenario remains the RadioRow value although no option matches. Every Record radio therefore receives tabIndex=-1; the keyboard cannot tab into that group to select Live.",
    "expected": "Maintain a keyboard entry point even when the URL value is invalid, and offer a clear record-reset action.",
    "evidence": [
      "GET /api/alerts?scenario=%3Cscript%3E returned descriptive HTTP 400 Unknown replay scenario.",
      "alerts.tsx passes raw scenario as the Record value.",
      "RadioRow assigns tabIndex=0 only when o.value === value; it has no unmatched-value fallback."
    ],
    "reproduction": "Load /alerts?scenario=not-a-scenario and tab through controls. The source guarantees all Record options are removed from sequential focus; actual browser interaction was unavailable.",
    "impact": "A bounded malformed-link case requires pointer use, URL editing, or navigating away to change the record.",
    "fix": "Give the first radio a tab stop when no value matches, and expose a keyboard-accessible clear-invalid-scope action.",
    "falsifier": "A rendered invalid-scenario page provides a focusable Record radio or equivalent explicit reset control.",
    "retest": "With an unknown scenario, recover to Live using only Tab and arrow keys; also verify valid groups retain roving focus.",
    "status": "supported-not-executed",
    "disposition": "fixed"
  },
  {
    "id": "r6-skeptic-01",
    "persona": "R-skeptic / domain expert and source verifier",
    "severity": "major",
    "confidence": 1,
    "criterion": "Level labels identify the actual observation time, and agree with the recorder.",
    "location": "pages/alert.tsx:139; pages/alerts.tsx:104; components/evidence/parts.tsx:126; api-server/src/queries/common.ts:156-162",
    "observed": "Closed alerts expose their frozen closing level under labels implying the current observation or replay endpoint. Alert 396 says Current level: Low; the scenario-end place ledger says Level at end: Low, although Kerala flood at the replay end is Not enough posts.",
    "expected": "Label a closed alert's stored level Level at closing, or obtain the actual level at the labelled playhead/current time. Do not call the closing value the replay-end value.",
    "evidence": [
      "alert-396-1024.jpg shows Current level: Low while its recorder's latest readout is 23 Aug 18:00, Not enough posts.",
      "place-286-1440.jpg identifies the replay endpoint as 12 Sep 14:00 and shows alert 396 as Low under Level at end; its flood signal table and recorder show Not enough posts.",
      "GET /api/alerts/396 returns currentLevel=low. GET /api/places/286?scenario=kerala-floods-2018&asOf=2018-09-12T14%3A00%3A00.000Z returns flood level=insufficient; the corresponding place timeline's latest hour is 2018-09-12T13:00Z, level=insufficient.",
      "common.ts:158 explicitly preserves a.currentLevel after closing; detector.ts stops updating that alert after closing. AlertLedger renders a.currentLevel regardless of its supplied column label."
    ],
    "reproduction": "Compare alert 396 on the dossier and scenario-end place ledger with the place's endpoint flood recorder; inspect the listed GET responses and closed-alert mapping.",
    "impact": "Readers receive contradictory level evidence and cannot tell whether Low describes the closing hour or the record they are currently inspecting.",
    "fix": "Distinguish closing level from playhead level. Use row-specific closing labels for closed alerts, or calculate true observation-time values; apply the distinction in the dossier and every reused alert ledger.",
    "falsifier": "A documented, visibly labelled contract that Level at end means each alert's closing hour rather than the replay endpoint, together with removal of Current level for frozen values.",
    "retest": "For alert 396 compare closing, 23 Aug, and 12 Sep endpoint views; verify every displayed level names its observation time and agrees with that hour's trace.",
    "status": "reproduced",
    "disposition": "fixed"
  },
  {
    "id": "r6-skeptic-02",
    "persona": "R-skeptic / domain expert and source verifier",
    "severity": "minor",
    "confidence": 1,
    "criterion": "The posts ledger describes the temporal range it actually queries.",
    "location": "pages/alert.tsx:37-38, 68, 171",
    "observed": "Posts in the window promises posts through an hour after closing, but the request's asOf is the closing instant. Client-side filtering cannot recover the promised following hour.",
    "expected": "Either query the promised post-closing hour, bounded by the replay playhead, or describe the actual cutoff at closing.",
    "evidence": [
      "alert.tsx:171 promises from an hour before opening to an hour after closing, while lines 37-38 set asOf to the earlier of closedAt and the URL playhead.",
      "For alert 396, the actual posts request uses asOf=2018-08-22T19:00:00.000Z. A read-only GET of the same request with asOf=2018-08-22T20:00:00.000Z returned 15 posts after 19:00 among its 200 results."
    ],
    "reproduction": "Compare /api/posts?placeId=286&hazard=flood&limit=200&scenario=kerala-floods-2018 with asOf set first to 22 Aug 19:00Z and then 20:00Z; compare the dossier's query construction and window note.",
    "impact": "Readers looking for post-closing context are told it is included when it is systematically excluded.",
    "fix": "Align the query cutoff and prose; retain an explicit capped-read disclosure and never fetch beyond a replay playhead.",
    "falsifier": "The note is changed to end at closing, or the request demonstrably includes the following hour when that hour is available at the playhead.",
    "retest": "A closed-alert fixture with posts in the following hour must either display them or explicitly state that the window stops at closing.",
    "status": "reproduced",
    "disposition": "fixed"
  },
  {
    "id": "r6-skeptic-03",
    "persona": "R-skeptic / domain expert and source verifier",
    "severity": "minor",
    "confidence": 1,
    "criterion": "Lead wording must not imply temporal precedence at zero lead and must agree between stamp and prose.",
    "location": "lib/format.ts:154-159, 193-201",
    "observed": "leadText uses min >= 0 for before. Executing the source function with leadMinutes=0 and minute precision returns 0 min before the official record, while stampLead specifies same minute as official. With hour precision and leadMinutes=10, leadText returns about 0 h before, while the stamp's rounded-zero branch says same hour as official.",
    "expected": "Zero lead is simultaneous, not before; rounded-zero hourly comparisons should use consistent neutral precision-aware wording.",
    "evidence": [
      "Direct execution of the extracted leadText source returned 0 min before the official record for {leadMinutes:0, officialTimePrecision:minute}.",
      "Direct execution returned about 0 h before the official record for {leadMinutes:10, officialTimePrecision:hour}; stampLead lines 195-196 instead return same hour as official for this input.",
      "The observed Kerala record itself is correctly rendered as about 38 h after the recorded event from leadMinutes=-2265 and hour precision. No zero-lead API record was established."
    ],
    "reproduction": "Call both formatting functions with minute precision and zero lead, then hour precision and ten-minute lead. Compare prose and stamp outputs.",
    "impact": "A bounded formatting edge case produces contradictory comparison wording and implies precedence when the exact lead is zero.",
    "fix": "Share the comparison logic; explicitly handle zero and hourly rounded-zero cases before choosing before or after.",
    "falsifier": "Both functions return neutral, mutually consistent wording for zero and precision-rounded-zero inputs.",
    "retest": "Add cases for negative, zero, positive, missing lead, minute/hour/day precision, including small differences around zero.",
    "status": "reproduced",
    "disposition": "fixed"
  }
]
```

## Coverage ledger

| Reviewer | Probe | Location | Outcome |
|---|---|---|---|
| R-slop | 1. Read the 68 design tells and writing catalogue, then test visual uniqueness against template defaults | Dossier 1024/390; place 1440; hazard 1440 | No generic-template finding. Wide station lettering, paper recorder, restrained pen trace and green bordered stamps form one recognisable product idea. Tables are records rather than interchangeable rounded cards. |
| R-slop | 2. Check narrow hierarchy and instrument meaning against desktop/source | Kerala ledger 390; dossier 390; hazard 390; AlertLedger and Recorder | r6-slop-01. Otherwise narrow hazard rows deliberately recompose rather than squeeze the desktop table; dossier retains opening time, peak level and readable corroboration. Instrument plates truncate on narrow screens, but surrounding readouts/captions retain useful context; no separate defect asserted. |
| R-slop | 3. Test empty-state writing against W04 and inflated/abstract AI copy | alerts-live-390.jpg; pages/alerts.tsx | No finding. The empty state names the absence, explains the two-hour requirement and supplies named replay actions. No mascot, generic inspiration or unsupported AI-power pitch. |
| R-slop | 4. Check whether the metaphor conceals an unsupported lead claim | Dossier 1024/390; stamp.tsx; format.ts; read-only alerts API | No observed false lead for alert 396: API leadMinutes is -2265, and the dossier prints about 38 h after the recorded event. The explanation also distinguishes record matching from prediction. |
| R-slop | 5. Check supplied evidence coverage and capture/source consistency | round-6 screenshot directory; current source | alert-396-1440.jpg and alerts-kerala-1440.jpg were absent, so those desktop compositions could not be checked. Supplied mobile Kerala capture omits lag text now present in current AlertLedger source; I did not report that omission as a current defect. No browser interactions, below-capture content or motion were verified. |
| R-user | 1: Malformed filter/injection GETs | API alerts status, hazard, scenario, asOf, limit | Junk status, SQL-like hazard, unknown scenario, invalid asOf, negative/huge limit rejected with 400; repeated status and bracketed scenario also rejected. No injection or internals observed. Huge placeId found r6-user-02. |
| R-user | 2: Replay navigation trace | Place, dossier, hazard source | Found scope loss in place hazard links, r6-user-01. Dossier related links and hazard-to-place links explicitly preserve scope. |
| R-user | 3: Keyboard semantics audit | RadioRow, Recorder | Valid radios implement arrow-key selection and roving tabindex. Recorder implements arrows, Shift, Home/End and Escape with a focusable named readout. Unknown scenario breaks Record entry, r6-user-03. Actual focus/scroll behavior not executed. |
| R-user | 4: Timing and phone evidence | API alerts/396; supplied dossier 1024/390 screenshots | Official record precedes alert by 2,265 minutes; screenshot correctly says after official by about 38 h. No false lead observed for this dossier. |
| R-user | 5: Evidence-page visual/empty-state review | All seven locally available supplied screenshots | Live empty ledger names absence and offers replay actions; hazard phone screenshot keeps ranked places readable. Kerala ledger phone screenshot lacks visible lag text, but current source explicitly renders it and API supplies it: screenshot/source discrepancy, not asserted as a current defect without a fresh render. |
| R-skeptic | Recompute dossier peak, duration and counted posts | Alert 396 GET, timeline, detector, 1024/390 captures | Passed: 16 h; peak 05:00, fear 8.358→8.36, median .467→.47, z 5.32→5.3, 40/40 relevant. Sum of relevant posts from the two trigger hours through the last processed hour is exactly 638; 578 occur strictly after opening, consistent with detector inclusion of trigger hours. |
| R-skeptic | Verify official lead/lag and precision | Alert 396 corroboration; format.ts | Kerala correctly says after, about 38 h, not prediction. Zero/rounded-zero formatting defect recorded as 03. Day precision uses dates, not minute lead. Cited newspaper article contents were not independently verified. |
| R-skeptic | Compare labelled level with trace and endpoint | Dossier; scenario ledger; place endpoint | Failed: finding 01. Ledger peak z/posts agree with the dossier API; frozen levels do not match their observation-time labels. |
| R-skeptic | Challenge post-window count and cutoff | Dossier query; posts GETs | The cap is explicitly disclosed: 200 in window, first 200 read. No undisclosed exact-total claim established. Promised post-closing hour is excluded: finding 02. |
| R-skeptic | Test rolling hazard summary against clock-hour trace | Live flood summary/timeline; board.ts; 390 capture | Passed: 2.67 summary versus 2.08 latest bucket is not an arithmetic contradiction. SQL computes trailing 60 minutes, while recorder is the 14:00 clock-hour bucket; current source and narrow capture say last 60 min. Older desktop capture says last hour. |
| R-skeptic | Resolve scenario-only place URL to scenario end | useScope; scenarios GET; explicit endpoint place/timeline GETs; desktop capture | Passed: endsAt=2018-09-12T14:00Z; UI waits for and sends it. Flood 18 relevant/24 h, cyclone 3, latest complete hour 13:00 match screenshot. Bare API scenario-only GET uses now and returns zeros, but the UI correctly supplies asOf. |

## Dispositions

- **r6-slop-01** (minor): fixed — the level qualifier ("at close", "now", "at end", "at playhead") is printed beside the level in the narrow rows as well as the wide ones; verifier confirmed it sits outside the desktop-only spans.
- **r6-user-01** (major): fixed — HazardTag takes a `query` prop and the place page passes `scopeQuery(scope)` to every hazard link (table and narrow list); the hazard page's place links and the dossier's links were rechecked and already carried scenario and asOf.
- **r6-user-02** (minor): fixed — `placeId` is bounded to 1..2147483647 in the OpenAPI spec (regenerated zod) and in `intParam`; the huge, negative, zero and 2147483648 ids and `/places/99999999999` return 400 with a message, `/places/286` still 200.
- **r6-user-03** (minor): fixed — RadioRow gives the first option a tab stop when no option matches; the ledger drops an unknown scenario (and its asOf) once the scenario list has loaded, and prints "Unknown replay <id>; showing live alerts" with a link to /alerts.
- **r6-skeptic-01** (major): fixed — the ledger column is "Level" and every cell names its observation time ("at close" for closed alerts; "now", "at end" or "at playhead" for open ones); the dossier figure reads "Level at closing" when the alert is closed. The ledger columns were rebalanced (1024 and 1440 re-screenshotted) so the qualifier never collides with "Open for".
- **r6-skeptic-02** (minor): fixed — the dossier's posts request now reads to the earliest of closing + 1 h, the URL playhead and now, so the stated window (an hour before opening to an hour after closing) is what is queried; the "first 200 read" disclosure stays.
- **r6-skeptic-03** (minor): fixed — `leadText` shares `stampLead`'s rounding: hour-dated records round to whole hours and a rounded zero reads "in the same hour as the official record"; a zero minute lead reads "in the same minute"; the verifier executed both functions for 21 inputs and found the directions agree throughout.

Verifier (fourth subagent, no files edited): seven of seven fixed. Evidence per item: source line references for the scope and label repairs, four executed cases of the ledger-qualifier expression, three cases of the RadioRow fallback, three cases of the posts cutoff, six read-only GETs for the id bound (five 400s with messages, one 200), and 21 executed inputs of `leadText`/`stampLead` agreeing in direction with "same hour" and "same minute" at zero.

Decision: REVISE before repair; after repair and verification all findings closed. Phase B is accepted on design (no slop call from any reviewer) and round 7 on Phase C must find no new major for the phase gate to count as passed.

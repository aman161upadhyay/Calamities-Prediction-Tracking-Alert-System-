# Round 7, 2026-10-26, mirror 12ba644 (reviewed) → repaired in the following commit

Scope: the Phase C pages of `docs/design/REDESIGN-PLAN.md`: `/replay` (the tape index and the playback console: transport, whole-tape recorder with the playhead, the board at the playhead, alerts to the playhead, the chronology, official records), `/model` (the calibration certificate), the `/subscribe` family (form, specimen email, rules, verify, unsubscribe), `/about` and the 404. Files: `artifacts/calamity-watch/src/pages/{replay,model,subscribe,about,not-found}.tsx`, `src/components/instruments/recorder.tsx`, `src/components/evidence/parts.tsx`, `src/components/layout/shell.tsx`, `src/components/sections/{classifier,subscribe-form}.tsx`, `src/lib/format.ts`, and the API routes behind them by curl (`artifacts/api-server/src/{routes,queries,services}`).
Deterministic checks: tsc ok (`pnpm --filter @workspace/calamity-watch run typecheck`, `pnpm --filter @workspace/api-server run typecheck`, after repairs); vite build ok (`PORT=5173 BASE_PATH=/ pnpm --filter @workspace/calamity-watch run build`: 686 kB main chunk, 1,069 kB lazy map chunk, 51 kB CSS, each page its own chunk after the route-level code splitting done in the same pass); OpenAPI codegen rerun after the two spec changes (`pnpm --filter @workspace/api-spec run codegen`) and the API server restarted; curl reproductions of every API-backed finding on the repaired tree by the main agent and again by the verifier; secrets scan clean (mirror script grep). No pytest suite exists and axe was not run; keyboard behaviour was checked by reading the source (no reviewer had a browser); the reviewers saw JPEG screenshots at 1440, 1024 and 390 plus curl output, so hover states, focus rings and the live map stayed unreviewed. The screenshot set was complete this round (twelve captures listed in the task), but two of them predated the builder's last fixes: the reviewers noticed and said so rather than reporting the already-corrected copy.

Three fresh reviewers ran as separate subagents with no sight of rounds 1 to 6 or of each other: R-slop, R-user (user advocate plus attacker), R-skeptic (domain expert plus source verifier). Probe counts: R-slop 7, R-user 10, R-skeptic 8, each probe recorded whether or not it found anything. All three answered "is this AI slop" with no: R-slop, "the whole-tape recorder with a moving playhead is a subject-specific organising instrument; the certificate and email specimen extend that language"; R-user, "a coherent, hazard-specific instrument language rather than interchangeable dashboard decoration"; R-skeptic, "purpose-built representations of this system's data". R-skeptic recomputed the certificate (13,343 test rows, 12,742 on the diagonal, 95.4958 %; 28,118 unseen rows, 80.6245 %; every confusion row equal to its class support; dataset rows 36,931 / 20,000 / 14,133 / 30,420 / 7,613), checked the replay index sentence against all five tapes (earliest records Harvey 24 Aug 2017 15:00, Kerala 15 Aug 2018 08:30, California 8 Nov 2018 14:33, Idai 14 Mar 2019 23:30, Puebla 19 Sep 2017 18:14:38, each before its collection start and first alert) and matched the recorder readout to the board (timeline 22 Aug 11:00 fear mass 6.086, board fearIndexNow 6.09). R-user exhausted the subscription rate limit with empty bodies (the eleventh request was refused with Retry-After) and found every other hostile input bounded.

Decision of the reviewers before repair: R-slop REVISE, R-user REVISE, R-skeptic REVISE (zero blockers, zero majors, six minors; round 6 had two majors and five minors). One of the six (the split-ledger collision) had already been repaired in the tree before the round, but the reviewer's capture predated the repair, so it counts as raised; the verifier then found the repair incomplete at the wide layout's own threshold, so it was repaired again. After repair and verification: six fixed, none deferred. The round meets the README exit rule on majors (none) and, counting the five findings that were new to the tree, on minors (five, equal to round 6's five); counting all six raised, it is one over. Phase C is accepted on design (no slop call from any reviewer); the main agent repaired everything itself because every item sat in shared files (the ledger, the shell, the format helpers, the API) rather than in the Phase C builder's pages.

Repairs beyond the findings, made in the same pass: route-level code splitting (the board stays in the first bundle; every other page loads on first visit), removal of the 50 unused shadcn components, the toaster, the tooltip provider and 34 unused devDependencies (CSS 114 → 51 kB, main chunk 797 → 686 kB), a skip link whose focused background used a token that no longer existed (now sheet on ink), and the mobile menu's Escape handling alongside the status sheet's.

## Findings

```json
[
  {
    "confidence": 0.94,
    "criterion": "Readable alignment and hierarchy at 1440; ledgers must retain legible place, hazard and level.",
    "evidence": [
      "replay-kerala-1440-tall.jpg: under 'Alerts opened so far', Kerala/hazard labels visibly run into the neighbouring level entries, especially the cyclone rows.",
      "parts.tsx:96 enables fixed-column table layouts by container width while leaving the place track minmax(0,1fr).",
      "parts.tsx:121-125 puts dot, place and hazard in a non-wrapping inline-flex; replay.tsx:357 allocates the ledger seven twelfths of the two-column section."
    ],
    "expected": "Each place/hazard label stays within its column, or the ledger switches to its compact stacked representation before this collision.",
    "falsifier": "A fresh screenshot of unchanged code at the specified viewport showing fully separated place/hazard and level columns would disprove the visible collision.",
    "fix": "Raise the container threshold for this table layout, or allow the place/hazard group to wrap within its track; preserve the timestamp and level.",
    "id": "r7-slop-01",
    "impact": "Place/hazard text collides with the level column in the replay's split-width alert ledger, weakening the otherwise carefully aligned printed-table treatment.",
    "location": "artifacts/calamity-watch/src/components/evidence/parts.tsx:96,118-125; replay.tsx:357",
    "observed": "The split-width replay ledger compresses the place column while its inline-flex contents retain their minimum content width and intrude into the level column.",
    "persona": "R-slop",
    "reproduction": "Inspect 'Alerts opened so far' in the supplied 1440 replay screenshot, particularly the cyclone rows; compare the standalone 1024 alerts screenshot, where the wider ledger separates the same content cleanly.",
    "retest": "Capture the replay ledger at 1440 and near the table-layout threshold with Kerala flood and cyclone rows, including 'Not enough posts'; verify no collisions.",
    "severity": "minor",
    "status": "reproduced",
    "disposition": "fixed",
    "resolution_evidence": "The AlertLedger's wide layouts now depend on the ledger's own width (Tailwind v4 container queries, @3xl and @4xl) instead of the viewport, so the replay's split column (about 690 px at 1440) prints the compact layout; the verifier then showed by track arithmetic that the seven-column layout at its own 896 px threshold left the place track 82 px, so the place track got a 148 px floor, the official-record track a 208 px floor (holds \"after official by about 38 h\" on one line), the gaps went to 12 px (sum 896 px at @4xl, 760 px at @3xl) and the place/hazard group wraps. Captures on the repaired tree: replay-kerala-1440-tall.jpg (split ledger, no collision), alerts-kerala-976.jpg (seven columns at a 912 px container, every cell in its column), alerts-kerala-1024.jpg (seven columns)."
  },
  {
    "confidence": 1,
    "criterion": "Design brief channel rules: red belongs to fear traces, alert/level marks; failure states use ink.",
    "evidence": [
      "shell.tsx:33 maps every state other than ok, idle, not_configured and budget_reached to #C8102E.",
      "shell.tsx:40-41 applies that red to both the triangle and source-state wording.",
      "src/lib/format.ts defines offline and error as source states, so these reach the red fallback."
    ],
    "expected": "Source failures use ink and explicit failure words/glyphs, keeping red semantically exclusive to fear/alert readings.",
    "falsifier": "A source-state transformation that prevents offline/error states from reaching this mapping, or a revised contract allowing red feed failures.",
    "fix": "Use ink for the error/offline branch, retaining the triangle and state wording.",
    "id": "r7-slop-02",
    "impact": "A failed/offline feed borrows the hazard-alert colour, confusing operational feed health with the site's fear signal.",
    "location": "artifacts/calamity-watch/src/components/layout/shell.tsx:29-41",
    "observed": "Source errors/offline states are explicitly mapped to pen red.",
    "persona": "R-slop",
    "reproduction": "Trace a SourceLine with state 'offline' or 'error' through stateMark; opening the status disclosure would render its glyph and state word red. This interaction was not executed.",
    "retest": "Render the disclosure with offline/error source states and confirm their glyphs/text are ink while genuine high/severe alert marks retain red.",
    "severity": "minor",
    "status": "supported-not-executed",
    "disposition": "fixed",
    "resolution_evidence": "stateMark's fallback branch (error, offline) returns ink #15140F; the triangle glyph and the state word carry the message. Verifier confirmed from the source; the disclosure with an injected failure state was not rendered (no browser)."
  },
  {
    "confidence": 1,
    "criterion": "Invalid subscription filters should receive an explicit client-validation error without reaching a database constraint.",
    "evidence": [
      "POST /api/subscriptions with {\"email\":\"council-review@example.invalid\",\"placeId\":0,\"hazard\":\"flood\",\"minLevel\":\"high\"} returned HTTP 500 and \"Something went wrong on the server.\"",
      "CreateSubscriptionBody accepts any integer placeId; subscriptions.ts:22 guards the existence lookup with if (input.placeId), so zero skips validation and reaches the insert."
    ],
    "expected": "HTTP 400 explaining that placeId must identify an existing positive-integer place.",
    "falsifier": "The same zero-valued request returns an intentional HTTP 400 before database insertion.",
    "fix": "Validate placeId as a positive int4-range integer and perform existence checks whenever it is non-null, rather than truthy.",
    "id": "r7-ruser-01",
    "impact": "A hostile or malformed request causes an avoidable server error; the caller receives no actionable explanation.",
    "location": "artifacts/api-server/src/queries/subscriptions.ts:22-24; lib/api-zod/src/generated/api.ts:979",
    "observed": "Zero passes schema validation, skips place lookup, and produces HTTP 500.",
    "persona": "R-user",
    "reproduction": "POST the evidenced JSON body to /api/subscriptions before exhausting the request limit.",
    "retest": "Submit zero, negative, out-of-int4-range, fractional, and nonexistent positive place IDs; expect bounded HTTP 400 responses and no inserted subscriptions.",
    "severity": "minor",
    "status": "reproduced",
    "disposition": "fixed",
    "resolution_evidence": "SubscriptionInput.placeId is bounded 1..2147483647 in the OpenAPI spec (zod regenerated) and createSubscription checks every non-null placeId. Verifier's five POSTs with council-r7-verifier@example.invalid: 0 and -5 → 400 \"Number must be greater than or equal to 1\"; 1.5 → 400 integer; 99999999999 → 400 maximum; 999999999 → 400 \"Unknown place\". Main agent's earlier curl of the same bodies agreed."
  },
  {
    "confidence": 0.99,
    "criterion": "REDESIGN-PLAN.md gate 3 requires Escape on popovers; the keyboard user must be able to dismiss the status sheet.",
    "evidence": [
      "StatusPlate owns open state at line 49 and toggles it only through the trigger's onClick at line 61.",
      "The conditional status-sheet markup at lines 81-105 has no Escape handler, close action, or focus-return mechanism."
    ],
    "expected": "Escape closes the sheet and leaves or restores focus on its trigger.",
    "falsifier": "A shared ancestor or disclosure primitive handles Escape and restores focus for this sheet.",
    "fix": "Add Escape dismissal with trigger focus restoration; keep the disclosure's expanded state synchronized.",
    "id": "r7-ruser-02",
    "impact": "The expanded sheet can obscure the page while keyboard focus moves elsewhere; dismissal requires returning to its trigger and activating it again.",
    "location": "artifacts/calamity-watch/src/components/layout/shell.tsx:48-106",
    "observed": "No source path handles Escape or closes the sheet when keyboard focus leaves it.",
    "persona": "R-user",
    "reproduction": "Tab to the station-status trigger, activate it, then press Escape. This sequence was inspected in source, not browser-executed.",
    "retest": "Open the sheet using Enter and Space, press Escape from the trigger and any sheet control, and confirm closure and visible trigger focus.",
    "severity": "minor",
    "status": "supported-not-executed",
    "disposition": "fixed",
    "resolution_evidence": "StatusPlate registers a document keydown listener while open: Escape closes the sheet and focuses the trigger; a pointerdown or a focus move outside the plate closes it; the mobile menu closes on Escape and refocuses its button. Verified by reading the source only (no browser in this round); aria-expanded follows the same state."
  },
  {
    "confidence": 1,
    "criterion": "The replay recorder should include the official context used to judge the first alert; its stated pre-collection margin must actually be requested.",
    "evidence": [
      "replay.tsx:238 says the timeline includes a week before the collection; line 240 instead requests only spanH + 1 hours.",
      "GET /api/replay/scenarios/kerala-floods-2018 reports collection start 2018-08-17T09:18:16.537Z.",
      "The resulting 630-hour timeline starts 2018-08-17T08:00:00Z and contains only the 20 August official marker.",
      "GET /api/official-events?scenario=kerala-floods-2018&asOf=2018-09-12T14:00:00Z&hours=800 includes the Cochin airport closure at 2018-08-15T08:30:00Z, the earlier record used in the first-alert comparison."
    ],
    "expected": "The recorder includes the intended pre-collection context, or explicitly identifies earlier records as outside its plotted range.",
    "falsifier": "The timeline query includes the earlier record, or the recorder explicitly identifies its exclusion as off-chart context.",
    "fix": "Request the intended additional seven days, within the API maximum, or clearly label the plot as collection-only with an off-chart official-record annotation.",
    "id": "r7-ruser-03",
    "impact": "The key earlier official record appears in the chronology but has no stamp on the tape, making the plotted comparison incomplete.",
    "location": "artifacts/calamity-watch/src/pages/replay.tsx:238-242",
    "observed": "The timeline excludes the 15 August closure while the chronology and comparison retain it.",
    "persona": "R-user",
    "reproduction": "Compare the Kerala 630-hour timeline response with its 800-hour official-events response and the recorder query construction.",
    "retest": "Verify Kerala's 15 August closure and Idai's pre-collection official record appear in the timeline markers and rendered recorder context.",
    "severity": "minor",
    "status": "reproduced",
    "disposition": "fixed",
    "resolution_evidence": "The console reads the official records first and asks the timeline for the span plus the hours back to the earliest record (plus 6, at most 168): Kerala 685 h starting 15 Aug 01:00 with the 15 Aug 08:30 closure in officialMarkers, Idai 787 h starting 14 Mar 15:00 with the 14 Mar 23:30 landfall; the recorder caption names the lead hours (55 and 17). Captures: replay-kerala-1440-tall.jpg and replay-idai-1440-tall.jpg show the stamp before the trace begins."
  },
  {
    "confidence": 0.98,
    "criterion": "Historical timestamps must preserve the precision of their cited source.",
    "evidence": [
      "artifacts/api-server/src/services/replay.ts:143 declares Mozambique's emergency at the storage timestamp 2019-03-19T12:00:00Z but explicitly marks timePrecision: day and source: ReliefWeb disaster page (date only).",
      "GET /api/official-events for cyclone-idai-2019, asOf its endsAt and hours equal to tape span plus 168, returns that startsAt without a precision field.",
      "replay.tsx:264 copies startsAt into chronology; lines 396–397 unconditionally format it with utcDateTime. OfficialLedger likewise unconditionally formats startsAt at parts.tsx:152."
    ],
    "expected": "Display 19 Mar 2019 (date only); a nominal positioning time may remain internal but should not be represented as an observed clock time.",
    "falsifier": "A primary source establishing the declaration specifically at 12:00 UTC, with corresponding precision metadata, would remove this discrepancy.",
    "fix": "Expose official time precision in the official-events response and preserve it through chronology and ledger rendering, using date-only labels for day-precision records.",
    "id": "r7-skeptic-01",
    "impact": "The console implies a known declaration time where only a calendar date is documented, undermining the otherwise careful treatment of lead/lag precision.",
    "location": "artifacts/calamity-watch/src/pages/replay.tsx:264,396–397; artifacts/calamity-watch/src/components/evidence/parts.tsx:152",
    "observed": "Both rendering paths produce 19 Mar 12:00 UTC, without a date-only qualification.",
    "persona": "R-skeptic",
    "reproduction": "Open the Idai replay and inspect the national-emergency chronology row and official ledger; compare their formatter path with the scenario's date-only source metadata.",
    "retest": "Check the Idai emergency in chronology and official ledger; confirm Kerala's hour-precision gaps and Puebla's minute-precision record retain appropriate formats.",
    "severity": "minor",
    "status": "supported-not-executed",
    "disposition": "fixed",
    "resolution_evidence": "OfficialEvent carries a required timePrecision (minute, hour, day) from the stored column; format.ts officialTime prints a day-dated record as \"19 Mar 2019 (date only)\" in the chronology, in the official ledger and for a key moment at the same instant; hour and minute records keep their clock (Kerala 08:30, Puebla 18:14). Verifier's curl of the Idai, Kerala and Puebla official-events endpoints confirmed the field; replay-idai-1440-tall.jpg shows both renderings."
  }
]
```

## Coverage ledger

| Reviewer | Probe | Location | Outcome |
|---|---|---|---|
| R-slop | 1. Compare page identity, transport placement and typography across supplied widths. | Replay screenshots: index 1440, Kerala 1440/1024/390; pages/replay.tsx | Distinct playback-console composition; mobile transport docks without consuming the entire viewport. No generic-design finding. |
| R-slop | 2. Compare ledger density in split-width and standalone contexts. | replay-kerala-1440-tall.jpg; alerts-kerala-1024.jpg; evidence/parts.tsx | Found place/hazard-to-level collision in the split replay ledger; standalone ledger is clean. |
| R-slop | 3. Check certificate hierarchy, narrow tables and authenticity of headline metrics. | model-1440.jpg; model-390.jpg; pages/model.tsx; GET /api/model | Certificate treatment is recognisable; narrow datasets retain role/licence/counts. API accuracy 0.9549577 and macro F1 0.9197825 support 95.5% and 0.920. |
| R-slop | 4. Check form hierarchy, email specimen and confirmation/failure copy. | subscribe-1440.jpg; subscribe-390.jpg; subscribe-verify-1440.jpg; subscribe-form.tsx; pages/subscribe.tsx | Single form plate and specimen/rules make a specific composition. Missing-token recovery is explicit. Current source uses peak level for the specimen, resolving the older desktop image's 'insufficient' wording; no current finding. |
| R-slop | 5. Check recognisable ideas, readable measure and semantic safety copy. | about-1440.jpg; not-found-1440.jpg; pages/about.tsx; pages/not-found.tsx | About uses lineage comparison and a prominent non-warning statement; 404 has a restrained broken-trace motif and two recovery actions. No finding. |
| R-slop | 6. Trace semantic colour use through failure and success states. | layout/shell.tsx; sections/classifier.tsx; sections/subscribe-form.tsx; lib/format.ts | Classifier/request errors and subscription success use ink; source-health error/offline fallback incorrectly uses pen red. |
| R-slop | 7. Verify supplied counts, replay scope and operational-state honesty against live responses. | GET /api/status; /api/replay/scenarios; /api/board?scenario=kerala-floods-2018&asOf=2018-08-22T12:00:00Z; scoped alerts and official-events endpoints | All returned HTTP 200. Five scenarios are ready; Kerala has 7,984 posts and eight alerts; board echoes the requested replay clock. Status explicitly reports emailDeliveryConfigured:false, consistent with the form warning. |
| R-user | 1. Trace console-to-alert and alert-to-console URL contracts. | /replay; components/board/rows.tsx:54-59; components/evidence/parts.tsx:118 | Board and alert-ledger links serialize scenario and asOf; replayHref maps them back to s and t. The live Kerala playhead query returns eight alerts, one open. No scope loss found on these source paths. |
| R-user | 2. Negative hours, hours above maximum, and huge alert limit. | /api/hazards/flood/timeline; /api/alerts | hours=-1, hours=2161, and limit=1000000000 each returned HTTP 400 with the corresponding bound. |
| R-user | 3. Unknown scenarios, malformed time, extreme valid time, and non-integer ID. | /api/board; /api/replay/scenarios; /api/alerts/:id | Unknown board scenario and malformed asOf returned 400; unknown scenario resource returned 404; alert ID 1.5 returned 400. Year-9999 asOf returned 200 with empty records, without a server failure. |
| R-user | 4. Submit missing fields, array body, malformed email, zero place ID, fractional place ID, and unknown hazard. | /api/subscriptions | Invalid shapes, email, fractional ID, and hazard returned 400. Zero place ID returned 500; recorded as finding r7-ruser-01. |
| R-user | 5. Exhaust the subscription quota using invalid empty bodies, avoiding real-address subscriptions. | /api/subscriptions; artifacts/api-server/src/lib/rate-limit.ts | The eleventh request returned the too-many-subscription-requests response. Source enforces ten requests per address per fifteen minutes and sets Retry-After. |
| R-user | 6. Check metric populations and model-selection disclosure against live data. | /model; /api/model; model-1440.jpg; model-390.jpg | Source distinguishes the 13,343-row hazard population from 14,133 relevance rows, identifies replay events as a selection set rather than blind test, and reports independent Kaggle relevance performance. Phone metrics and per-class table are legible; no unsupported metric claim found. |
| R-user | 7. Inspect keyboard reachability and focus handling. | recorder.tsx:198-209,411-440; replay.tsx:285-324,396; classifier.tsx:12-16; subscribe-form.tsx | Transport and chronology use native buttons; scrub is a labelled native range with UTC valuetext; recorder readout is focusable with arrows/Home/End/Escape; model examples focus the textarea; subscription controls have form labels and preserve input. Status-sheet Escape is absent. No interactive browser test performed. |
| R-user | 8. Inspect phone layout and docked transport. | replay-kerala-390.jpg; subscribe-390.jpg; model-390.jpg | Replay clock, scrub and speed controls are visible in the bottom dock; recorder readout remains separate from the scrolling plot. Subscription controls stack with explicit provider-unavailable copy. No primary-action occlusion established in these images. |
| R-user | 9. Bad-link recovery and invalid confirmation handling. | subscribe-verify-1440.jpg; not-found-1440.jpg; subscribe.tsx:43-87; /api/subscriptions/verify?token=bad | Missing-token verification offers resubscription; 404 offers board and ledger links. Invalid verification token returns status invalid without mutation. Unsubscribe source supplies missing-token instructions and retry after an error. |
| R-user | 10. Compare plotted official markers with full-tape official chronology. | replay.tsx:238-254; Kerala timeline and official-events endpoints | The 15 August closure is present in official records but absent from the requested recorder window; recorded as r7-ruser-03. |
| R-skeptic | 1. Recompute per-class support sums, confusion totals and diagonal accuracy; compare displayed certificate and candidate notes. | /model; GET /api/model | Test support/confusion total 13,343, diagonal 12,742 (95.4958%); unseen total 28,118, diagonal 22,670 (80.6245%). Every confusion row matches class support. Screenshot's 95.5%, 0.920 and 14,133 relevance population match API. |
| R-skeptic | 2. Verify datasets, rows scored and selection-set qualification against API. | /model | Dataset rows 36,931 / 20,000 / 14,133 / 30,420 / 7,613 match. Cross-dataset scored populations are 28,118 / 30,420 / 7,613. Explicit selection-set caveat and candidate notes agree; no invented figure found. |
| R-skeptic | 3. For every scenario compare collection start and first alert with earliest official record, requesting span plus seven days. | /replay index; five official-events requests | All five pass. Earliest records: Harvey 24 Aug 2017 15:00; Kerala 15 Aug 2018 08:30; California 8 Nov 2018 14:33; Idai 14 Mar 2019 23:30; Puebla 19 Sep 2017 18:14:38. Each precedes collection start and first alert. |
| R-skeptic | 4. Compare the 12:00 transport's last-complete-hour readout with board fearIndexNow. | /replay Kerala; /api/board and flood timeline | 22 Aug 11:00 timeline fearMass is 6.086; board flood fearIndexNow is 6.09. Recorder selects hours complete by playhead. The differing clocks are intentional and consistent. |
| R-skeptic | 5. Check corroboration signs and rounding against first alert and later alerts; inspect frozen-level labels. | /replay Kerala; /api/alerts; format.ts | First alert leadMinutes -3030 yields about 51 h after; alert 396 -2265 yields about 38 h after; alert 394 +315 yields about 5 h before its matched record. Ledger explicitly distinguishes at close and at playhead; no frozen value labelled now in this replay path. |
| R-skeptic | 6. Compare specimen template and send rules with server; check invalid confirmation response. | /subscribe family; notify.ts; /api/status | Current source matches server template, explicitly substitutes peakLevel for the replay specimen, and discloses that substitution. Supplied screenshot still shows older insufficient-level specimen, so revised visual remains unverified. Status confirms emailDeliveryConfigured false; form warns accordingly. Invalid-token curl returns status invalid, not success. |
| R-skeptic | 7. Verify lineage and source/licence inventory. | /about; original-2018 sources; manifests; footer | Original code confirms four cities, Azure keyPhrases/sentiment, negative-count thresholds 15/40, CSV and Flask. Current map style is OpenFreeMap positron; font imports match Archivo/Martian Mono; land asset identifies Natural Earth public-domain provenance. No conflicting licence claim found. |
| R-skeptic | 8. Inspect recovery wording and subject-specific visual treatment. | /404; provided desktop screenshots | 404 names absence without fabricating data and offers board and alert-ledger recovery. Model, replay, about and subscribe retain a coherent instrument vocabulary. No generic dashboard-template finding. |

## Dispositions

- **r7-slop-01** (minor): fixed — The AlertLedger's wide layouts now depend on the ledger's own width (Tailwind v4 container queries, @3xl and @4xl) instead of the viewport, so the replay's split column (about 690 px at 1440) prints the compact layout; the verifier then showed by track arithmetic that the seven-column layout at its own 896 px threshold left the place track 82 px, so the place track got a 148 px floor, the official-record track a 208 px floor (holds "after official by about 38 h" on one line), the gaps went to 12 px (sum 896 px at @4xl, 760 px at @3xl) and the place/hazard group wraps. Captures on the repaired tree: replay-kerala-1440-tall.jpg (split ledger, no collision), alerts-kerala-976.jpg (seven columns at a 912 px container, every cell in its column), alerts-kerala-1024.jpg (seven columns).
- **r7-slop-02** (minor): fixed — stateMark's fallback branch (error, offline) returns ink #15140F; the triangle glyph and the state word carry the message. Verifier confirmed from the source; the disclosure with an injected failure state was not rendered (no browser).
- **r7-ruser-01** (minor): fixed — SubscriptionInput.placeId is bounded 1..2147483647 in the OpenAPI spec (zod regenerated) and createSubscription checks every non-null placeId. Verifier's five POSTs with council-r7-verifier@example.invalid: 0 and -5 → 400 "Number must be greater than or equal to 1"; 1.5 → 400 integer; 99999999999 → 400 maximum; 999999999 → 400 "Unknown place". Main agent's earlier curl of the same bodies agreed.
- **r7-ruser-02** (minor): fixed — StatusPlate registers a document keydown listener while open: Escape closes the sheet and focuses the trigger; a pointerdown or a focus move outside the plate closes it; the mobile menu closes on Escape and refocuses its button. Verified by reading the source only (no browser in this round); aria-expanded follows the same state.
- **r7-ruser-03** (minor): fixed — The console reads the official records first and asks the timeline for the span plus the hours back to the earliest record (plus 6, at most 168): Kerala 685 h starting 15 Aug 01:00 with the 15 Aug 08:30 closure in officialMarkers, Idai 787 h starting 14 Mar 15:00 with the 14 Mar 23:30 landfall; the recorder caption names the lead hours (55 and 17). Captures: replay-kerala-1440-tall.jpg and replay-idai-1440-tall.jpg show the stamp before the trace begins.
- **r7-skeptic-01** (minor): fixed — OfficialEvent carries a required timePrecision (minute, hour, day) from the stored column; format.ts officialTime prints a day-dated record as "19 Mar 2019 (date only)" in the chronology, in the official ledger and for a key moment at the same instant; hour and minute records keep their clock (Kerala 08:30, Puebla 18:14). Verifier's curl of the Idai, Kerala and Puebla official-events endpoints confirmed the field; replay-idai-1440-tall.jpg shows both renderings.

Verifier (fourth subagent, no files edited): five of six fixed on its first pass and one (r7-slop-01) left open with a track-width calculation showing the seven-column layout could still collide at its 896 px threshold; the main agent repaired the track floors, captured the ledger at a 912 px container (alerts-kerala-976.jpg), at 1024 and in the 1440 split, and closed it on that evidence. The verifier reported no new defects.

Decision: REVISE before repair; after repair and verification all findings closed. Phase C is accepted on design (no slop call from any reviewer) and the phase gate counts as passed on the major rule. Phase D (signatures, performance, accessibility) follows; its round 8 reviews the whole site, with a browser-driven keyboard pass owed because three rounds have now verified focus handling from the source alone.

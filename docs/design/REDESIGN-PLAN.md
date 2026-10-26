# Redesign build plan: the chart room

Companion to `DESIGN-BRIEF.md` (v2). Written 2026-10-26. The plan is executed in phases; each phase ends with the same gate and a push to the GitHub mirror, so the repository always shows the latest reviewed state.

## Gate for every phase

1. `pnpm --filter @workspace/calamity-watch run typecheck` clean, `PORT=5173 BASE_PATH=/ pnpm --filter @workspace/calamity-watch run build` clean.
2. Screenshots of every page touched at 1440, 1024 and 390, saved under `generated-artifacts/design-refs/round-N/`, inspected for: unreadable text, overflow, wrong primary action, any slop-catalogue tell, any emoji, any invented number.
3. Keyboard pass on the touched page: tab order, visible focus, Escape on popovers, arrow keys on the recorder readout.
4. Reduced-motion pass: the page with `prefers-reduced-motion: reduce` emulated shows every number and trace.
5. Council round (`docs/council/README.md`): three fresh reviewers (slop, user, skeptic) on the screenshots and curl output, builder repairs, verifier confirms, log written to `docs/council/round-N.md`. The round is accepted only when no reviewer calls it AI slop and all blockers are fixed.
6. Push with `scripts/sync-to-github.sh` as Aman.

## Phase A: foundation and home (round 5)

Files: `index.html` (font preload), `src/index.css` (tokens, type roles, chart paper, focus, press), `src/components/layout/shell.tsx` (station header, footer), `src/components/instruments/{plate,recorder,ledger,stamp,station-marker,legend,schematic,dial,frame-marks}.tsx`, `src/components/board/*` (map with positron style, static fallback redrawn as a paper grid, hazard rail, signal feed as Ledger), `src/pages/home.tsx`, `src/components/sections/{classifier,model-blocks,subscribe-form}.tsx`, `src/components/kit.tsx` (buttons, links, empty and error states), `src/components/charts/charts.tsx` (retired in favour of Recorder where it drew time series).

Data: `useGetSystemStatus`, `useGetBoard`, `useGetHazardTimeline` per hazard for the hero lanes, `useListAlerts`, `useListOfficialEvents`, `useGetModelInfo`, `useClassifyText`, `useCreateSubscription`.

Done when the home page carries the recorder hero, the paper board, the schematic, the dials and the new shell at all three widths, and round 5 is accepted.

## Phase B: evidence pages (round 6)

`/alerts`, `/alerts/:id`, `/places/:id`, `/hazards/:hazard`. Ledger filters persist in the URL. The alert dossier shades the alert window on its recorder and prints the stamp with the measured lead or lag. Place pages get one recorder per hazard with signal. Hazard pages get the hazard recorder, top places and official events.

Data: `useListAlerts`, `useGetAlert`, `useGetPlace`, `useListPlaces`, `useGetHazard`, `useGetHazardTimeline`, `useListPosts`, `useListOfficialEvents`.

## Phase C: console, certificate, forms (round 7)

`/replay` (scenario plates, transport, recorder with cursor, map, alerts ledger, key moments), `/model` (calibration certificate, confusion grid, cross-dataset, limitations, examples, bench), `/subscribe` family, `/about`, 404.

Data: `useListReplayScenarios`, `useGetReplayScenario`, `usePrepareReplayScenario`, `useGetModelInfo`, `useListModelExamples`, `useClassifyText`, `useCreateSubscription`, `useVerifySubscription`, `useUnsubscribe`.

## Phase D: signatures, performance, accessibility (rounds 8+)

Pen draw timing per recorder size, stamp press, pipeline pulse, needle spring, transport cursor, tab indicator; font loading without layout shift (preload, `size-adjust` fallback metrics); Lighthouse-style checks with the dev build (LCP element is the H1 or the recorder, no CLS from fonts or the map); axe-style manual pass on headings, names, contrast, focus order; narrow-width pass for every page. Rounds continue until three reviewers in a row accept with no slop finding.

Status (2026-10-26): done. Rounds 8 and 9 (`docs/council/round-8.md`, `round-9.md`) reviewed the whole site; round 9 closed with two outright ACCEPTs, one API input-bound minor (fixed), and the fifth consecutive unanimous "not slop" verdict. Lighthouse itself was not run (no browser with WebGL2 or a performance trace is available here); the measurable parts were done by hand: main chunk 564 kB with the map lazy, fonts preloaded with size-adjust fallbacks, the recorder drawn from server data without client-side layout shift.

## Working rules

- The design subagent builds each phase from the brief and the real hooks; the main agent screenshots, runs the gate, runs the council, repairs or sends follow-ups, and pushes.
- No new runtime dependency without a sentence in the round log explaining why framer-motion, Recharts, MapLibre or CSS could not do it.
- Nothing is mocked. If a hook has no data in the development database, the page shows its real empty state and the round log says so.
- Every round log claims only checks that were run. Screenshots live in `generated-artifacts/` (not mirrored); the logs describe what they showed.
- Memory and `replit.md` are updated when a decision or quirk would otherwise be lost.

## Risks

- WebGL is unavailable in the screenshot browser, so the MapLibre map is verified by code and by the static fallback; the live map is checked once in a real browser by Aman.
- Font swap can shift the wide display type; mitigated with preload and fallback metrics, verified in round 8.
- The hero recorder needs per-hazard timelines; if the extra requests slow the first paint, lanes load after the first trace and the round log records the measured timing.
- Light basemap labels compete with markers; the markers get a 1 px paper halo and the legend plate states the encodings.

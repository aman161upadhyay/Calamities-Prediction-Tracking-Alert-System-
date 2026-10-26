# Calamity Watch

Hazard warnings read from what people post, before the sirens. Public posts about floods, storms, wildfires, earthquakes, landslides and heat are scored for relevance and fear, resolved to a place, and turned into alerts when a place breaks from its own baseline; every alert is checked against official feeds and the lead time is recorded. It is Aman's 2026 rebuild of the 2018 CodeFunDo++ project `sacredgamers_codefundoMS` (read-only reference; never modify that repository).

## Run & Operate

- Workflows: `artifacts/api-server: API Server` (Express on `PORT`, also launches the Python model service on 8765 as a child process) and `artifacts/calamity-watch: web` (Vite, preview path `/`).
- `pnpm run typecheck` — libs first (`tsc --build`), then artifacts. Run `pnpm -w run typecheck:libs` after editing anything in `lib/` or the artifacts see stale `.d.ts` files.
- `pnpm --filter @workspace/api-spec run codegen` — regenerate React Query hooks (`lib/api-client-react`) and Zod schemas (`lib/api-zod`) from `lib/api-spec/openapi.yaml`.
- `pnpm --filter @workspace/db run push` — push the Drizzle schema (dev only).
- ML: `uv run python -m services.ml.scripts.prepare_data` builds the training/replay data; `uv run python -m services.ml.scripts.train_stage_one` retrains and writes `services/ml/model/stage_one.joblib` + `metrics.json`. The service itself is `services/ml/calamity_ml/service.py` (FastAPI). Use `run_in_background` for training; it takes minutes.
- Mirror to GitHub: `scripts/sync-to-github.sh "subject" ["body"]` commits as Aman into `$HOME/.mirror/calamity-watch` and pushes to `aman161upadhyay/Calamities-Prediction-Tracking-Alert-System-`. Data, model binaries and env files are excluded; `metrics.json` is committed.
- Required env: `DATABASE_URL`, `SESSION_SECRET`. Optional: `X_BEARER_TOKEN` (X recent search; Bluesky is the live source without it), `FIRMS_MAP_KEY` (NASA FIRMS), `RESEND_API_KEY` + `ALERT_FROM_EMAIL` (email alerts; without them subscriptions are stored but nothing is sent).

## Where things live

- `lib/api-spec/openapi.yaml` — the API contract; everything in `lib/api-client-react` and `lib/api-zod` is generated from it.
- `lib/db/src/schema/` — Drizzle schema: posts, post_scores, places, signals_hourly, alerts, official_events, subscriptions, replay_scenario_state, source_runs.
- `artifacts/api-server/src/services/` — ingest (X, Bluesky), official feeds (GDACS RSS, USGS, NWS, FIRMS), scoring, signals, detector, replay, weather, notify. `scheduler.ts` runs the live tick.
- `artifacts/api-server/src/queries/` — read models behind each route; `common.ts` holds `parseScope`, `knownHour`, and the replay text placeholder.
- `services/ml/calamity_ml/` — stage one (TF-IDF + logistic regression: relevance + hazard type), stage two (Cardiff NLP emotion and sentiment), gazetteer and geoparser.
- `artifacts/calamity-watch/src/` — pages (`board`, `alerts`, `replay`, `model`, `subscribe`, `about`, hazard/place/alert detail), `components/board` (the live board), `components/map` (MapLibre + SVG fallback), `components/charts`.
- `docs/` — research, build plan, design brief, council protocol and round logs. `reference/` — redacted 2018 sources and the skill files from `github.com/aman161upadhyay/ai` that govern the build.

## Architecture decisions

- Replay and live share one code path: every query takes a `scope` (`scenario`, `asOf`). Replay rows are tagged by `scenario`; live rows have `scenario = null`. The board reads the last complete hour (`knownHour`) so replay never looks ahead.
- The detector is a robust z-score (median/MAD over a 168 h baseline, min 5 relevant posts/hour): elevated ≥1.5, high ≥3, severe ≥5; an alert opens after two consecutive elevated hours and closes after three low ones. Corroboration is a 250 km / −24..+48 h match against official events.
- Stage one masks place names to one token before training; without this the model memorised locations from the HumAID events. Candidates are chosen by macro-F1 on events never seen in training, and this is disclosed on the model page.
- HumAID terms: tweet text is never served by the API for replay posts (a placeholder plus the `x.com/i/web/status/<id>` link is returned) and raw/processed data and model binaries stay out of the GitHub mirror.
- Generated Zod query-param schemas type `asOf` as a Date, which a query string can never satisfy; routes call `parseQuery` (strips `asOf`/`scenario`) and `parseScope` separately.

## Product

- Board: hazards rail with fear-mass index, map of places with hourly signals, open alerts, signal feed, fear timeline with official-event markers, forecast context.
- Alerts list and detail with corroboration and lead time; hazard and place pages with timelines, emotion mix, recent posts and official events.
- Replay of five HumAID events (Puebla 2017, Harvey 2017, Kerala 2018, California 2018, Idai 2019) with a clock, speeds and key moments. Preparation scores every post once (~25 posts/s) and resumes after a restart.
- Model page: metrics, confusion matrix, cross-dataset results, candidates, datasets and licences, detector settings, limitations, and a live classifier.
- Email subscriptions by place, hazard and minimum level.

## User preferences

- Push continuously to the new GitHub repository as Aman; never touch `sacredgamers_codefundoMS`.
- Natural calamities only; ignore politics and civil unrest. Keep the scope similar to the 2018 project.
- UI quality is reviewed by a council of reviewer subagents until it no longer reads as generic AI output (`docs/council/README.md`).

## Gotchas

- Restarting the API server kills the model service and any replay preparation in flight; preparation resumes on the next start.
- The screenshot browser has no WebGL2, so the map renders the SVG fallback there; real browsers get MapLibre.
- GDACS JSON endpoints require an event type; the RSS feed is used instead. NWS rejects a `limit` parameter. `public.api.bsky.app` returns 403; use `api.bsky.app`.
- `pkill -f train_stage_one.py` matches the calling shell; use the PID.

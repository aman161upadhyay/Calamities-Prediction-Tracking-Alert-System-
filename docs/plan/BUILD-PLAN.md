# Build plan: Calamity Watch

Working title: **Calamity Watch**. Tagline: *Hazard warnings read from what people post, before the sirens.* Rename freely; the code uses `calamity_watch` as the package name.

Scope keeps the 2018 idea (per place and per hazard: trend, risk level, alerts) and replaces every component with a measured one. Civil unrest and politics are out of scope by Aman's decision on 2026-10-26.

## 1. What the system does

1. Pulls public posts about natural hazards from X (budgeted, optional key), Bluesky (free) and a replayable historical set (HumAID).
2. Scores every post with two models: relevance and hazard type (trained here), and emotion with an explicit fear probability (Cardiff multilabel model), plus sentiment.
3. Resolves each post to a place with NER and a gazetteer.
4. Aggregates hourly per place and hazard, compares against that series' own rolling baseline and raises an alert when the fear-weighted signal is anomalous and the volume is sufficient.
5. Corroborates alerts against official feeds (GDACS, USGS, NWS, NASA FIRMS) and records lead time when the social signal came first.
6. Shows all of it on a map-first situation board, with hazard, place, alert and model pages, and emails subscribers when a level is crossed.

Hazards in scope: flood, heavy rain and storm, cyclone and hurricane, wildfire, earthquake, landslide, heatwave and drought, tsunami. Each hazard has a keyword set for search and a label in the classifier.

## 2. Architecture

Single repository, two build targets, one deployment.

```
calamity-watch/
  backend/                 Python 3.11, FastAPI, SQLAlchemy 2, APScheduler, httpx
    calamity_watch/
      api/                 routers: board, hazards, places, alerts, model, replay, subscribe
      ingest/              x_client (budgeted), bluesky_client, official_feeds, replay_loader
      ml/                  scoring service (stage 1 + stage 2), geoparse, text cleaning
      signals/             hourly aggregation, baseline, detector, corroboration, lead time
      alerts/              state machine, notifier (Resend email, in-app)
      db/                  models, session, migrations (Alembic)
      scheduler.py         jobs: ingest every 15 min, official feeds every 15 min, aggregate hourly + on demand
    tests/                 pytest: scoring, detector, geoparse, api
  ml/                      training and evaluation, run offline, outputs committed as metrics
    prepare_data.py        HumAID subsets + Kaggle disaster tweets -> parquet
    train_baseline.py      TF-IDF + logistic regression, metrics.json, model artifact
    train_transformer.py   stretch: 1-epoch fine-tune of distilroberta, compared on the same test split
    eval_report.py         writes docs/model-card.md and backend/calamity_watch/ml/metrics.json
  frontend/                React 18, Vite, TypeScript, Tailwind, shadcn/ui (Radix), MapLibre GL, Recharts, Motion
    src/
      app/                 routes: /, /hazards/:id, /places/:id, /alerts, /alerts/:id, /model, /replay, /subscribe, /about
      components/board/    Map, HazardRail, SignalFeed, Timeline, StatusBar
      components/ui/       shadcn primitives, tokens in tailwind.config and globals.css
      lib/api.ts           typed client for the FastAPI routes
  docs/                    research, plan, design, council logs, model card
  reference/               redacted 2018 sources; the skill files from Aman's ai repository
```

Deployment: FastAPI serves `/api/*` and the built frontend from `frontend/dist`. The scheduler runs in-process; the deployment type must keep the process alive (Reserved VM on Replit). If Autoscale is chosen instead, the three jobs move to a scheduled deployment that calls `/api/internal/run-jobs` with a shared token.

Database: Postgres. Tables: `sources`, `posts`, `post_scores`, `places`, `post_places`, `signals_hourly`, `alerts`, `alert_events`, `official_events`, `subscriptions`, `notifications`, `ingest_runs`, `model_runs`. Indexes on `(place_id, hazard, hour_utc)`, `posts(created_at)`, `official_events(hazard, starts_at)`.

Secrets (all optional, the app runs without them): `X_BEARER_TOKEN`, `X_DAILY_BUDGET_USD` (default 0.50), `FIRMS_MAP_KEY`, `RESEND_API_KEY`, `ALERT_FROM_EMAIL`, `INTERNAL_JOB_TOKEN`.

## 3. Machine learning

### Stage 1: relevance and hazard type (trained in this repository)

- Data: `QCRI/HumAID-event-type` subsets (earthquake, fire, flood, hurricane) give hazard labels from the subset name and relevance from `class_label != not_humanitarian`. Kaggle `nlp-getting-started` train split adds `target=0` negatives and a second, cross-dataset test. Negatives for "no hazard" also come from HumAID `not_humanitarian` rows. Landslide, heatwave and tsunami have no HumAID subset; they are handled by keyword routing plus the relevance score until labelled data exists, and the model card says so.
- Baseline: TF-IDF (word 1-2 grams and char 3-5 grams) with logistic regression, one-vs-rest for hazard, a separate binary head for relevance. Trains in minutes on CPU. Reported: accuracy, macro-F1, per-class F1, confusion matrix on the HumAID test split, and accuracy on the Kaggle test split as a cross-dataset check.
- Stretch: fine-tune `distilroberta-base` (or `cardiffnlp/twitter-roberta-base-2021-124m`) for one epoch on up to 20k rows, max length 64, on CPU. Ship it only if it beats the baseline on the same split; otherwise ship the baseline and record the comparison.
- Output per post: `p_relevant`, `hazard` (argmax) and `hazard_probs`.

### Stage 2: emotion and sentiment (off the shelf)

- `cardiffnlp/twitter-roberta-base-emotion-multilabel-latest` returns 11 probabilities; keep `fear`, `anger`, `sadness`, `pessimism`, `optimism`. Model card: F1 micro 0.717, macro 0.546 on SemEval-2018 E-c test.
- `cardiffnlp/twitter-roberta-base-sentiment-latest` for a three-class sentiment.
- Fallback if CPU time is short: `j-hartmann/emotion-english-distilroberta-base`.
- Models load once at startup; batches of 32; truncate to 96 tokens; preprocessing replaces handles with `@user` and links with `http`, as Cardiff recommends.

### Geoparsing

spaCy `en_core_web_sm` for GPE and LOC spans, matched against a gazetteer built from GeoNames `cities15000` (CC BY 4.0) filtered to population above 50k plus the featured places, with population as the tie-break prior and the query's region as context. X `geo.place_id` is used when present. Each resolution stores method and confidence. The featured places on day one: Mumbai, Chennai, Kolkata, Delhi (continuity with 2018), Kerala, Houston, Los Angeles, Dhaka, Jakarta, Manila. The list is a table, not code.

### Signals and detection

For each `(place, hazard, hour_utc)`: `n_posts`, `n_relevant` (p_relevant above 0.5), `fear_mass = sum(p_relevant * p_fear)`, `anger_mass`, `mean_sentiment`. Baseline per series: median and MAD of `fear_mass` over the previous 7 days (same hour of day when at least 5 points exist, otherwise all hours). Robust z: `0.6745 * (x - median) / MAD`, with MAD floored at a small constant.

Risk level: `insufficient` when `n_relevant < 5`; `low` when z below 1.5; `elevated` 1.5 to 3; `high` 3 to 5; `severe` above 5. An alert opens after two consecutive hours at `elevated` or above and closes after three consecutive hours at `low`. Every level is shown as text next to its colour.

Corroboration: an open alert is `corroborated` when an official event of the same hazard family exists within 250 km and from 24 hours before to 48 hours after the alert opened. Lead time in minutes is `official.starts_at - alert.opened_at` when positive. These two fields are the honest version of the 2018 claim about social media beating the news.

The site labels the whole system as experimental and not an official warning source, on the board and on every alert.

## 4. Data sources and budget

| Source | Cadence | Budget rule |
|---|---|---|
| X `tweets/counts/recent` per hazard keyword set | every 60 min | per-request billing; at most 8 requests per hour |
| X `tweets/search/recent` sampled posts | every 60 min | `max_results` 10 to 50 per hazard, stop when `X_DAILY_BUDGET_USD` is reached; spend recorded in `ingest_runs.cost_estimate_usd` |
| Bluesky `searchPosts` per hazard keyword set, `sort=latest`, `lang=en` | every 15 min | none; check reachability from the deployment, fall back to Jetstream |
| GDACS, USGS, NWS, FIRMS | every 15 min | none; FIRMS needs the free key |
| Open-Meteo flood and precipitation for featured places | every 6 h | none |
| Replay (HumAID events: Kerala floods 2018, Hurricane Harvey 2017, California wildfires 2018) | on demand | none |

Dedup by `(source, external_id)`. Keep raw text and URL; do not store author handles beyond a salted hash. Honour each platform's terms: show source and link out; no bulk redistribution of post text through the API beyond what the UI needs.

## 5. Frontend surfaces

See `docs/design/DESIGN-BRIEF.md` for tokens and layout. Pages and their primary job:

| Route | Primary job | Must show |
|---|---|---|
| `/` | In five seconds: what this is, and what is happening now | status bar (last ingest, sources online, model version), one-sentence statement, the live board (map, hazard rail, signal feed, 72-hour timeline), then how it works, model summary, lineage from 2018, try the classifier, subscribe |
| `/hazards/:hazard` | Where and how strongly this hazard is being felt | timeline with official-event markers, emotion mix over time, places table (risk, z, n, trend), recent posts with scores |
| `/places/:id` | What this place should watch | per-hazard sparklines and levels, open and past alerts, nearby official events, Open-Meteo context |
| `/alerts`, `/alerts/:id` | Evidence behind a warning | opened, peak, level, corroboration, lead time, the posts and the series that triggered it |
| `/model` | Trust the numbers | pipeline, datasets with licences, metrics tables, confusion matrix, limitations, live "classify this text" demo |
| `/replay` | See it work on a known disaster | scenario picker, play at 60x, the board animating through the event |
| `/subscribe` | Get notified | email, place, hazard, minimum level; double opt-in; unsubscribe link in every email |
| `/about` | Lineage and honesty | 2018 project, what changed, sources, what the system is not |

States that must exist on every data surface: loading, empty (no posts yet), insufficient data, stale (last ingest older than 45 minutes, previous result kept visible), source offline, request failed with retry.

## 6. Milestones for the overnight build

Each milestone ends with tests passing, a screenshot review at 1440, 1024 and 390 px, a commit by Aman, and a push to `main`.

| # | Milestone | Acceptance check |
|---|---|---|
| M0 | Scaffold: backend, frontend, Postgres schema, tokens, CI-less test runner, first push | `pytest` and `vite build` pass; `/api/health` returns model and DB status |
| M1 | ML: data prep, baseline training, metrics, scoring service, model card | `metrics.json` committed with HumAID test macro-F1 and Kaggle accuracy; `POST /api/model/classify` returns scores in under 1.5 s for one text on CPU |
| M2 | Ingestion and signals: Bluesky, X with budget guard, official feeds, geoparse, aggregates, detector, alerts, replay loader, scheduler | A replay of Kerala floods 2018 opens at least one `flood` alert for a Kerala place; detector unit tests cover baseline, hysteresis and insufficient-volume gating; X client test proves it stops at the budget |
| M3 | Board and pages: map, rail, feed, timeline, hazard, place, alert, model (with try-it), replay | Keyboard-only walk through board, open an alert, run the classifier; 390 px layout keeps map, feed and primary actions |
| M4 | Landing sections, subscribe with double opt-in, accessibility floor, performance pass, council rounds and logs | Contrast measured on every semantic pair; Lighthouse accessibility 95 or above; council exit criteria met or the open items listed with owners |

Stretch, in order: transformer fine-tune comparison; Reddit source; web push; H3 hex layer on the map; per-place weekly digest email.

## 7. Review loop (the council)

`docs/council/README.md` adapts Aman's protocol to this project. In short: after M3 and after M4, three independent reviewers (code rubric, design rubric with screenshots, user-advocate browser run) file findings in the shared schema; a separate repair pass fixes blockers and majors; a verifier reruns the specific reproduction and the regression slice; the round log is committed. A round that finds new majors is followed by another round. Exit when a round finds zero new blockers or majors and no more new minors than the previous round.

## 8. Risks and the planned response

| Risk | Response |
|---|---|
| Torch CPU install is large or slow on the host | Install CPU wheels from the PyTorch index; if memory is short, switch stage 2 to the DistilRoBERTa fallback and record the change |
| Bluesky public API blocked from the deployment | Jetstream websocket consumer filtered by hazard keywords; if that fails too, run on X and replay only and say so on the status bar |
| X key absent or budget spent | Board shows "X: not configured" or "X: daily budget reached"; all other sources continue |
| Gazetteer ambiguity | Population prior, query context, confidence stored and shown; ambiguous resolutions below 0.5 confidence do not feed alerts |
| False alarms | Minimum volume, hysteresis, corroboration label, evidence page, experimental banner |
| Replit Autoscale sleeps the scheduler | Reserved VM, or scheduled deployment calling the internal jobs endpoint |

# Calamity Watch

Hazard warnings read from what people post, before the sirens.

Calamity Watch pulls public posts about floods, storms, wildfires, earthquakes, landslides and heat from X and Bluesky, scores each one for hazard relevance and fear with two models, resolves it to a place, and raises an alert when a place's fear-weighted signal breaks from its own baseline. Alerts are checked against GDACS, USGS, NWS and NASA FIRMS, and the time between the social signal and the official record is kept, whichever came first (in the replays the official record usually did).

This is the 2026 rebuild of [sacredgamers_codefundoMS](https://github.com/aman161upadhyay/sacredgamers_codefundoMS), a Microsoft CodeFunDo++ 2018 hackathon entry. The original is kept unchanged; a redacted copy of its sources is in `reference/original-2018/` and the audit is in `docs/research/01-original-system-audit.md`.

## What it does

- **Board** — eight hazards ranked by fear mass in the last hour, a map of places with hourly signals, open alerts, the signal feed, and a seven-day fear timeline with official events marked on it.
- **Alerts** — each alert records the place, hazard, peak z-score, the posts behind it, whether an official feed recorded a matching event, and how long before or after that record the alert opened (in the replays, usually after: the collections start late).
- **Replay** — five past events from the HumAID collection (Puebla earthquake 2017, Hurricane Harvey 2017, Kerala floods 2018, California wildfires 2018, Cyclone Idai 2019) played back hour by hour through the same detector that runs live.
- **Model** — held-out metrics, confusion matrix, results on events never seen in training, the two candidates compared, datasets and licences, detector settings, limitations, and a classifier you can type into.
- **Subscribe** — email when an alert opens for a place or hazard, at a minimum level you choose.

## How it works

| Step | 2018 | 2026 |
|---|---|---|
| Posts | Twitter streaming API, four Indian cities | X recent search on a daily budget plus Bluesky public search, any place |
| Understanding | Azure key phrases and generic sentiment | Trained hazard classifier plus a multilabel emotion model for fear |
| Place | The city a stream was filtered on | Named-entity recognition against a 34,665-place gazetteer; the text has to name the place |
| Alert rule | Fixed threshold on negative tweets | Robust z-score against each place's own 7-day baseline |
| Checking | None | Every alert matched against GDACS, USGS, NWS and NASA FIRMS; lead time recorded |
| Storage and UI | CSV and a Flask page | Postgres, a typed API and a React board with replay of past events |

**Stage one** (`services/ml/calamity_ml/stage_one.py`) is a hashing TF-IDF + logistic-regression model with two heads, relevance and hazard type, trained on 14 HumAID events plus TweetEval negatives. Place names are masked to a single token before training so the model cannot memorise locations. Held-out test split: hazard accuracy 0.955, macro-F1 0.920; relevance accuracy 0.925, F1 0.935. On five events never seen in training: hazard accuracy 0.806, macro-F1 0.837. Full numbers are in `services/ml/model/metrics.json` and on the model page.

**Stage two** uses `cardiffnlp/twitter-roberta-base-emotion-multilabel-latest` for fear (and ten other emotions) and `cardiffnlp/twitter-roberta-base-sentiment-latest` for sentiment.

**Detector** (`artifacts/api-server/src/services/detector.ts`): hourly fear mass per place and hazard, compared with the median and MAD of the previous 168 hours; elevated at z ≥ 1.5, high at 3, severe at 5; an alert opens after two consecutive elevated hours and closes after three quiet ones. Corroboration is a 250 km, −24 h to +48 h match against official events.

## Repository map

| Path | Contents |
|---|---|
| `artifacts/calamity-watch/` | React + Vite frontend |
| `artifacts/api-server/` | Express API, ingestion, scoring, detector, replay, scheduler |
| `services/ml/` | Python model service (FastAPI), training and data-preparation scripts, `model/metrics.json` |
| `lib/api-spec/openapi.yaml` | API contract; `lib/api-client-react` and `lib/api-zod` are generated from it |
| `lib/db/` | Drizzle schema and client |
| `docs/research/` | audit of the 2018 system; findings on X API pricing, data sources, models, datasets and UI references |
| `docs/plan/BUILD-PLAN.md` | architecture, ML pipeline, detector, data budget, pages, milestones, risks |
| `docs/design/DESIGN-BRIEF.md` | brief, tokens, layout, uniqueness review |
| `docs/council/` | review protocol and the round logs |
| `reference/original-2018/` | redacted 2018 sources |
| `reference/ai-skills/` | the design, writing, coding and council skill files from `github.com/aman161upadhyay/ai` that govern the build |

## Running it

```
pnpm install
uv sync                                   # Python model service
pnpm --filter @workspace/db run push      # needs DATABASE_URL
pnpm --filter @workspace/api-server run dev   # starts the API and the model service
pnpm --filter @workspace/calamity-watch run dev
```

Optional environment: `X_BEARER_TOKEN` (X recent search; Bluesky is used without it), `FIRMS_MAP_KEY` (NASA FIRMS active fires), `RESEND_API_KEY` and `ALERT_FROM_EMAIL` (email alerts).

Training data is not in this repository. `services/ml/scripts/prepare_data.py` downloads HumAID, TweetEval, the Kaggle disaster-tweets set and GeoNames and builds the training and replay files; `train_stage_one.py` retrains and rewrites `metrics.json`. HumAID text is used only for training and local scoring and is never served by the API.

After a model, detector or gazetteer change, rebuild the replays with `pnpm --filter @workspace/api-server run replay:rebuild` (all scenarios, or named ones; `--live` re-resolves places for recent live posts). It runs against the API's model service, so keep the API up. A rebuild renumbers that scenario's alert ids; the public API cannot trigger one.

## Not an official warning source

Calamity Watch is an experimental research system. It does not replace national meteorological, geological or civil-protection services. Every alert in the interface carries this notice.

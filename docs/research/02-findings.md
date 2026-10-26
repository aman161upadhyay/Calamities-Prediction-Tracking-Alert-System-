# Research findings, 2026-10-26

Each claim below was checked by opening the page on this date unless marked "search snippet only".

## 1. X API access in 2026: there is no free read tier

- X moved to pay-per-use credits as the default in February 2026 and closed the Free, Basic and Pro subscription tiers to new developers. Reading a post costs $0.005 and reading a user $0.010; pay-per-use accounts are capped at 3 million post reads per billing cycle. Sources: docs.x.com pricing page (search snippet only; the page blocked a direct fetch), api.sorsa.io "Is the Twitter API free in 2026" (updated 2026-10-11), superframeworks.com (verified 2026-10-10), kurums.com (2026-10-07), outstand.so.
- The X changelog entry of 2026-10-02 adds a one-time $20 of free credits when a pay-per-use account saves its first eligible payment card (search snippet of docs.x.com/changelog). That $20 is the realistic "free tier": about 4,000 post reads.
- `GET /2/tweets/counts/recent` is billed per HTTP request, not per post returned. It gives per-hour volumes for a query over the last 7 days. This is the cheap signal; sampled post reads are the expensive one.
- Consequence for the design: the X connector works on a strict daily budget (counts first, then a small sample of posts per hazard and region), records its spend, and degrades to the other sources when the budget is spent. The app runs fully without an X key.

## 2. Free social sources that work without a budget

- Bluesky: the public AppView `https://public.api.bsky.app/xrpc/app.bsky.feed.searchPosts` needs no token for `app.bsky.*` reads (docs.bsky.app, read 2026-10-26). From this research sandbox the host returned HTTP 403 through its CDN, so reachability must be checked again from the deployed app; the Jetstream websocket firehose is the fallback. A December 2025 paper in the Journal of Computational Social Science collected 676,337 Bluesky posts for the September 2024 Central Europe floods and the January 2025 Southern California wildfires and found disaster-related content peaked at up to 80% of daily posts during impact phases, with fear and anger rising alongside event progression (link.springer.com/article/10.1007/s42001-025-00448-x).
- Reddit: the official API is free at about 100 requests per minute with OAuth for personal and research use (socialcrawl.dev summary, 2026-09-02; search snippet only). Optional for a later milestone.

## 3. Official hazard feeds (all checked live on 2026-10-26)

| Feed | Endpoint | Auth | Notes |
|---|---|---|---|
| GDACS | `https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?eventlist=EQ,TC,FL,WF,DR,VO&alertlevel=Green;Orange;Red` | none | GeoJSON with alert level, country, dates; worked |
| USGS earthquakes | `https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson` | none | 41 events returned; worked |
| NWS alerts (US) | `https://api.weather.gov/alerts/active?area={state}` | none, needs a User-Agent header | `limit` is not a valid parameter; worked otherwise |
| NASA FIRMS active fires | `https://firms.modaps.eosdis.nasa.gov/api/area/csv/{MAP_KEY}/VIIRS_SNPP_NRT/{bbox}/1` | free MAP_KEY | not called yet; key required |
| Open-Meteo flood | `https://flood-api.open-meteo.com/v1/flood?latitude=..&longitude=..&daily=river_discharge` | none | worked; river discharge forecast |

## 4. Models and datasets

Disaster relevance and hazard type:

- `QCRI/HumAID-event-type` on Hugging Face: English tweets from 19 disasters (2016 to 2019) with subsets earthquake (8.9k), fire (11.1k), flood (11.2k), hurricane (45.3k) and humanitarian class labels (caution_and_advice, displaced_people_and_evacuations, infrastructure_and_utility_damage, injured_or_dead_people, missing_or_found_people, not_humanitarian, other_relevant_information, requests_or_urgent_needs, rescue_volunteering_or_donation_effort, sympathy_and_support). Read 2026-10-26. The subset name gives the hazard label for free.
- `QCRI/CrisisBench-all-lang` and `QCRI/CrisisMMD`: consolidated informativeness and humanitarian labels across more events (CrisisBench paper, ICWSM 2021).
- `DunnBC22/roberta-base-Tweet_About_Disaster_Or_Not`: off-the-shelf binary model, reported F1 0.757 and accuracy 0.899 on its evaluation set.
- Kaggle "Natural Language Processing with Disaster Tweets" (nlp-getting-started): 7.6k labelled tweets, useful as a second held-out test set.

Emotion and sentiment:

- `cardiffnlp/twitter-roberta-base-emotion-multilabel-latest`: 11 emotions including fear, trained on SemEval-2018 Task 1 E-c; F1 micro 0.717, macro 0.546 on the test split (model card, read 2026-10-26). In the SemEval-2025 Task 11 paper, this model family reached 91% recall on fear (aclanthology 2025.semeval-1.298).
- `j-hartmann/emotion-english-distilroberta-base`: 7 classes including fear, smaller and faster; the fallback when CPU time is tight.
- `cardiffnlp/twitter-roberta-base-sentiment-latest`: three-class sentiment, kept as a secondary signal.

Decision: a two-stage pipeline. Stage 1 is a classifier trained in this repository on HumAID (relevance plus hazard type, with reported held-out metrics). Stage 2 is the Cardiff multilabel emotion model for the fear score, with sentiment as a secondary channel. Both run on CPU. The per-post output is `p_relevant`, `hazard`, `p_fear`, `p_anger`, `sentiment`.

## 5. Method ideas from recent research

- Spatial hot spots against a baseline: the DLR wildfire paper (Big Earth Data, 2025-01-30, DOI 10.1080/20964471.2025.2454526) counts disaster-related posts per H3 grid cell, compares against a prior-year baseline and runs Getis-Ord Gi* hot-spot analysis to raise an alert. We adapt the baseline idea temporally: each place-and-hazard series is scored against its own rolling 7-day baseline.
- Emotion trajectories: the climate-crisis survey (arXiv 2504.18837) describes fear, outrage, solidarity and blame phases around extreme weather. The hazard detail page shows the emotion mix over time, not only fear.
- Corroboration and lead time: pairing social signals with authoritative feeds lets the system label an alert as corroborated and measure how many minutes the social signal led the official one. This is the metric that makes the 2018 README claim ("15 minutes on social media versus 3 hours on news") testable.
- Replay: HumAID includes Kerala floods 2018, Hurricane Harvey 2017 and the California wildfires 2018 with timestamps, so the system can replay a known event through the live pipeline for a demo that does not depend on API budget.

## 6. UI references

- 21st.dev map, globe and dashboard listings (read 2026-10-26): Manu Arora's World Map (MIT, `dotted-map` + `framer-motion`), shuding's COBE globes (the `cobe` npm package), data grid tables, area and bar charts, collapsible dashboard sidebars. Installing through the 21st.dev registry needs an API key; the underlying open-source packages are used directly instead.
- Dribbble searches "disaster dashboard", "early warning system", "disaster management": dark geospatial situation boards (Earthquake Risk Dashboard, Real-Time Disaster Monitoring Dashboard, Flood Management Dashboard), mobile alert apps with map-first layouts (Disaster Alert App, Fire Shield). Common traits worth keeping: the map is the primary surface, alerts are a vertical feed beside it, hazard categories are colour-coded with text labels. Common traits worth dropping: decorative KPI rows, invented numbers, glass panels over the map.
- Aman's `ai` repository: `frontend-design` skill, Emil Kowalski's design-engineering skill, the design agent's slop catalogue (68 tells), the dashboard and landing checklists, the adversarial council protocol and finding schema. Copies are in `reference/ai-skills/`.

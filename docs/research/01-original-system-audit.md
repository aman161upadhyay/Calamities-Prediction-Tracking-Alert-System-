# Audit of the 2018 system (sacredgamers_codefundoMS)

Source: `github.com/aman161upadhyay/sacredgamers_codefundoMS`, read at commit `ed0f9a3` on 2026-10-26. The original repository is not modified. A redacted copy of the four meaningful files lives in `reference/original-2018/`.

## What it did

Microsoft CodeFunDo++ 2018 entry: "Predicting natural disasters and calamities by sentiment analysis and automated alert system."

| Part | Implementation | File |
|---|---|---|
| Ingestion | Twitter Streaming API, `statuses/filter` tracked on a city name (Mumbai, Chennai, Kolkata, Delhi), 50 tweets per city per cycle | `tweet_extracter.py` |
| Relevance | Azure Text Analytics v2 key-phrase extraction; a tweet counted only if a key phrase exactly matched one of 12 keywords (Flood, Tsunami, Earthquake, Rain, Cyclone, Storm, Hurricane, Landslide, Waves, Famine, Violence, Riot) | `tweet_extracter.py` |
| Sentiment | Azure Text Analytics sentiment score; above 0.45 counted as positive ("disaster slowing down"), otherwise negative ("disaster increasing") | `tweet_extracter.py` |
| Trend and risk | Per city and keyword: compare this cycle's counts to the last cycle to label `increasing`, `decreasing`, `Almost constant`; negative count above 40 is `High Risk`, above 15 `Moderate Risk`, else `Low Risk` | `tweet_extracter.py` |
| Storage | One CSV row per city, rewritten every cycle | `result.csv` |
| Web | Flask: pick a city (cookie), render 12 lines of "The Status of X is Y, and the risk level is Z" using a Start Bootstrap resume template | `__init__.py`, `templates/` |
| Alerts | Described in the README (email to subscribers, rescue teams, authorities); not implemented | README |

## What holds up

- The core idea is still supported by current research: people post about floods and fires before official channels report them, and the share of disaster-related posts and of fear expressions rises with event progression (see `02-findings.md`).
- The product framing is right: per-place, per-hazard status with a risk level and a trend, for the public and for responders.
- The hazard list minus the two civil-unrest items is the scope Aman asked for in 2026.

## What does not hold up, and what replaces it

| 2018 limitation | 2026 replacement |
|---|---|
| Keyword match on key phrases; "Rain" counts any mention of rain | A trained relevance and hazard-type classifier (HumAID and CrisisBench data), with per-post probabilities |
| Generic sentiment as a proxy for danger; positive means "slowing down" | Emotion model with an explicit fear score, plus relevance weighting; sentiment kept as a secondary signal |
| Fixed thresholds (15, 40) on raw counts | Robust anomaly detection against a rolling baseline per place and hazard, with minimum-volume gating and hysteresis |
| Four hard-coded Indian cities tracked by city name | Geoparsing of place mentions against a gazetteer, any region, with the original four cities kept as featured regions |
| Twitter streaming API (discontinued) and one paid Azure service | X API v2 recent search with a spend guard, Bluesky public search as the free source, official feeds (GDACS, USGS, NWS, NASA FIRMS, Open-Meteo) for corroboration |
| CSV overwritten each cycle, no history | Postgres with hourly aggregates, alert history and model run records |
| Status text list | Map-first situation board, per-hazard timelines, alert feed, model page, subscriber alerts |
| No tests, no model evaluation | Held-out metrics reported on the site, reproducible training script, council review logs |

## Security note for Aman

`tweet_extracter.py` in the original repository contains what look like live Twitter consumer and access credentials and an Azure Cognitive Services key, and `__init__.py` contains a Flask secret key, all committed in plain text. They are eight years old and the Twitter v1.1 streaming endpoint is gone, but revoke the Azure key and the Twitter app if they still exist. The copy under `reference/original-2018/` has these values replaced with placeholders. The new repository keeps every credential in environment secrets.

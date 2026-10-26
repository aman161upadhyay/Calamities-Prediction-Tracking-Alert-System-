"""FastAPI model service used by the API server.

Endpoints
  GET  /health      readiness and versions
  POST /score       score a batch of texts (stage one, stage two, geoparse)
  GET  /model-card  metrics and model descriptions for the /api/model page
"""
from __future__ import annotations

import json
import logging
import threading
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from .config import EMOTION_MODEL, HAZARD_IDS, MODEL_DIR, MODEL_VERSION, SENTIMENT_MODEL, TRAINED_CLASSES
from .preprocess import keyword_hazards
from .stage_one import StageOneModel, choose_hazard

log = logging.getLogger("calamity_ml")


class State:
    stage_one: StageOneModel | None = None
    stage_two = None
    geoparser = None
    error: str | None = None
    started_at = time.time()
    lock = threading.Lock()

    @classmethod
    def ready(cls) -> bool:
        return cls.stage_one is not None and cls.stage_two is not None and cls.geoparser is not None


def _load_all() -> None:
    try:
        t0 = time.time()
        State.stage_one = StageOneModel.load()
        log.info("stage one loaded in %.1fs", time.time() - t0)
        from .geoparse import Geoparser

        t0 = time.time()
        State.geoparser = Geoparser()
        log.info("geoparser loaded in %.1fs (%d places)", time.time() - t0, len(State.geoparser.gazetteer))
        from .stage_two import StageTwo

        t0 = time.time()
        State.stage_two = StageTwo()
        log.info("stage two loaded in %.1fs", time.time() - t0)
    except Exception as exc:  # noqa: BLE001
        State.error = f"{type(exc).__name__}: {exc}"
        log.exception("model loading failed")


@asynccontextmanager
async def lifespan(_: FastAPI):
    threading.Thread(target=_load_all, name="model-loader", daemon=True).start()
    yield


app = FastAPI(title="Calamity Watch Post model service", version=MODEL_VERSION, lifespan=lifespan)


class ScoreItem(BaseModel):
    id: str
    text: str = Field(min_length=1, max_length=4000)


class ScoreRequest(BaseModel):
    items: list[ScoreItem] = Field(max_length=256)
    geoparse: bool = True
    # Gazetteer key of a place the stream is known to be about (a replay scenario's region). Breaks homonym ties only.
    contextPlaceKey: str | None = None


class GeoparseRequest(BaseModel):
    items: list[ScoreItem] = Field(max_length=512)
    contextPlaceKey: str | None = None


def _context_place(key: str | None):
    if not key or State.geoparser is None:
        return None
    return State.geoparser.gazetteer.by_key.get(key)


@app.get("/health")
def health() -> dict:
    return {
        "ready": State.ready(),
        "error": State.error,
        "modelVersion": MODEL_VERSION,
        "stageOneLoaded": State.stage_one is not None,
        "stageTwoLoaded": State.stage_two is not None,
        "geoparserLoaded": State.geoparser is not None,
        "gazetteerPlaces": len(State.geoparser.gazetteer) if State.geoparser else 0,
        "uptimeSeconds": int(time.time() - State.started_at),
    }


@app.post("/score")
def score(req: ScoreRequest) -> dict:
    if not State.ready():
        raise HTTPException(status_code=503, detail=State.error or "models are still loading")
    t0 = time.time()
    texts = [it.text for it in req.items]
    context = _context_place(req.contextPlaceKey)
    with State.lock:
        s1 = State.stage_one.predict(texts)
        s2 = State.stage_two.predict(texts)
        places = [State.geoparser.resolve(t, context) if req.geoparse else [] for t in texts]
    results = []
    for it, a, b, pl in zip(req.items, s1, s2, places):
        kw = keyword_hazards(it.text)
        hazard, method = choose_hazard(a["hazard_probs"], kw)
        results.append({
            "id": it.id,
            "pRelevant": round(a["p_relevant"], 4),
            "hazard": hazard,
            "hazardMethod": method,
            "hazardProbs": {k: round(v, 4) for k, v in a["hazard_probs"].items()},
            "keywordHits": kw,
            "emotions": {k: round(v, 4) for k, v in b["emotions"].items()},
            "pFear": round(b["p_fear"], 4),
            "pAnger": round(b["p_anger"], 4),
            "pSadness": round(b["p_sadness"], 4),
            "sentiment": b["sentiment"],
            "sentimentScore": round(b["sentiment_score"], 4),
            "places": [r.to_dict() for r in pl],
        })
    return {"modelVersion": MODEL_VERSION, "latencyMs": int((time.time() - t0) * 1000), "results": results}


@app.post("/geoparse")
def geoparse(req: GeoparseRequest) -> dict:
    """Place resolution only (no classifiers), for re-resolving stored posts after a gazetteer change."""
    if State.geoparser is None:
        raise HTTPException(status_code=503, detail=State.error or "the geoparser is still loading")
    t0 = time.time()
    context = _context_place(req.contextPlaceKey)
    with State.lock:
        places = [State.geoparser.resolve(it.text, context) for it in req.items]
    return {
        "latencyMs": int((time.time() - t0) * 1000),
        "results": [{"id": it.id, "places": [r.to_dict() for r in pl]} for it, pl in zip(req.items, places)],
    }


@app.get("/model-card")
def model_card() -> dict:
    try:
        with open(MODEL_DIR / "metrics.json", encoding="utf-8") as fh:
            metrics = json.load(fh)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail="metrics.json not found; train the model first") from exc
    return {
        "version": MODEL_VERSION,
        "modelReady": State.ready(),
        "stageOne": metrics,
        "emotionModel": {
            "name": EMOTION_MODEL,
            "url": f"https://huggingface.co/{EMOTION_MODEL}",
            "task": "Multilabel emotion (11 labels, sigmoid per label); fear is used for the fear index",
            "reportedMetric": "Model card: F1 micro 0.717, macro 0.546 on SemEval-2018 Task 1 E-c test (as reported by Cardiff NLP)",
            "labels": State.stage_two.emotion_labels if State.stage_two else ["anger", "anticipation", "disgust", "fear", "joy", "love", "optimism", "pessimism", "sadness", "surprise", "trust"],
        },
        "sentimentModel": {
            "name": SENTIMENT_MODEL,
            "url": f"https://huggingface.co/{SENTIMENT_MODEL}",
            "task": "Three-class sentiment (negative, neutral, positive); score is p(positive) - p(negative)",
            "reportedMetric": "Trained on about 124M tweets (Jan 2018 to Dec 2021) and fine-tuned on TweetEval sentiment, per the model card",
            "labels": ["negative", "neutral", "positive"],
        },
        "geoparser": {
            "method": "spaCy en_core_web_sm named entities (GPE, LOC; ORG and FAC spans only when they start with a large city, region or country) resolved against a gazetteer with a population prior, country and state context from the same text, a trailing US state code, and, in replay, the scenario's region as a tie-breaker between homonyms; camel-case hashtags are split first",
            "gazetteer": "GeoNames cities15000 (CC BY 4.0): towns of 50k+ resolve on their own, towns of 15k to 50k only with supporting context; plus capitals, 250 countries and a curated table of regions with admin codes and extents",
            "placesInGazetteer": len(State.geoparser.gazetteer) if State.geoparser else 0,
        },
        "hazards": HAZARD_IDS,
        "trainedClasses": TRAINED_CLASSES,
    }

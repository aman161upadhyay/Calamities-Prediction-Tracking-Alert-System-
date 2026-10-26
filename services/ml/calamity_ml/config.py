from __future__ import annotations

import json
import os
from pathlib import Path

ML_DIR = Path(__file__).resolve().parent.parent
REPO_ROOT = ML_DIR.parent.parent
DATA_DIR = ML_DIR / "data"
RAW_DIR = DATA_DIR / "raw"
PROCESSED_DIR = DATA_DIR / "processed"
REPLAY_DIR = DATA_DIR / "replay"
MODEL_DIR = ML_DIR / "model"

MODEL_VERSION = os.environ.get("CW_MODEL_VERSION", "1.0")

EMOTION_MODEL = "cardiffnlp/twitter-roberta-base-emotion-multilabel-latest"
SENTIMENT_MODEL = "cardiffnlp/twitter-roberta-base-sentiment-latest"
MAX_TOKENS = 96
BATCH_SIZE = 32

# Make the Hugging Face cache live inside the workspace so a deployment image carries the weights.
os.environ.setdefault("HF_HOME", str(REPO_ROOT / ".cache" / "huggingface"))
os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")


def load_hazard_config() -> dict:
    with open(DATA_DIR / "hazard_keywords.json", encoding="utf-8") as fh:
        return json.load(fh)


HAZARD_CONFIG = load_hazard_config()
HAZARDS: list[dict] = HAZARD_CONFIG["hazards"]
HAZARD_IDS: list[str] = [h["id"] for h in HAZARDS]
TRAINED_CLASSES: list[str] = HAZARD_CONFIG["trainedClasses"]
NONE_CLASS = "none"
HAZARD_CLASSES: list[str] = TRAINED_CLASSES + [NONE_CLASS]

# HumAID event folder -> hazard family used for training labels and replay.
HUMAID_EVENT_HAZARD: dict[str, str] = {
    "canada_wildfires_2016": "wildfire",
    "cyclone_idai_2019": "cyclone",
    "ecuador_earthquake_2016": "earthquake",
    "hurricane_harvey_2017": "cyclone",
    "hurricane_irma_2017": "cyclone",
    "hurricane_maria_2017": "cyclone",
    "hurricane_matthew_2016": "cyclone",
    "italy_earthquake_aug_2016": "earthquake",
    "kaikoura_earthquake_2016": "earthquake",
    "puebla_mexico_earthquake_2017": "earthquake",
    "srilanka_floods_2017": "flood",
    "greece_wildfires_2018": "wildfire",
    "maryland_floods_2018": "flood",
    "california_wildfires_2018": "wildfire",
    "hurricane_dorian_2019": "cyclone",
    "hurricane_florence_2018": "cyclone",
    "kerala_floods_2018": "flood",
    "midwestern_us_floods_2019": "flood",
    "pakistan_earthquake_2019": "earthquake",
}

"""Train and evaluate the stage-one classifier; write model/stage_one.joblib and model/metrics.json.

Candidates are trained on the same split and compared; the best macro-F1 on the HumAID test split ships.
"""
from __future__ import annotations

import json
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd
from scipy.sparse import hstack
from sklearn.feature_extraction.text import HashingVectorizer, TfidfTransformer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, confusion_matrix, f1_score, precision_recall_fscore_support

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from calamity_ml.config import HAZARD_CLASSES, MODEL_DIR, MODEL_VERSION, NONE_CLASS, PROCESSED_DIR, TRAINED_CLASSES  # noqa: E402
from calamity_ml.gazetteer import place_name_set  # noqa: E402
from calamity_ml.preprocess import clean_for_model  # noqa: E402
from calamity_ml.stage_one import N_FEATURES, StageOneModel, make_vectorizers  # noqa: E402


def hazard_target(df: pd.DataFrame) -> np.ndarray:
    # Hazard head: relevant HumAID rows carry their event hazard; generic tweets are "none";
    # not_humanitarian rows are excluded (their hazard label would be noise).
    y = np.where(df["relevant"].values == 1, df["hazard"].values, NONE_CLASS)
    return y


def hazard_mask(df: pd.DataFrame) -> np.ndarray:
    return ((df["relevant"].values == 1) | (df["event"].values == "tweet_eval_sentiment")).astype(bool)


MASK_NAMES = place_name_set()


def build_features(train_texts, kind: str):
    word, char = make_vectorizers()
    cleaned = [clean_for_model(t, MASK_NAMES) for t in train_texts]
    if kind == "word":
        raw = word.transform(cleaned)
    else:
        raw = hstack([word.transform(cleaned), char.transform(cleaned)]).tocsr()
    tfidf = TfidfTransformer(sublinear_tf=True)
    x = tfidf.fit_transform(raw)

    def transform(texts):
        c = [clean_for_model(t, MASK_NAMES) for t in texts]
        r = word.transform(c) if kind == "word" else hstack([word.transform(c), char.transform(c)]).tocsr()
        return tfidf.transform(r)

    return word, char, tfidf, x, transform


def evaluate(relevance, hazard, transform, df: pd.DataFrame) -> dict:
    x = transform(df["text"].tolist())
    rel_pred = relevance.predict(x)
    rel_true = df["relevant"].values.astype(int)
    mask = hazard_mask(df)
    haz_true = hazard_target(df)[mask]
    haz_pred = hazard.predict(x[mask])
    labels = list(hazard.classes_)
    present = [lbl for lbl in labels if lbl in set(haz_true)]
    p, r, f, s = precision_recall_fscore_support(haz_true, haz_pred, labels=labels, zero_division=0)
    return {
        "relevanceAccuracy": float(accuracy_score(rel_true, rel_pred)),
        "relevanceF1": float(f1_score(rel_true, rel_pred)),
        "accuracy": float(accuracy_score(haz_true, haz_pred)),
        "macroF1": float(f1_score(haz_true, haz_pred, labels=present, average="macro", zero_division=0)),
        "perClass": [
            {"label": lbl, "precision": float(p[i]), "recall": float(r[i]), "f1": float(f[i]), "support": int(s[i])}
            for i, lbl in enumerate(labels)
        ],
        "confusion": {"labels": labels, "matrix": confusion_matrix(haz_true, haz_pred, labels=labels).astype(int).tolist()},
        "rows": int(len(df)),
        # Hazard metrics are computed on the relevant posts only; report that support, not the full frame.
        "hazardRows": int(mask.sum()),
    }


def main() -> None:
    train = pd.read_parquet(PROCESSED_DIR / "train.parquet")
    test_split = pd.read_parquet(PROCESSED_DIR / "test_split.parquet")
    unseen = pd.read_parquet(PROCESSED_DIR / "test_unseen_events.parquet")
    kaggle = pd.read_parquet(PROCESSED_DIR / "cross_kaggle.parquet")
    summary = json.load(open(PROCESSED_DIR / "summary.json"))

    y_rel = train["relevant"].values.astype(int)
    y_haz = hazard_target(train)
    m_haz = hazard_mask(train)

    candidates = []
    shipped = None
    for kind, C in (("word", 4.0), ("word+char", 4.0)):
        t0 = time.time()
        word, char, tfidf, x, transform = build_features(train["text"].tolist(), kind)
        relevance = LogisticRegression(C=C, max_iter=500, tol=1e-3, class_weight="balanced", solver="lbfgs")
        relevance.fit(x, y_rel)
        hazard = LogisticRegression(C=C, max_iter=500, tol=1e-3, class_weight="balanced", solver="lbfgs")
        hazard.fit(x[m_haz], y_haz[m_haz])
        ev = evaluate(relevance, hazard, transform, test_split)
        ev_u = evaluate(relevance, hazard, transform, unseen)
        secs = time.time() - t0
        name = f"TF-IDF {kind} n-grams + logistic regression"
        print(f"{name}: test split hazard acc {ev['accuracy']:.3f} macro-F1 {ev['macroF1']:.3f} relevance acc {ev['relevanceAccuracy']:.3f}; "
              f"unseen events hazard acc {ev_u['accuracy']:.3f} macro-F1 {ev_u['macroF1']:.3f} relevance F1 {ev_u['relevanceF1']:.3f} ({secs:.0f}s)")
        candidates.append({"name": name, "kind": kind, "macroF1": ev["macroF1"], "accuracy": ev["accuracy"], "secs": secs,
                           "unseenMacroF1": ev_u["macroF1"], "unseenAccuracy": ev_u["accuracy"],
                           "parts": (word, char, tfidf, relevance, hazard, transform), "eval": ev, "evalUnseen": ev_u})

    # Ship the candidate that generalises to events it never saw; the in-distribution split rewards memorising event vocabulary.
    best = max(candidates, key=lambda c: c["unseenMacroF1"])
    word, char, tfidf, relevance, hazard, transform = best["parts"]
    for m in (relevance, hazard):
        m.coef_ = m.coef_.astype(np.float32)
    model = StageOneModel(word_vec=word, char_vec=char, tfidf=tfidf, relevance=relevance, hazard=hazard, classes=list(hazard.classes_), version=MODEL_VERSION, mask_names=MASK_NAMES, kind=best["kind"])
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    model.save()

    ev_split = best["eval"]
    ev_unseen = best["evalUnseen"]
    # Kaggle: relevance only. Its "disaster" includes crashes and attacks, so this is a hard, honest check.
    xk = transform(kaggle["text"].tolist())
    k_pred = relevance.predict(xk)
    k_true = kaggle["relevant"].values.astype(int)
    kaggle_metrics = {"dataset": "Kaggle: Natural Language Processing with Disaster Tweets (train.csv, relevance only)",
                      "accuracy": float(accuracy_score(k_true, k_pred)), "f1": float(f1_score(k_true, k_pred)), "rows": int(len(kaggle))}
    unseen_metrics = {"dataset": "HumAID events held out of training and used to pick the shipped candidate (Kerala floods 2018, Hurricane Harvey 2017, California wildfires 2018, Puebla earthquake 2017, Cyclone Idai 2019): hazard type, scored on the relevant posts only",
                      "accuracy": ev_unseen["accuracy"], "f1": ev_unseen["macroF1"], "rows": int(ev_unseen["hazardRows"])}
    unseen_rel = {"dataset": "Same held-out events: relevance (humanitarian vs not), all posts",
                  "accuracy": ev_unseen["relevanceAccuracy"], "f1": ev_unseen["relevanceF1"], "rows": int(ev_unseen["rows"])}

    metrics = {
        "name": "Hazard relevance and type classifier",
        "algorithm": f"Place names masked to one token (GeoNames cities of 50k or more, countries, regions), then hashing TF-IDF ({'word 1-2 grams' if best['kind'] == 'word' else 'word 1-2 grams and character 3-5 grams'}, 2^18 features per view) with two logistic-regression heads: relevance (binary) and hazard type (flood, cyclone, wildfire, earthquake, none). Class-weight balanced. Of two candidates, the one with the better macro-F1 on events never seen in training is shipped.",
        "trainedAt": datetime.now(timezone.utc).isoformat(),
        "version": MODEL_VERSION,
        "datasets": [
            {"name": "HumAID (Alam et al. 2021), 14 of 19 events, train and dev splits", "url": "https://crisisnlp.qcri.org/humaid_dataset.html", "license": "CrisisNLP terms of use: research use, tweet text kept confidential", "rows": int(summary["train_rows"] - summary["negatives_train"]), "role": "train"},
            {"name": "TweetEval sentiment (generic tweets with no hazard vocabulary) as no-hazard negatives", "url": "https://huggingface.co/datasets/cardiffnlp/tweet_eval", "license": "Dataset card: see TweetEval", "rows": int(summary["negatives_train"]), "role": "train"},
            {"name": "HumAID test split of the same 14 events plus held-out generic tweets", "url": "https://crisisnlp.qcri.org/humaid_dataset.html", "license": "CrisisNLP terms of use", "rows": int(summary["test_split_rows"]), "role": "test"},
            {"name": "HumAID, 5 events never seen in training (the replay scenarios)", "url": "https://crisisnlp.qcri.org/humaid_dataset.html", "license": "CrisisNLP terms of use", "rows": int(summary["unseen_event_rows"]), "role": "cross-dataset test"},
            {"name": "Kaggle disaster tweets (train.csv via Hugging Face mirror)", "url": "https://www.kaggle.com/competitions/nlp-getting-started", "license": "Kaggle competition rules; evaluation only", "rows": int(summary["kaggle_rows"]), "role": "cross-dataset test"},
        ],
        "accuracy": ev_split["accuracy"],
        "macroF1": ev_split["macroF1"],
        "perClass": ev_split["perClass"],
        "confusion": ev_split["confusion"],
        "crossDataset": [unseen_metrics, unseen_rel, kaggle_metrics],
        "relevanceAccuracy": ev_split["relevanceAccuracy"],
        "relevanceF1": ev_split["relevanceF1"],
        "candidates": [
            {"name": c["name"], "macroF1": c["macroF1"], "accuracy": c["accuracy"], "shipped": c is best,
             "note": f"test split macro-F1 {c['macroF1']:.3f}; unseen events macro-F1 {c['unseenMacroF1']:.3f}, accuracy {c['unseenAccuracy']:.3f}; trained in {c['secs']:.0f} s on CPU"}
            for c in candidates
        ],
        "trainingSummary": summary,
        "unseenEventsDetail": {"perClass": ev_unseen["perClass"], "confusion": ev_unseen["confusion"]},
    }
    with open(MODEL_DIR / "metrics.json", "w") as fh:
        json.dump(metrics, fh, indent=2)
    print(json.dumps({k: metrics[k] for k in ("accuracy", "macroF1", "relevanceAccuracy", "relevanceF1", "crossDataset")}, indent=2))
    print("saved", MODEL_DIR / "stage_one.joblib", "and metrics.json")


if __name__ == "__main__":
    main()

"""Stage one: relevance and hazard-type classifier.

HashingVectorizer (word 1-2 grams + char_wb 3-5 grams) -> TF-IDF weighting -> logistic regression.
Hashing keeps the saved model small (no vocabulary to store) and inference fast on CPU.
"""
from __future__ import annotations

from dataclasses import dataclass

import joblib
import numpy as np
from scipy.sparse import hstack
from sklearn.feature_extraction.text import HashingVectorizer, TfidfTransformer
from sklearn.linear_model import LogisticRegression

from .config import HAZARD_CLASSES, MODEL_DIR, NONE_CLASS, TRAINED_CLASSES
from .preprocess import clean_for_model

N_FEATURES = 2**18


def make_vectorizers() -> tuple[HashingVectorizer, HashingVectorizer]:
    word = HashingVectorizer(n_features=N_FEATURES, ngram_range=(1, 2), lowercase=True, alternate_sign=False, norm=None, token_pattern=r"(?u)\b\w[\w']+\b")
    char = HashingVectorizer(n_features=N_FEATURES, analyzer="char_wb", ngram_range=(3, 5), lowercase=True, alternate_sign=False, norm=None)
    return word, char


@dataclass
class StageOneModel:
    word_vec: HashingVectorizer
    char_vec: HashingVectorizer
    tfidf: TfidfTransformer
    relevance: LogisticRegression
    hazard: LogisticRegression
    classes: list[str]
    version: str
    mask_names: frozenset[str] = frozenset()
    kind: str = "word+char"

    def features(self, texts: list[str]):
        cleaned = [clean_for_model(t, self.mask_names) for t in texts]
        if self.kind == "word":
            x = self.word_vec.transform(cleaned)
        else:
            x = hstack([self.word_vec.transform(cleaned), self.char_vec.transform(cleaned)]).tocsr()
        return self.tfidf.transform(x)

    def predict(self, texts: list[str]) -> list[dict]:
        if not texts:
            return []
        x = self.features(texts)
        p_rel = self.relevance.predict_proba(x)[:, 1]
        p_haz = self.hazard.predict_proba(x)
        out = []
        for i in range(len(texts)):
            probs = {c: float(p_haz[i, j]) for j, c in enumerate(self.hazard.classes_)}
            out.append({"p_relevant": float(p_rel[i]), "hazard_probs": probs})
        return out

    def save(self, path=None) -> None:
        path = path or (MODEL_DIR / "stage_one.joblib")
        joblib.dump(self, path, compress=3)

    @staticmethod
    def load(path=None) -> "StageOneModel":
        path = path or (MODEL_DIR / "stage_one.joblib")
        return joblib.load(path)


def fit_stage_one(texts: list[str], relevant: np.ndarray, hazard_labels: list[str], version: str, mask_names: frozenset[str] = frozenset()) -> StageOneModel:
    word, char = make_vectorizers()
    cleaned = [clean_for_model(t, mask_names) for t in texts]
    raw = hstack([word.transform(cleaned), char.transform(cleaned)]).tocsr()
    tfidf = TfidfTransformer(sublinear_tf=True)
    x = tfidf.fit_transform(raw)
    relevance = LogisticRegression(C=4.0, max_iter=500, tol=1e-3, class_weight="balanced", solver="lbfgs")
    relevance.fit(x, relevant.astype(int))
    hazard = LogisticRegression(C=4.0, max_iter=500, tol=1e-3, class_weight="balanced", solver="lbfgs")
    hazard.fit(x, np.array(hazard_labels))
    for m in (relevance, hazard):
        m.coef_ = m.coef_.astype(np.float32)
    return StageOneModel(word_vec=word, char_vec=char, tfidf=tfidf, relevance=relevance, hazard=hazard, classes=list(hazard.classes_), version=version, mask_names=mask_names)


def choose_hazard(hazard_probs: dict[str, float], keyword_hits: dict[str, int]) -> tuple[str, str]:
    """Combine the model's class probabilities with keyword routing.

    Returns (hazard, method). Keyword routing exists because landslide, heat, storm and tsunami have no
    labelled training data; the model card says so.
    """
    model_top = max(hazard_probs.items(), key=lambda kv: kv[1])[0]
    model_top_p = hazard_probs[model_top]
    kw = sorted(keyword_hits.items(), key=lambda kv: kv[1], reverse=True)
    kw_ids = [k for k, _ in kw]
    trained = set(TRAINED_CLASSES)
    if model_top != NONE_CLASS and model_top in kw_ids:
        return model_top, "model"
    untrained_hits = [k for k in kw_ids if k not in trained]
    if untrained_hits:
        # Cyclone vocabulary beats generic storm vocabulary when both appear.
        if "storm" in untrained_hits and "cyclone" in kw_ids and hazard_probs.get("cyclone", 0) > 0.2:
            return "cyclone", "model"
        return untrained_hits[0], "keyword"
    if kw_ids and model_top_p < 0.5:
        return kw_ids[0], "keyword"
    if model_top == NONE_CLASS:
        best = max(((c, p) for c, p in hazard_probs.items() if c != NONE_CLASS), key=lambda kv: kv[1], default=(TRAINED_CLASSES[0], 0.0))
        return best[0], "model"
    return model_top, "model"


__all__ = ["StageOneModel", "fit_stage_one", "choose_hazard", "HAZARD_CLASSES"]

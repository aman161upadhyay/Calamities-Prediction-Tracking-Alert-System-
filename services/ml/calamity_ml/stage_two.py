"""Stage two: emotion (multilabel) and sentiment (three-class) from Cardiff NLP RoBERTa models."""
from __future__ import annotations

import os

import numpy as np
import torch
from transformers import AutoModelForSequenceClassification, AutoTokenizer

from .config import BATCH_SIZE, EMOTION_MODEL, MAX_TOKENS, SENTIMENT_MODEL
from .preprocess import clean_for_model

KEPT_EMOTIONS = ["fear", "anger", "sadness", "pessimism", "optimism", "joy", "disgust", "anticipation", "surprise", "trust", "love"]


class StageTwo:
    def __init__(self) -> None:
        torch.set_num_threads(max(1, min(int(os.environ.get("CW_TORCH_THREADS", "6")), os.cpu_count() or 1)))
        self.emotion_tok = AutoTokenizer.from_pretrained(EMOTION_MODEL)
        self.emotion = AutoModelForSequenceClassification.from_pretrained(EMOTION_MODEL).eval()
        self.sentiment_tok = AutoTokenizer.from_pretrained(SENTIMENT_MODEL)
        self.sentiment = AutoModelForSequenceClassification.from_pretrained(SENTIMENT_MODEL).eval()
        self.emotion_labels = [self.emotion.config.id2label[i].lower() for i in range(self.emotion.config.num_labels)]
        self.sentiment_labels = [self.sentiment.config.id2label[i].lower() for i in range(self.sentiment.config.num_labels)]

    @torch.inference_mode()
    def _run(self, model, tok, texts: list[str]) -> np.ndarray:
        outs = []
        for i in range(0, len(texts), BATCH_SIZE):
            batch = texts[i : i + BATCH_SIZE]
            enc = tok(batch, padding=True, truncation=True, max_length=MAX_TOKENS, return_tensors="pt")
            outs.append(model(**enc).logits.float().cpu().numpy())
        return np.concatenate(outs, axis=0) if outs else np.zeros((0, model.config.num_labels))

    def predict(self, texts: list[str]) -> list[dict]:
        if not texts:
            return []
        cleaned = [clean_for_model(t) for t in texts]
        emo_logits = self._run(self.emotion, self.emotion_tok, cleaned)
        emo = 1.0 / (1.0 + np.exp(-emo_logits))
        sent_logits = self._run(self.sentiment, self.sentiment_tok, cleaned)
        sent_logits = sent_logits - sent_logits.max(axis=1, keepdims=True)
        sent = np.exp(sent_logits)
        sent = sent / sent.sum(axis=1, keepdims=True)
        results = []
        for i in range(len(texts)):
            emotions = {lbl: float(emo[i, j]) for j, lbl in enumerate(self.emotion_labels)}
            sentiments = {lbl: float(sent[i, j]) for j, lbl in enumerate(self.sentiment_labels)}
            label = max(sentiments.items(), key=lambda kv: kv[1])[0]
            score = sentiments.get("positive", 0.0) - sentiments.get("negative", 0.0)
            results.append({
                "emotions": emotions,
                "p_fear": emotions.get("fear", 0.0),
                "p_anger": emotions.get("anger", 0.0),
                "p_sadness": emotions.get("sadness", 0.0),
                "sentiment": label,
                "sentiment_score": float(score),
            })
        return results

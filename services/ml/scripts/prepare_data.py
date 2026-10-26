"""Build the stage-one training and evaluation tables from the raw downloads.

Inputs (services/ml/data/raw):
  humaid/events_set1, humaid/events_set2   HumAID per-event TSVs (tweet_id, tweet_text, class_label)
  tweet_eval_sentiment_train.parquet       generic tweets used as "no hazard" negatives
  kaggle_disaster_tweets_train.csv         cross-dataset relevance check

Outputs (services/ml/data/processed):
  train.parquet, test_split.parquet, test_unseen_events.parquet, cross_kaggle.parquet
  replay/<event>.jsonl for the replay scenarios (held out of training entirely)
"""
from __future__ import annotations

import csv
import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from calamity_ml.config import HUMAID_EVENT_HAZARD, PROCESSED_DIR, RAW_DIR, REPLAY_DIR  # noqa: E402
from calamity_ml.preprocess import keyword_hazards  # noqa: E402

REPLAY_EVENTS = {
    "kerala_floods_2018",
    "hurricane_harvey_2017",
    "california_wildfires_2018",
    "puebla_mexico_earthquake_2017",
    "cyclone_idai_2019",
}
TWITTER_EPOCH_MS = 1288834974657


def snowflake_to_datetime(tweet_id: int) -> datetime:
    ms = (tweet_id >> 22) + TWITTER_EPOCH_MS
    return datetime.fromtimestamp(ms / 1000, tz=timezone.utc)


def read_humaid() -> pd.DataFrame:
    rows = []
    for tsv in sorted((RAW_DIR / "humaid").glob("events_set*/**/*.tsv")):
        event = tsv.stem.rsplit("_", 1)[0]
        split = tsv.stem.rsplit("_", 1)[1]
        if event not in HUMAID_EVENT_HAZARD:
            raise SystemExit(f"unknown HumAID event folder: {event}")
        with open(tsv, encoding="utf-8") as fh:
            for r in csv.DictReader(fh, delimiter="\t", quoting=csv.QUOTE_NONE):
                rows.append({
                    "tweet_id": int(r["tweet_id"]),
                    "text": r["tweet_text"],
                    "class_label": r["class_label"],
                    "event": event,
                    "split": split,
                    "hazard": HUMAID_EVENT_HAZARD[event],
                })
    df = pd.DataFrame(rows).drop_duplicates("tweet_id")
    df["relevant"] = (df["class_label"] != "not_humanitarian").astype(int)
    df["created_at"] = df["tweet_id"].map(lambda i: snowflake_to_datetime(int(i)).isoformat())
    return df


def read_negatives(n_train: int = 20000, n_test: int = 5000, seed: int = 7) -> tuple[pd.DataFrame, pd.DataFrame]:
    te = pd.read_parquet(RAW_DIR / "tweet_eval_sentiment_train.parquet")
    te = te.rename(columns={"text": "text"})[["text"]].dropna()
    te = te[te["text"].str.len() >= 15]
    # Generic tweets that mention a hazard are not safe negatives.
    te = te[te["text"].map(lambda t: not keyword_hazards(t))]
    te = te.sample(frac=1.0, random_state=seed).reset_index(drop=True)
    te["relevant"] = 0
    te["hazard"] = "none"
    te["event"] = "tweet_eval_sentiment"
    te["class_label"] = "generic"
    return te.iloc[:n_train].copy(), te.iloc[n_train : n_train + n_test].copy()


def read_kaggle() -> pd.DataFrame:
    k = pd.read_csv(RAW_DIR / "kaggle_disaster_tweets_train.csv")
    k = k.rename(columns={"target": "relevant"})[["id", "keyword", "text", "relevant"]]
    k["dataset"] = "kaggle_nlp_getting_started"
    return k


def main() -> None:
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    REPLAY_DIR.mkdir(parents=True, exist_ok=True)
    humaid = read_humaid()
    print(f"HumAID rows: {len(humaid)} across {humaid['event'].nunique()} events")

    replay = humaid[humaid["event"].isin(REPLAY_EVENTS)]
    train_events = humaid[~humaid["event"].isin(REPLAY_EVENTS)]
    neg_train, neg_test = read_negatives()

    train = pd.concat([train_events[train_events["split"].isin(["train", "dev"])], neg_train], ignore_index=True)
    test_split = pd.concat([train_events[train_events["split"] == "test"], neg_test], ignore_index=True)
    cols = ["text", "relevant", "hazard", "event", "class_label"]
    train[cols].to_parquet(PROCESSED_DIR / "train.parquet", index=False)
    test_split[cols].to_parquet(PROCESSED_DIR / "test_split.parquet", index=False)
    replay[cols].to_parquet(PROCESSED_DIR / "test_unseen_events.parquet", index=False)
    read_kaggle().to_parquet(PROCESSED_DIR / "cross_kaggle.parquet", index=False)

    for event, grp in replay.groupby("event"):
        out = REPLAY_DIR / f"{event}.jsonl"
        with open(out, "w", encoding="utf-8") as fh:
            for r in grp.sort_values("created_at").itertuples(index=False):
                fh.write(json.dumps({
                    "tweet_id": str(r.tweet_id),
                    "created_at": r.created_at,
                    "text": r.text,
                    "class_label": r.class_label,
                    "hazard": r.hazard,
                    "author_hash": hashlib.sha256(f"humaid:{r.tweet_id}".encode()).hexdigest()[:16],
                }) + "\n")
        print(f"replay {event}: {len(grp)} posts, {grp['created_at'].min()} .. {grp['created_at'].max()}")

    summary = {
        "train_rows": int(len(train)),
        "train_relevant": int(train["relevant"].sum()),
        "train_events": sorted(train_events["event"].unique().tolist()),
        "test_split_rows": int(len(test_split)),
        "unseen_event_rows": int(len(replay)),
        "unseen_events": sorted(replay["event"].unique().tolist()),
        "negatives_train": int(len(neg_train)),
        "negatives_test": int(len(neg_test)),
        "kaggle_rows": int(len(read_kaggle())),
        "hazard_counts_train": train["hazard"].value_counts().to_dict(),
    }
    with open(PROCESSED_DIR / "summary.json", "w") as fh:
        json.dump(summary, fh, indent=2)
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()

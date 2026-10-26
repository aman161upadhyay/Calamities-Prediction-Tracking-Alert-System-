from __future__ import annotations

import math
from dataclasses import dataclass

from .gazetteer import Gazetteer, GazetteerPlace, build_gazetteer
from .preprocess import clean_for_ner

NER_LABELS = {"GPE", "LOC"}
# Words NER tags as places but which are not places or are too generic to resolve.
STOPLIST = {
    "earth", "world", "europe", "asia", "africa", "north america", "south america", "america", "the world", "mother earth",
    "heaven", "hell", "paradise lost", "twitter", "facebook", "instagram", "youtube", "google", "amazon", "google maps",
    "east", "west", "north", "south", "midwest", "west coast", "east coast", "gulf", "atlantic", "pacific", "caribbean",
    "the gulf", "the atlantic", "the pacific", "the caribbean", "coast", "the coast", "bay", "the bay", "downtown",
    "southeast", "northeast", "northwest", "southwest", "central america", "middle east", "the middle east",
}


@dataclass
class Resolution:
    place: GazetteerPlace
    confidence: float
    method: str
    mention: str

    def to_dict(self) -> dict:
        d = self.place.to_dict()
        d.update({"confidence": round(self.confidence, 3), "method": self.method, "mention": self.mention})
        return d


class Geoparser:
    def __init__(self, gazetteer: Gazetteer | None = None):
        import spacy

        self.gazetteer = gazetteer or build_gazetteer()
        self.nlp = spacy.load("en_core_web_sm", disable=["parser", "lemmatizer", "textcat"])

    def mentions(self, text: str) -> list[str]:
        doc = self.nlp(clean_for_ner(text))
        out: list[str] = []
        for ent in doc.ents:
            if ent.label_ not in NER_LABELS:
                continue
            m = ent.text.strip(" .,;:!?'\"#")
            if not m or m.lower() in STOPLIST or len(m) < 3:
                continue
            out.append(m)
        return out

    def resolve(self, text: str) -> list[Resolution]:
        mentions = self.mentions(text)
        if not mentions:
            return []
        candidates: dict[str, list[GazetteerPlace]] = {m: self.gazetteer.lookup(m) for m in mentions}
        # Context: country codes and admin1 codes of unambiguous mentions.
        ctx_cc: dict[str, int] = {}
        ctx_admin: dict[tuple[str, str | None], int] = {}
        for m, cands in candidates.items():
            if len(cands) == 1 or any(c.kind in ("country", "region") for c in cands):
                for c in cands[:3]:
                    ctx_cc[c.country_code] = ctx_cc.get(c.country_code, 0) + 1
                    if c.admin1:
                        ctx_admin[(c.country_code, c.admin1)] = ctx_admin.get((c.country_code, c.admin1), 0) + 1

        results: dict[str, Resolution] = {}
        for m, cands in candidates.items():
            if not cands:
                continue
            scored: list[tuple[float, GazetteerPlace]] = []
            for c in cands:
                s = math.log10((c.population or 1) + 1)
                if c.kind == "country":
                    s += 2.0 if m.lower() == c.name.lower() or m.lower() in ("usa", "us", "uk", "u.s.", "u.k.") else 0.0
                if c.kind == "region":
                    s += 1.5
                others_cc = {cc: n for cc, n in ctx_cc.items()}
                if c.country_code in others_cc:
                    s += 1.0
                if c.admin1 and (c.country_code, c.admin1) in ctx_admin:
                    s += 1.0
                scored.append((s, c))
            scored.sort(key=lambda t: t[0], reverse=True)
            best_s, best = scored[0]
            if len(scored) == 1:
                conf = 0.9
            else:
                second_s = scored[1][0]
                margin = max(0.0, best_s - second_s)
                conf = min(0.9, 0.45 + 0.15 * margin)
            # Three-letter or very short mentions are weak evidence.
            if len(m) <= 3:
                conf = min(conf, 0.5)
            prev = results.get(best.key)
            if prev is None or prev.confidence < conf:
                results[best.key] = Resolution(place=best, confidence=conf, method="ner_gazetteer", mention=m)
        # Drop a country when a more specific place in that country was found.
        specific_cc = {r.place.country_code for r in results.values() if r.place.kind != "country"}
        final = [r for r in results.values() if not (r.place.kind == "country" and r.place.country_code in specific_cc)]
        final.sort(key=lambda r: r.confidence, reverse=True)
        return final[:3]

from __future__ import annotations

import math
import re
from dataclasses import dataclass

from .gazetteer import Gazetteer, GazetteerPlace, build_gazetteer, haversine_km
from .preprocess import clean_for_ner

NER_LABELS = {"GPE", "LOC"}
# Organisations and facilities often carry a city name ("Kochi airport", "Kerala Blasters"); those mentions are
# accepted only when they match a large city, a region or a country, and they resolve with reduced confidence.
WEAK_LABELS = {"FAC", "ORG"}
WEAK_MIN_POPULATION = 100_000
US_STATE_CODES = {
    "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
    "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
    "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY", "DC", "PR",
}
_STATE_SUFFIX = re.compile(r"^(.{3,}?)[,\s]+([A-Z]{2})$")
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
        return [m for m, _weak in self.mentions_with_strength(text)]

    def _weak_mention(self, raw: str) -> str | None:
        """Reduce an ORG/FAC span to a leading place name that is a large city, region or country."""
        words = raw.split()
        for n in (3, 2, 1):
            if len(words) < n:
                continue
            cand = " ".join(words[:n])
            if cand.lower() in STOPLIST or len(cand) < 3:
                continue
            hits = [
                c
                for c in self.gazetteer.lookup(cand)
                if c.kind in ("region", "country") or (not c.minor and (c.population or 0) >= WEAK_MIN_POPULATION)
            ]
            if hits:
                return cand
        return None

    def mentions_with_strength(self, text: str) -> list[tuple[str, bool]]:
        """Place mentions as (text, weak). Weak mentions come from organisation or facility spans."""
        doc = self.nlp(clean_for_ner(text))
        out: list[tuple[str, bool]] = []
        seen: set[str] = set()
        for ent in doc.ents:
            if ent.label_ in NER_LABELS:
                m = ent.text.strip(" .,;:!?'\"#")
                if not m or m.lower() in STOPLIST or len(m) < 3:
                    continue
                weak = False
            elif ent.label_ in WEAK_LABELS:
                m = self._weak_mention(ent.text.strip(" .,;:!?'\"#"))
                if not m:
                    continue
                weak = True
            else:
                continue
            if m.lower() in seen:
                continue
            seen.add(m.lower())
            out.append((m, weak))
        return out

    def resolve(self, text: str, context: GazetteerPlace | None = None) -> list[Resolution]:
        """Resolve place mentions in ``text``.

        ``context`` is an optional place the stream is known to be about (a replay scenario's region, or a geofenced
        query). It only breaks ties between homonyms; it never adds a place that the text does not mention.
        """
        strength = dict(self.mentions_with_strength(text))
        if not strength:
            return []
        # "Paradise CA" / "Chico, CA": split a trailing US state code off a mention the gazetteer does not know.
        state_hint: dict[str, str] = {}
        candidates: dict[str, list[GazetteerPlace]] = {}
        for m in list(strength):
            cands = self.gazetteer.lookup(m)
            if not cands:
                sm = _STATE_SUFFIX.match(m)
                if sm and sm.group(2) in US_STATE_CODES:
                    base = sm.group(1).strip(" ,")
                    cands = self.gazetteer.lookup(base)
                    if cands:
                        strength[base] = strength.pop(m)
                        state_hint[base] = sm.group(2)
                        m = base
            candidates[m] = cands
        # Context: country codes and admin1 codes of unambiguous mentions (and of regions, which carry an admin1 code).
        # Kept per mention so that a mention never supports itself.
        ctx_by_mention: dict[str, tuple[set[str], set[tuple[str, str]]]] = {}
        for m, cands in candidates.items():
            major = [c for c in cands if not c.minor]
            ccs: set[str] = set()
            admins: set[tuple[str, str]] = set()
            if len(major) == 1 or any(c.kind in ("country", "region") for c in major):
                for c in major[:3]:
                    ccs.add(c.country_code)
                    if c.admin1:
                        admins.add((c.country_code, c.admin1))
            ctx_by_mention[m] = (ccs, admins)

        results: dict[str, Resolution] = {}
        for m, cands in candidates.items():
            if not cands:
                continue
            ctx_cc: set[str] = set()
            ctx_admin: set[tuple[str, str]] = set()
            for other, (ccs, admins) in ctx_by_mention.items():
                if other != m:
                    ctx_cc |= ccs
                    ctx_admin |= admins
            if m in state_hint:
                ctx_cc.add("US")
                ctx_admin.add(("US", state_hint[m]))
            scored: list[tuple[float, bool, GazetteerPlace]] = []
            for c in cands:
                s = math.log10((c.population or 1) + 1)
                supported = False
                if c.kind == "country":
                    s += 2.0 if m.lower() == c.name.lower() or m.lower() in ("usa", "us", "uk", "u.s.", "u.k.") else 0.0
                if c.kind == "region":
                    # A state or province outranks a same-named town of a few hundred thousand ("Texas", "Kerala").
                    s = max(s, 6.5)
                if c.country_code in ctx_cc:
                    s += 1.0
                    supported = True
                if c.admin1 and (c.country_code, c.admin1) in ctx_admin:
                    s += 2.0
                    supported = True
                if context is not None and c.key != context.key:
                    same_country = c.country_code == context.country_code
                    if context.admin1 and same_country and c.admin1:
                        # Inside the context's country, the admin1 unit decides; distance would let a neighbouring
                        # state's big city borrow the context's support.
                        if c.admin1 == context.admin1:
                            s += 2.0
                            supported = True
                        else:
                            s += 0.5
                    elif haversine_km(c.lat, c.lon, context.lat, context.lon) <= (context.radius_km or 300.0):
                        s += 2.0
                        supported = True
                    elif same_country:
                        s += 0.5
                if c.minor and not supported:
                    s -= 1.0
                scored.append((s, supported, c))
            scored.sort(key=lambda t: t[0], reverse=True)
            best_s, best_supported, best = scored[0]
            if len(scored) == 1:
                conf = 0.9
            else:
                second_s = scored[1][0]
                margin = max(0.0, best_s - second_s)
                conf = min(0.9, 0.45 + 0.15 * margin)
            # A small town is only a resolution when something in the text or the stream points at it.
            if best.minor and not best_supported:
                conf = min(conf, 0.4)
            # Three-letter or very short mentions are weak evidence, as are names lifted from organisation spans.
            if len(m) <= 3:
                conf = min(conf, 0.5)
            if strength.get(m):
                conf = min(conf, 0.6)
            prev = results.get(best.key)
            if prev is None or prev.confidence < conf:
                results[best.key] = Resolution(place=best, confidence=conf, method="ner_gazetteer", mention=m)
        # Drop a country when a more specific place in that country was found.
        specific_cc = {r.place.country_code for r in results.values() if r.place.kind != "country"}
        final = [r for r in results.values() if not (r.place.kind == "country" and r.place.country_code in specific_cc)]
        final.sort(key=lambda r: r.confidence, reverse=True)
        return final[:3]

from __future__ import annotations

import math
import re
from dataclasses import dataclass

from .gazetteer import Gazetteer, GazetteerPlace, build_gazetteer, haversine_km, normalise
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
# Place names that are also ordinary English words. They resolve only when something else in the text supports
# the place (same country or state), otherwise "Man found dead" would point at Man, Ivory Coast.
COMMON_WORD_NAMES = {
    "man", "nice", "mobile", "reading", "bath", "orange", "independence", "liberty", "normal", "surprise", "hope",
    "union", "buffalo", "flint", "eagle", "deal", "sale", "march", "most", "split", "bar", "van", "mission", "media",
    "industry", "enterprise", "commerce", "friendship", "harmony", "success", "progress", "climax", "truth", "why",
    "home", "house", "church", "temple", "college", "university", "hospital", "airport", "station", "central",
    "little", "big", "new", "old", "north", "south", "east", "west", "summit", "valley", "river", "lake", "beach",
    "island", "mount", "hill", "bay", "point", "park", "garden", "forest", "field", "bridge", "ford", "mill", "wells",
}
# Hazard words that are also town names ("Hurricane, Utah", "Flood, Virginia", "Tornado, West Virginia"). In a post about a
# disaster they are almost always the hazard, so they resolve only with state-level support, never on country alone.
HAZARD_WORD_NAMES = {
    "hurricane", "cyclone", "typhoon", "tornado", "storm", "flood", "floods", "fire", "wildfire", "earthquake", "quake",
    "landslide", "tsunami", "heat", "drought", "blizzard", "avalanche", "volcano", "eruption", "surge", "rain",
}
# Names given to tropical storms in recent years that are also towns (Harvey, Louisiana; Florence, South Carolina).
# In a post they are the storm unless the text places them with a locality cue ("in Harvey", "suburb of Harvey").
STORM_NAMES = {
    "harvey", "irma", "maria", "nate", "florence", "michael", "dorian", "idai", "kenneth", "fani", "ockhi", "gaja", "titli",
    "vardah", "matthew", "patricia", "sandy", "katrina", "rita", "ike", "haiyan", "yolanda", "mangkhut", "jebi", "hagibis",
    "barry", "imelda", "laura", "sally", "delta", "zeta", "eta", "iota", "ida", "ian", "fiona", "nicole", "otis", "hilary",
    "lee", "idalia", "amphan", "nisarga", "tauktae", "yaas", "biparjoy", "mocha", "freddy", "ophelia", "ciara", "dennis",
    "eunice", "gloria", "filomena", "debbie", "winston", "pam", "gita", "harold", "hidaya", "remal", "milton", "helene", "beryl",
}
_LOCALITY_CUE = r"(?:\b(?:in|at|near|to|from|into|around|outside|downtown)|\b(?:suburb|town|city|village|county|parish|port)\s+of)\s+"
_STORM_PREFIX = r"\b(?:hurricane|tropical\s+storm|storm|cyclone|typhoon|super\s+typhoon|remnants\s+of|wake\s+of|aftermath\s+of|path\s+of|eye\s+of)\s+"
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
        cleaned = clean_for_ner(text)
        # NER sometimes spans "Florence, South Carolina" as one mention; each part becomes its own mention and the
        # second supports the first through the usual context rules.
        for m in list(strength):
            if "," in m and not self.gazetteer.lookup(m):
                parts = [p.strip(" .") for p in m.split(",") if p.strip(" .")]
                if len(parts) == 2 and all(self.gazetteer.lookup(p) for p in parts):
                    weak = strength.pop(m)
                    for p in parts:
                        strength.setdefault(p, weak)
        for m in list(strength):
            esc = re.escape(m)
            # "George R. Brown Convention Center": a first name followed by an initial is a person, not George, South Africa.
            if re.search(rf"\b{esc}\s+[A-Z]\.", cleaned):
                del strength[m]
                continue
            # A storm name is the storm unless the text places it ("Chicago suburb of Harvey"), and never when the
            # storm words precede it ("Hurricane Harvey", "remnants of Harvey").
            if m.lower() in STORM_NAMES:
                placed = re.search(_LOCALITY_CUE + esc + r"\b", cleaned, re.I) and not re.search(_STORM_PREFIX + esc + r"\b", cleaned, re.I)
                if not placed:
                    del strength[m]
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
            # Support at state level (or the replay anchor) is strong; a shared country alone is weak evidence, since
            # any US mention would otherwise vouch for any US hamlet.
            strong_by_key: dict[str, bool] = {}
            for c in cands:
                s = math.log10((c.population or 1) + 1)
                supported = False
                strong = False
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
                    strong = True
                if context is not None and c.key != context.key:
                    same_country = c.country_code == context.country_code
                    if context.admin1 and same_country and c.admin1:
                        # Inside the context's country, the admin1 unit decides; distance would let a neighbouring
                        # state's big city borrow the context's support.
                        if c.admin1 == context.admin1:
                            s += 2.0
                            supported = True
                            strong = True
                        else:
                            s += 0.5
                    elif haversine_km(c.lat, c.lon, context.lat, context.lon) <= (context.radius_km or 300.0):
                        s += 2.0
                        supported = True
                        strong = True
                    elif same_country:
                        s += 0.5
                if c.minor and not strong:
                    s -= 1.0
                strong_by_key[c.key] = strong
                scored.append((s, supported, c))
            # An informal short form ("Cali") yields to a place whose proper name is the mention when the text
            # supports that place ("Cali, Colombia"); on its own it keeps the usual population order.
            norm_m = normalise(m)
            if any(sup and (norm_m, c.key) not in self.gazetteer.informal for _s, sup, c in scored):
                scored = [(s - 1.0, sup, c) if (norm_m, c.key) in self.gazetteer.informal else (s, sup, c) for s, sup, c in scored]
            scored.sort(key=lambda t: t[0], reverse=True)
            best_s, best_supported, best = scored[0]
            if len(scored) == 1:
                conf = 0.9
            else:
                second_s = scored[1][0]
                margin = max(0.0, best_s - second_s)
                conf = min(0.9, 0.45 + 0.15 * margin)
            best_strong = strong_by_key.get(best.key, False)
            # A small town is only a resolution when its state, or the replay's region, is in evidence.
            if best.minor and not best_strong:
                conf = min(conf, 0.4)
            # An ordinary English word is not a place mention unless the text also points at that country or state.
            if m.lower() in COMMON_WORD_NAMES and not best_supported and best.kind != "country":
                continue
            # A hazard word is the hazard unless the state itself is named ("Hurricane, Utah").
            if m.lower() in HAZARD_WORD_NAMES and not best_strong:
                continue
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

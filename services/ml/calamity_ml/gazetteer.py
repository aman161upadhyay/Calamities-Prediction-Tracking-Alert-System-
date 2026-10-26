from __future__ import annotations

import csv
import math
import re
from dataclasses import dataclass, field
from pathlib import Path

from .config import DATA_DIR, RAW_DIR

_ASCII_NAME = re.compile(r"^[A-Za-z][A-Za-z .'\-]{2,}$")


@dataclass(frozen=True)
class GazetteerPlace:
    key: str
    name: str
    admin1: str | None
    country: str
    country_code: str
    lat: float
    lon: float
    population: int | None
    kind: str  # city | region | country

    def to_dict(self) -> dict:
        return {
            "key": self.key,
            "name": self.name,
            "admin1": self.admin1,
            "country": self.country,
            "countryCode": self.country_code,
            "lat": self.lat,
            "lon": self.lon,
            "population": self.population,
            "kind": self.kind,
        }


@dataclass
class Gazetteer:
    by_name: dict[str, list[GazetteerPlace]] = field(default_factory=dict)
    by_key: dict[str, GazetteerPlace] = field(default_factory=dict)
    country_names: dict[str, str] = field(default_factory=dict)

    def add(self, place: GazetteerPlace, *names: str) -> None:
        self.by_key[place.key] = place
        expanded: list[str] = []
        for n in names:
            expanded.append(n)
            if n.lower().endswith(" city") and len(n) > 8:
                expanded.append(n[:-5])
        for n in expanded:
            norm = normalise(n)
            if len(norm) < 3:
                continue
            bucket = self.by_name.setdefault(norm, [])
            if place not in bucket:
                bucket.append(place)

    def lookup(self, name: str) -> list[GazetteerPlace]:
        return self.by_name.get(normalise(name), [])

    def __len__(self) -> int:
        return len(self.by_key)


def normalise(s: str) -> str:
    s = s.strip().lower().replace("’", "'")
    s = re.sub(r"^(the|city of)\s+", "", s)
    s = re.sub(r"\s+(county|state|province|region|district)$", "", s)
    s = re.sub(r"[^a-z0-9' .\-]", "", s)
    return re.sub(r"\s+", " ", s).strip()


def _read_country_info(path: Path) -> dict[str, dict]:
    out: dict[str, dict] = {}
    with open(path, encoding="utf-8") as fh:
        for line in fh:
            if line.startswith("#") or not line.strip():
                continue
            cols = line.rstrip("\n").split("\t")
            if len(cols) < 6:
                continue
            out[cols[0]] = {"iso": cols[0], "name": cols[4], "capital": cols[5], "population": int(cols[7] or 0) if len(cols) > 7 and cols[7] else None}
    return out


def build_gazetteer(min_population: int = 50_000, alt_min_population: int = 200_000) -> Gazetteer:
    """GeoNames cities15000 (CC BY 4.0) filtered by population, plus curated regions and countries."""
    gz = Gazetteer()
    countries = _read_country_info(RAW_DIR / "countryInfo.txt")
    gz.country_names = {iso: c["name"] for iso, c in countries.items()}
    capitals: dict[str, GazetteerPlace] = {}

    with open(RAW_DIR / "cities15000.txt", encoding="utf-8") as fh:
        for line in fh:
            cols = line.rstrip("\n").split("\t")
            if len(cols) < 15:
                continue
            geoname_id, name, ascii_name, alternates = cols[0], cols[1], cols[2], cols[3]
            lat, lon = float(cols[4]), float(cols[5])
            feature_code = cols[7]
            cc = cols[8]
            admin1 = cols[10] or None
            population = int(cols[14] or 0)
            country = countries.get(cc, {}).get("name", cc)
            place = GazetteerPlace(
                key=f"geonames:{geoname_id}",
                name=name,
                admin1=admin1,
                country=country,
                country_code=cc,
                lat=lat,
                lon=lon,
                population=population or None,
                kind="city",
            )
            if feature_code == "PPLC":
                capitals[cc] = place
            if population < min_population and feature_code not in ("PPLC", "PPLA"):
                continue
            names = [name, ascii_name]
            if population >= alt_min_population and alternates:
                names += [a for a in alternates.split(",") if _ASCII_NAME.match(a)]
            gz.add(place, *names)

    for iso, info in countries.items():
        cap = capitals.get(iso)
        if not cap:
            continue
        place = GazetteerPlace(
            key=f"country:{iso}",
            name=info["name"],
            admin1=None,
            country=info["name"],
            country_code=iso,
            lat=cap.lat,
            lon=cap.lon,
            population=info["population"],
            kind="country",
        )
        gz.add(place, info["name"])

    with open(DATA_DIR / "regions.csv", encoding="utf-8") as fh:
        for row in csv.DictReader(fh):
            place = GazetteerPlace(
                key=row["key"],
                name=row["name"],
                admin1=None,
                country=row["country"],
                country_code=row["country_code"],
                lat=float(row["lat"]),
                lon=float(row["lon"]),
                population=None,
                kind="region",
            )
            aliases = [a for a in (row.get("aliases") or "").split("|") if a]
            gz.add(place, row["name"], *aliases)

    # Common demonyms and short forms that NER returns as GPE.
    extras = {
        "usa": "country:US", "u.s.": "country:US", "u.s.a.": "country:US", "us": "country:US", "america": "country:US",
        "uk": "country:GB", "u.k.": "country:GB", "britain": "country:GB", "great britain": "country:GB",
        "uae": "country:AE", "drc": "country:CD", "nz": "country:NZ", "aus": "country:AU",
        "bombay": "geonames:1275339", "madras": "geonames:1264527", "calcutta": "geonames:1275004", "new delhi": "geonames:1273294",
        "cochin": "geonames:1273874", "trivandrum": "geonames:1254163", "bengaluru": "geonames:1277333", "bangalore": "geonames:1277333",
        "nyc": "geonames:5128581", "la": "geonames:5368361", "sf": "geonames:5391959", "philly": "geonames:4560349",
        "cdmx": "geonames:3530597", "mexico df": "geonames:3530597",
    }
    for alias, key in extras.items():
        place = gz.by_key.get(key)
        if place:
            gz.add(place, alias)
    return gz


# Words that are also place names in GeoNames but are far more often ordinary words in tweets.
# Hazard vocabulary is excluded separately (Hurricane, Utah is a real town).
_MASK_STOPLIST = frozenset(
    """
    the for may this was can new has she got sat man most nov jan mar jul band part nice center centre league date rest luck
    ask media boy san dad reading sale international national air mad rip solo queen hang bar surprise jam soul garden central
    gold wedding independence mins per normal mobile bag van kings led river roman federal lake del las los valley mid orange
    union mill def spring lit mission split fat ham pit sub tip mrs saga male par inc pacific sin ban mound temple lap bend drug
    lab sea pal toy den tan springs chamber forest bon dat cab pat universal rim lion financial sac lad ami bel bug cypress
    hope mesa industry cary bath along same well best east west north south bay beach mount port hill park island city grand
    little long white black green red blue golden ocean bridge point cape fort march june august april july march october
    december november september february january sunday monday tuesday wednesday thursday friday saturday
    home house line road street avenue square market church college university school hospital station airport
    """.split()
)
_NON_PLACE_TOKENS: frozenset[str] = frozenset()


def _hazard_vocabulary() -> set[str]:
    from .config import HAZARDS

    words: set[str] = set()
    for h in HAZARDS:
        for term in list(h.get("terms", [])) + list(h.get("search", [])):
            for w in re.findall(r"[a-z]+", term.lower()):
                words.add(w)
    return words


def place_name_set(min_population: int = 50_000) -> frozenset[str]:
    """Lower-cased place names used to mask locations before text classification.

    Cities at or above the population floor (name and ASCII name only; alternate names only for cities of a
    million or more), countries, and the curated regions. Hazard vocabulary and common English words are
    left alone so that "Hurricane, Utah" cannot swallow the word hurricane.
    """
    countries = _read_country_info(RAW_DIR / "countryInfo.txt")
    names: set[str] = set()
    with open(RAW_DIR / "cities15000.txt", encoding="utf-8") as fh:
        for line in fh:
            cols = line.rstrip("\n").split("\t")
            if len(cols) < 15:
                continue
            population = int(cols[14] or 0)
            if population < min_population and cols[7] != "PPLC":
                continue
            candidates = [cols[1], cols[2]]
            if population >= 1_000_000 and cols[3]:
                candidates += [a for a in cols[3].split(",") if _ASCII_NAME.match(a) and a[0].isupper() and len(a) >= 5]
            for c in candidates:
                n = normalise(c)
                if n:
                    names.add(n)
    for info in countries.values():
        n = normalise(info["name"])
        if n:
            names.add(n)
    with open(DATA_DIR / "regions.csv", encoding="utf-8") as fh:
        for row in csv.DictReader(fh):
            for c in [row["name"]] + [a for a in (row.get("aliases") or "").split("|") if a]:
                n = normalise(c)
                if n:
                    names.add(n)
    names.update({"usa", "u.s.", "u.s.a.", "uk", "u.k.", "britain", "great britain", "america", "nyc", "philly", "cdmx", "bombay", "madras", "calcutta", "cochin", "trivandrum", "bengaluru", "bangalore", "new delhi"})
    hazard_words = _hazard_vocabulary()
    out: set[str] = set()
    for n in names:
        tokens = n.split()
        if any(t in hazard_words for t in tokens):
            continue
        if len(tokens) == 1:
            if len(n) < 4 or n in _MASK_STOPLIST or n.isdigit():
                continue
        elif all(t in _MASK_STOPLIST or len(t) < 3 for t in tokens):
            continue
        out.add(n)
    return frozenset(out)


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = p2 - p1
    dl = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))

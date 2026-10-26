from __future__ import annotations

import csv
import math
import re
import unicodedata
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
    # Rough extent for regions and countries, used to widen corroboration; None for cities.
    radius_km: float | None = None
    # Towns under the population floor: resolved only when the text or the stream gives supporting context.
    minor: bool = False

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
            "radiusKm": self.radius_km,
        }


@dataclass
class Gazetteer:
    by_name: dict[str, list[GazetteerPlace]] = field(default_factory=dict)
    by_key: dict[str, GazetteerPlace] = field(default_factory=dict)
    country_names: dict[str, str] = field(default_factory=dict)
    # (normalised alias, place key) pairs that exist only because "X City" was also registered as "X".
    alias_only: set[tuple[str, str]] = field(default_factory=set)
    # (normalised alias, place key) pairs for informal short forms ("Cali", "LA"); they rank below a place whose
    # proper name is the mention, so "Cali, Colombia" still finds the Colombian city.
    informal: set[tuple[str, str]] = field(default_factory=set)

    def add(self, place: GazetteerPlace, *names: str) -> None:
        self.by_key[place.key] = place
        expanded: list[tuple[str, bool]] = []
        for n in names:
            expanded.append((n, False))
            # "Oklahoma City" is also "Oklahoma"; only for sizeable cities, and see prune_city_aliases for clashes.
            if n.lower().endswith(" city") and len(n) > 8 and (place.population or 0) >= 200_000:
                expanded.append((n[:-5], True))
        for n, alias in expanded:
            norm = normalise(n)
            if len(norm) < 3:
                continue
            bucket = self.by_name.setdefault(norm, [])
            if place not in bucket:
                bucket.append(place)
            if alias:
                self.alias_only.add((norm, place.key))

    def prune_city_aliases(self) -> None:
        """Drop "X City" aliases that collide with a region or country called X, so "Texas" is the state and
        "Mexico" the country. Cities of five million or more keep theirs ("New York")."""
        for place in list(self.by_key.values()):
            if place.kind not in ("region", "country"):
                continue
            norm = normalise(place.name)
            bucket = self.by_name.get(norm)
            if not bucket:
                continue
            keep = [c for c in bucket if (norm, c.key) not in self.alias_only or (c.population or 0) >= 5_000_000]
            self.by_name[norm] = keep

    def lookup(self, name: str) -> list[GazetteerPlace]:
        return self.by_name.get(normalise(name), [])

    def __len__(self) -> int:
        return len(self.by_key)


# Compass and extent words that name no place on their own: "Southern Province" must not be findable as "Southern".
DIRECTION_WORDS = {
    "north", "south", "east", "west", "northern", "southern", "eastern", "western", "central", "northeast", "northwest",
    "southeast", "southwest", "northeastern", "northwestern", "southeastern", "southwestern", "upper", "lower", "coastal",
    "greater", "inland", "rural", "metro", "downtown", "north-east", "north-west", "south-east", "south-west",
}


def normalise(s: str) -> str:
    # Accents are folded, not dropped: "Bagé" must become "bage" (its GeoNames ascii name), never "bag", or the English
    # word "bag" in a relief post resolves to a town in Brazil.
    s = unicodedata.normalize("NFKD", s)
    s = "".join(ch for ch in s if not unicodedata.combining(ch))
    s = s.strip().lower().replace("’", "'")
    s = re.sub(r"^(the|city of)\s+", "", s)
    stripped = re.sub(r"\s+(county|state|province|region|district)$", "", s)
    if stripped not in DIRECTION_WORDS:
        s = stripped
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
            out[cols[0]] = {
                "iso": cols[0],
                "name": cols[4],
                "capital": cols[5],
                "area_km2": float(cols[6]) if len(cols) > 6 and cols[6] else None,
                "population": int(cols[7] or 0) if len(cols) > 7 and cols[7] else None,
            }
    return out


def _read_admin1_codes(path: Path) -> dict[tuple[str, str], str]:
    """GeoNames admin1CodesASCII: (country code, lowercased admin1 name) -> admin1 code, e.g. ("US", "california") -> "CA"."""
    out: dict[tuple[str, str], str] = {}
    if not path.exists():
        return out
    with open(path, encoding="utf-8") as fh:
        for line in fh:
            cols = line.rstrip("\n").split("\t")
            if len(cols) < 3 or "." not in cols[0]:
                continue
            cc, code = cols[0].split(".", 1)
            out[(cc, cols[1].lower())] = code
            out[(cc, cols[2].lower())] = code
    return out


def _radius_from_area(area_km2: float | None) -> float | None:
    if not area_km2 or area_km2 <= 0:
        return None
    return float(min(2500.0, max(100.0, math.sqrt(area_km2 / math.pi))))


def build_gazetteer(min_population: int = 50_000, alt_min_population: int = 200_000, minor_min_population: int = 15_000) -> Gazetteer:
    """GeoNames cities15000 (CC BY 4.0) plus curated regions and countries.

    Cities at or above ``min_population`` resolve on their own. Smaller towns (down to ``minor_min_population``) are kept
    as *minor* entries that only resolve with supporting context, so "Paradise, California" finds Paradise, CA while a
    bare "Paradise" does not get pinned to the biggest homonym with false confidence.
    """
    gz = Gazetteer()
    countries = _read_country_info(RAW_DIR / "countryInfo.txt")
    admin1_codes = _read_admin1_codes(RAW_DIR / "admin1CodesASCII.txt")
    gz.country_names = {iso: c["name"] for iso, c in countries.items()}
    capitals: dict[str, GazetteerPlace] = {}
    # City coordinates per (country, admin1), used to size curated regions that map to an admin1 unit.
    admin1_points: dict[tuple[str, str], list[tuple[float, float]]] = {}

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
            if admin1:
                admin1_points.setdefault((cc, admin1), []).append((lat, lon))
            minor = population < min_population and feature_code not in ("PPLC", "PPLA")
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
                minor=minor,
            )
            if feature_code == "PPLC":
                capitals[cc] = place
            if minor and population < minor_min_population:
                continue
            names = [name, ascii_name]
            if population >= alt_min_population and alternates:
                # Alternate names, minus airport codes and other short tokens ("THE" is Teresina's IATA code).
                names += [a for a in alternates.split(",") if _ASCII_NAME.match(a) and len(a) >= 4 and not a.isupper()]
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
            radius_km=_radius_from_area(info.get("area_km2")),
        )
        gz.add(place, info["name"])

    with open(DATA_DIR / "regions.csv", encoding="utf-8") as fh:
        rows = list(csv.DictReader(fh))
    region_admin1: dict[str, str | None] = {}
    for row in rows:
        cc = row["country_code"]
        explicit = (row.get("admin1") or "").strip() or None
        admin1 = explicit or admin1_codes.get((cc, row["name"].lower()))
        if admin1 is None and "-" in row["key"]:
            # Sub-regions such as region:us-ca-norcal inherit from region:us-ca.
            parent = row["key"].rsplit("-", 1)[0]
            admin1 = region_admin1.get(parent)
        region_admin1[row["key"]] = admin1
        lat, lon = float(row["lat"]), float(row["lon"])
        radius: float | None = float(row["radius_km"]) if (row.get("radius_km") or "").strip() else None
        if radius is None and admin1 and not explicit and admin1_codes.get((cc, row["name"].lower())) == admin1:
            pts = admin1_points.get((cc, admin1), [])
            if pts:
                radius = min(800.0, max(100.0, max(haversine_km(lat, lon, a, b) for a, b in pts)))
        place = GazetteerPlace(
            key=row["key"],
            name=row["name"],
            admin1=admin1,
            country=row["country"],
            country_code=cc,
            lat=lat,
            lon=lon,
            population=None,
            kind="region",
            radius_km=radius if radius is not None else 300.0,
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
        "cali": "region:us-ca", "norcal": "region:us-ca-norcal", "socal": "region:us-ca-socal",
    }
    for alias, key in extras.items():
        place = gz.by_key.get(key)
        if place:
            gz.add(place, alias)
            gz.informal.add((normalise(alias), place.key))
    gz.prune_city_aliases()
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

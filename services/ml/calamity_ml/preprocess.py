from __future__ import annotations

import re

from .config import HAZARDS

_URL = re.compile(r"https?://\S+|www\.\S+")
_HANDLE = re.compile(r"@\w+")
_WS = re.compile(r"\s+")
_CAMEL = re.compile(r"(?<=[a-z])(?=[A-Z])|(?<=[A-Z])(?=[A-Z][a-z])")
_HASHTAG = re.compile(r"#(\w+)")
_RT = re.compile(r"^RT\s+@\w+:\s*")


PLACE_TOKEN = "geoplace"
_MASK_TOKENS = re.compile(r"[A-Za-z\u00C0-\u024F][A-Za-z\u00C0-\u024F'\u2019.\-]*|\d+(?:[.,]\d+)*|\S")


def clean_for_model(text: str, mask_names: frozenset[str] | None = None) -> str:
    """Cardiff-style normalisation: handles -> @user, links -> http, camel-case hashtags split.

    When mask_names is given, place names are replaced with a single token so the classifier learns hazard
    vocabulary rather than the locations of the events it was trained on.
    """
    text = _RT.sub("", text or "")
    text = _URL.sub("http", text)
    text = _HANDLE.sub("@user", text)
    text = _HASHTAG.sub(_split_hashtag, text)
    if mask_names:
        text = mask_places(text, mask_names)
    return _WS.sub(" ", text).strip()


def mask_places(text: str, names: frozenset[str], max_words: int = 3) -> str:
    """Replace known place names (up to three words, longest match first) with PLACE_TOKEN."""
    tokens = _MASK_TOKENS.findall(text)
    if not tokens:
        return text
    lowered = [t.lower().replace("\u2019", "'").rstrip(".") if len(t) > 2 else t.lower() for t in tokens]
    out: list[str] = []
    i = 0
    n = len(tokens)
    while i < n:
        matched = 0
        for size in range(min(max_words, n - i), 0, -1):
            if " ".join(lowered[i : i + size]) in names:
                matched = size
                break
        if matched:
            out.append(PLACE_TOKEN)
            i += matched
        else:
            out.append(tokens[i])
            i += 1
    return " ".join(out)


def _split_hashtag(m: re.Match[str]) -> str:
    word = m.group(1)
    if word.isupper() or word.islower():
        return word
    return _CAMEL.sub(" ", word)


# Pictographs, symbols and variation selectors; a leading emoji makes spaCy read the next word as a name ("📰 Man").
_EMOJI = re.compile(
    "[\U0001F000-\U0001FAFF\U00002600-\U000027BF\U00002B00-\U00002BFF\U0001F900-\U0001F9FF\uFE0F\u200D\u2190-\u21FF\u2300-\u23FF\u25A0-\u25FF]+"
)


# Words run together where a line break was lost ("Northern CaliforniaThe death toll"): split a lowercase run of
# three or more letters from a following capitalised word. "McDonald" and "DeSantis" keep their two-letter prefixes.
_RUN_TOGETHER = re.compile(r"(?<=[a-z]{3})(?=[A-Z][a-z]{2})")


def clean_for_ner(text: str) -> str:
    """Keep casing, drop links, handles and emoji, split camel-case hashtags (#KeralaFloods -> Kerala Floods)."""
    text = _RT.sub("", text or "")
    text = _URL.sub(" ", text)
    text = _HANDLE.sub(" ", text)
    text = _EMOJI.sub(" ", text)
    text = _HASHTAG.sub(_split_hashtag, text)
    text = _RUN_TOGETHER.sub(" ", text)
    return _WS.sub(" ", text).strip()


_TERM_PATTERNS: list[tuple[str, re.Pattern[str]]] = []
for _h in HAZARDS:
    terms = sorted(set(_h["terms"]), key=len, reverse=True)
    pattern = r"\b(?:" + "|".join(re.escape(t) for t in terms) + r")\b"
    _TERM_PATTERNS.append((_h["id"], re.compile(pattern, re.IGNORECASE)))


def keyword_hazards(text: str) -> dict[str, int]:
    """Hazard ids whose vocabulary appears in the text, with hit counts."""
    hits: dict[str, int] = {}
    for hazard_id, pat in _TERM_PATTERNS:
        n = len(pat.findall(text or ""))
        if n:
            hits[hazard_id] = n
    return hits

#!/usr/bin/env python3
"""Repository lint used by the council before every push.

Checks, in order:
  1. Every folder has a README.md; agent and top-level folders also have FOR-AMAN.md.
     Vendored folders (those containing SOURCE.md, or under a path segment named
     "vendored") are exempt from the FOR-AMAN.md rule but still need SOURCE.md.
  2. Authored prose (not vendored) is free of the banned patterns in PRINCIPLES.md
     section 4 and of placeholders (TODO, TBD, lorem ipsum, "coming soon").
  3. Relative Markdown links resolve to files or folders that exist.
  4. No secrets or private keys anywhere in the tree.
  5. No file over 1 MB; no binary file outside 06-reference-library/figures and vendored folders.
  6. Eval cases (*.yaml under */evals/) parse and carry the required keys.

Usage: python3 07-council/tools/lint.py [repo_root]
Exit code 0 when there are no blockers and no majors; 1 otherwise. Minors are printed only.
The eval-schema check needs PyYAML; when it is missing the lint reports a major so the gap is visible.
"""
import json
import datetime
import os
import re
import sys

ROOT = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), "..", ".."))

BANNED = [
    (r"\u2014", "em dash", "major"),
    (r"\bit['\u2019]s not (?:about )?[\w\s]{1,40}, it['\u2019]s\b", "it's not X, it's Y", "major"),
    (r"\bdelve\b", "delve", "major"),
    (r"\btapestry\b", "tapestry", "major"),
    (r"\btestament to\b", "testament to", "major"),
    (r"\bseamless(?:ly)?\b", "seamless", "minor"),
    (r"\bleverag(?:e|es|ing)\b", "leverage (verb)", "minor"),
    (r"\bgame-?changer\b", "game-changer", "major"),
    (r"\bin today['\u2019]s fast-paced\b", "in today's fast-paced world", "major"),
    (r"\bit['\u2019]s worth noting\b", "it's worth noting", "major"),
    (r"\bat the end of the day\b", "at the end of the day", "minor"),
    (r"\blet['\u2019]s dive in\b", "let's dive in", "major"),
    (r"\bunlock the\b", "unlock the", "minor"),
    (r"\bTBD\b|\bTODO\b(?!\.md|-list|s\b)|lorem ipsum|coming soon", "placeholder", "blocker"),
]
CASE_SENSITIVE = {"placeholder"}
SOURCE_TEXT_DIRS = ("06-reference-library/papers",)  # verbatim conversions of other people's text
SECRETS = [
    (r"\b(?:AKIA|ASIA)[0-9A-Z]{16}\b", "AWS access key"),
    (r"\bsk-(?:proj-|live-|test-)?[A-Za-z0-9_-]{20,}", "OpenAI or Stripe style key"),
    (r"\bsk-ant-[A-Za-z0-9_-]{20,}", "Anthropic key"),
    (r"\bgh[pousr]_[A-Za-z0-9]{30,}", "GitHub token"),
    (r"\bgithub_pat_[A-Za-z0-9_]{30,}", "GitHub fine-grained token"),
    (r"\bhf_[A-Za-z0-9]{30,}", "Hugging Face token"),
    (r"\bAIza[0-9A-Za-z_-]{35}\b", "Google API key"),
    (r"\bvca_[A-Za-z0-9]{20,}", "Vercel token"),
    (r"\bxox[baprs]-[A-Za-z0-9-]{10,}", "Slack token"),
    (r"\bglpat-[A-Za-z0-9_-]{20,}", "GitLab token"),
    (r"\bnpm_[A-Za-z0-9]{36}\b", "npm token"),
    (r"-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP |ENCRYPTED )?PRIVATE KEY(?: BLOCK)?-----", "private key"),
    (r"[a-z][a-z0-9+.-]*://[^/\s:@]+:[^/\s@]{6,}@[^\s]+", "credential in URL"),
    (r"(?i)\b(?:password|passwd|secret|api[_-]?key|token)\s*[=:]\s*['\"]?[A-Za-z0-9/+_\-]{16,}['\"]?", "credential assignment"),
]
# Dummy-value checks apply to the credential value only (never to a URL host or the key name), and only to
# whole values: a value is a dummy when it is a delimited placeholder (<...>, {{...}}, ${...}), a repeated
# filler character, or a known prefix followed only by filler. A real-shaped value that merely contains a
# dummy-looking substring is still reported.
SECRET_ALLOW = [
    r"^<[^>]*>$",
    r"^(?:\{\{[^}]*\}\}|\$\{[^}]*\}|\$[A-Z_]+)$",
    r"^(?:[A-Za-z]{1,12}[_-])?(?:[xX]{6,}|(?:\.){3,}|\*{4,}|0{8,}|(?:1234567890)+|(?:abcdef){2,})(?:[_-]?[A-Za-z0-9]{0,4})?$",
    r"^(?:[A-Za-z]{1,12}[_-])?(.)\1{7,}$",
    # a value made only of dummy words joined by _ or - (your_api_key_here, replace-with-token, example_secret_value)
    r"(?i)^(?:(?:your|my|our|the|a|an|example|placeholder|redacted|dummy|sample|fake|test|changeme|insert|replace|with|put|goes|actual|real|string|api|key|token|secret|password|passwd|value|here|id|name)[_-]?){2,}$",
]


def secret_value(pat_name, matched):
    """Return the part of a match that is the credential itself, for the dummy check."""
    if pat_name == "credential in URL":
        m = re.search(r"://[^/\s:@]+:([^/\s@]{6,})@", matched)
        return m.group(1) if m else matched
    if pat_name == "credential assignment":
        m = re.search(r"[=:]\s*['\"]?([A-Za-z0-9/+_\-]{16,})", matched)
        return m.group(1) if m else matched
    return matched
EVAL_REQUIRED = ["id", "agent", "title", "task", "inputs", "gold", "rubric", "judge", "anti_patterns", "source", "as_of"]
TEXT_EXT = {".md", ".yaml", ".yml", ".json", ".txt", ".py", ".sh", ".js", ".ts", ".toml", ".csv", ".mdc", ".html", ".css", ".tsx", ".jsx", ".mjs", ".cjs", ".jsonl", ".cfg", ".ini", ".xml", ".svg", ".env.example"}
BINARY_OK_DIRS = ("06-reference-library/figures",)

findings = []


def add(sev, path, msg, line=None):
    loc = f"{path}:{line}" if line else path
    findings.append((sev, loc, msg))


def is_vendored(rel):
    """Vendored upstream text, or recorded run evidence, is scanned for secrets but not held to our prose rules."""
    parts = rel.split(os.sep)
    if "vendored" in parts:
        return True
    if rel.startswith(os.path.join("05-evals", "results", "run-")) and len(parts) > 3:
        return True
    d = os.path.join(ROOT, os.path.dirname(rel))
    while len(d) >= len(ROOT):
        if os.path.exists(os.path.join(d, "SOURCE.md")):
            return True
        if d == ROOT:
            break
        d = os.path.dirname(d)
    return False


def walk():
    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = [d for d in dirnames if d not in (".git", "node_modules", "__pycache__")]
        yield dirpath, dirnames, filenames


try:
    import yaml  # type: ignore

    class _StrictLoader(yaml.SafeLoader):
        pass

    def _no_dup(loader, node, deep=False):
        mapping = {}
        for k_node, v_node in node.value:
            k = loader.construct_object(k_node, deep=deep)
            if k in mapping:
                raise yaml.YAMLError(f"duplicate key: {k}")
            mapping[k] = True
        return yaml.SafeLoader.construct_mapping(loader, node, deep)

    _StrictLoader.add_constructor(yaml.resolver.BaseResolver.DEFAULT_MAPPING_TAG, _no_dup)
    YAML_OK = True
except ImportError:  # pragma: no cover
    yaml = None
    YAML_OK = False

eval_files_seen = 0


def check_eval_case(rel, text):
    """Full check against 04-harness-components/evals-framework/eval-case-schema.md."""
    global eval_files_seen
    eval_files_seen += 1
    if not YAML_OK:
        return
    try:
        data = yaml.load(text, Loader=_StrictLoader)
    except Exception as e:  # noqa: BLE001
        add("major", rel, f"eval YAML does not parse: {str(e)[:90]}")
        return
    if not isinstance(data, dict):
        add("major", rel, "eval case is not a mapping")
        return
    missing = [k for k in EVAL_REQUIRED if k not in data]
    if missing:
        add("major", rel, f"eval case missing keys: {', '.join(missing)}")
    for k in ("id", "agent", "title", "task"):
        if k in data and (not isinstance(data[k], str) or not data[k].strip()):
            add("major", rel, f"{k} must be a nonempty string")
    if "inputs" in data and (data["inputs"] is None or (isinstance(data["inputs"], (str, list, dict)) and not data["inputs"]) or not isinstance(data["inputs"], (str, list, dict))):
        add("major", rel, "inputs must be nonempty text, a path list or a mapping")
    if "gold" in data and (data["gold"] is None or (isinstance(data["gold"], (str, list, dict)) and not data["gold"]) or not isinstance(data["gold"], (str, list, dict))):
        add("major", rel, "gold must be nonempty text, criteria or a mapping")
    if "judge" in data and data["judge"] not in ("human", "llm", "script", "pairwise"):
        add("major", rel, "judge must be one of human, llm, script, pairwise")
    ap = data.get("anti_patterns")
    if "anti_patterns" in data and (not isinstance(ap, list) or not ap or not all(isinstance(a, str) and a.strip() for a in ap)):
        add("major", rel, "anti_patterns must be a nonempty list of strings")
    if "source" in data and (data["source"] is None or (isinstance(data["source"], (str, dict)) and not data["source"]) or not isinstance(data["source"], (str, dict))):
        add("major", rel, "source must be nonempty text or a mapping")
    if "as_of" in data and data["as_of"] is None:
        add("major", rel, "as_of must be a quoted ISO date string, not null")
    stem = os.path.splitext(os.path.basename(rel))[0]
    if "id" in data and str(data["id"]) != stem:
        add("major", rel, f"id '{data['id']}' does not match file name '{stem}'")
    folder_agent = rel.split(os.sep)[1] if rel.startswith("03-agents" + os.sep) else None
    if folder_agent and "agent" in data and str(data["agent"]) != folder_agent:
        add("major", rel, f"agent '{data['agent']}' does not match folder '{folder_agent}'")
    as_of = data.get("as_of")
    if as_of is not None and (not isinstance(as_of, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", as_of)):
        add("major", rel, "as_of must be a quoted ISO date string, e.g. \"2026-10-25\"")
    rubric = data.get("rubric")
    if not isinstance(rubric, list) or not rubric:
        add("major", rel, "rubric must be a nonempty list of {criterion, weight, pass_if}")
    else:
        for n, r in enumerate(rubric, 1):
            if not isinstance(r, dict) or not r.get("criterion") or not r.get("pass_if"):
                add("major", rel, f"rubric item {n} needs criterion and pass_if")
            elif isinstance(r.get("weight"), bool) or not isinstance(r.get("weight"), (int, float)) or r.get("weight") <= 0:
                add("major", rel, f"rubric item {n} needs a positive numeric weight")
    try:
        json.dumps(data)
    except TypeError as e:
        add("major", rel, f"eval case is not JSON-compatible: {str(e)[:80]}")


# 1. README / FOR-AMAN / SOURCE presence
for dirpath, dirnames, filenames in walk():
    rel = os.path.relpath(dirpath, ROOT)
    if rel == ".":
        continue
    depth = rel.count(os.sep) + 1
    vend = is_vendored(os.path.join(rel, "x"))
    if "README.md" not in filenames and not vend:
        # skills, personas, templates, logs, results and eval folders may be documented by the parent README
        leaf_ok = any(seg in rel.split(os.sep) for seg in ("skills", "personas", "templates", "checklists", "rubrics", "playbooks", "reference", "logs", "results", "tools", "sources", "figures", "evals", "guardrails", "spec", "patterns"))
        add("minor" if leaf_ok else "major", rel, "missing README.md")
    is_evidence = rel.startswith(os.path.join("05-evals", "results", "run-"))
    if vend and not is_evidence and "SOURCE.md" not in filenames and (not dirnames or "SKILL.md" in filenames):
        # only the vendored root needs SOURCE.md; children inherit; intermediate grouping folders are exempt
        parent_has = False
        d = dirpath
        while d != ROOT:
            d = os.path.dirname(d)
            if os.path.exists(os.path.join(d, "SOURCE.md")):
                parent_has = True
                break
        if not parent_has:
            add("major", rel, "vendored folder without SOURCE.md")
    if depth <= 2 and not vend and "FOR-AMAN.md" not in filenames:
        add("major", rel, "missing FOR-AMAN.md")

# 2-6. file checks
for dirpath, dirnames, filenames in walk():
    for fn in filenames:
        p = os.path.join(dirpath, fn)
        rel = os.path.relpath(p, ROOT)
        size = os.path.getsize(p)
        ext = os.path.splitext(fn)[1].lower()
        if size > 1_000_000:
            add("major", rel, f"file is {size/1e6:.1f} MB (limit 1 MB)")
        vend = is_vendored(rel)
        # 4. secrets: every file that decodes as text, whatever its name or extension (dotfiles, .pem, .env.* included)
        text = None
        try:
            with open(p, "r", encoding="utf-8", errors="strict") as f:
                text = f.read()
        except (UnicodeDecodeError, OSError):
            text = None
        if text is not None:
            for i, line in enumerate(text.split("\n"), 1):
                for pat, name in SECRETS:
                    for m in re.finditer(pat, line):
                        value = secret_value(name, m.group(0))
                        if not any(re.search(a, value) for a in SECRET_ALLOW):
                            add("blocker", rel, f"possible secret: {name}", i)
                            break
        is_text_name = ext in TEXT_EXT or fn in ("LICENSE", "LICENSE.txt", "NOTICE", "SOURCE.md", "Makefile", "Dockerfile", ".gitignore", ".gitattributes") or fn.startswith(".env")
        if not is_text_name:
            if not vend and not any(rel.startswith(d) for d in BINARY_OK_DIRS):
                add("minor", rel, f"non-text file ({ext or 'no extension'}) outside figures/vendored")
            continue
        if text is None:
            if not vend:
                add("minor", rel, "not valid UTF-8 text")
            continue
        lines = text.split("\n")
        if vend:
            continue
        if ext == ".md":
            in_fence = False
            for i, line in enumerate(lines, 1):
                if line.strip().startswith("```"):
                    in_fence = not in_fence
                if any(rel.startswith(d) for d in SOURCE_TEXT_DIRS) and in_fence is False and i > 60:
                    pass
                for pat, name, sev in BANNED:
                    flags = 0 if name in CASE_SENSITIVE else re.IGNORECASE
                    if any(rel.startswith(d) for d in SOURCE_TEXT_DIRS) and name == "em dash":
                        continue
                    if re.search(pat, line, flags=flags):
                        # quoted source passages and before-columns of slop tables are allowed
                        if line.lstrip().startswith(">") or "| before" in line.lower() or re.match(r"^\|\s*[A-Z]{1,3}\d{2}", line.strip()):
                            continue
                        m = re.search(pat, line, flags=flags)
                        seg = line[max(0, m.start() - 160): m.start()]
                        inside_quote = (seg.count('"') + seg.count("\u201c") - seg.count("\u201d")) % 2 == 1
                        if name != "placeholder" and (inside_quote or (name != "em dash" and (seg.count("[") > seg.count("]") or "arxiv" in line.lower()))):
                            continue  # quoted upstream text, a link text, or a citation line
                        if name == "em dash" and re.search(r'(?i)upstream(?: description)?:\s*"', line):
                            continue  # quoted upstream skill description
                        if "banned" in line.lower() and name != "placeholder":
                            continue  # the rule that lists the banned words
                        if "catalogue" in rel or "catalog" in rel or "slop" in rel or "regex" in rel or "lint" in rel or "banned" in rel:
                            # the slop catalogue necessarily contains the patterns it describes
                            continue
                        add(sev, rel, f"banned pattern: {name}", i)
            # relative links
            for m in re.finditer(r"\[[^\]]*\]\((?!https?://|mailto:|#)([^)\s]+)(?:\s+\"[^\"]*\")?\)", text):
                target = m.group(1).split("#")[0]
                if not target:
                    continue
                tp = os.path.normpath(os.path.join(dirpath, target))
                if not os.path.exists(tp):
                    add("major", rel, f"broken relative link: {target}")
        if ext in (".yaml", ".yml") and os.sep + "evals" + os.sep in os.sep + rel and not fn.startswith("TEMPLATE"):
            check_eval_case(rel, text)

if eval_files_seen and not YAML_OK:
    add("major", "07-council/tools/lint.py", f"PyYAML is not installed: {eval_files_seen} eval files were NOT schema-checked (pip install pyyaml)")

order = {"blocker": 0, "major": 1, "minor": 2}
findings.sort(key=lambda f: (order[f[0]], f[1]))
counts = {k: sum(1 for f in findings if f[0] == k) for k in order}
for sev, loc, msg in findings:
    print(f"{sev.upper():8} {loc}: {msg}")
print(f"\nblockers={counts['blocker']} majors={counts['major']} minors={counts['minor']}")
sys.exit(1 if (counts["blocker"] or counts["major"]) else 0)

#!/usr/bin/env python3
"""Regression test for lint.py's eval-schema check. Copies one valid case into a temp tree, mutates it in
each of the ways below, and checks that the lint reports a major for every invalid variant and nothing for
the valid one. Needs PyYAML (the lint reports a major without it, which this test treats as a failure).
Run: python3 07-council/tools/test_lint_eval_schema.py [path-to-a-valid-case.yaml]"""
import os
import shutil
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
LINT = os.path.join(HERE, "lint.py")
ROOT = os.path.dirname(os.path.dirname(HERE))
CASE = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "03-agents", "writing-agent", "evals", "writing-002.yaml")

MUTATIONS = {
    "valid": lambda t: t,
    "unquoted-date": lambda t: t.replace('as_of: "2026-10-25"', "as_of: 2026-10-25"),
    "null-date": lambda t: t.replace('as_of: "2026-10-25"', "as_of: null"),
    "empty-title": lambda t: t.replace("title:", "title: []\n#", 1),
    "bad-judge": lambda t: t.replace("judge: human", "judge: oracle"),
    "duplicate-key": lambda t: t + "\njudge: human\n",
    "missing-anti-patterns": lambda t: t.replace("anti_patterns:", "anti_patterns_x:"),
    "boolean-weight": lambda t: t.replace("weight: 50", "weight: true", 1),
    "zero-weight": lambda t: t.replace("weight: 50", "weight: 0", 1),
}


def run_variant(name, mutate, original):
    tmp = tempfile.mkdtemp(prefix="lint-schema-")
    d = os.path.join(tmp, "03-agents", "writing-agent", "evals")
    os.makedirs(d)
    with open(os.path.join(d, "writing-002.yaml"), "w") as f:
        f.write(mutate(original))
    out = subprocess.run([sys.executable, LINT, tmp], capture_output=True, text=True).stdout
    shutil.rmtree(tmp)
    majors = [l for l in out.splitlines() if l.startswith("MAJOR") and "writing-002.yaml" in l]
    pyyaml_missing = "PyYAML is not installed" in out
    return majors, pyyaml_missing


def main():
    original = open(CASE).read()
    if 'as_of: "2026-10-25"' not in original or "judge: human" not in original or "weight: 50" not in original:
        print("choose a case with as_of \"2026-10-25\", judge: human and a weight: 50 criterion"); sys.exit(2)
    failures = 0
    for name, mutate in MUTATIONS.items():
        majors, missing = run_variant(name, mutate, original)
        if missing:
            print("PyYAML missing: schema not checked"); sys.exit(1)
        ok = (not majors) if name == "valid" else bool(majors)
        if not ok:
            failures += 1
            print(f"FAIL {name}: majors={majors}")
    print(f"{len(MUTATIONS) - failures}/{len(MUTATIONS)} variants behaved as expected")
    sys.exit(1 if failures else 0)


if __name__ == "__main__":
    main()

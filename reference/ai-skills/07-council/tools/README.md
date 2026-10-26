# Council tools

| File | What it does |
|---|---|
| `lint.py` | The mechanical part of a council round. Checks that every folder has `README.md` (and `FOR-AMAN.md` at the top two levels), that vendored folders carry `SOURCE.md`, that authored prose avoids the banned patterns in `PRINCIPLES.md` section 4 and contains no placeholders, that relative links resolve, that no secrets or private keys are present, that no file exceeds 1 MB, and that eval YAML meets the full schema in `04-harness-components/evals-framework/eval-case-schema.md` (eleven keys with types, quoted date, id and agent match, rubric shape, judge values, no duplicate keys, JSON-compatible). Prints findings with severity; exits non-zero on blockers or majors; reports a major instead of skipping when PyYAML is missing |
| `test_lint_secrets.py` | Regression test for the secret scan: 30 obfuscated fixtures covering every pattern family, the bypasses found in council rounds 2 and 3 (dummy first token, dummy-looking host, dummy substring inside or at the start of a real-shaped value), and eight delimited, filler or dummy-phrase values that must not fire. Writes only to a temp directory |
| `test_lint_eval_schema.py` | Regression test for the schema check: one valid case and eight invalid mutations (unquoted date, null date, empty title, bad judge, duplicate key, missing anti_patterns, boolean weight, zero weight). Needs PyYAML |

Run from the repository root:

```
python3 07-council/tools/lint.py .
```

The lint exempts quoted upstream text, the slop catalogues (which must contain the patterns they describe), and verbatim paper conversions under `06-reference-library/papers/`. It is deliberately strict on everything else; a false positive takes a second to dismiss, a missed pattern ships.

# Finding schema

Use this JSON Schema for each finding. The enclosing log records artifact hashes, review identity aliases and round metadata. `status` describes evidence; `disposition` describes resolution. Empty findings are allowed, but a coverage ledger remains mandatory.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Council finding",
  "type": "object",
  "additionalProperties": false,
  "required": ["id", "persona", "severity", "confidence", "location", "criterion", "impact", "evidence", "reproduction", "observed", "expected", "status", "fix", "retest", "falsifier", "disposition"],
  "properties": {
    "id": {"type": "string", "minLength": 1},
    "persona": {"type": "string", "minLength": 1},
    "severity": {"enum": ["blocker", "major", "minor"]},
    "confidence": {"type": "number", "minimum": 0, "maximum": 1},
    "location": {"type": "string", "minLength": 1},
    "criterion": {"type": "string", "minLength": 1},
    "impact": {"type": "string", "minLength": 1},
    "evidence": {"type": "array", "minItems": 1, "items": {"type": "string", "minLength": 1}},
    "reproduction": {"type": "string", "minLength": 1},
    "observed": {"type": "string", "minLength": 1},
    "expected": {"type": "string", "minLength": 1},
    "status": {"enum": ["reproduced", "supported-not-executed", "hypothesis"]},
    "fix": {"type": "string", "minLength": 1},
    "retest": {"type": "string", "minLength": 1},
    "falsifier": {"type": "string", "minLength": 1},
    "disposition": {"enum": ["open", "fixed", "disproved", "minor-deferred"]},
    "resolution_evidence": {"type": "string", "minLength": 1},
    "owner": {"type": "string", "minLength": 1}
  },
  "allOf": [
    {
      "if": {"properties": {"disposition": {"enum": ["fixed", "disproved"]}}},
      "then": {"required": ["resolution_evidence"]}
    },
    {
      "if": {"properties": {"disposition": {"const": "minor-deferred"}}},
      "then": {"required": ["owner"], "properties": {"severity": {"const": "minor"}}}
    }
  ]
}
```

Illustrative authored fixture, not a finding against this repository:

```json
{
  "id": "r1-f01",
  "persona": "domain-expert",
  "severity": "major",
  "confidence": 1,
  "location": "fixture.md:2",
  "criterion": "Reported totals equal the sum of supplied values",
  "impact": "The user would budget two extra units",
  "evidence": ["fixture.md:1 lists 2 and 3", "fixture.md:2 reports total 7"],
  "reproduction": "Read the two supplied integers and add 2 + 3",
  "observed": "The artifact reports 7",
  "expected": "The total is 5",
  "status": "supported-not-executed",
  "fix": "Replace the total with 5 without changing inputs",
  "retest": "Independent verifier recomputes all totals in the revised fixture",
  "falsifier": "An explicitly included additional quantity of 2 would change the contract",
  "disposition": "open"
}
```

Validate resolution evidence semantically after schema validation. A nonempty string is not proof of a retest. Repository policy uses blocker/major/minor; when importing P0/P1/P2/P3 reviews, map P0 to blocker, P1 to major, and classify P2 by actual impact rather than automatically reducing it to minor.

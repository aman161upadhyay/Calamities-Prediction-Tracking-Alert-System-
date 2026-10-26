# Finding quality rubric

Accept a finding only when its evidence supports a requirement violation.

| Check | Pass condition |
|---|---|
| Specific | Names a violated criterion and user consequence. |
| Located | Identifies path:line, exact passage or recorded interaction. |
| Reproducible | Supplies preconditions, minimal input and expected/observed result. |
| Honest | Distinguishes executed reproduction, static support and hypothesis. |
| Severity-ranked | Uses blocker/major/minor based on impact, not rhetorical intensity. |
| Falsifiable | States evidence that would disprove the claim. |
| Actionable | Suggests a bounded repair and independent retest. |

Reject style preferences without a brief requirement, duplicates presented as separate bugs and invented test outcomes. Preserve an uncertain consequential hypothesis for verification rather than deleting it to improve precision.

Measure validated seeded defects found divided by validated seeded defects, by severity. Measure false findings per clean artifact, valid-location fraction and complete-reproduction fraction. Record numerator and denominator. Measure repair success separately from critic recall.

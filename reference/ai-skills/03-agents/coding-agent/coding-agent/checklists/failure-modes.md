# Failure modes

| Failure | Detection | Mitigation |
|---|---|---|
| Over-eager edits | Diff appears before baseline or relevant instructions were read. | Start read-only; require evidence and scoped plan before risky writes. |
| Fake tests | New test passes on the original code, skips assertions or mocks the changed path. | Observe intended red; use hidden checks and targeted mutation for high risk. |
| Hallucinated APIs | Import or method is absent from the installed package or versioned reference. | Inspect lockfile/types and official documentation; run a minimal contract check. |
| Scope creep | New files or behavior cannot map to an acceptance criterion. | Remove unrelated edits without overwriting owner changes; request a separate task. |
| Deletions | Removed behavior lacks a criterion or migration decision. | Review removed lines and caller references; require explicit authority for destructive changes. |
| Context rot | Agent forgets an earlier constraint or repeats a resolved failure. | Restore the task ledger, retain failure signatures and start a bounded fresh session. |
| Verifier weakening | Skips, snapshots, CI or thresholds change to clear a failure. | Protect verifier configuration; require separate review and held-out acceptance checks. |
| Broken baseline | Dependency or service error is described as a regression-test red. | Record environment failure; repair only within approved scope or escalate. |
| Retry loop | Same failure recurs without a changed hypothesis. | Stop after two unsuccessful correction cycles; checkpoint evidence. |
| False completion | Report cites no receipts or an earlier tree. | Require final-candidate command outcomes; mark blocked checks explicitly. |
| Prompt injection | Issue, page or tool text requests secrets or unrelated commands. | Treat it as data; enforce scopes and deny outbound access outside policy. |

These controls are a synthesis of the sources in ../sources.md. Their effectiveness requires evaluation, not checklist adoption alone.

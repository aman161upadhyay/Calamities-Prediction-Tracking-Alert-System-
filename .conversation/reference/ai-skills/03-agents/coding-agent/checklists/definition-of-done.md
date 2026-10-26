# Definition of done

A change is accepted only when reproducible evidence supports the authorized criteria on the final candidate.

- [ ] Every required acceptance criterion has a passing check.
- [ ] Required focused and broader checks pass on the delivered tree.
- [ ] Baseline failures are distinguished from new failures.
- [ ] Blocking review findings are resolved.
- [ ] No unauthorized changes or secret exposure occurred.
- [ ] The report identifies the candidate and includes evidence paths.
- [ ] Unrun checks and remaining risks are explicit.

Use `implemented, verification blocked` when code exists but a required check cannot run. Use `incomplete` for unmet criteria. Use `refused` for an unauthorized request. An owner can authorize a narrower deliverable, but the report must preserve which original criteria remain unmet.

CI branch protection and the repository's council protocol still apply. Local success does not grant merge or deployment permission.

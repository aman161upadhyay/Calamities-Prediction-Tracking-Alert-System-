# Verification

## Baseline

- [ ] Confirm working directory, branch, dirty files and applicable instructions.
- [ ] Preserve unrelated modifications.
- [ ] Record runtime, command definitions and required services.
- [ ] Run baseline checks or record the exact blocker.

## Sensitivity

- [ ] Observe intended red before changing behavior.
- [ ] Distinguish assertion failure from a broken environment.
- [ ] Assert behavior rather than copied implementation values.
- [ ] Do not mock away the changed integration.
- [ ] For high-risk work, remove the fix or apply a targeted mutant in a disposable copy and observe failure.

## Final candidate

- [ ] Run focused tests and required broader regressions.
- [ ] Run applicable type, lint, format and build checks.
- [ ] Exercise changed contracts and error paths.
- [ ] Use browser interaction assertions for UI behavior.
- [ ] Inspect relevant viewports when appearance changes.
- [ ] Record command, directory, exit status, outcome, candidate identity and evidence path.
- [ ] Investigate new failures and unexpected skips.

For ML changes, add fixed seeds where appropriate, data-schema and split/leakage checks, inference-shape and artifact-loading tests, plus a declared numeric tolerance. A large training run needs separate authority and budget.

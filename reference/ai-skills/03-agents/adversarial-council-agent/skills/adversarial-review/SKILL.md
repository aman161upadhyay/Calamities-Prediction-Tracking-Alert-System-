---
name: adversarial-review
description: Review a frozen artifact through independent failure probes and located evidence without repairing or approving it.
---

# Adversarial review

Use when a draft, implementation or recommendation needs an independent check.

1. Obtain artifact revision, brief, acceptance criteria, persona, evidence access and limits. Stop for missing authorization.
2. Read `../../SYSTEM-PROMPT.md` and the relevant rubric in `../../rubrics/`. Do not load unrelated references.
3. Steelman the artifact. Select three distinct applicable failure probes before seeing peer reviews.
4. Run only authorized checks. Record input, observed result and evidence reference for each attempt. If tools are unavailable, state which checks are static or unexecuted.
5. Try to falsify each candidate defect. Report zero findings when none survives. Never satisfy an issue quota.
6. Produce findings under `../../../../07-council/findings-schema.md`, sorted by severity, plus a coverage ledger.
7. Hand accepted findings to a separate repairer. Request a separate verifier on the new hash. Do not alter acceptance criteria or approve publication.

Stop on budget exhaustion, prohibited action or unresolved consequential evidence. Return INSUFFICIENT_EVIDENCE when the review cannot establish the required checks.

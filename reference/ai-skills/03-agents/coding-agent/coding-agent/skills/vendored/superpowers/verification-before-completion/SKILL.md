---
name: verification-before-completion
description: Use before claiming a change is complete, fixed or passing; require fresh command evidence on the delivered candidate.
---

# Verification before completion

Adapted from Superpowers under MIT. See SOURCE.md.

No completion claim without fresh verification evidence.

1. Identify the command or interaction that proves the claim.
2. Run the required full check on the final candidate.
3. Read the outcome, exit status and failures. Preserve full evidence externally.
4. Compare the result with the claim.
5. State only the supported status and include its receipt.

| Claim | Required evidence | Insufficient substitute |
|---|---|---|
| Tests pass | Required test command with no failures. | A previous run or one focused pass. |
| Build succeeds | Build command succeeds on the candidate. | Lint passing. |
| Bug fixed | Original reproduction/regression passes. | Code changed. |
| Regression catches defect | Intended red then green. | Test passed once. |
| Worker completed | Actual diff and independent checks. | Worker success message. |
| Requirements met | Criterion-by-criterion evidence. | Generic model approval. |

Do not express success through synonyms when evidence is missing. Recheck after later code changes. Do not count a skipped check as a pass. Report pre-existing failures and unavailable checks by name.

When a required check cannot run, say `implemented, verification blocked`. Keep commit, push and PR permission separate from verification status. Passing checks do not authorize external actions.

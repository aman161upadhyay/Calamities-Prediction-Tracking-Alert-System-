# Council logs

Store one sanitized Markdown log per review as `yyyy-mm-dd-topic-round-n.md`. Logs are evidence of actual work, not templates that imply a review happened.

Each log records:

1. Scope, base commit, reviewed tree hash, changed paths and final content hash.
2. Brief, acceptance criteria, rubric revision and source packet references.
3. Anonymous reviewer aliases, assigned personas, independence statement and quorum.
4. Approved ceilings and actual cost, tokens, tool calls and wall time.
5. Probe ledger with attempted, skipped and unavailable checks.
6. Findings conforming to `../findings-schema.md`, including zero-finding reports.
7. Challenge evidence, dissent, chairman dispositions and repair owner.
8. Retest commands or static checks, observed results and final revision.
9. Per-round new supported blocker/major/minor counts and the diminishing-return comparison.
10. Verdict, unresolved limits and Aman’s push authorization if separately granted.

Keep raw private traces in an approved access-controlled store. Commit only sanitized evidence references with access instructions for authorized verifiers. Never commit credentials or customer content. Review the log for false completion claims before adding it to the reviewed change.

`FOR-AMAN.md` explains your review of these records. The integrator creates actual round logs after execution.

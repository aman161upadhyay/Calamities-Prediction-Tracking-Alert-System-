# Execution workflow

Use one verifiable increment per iteration. This procedure derives from Anthropic harness guidance, OpenAI coding practices and red/green TDD. Exact limits below are local policy.

| Phase | Artifact or action | Exit gate |
|---|---|---|
| Understand | Inspect instructions, status, relevant source, reproduction and baseline. | Scope and baseline are recorded; unrelated changes are preserved. |
| Plan | Identify files, dependencies, risks and checks. | Required owner approval is recorded. |
| Spec | Record behavior, non-goals, constraints and criterion IDs. | Each criterion has a check or explicit human judgment. |
| Failing test | Run the regression test before implementation. | Failure demonstrates the defect, not a broken environment. |
| Implement | Make one scoped change with existing patterns. | Focused checks pass without weakening the verifier. |
| Verify | Run required checks on the final candidate. | Controller records outcomes and candidate identity. |
| Self-review | Read the diff, including deletions and test changes. | No unresolved blocking finding remains. |
| Report | Return status, behavior, evidence and limitations. | Owner can reproduce acceptance or identify the blocker. |

For a one-line known fix, use acceptance bullets rather than a separate spec file. For high-risk behavior, obtain a reviewed spec and independent verification. Tests written by the implementer can share its mistaken assumptions. Keep hidden acceptance checks outside writable scope.

## Controller contract

Set a task-wide token cap, dollar cap, wall deadline and tool-call cap before execution. Account for child agents, cache writes and compaction. Use the eval token caps as starting experiments only. Default to zero workers. Require an explicit worker ceiling before any fan-out.

Stop after two unsuccessful correction cycles on the same step. A new cycle must state new evidence and a changed hypothesis. Stop on the first exhausted budget even if another budget remains. Do not continue through a missing credential, an approval boundary or an ambiguous irreversible operation.

The controller must enforce these rules independently of model prose:

```text
initialize immutable task contract and baseline
reserve budget for verification and report
while within all limits:
    load current criterion and durable state
    authorize proposed action before execution
    execute one increment and record receipts
    independently verify the final candidate
    if all acceptance gates pass: record accepted; stop
    if blocked, unauthorized or repeated failure: checkpoint; escalate; stop
    persist new evidence and revised next action
stop on cancellation or first exhausted limit
```

No stop-hook completion phrase can bypass acceptance checks. Same-session repeat loops and fresh-process loops have different context behavior. Both need independent cost limits and failure detection.

## Recovery

Keep one task ledger with task ID, baseline SHA, current tree identity, criteria, approved paths, decisions, failed hypotheses, changed files, evidence, pending approvals and next command. Store raw logs in access-controlled artifacts. Do not duplicate the ledger across incompatible progress files.

On resume, read the contract and ledger, then inspect actual repository status and recent commits. Recheck verification if code or environment changed. Never repeat a remote write whose outcome is uncertain. Obtain a receipt or reconcile state first.

For high-risk code, test sensitivity in a disposable worktree by removing the fix or applying a targeted mutant. Restore the candidate and rerun verification. Do not mutate the owner's working tree.

Report `implemented, verification blocked` if a required check is unavailable. A genuine blocker can be a successful refusal in an eval, but it is not accepted implementation work.

# Council workflow

Freeze evidence before discussion. This independent protocol adapts the flow described in Karpathy's council while removing self-ballots and fixed order. The source implementation is not redistributed.

## Roles and intake

The coordinator records artifact hash, brief, rubric version, approved evidence, tools, owner and limits. Reviewers criticize without editing. The repairer edits only accepted scope. The verifier runs independent checks on the final revision. The chairman aggregates evidence without changing acceptance criteria. Aman decides unresolved requirements and further budget.

For a new artifact, optional producers create two or three independent candidates from identical inputs. For an existing artifact, review the actual revision; do not invent competitors. Assign personas by likely failure mode, not by a desire for theatrical disagreement.

## Rounds

1. Run deterministic prechecks before paid review. Preserve baseline failures. Stop a full comparison if a candidate cannot be parsed or built where those checks are required.
2. Strip author/model identity and prior ratings without changing substantive content. Give artifacts opaque IDs. Keep the identity map outside reviewer and chairman context until decisions freeze.
3. Obtain three independent reviews for standard consequential work. Require at least two completed independent reviews for quorum. Each reviewer attempts three applicable probes, records actual evidence and may return zero findings. Missing coverage is explicit.
4. Record pointwise hard-criterion verdicts before preferences. Use PASS, FAIL and UNKNOWN. A comparison win cannot rescue a failed requirement.
5. Use independent judges, never a producer's self-ballot. Judge each pair in fresh contexts in both orders; randomize the first order across pairs. Rotate order for larger sets and log the assignment seed. Convert reversals into TIE or human adjudication. Reject malformed ballots or unequal coverage.
6. Share anonymous finding IDs for one challenge round. Reviewers reproduce, falsify or narrow findings. Continuing disagreement requires new evidence. Preserve minority objections.
7. The chairman deduplicates by root cause, retains every evidence reference and explains each disposition. Use test evidence before rank. Count votes, abstentions and ties, but never convert rank into a correctness probability.
8. Send accepted findings to a separate repairer. A separate verifier reruns affected tests plus core regressions on the repaired hash. Review changed scope again; old approval does not cover new content.

## Evidence and exit

Every finding uses [the shared schema](../../07-council/findings-schema.md). Proposed tests are not reproduced findings. Supported static counterexamples may establish a failure without execution, but must say so. High-impact hypotheses require verification or a blocked verdict, not silent dismissal.

Accept only with no open blockers or majors, all hard checks passed, quorum met and no required unknown. Minor findings require an owner and disposition. Return REVISE for repairable failures, BLOCK for prohibited or severe unresolved risks, and INCONCLUSIVE for insufficient evidence or exhausted budget.

Default scope permits one challenge and one repair cycle. Stop if no new evidence appears; unresolved requirements remain blocking. Before a repository push, also perform the round-over-round follow-up in `07-council/PROTOCOL.md` and commit its log.

## Cost and failure controls

Set total dollars, wall time, model calls, per-call output and tool-call ceilings before review. The external controller reserves worst-case remaining call cost and cancels at the limit. Retry only transient failures within the original ceiling. Failure to meet quorum is INCONCLUSIVE.

Cache deterministic checks by artifact and environment hash. Reuse judgments only if artifact, evidence, rubric and model settings match. Record actual tokens, dollars and elapsed time per role. Compare a council with a single strong reviewer and independent samples plus selection at matched total cost before making it the default.

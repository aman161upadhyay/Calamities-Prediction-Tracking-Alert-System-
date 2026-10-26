# Review protocol before every push

No push to `main` proceeds without independent council review of the proposed tree and a committed log. This implements `PRINCIPLES.md` section 6. Review is a release gate, not a vote that can waive failed requirements.

## Freeze the review

The coordinator records the base commit, reviewed tree hash, changed paths, acceptance criteria, source packet, rubric revision and approved budget. Include referenced dependencies when a change alters a shared contract. Read the constitution first.

Run deterministic checks for file layout, links, YAML/JSON validity, writing rules and secrets. Record exact commands and outcomes. Do not label an unrun check passed.

Assign independent reviewers:

- Skeptic/domain expert: correctness, contradictions and usable instructions.
- Source verifier: factual support, dates and redistribution rights.
- Security attacker/user advocate: permissions, unsafe instructions and actual usability.
- Slop detector: writing and unsupported specificity where relevant.

Standard review uses three reviewers, with several lenses assigned to each. Quorum is at least two completed independent reviews with all required lenses covered. Reviewers must not repair their own findings. A separate repairer changes files; an independent verifier checks the result.

## Blind first round

Give reviewers the same frozen tree, brief and evidence access. Hide other reviews and prior approval. Remove model/author identities from candidates when comparing outputs. Keep identity mappings outside chairman context until the decision is frozen.

Require at least three distinct applicable probe attempts per reviewer, never three bugs. Every attempt records input, location, evidence, outcome and skipped reason. Zero findings is valid. Static contradiction checks count as probes; they must not be described as executed software tests.

Use [findings-schema.md](findings-schema.md). Blocker means severe safety or catastrophic failure. Major means a core requirement or material claim fails. Minor means a bounded secondary defect. Confidence and severity remain separate.

## Challenge, aggregation and repair

The chairman receives anonymous findings and their evidence. Deduplicate root causes without losing original IDs or dissent. Resolve each against the fixed rubric. A majority cannot overturn a reproducible failure without counterevidence.

When comparing candidates, use independent judges with no self-ballots. Evaluate pointwise requirements first. Compare both A/B and B/A in separate contexts; counterbalance starting order across pairs. Treat reversals as ties or send them to Aman. Reject incomplete or duplicate-label ballots. Rankings are descriptive, not probabilities.

Allow one bounded challenge round. Require new evidence for continuing disagreement. Assign a separate repairer to accepted findings. The verifier reruns the specific reproduction and affected regression slice on the repaired tree. A changed artifact needs a changed hash.

## Exit criteria

All of these are required:

1. No open blockers and no open majors. A finding closes only with a verified fix or evidence that disproves it. Renaming it or accepting risk does not satisfy this gate.
2. Required deterministic checks pass on the final tree. Missing tools, required unknowns, infrastructure errors and missing quorum yield INCONCLUSIVE.
3. A follow-up review of the repaired or unchanged candidate shows diminishing returns: zero newly supported blockers or majors, and no more newly supported minor findings than the previous round. Record round counts. If the first round found zero issues, the second must also find zero new issues. This is a local stopping rule, not a statistical guarantee.
4. Remaining minors have a documented disposition and owner. Unverified consequential hypotheses require resolution before approval.
5. The log is committed with the change. It identifies the final reviewed content tree and verification evidence. Review the log itself for accuracy, links and private data before committing; adding the log must not conceal unreviewed substantive changes.

Default budget covers the independent round, one challenge and one repair/follow-up cycle. If the diminishing-return condition fails, stop and ask Aman to approve another cycle. Exhaustion never becomes approval.

The coordinator records ACCEPT, REVISE, BLOCK or INCONCLUSIVE. Only ACCEPT satisfies this review gate. Aman authorizes the actual push separately. Changes to the constitution require their own review, not an exception hidden in a routine log.

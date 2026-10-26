# Council round 4: verification of round-3 fixes

Date: 2026-10-25. Reviewer: one fresh session, blind to builders and earlier reviewers, scoped to the nine round-3 dispositions plus a pattern scan. Reviewer JSON in `work/council/round-4/` in the build environment.

## Verdict

REVISE. Seven of nine round-3 dispositions verified (SEC3-002 to SEC3-007, QUA3-001); SEC3-001 partial; QUA3-002 not fixed at the time of review (the CHANGELOG had been written before this round's outcome existed, which is the same defect in a new place). Four new findings: 0 blockers, 3 majors, 1 minor. Counts per round: 45 (4/36/5), 14 (8/5/1), 9 (0/7/2), 4 (0/3/1).

Checks executed: lint 0/0/0; secret fixtures 25/25; schema fixtures 9/9; independent static regex probes against the secret patterns extracted with ast.literal_eval (these found the VER4-001 bypass that the fixtures had missed); directory listing of the logs folder; pattern scan of the skills trees.

## Findings and dispositions

| ID | Severity | Location | Problem | Disposition |
|---|---|---|---|---|
| VER4-001 | major | `07-council/tools/lint.py`:59 | Credential-assignment detector still skips non-dummy values starting with dummy-looking substrings. Anchoring SECRET_ALLOW does not fix this earlier exclusion. | fixed: the substring lookahead removed from candidate detection; dummy phrases allowed only as whole values; five new fixtures (three positive prefix cases, two dummy phrases); 30/30 |
| VER4-002 | major | `01-skills-library/community/huggingface__skills/skills/huggingface-spaces/references/known-errors.md`:86 | An unrepaired sibling reference still instructs installing mutable Git HEAD from app.py at startup, contradicting the repaired Spaces dependency boundary. | fixed: known-errors.md recipe now requires an owner-reviewed full-commit pin at build time, with a modification notice |
| VER4-003 | major | `CHANGELOG.md`:10 | Release history again preclaims successful verification by the round currently in progress and points to an absent outcome log. | fixed: CHANGELOG now reports each round's actual outcome, including this round's REVISE and the scoped round 5 that followed |
| VER4-004 | minor | `01-skills-library/community/huggingface__skills/skills/huggingface-lora-space-builder/references/base-models/ltx.md`:143 | Native LTX dependency recipes remain unpinned and presented as requirements instructions, in conflict with the file's blanket withdrawal of unversioned Git dependencies. The diffusers repair does not provide a safe native-path replacement. | fixed: both native LTX snippets replaced by owner-reviewed full-commit placeholders under the same build-time rule |

## Round 5

A fifth, scoped round checks these four dispositions. Its log is `2026-10-25-initial-release-round-5.md`; the CHANGELOG sentence about the council is written after that log exists.

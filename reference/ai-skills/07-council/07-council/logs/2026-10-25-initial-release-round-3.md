# Council round 3: verification of round-2 fixes

Date: 2026-10-25. Reviewers: two fresh sessions, blind to each other and to the builders: security reviewer; quality-bar enforcer and user advocate combined. Brief: verify every round-2 disposition against the files, then look for anything the fixes broke. Reviewer JSON in `work/council/round-3/` in the build environment; findings reproduced here in full.

## Verdict

REVISE from both. Of the 17 round-2 dispositions in scope, 13 were verified complete, 4 partial (SEC2-001, SEC2-002, Q2-002, Q2-005), none unfixed. Nine new findings: 0 blockers, 7 majors, 2 minors. Counts per round so far: 45 (4/36/5), 14 (8/5/1), 9 (0/7/2); the first round with no blocker.

Checks executed by the reviewers: lint (blockers=0 majors=0 minors=0), secret fixtures 19/19, schema fixtures 9/9, three GitHub API spot-checks of community SOURCE.md numbers (all matched), static regex counterexamples against the allow-list, a fresh scan of 01-skills-library for fetch-and-execute and unpinned-install patterns.

## Partial round-2 items

| Item | Why partial | Disposition |
|---|---|---|
| SEC2-001 | allow-list still matched dummy-looking substrings inside real values; test oracle accepted unrelated diagnostics | see SEC3-001, SEC3-002 |
| SEC2-002 | the SKILL.md was fixed but two supporting references still ran the remote inspector | see SEC3-003 |
| Q2-002 / SV-001 | CHANGELOG pre-claimed round-3 verification | see QUA3-002 |
| Q2-005 / Q-001 | README line 5 summarised PRINCIPLES more narrowly than the text | see QUA3-001 |

## Findings and dispositions

| ID | Severity | Location | Problem | Disposition |
|---|---|---|---|---|
| SEC3-001 | major | `07-council/tools/lint.py`:62 | Allow-list still accepts arbitrary non-dummy credential values containing a dummy-looking substring. | fixed: allow-list anchored to whole values (delimited placeholders, filler runs, known dummy words); three new positive fixtures with dummy substrings inside real-shaped values |
| SEC3-002 | minor | `07-council/tools/test_lint_secrets.py`:52 | The regression oracle does not require the secret finding and filename to occur on the same diagnostic. | fixed: oracle requires path and message on one diagnostic line and checks lint completion; 25 fixtures |
| SEC3-003 | major | `01-skills-library/community/huggingface__skills/skills/huggingface-llm-trainer/references/troubleshooting.md`:125 | Supporting references still instruct fetch-and-execute of the mutable dataset inspector removed from the main skill. | fixed: both references use the vendored local inspector, credential-free; remaining resolve/main URLs are marked non-runnable historical examples |
| SEC3-004 | major | `01-skills-library/community/huggingface__skills/skills/huggingface-spaces/references/requirements.md`:43 | The bootstrap repair did not extend to sibling Spaces references that install mutable Git code at application startup. | fixed: runtime Git installs replaced by owner-reviewed full-commit pins installed at build time; the agent does not choose the commit |
| SEC3-005 | major | `01-skills-library/community/huggingface__skills/skills/huggingface-lora-space-builder/SKILL.md`:197 | The adapted LoRA skill still prescribes installing mutable Git HEAD as a deployment dependency. | fixed: unversioned diffusers URL no longer described as a pin; owner-chosen commit required (SKILL.md, ltx.md, qwen-image.md, zerogpu-and-publishing.md) |
| SEC3-006 | major | `01-skills-library/community/huggingface__skills/skills/train-sentence-transformers/references/hf_jobs_execution.md`:40 | The reference that removed shell bootstrap still directs executing mutable remote Python with write-capable Hub credentials. | fixed: inline script or immutable revision URL; token scoped to the destination and approved separately |
| SEC3-007 | major | `01-skills-library/community/trailofbits__skills/plugins/constant-time-analysis/skills/constant-time-analysis/references/php.md`:38 | Source-build installation recipes execute mutable repository build logic, including a privileged installation. | fixed: clone plus checkout of an owner-reviewed tag or commit, isolated build, user-local prefix, no sudo; Trail of Bits file carries the CC BY-SA modification notice |
| QUA3-001 | minor | `README.md`:5 | The public inclusion-policy summary remains narrower than the constitution it claims to summarize. | fixed: README line 5 now names practitioners, preprints and marked own judgement |
| QUA3-002 | major | `CHANGELOG.md`:10 | The blanket round-3 verification claim still cannot be accepted as true. | fixed: CHANGELOG states each round's actual outcome; round 4 verifies the round-3 fixes before the push |

## Round 4

Because round 3 found majors in the areas repaired after round 2, a fourth, scoped round verifies the nine dispositions above before the push. Its log is `2026-10-25-initial-release-round-4.md`. The retest commands and their results at the end of round 3 repairs: lint blockers=0 majors=0 minors=0; test_lint_secrets.py 25/25; test_lint_eval_schema.py 9/9.

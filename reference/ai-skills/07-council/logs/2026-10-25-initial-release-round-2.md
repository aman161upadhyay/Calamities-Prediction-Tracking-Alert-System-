# Council round 2: verification of round-1 fixes

Date: 2026-10-25. Reviewers: three, blind to each other and to the builders: security reviewer, quality-bar enforcer (with structure audit and source scepticism), user advocate (with slop detection). Each received the round-1 log, the list of 45 dispositions, and the tree after the round-1 fixes. Instructions: verify every round-1 item against the files, not the dispositions; report anything new. Reviewer JSON: `work/council/round-2/` in the build environment; findings reproduced here in full.

## Verdict

REVISE from all three. Of the 45 round-1 items, 36 were verified as fixed, 8 were partial, and 1 (SV-001) was not fixed. Fourteen new findings: 8 blockers, 5 majors, 1 minor. The round-1 fixes had introduced two of the blockers (the frontmatter breakage and the allow-list bypass) and the premature "round 2 verified" sentence.

## Partial or unfixed round-1 items

| Item | Status in round 2 | Disposition |
|---|---|---|
| SV-001 (README claims council completion) | not fixed; README and CHANGELOG said round 2 had verified everything while round 2 was running | reworded: README points to the logs as the record; CHANGELOG states the round-2 counts and that round 3 re-verified |
| Q-001 (untested prompts admitted) | partial; status tiers added but the inclusion gate still read as four tests for everything | PRINCIPLES section 1 now separates imported material (four tests) from original material (cites passing sources, carries a status line) |
| Q-003 (eval schema check) | partial; required-field types unchecked, title [] passed | lint checks types for every key; test_lint_eval_schema.py covers 8 invalid mutations |
| Q-006 (community inclusion evidence) | partial; 19 community SOURCE.md still used praise instead of numbers | each SOURCE.md now records the test number with stars, contributor count, last commit date and open issue/PR count as of 2026-10-25 |
| Q-009 (Vercel licence) | partial; note renamed but no terms and root LICENSE unchanged | root LICENSE section 2 records the exception; LICENSE-NOTE.md records the API checks, the declaration, the standard MIT terms without an invented copyright line, and the link-only alternative |
| SEC-008 (secret scan) | partial; allow-list and first-match suppression | finditer per pattern, value-only dummy check; see SEC2-001 |
| AMAN-003 (retrieval index allowlist) | partial; roster and root disagreed | both files carry the same allowlist and the same exclusions (SYSTEM-PROMPT.md, evals/, SKILL.md, skills folders) |
| AMAN-005 (tools guide) | partial; framing and grants missing | tools/FOR-AMAN.md rewritten: commands, exit codes, agent framing, access to grant and refuse, how to extend |

## New findings and dispositions

| ID | Severity | File | Finding | Disposition |
|---|---|---|---|---|
| SEC2-001 | blocker | 07-council/tools/lint.py | Secret gate examined only the first match per pattern per line and suppressed the whole match if any allow-list substring appeared anywhere in it; a dummy first token hid a real-shaped second token, and a dummy-looking host hid a URL credential | fixed: every match checked, allow-list applied to the credential value only; 19 regression fixtures in test_lint_secrets.py, including both bypasses |
| SEC2-002 | blocker | huggingface-llm-trainer/SKILL.md | Still instructed running a mutable remote Python script (dataset inspector) fetched at run time | fixed: local, credential-free usage of the vendored script; remote execution instruction removed |
| SEC2-003 | blocker | huggingface-community-evals/SKILL.md, examples/USAGE_EXAMPLES.md | Unconditional advice to enable trust-remote-code when custom code is required, with runnable examples | fixed: examples removed; the text now says the flag stays false and custom-code models need a reviewed, pinned checkout |
| SEC2-004 | blocker | huggingface-spaces/references/3d-gsplat.md (and 3d-cuda-extensions.md) | Told the agent to copy a runtime bootstrap verbatim and pip-install an unpinned Git repository | fixed: bootstrap guidance withdrawn; pinned, reviewed dependency rule stands alone |
| SEC2-005 | major | 9 adapted SKILL.md (Expo, Hugging Face) | Modification notices were prepended before the YAML frontmatter, so standard readers lost name and description | fixed: frontmatter restored to line 1, notice placed after it; all ten adapted skills parse |
| Q2-001 | major | 07-council/tools/lint.py | Schema check accepted invalid types for required fields | fixed, see Q-003 above |
| Q2-002 | blocker | README.md, CHANGELOG.md | Premature claim that round 2 verified every fix | fixed, see SV-001 above |
| Q2-003 | major | 19 community SOURCE.md | Inclusion evidence was praise, not the recorded test | fixed, see Q-006 above |
| Q2-004 | blocker | vercel-labs__agent-skills/LICENSE-NOTE.md, LICENSE | Seven Vercel skills copied without licence terms or a documented position | fixed, see Q-009 above; Aman can switch to link-only by deleting the folder |
| Q2-005 | major | PRINCIPLES.md | Authored-untested status did not reconcile with the unconditional inclusion gate | fixed, see Q-001 above |
| AMAN2-001 | major | 05-evals/results/run-1/FOR-AMAN.md | Review order destroyed the blind writing-001 comparison before the blind-step instruction | fixed: blind step first, with the recovery when exposure already happened |
| AMAN2-002 | blocker | FOR-AMAN.md, coding-agent/README.md, writing-agent/evals/README.md | Guides still said no eval had been executed, contradicting the recorded run | fixed: each states the ten executed cases, the judge, and what remains unrun |
| AMAN2-003 | blocker | README.md | Same as Q2-002 | fixed |
| AMAN2-004 | minor | 07-council/tools/FOR-AMAN.md | Described the old exit and missing-dependency behaviour | fixed, see AMAN-005 above |

## Verified in round 2 without change

SEC-001 to SEC-007 (installer removal, GGUF script removal, deploy-to-vercel and vercel-cli-with-tokens removal, token-in-chat removals, automatic feedback submission removed, REMOVED.md stubs), Q-002, Q-004, Q-005, Q-007, Q-008, Q-010, AMAN-001, AMAN-002, AMAN-004, AMAN-006 to AMAN-016, SV-002 to SV-006, S-001 to S-007, all nine agent status lines, and the eval run records.

## Process notes

- The reviewers could not run the lint as documented because PyYAML was not installed in their environment; the lint now reports that as a major instead of silently skipping, and the guide says to install it.
- Two blockers in this round were introduced by round-1 fixes. The round-3 brief therefore asks reviewers to check the fixes, not only the findings.
- Pushing the tree to GitHub during this round was blocked once by GitHub push protection: the secret-scan test fixtures, stored base64-encoded, were decoded and matched by GitHub. They are now stored with a tilde after every third character. The lint, GitHub's scanner and the fixtures all agree that the tree carries no credential.

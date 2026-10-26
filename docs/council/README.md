# Council review for this repository

This adapts `reference/ai-skills/07-council/PROTOCOL.md` and the adversarial-council agent to an overnight autonomous build. The protocol's rule that Aman authorizes each push is relaxed by his instruction on 2026-10-26 to push continuously; everything else stands. Each round is logged as `docs/council/round-N.md` and committed with the fixes it produced.

## When a round runs

- After milestone M3 (board and pages exist) and after M4 (polish), and after any later change to a user-facing surface.
- A round that finds a new blocker or major is followed by another round after repair.

## Reviewers

Three independent reviewers per round, each run as a separate subagent that has not seen the others' output or the builder's notes:

| Alias | Lenses | Inputs |
|---|---|---|
| R-slop | the design slop catalogue (68 tells), the writing catalogue, `uniqueness-review` | screenshots at 1440, 1024, 390; the DESIGN-BRIEF; rendered copy |
| R-user | user advocate and security attacker: can the primary jobs be done, by keyboard, on a phone; what leaks or breaks | the running app in a browser; the brief's primary jobs |
| R-skeptic | domain expert and source verifier: are the numbers, labels and claims supported; detector logic; model metrics; licences | the code, `metrics.json`, the model card, API responses |

Each reviewer makes at least three distinct probe attempts and records each one even when it finds nothing. Findings use `reference/ai-skills/07-council/findings-schema.md`. Severity: blocker for safety or data loss, major for a failed primary job or an unsupported material claim, minor for a bounded secondary defect.

## Repair and verify

The builder repairs accepted findings in a separate pass. A fourth subagent (or the testing subagent for browser findings) reruns each finding's reproduction on the repaired tree and the regression slice named in the finding. A finding closes only as `fixed` with resolution evidence or `disproved` with counterevidence.

## Exit

A round passes when it finds zero new blockers or majors and no more new minors than the previous round, and every remaining minor has a disposition and owner. If the first round finds nothing, the second must also find nothing. If rounds keep finding majors after three cycles, stop, log the open items and ask Aman.

## Round log template

```
# Round N, <date>, tree <short hash>

Scope: <routes and files reviewed>
Deterministic checks: pytest <result>, vite build <result>, tsc <result>, axe <result>, secrets scan <result>

## Findings
<one JSON object per finding, in a fenced block>

## Coverage ledger
| Reviewer | Probe | Location | Outcome |

## Dispositions
<fixed / disproved / minor-deferred with evidence and owner>

Decision: ACCEPT | REVISE | BLOCK | INCONCLUSIVE
```

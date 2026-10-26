# Reviewer evals

Eight authored development cases test critic precision and evidence discipline. No model results are claimed.

| Case suffix | Check |
|---|---|
| 001 | Seeded arithmetic defect and location. |
| 002 | Clean artifact, zero invented findings. |
| 003 | Unsupported writing commitment. |
| 004 | Source entailment and denominator fidelity. |
| 005 | Tenant boundary and static-evidence honesty. |
| 006 | Harmless injected grading instruction. |
| 007 | Counterbalanced pairwise judgment and verbosity control. |
| 008 | Fixed labels for severity and uncertainty. |

Load `../SYSTEM-PROMPT.md` with an applicable persona. Give the reviewer only each case's `task` and `inputs`. Use a fresh session for each trial. Case 007 requires two genuinely separate order contexts controlled by the coordinator. Give `gold`, rubric and anti-patterns to the human grader after output capture.

Use three trials as a pilot and record each separately. All rubric pass conditions must hold; UNKNOWN is not PASS. Record seeded-defect recall, false findings on case 002, location validity and case 008 label agreement. The sample is too small to establish production calibration.

Follow `../../../04-harness-components/evals-framework/runners.md` for manual execution or a future inspected Inspect adapter. Record sanitized runs under `../../../05-evals/results/`. Hidden validation variants require separate storage outside the reviewed agent's access.

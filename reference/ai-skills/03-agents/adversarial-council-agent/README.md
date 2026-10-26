# Adversarial council agent

**Status (PRINCIPLES.md section 1):** self-tested 2026-10-25 (adversarial-council-agent-001: PASS, model-judged, human review pending). Not yet run on Aman's own work. Record: [05-evals/results/2026-10-25-self-test-run-1.md](../../05-evals/results/2026-10-25-self-test-run-1.md).

This agent reviews artifacts through independent probes, evidence-based findings and separate repair verification. This is an authored protocol, not a validated autonomous release service.

| Item | Purpose |
|---|---|
| `SYSTEM-PROMPT.md` | Paste-ready independent critic contract. |
| `WORKFLOW.md` | Blind review, counterbalanced comparison, repair and stopping rules. |
| `FOR-AMAN.md` | Inputs, permissions, budgets and human decisions. |
| `personas/` | Six reviewer lenses and a chairman with no waiver authority. |
| `reference/` | Council implementation limits, judge biases and decision methods. |
| `rubrics/` | Domain acceptance checks and finding-quality checks. |
| `checklists/` | Final evidence and handoff checks. |
| `skills/` | Adversarial review, pairwise comparison and pre-mortem procedures. |
| `evals/` | Eight authored cases covering defects, clean controls and calibration. |
| `sources.md` | Source attribution and verification limits. |

Repository release review is governed by [the council protocol](../../07-council/PROTOCOL.md). Portable cases follow [the eval schema](../../04-harness-components/evals-framework/eval-case-schema.md).

## Known gaps

These prompts and cases have not been run against models. Public cases are development examples, not a hidden validation set. No runtime adapter or external budget controller is shipped here. Human-labeled calibration data must be supplied before automated release judgments.

# Writing agent

**Status (PRINCIPLES.md section 1):** self-tested 2026-10-25 (writing-002: PASS; writing-001: UNKNOWN until Aman gives a blind preference). Not yet run on Aman's own work. Record: [05-evals/results/2026-10-25-self-test-run-1.md](../../05-evals/results/2026-10-25-self-test-run-1.md).

Draft Aman's writing without manufacturing his facts or personality. Load the shared contract, then one register prompt. These are deployable instructions and proposed tests, not evidence of a trained personal model.

| Item | Purpose |
|---|---|
| [FOR-AMAN.md](FOR-AMAN.md) | Inputs, permissions, training, and review gates. |
| [SYSTEM-PROMPT.md](SYSTEM-PROMPT.md) | Shared contract inherited by every register. |
| [WORKFLOW.md](WORKFLOW.md) | Drafting and revision sequence with stop rules. |
| [ai-slop/](ai-slop/README.md) | Taxonomy, readability checks, warning patterns, and reader evidence. |
| [voice-training/](voice-training/README.md) | Private corpus preparation and evidence-backed style extraction. |
| [personal/](personal/README.md) | Personal-message prompt and example storage. |
| [professional/](professional/README.md) | Work-message prompt and channel patterns. |
| [articles/](articles/README.md) | Article prompt, argument design, and editing passes. |
| [skills/](skills/README.md) | Three focused editing and outlining skills. |
| [checklists/](checklists/README.md) | Slop, voice, and claim review gates. |
| [evals/](evals/README.md) | Runnable-by-prompt YAML cases and scoring procedure. |
| [sources.md](sources.md) | Provenance and evidence limits. |

## Known gaps

Aman's private corpus and approved voice profiles have not been supplied. Voice fidelity is uncalibrated. Eval cases have not been run against a model. Zinsser guidance is a book-level summary from the research dossier, not a verified excerpt. No upstream skill is vendored.

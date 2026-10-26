# Coding agent

**Status (PRINCIPLES.md section 1):** self-tested 2026-10-25 (coding-agent-001: PASS, tests re-run by the judge; human review pending). Not yet run on Aman's own work. Record: [05-evals/results/2026-10-25-self-test-run-1.md](../../05-evals/results/2026-10-25-self-test-run-1.md).

Use this agent for scoped repository changes with executable acceptance checks. The workflow combines first-party harness guidance with selected practitioner skills. The local policies have not yet been evaluated on Aman's repositories.

| Item | Purpose |
|---|---|
| [FOR-AMAN.md](FOR-AMAN.md) | Repository setup, task framing, access and approval decisions. |
| [SYSTEM-PROMPT.md](SYSTEM-PROMPT.md) | Complete portable system prompt. |
| [WORKFLOW.md](WORKFLOW.md) | Phases, controller limits and recovery rules. |
| [templates/](templates/README.md) | Project instructions, specifications, plans and delivery messages. |
| [guardrails/](guardrails/README.md) | Permissions and advisory hook examples. |
| [checklists/](checklists/README.md) | Completion, verification, review and failure detection. |
| [skills/](skills/README.md) | Four original skills and selected MIT adaptations. |
| [evals/](evals/README.md) | Concrete cases with task-wide token caps and hard safety failures. |
| [sources.md](sources.md) | Attributed sources, dates, evidence tiers and limitations. |

Start with one agent, the system prompt and the verification checklist. Load specialized skills only when their descriptions match the task. Repository instructions do not replace enforced permissions.

## Known gaps

One case (coding-agent-001) has been executed once in a disposable Node sandbox and model-judged; see the status line above. No hook installation was performed and the other ten cases are unrun. Eval fixtures are specified in YAML for a trusted runner to materialize in disposable repositories. They are synthetic tests of the harness, not production examples. This authored smoke suite (see the eval index in `05-evals/README.md` for the current count) does not replace the research proposal for 36 tasks from real repositories.

Vendored skills are explicitly adapted excerpts, not drop-in copies of the upstream plugins. Their SOURCE.md files record exclusions and policy changes. Framework-specific skills from Supabase, Vercel, Sentry and Expo are not installed by default. Select them only after the target stack and task justify them. Full Claude memory discovery and current client hook schemas still require installed-version checks.

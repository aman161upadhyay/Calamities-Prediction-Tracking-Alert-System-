---
name: token-budgeted-task
description: Use before autonomous coding work or when a task approaches token, dollar or time limits; allocate a global budget with a verification reserve and a recoverable stop.
---

# Token-budgeted task

The external controller enforces budgets. This skill plans within them.

1. Read the task cap for tokens, dollars, time, tool calls and workers. Ask for missing caps before autonomous execution.
2. Estimate exploration, implementation and verification from comparable observed tasks. Label estimates.
3. Reserve enough for required checks, a handoff and reporting. Do not consume that reserve on optional exploration.
4. Include cached input, cache writes, outputs, compaction and all children in token accounting. Dollar prices remain model-specific.
5. Start with no workers. Delegate only a bounded independent question whose cost fits the global remainder.
6. Check usage at phase boundaries and before fan-out. If a required gate will not fit, checkpoint and ask for a narrower deliverable or explicit additional budget.
7. Stop at the first exhausted limit or after two unsuccessful correction cycles on one step.

On stop, return consumed/remaining resources as recorded by the controller, accepted and unmet criteria, changed files, failures, pending approvals, evidence paths and next command. If usage telemetry is missing, report the gap and use the controller's conservative stop policy rather than fabricating counters.

Never drop tests or weaken criteria to fit a budget. A smaller implemented change is not accepted if required verification is blocked.

Success means no overspend, no unreported child usage and a restartable incomplete task when necessary. See ../../evals/coding-agent-008.yaml.

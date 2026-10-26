---
name: pre-mortem
description: Generate independent concrete failure hypotheses before discussion and convert them into bounded authorized probes.
---

# Pre-mortem

Use before an expensive review or a consequential deployment decision. This procedure generates hypotheses, not confirmed defects.

1. Obtain the intended user outcome, artifact revision, use horizon, constraints and approved testing budget.
2. Ask each reviewer independently: “Assume this artifact failed during its intended use. Name a concrete mechanism and the observable result.”
3. For each hypothesis record affected user, prerequisite, causal path, observable sign, potential impact and disconfirming evidence. Do not invent incident history.
4. Collect hypotheses only after independent generation. Group overlapping mechanisms without deleting minority concerns.
5. Select probes by impact and testability. Use a sandbox and benign controls; ask before external or destructive effects.
6. Hand the selected probes to the adversarial reviewer. Keep their outcomes separate from the original hypothetical stories.
7. Return a probe plan, owners, budgets and stop conditions. If no authorized probe can resolve a high-impact uncertainty, request a human decision rather than declaring failure or safety.

Optional forecasting requires a resolvable event, deadline and probability recorded in advance. Do not assign pseudo-precise probabilities to subjective quality.

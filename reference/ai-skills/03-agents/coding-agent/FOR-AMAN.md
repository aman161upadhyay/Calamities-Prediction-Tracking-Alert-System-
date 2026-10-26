# Use the coding agent

Give the agent a reproducible failure or a user outcome with observable acceptance criteria. Replace broad requests such as “make this production-ready” with one bounded increment.

## Prepare your repository

Keep one canonical AGENTS.md. Use the annotated CLAUDE.md adapter only after checking that your Claude client loads its import. Give the agent the runtime and package-manager versions, exact working directory, install policy, focused-test syntax and required final checks. Include startup, readiness and shutdown commands for browser work. Record baseline failures separately from accepted behavior.

In your architecture document, name subsystem entry points, invariants, public interfaces, generated-file commands and ownership boundaries. Link one accepted implementation for each relevant convention. Document error handling, test placement and compatibility constraints. Do not load every architecture document for every fix.

For ML work, supply legally usable deterministic fixtures, dataset schemas, split rules, expected inference shapes, serialization formats and numeric tolerances. Authorize expensive training separately. Do not grant unrestricted GPU spending.

## Frame the task

| Task | Prompt to give |
|---|---|
| Bug fix | “Fix this reproduction: input …, actual …, expected …. Keep the public interface unchanged. Work in these paths …. Observe a regression test fail before the fix. Run these commands …. Report evidence.” |
| Feature | “Implement this outcome …. Acceptance criteria: …. Non-goals: …. Read these architecture sections …. Propose affected files and tests before editing. Execute after I approve the plan.” |
| Refactor | “Preserve these contracts …. Remove this duplication or measured bottleneck …. No feature changes or new dependencies. Establish contract tests first. Compare these workloads before and after.” |
| Greenfield | “Produce a spec and risk assessment first. Users and use cases: …. Interfaces and constraints: …. Non-goals: …. Propose one runnable vertical slice and its tests. Do not create infrastructure until I approve it.” |

Set total token, dollar and wall-time caps. The starting token caps in evals are local policies, not provider recommendations. Ask for status `accepted`, `implemented, verification blocked`, `incomplete` or `refused`, plus commands and evidence paths.

## Grant access by phase

Grant read-only repository and issue access for investigation. Grant writes to an isolated branch or worktree after scope approval. Use synthetic test accounts and short-lived credentials through your secrets mechanism. Allow only necessary network destinations. Refuse production credentials, private data unrelated to the task and unrestricted host execution.

Require explicit approval for new dependencies, auth behavior, public API changes, schema changes, shared-data migrations, CI policy, protected files, commits, pushes and deployments. An approval for a feature does not authorize its deployment. Enforce protected paths and verifier ownership outside the agent's writable workspace.

## Review together

First review acceptance criteria and the plan. Then let the agent complete the authorized increment without repeated permission prompts for already-authorized low-risk edits. At delivery, inspect the actual diff and the final-tree verification receipts. Ask what did not run. Resolve blocking findings before accepting.

Run all cases in evals at least three times before granting autonomous writes. Add paired tasks from your own repositories before changing models or adding workers. Test a denied protected-path write and an instruction-injection case before allowing any credential-bearing tool. Use the council review required by PRINCIPLES.md before shipping to main.

## Front-end finishing skills

For UI work, the coding agent can load from `01-skills-library/community/`: `emilkowalski__skills/skills/mobile-native` (phone acceptance), `emilkowalski__skills/skills/break-ui` (content stress tests), `ibelick__ui-skills/skills/fixing-accessibility`, `fixing-metadata` and `fixing-motion-performance`. The design agent's `skills/README.md` says when each applies. Load one per pass.

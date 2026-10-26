---
name: writing-plans
description: Use with approved requirements for a multi-step change before implementation; specify tasks, interfaces and checkable results.
---

# Writing plans

Adapted from Superpowers under MIT. See SOURCE.md.

Write the decisions that an implementer cannot infer from the spec and existing patterns.

1. Read the approved spec and identify independent deliverables.
2. Map affected files to responsibilities. Follow existing boundaries rather than restructuring unrelated code.
3. Copy global constraints exactly, including dependency limits and compatibility.
4. Define each task's consumed and produced interfaces with exact names and types where relevant.
5. Make each task independently reviewable. Fold necessary setup into the deliverable that needs it.
6. Include a failing-test step, the intended failure, minimal implementation and passing check.
7. Identify implied input classes and error paths that tests still need.
8. Review criterion coverage, type consistency, task interfaces and proportion.

Use the repository's existing plan location or ../../../../templates/plan.md. Do not write full implementations into the plan when signatures and tests are sufficient.

Present the plan for required approval. Preserve the chosen execution method. Recommend inline execution for a bounded coupled change unless independent workers add measurable value. Budget worker contexts and reviews if delegation is chosen.

Do not schedule automatic commits without authority. A plan cannot override scope, deadline or permission gates. Stop on a spec conflict rather than inventing a requirement.

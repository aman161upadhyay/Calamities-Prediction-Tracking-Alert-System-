---
name: test-driven-development
description: Use before implementing a feature, bug fix or behavior change to observe an intended failing test before minimal implementation.
---

# Test-driven development

Adapted from Superpowers under MIT. See SOURCE.md for changes.

Write the test first. Watch it fail. Write minimal code to pass.

1. RED: write one test that states the expected behavior with concrete input and output. Name the production defect that the test should detect.
2. VERIFY RED: run the actual focused command. Confirm that the assertion fails for missing behavior, not a typo, broken import or unavailable service.
3. GREEN: implement only the behavior that the test requires. Avoid adjacent refactors or optional features.
4. VERIFY GREEN: run the focused test and the required broader suite. Read exit status and failure output.
5. REFACTOR: improve names or remove duplication only while behavior stays green.
6. Repeat for the next criterion.

Use real behavior assertions. Mock only unavoidable boundaries, not the path under change. Do not change expected values merely to match the implementation. Pure documentation and mechanical tasks can use an explained alternative check approved by the task contract.

If implementation predates the test, disclose that fact. Do not delete the owner's work. In a disposable copy, remove the fix or apply a targeted mutant and demonstrate sensitivity, then restore and verify the candidate.

Before completion, verify required final-tree checks and report every known failure. A focused pass does not establish a passing suite. If the environment blocks verification, report that status rather than claiming acceptance.

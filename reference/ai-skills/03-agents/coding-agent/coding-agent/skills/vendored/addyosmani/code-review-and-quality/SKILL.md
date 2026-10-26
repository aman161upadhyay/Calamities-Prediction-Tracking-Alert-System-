---
name: code-review-and-quality
description: Use before accepting a change to review behavior, tests, architecture, security and performance with located findings and verification evidence.
---

# Code review and quality

Adapted from Addy Osmani's agent-skills under MIT. See SOURCE.md.

Understand the requirements before reviewing the implementation. Review tests first and ask whether they would catch the defect. Test sensitivity in a disposable copy for high-risk behavior rather than modifying the owner's tree.

Review these dimensions:

- Correctness: criteria, boundaries, null/empty inputs, errors and concurrency.
- Readability: descriptive names, direct control flow and unnecessary abstractions.
- Architecture: existing patterns, ownership boundaries, type contracts and coupling.
- Security: input boundaries, authorization, secret handling and untrusted data.
- Performance: measured hot paths, N+1 queries, unbounded fetches and pagination.

For a structural issue, propose a specific move that reduces complexity. Do not block on personal style preferences. Keep unrelated refactors separate from behavior changes.

Read removed lines and look for orphaned behavior. Ask before deleting uncertain code. Review dependency changes against changelogs, licenses, lockfile/transitive effects and tests. Installation alone does not prove compatibility.

Return findings by severity with exact location, reproducible impact and remedy. Distinguish required defects from optional suggestions. Verify the author's claimed checks and final-candidate identity.

Resolve critical and required findings before acceptance. Do not invent performance numbers or reviewers. A different model's agreement is not proof. Required independent review and council gates remain external to this skill.

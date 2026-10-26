---
name: pr-and-commit-writing
description: Use after final-candidate review to draft a PR description or commit message that names observable behavior and reports only verified checks, without assuming permission to publish.
---

# PR and commit writing

1. Read the task criteria and final diff, including deleted lines and test changes.
2. Inspect verification receipts and candidate identity. Mark stale or missing checks as unverified.
3. Write an imperative subject that names the changed behavior. Avoid “fix bug” or unexplained phase labels.
4. Describe the user-visible change and its reason. Explain a non-obvious tradeoff only when useful.
5. List exact commands or browser interactions, outcomes and evidence paths.
6. State every required unrun check, known risk and migration/rollback need.
7. Follow the repository's issue-link, sign-off and attribution conventions.

Do not narrate private reasoning, paraphrase every file or invent reviewer approval. Never claim all tests passed from a focused-test receipt. Do not fabricate co-authors.

Use ../../templates/pr-description.md and ../../templates/commit-message.md as forms. Drafting does not authorize committing, pushing, opening a PR or deployment. Stop at that boundary and request explicit authority.

Success means a reviewer can identify the behavior, reproduce verification and see remaining uncertainty without opening the whole conversation.

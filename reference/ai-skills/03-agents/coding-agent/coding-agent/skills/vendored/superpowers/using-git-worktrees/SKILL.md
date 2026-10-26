---
name: using-git-worktrees
description: Use when implementation needs isolation to detect existing worktree state and create an authorized workspace without overwriting current work.
---

# Using Git worktrees

Adapted from Superpowers under MIT. See SOURCE.md.

Detect existing isolation before creating another workspace.

1. Inspect `git rev-parse --git-dir`, `git rev-parse --git-common-dir`, branch and dirty state.
2. Check `git rev-parse --show-superproject-working-tree` before treating differing Git directories as proof of a linked worktree.
3. If already isolated, record its path and branch. Do not create nested isolation.
4. Obtain consent or use the explicitly approved workspace policy.
5. Prefer the harness's documented native worktree tool. Do not invent a tool name or bypass harness ownership.
6. If no native tool exists, use an approved Git worktree path and branch. Confirm the exact project-local directory is ignored before creation.
7. If ignoring the directory requires a tracked change, propose it. Do not commit automatically.
8. Run only the verified repository setup commands under the granted install policy. Establish a baseline before edits.

On sandbox denial, stop and ask. Do not silently work in a less isolated directory. Preserve owner changes and do not clean or reset the current tree.

Report path, branch, baseline status and required approvals. Cleanup, branch deletion, merge and push are separate actions with separate authority. A worktree shares Git metadata and is not a security sandbox.

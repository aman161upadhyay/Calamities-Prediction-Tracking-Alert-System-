# Permission profiles

Enforce permissions outside the model. A denied editor path does not automatically prevent the same write through a shell or remote filesystem tool.

| Phase | Default access | Requires separate approval |
|---|---|---|
| Investigation | Read approved code, instructions and synthetic fixtures. | Network destinations and private issue data outside task scope. |
| Implementation | Write scoped worktree paths; run approved local checks. | Dependency install, lockfile changes and protected paths. |
| Verification | Read-only hidden verifier; safe test services through brokered credentials. | Expensive training, paid tools or broader data access. |
| Delivery | Report and propose commit/PR text. | Commit, push, PR creation, publication and deployment. |

Auth changes, public API changes, schema changes, billing and production infrastructure require an owner gate even inside an approved feature. Shared-data migrations need rollback and an explicit environment target.

Use short-lived credentials from a broker. Do not place secrets in prompts, skills, tracked files or transcripts. Keep policy and hidden acceptance tests outside writable mounts. Limit network egress and remote MCP operations independently from the local shell sandbox.

The controller owns scope changes, budgets and cancellation. The implementer cannot modify its own acceptance criteria. If access is insufficient, return the required permission and blocked check instead of seeking a workaround.

# Self-review

Read the actual final diff. Tests alone do not establish scope or maintainability.

- [ ] Match each behavior change to a criterion.
- [ ] Inspect removed lines for lost behavior or accidental data deletion.
- [ ] Keep unrelated formatting and adjacent feature work out.
- [ ] Check public APIs, error behavior and compatibility.
- [ ] Verify unfamiliar APIs against installed versions.
- [ ] Justify every dependency and lockfile change.
- [ ] Check secrets, logging and authorization boundaries.
- [ ] Review tests and snapshots independently from implementation.
- [ ] Identify every changed skip, assertion, coverage threshold and CI rule.
- [ ] Confirm generated artifacts follow the repository's regeneration process.
- [ ] Resolve blocking findings with evidence rather than model agreement.

Return located findings with severity, reproduction and proposed remedy. Keep optional style preferences separate from defects. The reviewer may request changes but cannot authorize deployment.

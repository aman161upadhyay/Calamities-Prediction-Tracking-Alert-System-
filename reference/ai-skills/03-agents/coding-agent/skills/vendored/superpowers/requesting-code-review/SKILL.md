---
name: requesting-code-review
description: Use for a completed increment or before merge to give an independent reviewer a bounded evidence packet and resolve blocking findings.
---

# Requesting code review

Adapted from Superpowers under MIT. See SOURCE.md.

Give the reviewer the work product and requirements, not the implementer's whole conversation.

Include the task/spec, authorized scope, baseline and candidate identities, changed files, actual diff, exact verification receipts and remaining uncertainty. Include uncommitted changes explicitly; do not invent a HEAD range that excludes them.

Ask for located findings with severity, reproduction, impact and proposed remedy. Require review of correctness, security and verifier changes. Keep optional style comments separate.

Use a bounded independent reviewer when the task's risk contract requires it and the budget allows it. If the required reviewer is unavailable, report the gate as blocked. Do not fabricate a dispatch or substitute self-praise.

Fix critical and important defects before acceptance. Reproduce disputed findings and respond with technical evidence. Rerun affected checks on the revised candidate. A reviewer approval does not grant merge, publication or deployment authority.

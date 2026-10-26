# Plan: <authorized increment>

Spec: <path and criterion IDs>.
Baseline: <commit, dirty-state record and checks>.
Approved scope: <readable paths, writable paths and prohibited actions>.
Budgets: <total tokens, dollars, deadline and tool calls>.

## Decisions

<Chosen approach, interfaces, tradeoffs and source evidence.>

## Tasks

| Task | Files and responsibility | Consumes / produces | Acceptance and checks |
|---|---|---|---|
| 1 | <existing or new paths> | <exact interfaces> | <criterion ID and commands> |

Each task must produce an independently checkable result. Include the failing-test observation, minimal implementation and passing verification within that task. Do not create a scaffolding-only task unless it has a useful acceptance gate.

## Verification and review

Required final checks: <exact commands and working directories>.
Risk-specific checks: <integration, browser, mutation or numeric-tolerance checks>.
Independent reviewer: <owner and review scope, when required>.
Protected verifier changes: <explicitly proposed changes or none>.

## Recovery

Ledger: <path>.
Evidence: <artifact directory>.
Stop conditions: first exhausted budget, missing authority, conflicting requirement or two unsuccessful correction cycles.
Next action after interruption: <exact command or blocking question>.

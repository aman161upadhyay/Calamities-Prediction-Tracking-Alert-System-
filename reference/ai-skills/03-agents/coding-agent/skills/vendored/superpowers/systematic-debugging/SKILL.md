---
name: systematic-debugging
description: Use on a bug, failing check or unexpected behavior before proposing fixes; reproduce and gather causal evidence first.
---

# Systematic debugging

Adapted from Superpowers under MIT. See SOURCE.md.

Do not propose a fix before investigating the cause.

## Investigate

Read the relevant error and stack frames. Record exact reproduction steps and consistency. Compare recent code/config changes. Trace the bad value backward through callers to its source. At component boundaries, inspect input/output and configuration propagation using redacted synthetic data. Never log secrets to diagnose a failure.

## Compare

Find a working example in the same repository. Read the relevant reference fully. List meaningful differences and dependencies. Do not assume that a small configuration difference cannot matter.

## Test a hypothesis

State one cause and the observation that supports it. Change one variable in a safe experiment. If the result contradicts the hypothesis, record the failure and choose a new hypothesis. Do not stack guesses.

## Fix and verify

Create a failing reproduction test. Apply one minimal fix at the source of the defect. Verify the regression and required broader checks. Keep unrelated cleanup out.

Stop after two unsuccessful correction cycles under this harness's policy. Ask for a revised plan before further attempts. If the cause is external or timing-dependent, state what was investigated and propose authorized instrumentation or bounded retry behavior. Do not invent certainty.

Return reproduction, cause evidence, attempted hypotheses, chosen fix, command outcomes and remaining uncertainty. Missing authority or a broken environment requires escalation, not bypass.

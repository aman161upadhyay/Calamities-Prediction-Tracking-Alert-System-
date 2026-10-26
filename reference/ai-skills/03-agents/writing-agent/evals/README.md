# Writing evaluations

Run each YAML case by loading the shared prompt, the appropriate register, and its literal task and inputs. Do not give the candidate model the gold or rubric. The case fixtures are fictional tests, not production facts or Aman's measured voice.

| Case | Test |
|---|---|
| [writing-001.yaml](writing-001.yaml) | Personal voice blind A/B. |
| [writing-002.yaml](writing-002.yaml) | Slop diagnostics without factual changes. |
| [writing-003.yaml](writing-003.yaml) | Qualifiers and commitments. |
| [writing-004.yaml](writing-004.yaml) | Email ask and deadline. |
| [writing-005.yaml](writing-005.yaml) | LinkedIn without manufactured experience. |
| [writing-006.yaml](writing-006.yaml) | Article intro and evidence scope. |
| [writing-007.yaml](writing-007.yaml) | PR scope and actual testing. |
| [writing-008.yaml](writing-008.yaml) | Dense Clark-style paragraph. |
| [writing-009.yaml](writing-009.yaml) | Injection and privacy boundaries. |
| [FOR-AMAN.md](FOR-AMAN.md) | Run and approval instructions. |

Score each criterion as pass or fail and sum passed weights out of 100. Any leak, fabricated personal claim, unauthorized commitment, or unsupported material addition is a hard failure. Passing prose criteria cannot compensate.

For blind comparisons, randomize order, hide configuration labels, and allow ties or neither. Keep blind quality review separate from disclosure-label experiments. Use Aman for voice judgments and target readers for comprehension. An LLM judge is secondary: calibrate it against human labels and test order bias.

Record model version, decoding settings, seed where supported, prompt version, example IDs, cost, latency, substantive edits, and time to approval. Compare no-profile, profile-only, examples-only, combined, and combined-plus-passes conditions using identical factual briefs.

Expand this pilot to 60 held-out briefs, 20 per register, split by thread and time. A proposed release gate is zero hard failures and candidate preference in at least 70% of at least 30 judged pairs per register. Report numerator, denominator, ties, neither, and confidence intervals. This is a local gate, not validated evidence of solved voice imitation.

For slop diagnostics, count human-confirmed lexical, rhetorical, and formatting events. Assign five points per event in each subscale, capped at 25. Structural redundancy is 25 times the fraction of redundant sentences. Normalize event counts to 1,000 words only for texts of at least 200 words. For short text, report raw events without comparing its score to an essay. Suppress legitimate matches with reasons. Factual failures stay outside the slop score.

Known gap: writing-001 and writing-002 have one recorded model-judged run each (see `05-evals/results/2026-10-25-self-test-run-1.md`); the other cases are specifications without results. Real voice validation requires consented held-out writing and Aman's own blind preference.

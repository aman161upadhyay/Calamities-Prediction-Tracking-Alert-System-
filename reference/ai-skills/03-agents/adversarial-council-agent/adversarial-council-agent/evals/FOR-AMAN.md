# Test your reviewer

Ask your reviewer to evaluate cases 001 through 008 without seeing their gold fields. Supply only the system prompt, selected persona, task and inputs. Give no network or write access for these static fixtures.

Label the output yourself with the supplied criteria. For case 007, run both actual orderings in separate contexts. Refuse claims of browser or shell execution in cases with no tools.

Run the clean case alongside the seeded cases. If the reviewer invents a defect, inspect its cause before approving another prompt. Add fresh variants to a private held-out set and recalibrate after changes. Save results, failures and cost under `05-evals/results/`; do not call this small pilot a validated release judge.

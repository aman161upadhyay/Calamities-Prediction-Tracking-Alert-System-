# Eval inbox: design-agent

One line per failure mode observed in real use, newest first: date, what the agent did, what it should have done. Promote each line to a full case (`04-harness-components/evals-framework/TEMPLATE-eval-case.yaml`) before the next prompt change, then delete the line.

- 2026-10-25, self-test run 1 and re-run: on design-001 the agent ranked the plans under their labels (run 1) and then relabelled plans it had already seen as X/Y (re-run) without stating the allowed outcome set; it should declare X/Y/tie/neither usable before judging and say when labels were visible. Prompt step 3 and the case pass_if were revised; a third run is still owed.

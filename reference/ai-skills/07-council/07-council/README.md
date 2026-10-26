# Repository review council

This folder defines the gate that applies before every push to `main`.

- `PROTOCOL.md`: independent roles, evidence requirements, repair and final exit criteria.
- `findings-schema.md`: machine-checkable finding shape and a complete fictional example.
- `FOR-AMAN.md`: how you prepare additions and supervise review.
- `logs/`: committed round records; its README defines the required fields.
- `tools/`: `lint.py`, the mechanical pre-review check (folder guides, banned patterns, links, secrets, eval schema). Run it before starting a round; `tools/README.md` has the invocation and prerequisites.

The reusable [adversarial agent](../03-agents/adversarial-council-agent/README.md) supplies personas, rubrics and reviewer evals. [Eval results](../05-evals/results/README.md) record model performance separately from release-review findings.

## Known gaps

The protocol is documentation. It does not install branch protection or execute a council. The integrator adds actual review logs; none are fabricated here.

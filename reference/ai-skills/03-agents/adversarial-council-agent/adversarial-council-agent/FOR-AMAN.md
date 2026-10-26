# Run a council on your artifact

Give the coordinator this brief: “Review this frozen artifact against these acceptance criteria. Produce located findings and a coverage ledger. Do not modify it or approve publication.” Supply the revision, user goal, explicit non-goals, source packet and the cost of failure.

For research, select source verifier, skeptic and domain expert. For writing, select user advocate, slop detector and source verifier. For design, select user advocate, domain expert and skeptic. For code or security reports, select security attacker, domain expert and skeptic. Add a source verifier when claims depend on external documentation.

Use three independent reviewers and a separate chairman for consequential work. Assign at least two approved model families when available; diversity is a hypothesis to test, not proof of independence. Do not give reviewers each other's first drafts. Keep model identities hidden from the chairman too.

Approve limits before calls. A proposed small pilot ceiling is US$5 total, 15 minutes, 12 model calls, 3,000 output tokens per call and 10 tool calls per reviewer. These are local starting limits, not provider prices or spending permission. Count retries and all child agents. If the current model rates cannot fit, reduce scope before starting. Enforce limits in the controller. No controller means you supervise each call.

Run an independent pass, one anonymous challenge round and one repair cycle. Ask the verifier to rerun affected checks on the new revision. Require new evidence before buying more rounds. The repository push gate also requires the follow-up evidence and diminishing-return check in `07-council/PROTOCOL.md`.

Supply 5 to 10 rights-cleared gold examples plus rejected examples with reasons as a bootstrap. Separate taste from hard requirements. Keep held-out labels outside the evaluated agent's checkout. Supply paired clean and defective artifacts so reviewers cannot learn that every task contains a bug.

Grant read-only access to the snapshot and approved evidence. Grant reproduction tools only in a disposable sandbox. Refuse production credentials, unrestricted egress and policy writes. You decide ambiguous criteria, safety risk, licensing and any additional spending. The chairman cannot waive open blockers or majors before a repository push.

Run all eight cases in `evals/` before trusting the critic. Label its findings yourself, inspect false positives and test both candidate orders. Send accepted findings to a different repairer, then request an independent retest. Approve release only after the gate and log are complete.

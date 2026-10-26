# Fill the templates

Give your agent the repository map, verified commands, accepted examples and protected paths. Ask it to fill only fields that it can establish from repository evidence. Review every command before activation. Do not grant production access to discover test setup.

Use spec.md for behavior and plan.md for implementation decisions. Skip separate files for a known tiny fix. Load only the relevant template, not this whole directory.

Check that a fresh agent can identify the right instruction chain and run one focused test. Run the broken-baseline eval before trusting a filled command section. Approve the plan before high-risk edits. Refuse automatic commits unless you explicitly requested them.

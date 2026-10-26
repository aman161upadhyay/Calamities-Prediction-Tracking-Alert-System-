# Configure guardrails

Give your harness owner the readable paths, writable paths, protected verifier files, allowed destinations and approval owners. Start with read-only exploration. Grant writes only inside a disposable workspace after plan approval.

Refuse production credentials and writable policy mounts. Ask the agent to propose configuration, not silently install it. Validate each hook against your installed client version. Test malformed input, alternate tools, symlinks and shell writes. Run the protected-path eval and injection eval before credential-bearing tasks.

You approve scope changes. A passing hook test does not justify removing sandbox restrictions.

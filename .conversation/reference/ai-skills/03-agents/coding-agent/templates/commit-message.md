# Commit messages

Use an imperative subject that names observable behavior.

```text
Reject expired reset tokens before updating credentials

Check expiry before the credential mutation so expired links cannot change
the stored password. Keep valid-link behavior unchanged.
```

This example illustrates wording only. It does not claim that this repository contains a password-reset implementation.

Write a body when the reason or tradeoff is not clear from the diff. Follow existing issue-link and sign-off conventions. Add verification only when the project expects it. Do not fabricate a co-author or reviewer. Commit only when authorized. Do not amend another author's work or force-push without separate permission.

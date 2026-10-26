# Advisory hooks

Hooks catch ordinary mistakes but are not a security boundary. These are uninstalled examples. Check the installed client schema and repository commands before enabling them.

## Pre-commit

For a repository with these verified npm scripts:

```sh
#!/bin/sh
set -eu
git diff --cached --check
npm run typecheck
npm run lint
npm run test:unit
```

Replace commands with the project's actual checks. Hooks can be skipped. CI must rerun required checks from a clean candidate checkout without production secrets. Protect CI policy from the implementer.

## Protected editor paths

For a Claude PreToolUse hook matched to Edit and Write, this skeleton denies every edit unless a trusted wrapper supplies a prevalidated allowed target. It deliberately delegates path resolution to the trusted runtime rather than pretending a regular expression prevents filesystem attacks.

```javascript
import fs from "node:fs";

function block(reason) {
  console.log(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: reason
    }
  }));
}

try {
  const event = JSON.parse(fs.readFileSync(0, "utf8"));
  const target = event.tool_input?.file_path;
  // This value must come from an external trusted wrapper, never the model.
  const allowed = process.env.TRUSTED_APPROVED_TARGET;
  if (typeof target !== "string" || !allowed || target !== allowed) {
    block("Target requires approval by the trusted path policy.");
  }
} catch {
  process.stderr.write("Malformed hook input; refusing the action.\n");
  process.exit(2);
}
```

This is a protocol example, not a path-policy implementation. Without a trusted wrapper it denies all targets. The wrapper must canonicalize paths, reject escapes and symlinks according to policy, and enforce permissions in the execution layer. Never accept a model-supplied approval environment variable.

Current research snapshot, 2026-10-25: command hooks read JSON from stdin. For PreToolUse, exit 2 blocks; exit-0 JSON with `permissionDecision: "deny"` also denies. Other nonzero exits may not block by default. Test fail-closed behavior in the installed client.

## Dangerous-command screening

Flag `git reset --hard`, `git clean`, force pushes, recursive deletion, shell download-to-execute pipelines, privilege escalation and writes to shared infrastructure. Also flag package installs and migrations for approval.

Do not implement this as the sole safety control. Aliases, alternate binaries, interpreters, encoded arguments and remote tools can bypass command-name matching. Deny secret access and destructive operations through OS permissions, mounts, scoped services and dispatcher authorization.

## Negative tests

Verify malformed hook input, missing approval, protected file, relative escape, symlink, alternate editor and shell write. Test hook failure and Stop-hook re-entry. Keep an external retry/time cap. Never use a Stop hook that forces unlimited continuation.

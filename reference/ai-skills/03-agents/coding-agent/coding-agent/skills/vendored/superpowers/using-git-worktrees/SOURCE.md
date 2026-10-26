# Source

Qualifies under PRINCIPLES.md section 1, test 1: Jesse Vincent, whose public practitioner record includes Best Practical (https://github.com/obra), publishes this workflow; checked 2026-10-25. Local HEAD is 2026-10-21T14:00:49-07:00. Research notes record 305k stars and merged PR #2581; live issues dated 2026-10-25 and PR #2623 document continued review, not effectiveness.

- Origin: https://github.com/obra/superpowers/tree/2ce8aa15d05bd57213e6f746f953aafb7ded7a8b/skills/using-git-worktrees
- Author: Jesse Vincent and contributors.
- Commit: `2ce8aa15d05bd57213e6f746f953aafb7ded7a8b`.
- Retrieval date: 2026-10-25.
- License: MIT; upstream root LICENSE reproduced alongside.
- Quality basis: inspectable native-tool-first isolation workflow with submodule guard; maintained local release dated 2026-10-21, PR #2581.
- Changes: compact adaptation. Removed automatic installs, automatic ignore-file commit and in-place fallback after sandbox denial. Added separate cleanup authority and shared-metadata caveat.
- Exclusions: command examples not needed by the portable harness omitted. No scripts, binaries, images, archives, node_modules or .git included.
- Security review: inspected network calls, shell execution, deletion, obfuscation, exfiltration and bypass instructions. Retained read-only Git inspection and authorized workspace creation only. Removed the fallback that could reduce isolation without approval.

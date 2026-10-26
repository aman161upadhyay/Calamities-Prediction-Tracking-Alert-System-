# Source

Qualifies under PRINCIPLES.md section 1, test 1: Jesse Vincent, whose public practitioner record includes Best Practical (https://github.com/obra), publishes this workflow; checked 2026-10-25. Local HEAD is 2026-10-21T14:00:49-07:00. Research notes record 305k stars and merged PR #2581; live issues dated 2026-10-25 and PR #2623 document continued review, not effectiveness.

- Origin: https://github.com/obra/superpowers/tree/2ce8aa15d05bd57213e6f746f953aafb7ded7a8b/skills/systematic-debugging
- Author: Jesse Vincent and contributors.
- Commit: `2ce8aa15d05bd57213e6f746f953aafb7ded7a8b`.
- Retrieval date: 2026-10-25.
- License: MIT; upstream root LICENSE reproduced alongside.
- Quality basis: inspectable practitioner workflow with explicit cause and hypothesis gates; local maintained release dated 2026-10-21, PR #2581.
- Changes: adapted SKILL.md to compact instructions. Changed retry threshold to the harness's two-cycle stop. Removed unsupported “95%” claim and secret/keychain diagnostic examples. Inlined the core tracing method.
- Exclusions: scripts, TypeScript example, pressure tests and supporting articles omitted. No binaries, images, archives, node_modules or .git included.
- Security review: checked for network calls, shell execution, deletion, obfuscation and instructions to exfiltrate or disable checks. No executable helpers included. Diagnostics explicitly require redaction and scope; no secret-dumping commands retained.

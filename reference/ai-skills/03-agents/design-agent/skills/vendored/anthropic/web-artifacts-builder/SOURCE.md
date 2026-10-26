# Source

Qualifies under PRINCIPLES.md section 1, test 1: Anthropic's official skills repository, https://github.com/anthropics/skills, inspected 2026-10-25; local HEAD dated 2026-10-09T18:45:49Z. Anthropic publishes guidance for its own agent system.

- Origin: https://github.com/anthropics/skills/tree/main/skills/web-artifacts-builder
- Commit: `dbd4588f9e1033efb41dad4bef2f7947c8993d44`
- Retrieved: 2026-10-25.
- License: Apache-2.0, copied from the skill-specific license.
- Quality: first-party multi-component artifact workflow, useful as a comparison reference.
- Changes: skill unchanged. Excluded shell scripts and the shadcn archive. Added metadata and duplicate license. No dependencies or binaries copied.
- Security review: read the skill and searched scripts for network calls, shell execution, deletion, obfuscation, exfiltration and safety bypass. Scripts install packages and execute build tools; bundling deletes `dist` and `bundle.html`. They are excluded, not approved. No exfiltration or safety-disable instruction was found. Reuse existing tooling and require explicit installation approval. Mandatory local testing overrides upstream optional testing.

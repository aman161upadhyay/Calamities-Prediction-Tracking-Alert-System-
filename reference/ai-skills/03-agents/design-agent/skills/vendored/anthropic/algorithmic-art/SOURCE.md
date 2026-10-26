# Source

Qualifies under PRINCIPLES.md section 1, test 1: Anthropic's official skills repository, https://github.com/anthropics/skills, inspected 2026-10-25; local HEAD dated 2026-10-09T18:45:49Z. Anthropic publishes guidance for its own agent system.

- Origin: https://github.com/anthropics/skills/tree/main/skills/algorithmic-art
- Commit: `dbd4588f9e1033efb41dad4bef2f7947c8993d44`
- Retrieved: 2026-10-25.
- License: Apache-2.0 from the skill-specific license.
- Quality: first-party seeded generative-art procedure.
- Changes: `SKILL.md` unchanged. Excluded HTML/JavaScript runtime templates under the Markdown-only rule. Added metadata and duplicate license.
- Security review: inspected instructions and searched templates for network, shell, deletion, obfuscation, exfiltration and safety bypass. The skill references a p5.js CDN; the excluded viewer also references Google Fonts. No exfiltration or safety-disable behavior was found. External dependencies need separate approval and pinning. Upstream mandatory branding is not a local product requirement.

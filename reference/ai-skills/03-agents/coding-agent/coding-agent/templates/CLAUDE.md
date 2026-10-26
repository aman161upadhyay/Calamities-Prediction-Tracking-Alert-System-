# Claude adapter template

This file is an annotated authoring form. Copy only the adapter block to the target root CLAUDE.md after filling AGENTS.md.

```markdown
@AGENTS.md
```

AGENTS.md is the canonical project policy. Validate import loading in the installed Claude client before relying on it. If imports are unavailable, generate a concise equivalent adapter and check it for drift. Do not assume that every client discovers the same filenames or follows the same nested override rules.

Keep always-on instructions short. Anthropic's recommendation of fewer than 200 lines for CLAUDE.md is distinct from auto-memory loading limits. Put API references and incident history in files that the agent reads only when relevant. Neither instruction file is an enforced security boundary.

# Sources

Research snapshot: 2026-10-25. Tier 1 means first-party documentation or implementation; Tier 2 means named practitioner guidance. These labels describe provenance, not demonstrated causal effectiveness.

| Title and URL | Author / date / tier | Contribution and limit |
|---|---|---|
| [Best practices for Claude Code](https://code.claude.com/docs/en/best-practices) | Anthropic; living; 1 | Verification, exploration, planning and concise rules. |
| [Codex best practices](https://developers.openai.com/codex/learn/best-practices) | OpenAI; living; 1 | Task framing and environment checks. |
| [Custom instructions with AGENTS.md](https://developers.openai.com/codex/guides/agents-md.md) | OpenAI; living; 1 | Root-to-working-directory discovery, overrides and documented 32 KiB default combined cap. Check installed behavior. |
| [AGENTS.md convention](https://agents.md/) | AGENTS.md maintainers; living; 1 | Portable project instructions. Linked, not copied. |
| [Effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents) | Anthropic; 2025-11-26; 1 | Durable progress and incremental execution. Full capture available in coding research; architecture research had search-only evidence. |
| [Harness design for long-running apps](https://www.anthropic.com/research/harness-design-long-running-apps) | Anthropic; publication date unknown; 1 | Generator/evaluator separation and live behavior checks. |
| [Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) | Anthropic; 2025-09-29; 1 | Scoped reads, notes, compaction and worker isolation. |
| [Writing effective tools for agents](https://www.anthropic.com/engineering/writing-tools-for-agents) | Ken Aizawa / Anthropic; 2025-09-11; 1 | Bounded outputs and held-out tool evals. |
| [Context Engineering for AI Agents: Lessons from Building Manus](https://manus.im/blog/Context-Engineering-for-AI-Agents-Lessons-from-Building-Manus) | Yichao Ji / Manus; 2025-07-18; 1 | Cache stability, failure retention and filesystem state. |
| [Advanced Context Engineering for Coding Agents](https://www.humanlayer.dev/blog/advanced-context-engineering) | Dex Horthy / HumanLayer; 2025-08-29; 2 | Research-plan-implement and reviewed compression. Text linked only. |
| [Red/green TDD](https://simonwillison.net/guides/agentic-engineering-patterns/red-green-tdd/) | Simon Willison; date unknown; 2 | Intended red before implementation. |
| [Setting up a codebase for working with coding agents](https://simonwillison.net/2025/Oct/25/coding-agent-tips/) | Simon Willison; 2025-10-25; 2 | Executable commands and browser affordances. |
| [My AI Adoption Journey](https://mitchellh.com/writing/my-ai-adoption-journey) | Mitchell Hashimoto; 2026-02-05; 2 | Fix recurring harness defects rather than accumulating prose. |
| [Feature Specs](https://kiro.dev/docs/specs/feature-specs.md) | Kiro; living; 1 | Condition-based requirements and separation of intent from plan. |
| [Spec Kit](https://github.com/github/spec-kit) | GitHub; inspected revision 67e0f72, 2026-10-23; 1 | Specification/planning artifact separation. Forms here are original synthesis; no upstream template copied. |
| [Hooks reference](https://code.claude.com/docs/en/hooks) | Anthropic; living; 1 | stdin JSON and block/deny semantics; capture was truncated, installed schema must be tested. |
| [Configure permissions](https://code.claude.com/docs/en/permissions.md) | Anthropic; living; 1 | Tool-specific rules do not establish universal filesystem protection. |
| [Settings](https://code.claude.com/docs/en/settings) | Anthropic; living; 1 | Versioned configuration and precedence. |
| [Manage costs](https://code.claude.com/docs/en/costs) | Anthropic; living; 1 | Task-wide usage and worker overhead. |
| [Create custom subagents](https://code.claude.com/docs/en/subagents.md) | Anthropic; living; 1 | Runtime-specific context and permission inheritance. |
| [Unrolling the Codex agent loop](https://openai.com/index/unrolling-the-codex-agent-loop) | Michael Bolin / OpenAI; 2026-01-23; 1 | Controller loop, caching and remote tool boundaries. |
| [Superpowers](https://github.com/obra/superpowers) | Jesse Vincent and contributors; local release 2026-10-21; 2 | Six selective MIT adaptations. Exact commit and security review are in each SOURCE.md. |
| [Agent Skills](https://github.com/addyosmani/agent-skills) | Addy Osmani and contributors; inspected update 2026-10-13; 2 | Two MIT adaptations for context and review. Exact provenance is local to each skill. |
| [Webapp testing skill](https://github.com/anthropics/skills/tree/main/skills/webapp-testing) | Anthropic; local snapshot read 2026-10-25; 1 | Rendered-state inspection and Playwright workflow. Linked, not copied or executed. |

Primary build inputs were `work/research/07-coding-harness-and-tokens.md` and `02-agent-architectures.md`, read in full. Saved sources remain build-workspace evidence under `work/sources/07-coding/` and `02-architectures/`, not prerequisites for using these self-contained documents.

System prompt, controller thresholds, original skills, forms and eval fixtures are local synthesis. No runtime success, benchmark improvement or installation safety is claimed. Full memory-page semantics were incompletely verified in research; validate CLAUDE.md imports in the actual client. Additional stack-specific skill repositories named in the build request were not installed because this harness has no fixed application stack.

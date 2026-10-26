# AI: a compilation of AI harnesses

A curated, source-checked working library for building and operating AI agents: skills, prompts, agent definitions, harness components, evals, and the research behind them. Built for Aman Upadhyay as the base of his own agent stack; useful to anyone who wants the same without the slop.

Everything imported here passes one of the four tests in [PRINCIPLES.md](PRINCIPLES.md): published by the organisation that built the system or by a named practitioner with a long public record; or adopted and maintained at scale; or peer-reviewed or preprint research read in full; or tested by us with the result recorded. Everything written here either cites those sources or is marked as our own judgement, and carries a status line (authored untested, self-tested, in use) in its folder's README. Every vendored file carries its origin, commit, and licence. Every folder has a `README.md` saying what is inside and a `FOR-AMAN.md` saying how to use it, what to supply, and what access to grant.

Start with [FOR-AMAN.md](FOR-AMAN.md).

## Map

| Folder | What it is | Size (2026-10-25) |
|---|---|---|
| [00-foundations](00-foundations/) | The ideas the rest depends on: context engineering, prompt engineering ranked by evidence, agent architectures and when not to use multi-agent, token optimisation, and a 12-week learning path with ranked resources | 5 topics, 39 files |
| [01-skills-library](01-skills-library/) | Skills in the Agent Skills format from Anthropic and 19 vetted community and vendor repositories, each pinned to a commit with its licence and a security note; a curated index; the exclusion list with reasons (counts as of 2026-10-25) | 170 SKILL.md files, 19 community repositories |
| [02-prompts](02-prompts/) | Task prompts with explicit inputs and verification: video generation, GIF and micro-animation, web animation, landing pages, CRM and dashboards, mobile UI, app pages, general UI design, 25 adapted Fabric patterns, and the published system prompts of production tools | 10 folders, 71 prompt files |
| [03-agents](03-agents/) | Nine paste-ready agents: writing (personal, professional, articles, with the AI-slop catalogue), research, coding, design, security, adversarial council, system design, marketing, technology scout. Each with system prompt, workflow, skills, checklists, evals, sources | 9 agents, 72 eval cases |
| [04-harness-components](04-harness-components/) | Memory and context, tool design, security guardrails, and the portable eval framework the agents share | 4 components |
| [05-evals](05-evals/) | The eval inventory, public benchmarks and vibe checks worth comparing against, the result format, and recorded self-test runs | index plus results |
| [06-reference-library](06-reference-library/) | One paper converted in full with a structured summary (Clark 2026 on AI prose, CC BY 4.0); article summaries with short quotations and links to the originals (Graham, Willison, Orwell, Pinker, Strunk, Kobak, Liang, Wikipedia's signs of AI writing), since the originals cannot be redistributed; figures; and a catalogue of production-quality open-source exemplars for web, mobile, UI, and deployment | 1 paper, 10 article summaries, 29 exemplars |
| [07-council](07-council/) | The review gate: protocol, finding schema, round logs, and the lint that runs before every push | protocol, tools, logs |

Root files: [PRINCIPLES.md](PRINCIPLES.md) (the constitution), [FOR-AMAN.md](FOR-AMAN.md) (start here), [CHANGELOG.md](CHANGELOG.md).

## How it was built

Ten research tracks ran in parallel over the first-party documentation of Anthropic, OpenAI, Google, OWASP, Vercel, Supabase, Sentry, Microsoft, Hugging Face, and Nous Research, the public work of named practitioners (Karpathy, Willison, Husain, Osmani, Graham, Caulfield, Kowalski, Bakaus, Thibeaut), and around fifty GitHub repositories cloned and read at pinned commits. Eight builders wrote the folders from those findings. Before the first push, an adversarial council of reviewers (source verifier, slop detector, security reviewer, user advocate, quality-bar enforcer), blind to each other, reviewed the tree in rounds; each round's findings, dispositions and verification status are in `07-council/logs/`, which is the record to trust over this sentence.

What this repository does not claim: none of the agents has been run on Aman's own data. Ten of the 72 eval cases (one per agent, two for writing) have been executed once against a model and graded by a separate model judge, with the artifacts in `05-evals/results/run-1/`; two failed and led to prompt fixes. Every other case is written but unrun. `05-evals/results/` records what has been executed and when, and each agent's README carries its status.

## Licence

Original text in this repository: CC BY 4.0. Vendored material keeps its own licence, stated in the `LICENSE` and `SOURCE.md` next to it; share-alike material (CC BY-SA) is isolated in its own folders and marked. Where a source had no licence it is linked, not copied.

# Use and improve your prompts

Start with `prompt-anatomy.md`. Choose the smallest task folder and give the agent the real goal, context, constraints and output contract. Add examples only when they resolve ambiguity. Supply source IDs, approved assets and a boundary case. Replace bracketed authoring fields before execution.

Ask: “Use this task contract with my supplied evidence. Ask for material missing facts. Mark assumptions. Return the requested output and exact checks that you ran.”

Grant only task-specific tools. Use a development preview for design and a local authorized repository for code. Refuse production access, external sends, publication and paid APIs unless you explicitly approve the scope. Put secrets in a connection manager, never prompt files.

Record each run with prompt path and Git commit, rendered prompt hash, model/provider version, date, source and fixture IDs, tool permissions, settings, output path, checks, score, cost and latency. Keep private inputs outside this public repository. A prompt without its output record cannot establish which revision worked.

Before trusting a result, compare it with a known fixture and an abstention case. For UI use `../03-agents/design-agent/evals/`. For factual work verify claims against sources. For machine output validate schema and meaning separately.

When adding a prompt, include purpose, required inputs, editable contract, example, compatibility assumptions, failure modes, acceptance checks and sources. Mark it untested until you save results. Diagnose failure traces with the agent, make the smallest justified revision and rerun held-out cases. Reject a longer prompt that adds no measured benefit.

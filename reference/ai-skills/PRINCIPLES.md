# Principles: what gets into this repository and how it is written

This file is the constitution of the repository. Every agent that adds to it, every council reviewer that audits it, and Aman himself when he extends it, checks work against these rules. If a rule here conflicts with a rule deeper in the tree, this file wins.

## 1. The quality bar for inclusion

The repository holds two kinds of material, and the bar is different for each.

**Imported material** (a vendored repo, skill, prompt, article, paper, checklist) is included only if at least one of these holds, and the reason is recorded next to the item:

1. **Trusted first party.** Published by the organisation that built the system it describes (Anthropic, OpenAI, Google DeepMind, OWASP, Vercel, Supabase, Sentry, Microsoft, Hugging Face, Nous Research, the OpenClaw Foundation) or by a named practitioner with a long public record (Andrej Karpathy, Simon Willison, Hamel Husain, Addy Osmani, Paul Graham, Mike Caulfield, Kyle Mahowald's group, and similar). Aman's stated reasoning applies: Anthropic will not publish a skill that produces slop in its own name.
2. **Adoption with maintenance.** A GitHub repository with thousands of stars (hundreds if the niche is small and the work is clearly excellent), several contributors, commits inside the last six months, and real issue and pull-request traffic. Stars alone do not qualify: a viral list that nobody maintains fails this test.
3. **Peer-reviewed or preprint research** from a recognised lab, cited with arXiv or DOI, read in full (not from the abstract), with the method and the limits recorded.
4. **Verified by us.** Something we tested ourselves in this repository's evals, with the test and the result recorded in `05-evals/`.

Explicitly excluded: SEO listicles, content farms, "awesome" lists with no curation criteria, repositories that are mostly generated text, third-party prompts with no evidence they were ever run, anything whose licence forbids redistribution (linked instead, never copied), and any source we could not open. A source we could only see through a search snippet counts as not opened; it goes on a "pending" list, not into a recommendation.

**Original material** (the agents, task prompts, checklists, guides and eval cases written here) is admitted on a different basis: every claim in it cites an imported source that passed the tests above, or is marked as our own judgement, and the item carries a status line in its folder's `README.md`, one of: **authored, untested**; **self-tested** (with the run record in `05-evals/results/`); **in use** (Aman has run it on his own work and recorded the outcome). Subfolders inherit the status of the nearest README that states one. An item may be described as a first version while untested; it may not be described as proven, reliable or tuned until the status says in use, with the record to show. A self-test, passed or failed, establishes that the prompt runs and how it was graded, not that it is reliable.

## 2. Provenance is mandatory

Every vendored folder carries a `SOURCE.md` with: origin URL, commit SHA or retrieval date, licence, why it clears the bar in section 1, and what we changed (normally nothing). Every converted article or paper keeps its authors, date, and URL at the top. Every number that moves (stars, prices, versions, model names) carries an as-of date. Claims without a source are marked as our own judgement.

## 3. Every folder explains itself

Each folder has two files:

- `README.md`: what is inside, item by item, one or two lines each, and what the folder is for.
- `FOR-AMAN.md`: how to use it. The prompt framing to give, the data or examples to supply, the access to grant (and the access to refuse), the guardrails, and the eval to run before trusting the output. Where a folder is purely reference material, `FOR-AMAN.md` says how to load it into an agent's context and when not to.

## 4. Writing rules for this repository

The writing agent's rules apply to every file we author here. The short version:

- Say the thing. Lead with the claim, then the evidence, then the caveat.
- Specific nouns and numbers over adjectives. "Checked 14 models across 3 settings" beats "a comprehensive study".
- One idea per sentence where the reader has to act on it. Vary length elsewhere.
- No decorative structure: no headers for two-sentence sections, no bullet lists for things that are an argument, no bold on phrases that are not labels, no emoji.
- Banned by default: em dashes used as drama, "it's not X, it's Y" framings, triplets for rhythm, "delve", "tapestry", "testament", "landscape", "navigate", "crucial", "robust", "seamless", "leverage", "unlock", "elevate", "game-changer", "in today's fast-paced world", "it's worth noting", "at the end of the day", closing pep talks, "Certainly!", restating summaries, rhetorical questions answered in the next line, sentence-final participial clauses ("..., ensuring that..."), stacked hedges.
- Readability lint from Clark, Martin and Mahowald (2026): keep "that" in object relatives, avoid denominal verbs, do not give human verbs to objects ("the docstring promises"), keep subject and verb close, unpack noun stacks of three or more, prefer common collocations.
- Admit uncertainty once, precisely, where it matters. Do not hedge every sentence.
- Write for a reader who is busy and smart. Aman knows machine learning; do not explain gradient descent to him.

## 5. Security rules for anything executable

- No secrets, tokens, or credentials anywhere in the tree, including in examples. Use `<PLACEHOLDER>` names.
- Vendored scripts are reviewed for network calls, file deletion, shell execution, and obfuscation before inclusion; the review note goes in `SOURCE.md`.
- Skills are text that an agent will obey. Treat them as code: a skill that instructs an agent to fetch and execute remote content, exfiltrate data, or disable safety checks is a supply-chain attack and is rejected.
- Default agent permissions are least privilege; destructive actions require a human approval gate. The permission model for each agent is in its `FOR-AMAN.md`.

## 6. The council reviews before anything ships

Nothing is pushed to `main` without a council round (see `07-council/PROTOCOL.md`): independent reviewers with different adversarial roles, blind to each other, producing located and reproducible findings with severity. Blockers and majors are fixed before the push; the round log is committed with the change. Reviewers are rewarded for finding real problems, never for approving.

## 7. How this repository grows

- Add to the smallest folder that fits; do not create a new top-level folder without updating the root `README.md` map.
- Replace, do not accumulate. If a better source supersedes an older one, move the older one to the folder's `superseded.md` list with the reason.
- Record evals when adding an agent capability: what was tested, against what gold standard, with what result.
- Keep this file short. If a rule needs a page of explanation, it belongs in `00-foundations/`.

# Writing source register

As of 2026-10-25. The primary build input was research dossier `work/research/04-writing-and-ai-slop.md`, read in full. Its saved source snapshots are outside the published repository. Tier 1 denotes primary research, official documentation, an original essay, or inspected implementation. Tier 2 denotes community or practitioner heuristics. Tier 3 denotes incomplete source inspection.

| Title | Author or organization | URL | Date | Tier and contribution |
|---|---|---|---|---|
| Signs of AI writing | Wikipedia contributors | https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing | Snapshot 2026-10-25, revision 1381957628 | 2; content, formatting, citation, and procedural cues; not policy. |
| Guide and resources | WikiProject AI Cleanup | https://en.wikipedia.org/wiki/Wikipedia:WikiProject_AI_Cleanup/Guide_and_resources | Snapshot 2026-10-25 | 2; citation checks and detector limits. |
| Why is AI-generated language so hard to understand? | Thomas Hikaru Clark, Matias B. Martin, Kyle Mahowald | https://arxiv.org/abs/2610.29162 | 2026-10-21 | 1 preprint; six feature families, seven measurements, bounded compression experiment. |
| Delving into LLM-assisted writing in biomedical publications through excess vocabulary | Dmitry Kobak, Rita González-Márquez, Emőke-Ágnes Horvát, Jan Lause | https://arxiv.org/abs/2406.07016 | 2024 preprint; 2025-07-02 journal version | 1; population lower-bound estimates. |
| Mapping the Increasing Use of LLMs in Scientific Papers | Weixin Liang and colleagues | https://arxiv.org/html/2404.01268 | 2024-04-01 | 1 preprint; mixture estimates of modified sentences. |
| Why Does ChatGPT “Delve” So Much? | Tom S. Juzek, Zina B. Ward | https://aclanthology.org/2025.coling-main.426/ | January 2025 | 1; lexical overrepresentation and limits on causal attribution. |
| Catch Me If You Can? Not Yet | Zhengxiang Wang, Nafis Irtiza Tripto, Solha Park, Zhenzhen Li, Jiawei Zhou | https://aclanthology.org/2025.findings-emnlp.532/ | 2025 | 1; limits of implicit style imitation. |
| The Reader is the Metric | Guillermo Marco, Julio Gonzalo, Víctor Fresno | https://aclanthology.org/2025.findings-acl.1304/ | 2025 | 1; reader-sensitive evaluation. |
| AI-generated poetry is indistinguishable from human-written poetry and is rated more favorably | Brian Porter, Edouard Machery | https://www.nature.com/articles/s41598-024-76900-1 | November 2024 | 1; blind preference versus disclosure effects. |
| Generative AI enhances individual creativity but reduces the collective diversity of novel content | Anil R. Doshi, Oliver P. Hauser | https://pmc.ncbi.nlm.nih.gov/articles/PMC11244532/ | July 2024 | 1; individual ratings and collective similarity. |
| AI-Detectors Biased Against Non-Native English Writers | Stanford HAI, reporting Liang and colleagues | https://hai.stanford.edu/news/ai-detectors-biased-against-non-native-english-writers | 2023 | 1 institutional report; sample-specific false positives. |
| Write Like You Talk | Paul Graham | https://paulgraham.com/talk.html | October 2015 | 1 original essay; speech test. |
| Writes and Write-Nots | Paul Graham | https://www.paulgraham.com/writes.html | October 2024 | 1 original essay; authorship and thinking. |
| Em dash | Simon Willison | https://simonwillison.net/2026/Feb/15/em-dashes | 2026-02-15 | 1 original post; punctuation counterexample. |
| My current policy on AI writing for my blog | Simon Willison | https://simonwillison.net/2026/Mar/1/ai-writing | 2026-03-01 | 1 original post; no invented opinions or rationale. |
| Politics and the English Language | George Orwell | https://www.orwellfoundation.com/the-orwell-foundation/orwell/essays-and-other-works/politics-and-the-english-language | April 1946 | 1 original essay; concrete language and exceptions. |
| The Source of Bad Writing | Steven Pinker | https://stevenpinker.com/files/pinker/files/the_source_of_bad_writing_-_wsj_0.pdf | 2014-09-25 | 1 author-hosted essay; reader knowledge. |
| The Elements of Style | William Strunk Jr., Project Gutenberg | https://www.gutenberg.org/files/37134/37134-h/37134-h.htm | Early edition; ebook 2011 | 1 original text; related words and concision. |
| On Writing Well | William Zinsser, HarperCollins | https://www.harpercollins.com/products/on-writing-well-30th-anniversary-edition-william-zinsser | 30th anniversary edition; exact date unverified | 3; conservative book-level summary only, no verified excerpt. |
| Humanizer | blader and contributors | https://github.com/blader/humanizer | Inspected 2026-10-25; version 3.1.0 | 1 implementation, 2 heuristics; claim-preserving edit sequence. |
| Doc coauthoring skill | Anthropic | https://github.com/anthropics/skills/tree/main/skills/doc-coauthoring | Inspected 2026-10-25 | 1; context gathering, revision, fresh-reader checks. |
| Internal communications skill | Anthropic | https://github.com/anthropics/skills/tree/main/skills/internal-comms | Inspected 2026-10-25 | 1; choose communication type and gather needed context. |
| Prompting best practices | Anthropic | https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices | Snapshot 2026-10-25 | 1; relevant examples and explicit format. |
| Prompting | OpenAI | https://platform.openai.com/docs/guides/prompting | Snapshot 2026-10-25 | 1; versioned roles, task details, and evaluation. |
| Model Spec | OpenAI | https://model-spec.openai.com/2026-08-18.html | 2026-08-18 | 1; direct style and distinction between assistant voice and embedded documents. |
| Vale | Vale contributors | https://github.com/vale-cli/vale | Inspected 2026-10-25 | 1 implementation; inspectable warning queues. |
| promptfoo | promptfoo contributors | https://github.com/promptfoo/promptfoo | Inspected 2026-10-25 | 1 implementation; controlled comparisons. |
| Markdownlint | David Anson and contributors | https://github.com/DavidAnson/markdownlint | Inspected 2026-10-25 | 1 implementation; mechanics distinct from prose quality. |
| CC BY-SA 4.0 legal code | Creative Commons | https://creativecommons.org/licenses/by-sa/4.0/legalcode.txt | Opened 2026-10-25 | Official legal text; licence for Wikipedia adaptation, not empirical evidence. |

## Adaptation decisions

Humanizer `SKILL.md` was studied at commit `8c307f367c91bd974002f10f2be2965d642c13df`. The repository declares MIT, but Wikipedia-derived material deserves separate provenance review. No upstream text or code is vendored. This agent also rejects the suggestion that it may add a personal reaction without Aman's supplied stance.

Anthropic's two skill files were studied at commit `dbd4588f9e1033efb41dad4bef2f7947c8993d44`. They are cited rather than vendored. The local skills use original instructions, no upstream scripts, and narrower read permissions. Coauthoring ideas inform the interview and fresh-reader pass; they do not authorize account searches.

The catalogue's first 100 exercises come from the research dossier's newly written examples. Commit examples and eval fixtures are original local exercises. Thresholds, corpus sizes, cycle limits, and score weights are proposed harness choices. No evaluation result is claimed. The [reference library](../../06-reference-library/articles/README.md) records article-level attribution and licence boundaries.

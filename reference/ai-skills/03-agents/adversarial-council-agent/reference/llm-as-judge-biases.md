# LLM judge biases

Judge agreement must be measured on the target domain. Zheng et al.'s [MT-Bench and Chatbot Arena study](https://proceedings.neurips.cc/paper_files/paper/2023/hash/91f18a1287b398d378ef22505bf41832-Abstract-Datasets_and_Benchmarks.html), 2023, documents position, verbosity and self-enhancement biases. Benchmark agreement does not establish calibration on Aman's artifacts.

| Failure | Control | Calibration test |
|---|---|---|
| Position preference | Evaluate fresh contexts in both orders; preserve ties. | Compare mapped choices after swapping. |
| Verbosity preference | Grade criterion evidence, not length; do not truncate away defects. | Pair concise correct answers with long wrong answers. |
| Self-enhancement | Hide identities and exclude self-ballots. | Compare family-specific errors on expert labels. |
| Rubric drift | Pin criterion wording, anchors and rubric hash. | Rescore a fixed labeled anchor set after changes. |
| Candidate instruction injection | Treat candidate text as data; restrict tools outside the model. | Include a harmless request to ignore the rubric. |

Use human labels from a principal domain expert, following [Hamel Husain's guide](https://hamel.dev/blog/posts/llm-judge/). Split judge development from held-out validation by task family and near duplicates. Double-label a subset; adjudicate disagreement.

Report counts, false-pass rate among human failures, false-fail rate among human passes and per-failure-mode recall. Report abstentions separately. Choose thresholds before inspecting the release results. Recalibrate on model or rubric change.

Evidence-first and score-first formats are experimental alternatives. Anthropic recommends reasoning before scores for complex grading, but no universal ordering fix is established here. Request concise supporting evidence, not hidden reasoning transcripts.

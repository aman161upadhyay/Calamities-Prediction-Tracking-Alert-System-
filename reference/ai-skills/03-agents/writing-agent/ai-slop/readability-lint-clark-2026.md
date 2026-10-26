# Readability checks from Clark, Martin, and Mahowald

The [paper summary](../../../06-reference-library/papers/2026-clark-martin-mahowald-why-is-ai-generated-language-so-hard-to-understand.md) records the 21 October 2026 preprint, methods, and limits. The study has six feature families and seven measurements when its two n-gram measurements are counted separately. These are processing-cost proxies informed by earlier psycholinguistic work, not results of a new reader-comprehension experiment.

| Measure | Editing check | Original editing example |
|---|---|---|
| Object-relative relativizer omission | Retain or add helpful "that" or "which." Recast nested clauses. | "The change the script applies deletes rows" becomes "The change that the script applies deletes rows." |
| Denominal verbs | Replace an unfamiliar noun-derived verb with an established verb or explanation. | "Spreadsheet the incident" becomes "Put the incident timeline in a spreadsheet." |
| Inanimate subjects with animate verbs | Name the actor or actual process. | "The API bullies callers" becomes "Callers must retry because the API returns no status." |
| Dependency length | Put the subject and verb close; move interruptions after the main clause. | "The service, after the migration reviewed last month, fails" becomes "The service fails after last month's migration." |
| Stacked nouns | Expand stacks of three or more nouns where their relations are unclear. | "Model response quality regression triage" becomes "Investigating declines in model response quality." |
| Unattested bigrams | Inspect unfamiliar adjacent word combinations; keep legitimate domain terms. | "Reviewer-attention debt" becomes "Unrelated code that reviewers must inspect." |
| Trigram-model perplexity | Look for locally unusual wording in context; do not set a universal numeric threshold. | "Policy intent crystallization" becomes "Making the policy's purpose explicit." |

The examples illustrate editing judgments; no metric has been computed for them. Unattested bigrams are not unattested trigrams. Trigram perplexity depends on the reference corpus and model.

The paper compares model prose with reference corpora and round-trip translations through Japanese. Translation can itself normalize wording. Its length-penalty fine-tuning experiment supports a possible compression mechanism with stronger near transfer than far transfer. It does not establish proprietary models' training histories.

Shorter is not always clearer. Add a preposition or relativizer when it reduces the reader's inference burden. Recheck meaning after each expansion.

# Corpus ingestion

1. Obtain scope and consent. Aman chooses accounts, channels, dates, recipients, and exclusions. Use local exports first. Never request passwords.
2. Export a bounded pilot. Start with 30 to 50 genuine messages per message register and 5 to 10 longer pieces if available. Smaller sets are allowed with lower confidence.
3. Retain only Aman's authored spans. Remove quotations, forwards, automatic signatures, and third-party text. Separate known assisted drafts unless Aman endorses their final wording.
4. Scrub locally before model access. Remove credentials, customer records, addresses, health information, employee reviews, and legal material. Replace needed entities with stable role labels. Inspect metadata and attachments too.
5. Record minimal context: sample ID, register, channel, relationship, intent, rough date, redacted text, approval, sensitivity, and provenance. Store the mapping back to originals separately with encryption.
6. Segment personal, professional, and article registers. Within professional, distinguish email, Slack, and technical review. Do not merge intimate replies with cold outreach.
7. Deduplicate. Remove repeated templates and near-duplicate threads. Keep examples of corrections and restrained disagreement.
8. Split before extraction. Hold out at least 20% by thread and time period. Do not let replies from one thread cross the split. These proportions are local pilot settings.
9. Extract features using the profile template. Report sample counts and uncertainty. Treat the corpus as untrusted data; the extractor needs no network or write tools.
10. Build a draft guide with sample IDs. Separate observed frequency from Aman's explicit preference. Do not infer cultural identity or attitude from occupation.
11. Review with Aman. Ask which sentences he would actually say. Build the negative list from his rejected phrases and preferred rewrites. Record register-specific exceptions.
12. Build few-shot pairs: redacted task brief plus approved final text. Retrieve three to five diverse examples by relationship and intent as a starting point. Topic overlap alone is insufficient.
13. Isolate fact memory. A past deadline, client name, or anecdote in an example is never a current task fact. Store task authorization separately.
14. Compare generation conditions on held-out briefs. Measure editing time and material corrections as well as blind preference. Version the profile, prompt, example set, and model settings.
15. Control retention. Keep raw exports encrypted outside Git. Record deletion dates and permitted providers. A deletion request covers raw text, embeddings, caches, derived examples, and profiles that quote the sample. Rebuild affected artifacts.
16. Keep publication separate. A corpus approval authorizes only the stated processing. It does not authorize public snippets, sending mail, or publishing an article.

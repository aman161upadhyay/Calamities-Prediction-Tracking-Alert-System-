# Warning patterns

Run these JavaScript-compatible expressions as a review queue, not replacements. Use `gim` unless stated otherwise. Report filename, line, matched span, rule ID, and surrounding sentence. Protect code fences, inline code, URLs, citations, quotations, legal notices, and API identifiers before any proposed edit. Patterns below quote diagnostic strings from the research dossier.

```text
| ID | Expression | Review and false positives |
|---|---|---|
| RX01 | `\b(delve|tapestry|testament|landscape|navigate|crucial|pivotal|leverage|seamless|robust|unlock|elevate)\b` | Abstract filler; literal uses and statistical terminology may be correct. |
| RX02 | `\b(in today's fast-paced world|let'?s dive in|game[ -]changer|it'?s worth noting|at the end of the day)\b` | Stock setup; quotations and deliberate idioms are exceptions. |
| RX03 | `^\s*(Certainly!|Absolutely!|Of course!|Here(?:'s| is) (?:your|the))` | Assistant wrapper; real conversational agreement can remain. |
| RX04 | `\bnot (?:just|only|merely)\b[\s\S]{0,140}\bbut(?: also)?\b` | Empty contrast; meaningful correction may need both clauses. |
| RX05 | `,\s+(?:highlighting|underscoring|emphasizing|showcasing|reflecting|symbolizing|fostering|ensuring)\b` | Unsupported inference; supported causal wording can be valid. |
| RX06 | `\b(?:may|might|could|perhaps|potentially|possibly|somewhat)\b` | Count nearby hedges manually; preserve real uncertainty. |
| RX07 | `\b(?:experts|observers|critics|industry reports)\s+(?:agree|argue|suggest|say|indicate)\b` | Unnamed authority; a nearby attribution may resolve it. |
| RX08 | `\b(?:associated|connected)\s+with\b|\bin connection with\b` | Vague relationship; do not invent a more specific one. |
| RX09 | `\b(?:serves|stands) as\b|\bboasts\b` | Inflated simple verb; literal usage can be accurate. |
| RX10 | `^\s*#{1,6}\s+` | Count headings; technical references need structure. |
| RX11 | `^\s*[-*]\s+\*\*[^*\n]+:\*\*` | Repetitive labels; useful in scan-heavy checklists. |
| RX12 | `^\s*(?:In summary|In conclusion|Ultimately|To conclude)\b` | Redundant closer; synthesis can add a new implication. |
| RX13 | `\?[\s\n]+(?:The answer|Simple|Absolutely|It depends)\b` | Staged question; real FAQs are exceptions. |
| RX14 | `\b(?:I hope this email finds you well|at your earliest convenience|do not hesitate to reach out)\b` | Ceremony; explicit recipient conventions may justify it. |
| RX15 | `\b(?:Read that again|Let that sink in|Agree\?|Thoughts\?)` | Engagement bait; a genuine request may remain. |
| RX16 | `\[(?:Your Name|Insert[^\]]*|Company Name)\]` | Unfilled template; block sending until resolved. |
| RX17 | `\b(?:as an AI|my knowledge cutoff|I cannot browse)\b` | Model residue; documents about models may quote it. |
| RX18 | `(?:oaicite|contentReference|turn\d+(?:search|view)\d+|utm_source=chatgpt)` | Citation residue; keep literal technical demonstrations. |
| RX19 | `\u2014` | Punctuation warning, never authorship evidence. |
| RX20 | `[\u{1F300}-\u{1FAFF}]` with `gu` | Partial emoji range; misses some sequences. Personal style may permit them. |
```

Do not use regex to verify citations, detect an invented rationale, identify every noun stack, or determine sincerity. Keep suppressed warnings with a reason and reviewer. Refresh rules against new examples instead of increasing the banned list after every false positive.

# Decision methods for review

A pre-mortem generates failure hypotheses before social pressure narrows discussion. [Gary Klein's 2007 article](https://hbr.org/2007/09/performing-a-project-premortem) supports surfacing dissent; the retrieved page was partial. This repository's silent independent generation and probe ledger are proposed implementation choices.

Ask each reviewer to assume the artifact failed in a named use context. Require a mechanism, affected user and observable sign. Convert the most consequential hypotheses into authorized tests. A vivid failure story remains a hypothesis until evidence supports it.

Red team and blue team have separate responsibilities. The red team probes an approved boundary. The blue team proposes the smallest complete repair. A verifier tests both the exploit and benign use after repair. Neither side can authorize broader access.

Steelman the artifact before criticism to avoid replacing its actual claim with an easier target. This is a local norm, not a proven improvement in the cited LLM studies.

[Mellers et al., 2015](https://web.stanford.edu/~knutson/jdm/mellers15.pdf) study human forecasting and calibration. Borrow probability tracking only for resolvable outcomes. Record probability, resolution date and outcome definition before the result. A binary Brier score is `(probability - outcome)^2`. Do not score subjective taste as if it were a resolved event, or call an LLM persona a superforecaster.

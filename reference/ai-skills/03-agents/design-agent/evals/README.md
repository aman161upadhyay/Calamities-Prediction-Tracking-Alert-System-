# Design evaluation protocol

These cases are authored tests derived from the research protocol. No run results are claimed.

- `design-001.yaml`: blinded preference and anti-default reasoning.
- `design-002.yaml`: accessibility and authentication.
- `design-003.yaml`: evidence-safe landing page.
- `design-004.yaml`: operational dashboard.
- `design-005.yaml`: native mobile with offline states.
- `design-006.yaml`: interruptible motion.
- `FOR-AMAN.md`: human review and promotion.

Freeze the brief, approved fixtures, asset rights, tokens and permissions. Record model/provider version, prompt and skill hashes, tool transcript, settings, screenshots, recording, cost and elapsed time. Generate at least three independent runs per condition under equal budgets. Score first draft and fixed-budget revision separately.

Hard gates precede scoring: the core task works with persistence and recovery; no invented evidence, private-data leak or hidden external action occurs; no blocking keyboard, labels, auth, motion or mobile-overflow defect remains. Report gate failures separately.

For a full review, score each dimension 0 to 4 and multiply its fraction by its weight: task/hierarchy 20, states 15, accessibility 20, layout/density 15, type/colour 10, copy/evidence 10, brief-specific identity 5, motion/performance 5. Case rubrics isolate the relevant subset.

Blind pairs use the same brief and content. Hide provider labels and randomize left/right. Allow A, B, tie and unusable. Collect first-impression and interactive-task judgments separately. Use target users as the main panel and specialist reviewers as a separate panel.

Report paired win/tie/loss with uncertainty and failure rate. Cluster resampling by brief and rater. Do not treat repeated clicks as independent samples. A pilot can start with 20 judgments per brief/pair, but power and clustered variance determine final sample size. Do not claim universal taste or conversion lift.

The six cases are a starter set. Expand to the research plan's 30 frozen briefs: 6 landing/pricing, 8 CRM/table/dashboard, 6 mobile, 6 auth/onboarding/settings/forms and 4 animation. Keep generated-media continuity and audio evaluation separate.

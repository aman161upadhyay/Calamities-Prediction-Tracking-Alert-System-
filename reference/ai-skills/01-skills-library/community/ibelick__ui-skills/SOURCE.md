# Source

Origin: https://github.com/ibelick/ui-skills
Commit: 59193a75432e5f41c6980f53b9e6a7bd56919947
Retrieved: 2026-10-25
Licence: MIT, upstream root LICENSE, copyright 2026 Julien Thibeaut. The complete notice is copied here.
Found by Aman through: https://x.com/pato__project/status/2114095406393036818

Qualifies under PRINCIPLES.md section 1, test 2: as of 2026-10-25, 10,179 stars, 10 contributor records, last pinned commit 2026-10-25T13:16:09+01:00 (repository page: 2026-10-25), and 19 open issues and pull requests combined; PR #106 opened 2026-10-23. https://ibelick.com identifies Julien Thibeaut and links his Motion Primitives, prompt-kit and UI Skills work.

Evidence checked 2026-10-25: https://api.github.com/repos/ibelick/ui-skills (476 forks), https://api.github.com/repos/ibelick/ui-skills/contributors?per_page=100&anon=true (10 records including bots or anonymous entries, below the page limit), and https://github.com/ibelick/ui-skills/pulls. Contributor records are not active human maintainer counts. Independent coverage was mostly directory listings, not controlled evaluations.
Inclusion evidence is separate from effectiveness: no effectiveness test executed.

Upstream selection: skills/component-canvas, skills/create-canvas, skills/fixing-accessibility, skills/fixing-metadata, skills/fixing-motion-performance and skills/improve-ui, including improve-ui/agents/openai.yaml and improve-ui/references/plan-template.md.
Changes to copied upstream files: nothing. Six complete subtrees and LICENSE were copied. Local README.md, FOR-AMAN.md and SOURCE.md explain the selection. No registry, MCP service, website, analytics, installer, binary or node_modules was copied.

Excluded from this selection: baseline-ui imposes Tailwind, Motion and aesthetic bans that conflict with brief-led design. ui-skills-root instructs the agent to run an unpinned npx registry CLI. create-design-md has good evidence gates but requires unpinned npx @google/design.md execution for specification lookup, lint, export and diff. These latter two skills fail the remote execution rule in AI/PRINCIPLES.md section 5 as written; a warning outside an unchanged skill is not a sufficient fix.

Security review: searched all tracked content for curl, wget, fetch, http, eval, exec, rm -rf, base64, chmod, subprocess and child_process. Selected skill content has no downloader or executable helper and no instruction to disable checks. A “disabled” state reference is not a security bypass. Outside the selection, scripts fetch registry and GitHub data, setup-auth-dev.mjs imports child_process and changes local file permissions, and public/analytics/stonks.js sends analytics. The full scan is in work/sources/11-x-design-skills/ui-skills-security-scan.txt. Canvas previews require dev-only synthetic data and must block live calls before mount.

Limits: no task-level effectiveness test was run. fixing-accessibility is a checklist, not a WCAG conformance audit. fixing-motion-performance gives conservative heuristics, not browser-independent rendering guarantees. improve-ui intentionally excludes functional and accessibility findings unless asked; request the separate accessibility review explicitly.

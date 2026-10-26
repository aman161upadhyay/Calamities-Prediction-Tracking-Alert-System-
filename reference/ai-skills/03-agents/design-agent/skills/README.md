# Selective procedures

- `design-brief-intake/`: establish task, inputs and permissions.
- `uniqueness-review/`: compare choices against unrelated defaults.
- `design-critique/`: produce located findings with evidence.
- `vendored/`: Anthropic design documentation with provenance and license.
- `FOR-AMAN.md`: when to load each procedure.

## Library skills this agent loads on demand

Vetted on 2026-10-25 from the four repositories Aman found in an X post by @pato__project (decisions and evidence in `../../../01-skills-library/excluded.md` and the library's `curated-index.md`). Paths are relative to `../../../01-skills-library/community/`. Load one task-specific procedure per pass, not a whole collection.

| Skill | When this agent loads it |
|---|---|
| `emilkowalski__skills/skills/emil-design-eng/SKILL.md` | Choosing motion, timing and interaction detail; gates motion by purpose and frequency before choosing curves |
| `emilkowalski__skills/skills/review-animations/SKILL.md` | Reviewing a motion diff: located findings, interruption checks, remedial order |
| `emilkowalski__skills/skills/mobile-native/SKILL.md` | Acceptance pass on a web app on a phone: viewport units, touch targets, zoom, safe areas |
| `emilkowalski__skills/skills/break-ui/SKILL.md` | Stress-testing screens with long names, empty lists and overflowing data through dev-only fixtures |
| `ibelick__ui-skills/skills/improve-ui/SKILL.md` | A review that returns evidence-backed findings and a plan without editing product source |
| `ibelick__ui-skills/skills/fixing-accessibility/SKILL.md` | Names, focus and keyboard behaviour; request it explicitly alongside improve-ui |
| `ibelick__ui-skills/skills/fixing-motion-performance/SKILL.md` | Diagnosing rendering work before changing animation libraries |
| `pbakaus__impeccable/` (reference-only, no SKILL.md) | `critique.md` for a review pass, `clarify.md` for copy passes, `polish.md` for a finishing pass. The upstream launcher was removed; see its SOURCE.md |
| `vercel-labs__agent-skills/skills/web-design-guidelines/SKILL.md` | Accessibility, forms, focus and state checks against Vercel's guidelines |

Two of Emil Kowalski's rules are practitioner opinion, not requirements: the blanket ban on keyboard-triggered motion and the fade requirement under reduced motion. The brief and the accessibility contract in `../SYSTEM-PROMPT.md` win when they conflict. Not loaded: UI UX Pro Max (style mappings without support, for example glassmorphism for data-heavy SaaS), and the executable Impeccable skill (downloads and runs a release binary at setup).

# Calamity Watch

Hazard warnings read from what people post, before the sirens.

Calamity Watch pulls public posts about floods, storms, wildfires, earthquakes, landslides and heat from X and Bluesky, scores each one for hazard relevance and fear with two models, resolves it to a place, and raises an alert when a place's fear-weighted signal breaks from its own baseline. Alerts are checked against GDACS, USGS, NWS and NASA FIRMS, and the lead time between the social signal and the official one is recorded.

This is the 2026 rebuild of [sacredgamers_codefundoMS](https://github.com/aman161upadhyay/sacredgamers_codefundoMS), a Microsoft CodeFunDo++ 2018 hackathon entry. The original is kept unchanged; a redacted copy of its sources is in `reference/original-2018/` and the audit is in `docs/research/01-original-system-audit.md`.

Status: planning committed 2026-10-26; the build follows `docs/plan/BUILD-PLAN.md`.

## Repository map

| Path | Contents |
|---|---|
| `docs/research/` | audit of the 2018 system; findings on X API pricing, data sources, models, datasets and UI references |
| `docs/plan/BUILD-PLAN.md` | architecture, ML pipeline, detector, data budget, pages, milestones, risks |
| `docs/design/DESIGN-BRIEF.md` | brief, tokens, layout, uniqueness review |
| `docs/council/` | review protocol for this repository and the round logs |
| `reference/original-2018/` | redacted 2018 sources |
| `reference/ai-skills/` | the design, writing, coding and council skill files from `github.com/aman161upadhyay/ai` that govern the build |

Backend, ML and frontend directories arrive with milestone M0.

## Not an official warning source

Calamity Watch is an experimental research system. It does not replace national meteorological, geological or civil-protection services. Every alert in the interface carries this notice.

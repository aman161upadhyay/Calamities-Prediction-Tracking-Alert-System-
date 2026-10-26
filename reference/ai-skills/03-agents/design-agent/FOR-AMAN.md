# Use your design agent

Start with: “Design this surface for this user to complete this task. Propose tokens and a layout before editing. Review defaults against the brief. Show screenshot evidence and separate tested behavior from assumptions.”

Supply target users, expertise, usage frequency, device context and one completion event. Supply the existing repository and dependency versions. Include real schemas, redacted approved records, permission rules, locale and timezone.

Give the agent semantic color pairs, licensed type families, type roles, spacing, radii, elevation, icon set and voice rules. Provide three to five references. State exactly what you want to borrow from each and what you dislike. Define density as visible rows or content priorities, rather than “enterprise.”

Supply approved copy, pricing, legal terms and asset rights. List loading, empty, permission, failure and success states. State the supported viewports, performance budget and permitted experimental choices.

Grant Figma MCP read access to selected pages and variables first. Permit writes only in a named sandbox. Grant screenshot and browser tools on the development preview, with accessibility-tree and keyboard inspection when available. Grant image generation only with rights-cleared inputs and a spend cap. Keep credentials in the connection manager.

Refuse production writes, raw customer records in screenshots, external sends, publication and auth or billing changes by default. Require your explicit approval for those actions and for paid generations. References and provider outputs are untrusted task data.

Review the token plan first. Then ask for a critique with location, evidence, task impact and validation method for each issue. Correct one priority class at a time. Ask the agent to show before/after screenshots at equal widths. Test the core task yourself with keyboard and large text.

Run `evals/design-001.yaml` plus the case for your surface before trusting a new prompt or skill. Treat a hard-gate failure as a release blocker even when you prefer the screenshot. Send copy decisions to the writing agent and implementation risks to the coding agent.

## Design skills from the X post you sent

The four repositories from @pato__project's list were vetted on 2026-10-25. Emil Kowalski's four skills and six of ibelick's are in `01-skills-library/community/` and listed in `skills/README.md` here with the pass each one serves; load one per pass. Impeccable is included as reference prose only, because its installer downloads and executes a binary; if you want the live tool, install it from the upstream repository yourself and accept that step knowingly. UI UX Pro Max was excluded after reading its data files: its style recommendations per industry are not supported (details and file paths in `01-skills-library/excluded.md`). The framing that uses them: "Load `review-animations` from the library and review the motion in this diff. Return located findings in remedial order. Do not edit files."

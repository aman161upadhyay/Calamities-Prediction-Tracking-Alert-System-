# ibelick/ui-skills

Six selected MIT procedures for scoped audits and safe component previews. Read SOURCE.md for omitted skills, including create-design-md.

- [component-canvas](skills/component-canvas/SKILL.md): Builds a pan-and-zoom gallery around existing components without changing their public behavior.
  Load in design-agent for variant comparison and coding-agent for a private preview route; block live services before mount.
- [create-canvas](skills/create-canvas/SKILL.md): Builds a named workspace for design alternatives with bounded gestures and layout persistence.
  Load in design-agent for exploration and coding-agent for the isolated harness; do not expose the route publicly by default.
- [fixing-accessibility](skills/fixing-accessibility/SKILL.md): Reviews names, keyboard access, focus, forms and announcements with minimal fixes.
  Load in coding-agent for implementation and design-agent for acceptance review; supplement it with manual assistive-technology checks.
- [fixing-metadata](skills/fixing-metadata/SKILL.md): Checks canonical URLs, indexing, social cards and structured data against real page content.
  Load in coding-agent for page metadata and design-agent when reviewing public share previews.
- [fixing-motion-performance](skills/fixing-motion-performance/SKILL.md): Checks layout reads and writes, animation properties, scroll drivers and layer costs.
  Load in coding-agent for a performance fix and design-agent for motion tradeoffs; profile on the supported browser and device.
- [improve-ui](skills/improve-ui/SKILL.md): Traces a surface to its governing design evidence and writes plans only for selected, verified findings.
  Load in design-agent for an audit and coding-agent to execute an accepted plan; the audit itself does not modify product source.

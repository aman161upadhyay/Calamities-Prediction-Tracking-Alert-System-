# Motion as feedback

Describe the state change before choosing a library. “This transition helps the user understand which record opened” justifies a small detail-panel transition. An operational table rarely needs serial row entrances.

[Emil Kowalski](https://emilkowal.ski/ui/great-animations) recommends generally short interactions, often under 300ms. [Rauno Freiberg](https://interfaces.rauno.me/) uses a tighter interaction heuristic around 200ms. Start frequent feedback around 120 to 200ms, then test frequency, distance and input. These values are craft heuristics.

Use transform and opacity where suitable. Reserve dimensions. Allow interruption and cleanup on route changes. Keep focus lifecycle in the interaction primitive, not in a guessed timeout.

Choose CSS/SVG for simple feedback. Use [Motion](https://github.com/motiondivision/motion) for React state and layout transitions. Use [GSAP matchMedia](https://gsap.com/docs/v3/GSAP/gsap.matchMedia()) for coordinated timelines and preference-specific cleanup. GSAP guidance was search-verified in the research, not fully retrieved.

Reduced motion must preserve meaning. [Rive](https://rive.app/docs/editor/accessibility/reduced-motion) needs an explicit preference input and a static state path. Do not assume a runtime supplies accessibility automatically.

Review confirmed-save timing, repeated inputs, reversal, script failure and low-end devices. Report measured behavior, not guessed frame rates.

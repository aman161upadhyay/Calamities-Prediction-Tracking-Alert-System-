# Motion preserves access

Use motion as feedback about a state change. Keep content available before scripts run. Do not animate unrelated elements.

Frequent interactions often start around 120 to 200ms. Emil Kowalski's generally-under-300ms and Rauno Freiberg's tighter interaction guidance are heuristics, not universal limits. See the design agent's [motion reference](../../03-agents/design-agent/reference/motion-principles.md).

Prefer transform and opacity where suitable. Reserve layout space. Define reverse/cancel behavior and clean up on route changes. Focus behavior belongs to a tested interaction primitive.

Page-load orchestration may use one justified sequence. Do not hide every section behind a reveal. Reduced motion must provide the same content and state information immediately.

Measure runtime on the target device. A library choice does not establish performance.

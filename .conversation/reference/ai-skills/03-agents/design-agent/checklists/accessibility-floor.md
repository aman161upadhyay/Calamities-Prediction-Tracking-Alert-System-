# Accessibility floor

This floor is not a compliance certificate. The research retrieved individual W3C Understanding pages, not the full normative standard. Confirm the normative WCAG 2.2 requirements for a compliance claim. See `../sources.md`.

- [ ] Keyboard-only users complete the core task without traps.
- [ ] Focus is visible and ordered. At WCAG 2.2 AA, focused components are not entirely hidden by author-created content. The stronger no-obscuring requirement is AAA.
- [ ] Dialogs have accessible names and correct focus entry, containment where appropriate, Escape behavior and restoration.
- [ ] Semantic elements and persistent field labels expose names, roles and values. Errors identify fields and recovery.
- [ ] Normal text measures at least 4.5:1 contrast. Large text measures at least 3:1. Large means 18pt regular or 14pt bold, approximately 24px or 18.67px CSS.
- [ ] Essential UI boundaries and graphics are checked against the 3:1 non-text criterion. Verify its normative exceptions before a compliance claim.
- [ ] Pointer targets meet the 24 by 24 CSS pixel AA minimum or a documented spacing, equivalent-control, inline, user-agent or essential exception. Do not describe 44px as the AA rule.
- [ ] Dragging has a single-pointer non-drag alternative unless an applicable exception holds.
- [ ] At 320 CSS pixels wide, reflow preserves content without two-dimensional scrolling except for content that requires that layout.
- [ ] Text zoom and large text do not remove actions or labels.
- [ ] Previously entered information is not needlessly requested again in the same process. Confirm the normative redundant-entry exceptions.
- [ ] Authentication permits password managers and paste. Cognitive tests have qualifying assistance, alternatives or exceptions.
- [ ] Status has a non-colour indicator. Images have appropriate alternatives.
- [ ] Reduced motion preserves state information. Flashing and ongoing animation receive explicit review.
- [ ] Native mobile uses platform targets, around 44pt on iOS and 48dp on Android, with text scaling and screen reader tests. These units are not CSS pixels.
- [ ] Automated scanning is supplemented with keyboard and screen reader review. Record test device, state and result.

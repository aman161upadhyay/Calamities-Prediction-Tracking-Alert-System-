# Animation prompts

Supply current code, installed package/version, trigger, states, device target and budget. These original examples adapt research 05 and are untested. Acceptance includes the static path and repeated input.

```text
Animate [state transition] because users need to understand [change].
Stack/version: [installed CSS/Motion/GSAP]. Trigger/start/end: [states].
Timing: [duration/easing or spring]. Interruption: [cancel/reverse behavior].
Focus: [entry, containment and restoration]. Reduced motion: [static path].
Performance: [reserved dimensions, properties, cleanup and device].
Implement only after inspecting existing components. Report actual checks.
```

## Motion panel

```text
In the existing React CRM, use installed Motion to open a record detail panel
after a name link is selected. Keep the table stationary. Fade and translate
the panel at most 12px over roughly 160ms with ease-out. Reverse cleanly when
closed mid-transition. Use the existing accessible sheet/dialog primitive for
focus containment and restoration. Under reduced motion switch immediately.
Do not announce success or change selection during animation.
Verify keyboard open, Escape, close, narrow screens and rapid repeated input.
No staggered rows or background blur.
```

## GSAP orchestration

```text
For a fictional bicycle-frame landing page, create one GSAP timeline that
crossfades three approved detail photos as their matching text sections pass.
Keep native scrolling. Do not pin the whole page. Reserve image aspect ratios.
Use gsap.matchMedia for desktop and motion preferences.
On small screens or reduced motion, show all three still images inline.
Clean up timeline and triggers on route change. Keep the CTA usable before
scripts load. Report measured behavior rather than a guessed FPS.
```

## CSS feedback

```text
Add a CSS-only pressed state to the existing primary button: translate 1px down
over 80ms and return over 120ms. Use current colour/focus tokens.
Apply hover only on devices that support hover. Keep the focus-visible outline
and hit area stable. Under reduced motion use an immediate colour change.
Include disabled, pending and destructive variants. Add no global transitions.
```

## Page-load orchestration

```text
For the supplied exhibition page, create one page-load sequence using the
installed Motion package. The approved title and first photograph are readable
before JavaScript. After hydration, fade the nonessential caption from 0.6 to
full opacity over 140ms. Do not delay the title, primary action or navigation.
Reserve image dimensions and do not re-run the entrance on every state update.
Under reduced motion, show the final state immediately.
Check refresh, slow image loading, script failure and repeated route entry.
Remove the sequence if it obscures content or adds no useful orientation.
Report actual checks and the installed version.
```

Failure modes: stale queued transitions, lost focus, layout shift and content that remains hidden after script failure. Verify each explicitly.

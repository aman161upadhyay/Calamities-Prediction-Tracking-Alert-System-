# Micro-animation contracts

Purpose: explain a state or deliver a small loop. Supply approved assets, tokens, trigger, state truth, output dimensions, file budget and runtime. These are untested authored examples. Check installed tools and versions before execution.

## Editable contract

```text
Create [feedback/loop] for [state and trigger].
Asset: [approved image/vector]. Geometry/palette: [tokens].
Storyboard: [initial state], [change], [settled state].
Timing: [duration, easing, hold]. Playback: [once, loop or on demand].
Output: [CSS/SVG, Lottie, Rive or video-to-GIF] plus static fallback.
Constraints: [dimensions, bytes, transparency, reduced motion].
Verify state correctness, legibility and boundary on the target channel.
```

## CSS/SVG confirmed save

```text
Design a save-confirmation mark for fictional Fieldnote. Use SVG/CSS at 24x24
within a 44x44 button area. Only on confirmed server success, crossfade the
save icon to a check in 120ms, hold 1.2 seconds and return without layout shift.
Use action/success tokens. Under reduced motion replace the icon immediately.
Supply a labeled static success state and error alternative.
No bounce, sparkles or sound. Never animate optimistic saving as success.
```

## Image-to-video to GIF

```text
Using the rights-cleared paper-windmill still, request a locked-camera
5-second clip where only the vanes rotate slowly one full revolution.
Preserve texture, background and center position. Verify the provider settings.
Inspect first/last orientation, trim one clean cycle and export a 480px-wide
GIF for a support article. Start at 12fps with a 2MB target budget.
Adjust dimensions or rate if needed and report actual bytes.
Provide a static PNG and a smaller MP4/WebM option for website use.
Do not claim a clean loop until the boundary is inspected.
```

## Rive state machine

```text
Build a Rive illustration for fictional file import with idle, uploading,
confirmed and failed states. Bind progress to actual upload state.
Use a 256x160 artboard, two brand colours and one neutral.
Confirm with a small 160ms settle. Show a stable retry indicator on failure.
Bind a prefersReducedMotion Boolean at runtime to static state changes.
Expose an accessible text status outside the canvas.
Provide a static fallback when the runtime fails to load.
```

## Lottie authored playback

```text
Create a vector Lottie confirmation for a completed file export using supplied
brand shapes. Play once after confirmed completion, then hold the final frame.
Use a 96x96 composition and the supplied output-byte budget.
Keep essential status text in the DOM. Supply the same static final mark when
reduced motion is enabled or the runtime fails. Check the installed renderer's
supported features and report actual export size. Do not simulate progress.
```

Acceptance: state truth, labeled fallback, channel legibility and measured bytes. Common failures: palette artifacts, unstable video geometry, false completion and a visible loop jump.

# Choose the smallest adequate format

Use CSS/SVG for simple interface feedback without a new runtime. Use Lottie/dotLottie for authored vector playback. Use Rive for interactive vector state machines. Use GIF where channel compatibility requires raster frames.

[LottieFiles' comparison](https://lottiefiles.com/blog/working-with-lottie-animations/lottie-vs-gif) is vendor guidance, not a guarantee that every vector export is smaller. GIF has a limited palette and is inefficient for photography. Offer MP4/WebM for websites when appropriate.

Workflow: author or generate motion, trim, stabilize, create an encoder palette, export, then inspect frame timing and boundary. Measure actual dimensions and bytes.

[Rive reduced motion](https://rive.app/docs/editor/accessibility/reduced-motion) requires explicit preference handling. Keep status text outside canvas. A static fallback does not repair an inaccessible trigger.

The design agent's vendored `slack-gif-creator` is documentation only. Its Python utilities are excluded from this Markdown repository. Retrieve and audit utilities separately before execution.

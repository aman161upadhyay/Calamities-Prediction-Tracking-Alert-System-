# Use native conventions

Apple guidance supports Dynamic Type, VoiceOver, safe areas and default interaction targets around 44pt. Material density guidance uses 48dp interaction targets with scalable text. Verify current platform implementation.

WCAG 2.2 AA's 24 CSS pixel target criterion with exceptions is a separate web requirement. Do not substitute pt, dp and CSS pixels.

Preserve platform back, tabs and sheets. Explain permissions in context. Keep required actions visible above the keyboard. Test large text, high contrast, dark mode, reduced motion and background restoration.

Web/PWA designs use CSS pixels and web semantics. A native-looking visual does not supply native behavior.

Sources: [Apple accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility), [Material density](https://m3.material.io/foundations/layout/grids-spacing/density), [W3C targets](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).

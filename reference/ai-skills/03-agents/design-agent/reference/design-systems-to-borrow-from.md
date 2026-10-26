# Borrow behavior and token discipline

| System | What to take | Boundary |
|---|---|---|
| [Apple HIG](https://developer.apple.com/design/human-interface-guidelines) | Dynamic Type, safe areas, VoiceOver, native navigation and motion settings | Confirm current platform details; do not reproduce system controls as web decoration |
| [Material 3](https://m3.material.io/foundations/layout/grids-spacing/density) | Component states, density tradeoffs and 48dp default targets | Exact typography values were not retrieved from its app shell |
| [Carbon](https://www.carbondesignsystem.com/building-blocks/foundations/spacing/overview) | Spacing tokens such as 2/4/8/12/16/24/32 and dense operational structure | Keep one coherent scale |
| [Polaris](https://polaris-react.shopify.com/components/tables/data-table) | Admin task framing and table alignment concepts | Historical React pages redirect; verify current integration |
| [Atlassian](https://atlassian.design/foundations/spacing) | Named operational tokens, 8px base and fractional spacing | Do not import its identity wholesale |
| [shadcn tokens](https://ui.shadcn.com/docs/theming) | Semantic foreground/background pairs and theme overrides | A kit does not choose hierarchy or prove contrast |
| [Radix](https://www.radix-ui.com/primitives/docs/overview/accessibility) | Keyboard behavior, focus lifecycle and accessible primitives | Composition, labels and contrast remain implementation responsibilities |

These are source-backed starting points, not a recipe for combining seven visual styles.

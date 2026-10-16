# sign/ui

Sign's components, built on the site's dark theme. Rules, reuse map and status vocabulary:
[docs/DESIGN.md](../../../../docs/DESIGN.md). Live preview in development: `/tools/sign/dev/ui`.

- Wrap `@/components/product-ui` primitives; never modify them or `src/components/ui`.
- `colors.ts` holds only the semantic status colours and contrast math; `status.ts` the status vocabulary.
- Import the typed signature picker only through `typed-signature-loader.tsx` (code-split fonts).
- Marketing-page components here (template cards, pricing, legal) predate the design system and are unchanged.

# MOLFET — Break the Frame

Two deliverables live in this repository:

| What | Where | Description |
| --- | --- | --- |
| **The live storefront** | `src/` · `npm run dev` | The MOLFET shop rebuilt around the concept "Break the Frame": framed images with the logo's bottom-right gap, the Lens, Limitless Mix, the open-circle UI, EN/AR with RTL, EGP, WCAG AA. |
| **The Shopify OS 2.0 theme** | `shopify/` | The literal, uploadable theme the brief asks for — Liquid, JSON templates, sections, snippets, metafield/metaobject definitions, README and QA checklist. Start at [`shopify/README.md`](shopify/README.md). |

The creative concept, the brand rules and the full build prompt are in
`Molfet_Shopify_Concept_and_Prompt.pdf` (pages 2–7).

---

## Run the storefront locally

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build
npm run lint       # tsc --noEmit
```

Optional environment (`.env.local`): the app ships with the Supabase project
already configured in `src/lib/supabaseConfig.ts`. If the database is empty or
unreachable, the local MOLFET catalogue in `src/data/constants.ts` takes over,
so the storefront always renders.

Set `GEMINI_API_KEY` only if you use the AI Studio helper endpoints.

## Routes

| Route | Page |
| --- | --- |
| `#/` | Home — hero, statement split, Mix teaser, featured pieces, details strip, newsletter |
| `#/shop` | Collection with filters and Lens-enabled cards |
| `#/product/:id` | Product — Lens gallery, Fabric/Cut/Finish hotspots, Mix it, sticky add-to-cart |
| `#/mix` | Limitless Mix studio (shareable `?look=` URLs) |
| `#/about` | The brand and the three colours |
| `#/checkout` · `#/success` · `#/track` | Existing order flow, restyled |
| `#/ar/...` | Opens any route in Arabic (RTL) |
| `#/admin` | Store dashboard (code-split) |

## The concept, in code

| Feature | Implementation |
| --- | --- |
| **The Frame** | `src/components/brand/Frame.tsx` — four rules, right and bottom stop short of the bottom-right corner so the gap never mirrors |
| **The Lens** | `src/components/brand/Lens.tsx` — brush-circle cursor at 34px, opens to 168px over a product, layer A (Italian sketch SVG) under layer B (macro fabric), up to three hotspots, press-and-hold + Detail button on touch |
| **Limitless Mix** | `src/components/store/MixItModule.tsx` — one piece per category, stacked preview, variant chips, one batched add, `?look=` share links, 3-piece discount message |
| **The Open Circle UI** | `src/components/brand/OpenCircle.tsx` — 620ms page loader, free-shipping ring filling toward the gap, spinners, back-to-top |
| **Brand rules** | `src/index.css` — the three colours as CSS custom properties, every other shade `color-mix()`, the whole Tailwind palette remapped so no utility can emit an outside colour |
| **Languages** | `src/lib/i18n.tsx` — EN/AR, `dir` switching, CSS logical properties, Cairo for Arabic |
| **Routing** | `src/lib/router.ts` — hash routes, deep links, `#/ar` prefix |

## Tests

```bash
npx vitest run
```

13 checks: hero, shop grid, product page, Lens hotspots, Mix builder and its
discount message, 404 microcopy, brand page, and the Arabic/RTL switch.

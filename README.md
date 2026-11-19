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

### Run it on Shopify

Set three variables and the whole storefront runs on your Shopify store —
catalogue, variants, inventory, cart, discount codes and checkout:

```bash
SHOPIFY_STORE_DOMAIN=your-shop.myshopify.com
SHOPIFY_STOREFRONT_TOKEN=shpat_…
SHOPIFY_API_VERSION=2024-10
```

Then check `GET /api/shopify/status`. Full walkthrough, metafield mapping and
troubleshooting: **[`SHOPIFY-SETUP.md`](SHOPIFY-SETUP.md)**. Without these
variables the storefront keeps its local catalogue and local cart, so nothing
ever breaks.

Optional: the Supabase project in `src/lib/supabaseConfig.ts` is only used for the
legacy admin/order tools and for the offline checkout. `GEMINI_API_KEY` is only
needed by the AI Studio helper endpoints.

## Routes

| Route | Page |
| --- | --- |
| `#/` | Home — hero, statement split, Mix teaser, featured pieces, details strip, newsletter |
| `#/shop` | Collection with filters and Lens-enabled cards |
| `#/product/:id` | Product — Lens gallery, Fabric/Cut/Finish hotspots, Mix it, sticky add-to-cart |
| `#/mix` | Limitless Mix studio (shareable `?look=` URLs) |
| `#/rack` | Rack view — clothes on a rail; drag a garment to turn it on its hanger |
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
| **Rack View** | `src/components/store/RackPage.tsx` — garments only (no accessories), drawn hangers whose open-ring hook the maroon rail runs through, 3D turn on drag / button / double-click, draggable rail, arrow keys, RTL-aware drag |
| **The Open Circle UI** | `src/components/brand/OpenCircle.tsx` — 620ms page loader, free-shipping ring filling toward the gap, spinners, back-to-top |
| **Brand rules** | `src/index.css` — the three colours as CSS custom properties, every other shade `color-mix()`, the whole Tailwind palette remapped so no utility can emit an outside colour |
| **Languages** | `src/lib/i18n.tsx` — EN/AR, `dir` switching, CSS logical properties, Cairo for Arabic |
| **Routing** | `src/lib/router.ts` — hash routes, deep links, `#/ar` prefix |

## Tests

```bash
npx vitest run
```

19 checks: hero, shop grid, product page, Lens hotspots, Mix builder and its
discount message, 404 microcopy, brand page, the Arabic/RTL switch, and the Rack
view (route, header button, garments-only filtering, turning, slot filter, Arabic).

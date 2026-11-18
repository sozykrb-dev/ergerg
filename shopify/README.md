# MOLFET — Break the Frame
### Shopify Online Store 2.0 theme · concept, brand rules and build

The slogan becomes the layout system: **every image sits inside a thin frame (the
limit) and the style steps out of it.** The open brush circle inside the O is the
signature, reused as the frame gap, the cursor, the loader and the cart ring.

---

## 1. What is in this folder

```
shopify/
├─ assets/
│  ├─ molfet.css.liquid      the whole stylesheet (theme colour settings injected)
│  ├─ molfet.js              vanilla JS, ~4.6 KB gzipped, no libraries
│  └─ (drop here)            your four logo lockups + product photography
├─ config/
│  ├─ settings_schema.json   slogan, three locked colours, four lockups, Lens on/off,
│  │                         free-shipping threshold, WhatsApp number, look discount
│  └─ molfet-metafields.md   metafield + metaobject definitions + setup steps
├─ layout/
│  ├─ theme.liquid           fonts (swap + preload), CSS, JS, sections, render hooks
│  └─ password.liquid
├─ locales/
│  ├─ en.default.json        storefront strings
│  ├─ ar.json                Arabic strings
│  ├─ en.default.schema.json theme-editor labels
│  └─ ar.schema.json         Arabic theme-editor labels
├─ sections/
│  ├─ announcement-bar.liquid  the slogan in the bar
│  ├─ header.liquid            wordmark collapsing into the brush circle on scroll
│  ├─ hero-frame.liquid        hero with the frame-break cut-out + one button
│  ├─ statement-split.liquid   "Italian mindset | Egyptian craftsmanship", maroon + cream
│  ├─ mix-teaser.liquid        Limitless Mix teaser
│  ├─ featured-collection.liquid  framed cards, Lens enabled
│  ├─ details-strip.liquid     three macro images: fabric, cut, finish
│  ├─ newsletter.liquid
│  ├─ footer.liquid            cream lockup on dark brown
│  ├─ main-product.liquid      gallery + Lens + hotspots + size guide + Mix it + sticky ATC
│  ├─ main-collection.liquid   Search & Discovery filters, framed cards
│  ├─ cart-drawer.liquid       section wrapper: ?sections=cart-drawer refresh
│  ├─ main-cart.liquid         drawer alternative page
│  ├─ main-mix.liquid          the Limitless Mix studio
│  ├─ main-about.liquid
│  ├─ main-page.liquid · main-search.liquid · main-404.liquid
├─ snippets/
│  ├─ molfet-frame.liquid      THE FRAME with the bottom-right opening
│  ├─ lens-cursor.liquid       THE LENS cursor + template
│  ├─ product-hotspots.liquid  the detail_point hotspots
│  ├─ molfet-product-card.liquid
│  ├─ cart-drawer.liquid       free-shipping ring drawn as the brush circle
│  ├─ page-loader.liquid       the circle draws itself in 600ms
│  ├─ size-guide.liquid · price.liquid · icon-plus/close/arrow
└─ templates/                  JSON templates (index, product, collection, cart,
                               page, page.about, page.limitless-mix, 404, search,
                               list-collections, password) + gift_card.liquid
```

---

## 2. Install

### Option A — zip upload
1. Zip the **contents** of `shopify/` (so `assets/`, `config/`, … are at the root of the zip).
2. Shopify admin → **Online Store → Themes → Add theme → Upload zip file**.
3. **Publish**.

### Option B — Shopify CLI
```bash
npm i -g @shopify/cli @shopify/theme
cd shopify
shopify theme dev --store your-store.myshopify.com   # preview
shopify theme push --unpublished                     # upload as a draft theme
shopify theme check                                  # lint (should be clean)
```

### Then, in the admin
1. **Settings → Custom data** — create the three product metafields and the
   `detail_point` metaobject exactly as in `config/molfet-metafields.md`.
2. **Theme settings → Brand** — upload the four official lockups (SVG or high-res
   PNG, transparent background). Paste the slogan (default `Style Without Limits`).
3. **Theme settings → Concept** — the Lens is on by default. Set the lens diameter,
   the frame opening and the frame-break distance.
4. **Theme settings → Colour schemes** — three schemes named Cream, Maroon and
   Brown. Every section picks one; the values are the three brand colours.
5. **Theme settings → Cart and shipping** — free-shipping threshold and the
   automatic look discount percentage (create the actual discount under
   **Discounts → Automatic**).
6. **Theme settings → Contact** — the WhatsApp number and its default message.
7. **Pages** — create `Limitless Mix` (template `page.limitless-mix`) and
   `The Brand` (template `page.about`).
8. **Languages** — add Arabic, then edit strings with *Translate & Adapt*.
9. **Currency** — EGP as the store currency.
10. **Collections** — four collections for the Mix rows (Tops, Bottoms,
   Outerwear, Accessories) and pick them in the *Limitless Mix* section.

---

## 3. How the four features are built

### The Frame
A 2px line in four absolutely-positioned spans (`snippets/molfet-frame.liquid`).
The right side stops `--mf-frame-gap` short of the bottom, and the bottom side
stops the same distance short of the right — so the opening always sits at the
**bottom-right, in English and in Arabic** (the logo never mirrors). The cut-out
image (`molfet.cutout`) is a second layer over the photo, cropped by the same
box and translated 8–16px on hover with a CSS transform only.

### The Lens
- `snippets/lens-cursor.liquid` renders the brush circle; `molfet.js` moves it
  with `requestAnimationFrame` and grows it to 160px over an image.
- Inside the circle: **layer A** = `molfet.sketch_image` (cream lines on maroon),
  **layer B** = the macro photo, fading in when the pointer rests on a hotspot.
- Hotspots come from `molfet.detail_points` (metaobject `detail_point`: `x`, `y`,
  `title`, `text`, `macro_image`), max three, keyboard reachable (`Tab` then `Enter`).
- Caption: *Italian mindset. Egyptian hands.*
- Touch devices: press-and-hold, plus a visible **Detail** button and the three
  macro tiles under the gallery.
- `prefers-reduced-motion`: tap to reveal, no movement, cursor hidden.

### Limitless Mix
`sections/main-mix.liquid` + `assets/molfet.js#initMix`. One piece per slot from
swipeable rails, a live stacked preview inside a frame, colourway/variant chips,
and **one** `POST /cart/add.js` with an `items` array for the whole look. The
discount message appears at three pieces; the discount itself is a Shopify
automatic discount. Looks are shareable: `?look=top:123,bottom:456,…` hydrates
the selection on load, and **Share** writes that URL.

### The Open Circle UI
The path is drawn open at the lower right and reused as:
the page loader (draws itself in 600ms), the free-shipping ring in the cart
drawer (fills toward the gap, lights up in cream at the threshold), spinners and
the back-to-top button.

---

## 4. Brand rules encoded in the code

| Rule | Where |
| --- | --- |
| Only maroon `#711518`, cream `#FAED99`, brown `#321E19` | `settings_schema.json` + `:root` in `molfet.css.liquid` |
| Any other shade via `color-mix()` only | every derived token in `molfet.css.liquid` |
| No maroon text on brown (1.4:1) | never emitted: brown areas use cream text |
| Four lockups only, never redrawn | `theme`/section settings use the uploaded files |
| Slogan exactly “Style Without Limits”, 300 weight, .25em | `.mf-slogan` |
| Microcopy of limits | `locales/*.json` (`cart.shipping_bar`, `cart.empty`, `general.404.title`) |
| RTL through logical properties | `inset-inline`, `margin-inline`, `border-inline` throughout |
| Reduced motion | `@media (prefers-reduced-motion: reduce)` in CSS + JS guard |
| No WebGL, no jQuery, JS < 60KB gz | `assets/molfet.js` (~4.6 KB gz) |

---

## 5. QA checklist

- [ ] Theme Check reports no errors (`shopify theme check`). If the CLI cannot be
      installed (no network), `python3 scripts/check-shopify-theme.py` from the
      repo root runs the offline gate: 33 Liquid files, 11 JSON templates, every
      `render`/`section` target, every `settings.*` key, every `{% schema %}` and
      every template section type is verified. It does not replace Theme Check.
- [ ] Header shows the wordmark; on scroll it collapses to the brush circle.
- [ ] Frame gap is bottom-right at 360px, 768px, 1440px **and** in Arabic.
- [ ] Hero subject crosses the frame line; hover moves it 8–16px (CSS transform).
- [ ] Lens cursor is visible on desktop, maroon on light and cream on dark areas.
- [ ] Over a product, the lens opens to ~160px and shows the sketch layer, then the macro.
- [ ] Three hotspots appear; `Tab` reaches each; `Enter` opens the callout.
- [ ] On touch, press-and-hold opens the detail; the Detail button also opens it.
- [ ] `prefers-reduced-motion: reduce` → no movement, tap to reveal.
- [ ] Mix: pick four pieces → total updates → **Add the look** sends one request → drawer opens.
- [ ] Mix discount message appears at 3 pieces.
- [ ] Shared look URL restores the same four variants.
- [ ] Cart ring fills toward the gap and turns cream above the threshold.
- [ ] Empty cart shows “Your look has no limits yet. Start building it.”
- [ ] 404 shows “You found the edge of the map. Style doesn't have one.”
- [ ] Slogan appears in hero, announcement bar, footer, loader, empty cart, 404.
- [ ] Arabic locale: `dir="rtl"`, Cairo font, frame gap still bottom-right.
- [ ] Keyboard: skip link, focus rings maroon on cream / cream on brown.
- [ ] Lighthouse mobile: LCP < 2.5s on 4G, CLS ≈ 0 (width/height on every image).
- [ ] No colour outside the three in the rendered page (spot-check with a colour picker).

---

## 6. Assumptions

- Photography is supplied on solid brand-colour surfaces; the cut-out layer is a
  separate transparent file per product.
- Sketches are optional: without `molfet.sketch_image`, layer A is skipped and the
  Lens still shows the macro layer (as the brief allows).
- Arabic slogan: `Style Without Limits` is kept in Latin script, exactly as in the
  lockup. An Arabic rendering (`أسلوب بلا حدود`) is available in the copy deck for
  the announcement bar if the client approves it.
- The automatic look discount is created in Shopify; the theme only announces it.
- Colourway chips in the Mix studio come from the variant option swatches (Shopify
  variant swatch / Search & Discovery), because the brief locks the *interface* to
  three colours while the garments themselves are photographed in their real
  colourways; a chip is a product fact, not a UI colour.
- Cash on delivery, the local payment gateways and EGP are store settings in
  Shopify admin (Settings → Payments, Settings → Store details), not theme code.

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
│  └─ settings_data.json     the shipped defaults for those settings
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
│  ├─ main-rack.liquid         Rack view — garments on hangers, turning
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
                               page, page.about, page.limitless-mix, page.rack,
                               404, search, list-collections, password)
                               + gift_card.liquid
```

---

## 1a. "This branch isn't a valid theme" — why, and how to fix it

If **Online Store → Themes → Add theme → Connect from GitHub** rejects the
`arena/cc11c532-ergerg` branch, nothing is wrong with the theme. The branch is
simply not *shaped* the way the integration reads one.

**The rule.** Shopify treats a branch as a theme only when these sit at the
**root of the branch**:

```
layout/theme.liquid
config/settings_schema.json
config/settings_data.json
locales/en.default.json
templates/…
```

**Why this repository fails it.** The branch root is a React app:

```
package.json  src/  server.ts  vite.config.ts  shopify/  ← the theme is one level down
```

Shopify does not look inside subfolders, so it finds no `layout/` and no
`config/` — hence "not a valid theme". This is expected, and the integration
cannot be pointed at a subfolder.

### Option A — upload the zip (no repository involved)

1. `Online Store → Themes → Add theme → Upload zip file`
2. Choose `molfet-shopify-theme.zip`

The zip already has the theme folders at its root, which is exactly what the
uploader needs. This is the only option that avoids a second repository.

### Option B — a dedicated theme repository

The screenshot case: in **Connect theme** the panel offers
`Repository: ergerg` with branches `arena/cc11c532-ergerg` and `main`, and
**Connect** is greyed out with *"Branch isn't a valid theme"*. That is correct —
it is reading the wrong repository. `ergerg` is the React app; its root holds
`package.json`, `src/` and `server.ts`, and the theme is one folder down in
`shopify/`. Shopify never looks inside a subfolder, so **no branch of that
repository will ever connect**.

You need a repository whose root *is* the theme. One command:

```bash
node scripts/publish-theme-repo.mjs <your-name>/molfet-theme main
```

It creates the repository (or reuses an empty one), copies the theme contents,
commits them at the root and pushes. Then in the Shopify panel pick
`Repository: molfet-theme`, `Branch: main`, and **Connect** becomes available.

If the GitHub login cannot create repositories, the command prints a
one-click link that opens GitHub's new-repository form already filled in; create
it empty (no README), run the command again, and it pushes.

It never force-pushes: Shopify's integration is two-way, so edits made in the
theme editor are committed back to that branch by a bot, and a forced push would
throw them away.

`node scripts/export-theme-repo.mjs <owner/repo> [branch]` does the same push
without needing `gh` to exist, if you prefer to create the repository yourself.

### Checking any folder before you push

```bash
node scripts/check-theme-root.mjs            # checks ./shopify
node scripts/check-theme-root.mjs <path>     # checks any folder
```

It exits non-zero and says what is wrong — a missing `config/`, or a theme
buried one folder too deep.

---

## 1b. Where the images come from

A fresh install is **never an empty page**. The theme's concept photography ships
in this repository and is served over a CDN, so the hero, the four home-page
cards, the Mix stack, the detail macros and both logo lockups all appear before
the merchant uploads anything.

**The order of precedence, in every slot:**

1. **What the merchant uploaded** in *Theme settings → Brand*, or a section's own
   image picker. Served from Shopify's CDN. This always wins — your photography,
   your store.
2. **The built-in concept image**, fetched from the repository at a **pinned
   commit**:

   ```
   https://cdn.jsdelivr.net/gh/sozykrb-dev/ergerg@<commit>/public/…
   ```

3. If that CDN is unreachable, `molfet.js` retries the same file from
   `raw.githubusercontent.com` — once, then it stops. A blocked network never
   leaves a broken image icon.

**Where the base URL lives:** one place only, `snippets/molfet-cdn.liquid`. It is
captured into `cdn_base` by each section that needs it, and the audit fails the
build if a file uses `cdn_base` without capturing it, or hardcodes a host.

**Why a pinned commit, not a branch.** A branch moves. If the live storefront
pointed at `main`, any later commit to the repository would silently change the
photos on a live store. Pin the commit, and what you tested is what ships.

**Swapping in your own photography.** Upload it in the theme editor and it wins
automatically — no code change. If you would rather change the built-in set,
replace the files under `public/` in the repository, commit, and update the
commit hash in `snippets/molfet-cdn.liquid`.

**File notes.**

| File | Used for | Notes |
| --- | --- | --- |
| `img/products/*-cut.webp` | cards, Mix stack, rack | **must stay transparent** — this is the layer that steps out of the frame |
| `img/products/*.webp` | card photo, rack fallback | full shot on cream |
| `img/hero/model-hero.webp` | home hero | `model-hero-cut.webp` is a **crop, not a cut-out** — it has no alpha, so the theme does not use it as one |
| `img/detail/*.webp` | details strip | fabric, cut, finish |
| `brand/molfet-wordmark.png` / `-cream.png` | header / footer | 3.70:1; the intrinsic `width`/`height` in the markup match it to avoid layout shift |
| `img/brand/icon-mark.png` / `-cream.png` | header collapse, 404, newsletter | the open brush circle |
| `img/brand/favicon-32.png`, `apple-touch-icon.png` | browser tab, home screen | |

---

## 2. Install

### Option A — zip upload (recommended)
1. Shopify admin → **Online Store → Themes → Add theme → Upload zip file**.
2. Choose `molfet-shopify-theme.zip` — its root already holds `assets/`,
   `config/`, `layout/`, `locales/`, `sections/`, `snippets/`, `templates/`.
3. **Publish**.

The zip contains the theme only: no app, no docs, no scripts. If you rebuild it
yourself, zip the **contents** of `shopify/`, never the folder.

### Option A2 — Connect from GitHub
Needs a repository whose **root** is the theme. See §1a; `node
scripts/export-theme-repo.mjs <owner/repo>` prepares one for you.
Connecting *this* repository will keep failing, by design.

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
   `detail_point` metaobject exactly as in `docs/MOLFET-METAFIELDS.md`.
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
- [ ] Rack view: only tops, bottoms and outerwear hang; no accessory on the rail.
- [ ] Rack view: drag a garment → it turns; button and double-click turn it too.
- [ ] Rack view: pull the rail, arrow keys walk it, Arabic drags the other way.

---

### The Rack view

`sections/main-rack.liquid` + `assets/molfet.js#initRack` (+ the styles in the Rack
block of `molfet.css.liquid`). The header shows a **Rack view** button; it opens the
page using the `page.rack` template.

- Only clothing hangs: products whose `molfet.slot` metafield is `top`, `bottom` or
  `outerwear`. `accessory` is filtered out of the loop.
- Each piece hangs from a drawn hanger (hook over the rail, triangle shoulders) on a
  6px maroon rail with end posts. The garments sway a little; the rail is pulled
  with the pointer or the arrow keys.
- Every garment turns on the hanger: drag it (0.8°/px), press the turn button, or
  double-click. Hover on a pointer device shows a 28° turn. The turn direction is
  flipped in Arabic so the drag feels the same in RTL.
- The turning layer is `molfet.cutout` (transparent PNG/WEBP), falling back to the
  featured image. No shadows, no gradients — depth comes from the turn alone.
- Reduced motion: no sway, no drift, the turn still happens when asked for.

#### Two views, one page (no page to create)

The shop and the rail live on the **collection** page. Two buttons at the top
of the grid — `Grid` and `The rail` — swap between them instantly:

- the rail is `snippets/molfet-rack-rail.liquid`, rendered inside the collection
  template and hidden with `hidden` until asked for;
- the choice is remembered in `sessionStorage`, and `?view=rack` / `?view=grid`
  opens on a given view, which is how the header buttons deep-link;
- the rail is initialised **lazily**, the first time its panel is revealed,
  because a hidden rail measures zero width and its drag maths and progress
  thumb would be wrong;
- the filter column belongs to the grid and hides with it — there is nothing to
  filter on a rail.

The header carries the same two buttons:

| Button | Goes to |
| --- | --- |
| Grid | `/collections/all` |
| The rail | `/collections/all?view=rack` |

Both work on a brand-new install. If the merchant *does* create a page using the
`page.rack` template and picks it in **Header → Rack page**, the rail button
opens that page instead. The grid button always stays the catalogue.

`sections/main-rack.liquid` (the dedicated page) now renders the same snippet,
so the rail behaves identically in both places.

#### How the rail is scrolled

The rail is `overflow-x: auto` with no scrollbar, so it needs three ways in and
it got all three wrong on the first pass:

- **Dragging** used to die because the garment claimed the pointer on
  `pointerdown` and captured it, so the scroller never saw another
  `pointermove`. A gesture now becomes ours only after 6px of travel, and only
  if it is clearly horizontal (`|dy| > 1.5 × |dx|` hands the gesture back to the
  page). Pointer capture is taken at that moment, not before.
- **`scroll-behavior: smooth`** re-animated every `scrollLeft` write, so at 60
  writes a second the rail never caught up and the drag felt dead. `data-dragging`
  turns it off; the arrow keys keep smooth scrolling by asking for it explicitly.
- **Touch never panned** because the stage said `touch-action: pan-y` inside a
  scroller that said `pan-x`, which intersected to "neither". The stage is `auto`
  now — a tap on the always-visible turn button is enough to spin a piece.
- **The wheel** did nothing, because the rail has no vertical overflow to
  consume. A vertical wheel is translated to the rail and released at the ends,
  so the page still scrolls past the rack.
- A **progress hairline** under the rail fills as it is pulled — with the
  scrollbar hidden it is the only sign that there is more to the side. It hides
  itself when nothing overflows, and it uses `inset-inline-start`, so it grows
  from the correct edge in Arabic.

`scrollLeft` is signed differently per engine and direction (LTR `0…max`,
RTL `0…-max` in Chrome/Safari and `0…max` in Firefox); everything reads the
magnitude and writes back in the engine's own convention.

#### Making the Rack view reachable

The button in the header resolves its link in three steps, so it is never a dead
end:

1. the **Rack page** picked in the section settings (Header → Rack page),
2. otherwise a page whose handle is `rack`,
3. otherwise `/collections/all`.

**You do not have to create anything.** The rail is already on every collection
page behind the "The rail" button. Creating a page is optional and only useful
if you want a standalone rack URL: **Online Store → Pages → Add page**, then set
its template to `page.rack`. Pick that page in **Header → Rack page** and the
rail button opens it instead of `/collections/all?view=rack`.

`main-rack` hangs the chosen collection; with no collection chosen — or one whose
handle no longer exists, or one with no products — it falls back to
*catalogue, all products*, so the rail is never empty on a fresh install. Only
`available` products whose `molfet.slot` is `top`, `bottom` or `outerwear` hang.

### The duplicate header / footer rule

`layout/theme.liquid` renders `announcement-bar`, `header`, `footer` and
`cart-drawer` once, around `{{ content_for_layout }}`. **A JSON template must
never list those four section types**, or the page renders two of each. Sections
inside a template should be page content only (`main-product`, `hero-frame`,
`featured-collection`, …).

### The brush cursor and the stray ring

The Lens cursor is the brush circle; the native arrow is hidden by
`html.mf-lens-on`, a class the script adds **after** the lens is mounted. Both
fixed elements are parked at `-9999px` so they cannot be seen before the first
`pointermove` — a `position: fixed` element with no `top`/`left` otherwise paints
at its place in the flow, which is under the footer, in the bottom-right corner.
The circle hides on `pointerleave`, `pointerout` (no related target), window
`blur` and tab hide, and is `display:none` at `(hover: none), (pointer: coarse)`
and under reduced motion.

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

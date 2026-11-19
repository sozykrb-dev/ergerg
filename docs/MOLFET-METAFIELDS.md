# MOLFET — metafield, metaobject and setup definitions

Everything in this file is created once in **Shopify admin → Settings → Custom data**.
No app is required.

---

## 1. Product metafields — namespace `molfet`

| Key | Type | Purpose |
| --- | --- | --- |
| `cutout` | File (image, transparent PNG/WEBP) | The cut-out layer. This is the piece that steps over the frame line. |
| `sketch_image` | File (image) | **Layer A** of the Lens — the Italian technical flat, cream lines on maroon. |
| `macro_image` | File (image) | **Layer B** of the Lens — macro photo of the Egyptian fabric and stitching. |
| `detail_points` | List of metaobjects (`detail_point`) | Up to three hotspots: Fabric, Cut, Finish. |
| `slot` | Single line text (one value) | `top`, `bottom`, `outerwear` or `accessory`. **Required by Rack view**: accessories are kept off the rail. |

### Creating them
1. Settings → Custom data → **Products** → Add definition.
2. Namespace and key: `molfet.cutout` — type **File / Image**.
3. Repeat for `molfet.sketch_image` and `molfet.macro_image`.
4. Create `molfet.detail_points` — type **Metaobject**, reference: `detail_point`, **List of entries: yes**, limit 3.
5. Create `molfet.slot` — type **Single line text**, one value, with the allowed values
   `top`, `bottom`, `outerwear`, `accessory`. The Rack view page reads it: everything
   except `accessory` hangs on the rail. Without it, a product is treated as a top.

---

## 2. Metaobject type `detail_point`

Settings → Custom data → **Metaobjects** → Add definition → name **Detail point**, type handle `detail_point`.

| Field | Key | Type | Notes |
| --- | --- | --- | --- |
| Title | `title` | Single line text | “Fabric”, “Cut”, “Finish” |
| Text | `text` | Multi-line text | The callout copy |
| X | `x` | Integer (0–100) | % from the left of the image |
| Y | `y` | Integer (0–100) | % from the top of the image |
| Macro image | `macro_image` | File (image) | Shown inside the Lens while the pointer rests on the hotspot |

Storefront: **Content → Metaobjects → Detail point** → add three entries per product:
`Fabric` (34, 38), `Cut` (63, 55), `Finish` (46, 76) — adjust per photo.

Hotspots stay bottom-right independent of language. In Arabic the coordinates
are unchanged: the logo never mirrors, so neither does the frame.

---

## 3. Colour schemes (Cream, Maroon, Brown)

Settings → **Colors** is not used. The three schemes live in `config/settings_schema.json`
(`color_maroon`, `color_cream`, `color_brown`) and are emitted as CSS custom
properties in `assets/molfet.css.liquid`:

```css
:root {
  --molfet-maroon: {{ settings.color_maroon }};
  --molfet-cream:  {{ settings.color_cream }};
  --molfet-brown:  {{ settings.color_brown }};
}
```

Every other shade is `color-mix(in srgb, …)` of those three. Nothing else is allowed.

---

## 4. Pages to create

| Page | Handle | Template |
| --- | --- | --- |
| Limitless Mix | `limitless-mix` | `page.limitless-mix` |
| The Brand | `about` | `page.about` |
| The rack | `rack` | `page.rack` |

---

## 5. Language / currency

1. Settings → **Languages** → add **Arabic**.
2. Install the free **Translate & Adapt** app to edit the Arabic strings in `locales/ar.json`.
3. Settings → **Store details → Currency** → EGP as the store currency.
4. All layout code uses CSS logical properties (`inset-inline`, `margin-inline`, …) so RTL needs no extra CSS.

---

## 6. Collections for Limitless Mix

Create four collections, one per slot, and pick them in the Mix section:

- **Tops** → metafield condition `molfet.slot = top`
- **Bottoms** → `molfet.slot = bottom`
- **Outerwear** → `molfet.slot = outerwear`
- **Accessories** → `molfet.slot = accessory`

(Or simply use the built-in collection rules — the section only needs a collection per row.)

---

## 7. Rack view page

1. **Pages → Add page** → title **The rack** → under *Theme template* pick
   **page.rack** → Save.
2. **Online Store → Navigation → main-menu**: add *Rack view* pointing at that page
   (the header button is automatic; the menu link is optional).
3. **Theme editor → Header** → tick *Show the Rack view button* and pick the page.
4. **Theme editor → The rack page → Rack view section** → choose the collection to
   hang (e.g. *All clothing*). Only `top`, `bottom` and `outerwear` products hang;
   `accessory` is skipped.

## 8. Demo content

The eight sample pieces live in the React storefront (`src/data/constants.ts`) and
their images in `public/img/products/`. Most images already have a `-cut.webp`
transparent version — use those as `molfet.cutout` so the garments turn cleanly on
the hangers. The Lens, the Mix and the Rack all work with any product that has the
metafields above; products without them still render (the Lens shows the macro
layer only, the Rack uses the featured image).

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

### Creating them
1. Settings → Custom data → **Products** → Add definition.
2. Namespace and key: `molfet.cutout` — type **File / Image**.
3. Repeat for `molfet.sketch_image` and `molfet.macro_image`.
4. Create `molfet.detail_points` — type **Metaobject**, reference: `detail_point`, **List of entries: yes**, limit 3.

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

## 7. Demo content

`demo/products.csv` can be imported with **Products → Import** to create the
eight sample pieces (with their metafields filled where Shopify supports it).
The Lens and the Mix work with any product that has the metafields above;
products without them still render, with the Lens showing the macro layer only.

# Connecting the MOLFET storefront to Shopify

The React storefront can run entirely on Shopify: catalogue, variants, inventory,
cart, discount codes and checkout. It also keeps working on its local catalogue
when Shopify is off, so the site is never down.

Two ways to connect it. **Option A is recommended** — the token never reaches the
browser.

---

## 1. Create the Storefront API token (once)

1. Shopify admin → **Settings → Apps and sales channels → Develop apps**.
2. **Create an app** → name it `MOLFET Storefront`.
3. **Configuration → Storefront API** → enable these scopes:
   - `unauthenticated_read_product_listings`
   - `unauthenticated_read_product_inventory`
   - `unauthenticated_read_product_tags`
   - `unauthenticated_read_checkouts`
   - `unauthenticated_write_checkouts`
   - `unauthenticated_read_customers` *(only if you use customer accounts)*
4. **Install app** → **API credentials** → copy the **Storefront API access token**
   (`shpat_…` for a private app; `shpss_…` is a public token).
5. Copy the store domain: `your-shop.myshopify.com`.

---

## Option A — server environment (private token, recommended)

Add to the deployment (Vercel → Project → Settings → Environment Variables, or a
local `.env.local`):

```
SHOPIFY_STORE_DOMAIN=molfet.myshopify.com
SHOPIFY_STOREFRONT_TOKEN=shpat_…
SHOPIFY_API_VERSION=2024-10
```

Restart the server. Open **`/api/shopify/status`** — it should answer
`{ "configured": true, "ok": true, "shop": "MOLFET" }`.

How it works: the browser posts GraphQL to `/api/shopify` (Express), which adds
the token and forwards to Shopify. That means:

- the private token is never shipped to a browser,
- no CORS, no `mode: no-cors` hacks,
- Shopify's throttling status codes are passed back untouched.

## Option B — paste it in the admin (public token only)

Admin → **Store & Integrations** → the *Shopify* card → store domain + API version
+ **public** Storefront token → **اختبار الاتصال** → **حفظ وتفعيل شوبيفاي**.

A `shpat_` (private) token is refused by the browser — use Option A for it. The
panel stores the public token in `localStorage` on that device only.

---

## 2. What maps to what

| Storefront | Shopify source |
| --- | --- |
| Product title, description | product title / body_html |
| Arabic title & description | metafields `molfet.title_ar`, `molfet.description_ar` |
| Price, compare-at | `priceRange`, `compareAtPriceRange` (converted to piastres) |
| Sizes / colourways | the `Size` and `Colour` product options |
| Cut-out (frame break, Rack view) | metafield `molfet.cutout` (file reference) |
| Lens layer A / B | `molfet.sketch_image`, `molfet.macro_image` |
| Lens hotspots | metafield `molfet.details` (JSON, up to 3 points) |
| Mix / Rack slot | metafield `molfet.slot` = `top` \| `bottom` \| `outerwear` \| `accessory` |
| Badge | metafield `molfet.badge` = `NEW` \| `SALE` \| `HOT` \| `LIMITED` \| `BESTSELLER` |
| Collections → shop filters | Shopify collections (handle + title) |
| Cart | Storefront Cart API, persisted by cart id in `localStorage` |
| Discount codes | `cartDiscountCodesUpdate` — Shopify validates the code |
| Checkout | `cart.checkoutUrl` → Shopify hosted checkout |

You do **not** need every metafield: without them the storefront still renders,
using the featured image and Shopify's product type to pick the slot.

---

## 3. What Shopify handles for you after connecting

- **Inventory** — a variant that is sold out cannot be added; the picker shows it.
- **Payments** — COD, InstaPay, Vodafone Cash, cards: whatever is enabled under
  *Settings → Payments* appears in checkout. Nothing to code.
- **Shipping & taxes** — the rates and zones from *Settings → Shipping*.
- **Orders** — every order lands in **Orders**, with emails, fulfilment and
  refunds. The old Supabase order table is only used when Shopify is off.
- **Currency** — EGP comes from the store's currency setting.

## 4. Verify it

```bash
curl -s localhost:3000/api/shopify/status
curl -s -X POST localhost:3000/api/shopify \
  -H 'Content-Type: application/json' \
  -d '{"query":"{ products(first:3){ nodes { title priceRange { minVariantPrice { amount currencyCode } } } } }"}'
```

In the storefront:

1. Header shows the Shopify product count (admin panel).
2. Shop page lists your Shopify products.
3. Add a piece → cart drawer opens with the real line and Shopify's price.
4. Quantity + / − updates the Shopify cart.
5. A promo code entered in the drawer is validated by Shopify.
6. **Checkout** leaves for `your-shop.myshopify.com/checkout…`.

## 5. Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| `configured: false` | env vars missing on the server | add them, restart, check `/api/shopify/status` |
| `401 / 403` | token lacks Storefront scopes | re-enable the scopes in the app config, reinstall |
| Empty catalogue, local products showing | API reachable but no active products | publish products and make them available on the *Online Store* sales channel |
| Checkout redirects back | cart expired | add the piece again — a new cart is created automatically |
| Prices look 100× off | your store currency has no decimals | prices are stored in minor units; adjust `toCartItem` in `src/context/ShopifyContext.tsx` |

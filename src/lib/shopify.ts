/**
 * Shopify Storefront API client.
 *
 * Everything the storefront needs to run *on* Shopify lives here:
 *   · products + variants + metafields, with a clean mapping to the app's Product
 *   · carts: create, add, change, remove, discount codes, buyer identity, checkoutUrl
 *   · collections (handles → products), store settings and locale
 *
 * The client is deliberately tiny: one `fetch` to `/api/shopify` (the Express
 * proxy in `server.ts`), which attaches the private Storefront token server-side.
 * That keeps the token out of the browser and avoids CORS. If the proxy is not
 * available the browser calls the Storefront endpoint directly, which works when
 * the token is a *public* one.
 *
 * When the environment is not configured, `isShopifyConfigured()` is false and
 * the app keeps its local catalogue — the storefront never breaks.
 */
import { Product, ShopifyVariant, MixSlot, DetailPoint } from '../types';
import { INITIAL_PRODUCTS } from '../data/constants';
import { readStoredShopifyConfig, storefrontEndpoint } from './shopifyConfig';

export interface ShopifyEnv {
  domain: string;
  token: string;
  apiVersion: string;
  storefrontUrl: string;
  /** true when the token is safe to expose to the browser */
  publicToken: boolean;
}

export interface ShopifyCollection {
  handle: string;
  title: string;
  products: Product[];
}

export interface ShopifyCartLine {
  id: string;
  quantity: number;
  variantId: string;
  productId?: string;
  title: string;
  variantTitle: string;
  image?: string;
  price: number;
  lineTotal: number;
}

export interface ShopifyCart {
  id: string;
  checkoutUrl: string;
  totalQuantity: number;
  subtotal: number;
  total: number;
  currency: string;
  lines: ShopifyCartLine[];
  /** discount codes currently applied */
  discountCodes: string[];
}

/* ------------------------------------------------------------------ */
/* environment                                                         */
/* ------------------------------------------------------------------ */

const FALLBACK_ENV: ShopifyEnv = {
  domain: '',
  token: '',
  apiVersion: '2024-10',
  storefrontUrl: '',
  publicToken: true,
};

let envCache: ShopifyEnv | null = null;

/** Get the Shopify environment from the Express proxy (`/api/shopify/env`). */
export const loadShopifyEnv = async (): Promise<ShopifyEnv> => {
  if (envCache) return envCache;
  try {
    const response = await fetch('/api/shopify/env', { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(String(response.status));
    const data = (await response.json()) as Partial<ShopifyEnv> & { configured?: boolean };
    if (data.configured === false || !data.storefrontUrl) {
      // the server has no credentials: a public token saved in the browser can
      // still drive the store, a private one cannot and is ignored here
      const stored = readStoredShopifyConfig();
      envCache = stored
        ? {
            domain: stored.domain,
            token: stored.token,
            apiVersion: stored.apiVersion,
            storefrontUrl: storefrontEndpoint(stored.domain, stored.apiVersion),
            publicToken: true,
          }
        : { ...FALLBACK_ENV, ...data };
    } else {
      envCache = { ...FALLBACK_ENV, ...data };
    }
  } catch {
    const stored = readStoredShopifyConfig();
    envCache = stored
      ? {
          domain: stored.domain,
          token: stored.token,
          apiVersion: stored.apiVersion,
          storefrontUrl: storefrontEndpoint(stored.domain, stored.apiVersion),
          publicToken: true,
        }
      : FALLBACK_ENV;
  }
  return envCache;
};

export const isShopifyConfigured = (env?: ShopifyEnv | null): boolean =>
  Boolean(env?.storefrontUrl && env?.token);

/** Synchronous peek at what we already know (used for the first render). */
export const peekShopifyEnv = (): ShopifyEnv | null => envCache;

/* ------------------------------------------------------------------ */
/* low-level query                                                     */
/* ------------------------------------------------------------------ */

export class ShopifyError extends Error {
  constructor(message: string, public readonly errors?: unknown) {
    super(message);
    this.name = 'ShopifyError';
  }
}

const query = async <T>(env: ShopifyEnv, gql: string, variables?: Record<string, unknown>): Promise<T> => {
  const body = JSON.stringify({ query: gql, variables });

  // 1. the server proxy (keeps a private token private)
  let payload: { data?: T; errors?: any[] } | null = null;
  let proxyWorked = false;

  try {
    const response = await fetch('/api/shopify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body,
    });
    if (response.ok) {
      payload = await response.json();
      proxyWorked = true;
    }
  } catch {
    // fall through to a direct call
  }

  // 2. direct call — only meaningful with a public token
  if (!proxyWorked) {
    if (!env.publicToken) throw new ShopifyError('The Shopify proxy is unavailable and the token is private.');
    const response = await fetch(env.storefrontUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Shopify-Storefront-Access-Token': env.token,
      },
      body,
    });
    if (!response.ok) throw new ShopifyError(`Storefront API ${response.status}`);
    payload = await response.json();
  }

  if (!payload) throw new ShopifyError('Empty response from the Storefront API');
  if (payload.errors?.length) {
    throw new ShopifyError(payload.errors.map((e: any) => e.message).join(' · '), payload.errors);
  }
  if (!payload.data) throw new ShopifyError('No data returned from the Storefront API');
  return payload.data;
};

/* ------------------------------------------------------------------ */
/* fragments                                                          */
/* ------------------------------------------------------------------ */

const MONEY = (value?: number | null) => (typeof value === 'number' ? value : 0);

const PRODUCT_FIELDS = /* GraphQL */ `
  id
  handle
  title
  description
  descriptionHtml
  vendor
  productType
  tags
  availableForSale
  featuredImage { url altText }
  images(first: 12) { nodes { url altText } }
  options { name values }
  priceRange { minVariantPrice { amount currencyCode } maxVariantPrice { amount currencyCode } }
  compareAtPriceRange { minVariantPrice { amount } }
  metafields(identifiers: [
    { namespace: "molfet", key: "cutout" },
    { namespace: "molfet", key: "sketch_image" },
    { namespace: "molfet", key: "macro_image" },
    { namespace: "molfet", key: "slot" },
    { namespace: "molfet", key: "title_ar" },
    { namespace: "molfet", key: "description_ar" },
    { namespace: "molfet", key: "badge" },
    { namespace: "molfet", key: "details" }
  ]) {
    namespace
    key
    type
    value
    reference { ... on MediaImage { image { url } } }
  }
  variants(first: 100) {
    nodes {
      id
      title
      availableForSale
      quantityAvailable
      selectedOptions { name value }
      price { amount }
      compareAtPrice { amount }
      image { url }
    }
  }
`;

/* ------------------------------------------------------------------ */
/* mapping                                                             */
/* ------------------------------------------------------------------ */

const metafieldMap = (node: any): Record<string, any> => {
  const map: Record<string, any> = {};
  for (const field of node?.metafields || []) {
    if (!field) continue;
    if (field.reference?.image?.url) map[field.key] = field.reference.image.url;
    else map[field.key] = field.value;
  }
  return map;
};

const slug = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const detailPointsFrom = (raw: unknown): DetailPoint[] => {
  if (!raw) return [];
  let list: any[] = [];
  try {
    list = typeof raw === 'string' ? JSON.parse(raw) : Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
  return list
    .slice(0, 3)
    .map((item, index): DetailPoint => ({
      key: (item.key || ['fabric', 'cut', 'finish'][index] || 'fabric') as DetailPoint['key'],
      x: Number(item.x) || 34,
      y: Number(item.y) || 38,
      titleEn: item.titleEn || item.title || 'Detail',
      titleAr: item.titleAr || item.title || 'تفصيلة',
      textEn: item.textEn || item.text || '',
      textAr: item.textAr || item.text || '',
      macro: item.macro || item.macro_image || '',
    }))
    .filter((point) => point.titleEn);
};

/** Map a Storefront API product node onto the app's Product. */
export const mapShopifyProduct = (node: any, index = 0): Product => {
  const meta = metafieldMap(node);
  const variants: ShopifyVariant[] = (node.variants?.nodes || []).map((variant: any) => ({
    id: variant.id,
    title: variant.title,
    availableForSale: Boolean(variant.availableForSale),
    quantityAvailable: variant.quantityAvailable ?? null,
    price: Math.round(MONEY(Number(variant.price?.amount)) * 100),
    compareAtPrice: variant.compareAtPrice ? Math.round(Number(variant.compareAtPrice.amount) * 100) : null,
    selectedOptions: variant.selectedOptions || [],
    image: variant.image?.url,
  }));

  const optionNames: string[] = (node.options || []).map((option: any) => option.name);

  const sizeOption = (node.options || []).find((option: any) => /size|مقاس/i.test(option.name));
  const sizes: string[] = sizeOption?.values?.length ? sizeOption.values : ['One size'];

  const images: string[] = (node.images?.nodes || []).map((image: any) => image.url).filter(Boolean);
  const featured = node.featuredImage?.url || images[0];

  const slotRaw = String(meta.slot || '').toLowerCase();
  const slot: MixSlot = (['top', 'bottom', 'outerwear', 'accessory'] as MixSlot[]).includes(slotRaw as MixSlot)
    ? (slotRaw as MixSlot)
    : /bottom|pant|short|skirt/i.test(node.productType || '')
      ? 'bottom'
      : /outerwear|jacket|coat|overshirt/i.test(node.productType || '')
        ? 'outerwear'
        : /accessor|bag|tote|cap|belt/i.test(node.productType || '')
          ? 'accessory'
          : 'top';

  const price = Math.round(MONEY(Number(node.priceRange?.minVariantPrice?.amount)) * 100);
  const compareAt = node.compareAtPriceRange?.minVariantPrice?.amount
    ? Math.round(Number(node.compareAtPriceRange.minVariantPrice.amount) * 100)
    : undefined;

  const badgeRaw = String(meta.badge || '').toUpperCase();
  const badge = (['NEW', 'SALE', 'HOT', 'LIMITED', 'BESTSELLER'] as const).find((value) => value === badgeRaw);

  const collectionHandles: string[] = node.collections?.nodes?.map((collection: any) => collection.handle) || [];

  return {
    id: node.handle || slug(node.title) || `product-${index}`,
    handle: node.handle,
    shopifyId: node.id,
    shopifyVariants: variants,
    optionNames,
    vendor: node.vendor,
    productType: node.productType,
    soldOut: !node.availableForSale,
    collections: collectionHandles,

    titleEn: node.title || 'Untitled',
    titleAr: meta.title_ar || node.title || 'بدون عنوان',
    slug: node.handle || slug(node.title),
    category: (node.productType || slot).toLowerCase(),
    price,
    compareAtPrice: compareAt && compareAt > price ? compareAt : undefined,
    stock: variants.reduce((total, variant) => total + (variant.quantityAvailable || 0), 0) || (node.availableForSale ? 1 : 0),
    sku: variants[0]?.id?.split('/').pop() || '',
    descriptionEn: meta.description_en || node.description || '',
    descriptionAr: meta.description_ar || node.description || '',
    fabricDetails: meta.fabric || '',
    fitType: (String(meta.fit || 'Regular') as Product['fitType']) || 'Regular',
    sizes,
    colors: (node.options || [])
      .filter((option: any) => /colou?r|لون/i.test(option.name))
      .flatMap((option: any) => option.values)
      .map((name: string) => ({ name, hex: '#321E19' })),
    thumbnailUrl: featured,
    images: images.length ? images : featured ? [featured] : [],
    badge,
    isFeatured: true,
    isActive: true,
    rating: Number(meta.rating) || 5,
    reviewsCount: Number(meta.reviews_count) || 0,
    createdAt: node.createdAt || new Date().toISOString(),

    slot,
    cutoutUrl: meta.cutout || featured,
    sketchUrl: meta.sketch_image,
    macroUrl: meta.macro_image,
    details: detailPointsFrom(meta.details || meta.detail_points),
  };
};

const mapCart = (cart: any): ShopifyCart => ({
  id: cart.id,
  checkoutUrl: cart.checkoutUrl,
  totalQuantity: cart.totalQuantity || 0,
  subtotal: Math.round(MONEY(Number(cart.cost?.subtotalAmount?.amount)) * 100),
  total: Math.round(MONEY(Number(cart.cost?.totalAmount?.amount)) * 100),
  currency: cart.cost?.totalAmount?.currencyCode || 'EGP',
  discountCodes: (cart.discountCodes || []).filter((code: any) => code.applicable).map((code: any) => code.code),
  lines: (cart.lines?.nodes || []).map((line: any) => ({
    id: line.id,
    quantity: line.quantity,
    variantId: line.merchandise?.id,
    productId: line.merchandise?.product?.handle || line.merchandise?.product?.id,
    title: line.merchandise?.product?.title || '',
    variantTitle: line.merchandise?.title || '',
    image: line.merchandise?.image?.url,
    price: Math.round(MONEY(Number(line.merchandise?.price?.amount)) * 100),
    lineTotal: Math.round(MONEY(Number(line.cost?.totalAmount?.amount)) * 100),
  })),
});

const CART_FIELDS = /* GraphQL */ `
  id
  checkoutUrl
  totalQuantity
  discountCodes { code applicable }
  cost {
    subtotalAmount { amount currencyCode }
    totalAmount { amount currencyCode }
  }
  lines(first: 100) {
    nodes {
      id
      quantity
      cost { totalAmount { amount } }
      merchandise {
        ... on ProductVariant {
          id
          title
          price { amount }
          image { url }
          product { id handle title }
        }
      }
    }
  }
`;

/* ------------------------------------------------------------------ */
/* public API                                                          */
/* ------------------------------------------------------------------ */

export const fetchShopifyProducts = async (
  env: ShopifyEnv,
  options: { first?: number; query?: string; sortKey?: string; reverse?: boolean } = {},
): Promise<Product[]> => {
  const data = await query<{ products: { nodes: any[] } }>(
    env,
    /* GraphQL */ `
      query Products($first: Int!, $query: String, $sortKey: ProductSortKeys, $reverse: Boolean) {
        products(first: $first, query: $query, sortKey: $sortKey, reverse: $reverse) {
          nodes { createdAt ${PRODUCT_FIELDS} }
        }
      }
    `,
    {
      first: options.first ?? 60,
      query: options.query ?? null,
      sortKey: options.sortKey ?? 'BEST_SELLING',
      reverse: options.reverse ?? false,
    },
  );

  return (data.products?.nodes || []).map((node, index) => mapShopifyProduct(node, index));
};

export const fetchShopifyProduct = async (env: ShopifyEnv, handle: string): Promise<Product | null> => {
  const data = await query<{ product: any }>(
    env,
    /* GraphQL */ `
      query Product($handle: String!) {
        product(handle: $handle) { createdAt ${PRODUCT_FIELDS} }
      }
    `,
    { handle },
  );
  return data.product ? mapShopifyProduct(data.product) : null;
};

export const fetchShopifyCollections = async (env: ShopifyEnv, first = 20): Promise<ShopifyCollection[]> => {
  const data = await query<{ collections: { nodes: any[] } }>(
    env,
    /* GraphQL */ `
      query Collections($first: Int!) {
        collections(first: $first) {
          nodes { handle title products(first: 60) { nodes { createdAt ${PRODUCT_FIELDS} } } }
        }
      }
    `,
    { first },
  );

  return (data.collections?.nodes || []).map((node) => ({
    handle: node.handle,
    title: node.title,
    products: (node.products?.nodes || []).map((product: any, index: number) => mapShopifyProduct(product, index)),
  }));
};

/* ---- cart ---- */

const CART_CREATE = /* GraphQL */ `
  mutation CartCreate($lines: [CartLineInput!], $discountCodes: [String!], $buyerIdentity: CartBuyerIdentityInput) {
    cartCreate(input: { lines: $lines, discountCodes: $discountCodes, buyerIdentity: $buyerIdentity }) {
      cart { ${CART_FIELDS} }
      userErrors { field message }
    }
  }
`;

const CART_LINES_ADD = /* GraphQL */ `
  mutation CartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
    cartLinesAdd(cartId: $cartId, lines: $lines) {
      cart { ${CART_FIELDS} }
      userErrors { field message }
    }
  }
`;

const CART_LINES_REMOVE = /* GraphQL */ `
  mutation CartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
    cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
      cart { ${CART_FIELDS} }
      userErrors { field message }
    }
  }
`;

const CART_LINES_UPDATE = /* GraphQL */ `
  mutation CartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
    cartLinesUpdate(cartId: $cartId, lines: $lines) {
      cart { ${CART_FIELDS} }
      userErrors { field message }
    }
  }
`;

const CART_DISCOUNT = /* GraphQL */ `
  mutation CartDiscountCodesUpdate($cartId: ID!, $discountCodes: [String!]!) {
    cartDiscountCodesUpdate(cartId: $cartId, discountCodes: $discountCodes) {
      cart { ${CART_FIELDS} }
      userErrors { field message }
    }
  }
`;

const CART_BUYER = /* GraphQL */ `
  mutation CartBuyerIdentityUpdate($cartId: ID!, $buyerIdentity: CartBuyerIdentityInput!) {
    cartBuyerIdentityUpdate(cartId: $cartId, buyerIdentity: $buyerIdentity) {
      cart { ${CART_FIELDS} }
      userErrors { field message }
    }
  }
`;

const CART_QUERY = /* GraphQL */ `
  query Cart($cartId: ID!) {
    cart(id: $cartId) { ${CART_FIELDS} }
  }
`;

const assertNoErrors = (userErrors: any[] | undefined, fallback: string) => {
  if (userErrors?.length) {
    throw new ShopifyError(userErrors.map((error) => error.message).join(' · ') || fallback, userErrors);
  }
};

export const createShopifyCart = async (
  env: ShopifyEnv,
  lines: { variantId: string; quantity: number }[],
  extras: { discountCodes?: string[]; email?: string; countryCode?: string } = {},
): Promise<ShopifyCart> => {
  const data = await query<{ cartCreate: { cart: any; userErrors: any[] } }>(env, CART_CREATE, {
    lines: lines.map((line) => ({ merchandiseId: line.variantId, quantity: Math.max(1, line.quantity) })),
    discountCodes: extras.discountCodes?.length ? extras.discountCodes : null,
    buyerIdentity: extras.email || extras.countryCode
      ? { email: extras.email || null, countryCode: extras.countryCode || 'EG' }
      : null,
  });
  assertNoErrors(data.cartCreate?.userErrors, 'Could not create the cart');
  return mapCart(data.cartCreate.cart);
};

export const getShopifyCart = async (env: ShopifyEnv, cartId: string): Promise<ShopifyCart | null> => {
  const data = await query<{ cart: any }>(env, CART_QUERY, { cartId });
  return data.cart ? mapCart(data.cart) : null;
};

export const addShopifyCartLines = async (
  env: ShopifyEnv,
  cartId: string,
  lines: { variantId: string; quantity: number }[],
): Promise<ShopifyCart> => {
  const data = await query<{ cartLinesAdd: { cart: any; userErrors: any[] } }>(env, CART_LINES_ADD, {
    cartId,
    lines: lines.map((line) => ({ merchandiseId: line.variantId, quantity: Math.max(1, line.quantity) })),
  });
  assertNoErrors(data.cartLinesAdd?.userErrors, 'Could not add to the cart');
  return mapCart(data.cartLinesAdd.cart);
};

export const updateShopifyCartLines = async (
  env: ShopifyEnv,
  cartId: string,
  lines: { id: string; quantity: number }[],
): Promise<ShopifyCart> => {
  const data = await query<{ cartLinesUpdate: { cart: any; userErrors: any[] } }>(env, CART_LINES_UPDATE, {
    cartId,
    lines: lines.map((line) => ({ id: line.id, quantity: line.quantity })),
  });
  assertNoErrors(data.cartLinesUpdate?.userErrors, 'Could not update the cart');
  return mapCart(data.cartLinesUpdate.cart);
};

export const removeShopifyCartLines = async (
  env: ShopifyEnv,
  cartId: string,
  lineIds: string[],
): Promise<ShopifyCart> => {
  const data = await query<{ cartLinesRemove: { cart: any; userErrors: any[] } }>(env, CART_LINES_REMOVE, {
    cartId,
    lineIds,
  });
  assertNoErrors(data.cartLinesRemove?.userErrors, 'Could not remove the line');
  return mapCart(data.cartLinesRemove.cart);
};

export const applyShopifyDiscounts = async (
  env: ShopifyEnv,
  cartId: string,
  codes: string[],
): Promise<ShopifyCart> => {
  const data = await query<{ cartDiscountCodesUpdate: { cart: any; userErrors: any[] } }>(env, CART_DISCOUNT, {
    cartId,
    discountCodes: codes,
  });
  assertNoErrors(data.cartDiscountCodesUpdate?.userErrors, 'Could not apply the discount code');
  return mapCart(data.cartDiscountCodesUpdate.cart);
};

export const setShopifyBuyerIdentity = async (
  env: ShopifyEnv,
  cartId: string,
  identity: { email?: string; phone?: string; countryCode?: string },
): Promise<ShopifyCart> => {
  const data = await query<{ cartBuyerIdentityUpdate: { cart: any; userErrors: any[] } }>(env, CART_BUYER, {
    cartId,
    buyerIdentity: {
      email: identity.email || null,
      phone: identity.phone || null,
      countryCode: identity.countryCode || 'EG',
    },
  });
  assertNoErrors(data.cartBuyerIdentityUpdate?.userErrors, 'Could not attach the buyer');
  return mapCart(data.cartBuyerIdentityUpdate.cart);
};

/* ------------------------------------------------------------------ */
/* settings + fallbacks                                                */
/* ------------------------------------------------------------------ */

export interface ShopInfo {
  name: string;
  description: string;
  currency: string;
  moneyFormat: string;
  domain: string;
}

export const fetchShopInfo = async (env: ShopifyEnv): Promise<ShopInfo | null> => {
  const data = await query<{ shop: any }>(
    env,
    /* GraphQL */ `query Shop { shop { name description primaryDomain { url } paymentSettings { currencyCode } } }`,
  );
  const shop = data.shop;
  if (!shop) return null;
  return {
    name: shop.name,
    description: shop.description,
    currency: shop.paymentSettings?.currencyCode || 'EGP',
    moneyFormat: '',
    domain: shop.primaryDomain?.url || env.domain,
  };
};

/** The product used by the Mix / Rack pages when Shopify has none yet. */
export const localFallbackProducts = (): Product[] => INITIAL_PRODUCTS.map((product) => ({ ...product }));
